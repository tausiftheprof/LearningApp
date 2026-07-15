import {
  budgetSeconds,
  canStartNewActivity,
  dayKeyFrom,
  emptyScreenTime,
  grantExtraTime,
  pruneUsage,
  recordUsage,
  secondsUsed,
} from '../src/screenTime/screenTime';

const DAY = '2026-07-15';

describe('screen time', () => {
  it('allows new activities while under the daily target', () => {
    let s = emptyScreenTime(15);
    s = recordUsage(s, DAY, 10 * 60);
    expect(canStartNewActivity(s, DAY)).toBe(true);
  });

  it('blocks NEW activities at the target (in-flight activity is never cut, A-07)', () => {
    let s = emptyScreenTime(15);
    s = recordUsage(s, DAY, 15 * 60);
    expect(canStartNewActivity(s, DAY)).toBe(false);
  });

  it('has no limit when the parent sets none', () => {
    const s = recordUsage(emptyScreenTime(null), DAY, 10_000);
    expect(budgetSeconds(s, DAY)).toBeNull();
    expect(canStartNewActivity(s, DAY)).toBe(true);
  });

  it('supports a parent override for today only (FR-018)', () => {
    let s = emptyScreenTime(15);
    s = recordUsage(s, DAY, 15 * 60);
    s = grantExtraTime(s, DAY, 10);
    expect(canStartNewActivity(s, DAY)).toBe(true);
    expect(canStartNewActivity(s, '2026-07-16')).toBe(true); // fresh day, fresh budget
    s = recordUsage(s, '2026-07-16', 15 * 60);
    expect(canStartNewActivity(s, '2026-07-16')).toBe(false); // override did not leak
  });

  it('accumulates usage per day and never records negative time', () => {
    let s = emptyScreenTime(15);
    s = recordUsage(s, DAY, 60);
    s = recordUsage(s, DAY, -500);
    expect(secondsUsed(s, DAY)).toBe(60);
  });

  it('prunes the ledger to 90 days (docs/07 retention schedule)', () => {
    let s = emptyScreenTime(15);
    s = recordUsage(s, '2026-01-01', 100);
    s = recordUsage(s, '2026-07-14', 200);
    s = pruneUsage(s, DAY);
    expect(secondsUsed(s, '2026-01-01')).toBe(0);
    expect(secondsUsed(s, '2026-07-14')).toBe(200);
  });

  it('formats day keys from local dates', () => {
    expect(dayKeyFrom(new Date(2026, 6, 15))).toBe('2026-07-15');
  });
});
