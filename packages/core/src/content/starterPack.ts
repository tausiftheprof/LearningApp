import type { Activity, ContentPack } from './schema';
import { DIGIT_CHARS, digitStrokes, LETTERS, letterStrokes } from './glyphs';
import { CONTENT_PACK_FORMAT_VERSION, gameTemplateIds, validateContentPack } from './schema';
import type { Point } from '../types';

/**
 * ILLUSTRATIVE STARTER PACK.
 *
 * This bundled pack demonstrates the content format and lets the app run
 * offline on first launch (FR-026). Geometry is procedurally generated and
 * asset paths are placeholders: production content (professional
 * illustrations, recorded child-friendly audio, the full 20 colouring pages)
 * is produced through the CMS review workflow (docs/12) in delivery phase 2.
 * Every activity here still carries complete, valid metadata so the pipeline,
 * recommendations, daily plan and motor-skill coverage are real.
 */

const audio = (id: string) => `audio/en-AU/${id}.mp3`;

function line(x1: number, y1: number, x2: number, y2: number, steps = 8): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    pts.push({ x: x1 + ((x2 - x1) * i) / steps, y: y1 + ((y2 - y1) * i) / steps });
  }
  return pts;
}

function arc(cx: number, cy: number, r: number, startDeg: number, endDeg: number, steps = 24): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = ((startDeg + ((endDeg - startDeg) * i) / steps) * Math.PI) / 180;
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return pts;
}

function zigzag(): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i <= 6; i++) pts.push({ x: 100 + i * 130, y: i % 2 === 0 ? 300 : 650 });
  return pts;
}

/** Regular polygon (pentagon, hexagon) as a traceable closed path, flat start at top. */
function polygonPath(sides: number, radius: number): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i <= sides; i++) {
    const a = -Math.PI / 2 + (i / sides) * Math.PI * 2;
    const corner = { x: 500 + radius * Math.cos(a), y: 500 + radius * Math.sin(a) };
    if (i === 0) { pts.push(corner); continue; }
    const prev = pts[pts.length - 1]!;
    for (let s = 1; s <= 4; s++) {
      pts.push({ x: prev.x + ((corner.x - prev.x) * s) / 4, y: prev.y + ((corner.y - prev.y) * s) / 4 });
    }
  }
  return pts;
}

/* ---------- Tracing (FR-005): lines, curves, shapes, letters, numbers ---------- */

