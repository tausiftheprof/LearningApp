/**
 * Owner artwork for the Cut-Along (Busy Hands) game, keyed by the pack-relative
 * asset basename. Metro only resolves literal require() strings, so every cut
 * picture + the scissors pair is enumerated here (mirrors puzzleArt / uiArt).
 */
import { dotArtFor } from './dotArt';

const CUT_ART: Record<string, number> = {
  'cut-car': require('../../../../assets/images/cut-car.png'),
  'cut-cake': require('../../../../assets/images/cut-cake.png'),
  'feed-strawberry': require('../../../../assets/images/feed-strawberry.png'),
  'feed-cupcake': require('../../../../assets/images/feed-cupcake.png'),
  'feed-watermelon': require('../../../../assets/images/feed-watermelon.png'),
  'cut-scissors-open': require('../../../../assets/images/cut-scissors-open.png'),
  'cut-scissors-closed': require('../../../../assets/images/cut-scissors-closed.png'),
  // Picker-tile pictures for the other Busy Hands games (owner direction: a
  // game tile shows its own art, not a generic emoji).
  'feed-mascot-open': require('../../../../assets/images/feed-mascot-open.png'),
  'feed-kangaroo-open': require('../../../../assets/images/feed-kangaroo-open.png'),
  'hop-stone': require('../../../../assets/images/hop-stone.png'),
};

/** 'images/cut-car.png' -> the required module id, or null if unmapped. */
export function cutArtFor(ref: string | undefined): number | null {
  if (!ref) return null;
  const base = (ref.split('/').pop() ?? ref).replace(/\.[a-z0-9]+$/i, '');
  return CUT_ART[base] ?? null;
}

/** Picker-tile picture for the owner-art games: cut → its own picture, feed →
 *  the open character, hop → the lily-pad stone (mirrors the demo). */
export function gamePictureFor(a: {
  type: string;
  template?: string;
  params?: Record<string, unknown>;
}): number | undefined {
  if (a.type !== 'game') return undefined;
  const params = a.params ?? {};
  if (a.template === 'cut-along') return cutArtFor(typeof params.image === 'string' ? params.image : undefined) ?? undefined;
  if (a.template === 'feed-animal') return cutArtFor(typeof params.open === 'string' ? params.open : undefined) ?? undefined;
  if (a.template === 'number-hop') return cutArtFor('hop-stone') ?? undefined;
  // Picture dot-to-dots (puppy/elephant) show their own panel on the tile.
  if (a.template === 'dot-to-dot' && params.printedDots === true) {
    return dotArtFor(typeof params.image === 'string' ? params.image : undefined) ?? undefined;
  }
  return undefined;
}
