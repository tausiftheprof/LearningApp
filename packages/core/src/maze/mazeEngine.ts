import type { Point } from '../types';

/**
 * MAZE COLLISION ENGINE (pure, framework-agnostic, unit-tested).
 *
 * The supplied maze artwork is a printed picture: dark ink = walls, light =
 * open path. The renderer rasterises that picture once into a WALL MASK
 * (1 = wall pixel, 0 = open) at a fixed resolution W×H. That mask IS the
 * "transparent collision map corresponding to the supplied maze artwork" and
 * is the most reliable, maintainable approach for hand-drawn maze photos:
 * there is no per-level geometry to hand-author or keep in sync - a new maze
 * is just a new picture.
 *
 * COORDINATE SPACE. Everything here works in MASK SPACE (0..width, 0..height)
 * - i.e. the original maze dimensions - never in screen pixels. The renderer
 * scales mask space to the screen for drawing and converts pointer
 * coordinates back into mask space before calling in. Collision therefore
 * stays pixel-accurate at any display size and remains aligned after any
 * resize (see the renderer's `fit()` for the scale/offset transform).
 *
 * COLLISION MODEL. The character is a DISC of radius r (mask px). A disc
 * slides smoothly along walls and never snags on corners the way an
 * axis-aligned box does. To answer "is the WHOLE character on the open path?"
 * in O(1) we precompute a CLEARANCE field once: clearance[i] = distance from
 * cell i to the nearest wall. The disc fits at (x, y) iff clearance ≥ r. That
 * single number accounts for the character's full width and height, not just
 * its centre point, and treats the mask border as wall so the character can
 * never be pushed off the artwork or out of the maze.
 */

/** A rasterised maze: the wall mask plus its precomputed clearance field. */
export interface MazeCollisionMap {
  width: number;
  height: number;
  /** 1 = wall/ink, 0 = open path. Row-major, length width*height. */
  walls: Uint8Array;
  /** Distance (mask px) from each open cell to the nearest wall; 0 on walls. */
  clearance: Float32Array;
}

export interface MazeMoveResult {
  /** Furthest valid disc-centre position (never inside a wall). */
  position: Point;
  /** True if the move was blocked or clipped by a wall at any point. */
  hitWall: boolean;
}

/** Result of auto-fitting a character to a maze and routing it to the finish. */
export interface MazePlan {
  /** Largest disc radius (mask px) that can still travel start → finish. */
  radius: number;
  /** Start / finish snapped onto the open path for that radius. */
  start: Point;
  finish: Point;
  /** Downsampled hint route (mask-space polyline). Highlight only - never moves the character. */
  hintPath: Point[];
}

const MIN_RADIUS = 1;

function inBounds(map: MazeCollisionMap, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < map.width && y < map.height;
}

/**
 * Build a collision map (mask + clearance field) from a raw wall mask.
 * `walls` is row-major, 1 = wall/ink, 0 = open, length width*height.
 */
export function buildCollisionMap(walls: Uint8Array, width: number, height: number): MazeCollisionMap {
  return { width, height, walls, clearance: distanceToWall(walls, width, height) };
}

/**
 * Two-pass chamfer distance transform (weights 1 and √2). Cheap O(W·H) and a
 * good Euclidean approximation - plenty accurate for deciding whether a disc
 * of radius r fits. Wall cells stay 0; open cells hold their distance to the
 * nearest wall. Out-of-bounds neighbours are treated as wall at distance 0,
 * so cells near the mask border get a small clearance and the character is
 * kept inside the artwork.
 */
