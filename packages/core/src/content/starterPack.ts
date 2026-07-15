import type { Activity, ContentPack } from './schema';
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

// Letters and numbers as simple polyline skeletons (illustrative geometry).
const LETTER_PATHS: Record<string, Point[][]> = {
  A: [[...line(300, 800, 500, 200, 6), ...line(500, 200, 700, 800, 6)], line(380, 560, 620, 560, 4)],
  C: [arc(550, 500, 300, 60, 300)],
  I: [line(500, 200, 500, 800, 6)],
  L: [[...line(350, 200, 350, 800, 6), ...line(350, 800, 700, 800, 4)]],
  O: [arc(500, 500, 280, -90, 270)],
  T: [line(250, 200, 750, 200, 4), line(500, 200, 500, 800, 6)],
};
const NUMBER_PATHS: Record<string, Point[][]> = {
  '1': [line(500, 200, 500, 800, 6)],
  '2': [[...arc(500, 380, 180, 180, 380, 12), ...line(640, 480, 320, 800, 5), ...line(320, 800, 720, 800, 4)]],
  '3': [[...arc(500, 350, 150, 150, 400, 12), ...arc(500, 650, 150, 320, 570, 12)]],
  '7': [[...line(280, 220, 720, 220, 4), ...line(720, 220, 450, 800, 6)]],
  '0': [arc(500, 500, 260, -90, 270)],
};

