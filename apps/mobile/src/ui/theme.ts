import type { AccessibilitySettings } from '@littlegrip/core';

/**
 * Design system tokens (docs/03 section 3.3).
 * Child space: warm pastel, huge targets. Parent space: standard, visually
 * distinct (PRD section 13). High-contrast palette per docs/10.
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
}

const childBase: Theme = {
  bg: '#FFF8F0',
  surface: '#FFFFFF',
  text: '#4A3B32',
  textOnTile: '#FFFFFF',
  tileColours: ['#F48FB1', '#81C784', '#64B5F6', '#FFB74D', '#BA68C8', '#4DB6AC', '#FF8A65', '#9575CD'],
  accent: '#FF8A65',
  success: '#81C784',
  childMinTargetDp: 64,
  radius: 24,
};

const childHighContrast: Theme = {
  ...childBase,
  bg: '#FFFFFF',
  text: '#000000',
  tileColours: ['#0000CC', '#CC0000', '#006600', '#663300', '#330066', '#004466', '#660033', '#333300'],
};

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
};

export function childTheme(a: AccessibilitySettings): Theme {
  const base = a.highContrast ? childHighContrast : childBase;
  return { ...base, childMinTargetDp: a.largerTouchTargets ? 88 : 64 };
}
