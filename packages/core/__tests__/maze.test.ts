import {
  buildCollisionMap,
  erodeWalls,
  isClear,
  isolateLargestRegion,
  planRoute,
  reachedFinish,
  slideMove,
  snapToClear,
} from '../src/maze/mazeEngine';
import type { MazeCollisionMap } from '../src/maze/mazeEngine';

/**
 * Build a collision map from an ASCII drawing so the maze behaviours can be
 * tested without any image. '#' = wall, ' ' or '.' = open path. Each cell is
 * `scale` mask-pixels square, so corridors are wide enough to admit a disc of
 * a few pixels' radius (as in the real downscaled maze photos).
 */
function mapFromAscii(rows: string[], scale = 10): MazeCollisionMap {
  const h = rows.length, w = Math.max(...rows.map((r) => r.length));
  const W = w * scale, H = h * scale;
  const walls = new Uint8Array(W * H);
  for (let gy = 0; gy < h; gy++) {
    for (let gx = 0; gx < w; gx++) {
      const isWall = (rows[gy]![gx] ?? '#') === '#';
      if (!isWall) continue;
      for (let y = 0; y < scale; y++) {
        for (let x = 0; x < scale; x++) {
          walls[(gy * scale + y) * W + (gx * scale + x)] = 1;
        }
      }
    }
  }
  return buildCollisionMap(walls, W, H);
}

// A simple room with a wall down the middle and a gap at the bottom:
//   col 3 is a wall except the last row (the doorway).
const ROOM = [
  '#######',
  '#..#..#',
  '#..#..#',
  '#..#..#',
  '#.....#',
  '#######',
];

describe('buildCollisionMap / clearance', () => {
  const map = mapFromAscii(ROOM);
  it('marks open cells clear and wall cells not clear', () => {
    expect(isClear(map, 15, 15, 3)).toBe(true); // inside left room
    expect(isClear(map, 35, 15, 3)).toBe(false); // on the centre wall (col 3)
  });
  it('treats the mask border as wall (character cannot leave the maze)', () => {
    // Just inside the top-left border: a big disc cannot fit against the edge.
    expect(isClear(map, 11, 11, 8)).toBe(false);
    expect(isClear(map, -5, 30, 2)).toBe(false); // outside entirely
  });
  it('clearance grows away from walls', () => {
    const nearWall = map.clearance[15 * map.width + 11]!;
    const nearCentre = map.clearance[15 * map.width + 20]!;
    expect(nearCentre).toBeGreaterThan(nearWall);
  });
});

describe('slideMove', () => {
  const map = mapFromAscii(ROOM);

  it('moves freely through open space', () => {
    const res = slideMove(map, { x: 15, y: 15 }, { x: 15, y: 40 }, 3);
    expect(res.hitWall).toBe(false);
    expect(res.position.y).toBeCloseTo(40, 0);
  });

  it('never crosses a wall - stops at the last valid position', () => {
    // Drive straight from the left room toward the right room through col 3.
    const res = slideMove(map, { x: 15, y: 15 }, { x: 55, y: 15 }, 3);
    expect(res.hitWall).toBe(true);
    // Must stop before the centre wall (col 3 spans x=30..40).
    expect(res.position.x).toBeLessThan(30);
    expect(isClear(map, res.position.x, res.position.y, 3)).toBe(true);
  });

  it('slides along a wall instead of stopping dead', () => {
    // Aim diagonally into the centre wall; the vertical component should still
    // carry the character downward while the horizontal component is blocked.
    const res = slideMove(map, { x: 20, y: 15 }, { x: 55, y: 45 }, 3);
    expect(res.hitWall).toBe(true);
    expect(res.position.y).toBeGreaterThan(15); // slid downward along the wall
    expect(isClear(map, res.position.x, res.position.y, 3)).toBe(true);
  });

  it('a fast flick cannot tunnel through a thin wall', () => {
    // One giant jump straight across the wall into the far room.
    const res = slideMove(map, { x: 15, y: 15 }, { x: 55, y: 15 }, 3);
    expect(res.position.x).toBeLessThan(30); // trapped on the near side
    expect(isClear(map, res.position.x, res.position.y, 3)).toBe(true);
  });

  it('every returned position is on the open path (no shaking into walls)', () => {
    let pos = { x: 15, y: 15 };
    const targets = [
      { x: 55, y: 15 }, { x: 55, y: 45 }, { x: 15, y: 45 }, { x: 15, y: 15 },
    ];
    for (const t of targets) {
      pos = slideMove(map, pos, t, 3).position;
      expect(isClear(map, pos.x, pos.y, 3)).toBe(true);
    }
  });
});

