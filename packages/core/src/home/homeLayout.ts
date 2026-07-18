import type { ActivityCategory, AgeBand } from '../types';

/**
 * Child-home layout, driven by the profile's age band (Direction C, July 2026).
 *
 * The home page is deliberately age-adaptive: the littlest children (2-3) see a
 * short list of large tiles, and older children see progressively more doors.
 * This is the single source of truth for *which* tiles appear and in what
 * order, shared by both renderers (the Expo app's `HomeScreen` and the web
 * demo's `renderHome`) so they never drift.
 *
 * Tiles show an icon + label only - no per-tile subtitle - to keep reading load
 * off pre-readers (the label is still spoken on tap by each renderer).
 */

/** Where a home tile sends the child. */
export type HomeTarget =
  | { category: ActivityCategory }
  | { special: 'daily' }
  | { special: 'maze' };

export interface HomeTile {
  label: string;
  /**
   * Canonical index into a theme's `tileIcons` / `tileImages` (and the Candy
   * Clouds tile photos, which key off category). Stable per category so the
   * artwork resolves regardless of where the tile lands in an age band's list.
   * Tile *background colour* is chosen by render position, not this index.
   */
  idx: number;
  target: HomeTarget;
  /** Emoji override when the tile has no themed icon of its own (Mazes). */
  icon?: string;
  /** Image-key override when the tile has its own illustration (Mazes). */
  image?: string;
}

// Canonical tiles. `idx` matches the historical category order so existing
// theme icon/image/photo arrays keep resolving:
// 0 Draw · 1 Colour · 2 Puzzles · 3 Tracing · 4 Little Games · 5 Big Kid Games
// · 6 Think & Solve · 7 Daily Adventure.
const DAILY: HomeTile = { label: 'Daily Adventure', idx: 7, target: { special: 'daily' } };
const DRAW: HomeTile = { label: 'Draw', idx: 0, target: { category: 'drawing' } };
const COLOUR: HomeTile = { label: 'Colour', idx: 1, target: { category: 'colouring' } };
const PUZZLES: HomeTile = { label: 'Puzzles', idx: 2, target: { category: 'puzzles' } };
const TRACING: HomeTile = { label: 'Tracing', idx: 3, target: { category: 'tracing' } };
const LITTLE_GAMES: HomeTile = { label: 'Little Games', idx: 4, target: { category: 'toddler' } };
const BIG_KID_GAMES: HomeTile = { label: 'Big Kid Games', idx: 5, target: { category: 'preschool' } };
const THINK_SOLVE: HomeTile = { label: 'Think & Solve', idx: 6, target: { category: 'logic' } };
const MAZES: HomeTile = { label: 'Mazes', idx: 2, target: { special: 'maze' }, icon: '🌀', image: 'maze' };

/**
 * The ordered set of home tiles for a profile's age band. Daily Adventure leads
 * every band as the one-tap curated path a child who can't choose can just tap.
 */
export function homeTilesForAge(ageBand: AgeBand): HomeTile[] {
  switch (ageBand) {
    case '2-3':
      // Fewest, largest tiles: no reading-heavy or advanced doors.
      return [DAILY, DRAW, COLOUR, PUZZLES, LITTLE_GAMES];
    case '3-5':
      return [DAILY, DRAW, COLOUR, TRACING, PUZZLES, LITTLE_GAMES, MAZES];
    case '5-7':
      // Little Games drops off; the "big kid" doors come in.
      return [DAILY, DRAW, COLOUR, TRACING, PUZZLES, MAZES, BIG_KID_GAMES, THINK_SOLVE];
  }
}
