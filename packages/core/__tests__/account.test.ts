import {
  confirmSignInCode,
  disableCloudSync,
  emptyAccountState,
  enableCloudSync,
  recordSync,
  requestSignInCode,
  signOut,
  validateEmail,
} from '../src/account/account';

// rng() is called once per digit, so a constant fake would repeat one digit
// six times - a short cycling sequence gives a realistic, deterministic code.
function sequenceRng(digits: number[]): () => number {
  let i = 0;
  return () => digits[i++ % digits.length]! / 10;
}
const fixedRng = sequenceRng([1, 2, 3, 4, 5, 6]); // -> code "123456"

describe('parent account & cloud sync', () => {
  it('is off and signed out by default (A-01: local-first unless the parent opts in)', () => {
    const s = emptyAccountState();
    expect(s.enabled).toBe(false);
    expect(s.status).toBe('signed-out');
  });

  it('rejects sign-in attempts while the feature is off', () => {
    const s = requestSignInCode(emptyAccountState(), 'parent@example.com', fixedRng);
    expect(s.status).toBe('signed-out');
  });

  it('validates email before sending a code', () => {
    expect(validateEmail('')).toContain('email-empty');
    expect(validateEmail('not-an-email')).toContain('email-invalid');
    expect(validateEmail('parent@example.com')).toEqual([]);
  });

  it('does not send a code for an invalid email even when enabled', () => {
    const s = requestSignInCode(enableCloudSync(emptyAccountState()), 'not-an-email', fixedRng);
    expect(s.status).toBe('signed-out');
  });

  it('walks through the full sign-in flow: enable -> request code -> confirm', () => {
    let s = enableCloudSync(emptyAccountState());
    s = requestSignInCode(s, 'parent@example.com', fixedRng);
    expect(s.status).toBe('code-sent');
    expect(s.email).toBe('parent@example.com');
    expect(s.pendingCode).toBe('123456');

    const wrong = confirmSignInCode(s, '000000');
    expect(wrong.status).toBe('code-sent'); // stays put, retryable

    const right = confirmSignInCode(s, '123456');
    expect(right.status).toBe('signed-in');
    expect(right.pendingCode).toBeNull();
  });

  it('never signs a child in - there is only ever one email on the account', () => {
    let s = enableCloudSync(emptyAccountState());
    s = requestSignInCode(s, 'PARENT@Example.com  ', fixedRng); // trims/keeps case as entered
    expect(s.email).toBe('PARENT@Example.com');
  });

  it('syncing only records a timestamp once signed in', () => {
    let s = enableCloudSync(emptyAccountState());
    expect(recordSync(s, 1000)).toBe(s); // no-op while signed out

    s = confirmSignInCode(requestSignInCode(s, 'parent@example.com', fixedRng), '123456');
    const synced = recordSync(s, 1000);
    expect(synced.lastSyncedAt).toBe(1000);
  });

  it('signing out clears the session but keeps the feature enabled', () => {
    let s = enableCloudSync(emptyAccountState());
    s = confirmSignInCode(requestSignInCode(s, 'parent@example.com', fixedRng), '123456');
    s = recordSync(s, 1000);
    const out = signOut(s);
    expect(out.status).toBe('signed-out');
    expect(out.email).toBeNull();
    expect(out.enabled).toBe(true); // still on - just not signed in right now
    expect(out.lastSyncedAt).toBe(1000); // history preserved, not lost
  });

  it('turning cloud sync off fully resets to the local-only default', () => {
    let s = enableCloudSync(emptyAccountState());
    s = confirmSignInCode(requestSignInCode(s, 'parent@example.com', fixedRng), '123456');
    const off = disableCloudSync(s);
    expect(off).toEqual(emptyAccountState());
  });
});