function distanceToWall(walls: Uint8Array, width: number, height: number): Float32Array {
  const D = new Float32Array(width * height);
  const D1 = 1, D2 = Math.SQRT2, BIG = 1e6;
  for (let i = 0; i < D.length; i++) D[i] = walls[i] ? 0 : BIG;
  const at = (x: number, y: number) => D[y * width + x]!;
  // Forward pass: up, left, up-left, up-right neighbours (+ border as wall).
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (walls[i]) continue;
      const up = y > 0 ? at(x, y - 1) : 0;
      const left = x > 0 ? at(x - 1, y) : 0;
      const ul = x > 0 && y > 0 ? at(x - 1, y - 1) : 0;
      const ur = x < width - 1 && y > 0 ? at(x + 1, y - 1) : 0;
      D[i] = Math.min(D[i]!, up + D1, left + D1, ul + D2, ur + D2);
    }
  }
  // Backward pass: down, right, down-right, down-left neighbours (+ border).
  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      const i = y * width + x;
      if (walls[i]) continue;
      const down = y < height - 1 ? at(x, y + 1) : 0;
      const right = x < width - 1 ? at(x + 1, y) : 0;
      const dr = x < width - 1 && y < height - 1 ? at(x + 1, y + 1) : 0;
      const dl = x > 0 && y < height - 1 ? at(x - 1, y + 1) : 0;
      D[i] = Math.min(D[i]!, down + D1, right + D1, dr + D2, dl + D2);
    }
  }
  return D;
}

/**
 * Keep only the largest connected open region of a wall mask; everything else
 * becomes wall. The supplied maze photos include decorative scenery (a dragon,
 * a castle, grass) whose light pixels are "open" too - isolating the biggest
 * open pocket picks out the maze's own corridor network so the start and
 * finish snap onto IT, not onto some disconnected sliver of background.
 * Returns a NEW mask; the input is not modified.
 */
export function isolateLargestRegion(walls: Uint8Array, width: number, height: number): Uint8Array {
  const label = new Int32Array(width * height).fill(-1);
  const qx = new Int32Array(width * height), qy = new Int32Array(width * height);
  const sizes: number[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (walls[i] || label[i] !== -1) continue;
      const id = sizes.length;
      let qh = 0, qt = 0, size = 0;
      qx[qt] = x; qy[qt] = y; qt++; label[i] = id;
      while (qh < qt) {
        const cx = qx[qh]!, cy = qy[qh]!; qh++; size++;
        for (const [dx, dy] of DIRS) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const ni = ny * width + nx;
          if (walls[ni] || label[ni] !== -1) continue;
          label[ni] = id;
          qx[qt] = nx; qy[qt] = ny; qt++;
        }
      }
      sizes.push(size);
    }
  }
  let big = 0;
  for (let c = 1; c < sizes.length; c++) if (sizes[c]! > sizes[big]!) big = c;
  const out = new Uint8Array(width * height);
  for (let i = 0; i < out.length; i++) out[i] = walls[i] || label[i] !== big ? 1 : 0;
  return out;
}

/**
 * Thin the walls by `passes` pixel-layers (morphological erosion of the wall
 * set). Printed maze photos, once thresholded, often leave hair-thin PINCHES
 * where two walls nearly touch - artefacts of anti-aliasing, not real dead
 * ends - which can split one corridor network into disconnected pieces.
 * Peeling one layer off the walls reopens those pinches while leaving genuine
 * (thick) walls firmly in place. Returns a NEW mask.
 */
export function erodeWalls(walls: Uint8Array, width: number, height: number, passes = 1): Uint8Array {
  let cur = walls;
  for (let pass = 0; pass < passes; pass++) {
    const next = new Uint8Array(cur.length);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        if (!cur[i]) { next[i] = 0; continue; }
        // A wall pixel stays wall only if all 4 neighbours are wall too (or
        // off-grid); a wall pixel touching open space is peeled to open.
        const up = y > 0 ? cur[i - width] : 1;
        const down = y < height - 1 ? cur[i + width] : 1;
        const left = x > 0 ? cur[i - 1] : 1;
        const right = x < width - 1 ? cur[i + 1] : 1;
        next[i] = up && down && left && right ? 1 : 0;
      }
    }
    cur = next;
  }
  return cur;
}

/** True if a disc of radius r centred at (x, y) sits entirely on the open path. */
export function isClear(map: MazeCollisionMap, x: number, y: number, r: number): boolean {
  const cx = Math.round(x), cy = Math.round(y);
  if (!inBounds(map, cx, cy)) return false;
  return map.clearance[cy * map.width + cx]! >= r;
}

