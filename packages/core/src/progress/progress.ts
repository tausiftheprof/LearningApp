import type { ActivityCategory, Timestamp } from '../types';

/**
 * Progress records (FR-012, C-14): per-attempt AGGREGATES only.
 * Never raw strokes, never coordinates, never free text.
 */

export interface ProgressRecord {
  id: string;
  profileId: string;
  activityId: string;
  category: ActivityCategory;
  startedAt: Timestamp;
  completedAt: Timestamp | null;
  attempts: number;
  hintCount: number;
  /** 0..100 where the activity type measures accuracy (tracing, colouring control). */
  accuracyScore: number | null;
  durationSeconds: number;
}

export interface CategoryAggregate {
  category: ActivityCategory;
  started: number;
  completed: number;
  averageAccuracy: number | null;
  totalSeconds: number;
}

export function aggregateByCategory(records: readonly ProgressRecord[]): CategoryAggregate[] {
  const map = new Map<ActivityCategory, { started: number; completed: number; accSum: number; accN: number; secs: number }>();
  for (const r of records) {
    const agg = map.get(r.category) ?? { started: 0, completed: 0, accSum: 0, accN: 0, secs: 0 };
    agg.started++;
    if (r.completedAt !== null) agg.completed++;
    if (r.accuracyScore !== null) {
      agg.accSum += r.accuracyScore;
      agg.accN++;
    }
    agg.secs += r.durationSeconds;
    map.set(r.category, agg);
  }
  return [...map.entries()].map(([category, a]) => ({
    category,
    started: a.started,
    completed: a.completed,
    averageAccuracy: a.accN === 0 ? null : Math.round(a.accSum / a.accN),
    totalSeconds: a.secs,
  }));
}

/** Trend of accuracy over time for one category (used by the parent report). */
export function accuracyTrend(
  records: readonly ProgressRecord[],
  category: ActivityCategory,
): { earlierAverage: number; recentAverage: number; improving: boolean } | null {
  const scored = records
    .filter((r) => r.category === category && r.accuracyScore !== null)
    .sort((a, b) => a.startedAt - b.startedAt);
  if (scored.length < 4) return null;
  const half = Math.floor(scored.length / 2);
  const avg = (rs: ProgressRecord[]) =>
    Math.round(rs.reduce((s, r) => s + (r.accuracyScore ?? 0), 0) / rs.length);
  const earlierAverage = avg(scored.slice(0, half));
  const recentAverage = avg(scored.slice(half));
  return { earlierAverage, recentAverage, improving: recentAverage > earlierAverage };
}

/** Retention job: keep 12 months of records (docs/07 section 7.5). */
export function pruneOldRecords(
  records: readonly ProgressRecord[],
  now: Timestamp,
  keepDays = 365,
): ProgressRecord[] {
  const cutoff = now - keepDays * 24 * 60 * 60 * 1000;
  return records.filter((r) => r.startedAt >= cutoff);
}
