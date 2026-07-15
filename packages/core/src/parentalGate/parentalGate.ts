import type { Timestamp } from '../types';

/**
 * Parental gate (FR-017, UX docs/03 section 3.4, PRD sections 11/16/27).
 *
 * Adult-level challenge: an arithmetic question whose operands are written as
 * English WORDS ("seventeen plus six"), answered on a numeric keypad. Reading
 * word-form numbers plus arithmetic is an adult-level action per Apple 2.5.14
 * expectations and defeats pre-readers by construction.
 *
 * Hardening: 3 failed attempts locks the gate for 60 s; an unlocked session
 * relocks after 3 minutes of inactivity or when the app backgrounds. An
 * optional OS biometric/PIN second factor is layered in the app (not here -
 * the OS holds the biometric; we never collect biometric data).
 */

export const GATE_MAX_ATTEMPTS = 3;
export const GATE_LOCKOUT_MS = 60_000;
export const GATE_SESSION_IDLE_MS = 3 * 60_000;

const UNITS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
] as const;
const TENS = ['', '', 'twenty', 'thirty', 'forty'] as const;

export function numberToWords(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 49) throw new Error('gate numbers are 0..49');
  if (n < 20) return UNITS[n]!;
  const tens = TENS[Math.floor(n / 10)]!;
  const unit = n % 10;
  return unit === 0 ? tens : `${tens}-${UNITS[unit]!}`;
}

export interface GateChallenge {
  /** e.g. "seventeen plus six" - rendered as text, never spoken by the app. */
  question: string;
  answer: number;
}

export type Rng = () => number; // 0..1, injectable for tests

export function generateChallenge(rng: Rng = Math.random): GateChallenge {
  // Operands chosen so answers are 13..49: multi-digit, beyond early-childhood mental maths.
  const a = 6 + Math.floor(rng() * 19); // 6..24
  const b = 7 + Math.floor(rng() * 18); // 7..24
  return { question: `${numberToWords(a)} plus ${numberToWords(b)}`, answer: a + b };
}

export interface GateState {
  status: 'locked' | 'lockout' | 'unlocked';
  challenge: GateChallenge | null;
  failedAttempts: number;
  lockoutUntil: Timestamp | null;
  lastActivityAt: Timestamp | null;
}

export function initialGateState(): GateState {
  return { status: 'locked', challenge: null, failedAttempts: 0, lockoutUntil: null, lastActivityAt: null };
}

export function beginChallenge(state: GateState, now: Timestamp, rng: Rng = Math.random): GateState {
  if (state.status === 'lockout' && state.lockoutUntil !== null && now < state.lockoutUntil) {
    return state; // still cooling down
  }
  return { ...state, status: 'locked', challenge: generateChallenge(rng), lockoutUntil: null };
}

export function submitAnswer(state: GateState, answer: number, now: Timestamp, rng: Rng = Math.random): GateState {
  if (state.status !== 'locked' || state.challenge === null) return state;
  if (answer === state.challenge.answer) {
    return { status: 'unlocked', challenge: null, failedAttempts: 0, lockoutUntil: null, lastActivityAt: now };
  }
  const failed = state.failedAttempts + 1;
  if (failed >= GATE_MAX_ATTEMPTS) {
    return { status: 'lockout', challenge: null, failedAttempts: 0, lockoutUntil: now + GATE_LOCKOUT_MS, lastActivityAt: null };
  }
  // New random question after every wrong answer - answers cannot be learned by repetition.
  return { ...state, failedAttempts: failed, challenge: generateChallenge(rng) };
}

/** Call on any parent-area interaction to keep the session alive. */
export function touchSession(state: GateState, now: Timestamp): GateState {
  return state.status === 'unlocked' ? { ...state, lastActivityAt: now } : state;
}

/** Call on app background, navigation out of parent area, and on a timer tick. */
export function enforceRelock(
  state: GateState,
  now: Timestamp,
  options?: { appBackgrounded?: boolean; leftParentArea?: boolean },
): GateState {
  if (state.status !== 'unlocked') return state;
  const idleTooLong =
    state.lastActivityAt !== null && now - state.lastActivityAt >= GATE_SESSION_IDLE_MS;
  if (options?.appBackgrounded || options?.leftParentArea || idleTooLong) {
    return initialGateState();
  }
  return state;
}
