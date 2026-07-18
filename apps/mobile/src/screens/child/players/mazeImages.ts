/**
 * Static require() map for the maze artwork. Metro resolves `require` only for
 * literal paths, so the maze photos (referenced by name in the content pack's
 * `params.image`) are enumerated here once. Add a new maze's picture here when
 * you add its activity in the starter pack.
 */
export const MAZE_IMAGES: Record<string, number> = {
  'maze-bee': require('../../../../../../assets/images/maze-bee.png'),
  'maze-fish': require('../../../../../../assets/images/maze-fish.png'),
  'maze-puppy': require('../../../../../../assets/images/maze-puppy.png'),
  'maze-rabbit': require('../../../../../../assets/images/maze-rabbit.png'),
  'maze-rocket': require('../../../../../../assets/images/maze-rocket.png'),
  'maze-space': require('../../../../../../assets/images/maze-space.png'),
  'maze-dragon': require('../../../../../../assets/images/maze-dragon.png'),
  'maze-pirate': require('../../../../../../assets/images/maze-pirate.png'),
  'maze-robot': require('../../../../../../assets/images/maze-robot.png'),
  'maze-shark': require('../../../../../../assets/images/maze-shark.png'),
};

/** Emoji stand-ins for the maze character / goal (production art ships later). */
export const MAZE_MOVER_EMOJI: Record<string, string> = {
  chick: '🐤', fish: '🐠', dog: '🐶', rocket: '🚀', unicorn: '🦄', star: '⭐',
};
export const MAZE_GOAL_EMOJI: Record<string, string> = {
  star: '⭐', treehouse: '🏡', rocket: '🚀',
};
