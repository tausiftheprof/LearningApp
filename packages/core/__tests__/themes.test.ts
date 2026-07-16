import { APP_THEMES, DEFAULT_THEME_ID, HOME_TILE_SUBTITLES, themeById } from '../src/content/themes';

const HEX = /^#[0-9A-F]{6}$/i;

describe('app themes (approved design)', () => {
  it('offers exactly the three approved options', () => {
    expect(APP_THEMES.map((t) => t.id)).toEqual(['storybook', 'candy', 'aussie']);
    expect(APP_THEMES.map((t) => t.name)).toEqual([
      'Soft Storybook',
      'Candy Clouds',
      'Little Aussie Adventure',
    ]);
  });

  it('uses the exact palettes from the design spec', () => {
    const [storybook, candy, aussie] = APP_THEMES;
    expect(storybook!.background).toBe('#FFF8F1');
    expect(storybook!.text).toBe('#4E4655');
    expect(candy!.background).toBe('#F7F5FF');
    expect(candy!.text).toBe('#453D5B');
    expect(candy!.accent).toBe('#FF9F9F');
    expect(aussie!.background).toBe('#FFF9ED');
    expect(aussie!.text).toBe('#4F463F');
    expect(aussie!.accent).toBe('#567568');
  });

  it.each(APP_THEMES.map((t) => [t.id, t] as const))(
    '%s: eight home tiles with valid colours and icons',
    (_id, t) => {
      expect(t.tileColours).toHaveLength(8);
      expect(t.tileIcons).toHaveLength(8);
      for (const c of [t.background, t.text, t.surface, t.accent, t.greeting.background, t.starPill, t.rewards.background, ...t.tileColours]) {
        expect(c).toMatch(HEX);
      }
      expect(t.greeting.subtitle.length).toBeGreaterThan(0);
    },
  );

  it('subtitles match the eight home tiles', () => {
    expect(HOME_TILE_SUBTITLES).toHaveLength(8);
  });

  it('defaults to Candy Clouds (owner selection) and falls back for unknown ids', () => {
    expect(DEFAULT_THEME_ID).toBe('candy');
    expect(themeById('sparkle-mega').id).toBe(DEFAULT_THEME_ID);
    expect(themeById(null).id).toBe(DEFAULT_THEME_ID);
    expect(themeById(undefined).id).toBe('candy');
    expect(themeById('aussie').id).toBe('aussie');
  });
});
