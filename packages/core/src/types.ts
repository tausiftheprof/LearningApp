/** Broad age bands only - the app deliberately never stores a date of birth (assumption A-02). */
export type AgeBand = '2-3' | '3-5' | '5-7';

export const AGE_BANDS: readonly AgeBand[] = ['2-3', '3-5', '5-7'];

/** PRD section 8: Beginner / Developing / Confident. */
export type DifficultyLevel = 1 | 2 | 3;

export type Handedness = 'left' | 'right';

export type ActivityCategory =
  | 'drawing'
  | 'colouring'
  | 'puzzles'
  | 'tracing'
  | 'toddler'
  | 'preschool'
  | 'logic';

export const ACTIVITY_CATEGORIES: readonly ActivityCategory[] = [
  'drawing',
  'colouring',
  'puzzles',
  'tracing',
  'toddler',
  'preschool',
  'logic',
];

/** PRD section 7 - every activity must exercise at least one of these movements. */
export type MotorSkill =
  | 'tapping'
  | 'dragging'
  | 'tracing'
  | 'swiping'
  | 'pinching'
  | 'rotating'
  | 'holding-moving'
  | 'controlled-movement'
  | 'bilateral'
  | 'precision-placement';

export const MOTOR_SKILLS: readonly MotorSkill[] = [
  'tapping',
  'dragging',
  'tracing',
  'swiping',
  'pinching',
  'rotating',
  'holding-moving',
  'controlled-movement',
  'bilateral',
  'precision-placement',
];

export interface Point {
  x: number;
  y: number;
}

/** Milliseconds since epoch. Injected everywhere so logic is testable and clock-independent. */
export type Timestamp = number;
