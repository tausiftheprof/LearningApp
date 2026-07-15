import { buildStarterPack } from '../src/content/starterPack';
import { buildDailyPlan } from '../src/dailyPlan/dailyPlan';
import type { RecommendationInput } from '../src/recommendation/recommendation';
import { recommendActivities, recommendDifficulty } from '../src/recommendation/recommendation';
import type { ProgressRecord } from '../src/progress/progress';
import { ACTIVITY_CATEGORIES } from '../src/types';

const pack = buildStarterPack();

const input: RecommendationInput = {
  ageBand: '3-5',
  difficulty: 2,
  favouriteCategories: ['puzzles'],
  enabledCategories: [...ACTIVITY_CATEGORIES],
  recentActivityIds: [],
};

function scored(scores: number[]): ProgressRecord[] {
  return scores.map((accuracyScore, i) => ({
    id: `r${i}`,
    profileId: 'p',
    activityId: 'a',
    category: 'tracing' as const,
    startedAt: i,
    completedAt: i + 1,
    attempts: 1,
    hintCount: 0,
    accuracyScore,
    durationSeconds: 30,
  }));
}

describe('difficulty recommendation (FR-002/FR-013)', () => {
  it('maps age bands to levels', () => {
    expect(recommendDifficulty('2-3', [], null)).toBe(1);
    expect(recommendDifficulty('5-7', [], null)).toBe(3);
  });
  it('parent override always wins (PRD section 8)', () => {
    expect(recommendDifficulty('5-7', [], 1)).toBe(1);
  });
  it('steps down gently when the child is struggling, never up automatically', () => {
    expect(recommendDifficulty('5-7', scored([20, 25, 30, 20, 25]), null)).toBe(2);
    expect(recommendDifficulty('3-5', scored([95, 96, 97, 98, 99]), null)).toBe(2);
  });
});

describe('activity recommendation', () => {
  it('only recommends age-appropriate activities', () => {
    for (const a of recommendActivities(pack.activities, input)) {
      expect(a.ageBands).toContain('3-5');
    }
  });

  it('respects parent category toggles (FR-018)', () => {
    const noPuzzles = recommendActivities(pack.activities, {
      ...input,
      enabledCategories: ['tracing', 'colouring'],
    });
    expect(noPuzzles.every((a) => a.category === 'tracing' || a.category === 'colouring')).toBe(true);
  });

  it('varies categories at the top of the list', () => {
    const top = recommendActivities(pack.activities, input, 5);
    expect(new Set(top.map((a) => a.category)).size).toBeGreaterThan(2);
  });

  it('avoids just-played activities', () => {
    const first = recommendActivities(pack.activities, input, 3);
    const again = recommendActivities(pack.activities, {
      ...input,
      recentActivityIds: first.map((a) => a.id),
    });
    expect(again.slice(0, 3).map((a) => a.id)).not.toEqual(first.map((a) => a.id));
  });
});

describe('Daily Adventure builder (FR-020, PRD section 12)', () => {
  it('assembles the recipe: warm-up, trace/draw, puzzle, think, create', () => {
    const plan = buildDailyPlan(pack.activities, input, 15);
    const names = plan.slots.map((s) => s.name);
    expect(names).toContain('warm-up');
    expect(names).toContain('create');
    expect(plan.slots.length).toBeGreaterThanOrEqual(4);
  });

  it('fits the parent-selected session length', () => {
    const short = buildDailyPlan(pack.activities, input, 5);
    expect(short.estimatedMinutes).toBeLessThanOrEqual(7); // +2 min tolerance rule
    expect(short.slots.length).toBeGreaterThan(0);
  });

  it('never duplicates an activity within a session', () => {
    const plan = buildDailyPlan(pack.activities, input, 15);
    const ids = plan.slots.map((s) => s.activity.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('still offers one activity on a tiny budget', () => {
    const plan = buildDailyPlan(pack.activities, input, 3);
    expect(plan.slots.length).toBeGreaterThanOrEqual(1);
  });
});
