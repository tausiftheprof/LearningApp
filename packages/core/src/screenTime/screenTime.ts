/**
 * Screen-time ledger (FR-018, PRD section 11; behaviour A-07).
 *
 * When the daily target is reached mid-activity the child may finish the
 * current short activity; then the calm "all done for today" screen shows.
 * No countdowns are surfaced to the child. Parents can change or override
 * the limit from the gated area.
 */

export interface ScreenTimeState {
  /** Daily target in minutes; null = no limit set. */
  dailyTargetMinutes: number | null;
  /** Seconds used per local date key (YYYY-MM-DD). Pruned to 90 days (docs/07 retention). */
  usageSecondsByDay: Record<string, number>;
  /** Parent granted extra time today (seconds). Resets daily. */
  overrideSecondsToday: number;
  overrideDayKey: string | null;
}

export function emptyScreenTime(dailyTargetMinutes: number | null = 15): ScreenTimeState {
  return { dailyTargetMinutes, usageSecondsByDay: {}, overrideSecondsToday: 0, overrideDayKey: null };
}

export function recordUsage(state: ScreenTimeState, dayKey: string, seconds: number): ScreenTimeState {
  const current = state.usageSecondsByDay[dayKey] ?? 0;
  return {
    ...state,
    usageSecondsByDay: { ...state.usageSecondsByDay, [dayKey]: current + Math.max(0, seconds) },
  };
}

export function secondsUsed(state: ScreenTimeState, dayKey: string): number {
  return state.usageSecondsByDay[dayKey] ?? 0;
}

export function budgetSeconds(state: ScreenTimeState, dayKey: string): number | null {
  if (state.dailyTargetMinutes === null) return null;
  const override = state.overrideDayKey === dayKey ? state.overrideSecondsToday : 0;
  return state.dailyTargetMinutes * 60 + override;
}

/**
 * Gate for starting a NEW activity. An in-flight activity is never interrupted
 * (A-07) - the UI checks this between activities only.
 */
export function canStartNewActivity(state: ScreenTimeState, dayKey: string): boolean {
  const budget = budgetSeconds(state, dayKey);
  if (budget === null) return true;
  return secondsUsed(state, dayKey) < budget;
}

/** Parent override from the gated area (e.g. +15 minutes today). */
export function grantExtraTime(state: ScreenTimeState, dayKey: string, extraMinutes: number): ScreenTimeState {
  const existing = state.overrideDayKey === dayKey ? state.overrideSecondsToday : 0;
  return { ...state, overrideDayKey: dayKey, overrideSecondsToday: existing + extraMinutes * 60 };
}

/** Retention job: keep only the trailing `keepDays` of ledger (docs/07 section 7.5). */
export function pruneUsage(state: ScreenTimeState, todayKey: string, keepDays = 90): ScreenTimeState {
  const cutoff = shiftDayKey(todayKey, -keepDays);
  const kept: Record<string, number> = {};
  for (const [day, secs] of Object.entries(state.usageSecondsByDay)) {
    if (day >= cutoff) kept[day] = secs;
  }
  return { ...state, usageSecondsByDay: kept };
}

export function dayKeyFrom(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function shiftDayKey(dayKey: string, deltaDays: number): string {
  const [y, m, d] = dayKey.split('-').map(Number);
  const date = new Date(y!, (m! - 1), d!);
  date.setDate(date.getDate() + deltaDays);
  return dayKeyFrom(date);
}