/**
 * Move a disc of radius r from `from` toward `to`, as far as the walls allow.
 *
 * - Steps ≤1 mask-pixel at a time so a fast flick can never TUNNEL through a
 *   thin wall - we never test only the endpoints.
 * - When the straight step is blocked, we retry its X-only and Y-only
 *   components so the character GLIDES along the wall instead of stopping
 *   dead (natural sliding).
 * - Returns the furthest valid position; the caller simply keeps the
 *   character there. It never enters a wall, never teleports, and a wall
 *   graze never resets anything.
 */
export function slideMove(map: MazeCollisionMap, from: Point, to: Point, r: number): MazeMoveResult {
  let cx = from.x, cy = from.y, hitWall = false;
  const total = Math.hypot(to.x - cx, to.y - cy);
  if (total < 1e-6) return { position: { x: cx, y: cy }, hitWall };
  const steps = Math.max(1, Math.ceil(total)); // ≤1px per step
  const stepLen = total / steps;
  for (let s = 0; s < steps; s++) {
    // Re-aim from the CURRENT position toward the target every step, so
    // sliding keeps tracking the finger. Each increment is ≤1px, and every
    // candidate is tested from where the character actually is - so it can
    // never jump across a wall to a clear cell on the far side (no tunnelling).
    const rx = to.x - cx, ry = to.y - cy;
    const d = Math.hypot(rx, ry);
    if (d < 1e-6) break;
    const move = Math.min(stepLen, d);
    const ux = (rx / d) * move, uy = (ry / d) * move;
    if (isClear(map, cx + ux, cy + uy, r)) { cx += ux; cy += uy; continue; }
    hitWall = true;
    // Blocked head-on: advance only the axis that stays open (still ≤1px, so
    // still no tunnelling), preferring the larger component. This is what lets
    // the character GLIDE along a wall instead of stopping dead.
    const openX = isClear(map, cx + ux, cy, r);
    const openY = isClear(map, cx, cy + uy, r);
    if (openX && (!openY || Math.abs(ux) >= Math.abs(uy))) cx += ux;
    else if (openY) cy += uy;
    else break; // wedged into a corner - stop at the last valid position
  }
  return { position: { x: cx, y: cy }, hitWall };
}

/**
 * Nearest position to `p` where a disc of radius r fits, searched in growing
 * square rings. Used to place the start/finish/character on the open path
 * even when the hand-eyeballed seed coordinate lands slightly on some ink.
 */
export function snapToClear(map: MazeCollisionMap, p: Point, r: number): Point {
  if (isClear(map, p.x, p.y, r)) return { x: p.x, y: p.y };
  const maxRing = Math.max(map.width, map.height);
  for (let ring = 1; ring < maxRing; ring++) {
    for (let dy = -ring; dy <= ring; dy++) {
      for (let dx = -ring; dx <= ring; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
        const nx = p.x + dx, ny = p.y + dy;
        if (isClear(map, nx, ny, r)) return { x: nx, y: ny };
      }
    }
  }
  return { x: p.x, y: p.y };
}

/** True once the whole disc has entered the circular finish zone. */
export function reachedFinish(pos: Point, finish: Point, r: number, finishRadius: number): boolean {
  const d = Math.hypot(pos.x - finish.x, pos.y - finish.y);
  return d <= Math.max(finishRadius - r, finishRadius * 0.35);
}

