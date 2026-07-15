import type { Activity } from '../content/schema';
import type { ProgressRecord } from '../progress/progress';
import type { ActivityCategory, AgeBand, DifficultyLevel } from '../types';

/**
 * Age-based recommendation (FR-002/FR-013, PRD sections 6.1 and 8).
 * The app recommends; parents can override (the override simply becomes the
 * profile's difficulty). Recommendations use LOCAL aggregates only.
 */

export function recommendDifficulty(
  ageBand: AgeBand,
  recentRecords: readonly ProgressRecord[],
  parentOverride: DifficultyLevel | null,
): DifficultyLevel {
  if (parentOverride !== null) return parentOverride;
  const base: Record<AgeBand, DifficultyLevel> = { '2-3': 1, '3-5': 2, '5-7': 3 };
  let level = base[ageBand];
  const scored = recentRecords.filter((r) => r.accuracyScore !== null).slice(-10);
  if (scored.length >= 5) {
    const avg = scored.reduce((s, r) => s + (r.accuracyScore ?? 0), 0) / scored.length;
    // Struggling at the current level -> step down gently; never step up
    // automatically past the age default (calm, non-competitive design).
    if (avg < 40 && level > 1) level = (level - 1) as DifficultyLevel;
  }
  return level;
}

export interface RecommendationInput {
  ageBand: AgeBand;
  difficulty: DifficultyLevel;
  favouriteCategories: readonly ActivityCategory[];
  enabledCategories: readonly ActivityCategory[]; // parent category toggles (FR-018)
  recentActivityIds: readonly string[]; // most recent first
}

/**
 * Rank activities for the child home/daily plan:
 * age-band fit (mandatory) > parent-enabled (mandatory) > not just played >
 * difficulty fit > favourite category variety.
 */
export function recommendActivities(
  catalogue: readonly Activity[],
  input: RecommendationInput,
  limit = 10,
): Activity[] {
  const recent = new Set(input.recentActivityIds.slice(0, 5));
  const eligible = catalogue.filter(
    (a) =>
      a.ageBands.includes(input.ageBand) &&
      input.enabledCategories.includes(a.category),
  );
  const scored = eligible.map((a) => {
    let score = 0;
    if (!recent.has(a.id)) score += 4;
    if (a.difficulty === input.difficulty) score += 3;
    else if (Math.abs(a.difficulty - input.difficulty) === 1) score += 1;
    if (input.favouriteCategories.includes(a.category)) score += 1;
    return { a, score };
  });
  scored.sort((x, y) => y.score - x.score || x.a.id.localeCompare(y.a.id));

  // Round-robin across categories so the top of the list is varied.
  const byCategory = new Map<ActivityCategory, Activity[]>();
  for (const { a } of scored) {
    const list = byCategory.get(a.category) ?? [];
    list.push(a);
    byCategory.set(a.category, list);
  }
  const result: Activity[] = [];
  let added = true;
  while (result.length < limit && added) {
    added = false;
    for (const list of byCategory.values()) {
      const next = list.shift();
      if (next && result.length < limit) {
        result.push(next);
        added = true;
      }
    }
  }
  return result;
}