const tracingActivities: Activity[] = [
  {
    type: 'tracing', id: 'trace-line-straight', title: 'Straight line', category: 'tracing',
    ageBands: ['2-3', '3-5'], difficulty: 1, motorSkills: ['tracing', 'controlled-movement'],
    estimatedMinutes: 1, theme: 'shapes-patterns', locale: 'en-AU',
    instructionAudio: audio('trace-line'), demoAnimation: 'demo/trace-line.json',
    paths: [line(150, 500, 850, 500)], closed: false,
  },
  {
    type: 'tracing', id: 'trace-curve', title: 'Big curve', category: 'tracing',
    ageBands: ['2-3', '3-5'], difficulty: 1, motorSkills: ['tracing', 'controlled-movement'],
    estimatedMinutes: 1, theme: 'shapes-patterns', locale: 'en-AU',
    instructionAudio: audio('trace-curve'), paths: [arc(500, 700, 350, 200, 340)], closed: false,
  },
  {
    type: 'tracing', id: 'trace-zigzag', title: 'Zigzag', category: 'tracing',
    ageBands: ['3-5', '5-7'], difficulty: 2, motorSkills: ['tracing', 'controlled-movement'],
    estimatedMinutes: 1, theme: 'shapes-patterns', locale: 'en-AU',
    instructionAudio: audio('trace-zigzag'), paths: [zigzag()], closed: false,
  },
  {
    type: 'tracing', id: 'trace-circle', title: 'Circle', category: 'tracing',
    ageBands: ['2-3', '3-5', '5-7'], difficulty: 1, motorSkills: ['tracing'],
    estimatedMinutes: 1, theme: 'shapes-patterns', locale: 'en-AU',
    instructionAudio: audio('trace-circle'), paths: [arc(500, 500, 300, -90, -450)], closed: true,
  },
  {
    type: 'tracing', id: 'trace-square', title: 'Square', category: 'tracing',
    ageBands: ['3-5', '5-7'], difficulty: 2, motorSkills: ['tracing'],
    estimatedMinutes: 1, theme: 'shapes-patterns', locale: 'en-AU',
    instructionAudio: audio('trace-square'),
    paths: [[...line(250, 250, 750, 250, 4), ...line(750, 250, 750, 750, 4), ...line(750, 750, 250, 750, 4), ...line(250, 750, 250, 250, 4)]],
    closed: true,
  },
  {
    type: 'tracing', id: 'trace-triangle', title: 'Triangle', category: 'tracing',
    ageBands: ['3-5', '5-7'], difficulty: 2, motorSkills: ['tracing'],
    estimatedMinutes: 1, theme: 'shapes-patterns', locale: 'en-AU',
    instructionAudio: audio('trace-triangle'),
    // Start at the top (apex): down the left side, across the base left-to-right,
    // then up the right side back to the apex.
    paths: [[...line(500, 200, 200, 750, 4), ...line(200, 750, 800, 750, 4), ...line(800, 750, 500, 200, 4)]],
    closed: true,
  },
  {
    type: 'tracing', id: 'trace-rectangle', title: 'Rectangle', category: 'tracing',
    ageBands: ['3-5', '5-7'], difficulty: 2, motorSkills: ['tracing'],
    estimatedMinutes: 1, theme: 'shapes-patterns', locale: 'en-AU',
    instructionAudio: audio('trace-rectangle'),
    paths: [[...line(180, 340, 820, 340, 5), ...line(820, 340, 820, 660, 3), ...line(820, 660, 180, 660, 5), ...line(180, 660, 180, 340, 3)]],
    closed: true,
  },
  {
    type: 'tracing', id: 'trace-oval', title: 'Oval', category: 'tracing',
    ageBands: ['3-5', '5-7'], difficulty: 2, motorSkills: ['tracing'],
    estimatedMinutes: 1, theme: 'shapes-patterns', locale: 'en-AU',
    instructionAudio: audio('trace-oval'),
    paths: [arc(500, 500, 340, -90, -450, 28).map((p) => ({ x: p.x, y: 500 + (p.y - 500) * 0.68 }))],
    closed: true,
  },
  {
    type: 'tracing', id: 'trace-pentagon', title: 'Pentagon', category: 'tracing',
    ageBands: ['5-7'], difficulty: 3, motorSkills: ['tracing'],
    estimatedMinutes: 1, theme: 'shapes-patterns', locale: 'en-AU',
    instructionAudio: audio('trace-pentagon'),
    paths: [polygonPath(5, 350)],
    closed: true,
  },
  {
    type: 'tracing', id: 'trace-hexagon', title: 'Hexagon', category: 'tracing',
    ageBands: ['5-7'], difficulty: 3, motorSkills: ['tracing'],
    estimatedMinutes: 1, theme: 'shapes-patterns', locale: 'en-AU',
    instructionAudio: audio('trace-hexagon'),
    paths: [polygonPath(6, 350)],
    closed: true,
  },
];

// Letters A-Z (capital + small side by side) and numbers 0-9 from the glyph
// library. The tracing player runs the strokes in order and auto-advances to
// the next letter/number on completion (owner direction).
for (const ch of LETTERS) {
  tracingActivities.push({
    type: 'tracing', id: `trace-letter-${ch.toLowerCase()}`, title: `Letter ${ch} · ${ch.toLowerCase()}`, category: 'tracing',
    ageBands: ['3-5', '5-7'], difficulty: 2, motorSkills: ['tracing', 'controlled-movement'],
    estimatedMinutes: 2, theme: 'letters-numbers', locale: 'en-AU',
    instructionAudio: audio(`trace-letter-${ch.toLowerCase()}`), paths: letterStrokes(ch), closed: false,
  });
}
// Numbers 0 to 10 (owner direction: counting numbers through ten).
for (const ch of [...DIGIT_CHARS, '10']) {
  tracingActivities.push({
    type: 'tracing', id: `trace-number-${ch}`, title: `Number ${ch}`, category: 'tracing',
    ageBands: ['3-5', '5-7'], difficulty: 2, motorSkills: ['tracing', 'controlled-movement'],
    estimatedMinutes: 2, theme: 'letters-numbers', locale: 'en-AU',
    instructionAudio: audio(`trace-number-${ch}`), paths: digitStrokes(ch), closed: false,
  });
}

/* ---------- Colouring (FR-006): 4 illustrative pages; 20 via CMS in phase 2 ---------- */

function rectRegion(id: string, x: number, y: number, w: number, h: number, number?: number) {
  return {
    id,
    polygon: [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }],
    ...(number !== undefined ? { number } : {}),
  };
}

