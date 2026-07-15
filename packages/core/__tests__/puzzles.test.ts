import { PuzzleSession, puzzleConfigFor } from '../src/puzzles/puzzleEngine';

const pieces = [
  { id: 'p1', target: { x: 100, y: 100 } },
  { id: 'p2', target: { x: 500, y: 100 } },
];

describe('puzzleConfigFor', () => {
  it('shrinks snap assistance as difficulty rises (PRD sections 6.4, 8)', () => {
    expect(puzzleConfigFor(1).snapRadius).toBeGreaterThan(puzzleConfigFor(2).snapRadius);
    expect(puzzleConfigFor(2).snapRadius).toBeGreaterThan(puzzleConfigFor(3).snapRadius);
  });
  it('enables rotation only at Confident level', () => {
    expect(puzzleConfigFor(1).rotationEnabled).toBe(false);
    expect(puzzleConfigFor(3).rotationEnabled).toBe(true);
  });
  it('accepts CMS overrides (C-08)', () => {
    expect(puzzleConfigFor(1, { missesBeforeHint: 5 }).missesBeforeHint).toBe(5);
  });
});

describe('PuzzleSession', () => {
  it('snaps a piece dropped near its slot (PRD section 27)', () => {
    const s = new PuzzleSession(pieces, puzzleConfigFor(1));
    const result = s.drop('p1', { x: 150, y: 140 });
    expect(result.kind).toBe('snapped');
    expect(s.placedCount()).toBe(1);
  });

  it('answers a wrong drop with try-again and the slot location - never negative feedback', () => {
    const s = new PuzzleSession(pieces, puzzleConfigFor(3));
    const result = s.drop('p1', { x: 900, y: 900 });
    expect(result.kind).toBe('try-again');
    if (result.kind === 'try-again') {
      expect(result.showHint).toBe(false);
      expect(result.nearestSlot).toEqual({ x: 100, y: 100 });
    }
  });

  it('shows a hint after repeated misses (C-08 default 3, resets after help)', () => {
    const s = new PuzzleSession(pieces, puzzleConfigFor(1));
    const miss = () => s.drop('p1', { x: 900, y: 900 });
    expect((miss() as { showHint: boolean }).showHint).toBe(false);
    expect((miss() as { showHint: boolean }).showHint).toBe(false);
    expect((miss() as { showHint: boolean }).showHint).toBe(true);
    expect(s.hintCount).toBe(1);
    expect((miss() as { showHint: boolean }).showHint).toBe(false); // counter reset
  });

  it('requires rotation alignment when rotating pieces are enabled', () => {
    const s = new PuzzleSession(
      [{ id: 'r1', target: { x: 100, y: 100 }, targetRotation: 0 }],
      puzzleConfigFor(3),
    );
    expect(s.drop('r1', { x: 100, y: 100 }, 90).kind).toBe('try-again');
    expect(s.drop('r1', { x: 100, y: 100 }, 10).kind).toBe('snapped');
  });

  it('completes when all pieces are placed', () => {
    const s = new PuzzleSession(pieces, puzzleConfigFor(1));
    s.drop('p1', { x: 100, y: 100 });
    const last = s.drop('p2', { x: 500, y: 100 });
    expect(last.kind).toBe('snapped');
    expect(last.kind === 'snapped' && last.puzzleComplete).toBe(true);
  });
});
