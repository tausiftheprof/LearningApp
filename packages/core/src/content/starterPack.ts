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
    instructionAudio: audio('trace-circle'), paths: [arc(500, 500, 300, -90, 270)], closed: true,
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
    paths: [[...line(500, 200, 800, 750, 4), ...line(800, 750, 200, 750, 4), ...line(200, 750, 500, 200, 4)]],
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
for (const ch of DIGIT_CHARS) {
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
    type: 'colouring', id: 'colour-balloon', title: 'Balloons', category: 'colouring',
    ageBands: ['2-3', '3-5'], difficulty: 1, motorSkills: ['tapping', 'holding-moving', 'pinching'],
    estimatedMinutes: 3, theme: 'celebrations', locale: 'en-AU', instructionAudio: audio('colour-free'),
    mode: 'free',
    // Real picture sketch (owner direction): sun, two balloons with knots, grass.
    regions: [
      polyRegion('sun', ellipse(150, 150, 90, 90)),
      polyRegion('balloon-1', ellipse(330, 330, 170, 210)),
      polyRegion('knot-1', [{ x: 330, y: 540 }, { x: 300, y: 592 }, { x: 360, y: 592 }]),
      polyRegion('balloon-2', ellipse(690, 290, 140, 175)),
      polyRegion('knot-2', [{ x: 690, y: 465 }, { x: 662, y: 512 }, { x: 718, y: 512 }]),
      polyRegion('grass', [{ x: 60, y: 845 }, { x: 940, y: 845 }, { x: 940, y: 960 }, { x: 60, y: 960 }]),
    ],
  },
  {
    type: 'colouring', id: 'colour-fish-by-number', title: 'Fish by numbers', category: 'colouring',
    ageBands: ['3-5', '5-7'], difficulty: 2, motorSkills: ['tapping', 'precision-placement'],
    estimatedMinutes: 4, theme: 'underwater', locale: 'en-AU', instructionAudio: audio('colour-by-number'),
    mode: 'by-number',
    // Fish-shaped sketch: sea floor, oval body, tail, top fin, eye (any colour).
    regions: [
      polyRegion('sea', [{ x: 60, y: 820 }, { x: 940, y: 820 }, { x: 940, y: 950 }, { x: 60, y: 950 }], 4),
      polyRegion('body', ellipse(430, 500, 240, 170), 1),
      polyRegion('tail', [{ x: 655, y: 500 }, { x: 830, y: 375 }, { x: 830, y: 625 }], 2),
      polyRegion('fin', [{ x: 360, y: 305 }, { x: 495, y: 235 }, { x: 525, y: 330 }], 3),
      polyRegion('eye', ellipse(350, 450, 32, 32, 16)),
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
  {
    type: 'colouring', id: 'colour-wombat', title: 'Wombat friend', category: 'colouring',
    ageBands: ['2-3', '3-5', '5-7'], difficulty: 1, motorSkills: ['holding-moving', 'tapping'],
    estimatedMinutes: 3, theme: 'animals', locale: 'en-AU', instructionAudio: audio('colour-free'),
    mode: 'free',
    // Wombat-shaped sketch: grass, round body, head with ears and nose, legs.
    regions: [
      polyRegion('grass', [{ x: 60, y: 850 }, { x: 940, y: 850 }, { x: 940, y: 960 }, { x: 60, y: 960 }]),
      polyRegion('body', ellipse(540, 610, 270, 190)),
      polyRegion('leg-left', [{ x: 430, y: 780 }, { x: 520, y: 780 }, { x: 520, y: 878 }, { x: 430, y: 878 }]),
      polyRegion('leg-right', [{ x: 640, y: 780 }, { x: 730, y: 780 }, { x: 730, y: 878 }, { x: 640, y: 878 }]),
      polyRegion('head', ellipse(310, 400, 150, 132)),
      polyRegion('ear-left', [{ x: 240, y: 298 }, { x: 205, y: 205 }, { x: 300, y: 258 }]),
      polyRegion('ear-right', [{ x: 380, y: 292 }, { x: 415, y: 200 }, { x: 320, y: 252 }]),
      polyRegion('nose', ellipse(255, 440, 42, 34, 16)),
    ],
  },
];

/* ---------- Puzzles (FR-007): ten image jigsaws from assets/images/ ---------- */

const jigsaw = (
  id: string, title: string, image: string, rows: number, cols: number,
  difficulty: 1 | 2 | 3, ageBands: Activity['ageBands'], theme: string, rotating = false,
): Activity => ({
  type: 'jigsaw', id, title, category: 'puzzles', ageBands, difficulty,
  motorSkills: rotating ? ['dragging', 'rotating', 'precision-placement'] : ['dragging', 'precision-placement'],
  estimatedMinutes: rows * cols <= 4 ? 3 : 4, theme, locale: 'en-AU',
  instructionAudio: audio('puzzle-jigsaw'),
  image: `images/${image}.svg`, rows, cols, rotatingPieces: rotating,
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
  { id: 'toddler-follow-path', title: 'Follow the little chick', template: 'path-maze', category: 'toddler', ageBands: ['2-3'], difficulty: 1, motorSkills: ['controlled-movement', 'holding-moving'], minutes: 2, theme: 'nature', params: { pathComplexity: 1, mover: 'chick', goal: 'treehouse' } },
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
  { id: 'logic-maze-easy', title: 'Garden maze', template: 'path-maze', category: 'logic', ageBands: ['3-5'], difficulty: 2, motorSkills: ['controlled-movement', 'holding-moving'], minutes: 3, theme: 'nature', params: { pathComplexity: 2, mover: 'fish', goal: 'treehouse' } },
  { id: 'logic-maze-hard', title: 'Rocket maze', template: 'path-maze', category: 'logic', ageBands: ['5-7'], difficulty: 3, motorSkills: ['controlled-movement'], minutes: 4, theme: 'space', params: { pathComplexity: 3, mover: 'rocket', goal: 'moon' } },
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

const drawingActivities: Activity[] = [
  {
    type: 'guided-drawing', id: 'sketch-dolphin', title: 'Draw over: a dolphin', category: 'drawing',
    ageBands: ['3-5', '5-7'], difficulty: 2, motorSkills: ['holding-moving', 'controlled-movement'],
    estimatedMinutes: 4, theme: 'underwater', locale: 'en-AU', instructionAudio: audio('draw-sketch'),
    steps: [{ prompt: 'images/dolphin.svg', overlay: [{ x: 0, y: 0 }, { x: 1000, y: 1000 }] }],
  },
  {
    type: 'guided-drawing', id: 'sketch-dinosaur', title: 'Draw over: a dinosaur', category: 'drawing',
    ageBands: ['3-5', '5-7'], difficulty: 2, motorSkills: ['holding-moving', 'controlled-movement'],
    estimatedMinutes: 4, theme: 'dinosaurs', locale: 'en-AU', instructionAudio: audio('draw-sketch'),
    steps: [{ prompt: 'images/dinosaur.svg', overlay: [{ x: 0, y: 0 }, { x: 1000, y: 1000 }] }],
  },
  {
    type: 'guided-drawing', id: 'sketch-unicorn', title: 'Draw over: a unicorn', category: 'drawing',
    ageBands: ['3-5', '5-7'], difficulty: 2, motorSkills: ['holding-moving', 'controlled-movement'],
    estimatedMinutes: 4, theme: 'fairy-tales', locale: 'en-AU', instructionAudio: audio('draw-sketch'),
    steps: [{ prompt: 'images/unicorn.svg', overlay: [{ x: 0, y: 0 }, { x: 1000, y: 1000 }] }],
  },
  {
    type: 'guided-drawing', id: 'sketch-whale', title: 'Draw over: a whale', category: 'drawing',
    ageBands: ['3-5', '5-7'], difficulty: 2, motorSkills: ['holding-moving', 'controlled-movement'],
    estimatedMinutes: 4, theme: 'underwater', locale: 'en-AU', instructionAudio: audio('draw-sketch'),
    steps: [{ prompt: 'images/whale.svg', overlay: [{ x: 0, y: 0 }, { x: 1000, y: 1000 }] }],
  },
  {
    type: 'guided-drawing', id: 'sketch-cat', title: 'Draw over: a cat', category: 'drawing',
    ageBands: ['3-5', '5-7'], difficulty: 2, motorSkills: ['holding-moving', 'controlled-movement'],
    estimatedMinutes: 4, theme: 'animals', locale: 'en-AU', instructionAudio: audio('draw-sketch'),
    steps: [{ prompt: 'images/cat.svg', overlay: [{ x: 0, y: 0 }, { x: 1000, y: 1000 }] }],
  },
  {
    type: 'guided-drawing', id: 'sketch-rocket', title: 'Draw over: a rocket', category: 'drawing',
    ageBands: ['3-5', '5-7'], difficulty: 2, motorSkills: ['holding-moving', 'controlled-movement'],
    estimatedMinutes: 4, theme: 'space', locale: 'en-AU', instructionAudio: audio('draw-sketch'),
    steps: [{ prompt: 'images/rocket.svg', overlay: [{ x: 0, y: 0 }, { x: 1000, y: 1000 }] }],
  },
  {
    type: 'guided-drawing', id: 'sketch-car', title: 'Draw over: a car', category: 'drawing',
    ageBands: ['3-5', '5-7'], difficulty: 2, motorSkills: ['holding-moving', 'controlled-movement'],
    estimatedMinutes: 4, theme: 'vehicles', locale: 'en-AU', instructionAudio: audio('draw-sketch'),
    steps: [{ prompt: 'images/car.svg', overlay: [{ x: 0, y: 0 }, { x: 1000, y: 1000 }] }],
  },
  {
    type: 'guided-drawing', id: 'sketch-treehouse', title: 'Draw over: a treehouse', category: 'drawing',
    ageBands: ['3-5', '5-7'], difficulty: 2, motorSkills: ['holding-moving', 'controlled-movement'],
    estimatedMinutes: 4, theme: 'nature', locale: 'en-AU', instructionAudio: audio('draw-sketch'),
    steps: [{ prompt: 'images/treehouse.svg', overlay: [{ x: 0, y: 0 }, { x: 1000, y: 1000 }] }],
  },
  {
    type: 'guided-drawing', id: 'draw-free-board', title: 'Free drawing', category: 'drawing',
    ageBands: ['2-3', '3-5', '5-7'], difficulty: 1,
    motorSkills: ['holding-moving', 'controlled-movement', 'swiping'],
    estimatedMinutes: 5, theme: 'creative', locale: 'en-AU', instructionAudio: audio('draw-free'),
    steps: [{ prompt: 'images/blank.png', overlay: [{ x: 0, y: 0 }, { x: 1000, y: 1000 }] }],
  },
  {
    type: 'guided-drawing', id: 'draw-a-face', title: 'Draw a face', category: 'drawing',
    ageBands: ['3-5', '5-7'], difficulty: 2, motorSkills: ['holding-moving', 'controlled-movement'],
    estimatedMinutes: 4, theme: 'people', locale: 'en-AU', instructionAudio: audio('draw-face'),
    steps: [
      { prompt: 'images/face-step1.png', overlay: arc(500, 500, 320, -90, 270) },
      { prompt: 'images/face-step2.png', overlay: [{ x: 380, y: 420 }, { x: 420, y: 420 }] },
      { prompt: 'images/face-step3.png', overlay: arc(500, 620, 120, 20, 160) },
    ],
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