/** Closed polygon region from explicit points (owner: colouring pages must be real picture sketches). */
function polyRegion(id: string, polygon: Point[], number?: number) {
  return { id, polygon, ...(number !== undefined ? { number } : {}) };
}

/** Ellipse outline as a polygon (design space 0..1000). */
function ellipse(cx: number, cy: number, rx: number, ry: number, steps = 28): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    pts.push({ x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) });
  }
  return pts;
}

const colouringActivities: Activity[] = [
  {
    type: 'colouring', id: 'colour-balloon', title: 'Pack of balloons', category: 'colouring',
    ageBands: ['2-3', '3-5'], difficulty: 1, motorSkills: ['tapping', 'holding-moving', 'pinching'],
    estimatedMinutes: 3, theme: 'celebrations', locale: 'en-AU', instructionAudio: audio('colour-free'),
    mode: 'free',
    // A bunch of three balloons whose strings gather at a bow (owner direction).
    regions: [
      polyRegion('sun', ellipse(140, 140, 80, 80)),
      polyRegion('string-1', [{ x: 300, y: 470 }, { x: 340, y: 470 }, { x: 512, y: 764 }, { x: 478, y: 776 }]),
      polyRegion('string-2', [{ x: 528, y: 402 }, { x: 566, y: 402 }, { x: 522, y: 760 }, { x: 488, y: 758 }]),
      polyRegion('string-3', [{ x: 748, y: 496 }, { x: 786, y: 490 }, { x: 540, y: 762 }, { x: 516, y: 738 }]),
      polyRegion('balloon-1', ellipse(310, 310, 140, 168)),
      polyRegion('balloon-2', ellipse(548, 238, 128, 158)),
      polyRegion('balloon-3', ellipse(772, 340, 118, 148)),
      polyRegion('bow', ellipse(508, 792, 56, 44, 16)),
    ],
  },
  {
    type: 'colouring', id: 'colour-fish-by-number', title: 'Fish by numbers', category: 'colouring',
    ageBands: ['3-5', '5-7'], difficulty: 2, motorSkills: ['tapping', 'precision-placement'],
    estimatedMinutes: 4, theme: 'underwater', locale: 'en-AU', instructionAudio: audio('colour-by-number'),
    mode: 'by-number',
    // A proper fish: oval body, forked tail, top and bottom fins, eye, bubbles.
    regions: [
      polyRegion('sea', [{ x: 60, y: 830 }, { x: 940, y: 830 }, { x: 940, y: 950 }, { x: 60, y: 950 }], 4),
      polyRegion('body', ellipse(420, 510, 250, 160), 1),
      polyRegion('tail', [{ x: 645, y: 510 }, { x: 850, y: 365 }, { x: 805, y: 510 }, { x: 850, y: 655 }], 2),
      polyRegion('fin-top', [{ x: 330, y: 372 }, { x: 452, y: 268 }, { x: 508, y: 372 }], 3),
      polyRegion('fin-bottom', [{ x: 360, y: 648 }, { x: 432, y: 742 }, { x: 508, y: 645 }], 3),
      polyRegion('eye', ellipse(300, 470, 30, 30, 16)),
      polyRegion('bubble-1', ellipse(720, 240, 34, 34, 14)),
      polyRegion('bubble-2', ellipse(790, 160, 24, 24, 12)),
    ],
  },
  {
    type: 'colouring', id: 'colour-rocket', title: 'Rocket', category: 'colouring',
    ageBands: ['3-5', '5-7'], difficulty: 2, motorSkills: ['holding-moving', 'pinching'],
    estimatedMinutes: 4, theme: 'space', locale: 'en-AU', instructionAudio: audio('colour-free'),
    mode: 'free',
    // Rocket-shaped sketch: body, nose cone, fins, flame, round window on top.
    regions: [
      polyRegion('body', [{ x: 400, y: 300 }, { x: 600, y: 300 }, { x: 600, y: 700 }, { x: 400, y: 700 }]),
      polyRegion('nose', [{ x: 380, y: 300 }, { x: 500, y: 120 }, { x: 620, y: 300 }]),
      polyRegion('fin-left', [{ x: 400, y: 540 }, { x: 280, y: 740 }, { x: 400, y: 700 }]),
      polyRegion('fin-right', [{ x: 600, y: 540 }, { x: 720, y: 740 }, { x: 600, y: 700 }]),
      polyRegion('flame', [{ x: 445, y: 700 }, { x: 555, y: 700 }, { x: 500, y: 875 }]),
      polyRegion('window', ellipse(500, 430, 62, 62, 20)),
    ],
  },
];

