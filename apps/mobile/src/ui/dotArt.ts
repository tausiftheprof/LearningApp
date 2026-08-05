/**
 * Owner picture dot-to-dot panels (Aug 2026), keyed by the pack image ref's
 * basename (e.g. `images/dotdot-puppy.png` -> `dotdot-puppy`). Metro only
 * resolves literal require() paths, so every panel is enumerated here (mirrors
 * puzzleArt / cutArt). The DotToDotPlayer blits the picture and the child joins
 * the dots printed ON the artwork.
 */
const DOT_ART: Record<string, number> = {
  'dotdot-puppy': require('../../../../assets/images/dotdot-puppy.png'),
  'dotdot-elephant': require('../../../../assets/images/dotdot-elephant.png'),
};

/** 'images/dotdot-puppy.png' -> the required module id, or null if unmapped. */
export function dotArtFor(ref: string | undefined): number | null {
  if (!ref) return null;
  const base = (ref.split('/').pop() ?? ref).replace(/\.[a-z0-9]+$/i, '');
  return DOT_ART[base] ?? null;
}
