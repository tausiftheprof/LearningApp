/**
 * Accessibility settings model (FR-023, PRD section 14) and the derived
 * interaction parameters components consume (docs/03 section 3.9, docs/10).
 * Defaults favour the most accessible safe option.
 */

export interface AccessibilitySettings {
  highContrast: boolean;
  colourBlindFriendly: boolean;
  reducedMotion: boolean;
  reducedStimulation: boolean; // disable ambient/background animation & sound
  largerTouchTargets: boolean;
  longerResponseTime: boolean;
  noTimeLimits: boolean; // true by default; optional timers exist only at level 3
  widerTracingCorridor: boolean;
  alternativeCues: boolean; // haptic + visual pulse wherever sound conveys meaning
  touchSensitivity: 'low' | 'standard' | 'high';
}

export function defaultAccessibilitySettings(): AccessibilitySettings {
  return {
    highContrast: false,
    colourBlindFriendly: false,
    reducedMotion: false,
    reducedStimulation: false,
    largerTouchTargets: false,
    longerResponseTime: false,
    noTimeLimits: true,
    widerTracingCorridor: false,
    alternativeCues: false,
    touchSensitivity: 'standard',
  };
}

export interface InteractionParams {
  /** Minimum child touch-target edge, dp. */
  minTouchTargetDp: number;
  /** Multiplier applied to every timing window (hints, response windows). */
  timingMultiplier: number;
  /** Drag-start threshold in dp (higher = fewer accidental drags). */
  dragStartThresholdDp: number;
  /** Whether optional timed challenges may even be offered. */
  timedChallengesAllowed: boolean;
  animationScale: number; // 0 = crossfade only
}

export function deriveInteractionParams(a: AccessibilitySettings): InteractionParams {
  return {
    minTouchTargetDp: a.largerTouchTargets ? 88 : 64,
    timingMultiplier: a.longerResponseTime ? 2.5 : 1,
    dragStartThresholdDp:
      a.touchSensitivity === 'low' ? 12 : a.touchSensitivity === 'high' ? 2 : 6,
    timedChallengesAllowed: !a.noTimeLimits && !a.reducedStimulation,
    animationScale: a.reducedMotion ? 0 : 1,
  };
}