/** Full-page line-art scenes: the owner's own reference artwork (July 2026),
 *  used exactly as supplied (assets/images/scene-*.png) - flood-fill
 *  colouring rather than authored polygons. Originals kept for reference in
 *  design-reference/colouring-pages/. */
const lineArtScenes: Activity[] = [
  {
    type: 'colouring', id: 'colour-solar-system', title: 'The Solar System', category: 'colouring',
    ageBands: ['3-5', '5-7'], difficulty: 2, motorSkills: ['tapping', 'precision-placement'],
    estimatedMinutes: 5, theme: 'space', locale: 'en-AU', instructionAudio: audio('colour-free'),
    mode: 'line-art', image: 'images/scene-solar-system.png', regions: [],
  },
  {
    type: 'colouring', id: 'colour-rocket-space', title: 'Rocket in Space', category: 'colouring',
    ageBands: ['3-5', '5-7'], difficulty: 2, motorSkills: ['tapping', 'precision-placement'],
    estimatedMinutes: 5, theme: 'space', locale: 'en-AU', instructionAudio: audio('colour-free'),
    mode: 'line-art', image: 'images/scene-rocket-space.png', regions: [],
  },
  {
    type: 'colouring', id: 'colour-unicorn-rainbow', title: 'Unicorn Rainbow', category: 'colouring',
    ageBands: ['2-3', '3-5', '5-7'], difficulty: 1, motorSkills: ['tapping'],
    estimatedMinutes: 5, theme: 'fantasy', locale: 'en-AU', instructionAudio: audio('colour-free'),
    mode: 'line-art', image: 'images/scene-unicorn-rainbow.png', regions: [],
  },
  {
    type: 'colouring', id: 'colour-monkey-tree', title: 'Monkey in the Tree', category: 'colouring',
    ageBands: ['2-3', '3-5', '5-7'], difficulty: 1, motorSkills: ['tapping'],
    estimatedMinutes: 5, theme: 'animals', locale: 'en-AU', instructionAudio: audio('colour-free'),
    mode: 'line-art', image: 'images/scene-monkey-tree.png', regions: [],
  },
  {
    type: 'colouring', id: 'colour-rabbit-carrot', title: 'Rabbit with a Carrot', category: 'colouring',
    ageBands: ['2-3', '3-5', '5-7'], difficulty: 1, motorSkills: ['tapping'],
    estimatedMinutes: 5, theme: 'animals', locale: 'en-AU', instructionAudio: audio('colour-free'),
    mode: 'line-art', image: 'images/scene-rabbit-carrot.png', regions: [],
  },
  {
    type: 'colouring', id: 'colour-whale-waves', title: 'Whale', category: 'colouring',
    ageBands: ['2-3', '3-5', '5-7'], difficulty: 1, motorSkills: ['tapping'],
    estimatedMinutes: 5, theme: 'underwater', locale: 'en-AU', instructionAudio: audio('colour-free'),
    mode: 'line-art', image: 'images/scene-whale-waves.png', regions: [],
  },
];
colouringActivities.push(...lineArtScenes);

/* ---------- Puzzles (FR-007): ten image jigsaws from assets/images/ ---------- */

const jigsaw = (
  id: string, title: string, image: string, rows: number, cols: number,
  difficulty: 1 | 2 | 3, ageBands: Activity['ageBands'], theme: string, rotating = false,
): Activity => ({
  type: 'jigsaw', id, title, category: 'puzzles', ageBands, difficulty,
  motorSkills: rotating ? ['dragging', 'rotating', 'precision-placement'] : ['dragging', 'precision-placement'],
  estimatedMinutes: rows * cols <= 4 ? 3 : 4, theme, locale: 'en-AU',
  instructionAudio: audio('puzzle-jigsaw'),
  image: `images/${image}.svg`, rows, cols, rotatingPieces: rotating, sizeSelectable: false,
});

/** Owner-supplied photo jigsaws (July 2026): the child picks 2x2/3x3/4x4
 *  before the board appears (see `sizeSelectable`, web-demo/demo-shell.html's
 *  renderPuzzle) - `rows`/`cols` here are just the schema-required default. */
const photoJigsaw = (
  id: string, title: string, image: string, ageBands: Activity['ageBands'], theme: string,
): Activity => ({
  type: 'jigsaw', id, title, category: 'puzzles', ageBands, difficulty: 2,
  motorSkills: ['dragging', 'precision-placement'],
  estimatedMinutes: 4, theme, locale: 'en-AU',
  instructionAudio: audio('puzzle-jigsaw'),
  image: `images/${image}.png`, rows: 3, cols: 3, rotatingPieces: false, sizeSelectable: true,
});

