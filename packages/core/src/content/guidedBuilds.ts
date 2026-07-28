import type { Activity } from './schema';
import type { Point } from '../types';

/**
 * GUIDED DRAWING — "build a picture" subjects (owner Option A).
 *
 * Each subject is drawn one part at a time: the child traces a corridor for the
 * current part, then that part appears (filled with the colour they picked, or a
 * fixed colour for parts that aren't child-colourable — wheels, seeds, eyes).
 * Geometry is authored here as polylines in the shared 0..1000 design space so
 * both renderers (web demo now, mobile later) draw from one source of truth.
 *
 * Coordinates are written in a compact 0..400 space and scaled up by `S`, so the
 * numbers below can be read against the approved 400x400 mockup directly.
 */

const S = 2.5;
const P = (x: number, y: number): Point => ({ x: x * S, y: y * S });

function lineP(x1: number, y1: number, x2: number, y2: number, n = 6): Point[] {
  const o: Point[] = [];
  for (let i = 0; i <= n; i++) o.push(P(x1 + ((x2 - x1) * i) / n, y1 + ((y2 - y1) * i) / n));
  return o;
}

function quadP(x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, n = 10): Point[] {
  const o: Point[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    o.push(P(u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1));
  }
  return o;
}

function cubicP(
  x0: number, y0: number, ax: number, ay: number, bx: number, by: number, x1: number, y1: number, n = 14,
): Point[] {
  const o: Point[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    o.push(
      P(
        u * u * u * x0 + 3 * u * u * t * ax + 3 * u * t * t * bx + t * t * t * x1,
        u * u * u * y0 + 3 * u * u * t * ay + 3 * u * t * t * by + t * t * t * y1,
      ),
    );
  }
  return o;
}

function ellipseP(cx: number, cy: number, rx: number, ry: number, n = 26): Point[] {
  const o: Point[] = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    o.push(P(cx + rx * Math.cos(a), cy + ry * Math.sin(a)));
  }
  return o;
}

function arcP(cx: number, cy: number, rx: number, ry: number, d0: number, d1: number, n = 18): Point[] {
  const o: Point[] = [];
  for (let i = 0; i <= n; i++) {
    const a = ((d0 + ((d1 - d0) * i) / n) * Math.PI) / 180;
    o.push(P(cx + rx * Math.cos(a), cy + ry * Math.sin(a)));
  }
  return o;
}

function join(...segs: Point[][]): Point[] {
  const o: Point[] = [];
  for (const s of segs) for (const p of s) o.push(p);
  return o;
}

function rrectP(x: number, y: number, w: number, h: number, r: number): Point[] {
  return join(
    lineP(x + r, y, x + w - r, y, 3),
    arcP(x + w - r, y + r, r, r, -90, 0, 5),
    lineP(x + w, y + r, x + w, y + h - r, 3),
    arcP(x + w - r, y + h - r, r, r, 0, 90, 5),
    lineP(x + w - r, y + h, x + r, y + h, 3),
    arcP(x + r, y + h - r, r, r, 90, 180, 5),
    lineP(x, y + h - r, x, y + r, 3),
    arcP(x + r, y + r, r, r, 180, 270, 5),
  );
}

/** A single teardrop petal/leaf pointing along `ang` degrees, as one closed polyline. */
function petalP(cx: number, cy: number, ang: number, len: number, wid: number, n = 11): Point[] {
  const a = (ang * Math.PI) / 180;
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  const px = Math.cos(a + Math.PI / 2);
  const py = Math.sin(a + Math.PI / 2);
  const tx = cx + len * dx;
  const ty = cy + len * dy;
  const m1x = cx + len * 0.58 * dx + wid * px;
  const m1y = cy + len * 0.58 * dy + wid * py;
  const m2x = cx + len * 0.58 * dx - wid * px;
  const m2y = cy + len * 0.58 * dy - wid * py;
  return join(quadP(cx, cy, m1x, m1y, tx, ty, n), quadP(tx, ty, m2x, m2y, cx, cy, n));
}

/** Five petals around a centre → one flower head, each petal its own stroke. */
function flowerHead(cx: number, cy: number, len: number, wid: number): Point[][] {
  const o: Point[][] = [];
  for (let i = 0; i < 5; i++) o.push(petalP(cx, cy, -90 + i * 72, len, wid));
  return o;
}

interface GStep {
  prompt: string;
  overlay: Point[];
  label: string;
  strokes: Point[][];
  fill: boolean;
  fixedColour?: string;
}

