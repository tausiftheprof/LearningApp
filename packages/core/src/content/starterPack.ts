import type { Activity, ContentPack } from './schema';
import { guidedDrawingSubjects } from './guidedBuilds';
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
    // Straight lines are split into a down-stroke and an across-stroke (owner
    // direction): both are core pre-writing skills, and each tile's clay icon
    // then matches the direction actually traced.
    type: 'tracing', id: 'trace-line-down', title: 'Down line', category: 'tracing',
    ageBands: ['2-3', '3-5'], difficulty: 1, motorSkills: ['tracing', 'controlled-movement'],
    estimatedMinutes: 1, theme: 'shapes-patterns', locale: 'en-AU',
    instructionAudio: audio('trace-line'), demoAnimation: 'demo/trace-line.json',
    paths: [line(500, 150, 500, 850)], closed: false,
  },
  {
    type: 'tracing', id: 'trace-line-across', title: 'Across line', category: 'tracing',
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

// Colour by Numbers (owner art, July 2026): black-outline pages with the number
// key printed in the artwork itself, flood-filled by the same line-art engine.
// These form the "Colour by Numbers" section; the scenes below are "Colour Your Way".
// Each page carries a sequenced byNumberPlan (owner direction): the child is
// locked to colour 1 until every region marked 1 is filled, then 1 retires and
// 2 activates, etc. Targets are one point per numbered region (fractions of the
// square artwork), used to check that a tapped region really carries the number.
const colouringActivities: Activity[] = [
  {
    type: 'colouring', id: 'colour-cbn-bunny', title: 'Bunny by Numbers', category: 'colouring',
    ageBands: ['2-3', '3-5'], difficulty: 1, motorSkills: ['tapping', 'precision-placement'],
    estimatedMinutes: 4, theme: 'animals', locale: 'en-AU', instructionAudio: audio('colour-by-number'),
    mode: 'line-art', image: 'images/scene-cbn-bunny.png', regions: [],
    byNumberPlan: [
      { number: 1, colour: '#F8BBD0', targets: [{ x: 0.50, y: 0.32 }, { x: 0.17, y: 0.50 }, { x: 0.845, y: 0.50 }] },
      { number: 2, colour: '#BCAAA4', targets: [{ x: 0.365, y: 0.185 }, { x: 0.635, y: 0.185 }, { x: 0.50, y: 0.625 }] },
      { number: 3, colour: '#A5D6A7', targets: [{ x: 0.36, y: 0.715 }, { x: 0.65, y: 0.715 }, { x: 0.50, y: 0.845 }] },
    ],
  },
  {
    type: 'colouring', id: 'colour-cbn-car', title: 'Car by Numbers', category: 'colouring',
    ageBands: ['2-3', '3-5'], difficulty: 1, motorSkills: ['tapping', 'precision-placement'],
    estimatedMinutes: 4, theme: 'everyday', locale: 'en-AU', instructionAudio: audio('colour-by-number'),
    mode: 'line-art', image: 'images/scene-cbn-car.png', regions: [],
    byNumberPlan: [
      { number: 1, colour: '#EF9A9A', targets: [{ x: 0.49, y: 0.52 }, { x: 0.49, y: 0.86 }] },
      { number: 2, colour: '#B3E5FC', targets: [{ x: 0.40, y: 0.36 }, { x: 0.59, y: 0.36 }] },
      { number: 3, colour: '#FFCC80', targets: [
        { x: 0.15, y: 0.19 }, { x: 0.845, y: 0.20 }, { x: 0.15, y: 0.55 }, { x: 0.845, y: 0.55 },
        { x: 0.305, y: 0.605 }, { x: 0.305, y: 0.685 }, { x: 0.69, y: 0.605 }, { x: 0.69, y: 0.685 },
      ] },
    ],
  },
  {
    type: 'colouring', id: 'colour-cbn-flower', title: 'Flower by Numbers', category: 'colouring',
    ageBands: ['2-3', '3-5'], difficulty: 1, motorSkills: ['tapping', 'precision-placement'],
    estimatedMinutes: 4, theme: 'nature', locale: 'en-AU', instructionAudio: audio('colour-by-number'),
    mode: 'line-art', image: 'images/scene-cbn-flower.png', regions: [],
    byNumberPlan: [
      { number: 1, colour: '#FFE082', targets: [{ x: 0.49, y: 0.44 }, { x: 0.855, y: 0.195 }, { x: 0.16, y: 0.65 }, { x: 0.83, y: 0.66 }] },
      { number: 2, colour: '#F48FB1', targets: [
        { x: 0.49, y: 0.14 }, { x: 0.29, y: 0.29 }, { x: 0.69, y: 0.29 }, { x: 0.36, y: 0.515 }, { x: 0.61, y: 0.515 },
        { x: 0.16, y: 0.57 }, { x: 0.08, y: 0.635 }, { x: 0.24, y: 0.635 }, { x: 0.11, y: 0.715 }, { x: 0.21, y: 0.715 },
        { x: 0.83, y: 0.58 }, { x: 0.75, y: 0.645 }, { x: 0.91, y: 0.645 }, { x: 0.775, y: 0.72 }, { x: 0.885, y: 0.72 },
      ] },
      { number: 3, colour: '#A5D6A7', targets: [
        { x: 0.385, y: 0.715 }, { x: 0.58, y: 0.72 }, { x: 0.10, y: 0.805 }, { x: 0.22, y: 0.805 },
        { x: 0.765, y: 0.825 }, { x: 0.88, y: 0.825 }, { x: 0.485, y: 0.885 },
      ] },
    ],
  },
  {
    type: 'colouring', id: 'colour-cbn-puppy', title: 'Puppy by Numbers', category: 'colouring',
    ageBands: ['2-3', '3-5'], difficulty: 1, motorSkills: ['tapping', 'precision-placement'],
    estimatedMinutes: 4, theme: 'animals', locale: 'en-AU', instructionAudio: audio('colour-by-number'),
    mode: 'line-art', image: 'images/scene-cbn-puppy.png', regions: [],
    byNumberPlan: [
      { number: 1, colour: '#D9B38C', targets: [{ x: 0.50, y: 0.20 }, { x: 0.285, y: 0.265 }, { x: 0.715, y: 0.265 }, { x: 0.50, y: 0.57 }] },
      { number: 2, colour: '#FFE082', targets: [{ x: 0.165, y: 0.49 }, { x: 0.83, y: 0.49 }] },
      { number: 3, colour: '#A5D6A7', targets: [
        { x: 0.105, y: 0.665 }, { x: 0.23, y: 0.655 }, { x: 0.765, y: 0.66 }, { x: 0.885, y: 0.66 }, { x: 0.50, y: 0.845 },
      ] },
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
  { id: 'toddler-feed-mascot', title: 'Feed the mascot', template: 'feed-animal', category: 'toddler', ageBands: ['2-3', '3-5'], difficulty: 1, motorSkills: ['dragging', 'precision-placement'], minutes: 2, theme: 'animals', params: {
    character: 'mascot',
    open: 'images/feed-mascot-open.png',
    chomp: 'images/feed-mascot-chomp.png',
    mouth: { x: 0.5, y: 0.56, r: 0.26 },
    foods: [
      { name: 'strawberry', image: 'images/feed-strawberry.png' },
      { name: 'cupcake', image: 'images/feed-cupcake.png' },
      { name: 'watermelon', image: 'images/feed-watermelon.png' },
      { name: 'icecream', image: 'images/feed-icecream.png' },
    ],
  } },
  { id: 'toddler-feed-kangaroo', title: 'Feed the kangaroo', template: 'feed-animal', category: 'toddler', ageBands: ['2-3', '3-5'], difficulty: 1, motorSkills: ['dragging', 'precision-placement'], minutes: 2, theme: 'animals', params: {
    character: 'kangaroo',
    open: 'images/feed-kangaroo-open.png',
    chomp: 'images/feed-kangaroo-chomp.png',
    mouth: { x: 0.5, y: 0.4, r: 0.23 },
    foods: [
      { name: 'leafy plant', image: 'images/feed-plant1.png' },
      { name: 'little plant', image: 'images/feed-plant2.png' },
      { name: 'grass', image: 'images/feed-grass.png' },
    ],
  } },
  { id: 'toddler-toys-in-box', title: 'Toys in the box', template: 'drag-sort', category: 'toddler', ageBands: ['2-3'], difficulty: 1, motorSkills: ['dragging', 'precision-placement'], minutes: 2, theme: 'everyday', params: { bins: ['box'], items: ['bear', 'car', 'duck', 'star', 'balloon'] } },
  { id: 'toddler-match-objects', title: 'Match the toys', template: 'match-pairs', category: 'toddler', ageBands: ['2-3'], difficulty: 1, motorSkills: ['tapping', 'dragging'], minutes: 2, theme: 'everyday', params: { pairs: 3, images: ['duck', 'car', 'star'] } },
  { id: 'toddler-sort-colour', title: 'Sort by colour', template: 'drag-sort', category: 'toddler', ageBands: ['2-3', '3-5'], difficulty: 1, motorSkills: ['dragging'], minutes: 2, theme: 'shapes-patterns', params: { bins: ['red', 'blue'], items: 6 } },
  { id: 'toddler-shadow-match', title: 'Find my shadow', template: 'shadow-match', category: 'toddler', ageBands: ['2-3', '3-5'], difficulty: 1, motorSkills: ['dragging', 'precision-placement'], minutes: 2, theme: 'animals', params: { items: ['dolphin', 'dinosaur', 'rocket'] } },
  { id: 'toddler-reveal', title: 'Wipe and see!', template: 'reveal-wipe', category: 'toddler', ageBands: ['2-3'], difficulty: 1, motorSkills: ['swiping'], minutes: 1, theme: 'surprise', params: { pictures: ['unicorn', 'whale', 'treehouse'] } },
  { id: 'toddler-stack', title: 'Stack the blocks', template: 'stack-blocks', category: 'toddler', ageBands: ['2-3'], difficulty: 1, motorSkills: ['dragging', 'precision-placement'], minutes: 2, theme: 'everyday', params: { blocks: 4 } },
  // Cutting Practice (owner art, July 2026): drag the scissors along the dotted
  // line across the picture; it snips and splits in two. Scissor-skills builder.
  { id: 'toddler-cut-car', title: 'Cut the car', template: 'cut-along', category: 'toddler', ageBands: ['3-5', '5-7'], difficulty: 2, motorSkills: ['controlled-movement', 'holding-moving', 'bilateral'], minutes: 2, theme: 'everyday', params: {
    image: 'images/cut-car.png', line: 'straight',
    scissorsOpen: 'images/cut-scissors-open.png', scissorsClosed: 'images/cut-scissors-closed.png',
  } },
  { id: 'toddler-cut-cake', title: 'Cut the cake', template: 'cut-along', category: 'toddler', ageBands: ['3-5', '5-7'], difficulty: 2, motorSkills: ['controlled-movement', 'holding-moving', 'bilateral'], minutes: 2, theme: 'food', params: {
    image: 'images/cut-cake.png', line: 'wavy',
    scissorsOpen: 'images/cut-scissors-open.png', scissorsClosed: 'images/cut-scissors-closed.png',
  } },
  // Number Path Hop (owner art, July 2026): tap the lily-pad stones in number
  // order; the mascot hops from pad to pad.
  { id: 'toddler-number-hop', title: 'Hop the numbers', template: 'number-hop', category: 'toddler', ageBands: ['2-3', '3-5'], difficulty: 1, motorSkills: ['tapping'], minutes: 2, theme: 'nature', params: { max: 5, stone: 'images/hop-stone.png' } },
  { id: 'toddler-number-hop-10', title: 'Hop to ten', template: 'number-hop', category: 'toddler', ageBands: ['3-5', '5-7'], difficulty: 2, motorSkills: ['tapping'], minutes: 2, theme: 'nature', params: { max: 10, stone: 'images/hop-stone.png' } },
  // Preschool (PRD 6.6)
  { id: 'preschool-letter-match', title: 'Big and small letters', template: 'letter-match', category: 'toddler', ageBands: ['3-5', '5-7'], difficulty: 2, motorSkills: ['tapping', 'dragging'], minutes: 3, theme: 'letters-numbers', params: { letters: ['A', 'B', 'C', 'D'] } },
  { id: 'preschool-count-objects', title: 'Count the fish', template: 'counting', category: 'toddler', ageBands: ['3-5'], difficulty: 2, motorSkills: ['tapping'], minutes: 2, theme: 'food', params: { max: 5, item: 'fish' } },
  { id: 'preschool-number-quantity', title: 'Numbers and things', template: 'match-pairs', category: 'toddler', ageBands: ['3-5', '5-7'], difficulty: 2, motorSkills: ['dragging'], minutes: 3, theme: 'letters-numbers', params: { pairs: 4, kind: 'number-quantity', item: 'star' } },
  { id: 'preschool-shapes', title: 'Match the shapes', template: 'match-pairs', category: 'toddler', ageBands: ['3-5'], difficulty: 1, motorSkills: ['dragging', 'precision-placement'], minutes: 2, theme: 'shapes-patterns', params: { pairs: 4, kind: 'shapes' } },
  { id: 'preschool-body-parts', title: 'Point to the nose!', template: 'tap-target', category: 'toddler', ageBands: ['2-3', '3-5'], difficulty: 1, motorSkills: ['tapping'], minutes: 2, theme: 'body', params: { targets: ['nose', 'ears', 'hands'], rounds: 5 } },
  { id: 'preschool-emotions', title: 'How do they feel?', template: 'odd-one-out', category: 'toddler', ageBands: ['3-5', '5-7'], difficulty: 2, motorSkills: ['tapping'], minutes: 2, theme: 'emotions', params: { rounds: 4, kind: 'emotions' } },
  { id: 'preschool-helpers', title: 'Helpers and tools', template: 'match-pairs', category: 'toddler', ageBands: ['3-5', '5-7'], difficulty: 2, motorSkills: ['dragging'], minutes: 3, theme: 'community-helpers', params: { pairs: 4, kind: 'helper-tool' } },
  { id: 'preschool-opposites', title: 'Opposites', template: 'match-pairs', category: 'toddler', ageBands: ['5-7'], difficulty: 3, motorSkills: ['dragging'], minutes: 3, theme: 'everyday', params: { pairs: 4, kind: 'opposites' } },
  { id: 'preschool-sequence', title: 'What comes next?', template: 'sequence', category: 'toddler', ageBands: ['3-5', '5-7'], difficulty: 2, motorSkills: ['tapping', 'dragging'], minutes: 2, theme: 'shapes-patterns', params: { length: 4, images: ['sun', 'moon'] } },
  // "What comes next?" pages built from the owner's food/scene art, split by age
  // (owner direction): easy AB patterns for 3-5, harder ABC/AAB/AABB for 5-7.
  { id: 'seq-fruit', title: 'Fruit snack pattern', template: 'sequence', category: 'toddler', ageBands: ['3-5'], difficulty: 2, motorSkills: ['tapping'], minutes: 2, theme: 'shapes-patterns', params: { rounds: 4, pattern: 'AB', images: ['feed-strawberry', 'feed-watermelon'] } },
  { id: 'seq-treats', title: 'Sweet treats pattern', template: 'sequence', category: 'toddler', ageBands: ['3-5'], difficulty: 2, motorSkills: ['tapping'], minutes: 2, theme: 'shapes-patterns', params: { rounds: 4, pattern: 'AB', images: ['feed-cupcake', 'feed-icecream'] } },
  { id: 'seq-garden', title: 'Garden pattern', template: 'sequence', category: 'toddler', ageBands: ['3-5'], difficulty: 2, motorSkills: ['tapping'], minutes: 2, theme: 'shapes-patterns', params: { rounds: 4, pattern: 'AB', images: ['feed-plant1', 'feed-grass'] } },
  { id: 'seq-picnic', title: 'Picnic mix pattern', template: 'sequence', category: 'toddler', ageBands: ['5-7'], difficulty: 3, motorSkills: ['tapping'], minutes: 3, theme: 'shapes-patterns', params: { rounds: 5, pattern: 'ABC', images: ['feed-strawberry', 'feed-cupcake', 'feed-watermelon'] } },
  { id: 'seq-plants', title: 'Growing garden pattern', template: 'sequence', category: 'toddler', ageBands: ['5-7'], difficulty: 3, motorSkills: ['tapping'], minutes: 3, theme: 'shapes-patterns', params: { rounds: 5, pattern: 'AAB', images: ['feed-plant1', 'feed-plant2', 'feed-grass'] } },
  { id: 'seq-journey', title: 'On the go pattern', template: 'sequence', category: 'toddler', ageBands: ['5-7'], difficulty: 3, motorSkills: ['tapping'], minutes: 3, theme: 'shapes-patterns', params: { rounds: 5, pattern: 'AABB', images: ['cut-car', 'hop-stone'] } },
  { id: 'preschool-number-trace-count', title: 'Count and pinch', template: 'counting', category: 'toddler', ageBands: ['3-5', '5-7'], difficulty: 2, motorSkills: ['pinching', 'tapping', 'bilateral'], minutes: 2, theme: 'letters-numbers', params: { max: 8, zoom: true, item: 'star' } },
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
  // Build-a-picture subjects (owner Option A): one part per step, child colours
  // each part, fixed-colour parts (wheels/seeds/eyes) aren't colourable. Geometry
  // lives in guidedBuilds.ts so mobile can reuse the same source of truth.
  ...guidedDrawingSubjects(),
];

/** Dot-to-dot pilot (owner direction, July 2026): tap the numbered dots in
 *  order to reveal the outline, same subject as the guided-drawing pilot. */
/** Ordered points that trace a shape outline for a "join the dots to make a
 *  shape" dot-to-dot (owner direction). Closed loop, evenly numbered. */
function polygonDots(sides: number, r = 360, cx = 500, cy = 500, startDeg = -90): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < sides; i++) {
    const a = ((startDeg + (360 / sides) * i) * Math.PI) / 180;
    pts.push({ x: Math.round(cx + r * Math.cos(a)), y: Math.round(cy + r * Math.sin(a)) });
  }
  return pts;
}
function starDots(cx = 500, cy = 500, outer = 380, inner = 160): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < 10; i++) {
    const a = ((-90 + i * 36) * Math.PI) / 180;
    const r = i % 2 === 0 ? outer : inner;
    pts.push({ x: Math.round(cx + r * Math.cos(a)), y: Math.round(cy + r * Math.sin(a)) });
  }
  return pts;
}

