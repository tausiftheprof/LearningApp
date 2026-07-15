import type { ActivityCategory, Timestamp } from '../types';

/**
 * Rewards engine (FR-016, PRD section 10; anti-compulsion constraints C-05).
 *
 * Rewards celebrate effort and learning, never time-in-app:
 *  - stars for completing OR genuinely attempting an activity;
 *  - a small daily cap so rewards cannot incentivise excessive screen time;
 *  - no streaks, no loss mechanics, no countdowns - by design there is no
 *    API surface for them here.
 */

export const DAILY_STAR_CAP = 12;
export const STICKER_EVERY_N_STARS = 5;

export type RewardReason =
  | 'completed'
  | 'good-effort' // several attempts at a hard activity (PRD: "trying a difficult activity")
  | 'new-category' // first activity in a category today ("completing different activity categories")
  | 'accuracy-improved';

export interface RewardGrant {
  kind: 'star' | 'sticker' | 'badge';
  reason: RewardReason | 'sticker-milestone' | 'badge-category';
  refId?: string;
  at: Timestamp;
}

export interface RewardsState {
  totalStars: number;
  stickers: string[]; // sticker ids in unlock order
  badges: string[]; // badge ids
  starsToday: number;
  todayKey: string; // YYYY-MM-DD, device-local
  categoriesToday: ActivityCategory[];
}

export function emptyRewardsState(todayKey: string): RewardsState {
  return { totalStars: 0, stickers: [], badges: [], starsToday: 0, todayKey, categoriesToday: [] };
}

/** Sticker sequence is data; illustrative ids here, real art via content packs. */
export const STICKER_SEQUENCE: readonly string[] = [
  'sticker-sun', 'sticker-koala', 'sticker-rainbow', 'sticker-rocket', 'sticker-wombat',
  'sticker-star-fish', 'sticker-paint-pot', 'sticker-kite', 'sticker-frog', 'sticker-balloon',
  'sticker-echidna', 'sticker-sailboat', 'sticker-flower', 'sticker-dino', 'sticker-moon',
];

export interface RewardEvent {
  category: ActivityCategory;
  completed: boolean;
  attempts: number;
  accuracyScore?: number | undefined;
  previousBestAccuracy?: number | undefined;
  at: Timestamp;
  todayKey: string;
}

export interface RewardOutcome {
  grants: RewardGrant[];
  state: RewardsState;
  /** True when the cap was reached; UI stays celebratory and simply stops adding stars. */
  dailyCapReached: boolean;
}

export function applyRewardEvent(state: RewardsState, event: RewardEvent): RewardOutcome {
  let s: RewardsState =
    state.todayKey === event.todayKey
      ? { ...state, stickers: [...state.stickers], badges: [...state.badges], categoriesToday: [...state.categoriesToday] }
      : { ...state, starsToday: 0, todayKey: event.todayKey, categoriesToday: [], stickers: [...state.stickers], badges: [...state.badges] };

  const grants: RewardGrant[] = [];
  const wantStars: RewardReason[] = [];

  if (event.completed) wantStars.push('completed');
  else if (event.attempts >= 2) wantStars.push('good-effort');

  if (!s.categoriesToday.includes(event.category)) {
    s.categoriesToday.push(event.category);
    if (event.completed) wantStars.push('new-category');
  }

  if (
    event.accuracyScore !== undefined &&
    event.previousBestAccuracy !== undefined &&
    event.accuracyScore > event.previousBestAccuracy
  ) {
    wantStars.push('accuracy-improved');
  }

  let capReached = false;
  for (const reason of wantStars) {
    if (s.starsToday >= DAILY_STAR_CAP) {
      capReached = true;
      break;
    }
    s = { ...s, totalStars: s.totalStars + 1, starsToday: s.starsToday + 1 };
    grants.push({ kind: 'star', reason, at: event.at });

    if (s.totalStars % STICKER_EVERY_N_STARS === 0) {
      const next = STICKER_SEQUENCE[s.stickers.length % STICKER_SEQUENCE.length]!;
      const sticker = s.stickers.length >= STICKER_SEQUENCE.length ? `${next}-${Math.floor(s.stickers.length / STICKER_SEQUENCE.length)}` : next;
      s.stickers.push(sticker);
      grants.push({ kind: 'sticker', reason: 'sticker-milestone', refId: sticker, at: event.at });
    }
  }

  // Badge: completed an activity in every category (lifetime, celebratory).
  const badgeId = `badge-${event.category}-explorer`;
  if (event.completed && !s.badges.includes(badgeId)) {
    s.badges.push(badgeId);
    grants.push({ kind: 'badge', reason: 'badge-category', refId: badgeId, at: event.at });
  }

  return { grants, state: s, dailyCapReached: capReached || s.starsToday >= DAILY_STAR_CAP };
}
