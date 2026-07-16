import { TracingSession, tracingConfigFor } from '../src/tracing/tracingEngine';
import type { Point } from '../src/types';

const horizontal: Point[] = [
  { x: 0, y: 500 },
  { x: 1000, y: 500 },
];

function traceAlong(session: TracingSession, yOffset = 0, from = 0, to = 1000, step = 10) {
  for (let x = from; x <= to; x += step) {
    session.addPoint({ x, y: 500 + yOffset });
  }
}

describe('tracingConfigFor', () => {
  it('narrows the corridor as difficulty increases (PRD section 8)', () => {
    expect(tracingConfigFor(1).corridorWidth).toBeGreaterThan(tracingConfigFor(2).corridorWidth);
    expect(tracingConfigFor(2).corridorWidth).toBeGreaterThan(tracingConfigFor(3).corridorWidth);
  });

  it('is direction-agnostic only at Beginner (A-09)', () => {
    expect(tracingConfigFor(1).directionAgnostic).toBe(true);
    expect(tracingConfigFor(3).directionAgnostic).toBe(false);
  });

  it('widens the corridor for the accessibility setting (FR-023)', () => {
    expect(
      tracingConfigFor(2, { accessibilityWiderCorridor: true }).corridorWidth,
    ).toBeCloseTo(tracingConfigFor(2).corridorWidth * 1.5);
  });
});

describe('TracingSession', () => {
  it('completes when the child traces the full path inside the corridor', () => {
    const session = new TracingSession(horizontal, tracingConfigFor(1));
    traceAlong(session, 20); // 20 units off-centre - well within the 96-unit corridor
    expect(session.completed).toBe(true);
    const summary = session.endAttempt();
    expect(summary.completed).toBe(true);
    expect(summary.accuracyScore).toBeGreaterThan(80);
    expect(summary.showDemo).toBe(false);
  });

  it('tolerates reasonable wobble without marking points off-path (PRD section 27)', () => {
    const session = new TracingSession(horizontal, tracingConfigFor(1));
    const result = session.addPoint({ x: 500, y: 500 + 90 }); // inside 96-unit corridor
    expect(result.onPath).toBe(true);
  });

  it('marks points far outside the corridor as off-path but never throws or fails', () => {
    const session = new TracingSession(horizontal, tracingConfigFor(3));
    const result = session.addPoint({ x: 500, y: 900 });
    expect(result.onPath).toBe(false);
    expect(result.completed).toBe(false);
  });

  it('does not complete on a partial trace', () => {
    const session = new TracingSession(horizontal, tracingConfigFor(2));
    traceAlong(session, 0, 0, 400); // only 40% of the path
    expect(session.completed).toBe(false);
  });

  it('never celebrates early: high coverage without reaching the end is incomplete', () => {
    // Regression for "says good job before tracing is completed": trace 88%
    // of the path but stop short of the end - must NOT complete even though
    // coverage exceeds the threshold number alone.
    const session = new TracingSession(horizontal, tracingConfigFor(1));
    traceAlong(session, 0, 0, 880);
    expect(session.coverage()).toBeGreaterThanOrEqual(0.85);
    expect(session.completed).toBe(false);
  });

  it('skipping the middle of the path prevents completion (no blanket gap-fill)', () => {
    const session = new TracingSession(horizontal, tracingConfigFor(1));
    traceAlong(session, 0, 0, 350);      // first third
    session.endAttempt();                 // lift; attempt 2
    traceAlong(session, 0, 650, 1000);   // last third only
    expect(session.completed).toBe(false);
  });

  it('triggers the demonstration after three low-accuracy attempts (C-08/A-09)', () => {
    const config = tracingConfigFor(3);
    const session = new TracingSession(horizontal, config);
    const wildScribble = () => {
      for (let x = 0; x <= 1000; x += 50) session.addPoint({ x, y: 950 });
    };
    wildScribble();
    expect(session.endAttempt().showDemo).toBe(false);
    wildScribble();
    expect(session.endAttempt().showDemo).toBe(false);
    wildScribble();
    const third = session.endAttempt();
    expect(third.showDemo).toBe(true);
    expect(third.attemptNumber).toBe(3);
  });

  it('resets coverage between attempts but keeps counting attempts', () => {
    const session = new TracingSession(horizontal, tracingConfigFor(1));
    traceAlong(session, 0, 0, 300);
    session.endAttempt();
    expect(session.attempt).toBe(2);
    expect(session.coverage()).toBe(0);
  });

  it('accepts tracing in reverse (coverage is position-based, works for beginners)', () => {
    const session = new TracingSession(horizontal, tracingConfigFor(1));
    for (let x = 1000; x >= 0; x -= 10) session.addPoint({ x, y: 500 });
    expect(session.completed).toBe(true);
  });

  it('rejects degenerate paths', () => {
    expect(() => new TracingSession([{ x: 0, y: 0 }], tracingConfigFor(1))).toThrow();
  });
});

describe('every glyph is completable (small-letters regression)', () => {
  const { LETTERS, DIGIT_CHARS, letterStrokes, digitStrokes } =
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../src/content/glyphs') as typeof import('../src/content/glyphs');

  /** Simulate a child's finger following a stroke: dense samples along it. */
  function traceStroke(stroke: Point[], config = tracingConfigFor(2)): boolean {
    const session = new TracingSession(stroke, config);
    for (let i = 0; i < stroke.length - 1; i++) {
      const a = stroke[i]!, b = stroke[i + 1]!;
      const segLen = Math.hypot(b.x - a.x, b.y - a.y);
      const steps = Math.max(1, Math.ceil(segLen / 6));
      for (let s = 0; s <= steps; s++) {
        session.addPoint({ x: a.x + ((b.x - a.x) * s) / steps, y: a.y + ((b.y - a.y) * s) / steps });
      }
    }
    return session.completed;
  }

  it.each([...LETTERS])('letter %s: capital AND small strokes all complete', (ch) => {
    const strokes = letterStrokes(ch);
    strokes.forEach((stroke, i) => {
      expect({ letter: ch, stroke: i, completed: traceStroke(stroke) }).toEqual({
        letter: ch, stroke: i, completed: true,
      });
    });
  });

  it.each([...DIGIT_CHARS])('digit %s: all strokes complete', (d) => {
    for (const stroke of digitStrokes(d)) expect(traceStroke(stroke)).toBe(true);
  });

  it('half of a small letter bowl does NOT complete (no premature good job)', () => {
    const bowl = letterStrokes('o')[1]!; // lowercase o
    const session = new TracingSession(bowl, tracingConfigFor(2));
    const half = bowl.slice(0, Math.floor(bowl.length / 2));
    for (const p of half) session.addPoint(p);
    expect(session.completed).toBe(false);
  });
});
