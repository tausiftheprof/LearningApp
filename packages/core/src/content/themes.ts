/**
 * Visual themes (owner-approved design, July 2026): three selectable looks —
 * Soft Storybook, Candy Clouds and Little Aussie Adventure. The palettes are
 * taken verbatim from the approved design spec; both the mobile app and the
 * web demo read these tokens so the two stay in sync.
 *
 * Themes are presentation-only: switching them never changes what data is
 * collected or how activities behave, and the high-contrast accessibility
 * palette always overrides tile colours when enabled.
 */

export interface ThemeGreeting {
  /** Card colour behind "Hi, <name>!". */
  background: string;
  /** Theme-specific line under the greeting. */
  subtitle: string;
  /** Mascot shown beside the greeting (emoji stand-in for the illustration). */
  mascot: string;
}

export interface AppTheme {
  id: 'storybook' | 'candy' | 'aussie';
  name: string;
  /** One-line description shown in the parent theme picker. */
  blurb: string;
  /** App background. */
  background: string;
  /** Main text colour. */
  text: string;
  /** Card / icon-medallion surface. */
  surface: string;
  /** Accent for chevrons and small interactive flourishes. */
  accent: string;
  greeting: ThemeGreeting;
  /** Background of the star-count pill. */
  starPill: string;
  /**
   * Tile colours in home order: Draw, Colour, Puzzles, Tracing, Little Games,
   * Big Kid Games, Think & Solve, Daily Adventure.
   */
  tileColours: string[];
  /** Tile icons in the same order (emoji stand-ins for illustrations). */
  tileIcons: string[];
  /** "My Rewards" banner: colour + leading icon. */
  rewards: { background: string; icon: string };
  /** Tile silhouette: rounded storybook cards, bubbly clouds, or nature cards. */
  tileStyle: 'rounded' | 'bubbly' | 'nature';
}

/** Home-tile subtitles, shared across themes (approved design). */
export const HOME_TILE_SUBTITLES: readonly string[] = [
  'Make your own picture',
  'Make it colourful',
  'Put pieces together',
  'Trace and learn',
  'Fun for little ones',
  'Games for big kids',
  'Use your brain',
  "Today's fun path",
];

const storybook: AppTheme = {
  id: 'storybook',
  name: 'Soft Storybook',
  blurb: 'Gentle pastels and rounded cards, like a picture book.',
  background: '#FFF8F1',
  text: '#4E4655',
  surface: '#FFFFFF',
  accent: '#9C8FD0',
  greeting: { background: '#DDD5F7', subtitle: 'Ready for some fun?', mascot: '🧸' },
  starPill: '#FFFFFF',
  tileColours: ['#FFDCC8', '#FFF0B8', '#CDEEDC', '#DDD5F7', '#CFE8FA', '#FFDCC8', '#DDD5F7', '#CFE8FA'],
  tileIcons: ['🖍️', '🎨', '🧩', '✏️', '🐣', '🦘', '💡', '🗺️'],
  rewards: { background: '#FFF0B8', icon: '⭐' },
  tileStyle: 'rounded',
};

const candy: AppTheme = {
  id: 'candy',
  name: 'Candy Clouds',
  blurb: 'Dreamy clouds, sparkles and sweet-shop colours.',
  background: '#F7F5FF',
  text: '#453D5B',
  surface: '#FFFFFF',
  accent: '#FF9F9F',
  greeting: { background: '#FFFFFF', subtitle: 'What shall we play today?', mascot: '🌟' },
  starPill: '#FFFFFF',
  tileColours: ['#FFCFE1', '#FFF1A8', '#DCCBFF', '#C7E9FF', '#C9F3DF', '#DCCBFF', '#FFF1A8', '#C7E9FF'],
  tileIcons: ['🖍️', '🎨', '🧩', '✏️', '🐣', '🦘', '💡', '🗺️'],
  rewards: { background: '#FFF1A8', icon: '🎁' },
  tileStyle: 'bubbly',
};

const aussie: AppTheme = {
  id: 'aussie',
  name: 'Little Aussie Adventure',
  blurb: 'Eucalyptus, wattle and friendly Australian animals.',
  background: '#FFF9ED',
  text: '#4F463F',
  surface: '#FFFFFF',
  accent: '#567568',
  greeting: { background: '#CFE8D6', subtitle: "Let's explore and play!", mascot: '🐨' },
  starPill: '#FBE7A2',
  tileColours: ['#CFE8D6', '#FFD3BB', '#C7E4EF', '#FBE7A2', '#CFE8D6', '#FFD3BB', '#DDD7F5', '#C7E4EF'],
  tileIcons: ['🕊️', '🦜', '🐨', '🦔', '🦫', '🦘', '🦉', '🧭'],
  rewards: { background: '#FBE7A2', icon: '🏅' },
  tileStyle: 'nature',
};

export const APP_THEMES: readonly AppTheme[] = [storybook, candy, aussie];

export const DEFAULT_THEME_ID: AppTheme['id'] = 'storybook';

/** Look up a theme, falling back to the default for unknown/legacy ids. */
export function themeById(id: string | null | undefined): AppTheme {
  return APP_THEMES.find((t) => t.id === id) ?? storybook;
}
