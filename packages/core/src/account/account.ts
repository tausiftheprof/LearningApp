import type { Rng } from '../parentalGate/parentalGate';

/**
 * Parent account & cloud backup/sync (docs/04-architecture.md §4.6, "phase 2
 * accounts"; docs/01 A-01 and future-release item #2).
 *
 * Off by default (A-01): the app runs entirely on-device until a parent
 * explicitly turns this on from Parent → Cloud backup & sync. This is a
 * single PARENT identity that owns the local child profiles - children never
 * authenticate and never hold credentials, here or anywhere else. Sign-in is
 * email + a one-time code, never a stored password, matching the documented
 * design ("email + passkey/OTP... no child email anywhere").
 *
 * MOCK / ILLUSTRATIVE: there is no backend in this build. `requestSignInCode`
 * generates the code locally instead of emailing it (the app surfaces it
 * directly so the flow is usable without a mail server), and `recordSync`
 * just timestamps a sync rather than talking to a server. Turning this on
 * for real users needs the AU-region backend, an updated Privacy Impact
 * Assessment and the security review already scoped in docs/07 §7.1 and
 * docs/09 §9.3 before any account data actually leaves the device.
 */

export type AccountStatus = 'signed-out' | 'code-sent' | 'signed-in';

export interface ParentAccountState {
  /** The feature flag itself, independent of sign-in status. Off by default. */
  enabled: boolean;
  status: AccountStatus;
  email: string | null;
  /** MOCK: the code the (non-existent) email would have contained. Never set once signed in. */
  pendingCode: string | null;
  lastSyncedAt: number | null;
}

export function emptyAccountState(): ParentAccountState {
  return { enabled: false, status: 'signed-out', email: null, pendingCode: null, lastSyncedAt: null };
}

/** Turns the feature on. Does not sign in by itself - the parent still goes through email + code. */
export function enableCloudSync(state: ParentAccountState): ParentAccountState {
  return { ...state, enabled: true };
}

/** Turning sync off also signs out - no lingering session once the feature itself is off. */
export function disableCloudSync(_state: ParentAccountState): ParentAccountState {
  return emptyAccountState();
}

export type EmailValidationError = 'email-empty' | 'email-invalid';

export function validateEmail(email: string): EmailValidationError[] {
  const trimmed = email.trim();
  const errors: EmailValidationError[] = [];
  if (trimmed.length === 0) errors.push('email-empty');
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) errors.push('email-invalid');
  return errors;
}

function generateCode(rng: Rng): string {
  let code = '';
  for (let i = 0; i < 6; i++) code += Math.floor(rng() * 10).toString();
  return code;
}

/** Step 1: parent enters their email and is sent a 6-digit code (mocked - see file doc comment). */
export function requestSignInCode(
  state: ParentAccountState,
  email: string,
  rng: Rng = Math.random,
): ParentAccountState {
  if (!state.enabled) return state;
  if (validateEmail(email).length > 0) return state;
  return { ...state, status: 'code-sent', email: email.trim(), pendingCode: generateCode(rng) };
}

/**
 * Step 2: parent enters the code. A wrong code just stays on `code-sent` so
 * they can retry - there's no lockout here because (unlike the child-facing
 * parental gate) the real security boundary against guessing is a backend
 * rate limit, which doesn't exist in this mock.
 */
export function confirmSignInCode(state: ParentAccountState, code: string): ParentAccountState {
  if (state.status !== 'code-sent' || state.pendingCode === null) return state;
  if (code.trim() !== state.pendingCode) return state;
  return { ...state, status: 'signed-in', pendingCode: null };
}

/** Signs out but leaves the feature enabled and the last-synced timestamp, so
 *  turning it back on doesn't look like data was lost. */
export function signOut(state: ParentAccountState): ParentAccountState {
  return { ...state, status: 'signed-out', email: null, pendingCode: null };
}

/** MOCK sync: stands in for a real backend round-trip (see file doc comment). */
export function recordSync(state: ParentAccountState, now: number): ParentAccountState {
  if (state.status !== 'signed-in') return state;
  return { ...state, lastSyncedAt: now };
}