const puzzleActivities: Activity[] = [
  jigsaw('puzzle-dolphin', 'Splashy dolphin', 'dolphin', 2, 2, 1, ['2-3', '3-5'], 'underwater'),
  jigsaw('puzzle-panda', 'Sleepy panda', 'panda', 2, 2, 1, ['2-3', '3-5'], 'animals'),
  jigsaw('puzzle-duck', 'Little duck', 'duck', 2, 2, 1, ['2-3'], 'animals'),
  jigsaw('puzzle-whale', 'Gentle whale', 'whale', 2, 3, 2, ['3-5'], 'underwater'),
  jigsaw('puzzle-unicorn', 'Magic unicorn', 'unicorn', 2, 3, 2, ['3-5', '5-7'], 'fairy-tales'),
  jigsaw('puzzle-dinosaur', 'Friendly dinosaur', 'dinosaur', 2, 3, 2, ['3-5', '5-7'], 'dinosaurs'),
  jigsaw('puzzle-elephant', 'Baby elephant', 'elephant', 3, 3, 2, ['3-5', '5-7'], 'animals'),
  jigsaw('puzzle-treehouse', 'Treehouse hideout', 'treehouse', 3, 3, 3, ['5-7'], 'nature'),
  jigsaw('puzzle-balloon', 'Rainbow balloon', 'balloon', 3, 3, 3, ['5-7'], 'adventure'),
  jigsaw('puzzle-rocket', 'Rocket to the stars', 'rocket', 3, 3, 3, ['5-7'], 'space', true),
  photoJigsaw('puzzle-photo-monkey', 'Monkey Puzzle', 'puzzle-monkey', ['2-3', '3-5', '5-7'], 'animals'),
  photoJigsaw('puzzle-photo-rabbit', 'Rabbit Puzzle', 'puzzle-rabbit', ['2-3', '3-5', '5-7'], 'animals'),
  photoJigsaw('puzzle-photo-unicorn', 'Unicorn Puzzle', 'puzzle-unicorn', ['2-3', '3-5', '5-7'], 'fairy-tales'),
  photoJigsaw('puzzle-photo-whale', 'Whale Puzzle', 'puzzle-whale', ['2-3', '3-5', '5-7'], 'underwater'),
];

/* ---------- Games: 10 toddler + 10 preschool + 10 logic (FR-008..FR-010) ---------- */

type GameSpec = {
  id: string; title: string; template: (typeof gameTemplateIds)[number]; category: 'toddler' | 'preschool' | 'logic';
  ageBands: Activity['ageBands']; difficulty: 1 | 2 | 3; motorSkills: Activity['motorSkills'];
  minutes: number; theme: string; params: Record<string, unknown>;
};

