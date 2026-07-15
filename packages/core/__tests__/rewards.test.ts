import {
  applyRewardEvent,
  DAILY_STAR_CAP,
  emptyRewardsState,
  STICKER_EVERY_N_STARS,
} from '../src/rewards/rewardsEngine';

const DAY = '2026-07-15';

function completion(overrides: Partial<Parameters<typeof applyRewardEvent>[1]> = {}) {
  return {
    category: 'puzzles' as const,
    completed: true,
    attempts: 1,
    at: 1,
    todayKey: DAY,
    ...overrides,
  };
}

describe('rewards engine', () => {
  it('grants a star for completing an activity', () => {
    const { grants, state } = applyRewardEvent(emptyRewardsState(DAY), completion());
    expect(grants.some((g) => g.kind === 'star' && g.reason === 'completed')).toBe(true);
    expect(state.totalStars).toBeGreaterThanOrEqual(1);
  });

  it('rewards effort on an uncompleted activity after real attempts (PRD section 10)', () => {
    const { grants } = applyRewardEvent(
      emptyRewardsState(DAY),
      completion({ completed: false, attempts: 3 }),
    );
    expect(grants.some((g) => g.reason === 'good-effort')).toBe(true);
  });

  it('does not reward a single instant abandon', () => {
    const { grants } = applyRewardEvent(
      emptyRewardsState(DAY),
      completion({ completed: false, attempts: 1 }),
    );
    expect(grants).toHaveLength(0);
  });

  it('rewards accuracy improvement', () => {
    const { grants } = applyRewardEvent(
      emptyRewardsState(DAY),
      completion({ accuracyScore: 80, previousBestAccuracy: 60 }),
    );
    expect(grants.some((g) => g.reason === 'accuracy-improved')).toBe(true);
  });

  it(`caps stars at ${DAILY_STAR_CAP}/day so rewards never drive excessive screen time (C-05)`, () => {
    let state = emptyRewardsState(DAY);
    for (let i = 0; i < 30; i++) {
      state = applyRewardEvent(state, completion({ at: i })).state;
    }
    expect(state.starsToday).toBeLessThanOrEqual(DAILY_STAR_CAP);
  });

  it('resets the daily count (but not the total) on a new day', () => {
    let state = emptyRewardsState(DAY);
    for (let i = 0; i < 30; i++) state = applyRewardEvent(state, completion({ at: i })).state;
    const total = state.totalStars;
    const next = applyRewardEvent(state, completion({ todayKey: '2026-07-16' }));
    expect(next.state.starsToday).toBeGreaterThan(0);
    expect(next.state.starsToday).toBeLessThan(DAILY_STAR_CAP);
    expect(next.state.totalStars).toBeGreaterThan(total);
  });

  it(`unlocks a sticker every ${STICKER_EVERY_N_STARS} stars`, () => {
    let state = emptyRewardsState(DAY);
    let day = 15;
    // Spread across days to stay under the daily cap.
    for (let i = 0; i < STICKER_EVERY_N_STARS * 2; i++) {
      state = applyRewardEvent(
        state,
        completion({ completed: false, attempts: 2, todayKey: `2026-07-${day++}` }),
      ).state;
    }
    expect(state.stickers.length).toBeGreaterThanOrEqual(2);
  });

  it('grants a category explorer badge once per category', () => {
    let state = emptyRewardsState(DAY);
    state = applyRewardEvent(state, completion()).state;
    const again = applyRewardEvent(state, completion({ at: 2 }));
    expect(state.badges).toContain('badge-puzzles-explorer');
    expect(again.grants.filter((g) => g.kind === 'badge')).toHaveLength(0);
  });

  it('exposes no streak or loss mechanics by design', () => {
    const state = emptyRewardsState(DAY) as unknown as Record<string, unknown>;
    expect(Object.keys(state).join(' ')).not.toMatch(/streak|loss|combo|chain/i);
  });
});