const dotToDotActivities: Activity[] = [
  {
    type: 'game', id: 'draw-dotdot-whale', title: 'Whale', category: 'drawing',
    ageBands: ['3-5', '5-7'], difficulty: 2, motorSkills: ['tapping', 'controlled-movement'],
    estimatedMinutes: 3, theme: 'underwater', locale: 'en-AU', instructionAudio: audio('dot-to-dot'),
    template: 'dot-to-dot', params: { image: 'images/whale.svg', dots: whaleDotSequence() },
  },
  // Join the dots to make a SHAPE (owner direction): a star, a triangle, a square.
  {
    type: 'game', id: 'draw-dotdot-star', title: 'Make a star', category: 'drawing',
    ageBands: ['3-5', '5-7'], difficulty: 2, motorSkills: ['tapping', 'controlled-movement'],
    estimatedMinutes: 2, theme: 'shapes-patterns', locale: 'en-AU', instructionAudio: audio('dot-to-dot'),
    template: 'dot-to-dot', params: { image: 'images/star.svg', dots: starDots(), closed: true },
  },
  {
    type: 'game', id: 'draw-dotdot-triangle', title: 'Make a triangle', category: 'drawing',
    ageBands: ['2-3', '3-5'], difficulty: 1, motorSkills: ['tapping', 'controlled-movement'],
    estimatedMinutes: 1, theme: 'shapes-patterns', locale: 'en-AU', instructionAudio: audio('dot-to-dot'),
    template: 'dot-to-dot', params: { dots: polygonDots(3), closed: true },
  },
  {
    type: 'game', id: 'draw-dotdot-square', title: 'Make a square', category: 'drawing',
    ageBands: ['2-3', '3-5'], difficulty: 1, motorSkills: ['tapping', 'controlled-movement'],
    estimatedMinutes: 1, theme: 'shapes-patterns', locale: 'en-AU', instructionAudio: audio('dot-to-dot'),
    template: 'dot-to-dot', params: { dots: polygonDots(4, 330, 500, 500, -45), closed: true },
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
