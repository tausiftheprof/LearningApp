import type { Point } from '../types';

/**
 * Traceable stroke skeletons for A-Z (capital + small side by side) and 0-9.
 *
 * Each glyph is authored as polyline strokes in a 0..1000 box, then mapped
 * into the activity design space: capitals into the left half, lowercase into
 * the right half (owner direction: "capital and small letter side by side"),
 * numbers centred. Stroke order follows common handwriting teaching order;
 * the tracing player runs the strokes sequentially.
 *
 * Geometry is deliberately simple - the corridor engine (A-09) provides the
 * tolerance; these paths define the visible guide the child follows.
 */

function line(x1: number, y1: number, x2: number, y2: number, steps = 6): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    pts.push({ x: x1 + ((x2 - x1) * i) / steps, y: y1 + ((y2 - y1) * i) / steps });
  }
  return pts;
}

function arc(cx: number, cy: number, r: number, startDeg: number, endDeg: number, steps = 20): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = ((startDeg + ((endDeg - startDeg) * i) / steps) * Math.PI) / 180;
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return pts;
}

const join = (...parts: Point[][]): Point[] => parts.flat();

/* Capitals, authored in 0..1000 (baseline ~ y 820, cap height ~ y 180). */
const UPPER: Record<string, Point[][]> = {
  A: [join(line(260, 820, 500, 180), line(500, 180, 740, 820)), line(360, 580, 640, 580, 4)],
  B: [
    line(320, 180, 320, 820),
    join(line(320, 200, 520, 200, 2), arc(520, 345, 145, -90, 90), line(520, 490, 320, 490, 2)),
    join(line(320, 490, 545, 490, 2), arc(545, 650, 160, -90, 90), line(545, 810, 320, 810, 2)),
  ],
  C: [arc(560, 500, 310, 55, 305)],
  D: [line(330, 180, 330, 820), join(line(330, 200, 450, 200, 2), arc(450, 500, 300, -76, 76), line(450, 800, 330, 800, 2))],
  E: [line(330, 180, 330, 820), line(330, 200, 700, 200, 4), line(330, 500, 650, 500, 4), line(330, 800, 700, 800, 4)],
  F: [line(330, 180, 330, 820), line(330, 200, 700, 200, 4), line(330, 500, 640, 500, 4)],
  G: [arc(540, 500, 310, 50, 310), line(700, 560, 540, 560, 3)],
  H: [line(320, 180, 320, 820), line(680, 180, 680, 820), line(320, 500, 680, 500, 4)],
  I: [line(500, 180, 500, 820)],
  J: [join(line(640, 180, 640, 630, 4), arc(495, 630, 145, 0, 180, 12))],
  K: [line(320, 180, 320, 820), join(line(690, 180, 330, 510, 4), line(330, 510, 690, 820, 4))],
  L: [join(line(350, 180, 350, 800, 6), line(350, 800, 700, 800, 4))],
  M: [join(line(290, 820, 290, 200, 4), line(290, 200, 500, 560, 3), line(500, 560, 710, 200, 3), line(710, 200, 710, 820, 4))],
  N: [join(line(320, 820, 320, 200, 4), line(320, 200, 680, 800, 4), line(680, 800, 680, 180, 4))],
  O: [arc(500, 500, 300, -90, 270, 26)],
  P: [line(330, 180, 330, 820), join(line(330, 200, 520, 200, 2), arc(520, 360, 160, -90, 90), line(520, 520, 330, 520, 2))],
  Q: [arc(500, 500, 290, -90, 270, 26), line(600, 630, 770, 820, 3)],
  R: [
    line(330, 180, 330, 820),
    join(line(330, 200, 520, 200, 2), arc(520, 360, 160, -90, 90), line(520, 520, 330, 520, 2)),
    line(440, 520, 710, 820, 4),
  ],
  S: [join(arc(535, 355, 165, -55, 165, 14), arc(465, 660, 175, -175, 55, 14))],
  T: [line(260, 200, 740, 200, 4), line(500, 200, 500, 820, 6)],
  U: [join(line(310, 180, 310, 590, 3), arc(500, 590, 190, 180, 0, 14), line(690, 590, 690, 180, 3))],
  V: [join(line(300, 180, 500, 820, 4), line(500, 820, 700, 180, 4))],
  W: [join(line(270, 180, 395, 820, 3), line(395, 820, 500, 420, 2), line(500, 420, 605, 820, 2), line(605, 820, 730, 180, 3))],
  X: [line(310, 200, 690, 800, 5), line(690, 200, 310, 800, 5)],
  Y: [line(310, 180, 500, 480, 3), join(line(690, 180, 500, 480, 3), line(500, 480, 500, 820, 3))],
  Z: [join(line(300, 220, 700, 220, 4), line(700, 220, 300, 780, 5), line(300, 780, 700, 780, 4))],
};

