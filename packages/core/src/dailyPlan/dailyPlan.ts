import type { Activity } from '../content/schema';
import type { RecommendationInput } from '../recommendation/recommendation';
import { recommendActivities } from '../recommendation/recommendation';
import type { ActivityCategory } from '../types';

/**
 * Daily Adventure session builder (FR-020, PRD section 12).
 * Recipe: warm-up (toddler tap/drag) -> tracing or drawing -> puzzle ->
 * preschool or logic -> creative colouring. Fits the parent-selected length
 * (5/10/15/custom minutes); ends with a celebration (UI concern).
 */

export type SessionLengthMinutes = 5 | 10 | 15 | number;

interface Slot {
  name: string;
  categories: readonly ActivityCategory[];
}

const RECIPE: readonly Slot[] = [
  { name: 'warm-up', categories: ['toddler'] },
  { name: 'trace-or-draw', categories: ['tracing', 'drawing'] },
  { name: 'puzzle', categories: ['puzzles'] },
  { name: 'think', categories: ['preschool', 'logic'] },
  { name: 'create', categories: ['colouring'] },
];

export interface DailyPlan {
  slots: Array<{ name: string; activity: Activity }>;
  estimatedMinutes: number;
}

export function buildDailyPlan(
  catalogue: readonly Activity[],
  input: RecommendationInput,
  lengthMinutes: SessionLengthMinutes,
): DailyPlan {
  const budget = Math.max(3, lengthMinutes);
  const ranked = recommendActivities(catalogue, input, catalogue.length);
  const slots: Array<{ name: string; activity: Activity }> = [];
  const used = new Set<string>();
  let minutes = 0;

  for (const slot of RECIPE) {
    if (minutes >= budget) break;
    const pick = ranked.find(
      (a) =>
        !used.has(a.id) &&
        slot.categories.includes(a.category) &&
        minutes + a.estimatedMinutes <= budget + 2, // small overshoot beats an empty slot
    );
    if (pick) {
      slots.push({ name: slot.name, activity: pick });
      used.add(pick.id);
      minutes += pick.estimatedMinutes;
    }
  }

  // Very short sessions still get at least one activity.
  if (slots.length === 0 && ranked.length > 0) {
    const first = ranked[0]!;
    slots.push({ name: 'play', activity: first });
    minutes = first.estimatedMinutes;
  }
  return { slots, estimatedMinutes: minutes };
}
