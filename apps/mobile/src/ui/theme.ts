import type { AccessibilitySettings, AppTheme } from '@littlegrip/core';
import { themeById } from '@littlegrip/core';

/**
 * Design system tokens (docs/03 section 3.3), now driven by the owner-approved
 * visual themes in @littlegrip/core (Soft Storybook / Candy Clouds / Little
 * Aussie Adventure). Child space: warm pastel, huge targets. Parent space:
 * standard, visually distinct (PRD section 13). High-contrast palette per
 * docs/10 always wins over the decorative theme.
 */

export interface Theme {
  bg: string;
  surface: string;
  text: string;
  textOnTile: string;
  tileColours: string[];
  accent: string;
  success: string;
  childMinTargetDp: number;
  radius: number;
  /** Full approved-theme tokens (greeting card, tile icons, rewards banner). */
  app: AppTheme;
}

const HC_TILES = ['#0000CC', '#CC0000', '#006600', '#663300', '#330066', '#004466', '#660033', '#333300'];

export const parentTheme: Theme = {
  bg: '#F4F6F8',
  surface: '#FFFFFF',
  text: '#1F2933',
  textOnTile: '#FFFFFF',
  tileColours: ['#3E4C59'],
  accent: '#2F6F62',
  success: '#2E7D32',
  childMinTargetDp: 48,
  radius: 10,
  app: themeById(undefined),
};

export function childTheme(a: AccessibilitySettings, themeId?: string): Theme {
  const app = themeById(themeId);
  const base: Theme = a.highContrast
    ? {
        bg: '#FFFFFF',
        surface: '#FFFFFF',
        text: '#000000',
        textOnTile: '#FFFFFF',
        tileColours: HC_TILES,
        accent: '#0000CC',
        success: '#006600',
        childMinTargetDp: 64,
        radius: 24,
        app,
      }
    : {
        bg: app.background,
        surface: app.surface,
        text: app.text,
        // Pastel tiles carry dark theme text (approved design), not white.
        textOnTile: app.text,
        tileColours: app.tileColours,
        accent: app.accent,
        success: '#81C784',
        childMinTargetDp: 64,
        radius: 24,
        app,
      };
  return { ...base, childMinTargetDp: a.largerTouchTargets ? 88 : 64 };
}
