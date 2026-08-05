/**
 * Game templates implemented in this scaffold. Activities whose template is
 * not listed here are hidden from the child picker entirely (no teasers, no
 * broken screens). The remaining templates are built out in delivery phase 2
 * (docs/14) - the content definitions for all 30 games already ship in the
 * starter pack and validate against the schema.
 */
export const IMPLEMENTED_GAME_TEMPLATES: readonly string[] = [
  'pop-bubbles',
  'tap-target',
  'match-pairs',
  'memory-cards',
  'counting',
  'odd-one-out',
  'feed-animal',
  'number-hop',
  'cut-along',
];

/**
 * Whether a game activity is playable on mobile. Beyond the template allow-list
 * above, `dot-to-dot` is ported ONLY in its printed-dots picture mode (the owner
 * puppy/elephant panels — DotToDotPlayer). The procedural vector dot-to-dots
 * (whale/shapes) stay demo-only until a Skia numbered-dot renderer lands, so
 * they are gated out here rather than shown half-working.
 */
export function isImplementedGame(a: { template: string; params?: Record<string, unknown> }): boolean {
  if (IMPLEMENTED_GAME_TEMPLATES.includes(a.template)) return true;
  if (a.template === 'dot-to-dot') return a.params?.printedDots === true;
  return false;
}
