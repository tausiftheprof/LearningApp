import type { ActivityCategory, AgeBand, DifficultyLevel, Handedness } from '../types';
import { AGE_BANDS } from '../types';
import type { AccessibilitySettings } from '../settings/accessibility';
import { defaultAccessibilitySettings } from '../settings/accessibility';

/**
 * Child profile (FR-001, PRD section 6.1) - a LOCAL record only (A-01).
 * Deliberately minimal: nickname + age band. No date of birth (A-02), no email,
 * no photo. The data model supports many profiles even though the MVP UI shows
 * one (A-14 / C-01).
 */

export const NICKNAME_MAX_LENGTH = 20;

export interface SoundPreferences {
  music: boolean;
  effects: boolean;
  voice: boolean;
  volume: number; // 0..1
  /** Preferred synthesised voice (demo/web: speechSynthesis voice name). */
  voiceName?: string;
}

export interface ChildProfile {
  id: string;
  nickname: string;
  ageBand: AgeBand;
  avatarId: string; // from a fixed built-in set - never a photo
  difficulty: DifficultyLevel;
  handedness: Handedness;
  favouriteCategories: ActivityCategory[];
  sound: SoundPreferences;
  accessibility: AccessibilitySettings;
  /** Minutes; null = no limit. Default 15 (docs/03 onboarding). */
  dailyScreenTimeMinutes: number | null;
  /** Visual theme id (content/themes.ts); absent on legacy profiles = default. */
  themeId?: string;
  createdAt: number;
}

export interface ProfileInput {
  nickname: string;
  ageBand: AgeBand;
  avatarId?: string;
  handedness?: Handedness;
  difficulty?: DifficultyLevel;
  dailyScreenTimeMinutes?: number | null;
}

export type ProfileValidationError =
  | 'nickname-empty'
  | 'nickname-too-long'
  | 'nickname-looks-like-contact-info'
  | 'invalid-age-band';

/**
 * Nicknames must not smuggle in contact details (emails/phone numbers) -
 * minimal-collection guard for the only free-text field a parent enters
 * about the child.
 */
export function validateProfileInput(input: ProfileInput): ProfileValidationError[] {
  const errors: ProfileValidationError[] = [];
  const nickname = input.nickname.trim();
  if (nickname.length === 0) errors.push('nickname-empty');
  if (nickname.length > NICKNAME_MAX_LENGTH) errors.push('nickname-too-long');
  if (/[@]|(\d[\s-]?){6,}/.test(nickname)) errors.push('nickname-looks-like-contact-info');
  if (!AGE_BANDS.includes(input.ageBand)) errors.push('invalid-age-band');
  return errors;
}

export function defaultDifficultyFor(ageBand: AgeBand): DifficultyLevel {
  switch (ageBand) {
    case '2-3':
      return 1;
    case '3-5':
      return 2;
    case '5-7':
      return 3;
  }
}

export function createProfile(input: ProfileInput, id: string, now: number): ChildProfile {
  const errors = validateProfileInput(input);
  if (errors.length > 0) throw new Error(`invalid profile: ${errors.join(', ')}`);
  return {
    id,
    nickname: input.nickname.trim(),
    ageBand: input.ageBand,
    avatarId: input.avatarId ?? 'avatar-koala',
    difficulty: input.difficulty ?? defaultDifficultyFor(input.ageBand),
    handedness: input.handedness ?? 'right',
    favouriteCategories: [],
    sound: { music: true, effects: true, voice: true, volume: 0.7 },
    accessibility: defaultAccessibilitySettings(),
    dailyScreenTimeMinutes: input.dailyScreenTimeMinutes === undefined ? 15 : input.dailyScreenTimeMinutes,
    createdAt: now,
  };
}