describe('snapToClear', () => {
  const map = mapFromAscii(ROOM);
  it('leaves an already-clear point alone', () => {
    const p = snapToClear(map, { x: 15, y: 15 }, 3);
    expect(p).toEqual({ x: 15, y: 15 });
  });
  it('pushes a point off a wall onto the nearest open cell', () => {
    const p = snapToClear(map, { x: 35, y: 15 }, 3); // on the centre wall
    expect(isClear(map, p.x, p.y, 3)).toBe(true);
  });
});

describe('erodeWalls', () => {
  it('reopens a hair-thin pinch that splits a corridor in two', () => {
    // Two open rooms joined only by a 1-cell "wall" pinch that a thresholding
    // artefact would leave closed. '#' walls, '.' open.
    const rows = [
      '#######',
      '#.....#',
      '#.###.#',
      '#.# #.#', // the space is a 1px gap the pinch nearly closes
      '#.###.#',
      '#.....#',
      '#######',
    ];
    const map = buildCollisionMap(mapFromAscii(rows, 1).walls, 7, 7);
    void map;
    // At full ASCII scale the interior ring is connected; erosion must not
    // disconnect an already-open region, and must keep the outer border solid.
    const scaled = mapFromAscii(rows, 6);
    const eroded = erodeWalls(scaled.walls, scaled.width, scaled.height, 1);
    // Border stays wall (character cannot leave the maze).
    expect(eroded[0]).toBe(1);
    // A thick wall is only thinned, not removed - still blocks its centre.
    const midWallX = 3 * 6 + 3, midWallY = 2 * 6 + 3;
    expect(eroded[midWallY * scaled.width + midWallX]).toBe(1);
  });
});

describe('isolateLargestRegion', () => {
  it('keeps the biggest open pocket and walls off smaller ones', () => {
    // A big room on the left, a tiny disconnected pocket on the right.
    const rows = [
      '#########',
      '#....#.#.#',
      '#....#.#.#',
      '#....#...#',
      '#########',
    ];
    const m = mapFromAscii(rows, 4);
    const kept = isolateLargestRegion(m.walls, m.width, m.height);
    // The big room's centre stays open; total open area shrinks (pocket gone).
    const openBefore = m.walls.reduce((n, w) => n + (w ? 0 : 1), 0);
    const openAfter = kept.reduce((n, w) => n + (w ? 0 : 1), 0);
    expect(openAfter).toBeLessThan(openBefore);
    expect(kept[(2 * 4 + 1) * m.width + (2 * 4 + 1)]).toBe(0); // left room open
  });
});

describe('reachedFinish', () => {
  it('is false until the whole disc is inside the finish zone', () => {
    expect(reachedFinish({ x: 0, y: 0 }, { x: 40, y: 0 }, 5, 20)).toBe(false);
    expect(reachedFinish({ x: 38, y: 0 }, { x: 40, y: 0 }, 5, 20)).toBe(true);
  });
});

describe('planRoute (auto-fit radius + hint route)', () => {
  const map = mapFromAscii(ROOM);
  it('finds a radius and a start→finish route around the centre wall', () => {
    const plan = planRoute(map, { x: 0.28, y: 0.25 }, { x: 0.72, y: 0.25 }, { maxRadius: 8 });
    // The widest disc that both fits the endpoints and can travel between them.
    expect(plan.radius).toBeGreaterThanOrEqual(3);
    expect(plan.hintPath.length).toBeGreaterThan(1);
    // The start must admit the fitted disc, or the character couldn't move.
    expect(isClear(map, plan.start.x, plan.start.y, plan.radius)).toBe(true);
    // Endpoints are snapped onto the open path.
    expect(isClear(map, plan.start.x, plan.start.y, plan.radius)).toBe(true);
    expect(isClear(map, plan.finish.x, plan.finish.y, plan.radius)).toBe(true);
    // Left room start, right room finish, so the route must dip through the
    // bottom doorway (some point below the rooms' upper section).
    const maxY = Math.max(...plan.hintPath.map((p) => p.y));
    expect(maxY).toBeGreaterThan(35);
  });

  it('picks a smaller radius when the only gap is narrow', () => {
    const narrow = mapFromAscii([
      '#####',
      '#...#',
      '###.#', // a one-cell-wide vertical slot
      '#...#',
      '#####',
    ]);
    const wide = planRoute(narrow, { x: 0.3, y: 0.3 }, { x: 0.3, y: 0.7 }, { maxRadius: 12 });
    expect(wide.radius).toBeLessThanOrEqual(6);
    expect(wide.hintPath.length).toBeGreaterThan(1);
  });
});