const games: GameSpec[] = [
  // Toddler (PRD 6.5)
  { id: 'toddler-pop-bubbles', title: 'Pop the bubbles', template: 'pop-bubbles', category: 'toddler', ageBands: ['2-3'], difficulty: 1, motorSkills: ['tapping'], minutes: 2, theme: 'underwater', params: { count: 10 } },
  { id: 'toddler-tap-animal', title: 'Tap the animal', template: 'tap-target', category: 'toddler', ageBands: ['2-3'], difficulty: 1, motorSkills: ['tapping'], minutes: 2, theme: 'animals', params: { targets: ['dog', 'cat', 'duck'], rounds: 5 } },
  { id: 'toddler-feed-animal', title: 'Feed the bear', template: 'feed-animal', category: 'toddler', ageBands: ['2-3'], difficulty: 1, motorSkills: ['dragging'], minutes: 2, theme: 'animals', params: { animal: 'bear', food: 'fish', foods: 4 } },
  { id: 'toddler-toys-in-box', title: 'Toys in the box', template: 'drag-sort', category: 'toddler', ageBands: ['2-3'], difficulty: 1, motorSkills: ['dragging', 'precision-placement'], minutes: 2, theme: 'everyday', params: { bins: ['box'], items: ['bear', 'car', 'duck', 'star', 'balloon'] } },
  { id: 'toddler-match-objects', title: 'Match the toys', template: 'match-pairs', category: 'toddler', ageBands: ['2-3'], difficulty: 1, motorSkills: ['tapping', 'dragging'], minutes: 2, theme: 'everyday', params: { pairs: 3, images: ['duck', 'car', 'star'] } },
  { id: 'toddler-sort-colour', title: 'Sort by colour', template: 'drag-sort', category: 'toddler', ageBands: ['2-3', '3-5'], difficulty: 1, motorSkills: ['dragging'], minutes: 2, theme: 'shapes-patterns', params: { bins: ['red', 'blue'], items: 6 } },
  { id: 'toddler-shadow-match', title: 'Find my shadow', template: 'shadow-match', category: 'toddler', ageBands: ['2-3', '3-5'], difficulty: 1, motorSkills: ['dragging', 'precision-placement'], minutes: 2, theme: 'animals', params: { items: ['dolphin', 'dinosaur', 'rocket'] } },
  { id: 'toddler-reveal', title: 'Wipe and see!', template: 'reveal-wipe', category: 'toddler', ageBands: ['2-3'], difficulty: 1, motorSkills: ['swiping'], minutes: 1, theme: 'surprise', params: { pictures: ['unicorn', 'whale', 'treehouse'] } },
  { id: 'toddler-stack', title: 'Stack the blocks', template: 'stack-blocks', category: 'toddler', ageBands: ['2-3'], difficulty: 1, motorSkills: ['dragging', 'precision-placement'], minutes: 2, theme: 'everyday', params: { blocks: 4 } },
  // Preschool (PRD 6.6)
  { id: 'preschool-letter-match', title: 'Big and small letters', template: 'letter-match', category: 'preschool', ageBands: ['3-5', '5-7'], difficulty: 2, motorSkills: ['tapping', 'dragging'], minutes: 3, theme: 'letters-numbers', params: { letters: ['A', 'B', 'C', 'D'] } },
  { id: 'preschool-count-objects', title: 'Count the fish', template: 'counting', category: 'preschool', ageBands: ['3-5'], difficulty: 2, motorSkills: ['tapping'], minutes: 2, theme: 'food', params: { max: 5, item: 'fish' } },
  { id: 'preschool-number-quantity', title: 'Numbers and things', template: 'match-pairs', category: 'preschool', ageBands: ['3-5', '5-7'], difficulty: 2, motorSkills: ['dragging'], minutes: 3, theme: 'letters-numbers', params: { pairs: 4, kind: 'number-quantity', item: 'star' } },
  { id: 'preschool-shapes', title: 'Match the shapes', template: 'match-pairs', category: 'preschool', ageBands: ['3-5'], difficulty: 1, motorSkills: ['dragging', 'precision-placement'], minutes: 2, theme: 'shapes-patterns', params: { pairs: 4, kind: 'shapes' } },
  { id: 'preschool-body-parts', title: 'Point to the nose!', template: 'tap-target', category: 'preschool', ageBands: ['2-3', '3-5'], difficulty: 1, motorSkills: ['tapping'], minutes: 2, theme: 'body', params: { targets: ['nose', 'ears', 'hands'], rounds: 5 } },
  { id: 'preschool-emotions', title: 'How do they feel?', template: 'odd-one-out', category: 'preschool', ageBands: ['3-5', '5-7'], difficulty: 2, motorSkills: ['tapping'], minutes: 2, theme: 'emotions', params: { rounds: 4, kind: 'emotions' } },
  { id: 'preschool-helpers', title: 'Helpers and tools', template: 'match-pairs', category: 'preschool', ageBands: ['3-5', '5-7'], difficulty: 2, motorSkills: ['dragging'], minutes: 3, theme: 'community-helpers', params: { pairs: 4, kind: 'helper-tool' } },
  { id: 'preschool-opposites', title: 'Opposites', template: 'match-pairs', category: 'preschool', ageBands: ['5-7'], difficulty: 3, motorSkills: ['dragging'], minutes: 3, theme: 'everyday', params: { pairs: 4, kind: 'opposites' } },
  { id: 'preschool-sequence', title: 'What comes next?', template: 'sequence', category: 'preschool', ageBands: ['3-5', '5-7'], difficulty: 2, motorSkills: ['tapping', 'dragging'], minutes: 2, theme: 'shapes-patterns', params: { length: 4, images: ['sun', 'moon'] } },
  { id: 'preschool-number-trace-count', title: 'Count and pinch', template: 'counting', category: 'preschool', ageBands: ['3-5', '5-7'], difficulty: 2, motorSkills: ['pinching', 'tapping', 'bilateral'], minutes: 2, theme: 'letters-numbers', params: { max: 8, zoom: true, item: 'star' } },
  // Logic (PRD 6.7)
  { id: 'logic-pattern', title: 'Finish the pattern', template: 'pattern-complete', category: 'logic', ageBands: ['3-5', '5-7'], difficulty: 2, motorSkills: ['tapping', 'dragging'], minutes: 2, theme: 'shapes-patterns', params: { rounds: 4, images: ['star', 'fish', 'sun'] } },
  { id: 'logic-odd-one-out', title: 'Find the odd one', template: 'odd-one-out', category: 'logic', ageBands: ['3-5', '5-7'], difficulty: 2, motorSkills: ['tapping'], minutes: 2, theme: 'everyday', params: { rounds: 5, kind: 'objects' } },
  { id: 'logic-memory-4', title: 'Memory friends', template: 'memory-cards', category: 'logic', ageBands: ['3-5'], difficulty: 2, motorSkills: ['tapping'], minutes: 3, theme: 'animals', params: { pairs: 4, images: ['dolphin', 'unicorn', 'dinosaur', 'whale'] } },
  { id: 'logic-memory-6', title: 'Memory master', template: 'memory-cards', category: 'logic', ageBands: ['5-7'], difficulty: 3, motorSkills: ['tapping'], minutes: 4, theme: 'space', params: { pairs: 6, images: ['dolphin', 'unicorn', 'dinosaur', 'whale', 'rocket', 'star'] } },
  { id: 'logic-size-order', title: 'Small to big', template: 'drag-sort', category: 'logic', ageBands: ['3-5', '5-7'], difficulty: 2, motorSkills: ['dragging', 'precision-placement'], minutes: 2, theme: 'everyday', params: { bins: ['1', '2', '3', '4'], items: 4, ordered: true, item: 'dinosaur' } },
  { id: 'logic-belongs', title: 'What belongs together?', template: 'match-pairs', category: 'logic', ageBands: ['3-5', '5-7'], difficulty: 2, motorSkills: ['dragging'], minutes: 3, theme: 'everyday', params: { pairs: 4, kind: 'belongs' } },
  { id: 'logic-rotate-shape', title: 'Turn it to fit', template: 'sequence', category: 'logic', ageBands: ['5-7'], difficulty: 3, motorSkills: ['rotating', 'precision-placement'], minutes: 3, theme: 'shapes-patterns', params: { length: 3, rotation: true } },
  { id: 'logic-coding-steps', title: 'Robot steps', template: 'sequence', category: 'logic', ageBands: ['5-7'], difficulty: 3, motorSkills: ['tapping', 'dragging'], minutes: 4, theme: 'space', params: { length: 5, kind: 'directions' } },
];

