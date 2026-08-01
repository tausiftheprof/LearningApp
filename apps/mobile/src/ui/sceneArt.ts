/**
 * Full-page line-art scenes for the flood-fill Colouring engine (free "Colour
 * Your Way" scenes + the number-locked Colour-by-Numbers pages). Metro resolves
 * only literal require() strings, so every scene is enumerated here and looked
 * up by pack-relative image ref.
 */
const SCENE_ART: Record<string, number> = {
  'scene-cbn-bunny': require('../../../../assets/images/scene-cbn-bunny.png'),
  'scene-cbn-car': require('../../../../assets/images/scene-cbn-car.png'),
  'scene-cbn-flower': require('../../../../assets/images/scene-cbn-flower.png'),
  'scene-cbn-puppy': require('../../../../assets/images/scene-cbn-puppy.png'),
  'scene-solar-system': require('../../../../assets/images/scene-solar-system.png'),
  'scene-rocket-space': require('../../../../assets/images/scene-rocket-space.png'),
  'scene-unicorn-rainbow': require('../../../../assets/images/scene-unicorn-rainbow.png'),
  'scene-monkey-tree': require('../../../../assets/images/scene-monkey-tree.png'),
  'scene-rabbit-carrot': require('../../../../assets/images/scene-rabbit-carrot.png'),
  'scene-whale-waves': require('../../../../assets/images/scene-whale-waves.png'),
};

/** 'images/scene-cbn-bunny.png' -> the required module id, or null if unmapped. */
export function sceneArtFor(ref: string | undefined): number | null {
  if (!ref) return null;
  const base = (ref.split('/').pop() ?? ref).replace(/\.[a-z0-9]+$/i, '');
  return SCENE_ART[base] ?? null;
}
