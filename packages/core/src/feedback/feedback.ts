/**
 * Feedback copy registry (FR-015, PRD section 9).
 *
 * The ONLY source of child-facing feedback strings. Every phrase is positive
 * and effort-praising; a tone guard rejects banned negative/pressure words so
 * a bad merge cannot ship discouraging or dark-pattern copy (docs/11 §11.6).
 */

export type FeedbackMoment =
  | 'completed'
  | 'try-again'
  | 'almost'
  | 'effort'
  | 'session-end'
  | 'hint';

const REGISTRY: Record<FeedbackMoment, readonly string[]> = {
  completed: ['Great work!', 'You did it!', 'Fantastic!', 'You completed it!', 'Wonderful!'],
  'try-again': ["Let's try again!", 'Good trying!', 'Have another go!'],
  almost: ['Almost there!', 'So close!', 'Keep going!'],
  effort: ['Good trying!', 'You worked hard!', 'Great effort!'],
  'session-end': ["Today's screen time is up!", "That's all your screen time for today!"],
  hint: ["Here's a little help!", 'Look, it goes here!'],
};

/**
 * Words that must never appear in child-facing feedback: negative judgement,
 * urgency and pressure language (PRD section 9; ACL dark-pattern guardrails).
 */
export const BANNED_WORDS: readonly string[] = [
  'wrong', 'bad', 'fail', 'failed', 'failure', 'no!', 'incorrect', 'mistake', 'lose', 'lost',
  'hurry', 'quick', 'fast!', 'last chance', 'only today', 'buy', 'unlock now', 'limited time',
  'streak', "don't stop", 'missed',
];

const BANNED_PATTERNS: ReadonlyArray<{ word: string; re: RegExp }> = BANNED_WORDS.map((word) => ({
  word,
  // Whole-word match so "So close!" is not flagged for "lose".
  re: new RegExp(`(^|[^a-z])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z])`, 'i'),
}));

export function violatesTone(phrase: string): string | null {
  for (const { word, re } of BANNED_PATTERNS) {
    if (re.test(phrase)) return word;
  }
  return null;
}

/** Validate the whole registry - executed by tests and by the CMS copy lint. */
export function validateRegistry(registry: Record<string, readonly string[]> = REGISTRY): string[] {
  const problems: string[] = [];
  for (const [moment, phrases] of Object.entries(registry)) {
    for (const phrase of phrases) {
      const hit = violatesTone(phrase);
      if (hit) problems.push(`${moment}: "${phrase}" contains banned word "${hit}"`);
    }
  }
  return problems;
}

export function pickFeedback(moment: FeedbackMoment, rng: () => number = Math.random): string {
  const options = REGISTRY[moment];
  return options[Math.floor(rng() * options.length)]!;
}

export function allFeedbackPhrases(): string[] {
  return Object.values(REGISTRY).flat();
}