const gameActivities: Activity[] = games.map((g) => ({
  type: 'game',
  id: g.id,
  title: g.title,
  category: g.category,
  ageBands: g.ageBands,
  difficulty: g.difficulty,
  motorSkills: g.motorSkills,
  estimatedMinutes: g.minutes,
  theme: g.theme,
  locale: 'en-AU',
  instructionAudio: audio(g.template),
  template: g.template,
  params: g.params,
}));

/* ---------- Drawing board entry (free drawing is app-native; this catalogues it) ---------- */

/**
 * Simplified whale silhouette for the guided-drawing / dot-to-dot pilot
 * (owner direction, July 2026): body, tail flukes, fin, spout and eye, each
 * its own traceable stroke in the same 0..1000 design space as tracing
 * shapes. Proportions echo the whale.svg icon (head/eye at left, tail at
 * right). If the pilot lands well, the same technique extends to the other
 * jigsaw/sketch subjects (dolphin, dinosaur, unicorn, ...) later.
 */
function whaleBody(): Point[] {
  // A circle squished vertically into an oval, same technique as trace-oval.
  return arc(480, 480, 320, -90, 270, 40).map((p) => ({ x: p.x, y: 480 + (p.y - 480) * 0.5625 }));
}
function whaleTail(): Point[] {
  // Both ends meet the body at its rightmost point (800, 480) - a clean
  // fluke "M" shape with no gap where it joins the body outline.
  return [
    ...line(800, 480, 945, 320, 6),
    ...line(945, 320, 865, 480, 6),
    ...line(865, 480, 945, 645, 6),
    ...line(945, 645, 800, 480, 6),
  ];
}
function whaleFin(): Point[] {
  return arc(480, 650, 110, 20, 160, 14);
}
function whaleSpout(): Point[] {
  return [...line(235, 175, 280, 340, 6), ...line(280, 340, 325, 185, 6)];
}
function whaleEye(): Point[] {
  return arc(235, 430, 24, -90, 270, 16);
}
/** Five strokes, drawn in a natural order: body, tail, fin, spout, eye. */
function whaleOutline(): Point[][] {
  return [whaleBody(), whaleTail(), whaleFin(), whaleSpout(), whaleEye()];
}
/**
 * Evenly re-spaces points along a path by arc length (not by index), so a
 * short, tightly-interpolated segment like the tail flukes doesn't end up
 * with a cluster of dots while a long smooth arc gets sparse ones.
 */
