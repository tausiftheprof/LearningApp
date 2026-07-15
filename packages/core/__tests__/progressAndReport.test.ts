import type { ProgressRecord } from '../src/progress/progress';
import { accuracyTrend, aggregateByCategory, pruneOldRecords } from '../src/progress/progress';
import {
  buildParentReport,
  REPORT_DISCLAIMER,
  violatesNoDiagnosisRule,
} from '../src/progress/report';

let id = 0;
function record(overrides: Partial<ProgressRecord>): ProgressRecord {
  return {
    id: `r${id++}`,
    profileId: 'child1',
    activityId: 'trace-circle',
    category: 'tracing',
    startedAt: 1000 + id,
    completedAt: 2000 + id,
    attempts: 1,
    hintCount: 0,
    accuracyScore: 70,
    durationSeconds: 60,
    ...overrides,
  };
}

describe('progress aggregation', () => {
  it('aggregates by category with average accuracy', () => {
    const aggs = aggregateByCategory([
      record({ accuracyScore: 60 }),
      record({ accuracyScore: 80 }),
      record({ category: 'puzzles', accuracyScore: null }),
    ]);
    const tracing = aggs.find((a) => a.category === 'tracing')!;
    expect(tracing.started).toBe(2);
    expect(tracing.averageAccuracy).toBe(70);
    const puzzles = aggs.find((a) => a.category === 'puzzles')!;
    expect(puzzles.averageAccuracy).toBeNull();
  });

  it('detects an improving accuracy trend', () => {
    const records = [40, 45, 50, 75, 80, 85].map((score, i) =>
      record({ accuracyScore: score, startedAt: i * 1000 }),
    );
    const trend = accuracyTrend(records, 'tracing');
    expect(trend).not.toBeNull();
    expect(trend!.improving).toBe(true);
  });

  it('needs enough data before claiming a trend', () => {
    expect(accuracyTrend([record({})], 'tracing')).toBeNull();
  });

  it('prunes records older than 12 months (docs/07 retention)', () => {
    const now = Date.now();
    const old = record({ startedAt: now - 400 * 24 * 3600 * 1000 });
    const recent = record({ startedAt: now - 10 * 24 * 3600 * 1000 });
    const kept = pruneOldRecords([old, recent], now);
    expect(kept).toHaveLength(1);
    expect(kept[0]!.id).toBe(recent.id);
  });
});

describe('parent report (FR-019)', () => {
  it('builds a report with totals, favourites and suggestions', () => {
    const report = buildParentReport([
      record({}),
      record({ category: 'puzzles' }),
      record({ category: 'puzzles' }),
    ]);
    expect(report.totalCompleted).toBe(3);
    expect(report.favouriteCategory).toBe('puzzles');
    expect(report.suggestions.length).toBeGreaterThan(0);
    expect(report.disclaimer).toBe(REPORT_DISCLAIMER);
  });

  it('never diagnoses: report copy passes the no-diagnosis guard', () => {
    const report = buildParentReport(
      [30, 35, 40, 42, 45, 50].map((s, i) => record({ accuracyScore: s, startedAt: i })),
    );
    for (const text of [report.tracingTrendLine ?? '', ...report.suggestions, report.disclaimer]) {
      expect(violatesNoDiagnosisRule(text)).toBeNull();
    }
  });

  it('the guard itself catches diagnostic language', () => {
    expect(violatesNoDiagnosisRule('possible developmental delay detected')).not.toBeNull();
    expect(violatesNoDiagnosisRule('Great colouring this week!')).toBeNull();
  });
});