for (const [ch, paths] of Object.entries(LETTER_PATHS)) {
  tracingActivities.push({
    type: 'tracing', id: `trace-letter-${ch.toLowerCase()}`, title: `Letter ${ch}`, category: 'tracing',
    ageBands: ['3-5', '5-7'], difficulty: 2, motorSkills: ['tracing', 'controlled-movement'],
    estimatedMinutes: 2, theme: 'letters-numbers', locale: 'en-AU',
    instructionAudio: audio(`trace-letter-${ch.toLowerCase()}`), paths, closed: false,
  });
}
for (const [ch, paths] of Object.entries(NUMBER_PATHS)) {
  tracingActivities.push({
    type: 'tracing', id: `trace-number-${ch}`, title: `Number ${ch}`, category: 'tracing',
    ageBands: ['3-5', '5-7'], difficulty: 2, motorSkills: ['tracing', 'controlled-movement'],
    estimatedMinutes: 2, theme: 'letters-numbers', locale: 'en-AU',
    instructionAudio: audio(`trace-number-${ch}`), paths, closed: false,
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

const colouringActivities: Activity[] = [
  {
    type: 'colouring', id: 'colour-balloon', title: 'Balloons', category: 'colouring',
    ageBands: ['2-3', '3-5'], difficulty: 1, motorSkills: ['tapping', 'holding-moving', 'pinching'],
    estimatedMinutes: 3, theme: 'celebrations', locale: 'en-AU', instructionAudio: audio('colour-free'),
    mode: 'free',
    regions: [rectRegion('b1', 100, 100, 350, 450), rectRegion('b2', 550, 100, 350, 450), rectRegion('sky', 100, 620, 800, 280)],
  },
  {
    type: 'colouring', id: 'colour-fish-by-number', title: 'Fish by numbers', category: 'colouring',
    ageBands: ['3-5', '5-7'], difficulty: 2, motorSkills: ['tapping', 'precision-placement'],
    estimatedMinutes: 4, theme: 'underwater', locale: 'en-AU', instructionAudio: audio('colour-by-number'),
    mode: 'by-number',
    regions: [rectRegion('body', 200, 300, 400, 300, 1), rectRegion('tail', 650, 350, 180, 200, 2), rectRegion('fin', 320, 180, 160, 100, 3), rectRegion('sea', 100, 680, 800, 220, 4)],
  },
  {
    type: 'colouring', id: 'colour-rocket', title: 'Rocket', category: 'colouring',
    ageBands: ['3-5', '5-7'], difficulty: 2, motorSkills: ['holding-moving', 'pinching'],
    estimatedMinutes: 4, theme: 'space', locale: 'en-AU', instructionAudio: audio('colour-free'),
    mode: 'free',
    regions: [rectRegion('nose', 400, 100, 200, 180), rectRegion('body', 380, 300, 240, 380), rectRegion('finL', 280, 560, 110, 180), rectRegion('finR', 610, 560, 110, 180), rectRegion('flame', 430, 720, 140, 160)],
  },
  {
    type: 'colouring', id: 'colour-wombat', title: 'Wombat friend', category: 'colouring',
    ageBands: ['2-3', '3-5', '5-7'], difficulty: 1, motorSkills: ['holding-moving', 'tapping'],
    estimatedMinutes: 3, theme: 'animals', locale: 'en-AU', instructionAudio: audio('colour-free'),
    mode: 'free',
    regions: [rectRegion('head', 300, 150, 400, 300), rectRegion('body', 220, 480, 560, 340), rectRegion('grass', 100, 840, 800, 100)],
  },
];

/* ---------- Puzzles (FR-007): 2 illustrative; 10 via CMS ---------- */

const puzzleActivities: Activity[] = [
  {
    type: 'jigsaw', id: 'puzzle-farm-4', title: 'Farm friends', category: 'puzzles',
    ageBands: ['2-3', '3-5'], difficulty: 1, motorSkills: ['dragging', 'precision-placement'],
    estimatedMinutes: 3, theme: 'animals', locale: 'en-AU', instructionAudio: audio('puzzle-jigsaw'),
    image: 'images/puzzle-farm.png', rows: 2, cols: 2, rotatingPieces: false,
  },
  {
    type: 'jigsaw', id: 'puzzle-space-9', title: 'Space adventure', category: 'puzzles',
    ageBands: ['5-7'], difficulty: 3, motorSkills: ['dragging', 'rotating', 'precision-placement'],
    estimatedMinutes: 5, theme: 'space', locale: 'en-AU', instructionAudio: audio('puzzle-jigsaw'),
    image: 'images/puzzle-space.png', rows: 3, cols: 3, rotatingPieces: true,
  },
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
  { id: 'toddler-tap-animal', title: 'Tap the animal', template: 'tap-target', category: 'toddler', ageBands: ['2-3'], difficulty: 1, motorSkills: ['tapping'], minutes: 2, theme: 'animals', params: { targets: ['cow', 'dog', 'cat'], rounds: 5 } },
  { id: 'toddler-feed-animal', title: 'Feed the wombat', template: 'feed-animal', category: 'toddler', ageBands: ['2-3'], difficulty: 1, motorSkills: ['dragging'], minutes: 2, theme: 'animals', params: { foods: 4 } },
  { id: 'toddler-toys-in-box', title: 'Toys in the box', template: 'drag-sort', category: 'toddler', ageBands: ['2-3'], difficulty: 1, motorSkills: ['dragging', 'precision-placement'], minutes: 2, theme: 'everyday', params: { bins: ['box'], items: 5 } },
  { id: 'toddler-match-objects', title: 'Match the toys', template: 'match-pairs', category: 'toddler', ageBands: ['2-3'], difficulty: 1, motorSkills: ['tapping', 'dragging'], minutes: 2, theme: 'everyday', params: { pairs: 3 } },
  { id: 'toddler-sort-colour', title: 'Sort by colour', template: 'drag-sort', category: 'toddler', ageBands: ['2-3', '3-5'], difficulty: 1, motorSkills: ['dragging'], minutes: 2, theme: 'shapes-patterns', params: { bins: ['red', 'blue'], items: 6 } },
  { id: 'toddler-shadow-match', title: 'Find my shadow', template: 'shadow-match', category: 'toddler', ageBands: ['2-3', '3-5'], difficulty: 1, motorSkills: ['dragging', 'precision-placement'], minutes: 2, theme: 'animals', params: { items: 4 } },
  { id: 'toddler-reveal', title: 'Wipe and see!', template: 'reveal-wipe', category: 'toddler', ageBands: ['2-3'], difficulty: 1, motorSkills: ['swiping'], minutes: 1, theme: 'surprise', params: { pictures: 3 } },
  { id: 'toddler-stack', title: 'Stack the blocks', template: 'stack-blocks', category: 'toddler', ageBands: ['2-3'], difficulty: 1, motorSkills: ['dragging', 'precision-placement'], minutes: 2, theme: 'everyday', params: { blocks: 4 } },
  { id: 'toddler-follow-path', title: 'Follow the ladybird', template: 'path-maze', category: 'toddler', ageBands: ['2-3'], difficulty: 1, motorSkills: ['controlled-movement', 'holding-moving'], minutes: 2, theme: 'nature', params: { pathComplexity: 1 } },
  // Preschool (PRD 6.6)
  { id: 'preschool-letter-match', title: 'Big and small letters', template: 'letter-match', category: 'preschool', ageBands: ['3-5', '5-7'], difficulty: 2, motorSkills: ['tapping', 'dragging'], minutes: 3, theme: 'letters-numbers', params: { letters: ['A', 'B', 'C', 'D'] } },
  { id: 'preschool-count-objects', title: 'Count the apples', template: 'counting', category: 'preschool', ageBands: ['3-5'], difficulty: 2, motorSkills: ['tapping'], minutes: 2, theme: 'food', params: { max: 5 } },
  { id: 'preschool-number-quantity', title: 'Numbers and things', template: 'match-pairs', category: 'preschool', ageBands: ['3-5', '5-7'], difficulty: 2, motorSkills: ['dragging'], minutes: 3, theme: 'letters-numbers', params: { pairs: 4, kind: 'number-quantity' } },
  { id: 'preschool-shapes', title: 'Match the shapes', template: 'match-pairs', category: 'preschool', ageBands: ['3-5'], difficulty: 1, motorSkills: ['dragging', 'precision-placement'], minutes: 2, theme: 'shapes-patterns', params: { pairs: 4, kind: 'shapes' } },
  { id: 'preschool-body-parts', title: 'Point to the nose!', template: 'tap-target', category: 'preschool', ageBands: ['2-3', '3-5'], difficulty: 1, motorSkills: ['tapping'], minutes: 2, theme: 'body', params: { targets: ['nose', 'ears', 'hands'], rounds: 5 } },
  { id: 'preschool-emotions', title: 'How do they feel?', template: 'odd-one-out', category: 'preschool', ageBands: ['3-5', '5-7'], difficulty: 2, motorSkills: ['tapping'], minutes: 2, theme: 'emotions', params: { rounds: 4, kind: 'emotions' } },
  { id: 'preschool-helpers', title: 'Helpers and tools', template: 'match-pairs', category: 'preschool', ageBands: ['3-5', '5-7'], difficulty: 2, motorSkills: ['dragging'], minutes: 3, theme: 'community-helpers', params: { pairs: 4, kind: 'helper-tool' } },
  { id: 'preschool-opposites', title: 'Opposites', template: 'match-pairs', category: 'preschool', ageBands: ['5-7'], difficulty: 3, motorSkills: ['dragging'], minutes: 3, theme: 'everyday', params: { pairs: 4, kind: 'opposites' } },
  { id: 'preschool-sequence', title: 'What comes next?', template: 'sequence', category: 'preschool', ageBands: ['3-5', '5-7'], difficulty: 2, motorSkills: ['tapping', 'dragging'], minutes: 2, theme: 'shapes-patterns', params: { length: 4 } },
  { id: 'preschool-number-trace-count', title: 'Count and pinch', template: 'counting', category: 'preschool', ageBands: ['3-5', '5-7'], difficulty: 2, motorSkills: ['pinching', 'tapping', 'bilateral'], minutes: 2, theme: 'letters-numbers', params: { max: 8, zoom: true } },
  // Logic (PRD 6.7)
  { id: 'logic-pattern', title: 'Finish the pattern', template: 'pattern-complete', category: 'logic', ageBands: ['3-5', '5-7'], difficulty: 2, motorSkills: ['tapping', 'dragging'], minutes: 2, theme: 'shapes-patterns', params: { rounds: 4 } },
  { id: 'logic-odd-one-out', title: 'Find the odd one', template: 'odd-one-out', category: 'logic', ageBands: ['3-5', '5-7'], difficulty: 2, motorSkills: ['tapping'], minutes: 2, theme: 'everyday', params: { rounds: 5, kind: 'objects' } },
  { id: 'logic-memory-4', title: 'Memory friends', template: 'memory-cards', category: 'logic', ageBands: ['3-5'], difficulty: 2, motorSkills: ['tapping'], minutes: 3, theme: 'animals', params: { pairs: 4 } },
  { id: 'logic-memory-6', title: 'Memory master', template: 'memory-cards', category: 'logic', ageBands: ['5-7'], difficulty: 3, motorSkills: ['tapping'], minutes: 4, theme: 'space', params: { pairs: 6 } },
  { id: 'logic-maze-easy', title: 'Garden maze', template: 'path-maze', category: 'logic', ageBands: ['3-5'], difficulty: 2, motorSkills: ['controlled-movement', 'holding-moving'], minutes: 3, theme: 'nature', params: { pathComplexity: 2 } },
  { id: 'logic-maze-hard', title: 'Rocket maze', template: 'path-maze', category: 'logic', ageBands: ['5-7'], difficulty: 3, motorSkills: ['controlled-movement'], minutes: 4, theme: 'space', params: { pathComplexity: 3 } },
  { id: 'logic-size-order', title: 'Small to big', template: 'drag-sort', category: 'logic', ageBands: ['3-5', '5-7'], difficulty: 2, motorSkills: ['dragging', 'precision-placement'], minutes: 2, theme: 'everyday', params: { bins: ['1', '2', '3', '4'], items: 4, ordered: true } },
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