function resampleByArcLength(points: Point[], count: number): Point[] {
  const dist = [0];
  for (let i = 1; i < points.length; i++) {
    dist.push(dist[i - 1]! + Math.hypot(points[i]!.x - points[i - 1]!.x, points[i]!.y - points[i - 1]!.y));
  }
  const total = dist[dist.length - 1]!;
  const out: Point[] = [];
  for (let k = 0; k < count; k++) {
    const target = (total * k) / count;
    let i = 1;
    while (i < dist.length - 1 && dist[i]! < target) i++;
    const segStart = dist[i - 1]!, segEnd = dist[i]!;
    const t = segEnd > segStart ? (target - segStart) / (segEnd - segStart) : 0;
    const a = points[i - 1]!, b = points[i]!;
    out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  return out;
}
/** Body + tail as one closed loop, evenly spaced to a friendly dot count for dot-to-dot. */
function whaleDotSequence(): Point[] {
  const body = whaleBody(); // 41 points; index 10 is the rightmost (tail-side) point
  const loop = [...body.slice(0, 11), ...whaleTail(), ...body.slice(11)];
  return resampleByArcLength(loop, 18);
}

const drawingActivities: Activity[] = [
  {
    type: 'guided-drawing', id: 'draw-free-board', title: 'Blank canvas', category: 'drawing',
    ageBands: ['2-3', '3-5', '5-7'], difficulty: 1,
    motorSkills: ['holding-moving', 'controlled-movement', 'swiping'],
    estimatedMinutes: 5, theme: 'creative', locale: 'en-AU', instructionAudio: audio('draw-free'),
    steps: [{ prompt: 'images/blank.png', overlay: [{ x: 0, y: 0 }, { x: 1000, y: 1000 }] }],
  },
  // Guided drawing pilot (owner direction, July 2026): a real traceable
  // outline, not just a faint reference image - each step is one stroke the
  // child follows with their own chosen brush/colour (web-demo's
  // renderGuidedDrawing; mobile GuidedDrawingPlayer). More subjects land
  // once this is validated.
  {
    type: 'guided-drawing', id: 'draw-guided-whale', title: 'Whale', category: 'drawing',
    ageBands: ['3-5', '5-7'], difficulty: 2, motorSkills: ['holding-moving', 'controlled-movement', 'tracing'],
    estimatedMinutes: 4, theme: 'underwater', locale: 'en-AU', instructionAudio: audio('draw-guided'),
    steps: whaleOutline().map((overlay) => ({ prompt: 'images/whale.svg', overlay })),
  },
];

/** Dot-to-dot pilot (owner direction, July 2026): tap the numbered dots in
 *  order to reveal the outline, same subject as the guided-drawing pilot. */
const dotToDotActivities: Activity[] = [
  {
    type: 'game', id: 'draw-dotdot-whale', title: 'Whale', category: 'drawing',
    ageBands: ['3-5', '5-7'], difficulty: 2, motorSkills: ['tapping', 'controlled-movement'],
    estimatedMinutes: 3, theme: 'underwater', locale: 'en-AU', instructionAudio: audio('dot-to-dot'),
    template: 'dot-to-dot', params: { image: 'images/whale.svg', dots: whaleDotSequence() },
  },
];

export function buildStarterPack(): ContentPack {
  const pack = {
    formatVersion: CONTENT_PACK_FORMAT_VERSION,
    packId: 'starter',
    version: '0.1.0',
    minAppVersion: '0.1.0',
    locales: ['en-AU'],
    entitlement: 'free' as const,
    activities: [
      ...drawingActivities,
      ...dotToDotActivities,
      ...tracingActivities,
      ...colouringActivities,
      ...puzzleActivities,
      ...gameActivities,
    ],
  };
  const result = validateContentPack(pack);
  if (!result.ok || !result.pack) {
    throw new Error(`starter pack invalid: ${result.errors.join('; ')}`);
  }
  return result.pack;
}
