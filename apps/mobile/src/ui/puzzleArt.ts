// Owner picture-puzzle art, keyed by the pack image ref's basename (e.g.
// `images/puzzle-cupcake.png` -> `puzzle-cupcake`). Metro only resolves literal
// require() paths, so every photo jigsaw image is listed explicitly here; the
// PuzzlePlayer slices the picture into grid pieces. Jigsaws whose image isn't
// listed (the procedural SVG ones) fall back to the coloured-tile scaffold.

type ArtMap = Record<string, number>;

export const PUZZLE_ART: ArtMap = {
  'puzzle-monkey': require('../../../../assets/images/puzzle-monkey.png'),
  'puzzle-rabbit': require('../../../../assets/images/puzzle-rabbit.png'),
  'puzzle-unicorn': require('../../../../assets/images/puzzle-unicorn.png'),
  'puzzle-whale': require('../../../../assets/images/puzzle-whale.png'),
  'puzzle-cupcake': require('../../../../assets/images/puzzle-cupcake.png'),
  'puzzle-strawberry': require('../../../../assets/images/puzzle-strawberry.png'),
  'puzzle-watermelon': require('../../../../assets/images/puzzle-watermelon.png'),
  'puzzle-kangaroo': require('../../../../assets/images/puzzle-kangaroo.png'),
  'puzzle-grip': require('../../../../assets/images/puzzle-grip.png'),
  'puzzle-car': require('../../../../assets/images/puzzle-car.png'),
  'puzzle-cake': require('../../../../assets/images/puzzle-cake.png'),
};

/** Resolve a jigsaw's pack image ref (`images/<key>.png|svg`) to a bundled
 *  picture, or null when there's no photo (procedural SVG jigsaw). */
export function puzzleArtFor(imageRef: string | undefined): number | null {
  if (!imageRef) return null;
  const key = imageRef.replace(/^images\//, '').replace(/\.[a-z]+$/i, '');
  return PUZZLE_ART[key] ?? null;
}