/* Lowercase, authored in 0..1000 (x-height ~ y 430..820, ascender 180, descender 980). */
const LOWER: Record<string, Point[][]> = {
  a: [arc(455, 625, 195, -90, 270, 20), line(650, 430, 650, 820, 4)],
  b: [line(350, 180, 350, 820), arc(515, 640, 175, -90, 270, 20)],
  c: [arc(520, 625, 200, 50, 310, 18)],
  d: [line(650, 180, 650, 820), arc(485, 640, 175, -90, 270, 20)],
  e: [join(line(310, 590, 680, 590, 4), arc(495, 625, 195, -10, 305, 18))],
  f: [join(arc(610, 330, 150, 270, 180, 8), line(460, 330, 460, 820, 5)), line(330, 490, 620, 490, 4)],
  g: [arc(480, 610, 180, -90, 270, 20), join(line(660, 430, 660, 870, 4), arc(505, 870, 155, 0, 140, 10))],
  h: [line(350, 180, 350, 820), join(arc(500, 620, 150, 180, 360, 10), line(650, 620, 650, 820, 2))],
  i: [line(500, 430, 500, 820, 4), line(500, 290, 500, 320, 1)],
  j: [join(line(560, 430, 560, 870, 4), arc(420, 870, 140, 0, 140, 10)), line(560, 290, 560, 320, 1)],
  k: [line(350, 180, 350, 820), join(line(650, 430, 360, 640, 3), line(360, 640, 660, 820, 3))],
  l: [line(500, 180, 500, 820)],
  m: [
    line(300, 430, 300, 820, 3),
    join(arc(400, 590, 100, 180, 360, 8), line(500, 590, 500, 820, 2)),
    join(arc(600, 590, 100, 180, 360, 8), line(700, 590, 700, 820, 2)),
  ],
  n: [line(350, 430, 350, 820, 3), join(arc(500, 615, 150, 180, 360, 10), line(650, 615, 650, 820, 2))],
  o: [arc(500, 625, 195, -90, 270, 20)],
  p: [line(350, 430, 350, 980, 4), arc(520, 620, 170, -90, 270, 20)],
  q: [arc(480, 620, 170, -90, 270, 20), line(650, 430, 650, 980, 4)],
  r: [line(400, 430, 400, 820, 3), arc(545, 595, 145, 180, 305, 8)],
  s: [join(arc(520, 530, 115, -50, 160, 10), arc(480, 725, 120, -170, 55, 10))],
  t: [line(480, 260, 480, 820, 5), line(340, 470, 660, 470, 4)],
  u: [join(line(350, 430, 350, 650, 2), arc(500, 650, 150, 180, 0, 12), line(650, 650, 650, 820, 2))],
  v: [join(line(350, 430, 500, 820, 3), line(500, 820, 650, 430, 3))],
  w: [join(line(320, 430, 415, 820, 2), line(415, 820, 500, 560, 2), line(500, 560, 585, 820, 2), line(585, 820, 680, 430, 2))],
  x: [line(360, 450, 640, 810, 4), line(640, 450, 360, 810, 4)],
  y: [line(350, 430, 500, 720, 3), line(650, 430, 455, 980, 4)],
  z: [join(line(360, 450, 640, 450, 3), line(640, 450, 360, 800, 4), line(360, 800, 640, 800, 3))],
};

/* Digits, authored in 0..1000. */
const DIGITS: Record<string, Point[][]> = {
  '0': [arc(500, 500, 280, -90, 270, 24)],
  '1': [line(500, 200, 500, 800)],
  '2': [join(arc(500, 380, 180, 180, 380, 12), line(640, 490, 320, 800, 5), line(320, 800, 720, 800, 4))],
  '3': [join(arc(500, 350, 155, -150, 90, 12), arc(500, 655, 160, -90, 145, 12))],
  '4': [join(line(620, 200, 300, 610, 4), line(300, 610, 750, 610, 4)), line(620, 330, 620, 820, 4)],
  '5': [join(line(700, 220, 350, 220, 3), line(350, 220, 350, 470, 3), arc(495, 615, 175, -125, 125, 14))],
  '6': [join(line(615, 210, 435, 505, 3), arc(510, 640, 170, -140, 220, 18))],
  '7': [join(line(280, 220, 720, 220, 4), line(720, 220, 450, 800, 5))],
  '8': [arc(500, 370, 150, -90, 270, 18), arc(500, 665, 165, -90, 270, 18)],
  '9': [arc(490, 405, 170, -90, 270, 18), line(655, 435, 640, 820, 4)],
};

const mapStrokes = (strokes: Point[][], sx: number, ox: number, sy: number, oy: number): Point[][] =>
  strokes.map((stroke) => stroke.map((p) => ({ x: ox + p.x * sx, y: oy + p.y * sy })));

export const LETTERS: readonly string[] = Object.keys(UPPER);
export const DIGIT_CHARS: readonly string[] = Object.keys(DIGITS);

/**
 * Strokes for one letter activity: the capital on the left, the small letter
 * on the right, traced in that order.
 */
export function letterStrokes(letter: string): Point[][] {
  const upper = UPPER[letter.toUpperCase()];
  const lower = LOWER[letter.toLowerCase()];
  if (!upper || !lower) throw new Error(`no glyph for letter ${letter}`);
  return [
    ...mapStrokes(upper, 0.42, 30, 0.78, 90),
    ...mapStrokes(lower, 0.42, 510, 0.78, 90),
  ];
}

/** Strokes for one digit activity, centred. */
export function digitStrokes(digit: string): Point[][] {
  const glyph = DIGITS[digit];
  if (!glyph) throw new Error(`no glyph for digit ${digit}`);
  return mapStrokes(glyph, 0.52, 240, 0.78, 90);
}