function subject(
  id: string,
  title: string,
  theme: string,
  prompt: string,
  ageBands: Array<'2-3' | '3-5' | '5-7'>,
  parts: Array<{ label: string; fill: boolean; strokes: Point[][]; fixedColour?: string }>,
): Activity {
  const steps: GStep[] = parts.map((part) => {
    const first = part.strokes[0] ?? [];
    const base: GStep = { prompt, overlay: first, label: part.label, strokes: part.strokes, fill: part.fill };
    return part.fixedColour ? { ...base, fixedColour: part.fixedColour } : base;
  });
  return {
    type: 'guided-drawing',
    id,
    title,
    category: 'drawing',
    ageBands,
    difficulty: 2,
    motorSkills: ['holding-moving', 'controlled-movement', 'tracing'],
    estimatedMinutes: 4,
    theme,
    locale: 'en-AU',
    instructionAudio: `audio/en-AU/${id}.mp3`,
    steps,
  } as unknown as Activity;
}

const DARK = '#2f2f2f';

/** All build-a-picture guided-drawing subjects, appended to the starter pack. */
export function guidedDrawingSubjects(): Activity[] {
  return [
    // ---- Grip the mascot ------------------------------------------------
    subject('draw-guided-grip', 'Draw Grip', 'mascot', 'images/mascot.png', ['3-5', '5-7'], [
      {
        label: 'Body', fill: true, strokes: [join(
          cubicP(200, 56, 252, 68, 320, 150, 320, 230),
          cubicP(320, 230, 320, 300, 270, 338, 200, 338),
          cubicP(200, 338, 130, 338, 80, 300, 80, 230),
          cubicP(80, 230, 80, 150, 148, 68, 200, 56),
        )],
      },
      { label: 'Feet', fill: true, strokes: [ellipseP(160, 352, 27, 17), ellipseP(242, 356, 27, 17)] },
      {
        label: 'Antennae', fill: false, strokes: [
          quadP(186, 82, 160, 42, 150, 26), quadP(226, 80, 250, 46, 262, 32),
        ],
      },
      { label: 'Eyes', fill: true, fixedColour: DARK, strokes: [ellipseP(172, 181, 13, 13), ellipseP(232, 181, 13, 13)] },
      { label: 'Smile', fill: false, strokes: [quadP(178, 214, 202, 240, 226, 214)] },
      {
        label: 'Swirl', fill: false, strokes: [join(
          cubicP(232, 256, 194, 248, 180, 302, 220, 306),
          cubicP(220, 306, 250, 309, 250, 272, 224, 270),
          cubicP(224, 270, 208, 269, 206, 291, 222, 292),
        )],
      },
    ]),

    // ---- Cupcake --------------------------------------------------------
    subject('draw-guided-cupcake', 'Draw a Cupcake', 'treats', 'images/feed-cupcake.png', ['3-5', '5-7'], [
      {
        label: 'Case', fill: true, strokes: [join(
          lineP(150, 238, 398, 238),
          lineP(398, 238, 384, 320),
          quadP(384, 320, 382, 336, 366, 336),
          lineP(366, 336, 182, 336),
          quadP(182, 336, 166, 336, 164, 320),
          lineP(164, 320, 150, 238),
        )],
      },
      {
        label: 'Frosting', fill: true, strokes: [join(
          cubicP(152, 240, 150, 150, 212, 116, 275, 116),
          cubicP(275, 116, 348, 116, 400, 158, 396, 240),
          cubicP(396, 240, 356, 230, 316, 240, 275, 240),
          cubicP(275, 240, 236, 240, 192, 230, 152, 240),
        )],
      },
      { label: 'Cherry', fill: true, strokes: [ellipseP(275, 100, 22, 22)] },
      {
        label: 'Sprinkles', fill: false, fixedColour: '#ffffff', strokes: [
          lineP(196, 172, 212, 181), lineP(258, 150, 273, 142), lineP(330, 182, 344, 192),
          lineP(186, 204, 202, 200), lineP(300, 212, 314, 220),
        ],
      },
    ]),

    // ---- Car ------------------------------------------------------------
    subject('draw-guided-car', 'Draw a Car', 'vehicles', 'images/cut-car.png', ['3-5', '5-7'], [
      {
        label: 'Body', fill: true, strokes: [join(
          cubicP(52, 268, 44, 268, 40, 260, 41, 250),
          lineP(41, 250, 42, 236),
          cubicP(42, 236, 43, 226, 52, 222, 64, 221),
          cubicP(64, 221, 86, 150, 246, 150, 268, 215),
          lineP(268, 215, 336, 220),
          cubicP(336, 220, 354, 222, 360, 232, 360, 248),
          lineP(360, 248, 360, 262),
          cubicP(360, 262, 360, 270, 354, 272, 346, 272),
          lineP(346, 272, 52, 268),
        )],
      },
      { label: 'Windows', fill: true, strokes: [rrectP(96, 178, 72, 36, 10), rrectP(190, 178, 72, 36, 10)] },
      { label: 'Wheels', fill: true, fixedColour: DARK, strokes: [ellipseP(120, 284, 32, 32), ellipseP(300, 284, 32, 32)] },
      { label: 'Lights', fill: true, fixedColour: '#F5C542', strokes: [ellipseP(58, 250, 9, 9), ellipseP(354, 250, 9, 9)] },
    ]),

    // ---- Cake -----------------------------------------------------------
    subject('draw-guided-cake', 'Draw a Cake', 'treats', 'images/cut-cake.png', ['3-5', '5-7'], [
      { label: 'Bottom', fill: true, strokes: [rrectP(60, 286, 290, 86, 16)] },
      { label: 'Top', fill: true, strokes: [rrectP(105, 210, 200, 80, 16)] },
      {
        label: 'Icing', fill: false, strokes: [
          join(
            quadP(66, 300, 92, 322, 118, 300), quadP(118, 300, 144, 322, 170, 300),
            quadP(170, 300, 196, 322, 222, 300), quadP(222, 300, 248, 322, 274, 300),
            quadP(274, 300, 300, 322, 344, 300),
          ),
          join(
            quadP(110, 224, 138, 244, 166, 224), quadP(166, 224, 194, 244, 222, 224),
            quadP(222, 224, 250, 244, 300, 224),
          ),
        ],
      },
      { label: 'Candle', fill: true, strokes: [rrectP(192, 150, 22, 60, 6)] },
      {
        label: 'Dots', fill: true, fixedColour: '#F06292', strokes: [
          ellipseP(130, 340, 14, 14), ellipseP(205, 340, 14, 14), ellipseP(280, 340, 14, 14),
        ],
      },
    ]),

    // ---- Watermelon -----------------------------------------------------
    subject('draw-guided-watermelon', 'Draw a Watermelon', 'fruit', 'images/feed-watermelon.png', ['2-3', '3-5', '5-7'], [
      {
        label: 'Red', fill: true, strokes: [join(
          lineP(200, 120, 82, 290),
          quadP(82, 290, 200, 314, 318, 290),
          lineP(318, 290, 200, 120),
        )],
      },
      {
        label: 'Rind', fill: true, strokes: [join(
          lineP(318, 290, 322, 300),
          arcP(200, 300, 122, 52, 0, 180),
          lineP(78, 300, 82, 290),
          quadP(82, 290, 200, 314, 318, 290),
        )],
      },
      { label: 'Edge', fill: false, fixedColour: '#EAF7E9', strokes: [quadP(82, 290, 200, 314, 318, 290)] },
      {
        label: 'Seeds', fill: true, fixedColour: DARK, strokes: [
          ellipseP(175, 215, 6, 9), ellipseP(232, 222, 6, 9), ellipseP(200, 180, 6, 9),
          ellipseP(150, 252, 6, 9), ellipseP(256, 254, 6, 9), ellipseP(205, 272, 6, 9),
        ],
      },
    ]),

    // ---- Flower pot -----------------------------------------------------
    subject('draw-guided-flower', 'Draw Flowers', 'garden', 'images/feed-plant1.png', ['3-5', '5-7'], [
      {
        label: 'Pot', fill: true, strokes: [
          rrectP(168, 288, 164, 22, 8),
          join(
            lineP(180, 310, 320, 310),
            lineP(320, 310, 308, 366),
            quadP(308, 366, 306, 372, 300, 372),
            lineP(300, 372, 200, 372),
            quadP(200, 372, 194, 372, 192, 366),
            lineP(192, 366, 180, 310),
          ),
        ],
      },
      {
        label: 'Stems', fill: false, fixedColour: '#3C9D4E', strokes: [
          cubicP(247, 302, 232, 252, 202, 212, 187, 182),
          cubicP(250, 302, 250, 242, 250, 192, 250, 150),
          cubicP(253, 302, 270, 252, 300, 212, 313, 182),
        ],
      },
      {
        label: 'Leaves', fill: true, strokes: [
          petalP(216, 250, 158, 34, 13), petalP(250, 258, -90, 26, 11), petalP(286, 250, 22, 34, 13),
        ],
      },
      { label: 'Flower 1', fill: true, strokes: flowerHead(187, 178, 30, 13) },
      { label: 'Flower 2', fill: true, strokes: flowerHead(250, 146, 32, 14) },
      { label: 'Flower 3', fill: true, strokes: flowerHead(313, 178, 30, 13) },
    ]),
  ];
}
