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

  it('ships 10 toddler, 10 preschool and 10 logic games (PRD section 25)', () => {
    const count = (c: string) => pack.activities.filter((a) => a.category === c).length;
    expect(count('toddler')).toBe(10);
    expect(count('preschool')).toBe(10);
    expect(count('logic')).toBe(10);
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
