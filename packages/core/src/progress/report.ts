import type { ActivityCategory } from '../types';
import type { CategoryAggregate, ProgressRecord } from './progress';
import { accuracyTrend, aggregateByCategory } from './progress';

/**
 * Parent progress report (FR-019, PRD section 11).
 * Simple language; describes play, NEVER diagnoses. A copy guard blocks
 * medical/diagnostic vocabulary from ever appearing in report strings.
 */

export const REPORT_DISCLAIMER =
  'This is play information from the app. It is not a medical or developmental assessment.';

/** Vocabulary that must never appear in report copy (no-diagnosis rule). */
export const DIAGNOSTIC_TERMS: readonly string[] = [
  'diagnos', 'disorder', 'delay', 'deficit', 'dysgraphia', 'dyspraxia', 'autis', 'adhd',
  'behind', 'abnormal', 'impair', 'therapy needed', 'condition', 'symptom',
];

export function violatesNoDiagnosisRule(text: string): string | null {
  const lower = text.toLowerCase();
  for (const term of DIAGNOSTIC_TERMS) if (lower.includes(term)) return term;
  return null;
}

export interface ParentReport {
  totalCompleted: number;
  totalMinutes: number;
  favouriteCategory: ActivityCategory | null;
  byCategory: CategoryAggregate[];
  tracingTrendLine: string | null;
  suggestions: string[];
  disclaimer: string;
}

const CATEGORY_LABEL: Record<ActivityCategory, string> = {
  drawing: 'drawing',
  colouring: 'colouring',
  puzzles: 'puzzles',
  tracing: 'tracing',
  toddler: 'toddler games',
  preschool: 'preschool games',
  logic: 'logic games',
};

export function buildParentReport(records: readonly ProgressRecord[]): ParentReport {
  const byCategory = aggregateByCategory(records);
  const totalCompleted = byCategory.reduce((s, c) => s + c.completed, 0);
  const totalMinutes = Math.round(byCategory.reduce((s, c) => s + c.totalSeconds, 0) / 60);

  const favourite = [...byCategory].sort((a, b) => b.started - a.started)[0] ?? null;

  const trend = accuracyTrend(records, 'tracing');
  const tracingTrendLine =
    trend === null
      ? null
      : trend.improving
        ? `Tracing is getting steadier - recent accuracy is around ${trend.recentAverage}%.`
        : `Tracing accuracy is around ${trend.recentAverage}%. Practice makes progress!`;

  const suggestions: string[] = [];
  const played = new Set(byCategory.filter((c) => c.started > 0).map((c) => c.category));
  for (const category of Object.keys(CATEGORY_LABEL) as ActivityCategory[]) {
    if (!played.has(category) && suggestions.length < 2) {
      suggestions.push(`Try some ${CATEGORY_LABEL[category]} together next time.`);
    }
  }
  const lowest = [...byCategory]
    .filter((c) => c.averageAccuracy !== null)
    .sort((a, b) => (a.averageAccuracy ?? 0) - (b.averageAccuracy ?? 0))[0];
  if (lowest && (lowest.averageAccuracy ?? 100) < 60) {
    suggestions.push(`A little more relaxed practice with ${CATEGORY_LABEL[lowest.category]} could be fun.`);
  }

  const report: ParentReport = {
    totalCompleted,
    totalMinutes,
    favouriteCategory: favourite?.category ?? null,
    byCategory,
    tracingTrendLine,
    suggestions,
    disclaimer: REPORT_DISCLAIMER,
  };

  // Runtime copy guard: a report that violates the no-diagnosis rule is a bug.
  for (const text of [report.tracingTrendLine ?? '', ...report.suggestions, report.disclaimer]) {
    const hit = violatesNoDiagnosisRule(text);
    if (hit) throw new Error(`report copy violates no-diagnosis rule ("${hit}")`);
  }
  return report;
}
