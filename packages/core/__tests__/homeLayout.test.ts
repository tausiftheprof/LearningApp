import { homeTilesForAge, AGE_BANDS } from '../src';
import type { AgeBand } from '../src';

describe('homeTilesForAge', () => {
  const labelsFor = (band: AgeBand) => homeTilesForAge(band).map((t) => t.label);

  it('gives each band exactly the expected doors, in order', () => {
    expect(labelsFor('2-3')).toEqual(['Daily Adventure', 'Draw', 'Colour', 'Puzzles', 'Little Games']);
    expect(labelsFor('3-5')).toEqual([
      'Daily Adventure', 'Draw', 'Colour', 'Tracing', 'Puzzles', 'Little Games',
    ]);
    expect(labelsFor('5-7')).toEqual([
      'Daily Adventure', 'Draw', 'Colour', 'Tracing', 'Puzzles', 'Little Games', 'Think & Solve',
    ]);
  });

  it('leads every band with the Daily Adventure one-tap path', () => {
    for (const band of AGE_BANDS) {
      expect(homeTilesForAge(band)[0]?.target).toEqual({ special: 'daily' });
    }
  });

  it('hides reading-heavy / advanced doors from the littlest (2-3)', () => {
    const labels = labelsFor('2-3');
    for (const hidden of ['Tracing', 'Think & Solve']) {
      expect(labels).not.toContain(hidden);
    }
  });

  it('keeps Little Games and adds Think & Solve at 5-7 (Big Kid Games retired)', () => {
    const labels = labelsFor('5-7');
    expect(labels).toEqual(expect.arrayContaining(['Little Games', 'Think & Solve']));
    expect(labels).not.toContain('Big Kid Games');
  });

  it('has no duplicate labels within a band and keeps every idx in 0..7', () => {
    for (const band of AGE_BANDS) {
      const tiles = homeTilesForAge(band);
      const labels = tiles.map((t) => t.label);
      expect(new Set(labels).size).toBe(labels.length);
      for (const t of tiles) {
        expect(t.idx).toBeGreaterThanOrEqual(0);
        expect(t.idx).toBeLessThanOrEqual(7);
      }
    }
  });

});