const DIRS: ReadonlyArray<readonly [number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/**
 * Breadth-first search for a disc of radius r from `s` to `f`, stepping ONE
 * mask-pixel at a time. Returns the full 1px-contiguous pixel path, or null
 * if the finish is unreachable for that disc size.
 *
 * The 1px step is deliberate: a coarser stride could "hop" over a hair-thin
 * (1px) wall and hand back a route the character - which moves 1px at a time
 * and never crosses a wall - cannot actually follow. Stepping 1px keeps the
 * route and the character's movement rules in exact agreement.
 */
function bfsDisc(map: MazeCollisionMap, s: Point, f: Point, r: number): Point[] | null {
  const W = map.width, H = map.height;
  const sx = Math.round(s.x), sy = Math.round(s.y);
  const fx = Math.round(f.x), fy = Math.round(f.y);
  const seen = new Uint8Array(W * H);
  const prev = new Int32Array(W * H).fill(-1);
  const qx = new Int32Array(W * H), qy = new Int32Array(W * H);
  let qh = 0, qt = 0;
  qx[qt] = sx; qy[qt] = sy; qt++;
  seen[sy * W + sx] = 1;
  let found = false;
  while (qh < qt) {
    const cx = qx[qh]!, cy = qy[qh]!; qh++;
    if (cx === fx && cy === fy) { found = true; break; }
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const ni = ny * W + nx;
      if (seen[ni] || !isClear(map, nx, ny, r)) continue;
      seen[ni] = 1;
      prev[ni] = cy * W + cx;
      qx[qt] = nx; qy[qt] = ny; qt++;
    }
  }
  if (!found) return null;
  const path: Point[] = [];
  let cur = fy * W + fx;
  while (cur !== -1) { path.push({ x: cur % W, y: Math.floor(cur / W) }); cur = prev[cur]!; }
  path.reverse();
  return path;
}

/** Keep at most ~maxPoints evenly spaced points of a polyline (for hints). */
function downsample(path: Point[], maxPoints = 240): Point[] {
  if (path.length <= maxPoints) return path;
  const step = Math.ceil(path.length / maxPoints);
  const out = path.filter((_, i) => i % step === 0);
  if (out[out.length - 1] !== path[path.length - 1]) out.push(path[path.length - 1]!);
  return out;
}

/**
 * Auto-fit a character to a maze: find the LARGEST disc radius (≤ maxRadius)
 * that can still travel from start to finish, then snap the endpoints and
 * compute a hint route for that radius. Trying radii from large to small
 * means any supplied maze photo is playable with no hand-tuned corridor
 * widths - the engine adapts to the artwork.
 *
 * `startFrac` / `finishFrac` are fractions (0..1) of the maze width/height,
 * so they are resolution-independent and can be authored against the
 * original artwork.
 */
export function planRoute(
  map: MazeCollisionMap,
  startFrac: Point,
  finishFrac: Point,
  opts?: { maxRadius?: number },
): MazePlan {
  const startPx = { x: startFrac.x * map.width, y: startFrac.y * map.height };
  const finishPx = { x: finishFrac.x * map.width, y: finishFrac.y * map.height };
  // Snap the endpoints ONCE to the nearest open cell (radius-independent), so
  // they stay near where the author intended - on the maze's corridor network,
  // not drifting to some far wide-open blob when a big disc is tried.
  const s = snapToClear(map, startPx, MIN_RADIUS);
  const f = snapToClear(map, finishPx, MIN_RADIUS);
  const clearanceAt = (p: Point) => {
    const cx = Math.round(p.x), cy = Math.round(p.y);
    return inBounds(map, cx, cy) ? map.clearance[cy * map.width + cx]! : 0;
  };
  // Fit the WIDEST disc that can travel start -> finish. The ceiling is the
  // clearance at the (fixed) endpoints - a disc bigger than that couldn't even
  // sit at the start, so the character could never move off it. Trying radii
  // large -> small, the first that connects routes down corridor CENTRES
  // (isClear keeps the disc r from every wall), giving a big friendly
  // character on wide mazes and a small token on dense pencil mazes.
  const ceiling = Math.max(
    MIN_RADIUS,
    Math.min(
      Math.round(opts?.maxRadius ?? Math.min(map.width, map.height) * 0.05),
      Math.floor(clearanceAt(s)),
      Math.floor(clearanceAt(f)),
    ),
  );
  for (let r = ceiling; r >= MIN_RADIUS; r--) {
    const path = bfsDisc(map, s, f, r);
    if (path) return { radius: r, start: s, finish: f, hintPath: downsample(path) };
  }
  // Fallback (extremely unlikely): a straight hint so the child is never stuck.
  return { radius: MIN_RADIUS, start: s, finish: f, hintPath: [s, f] };
}
