import {
  beginChallenge,
  enforceRelock,
  GATE_LOCKOUT_MS,
  GATE_MAX_ATTEMPTS,
  GATE_SESSION_IDLE_MS,
  generateChallenge,
  initialGateState,
  numberToWords,
  submitAnswer,
  touchSession,
} from '../src/parentalGate/parentalGate';

const seq = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length]!;
};

describe('numberToWords', () => {
  it('spells numbers as words so pre-readers cannot solve the gate', () => {
    expect(numberToWords(7)).toBe('seven');
    expect(numberToWords(21)).toBe('twenty-one');
    expect(numberToWords(40)).toBe('forty');
  });
  it('rejects out-of-range values', () => {
    expect(() => numberToWords(50)).toThrow();
    expect(() => numberToWords(-1)).toThrow();
  });
});

describe('generateChallenge', () => {
  it('produces word-form questions with correct answers', () => {
    const c = generateChallenge(seq(0, 0));
    expect(c.question).toBe('six plus seven');
    expect(c.answer).toBe(13);
  });
  it('always yields multi-digit answers (adult-level per Apple 2.5.14)', () => {
    for (let i = 0; i < 200; i++) {
      expect(generateChallenge().answer).toBeGreaterThanOrEqual(13);
    }
  });
});

describe('gate state machine', () => {
  const t0 = 1_000_000;

  it('unlocks on the correct answer', () => {
    let s = beginChallenge(initialGateState(), t0, seq(0, 0));
    s = submitAnswer(s, 13, t0 + 1000);
    expect(s.status).toBe('unlocked');
  });

  it('issues a NEW question after each wrong answer (no learning by repetition)', () => {
    let s = beginChallenge(initialGateState(), t0, seq(0, 0));
    const firstQuestion = s.challenge!.question;
    s = submitAnswer(s, 999, t0, seq(0.9, 0.9));
    expect(s.status).toBe('locked');
    expect(s.challenge!.question).not.toBe(firstQuestion);
    expect(s.failedAttempts).toBe(1);
  });

  it(`locks out for ${GATE_LOCKOUT_MS / 1000}s after ${GATE_MAX_ATTEMPTS} failures`, () => {
    let s = beginChallenge(initialGateState(), t0);
    for (let i = 0; i < GATE_MAX_ATTEMPTS; i++) s = submitAnswer(s, -1, t0);
    expect(s.status).toBe('lockout');
    // During lockout a new challenge cannot be started...
    expect(beginChallenge(s, t0 + 1000).status).toBe('lockout');
    // ...but can once the cooldown passes.
    expect(beginChallenge(s, t0 + GATE_LOCKOUT_MS + 1).status).toBe('locked');
  });

  it('relocks when the app backgrounds (docs/03 section 3.4)', () => {
    let s = beginChallenge(initialGateState(), t0, seq(0, 0));
    s = submitAnswer(s, 13, t0);
    s = enforceRelock(s, t0 + 500, { appBackgrounded: true });
    expect(s.status).toBe('locked');
  });

  it('relocks after 3 minutes of inactivity, but not while active', () => {
    let s = beginChallenge(initialGateState(), t0, seq(0, 0));
    s = submitAnswer(s, 13, t0);
    s = touchSession(s, t0 + 60_000);
    expect(enforceRelock(s, t0 + 60_000 + GATE_SESSION_IDLE_MS - 1).status).toBe('unlocked');
    expect(enforceRelock(s, t0 + 60_000 + GATE_SESSION_IDLE_MS).status).toBe('locked');
  });
});
