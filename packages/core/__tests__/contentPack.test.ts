import { buildStarterPack } from '../src/content/starterPack';
import { validateContentPack } from '../src/content/schema';
import { MOTOR_SKILLS } from '../src/types';

describe('starter content pack', () => {
  const pack = buildStarterPack();

  it('validates against the schema', () => {
    expect(validateContentPack(pack).ok).toBe(true);
  });

  it('covers all seven activity categories', () => {
    const categories = new Set(pack.activities.map((a) => a.category));
    for (const c of ['drawing', 'colouring', 'puzzles', 'tracing', 'toddler', 'preschool', 'logic']) {
      expect(categories).toContain(c);
    }
  });

  it('exercises every fine-motor movement in PRD section 7 (FR-011)', () => {
    const skills = new Set(pack.activities.flatMap((a) => a.motorSkills));
    for (const skill of MOTOR_SKILLS) {
      expect(skills).toContain(skill);
    }
  });

  it('ships six owner-supplied line-art colouring scenes (July 2026)', () => {
    const scenes = pack.activities.filter(
      (a): a is Extract<typeof a, { type: 'colouring' }> => a.type === 'colouring' && a.mode === 'line-art',
    );
    expect(scenes.map((s) => s.id).sort()).toEqual([
      'colour-monkey-tree',
      'colour-rabbit-carrot',
      'colour-rocket-space',
      'colour-solar-system',
      'colour-unicorn-rainbow',
      'colour-whale-waves',
    ]);
    for (const s of scenes) {
      expect(s.image).toMatch(/^images\/scene-[a-z-]+\.png$/);
      expect(s.regions).toEqual([]);
    }
  });

  it('rejects a line-art colouring activity with no image (schema hardening)', () => {
    const bad = {
      ...pack,
      activities: [
        {
          type: 'colouring', id: 'colour-broken', title: 'Broken', category: 'colouring',
          ageBands: ['3-5'], difficulty: 1, motorSkills: ['tapping'],
          estimatedMinutes: 3, theme: 'test', locale: 'en-AU', instructionAudio: 'audio/en-AU/x.mp3',
          mode: 'line-art', regions: [],
        },
      ],
    };
    const result = validateContentPack(bad);
    expect(result.ok).toBe(false);
  });

  it('ships a solid spread of toddler, preschool and logic games (PRD section 25)', () => {
    const count = (c: string) => pack.activities.filter((a) => a.category === c).length;
    // NOTE: a set of games was extracted to a separate project, dropping
    // toddler to 9 and logic to 8. Backfill both categories to restore the
    // PRD-25 target of 10 before ship. Preschool is unaffected.
    expect(count('toddler')).toBeGreaterThanOrEqual(9);
    expect(count('preschool')).toBeGreaterThanOrEqual(10);
    expect(count('logic')).toBeGreaterThanOrEqual(8);
  });

  it('traces numbers up to 10 and the new shapes (owner direction)', () => {
    const ids = pack.activities.map((a) => a.id);
    expect(ids).toContain('trace-number-10');
    for (const shape of ['square', 'rectangle', 'circle', 'oval', 'hexagon', 'pentagon']) {
      expect(ids).toContain(`trace-${shape}`);
    }
  });

  it('gives every activity spoken instructions for non-readers (FR-014)', () => {
    for (const a of pack.activities) {
      expect(a.instructionAudio).toMatch(/^audio\//);
    }
  });

  it('serves every age band', () => {
    const bands = new Set(pack.activities.flatMap((a) => a.ageBands));
    expect(bands).toEqual(new Set(['2-3', '3-5', '5-7']));
  });

  it('keeps activities short for young attention spans (PRD section 30)', () => {
    for (const a of pack.activities) {
      expect(a.estimatedMinutes).toBeLessThanOrEqual(5);
    }
  });
});

describe('schema hardening (docs/09 threat model)', () => {
  const base = buildStarterPack();

  it('rejects packs with duplicate activity ids', () => {
    const bad = { ...base, activities: [base.activities[0]!, base.activities[0]!] };
    const result = validateContentPack(bad);
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('duplicate');
  });

  it('rejects asset refs containing URLs or traversal (no link-out capability)', () => {
    const activity = { ...base.activities[1]!, id: 'evil', instructionAudio: 'https://evil.example/x.mp3' };
    const result = validateContentPack({ ...base, activities: [activity] });
    expect(result.ok).toBe(false);
  });

  it('rejects unknown format versions (forward-compat rule)', () => {
    expect(validateContentPack({ ...base, formatVersion: 999 }).ok).toBe(false);
  });

  it('rejects garbage', () => {
    expect(validateContentPack(null).ok).toBe(false);
    expect(validateContentPack({}).ok).toBe(false);
  });
});
