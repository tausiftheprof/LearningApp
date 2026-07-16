import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  dayKeyFrom,
  canStartNewActivity,
  defaultAccessibilitySettings,
  HOME_TILE_SUBTITLES,
} from '@littlegrip/core';
import type { ActivityCategory } from '@littlegrip/core';
import { useAppStore } from '../../state/appStore';
import { childTheme } from '../../ui/theme';
import { BigTile } from '../../ui/components';
import { audioService } from '../../services/audio';

/**
 * Child Home — owner-approved design (July 2026): greeting card with mascot
 * and theme subtitle, star pill + Grown-ups lock on the right, eight tiles
 * with subtitles in two columns, and a full-width "My Rewards" banner.
 */
const TILES: Array<{ label: string; target: { category?: ActivityCategory; special?: 'daily' } }> = [
  { label: 'Draw', target: { category: 'drawing' } },
  { label: 'Colour', target: { category: 'colouring' } },
  { label: 'Puzzles', target: { category: 'puzzles' } },
  { label: 'Tracing', target: { category: 'tracing' } },
  { label: 'Little Games', target: { category: 'toddler' } },
  { label: 'Big Kid Games', target: { category: 'preschool' } },
  { label: 'Think & Solve', target: { category: 'logic' } },
  { label: 'Daily Adventure', target: { special: 'daily' } },
];

export function HomeScreen(): React.JSX.Element {
  const { profile, screenTime, navigate, rewards } = useAppStore();
  const theme = childTheme(profile?.accessibility ?? defaultAccessibilitySettings(), profile?.themeId);
  const app = theme.app;

  function open(target: (typeof TILES)[number]['target'], label: string): void {
    void audioService.playInstruction(`label/${label}`);
    if (!canStartNewActivity(screenTime, dayKeyFrom(new Date()))) {
      navigate({ name: 'times-up' });
      return;
    }
    if (target.special === 'daily') navigate({ name: 'daily-adventure' });
    else if (target.category) navigate({ name: 'picker', category: target.category });
  }

  return (
    <View style={styles.root}>
      <View style={styles.topRow}>
        <View style={[styles.greetingCard, { backgroundColor: app.greeting.background, borderRadius: theme.radius }]}>
          <View style={styles.greetingText}>
            <Text style={[styles.hello, { color: theme.text }]}>Hi, {profile?.nickname ?? 'friend'}!</Text>
            <Text style={[styles.subtitle, { color: theme.text }]}>{app.greeting.subtitle}</Text>
          </View>
          <Text style={styles.mascot} accessibilityElementsHidden>
            {app.greeting.mascot}
          </Text>
        </View>
        <View style={styles.topRight}>
          <View
            style={[styles.starPill, { backgroundColor: app.starPill }]}
            accessibilityLabel={`${rewards.totalStars} stars earned`}
          >
            <Text style={[styles.starPillText, { color: theme.text }]}>⭐ {rewards.totalStars}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="For grown-ups: open parent settings"
            onPress={() => navigate({ name: 'gate' })}
            style={[styles.grownUpsButton, { backgroundColor: theme.surface }]}
          >
            <Text style={styles.grownUpsIcon}>🔒</Text>
            <Text style={[styles.grownUpsText, { color: theme.text }]}>Grown-ups</Text>
          </Pressable>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.grid}>
        {TILES.map((tile, i) => (
          <View key={tile.label} style={styles.cell}>
            <BigTile
              label={tile.label}
              subtitle={HOME_TILE_SUBTITLES[i] ?? ''}
              emoji={app.tileIcons[i] ?? '⭐'}
              colour={theme.tileColours[i % theme.tileColours.length]!}
              theme={theme}
              onPress={() => open(tile.target, tile.label)}
            />
          </View>
        ))}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="My Rewards. Stickers, badges and stars!"
          onPress={() => navigate({ name: 'rewards' })}
          style={[styles.rewardsBanner, { backgroundColor: app.rewards.background, borderRadius: theme.radius }]}
        >
          <Text style={styles.rewardsIcon}>{app.rewards.icon}</Text>
          <View style={styles.rewardsText}>
            <Text style={[styles.rewardsTitle, { color: theme.text }]}>My Rewards</Text>
            <Text style={[styles.rewardsSubtitle, { color: theme.text }]}>Stickers, badges and stars!</Text>
          </View>
          <Text style={[styles.rewardsChevron, { color: theme.text }]}>›</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topRow: { flexDirection: 'row', alignItems: 'stretch', padding: 12, gap: 10 },
  greetingCard: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 14 },
  greetingText: { flex: 1 },
  hello: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: 14, opacity: 0.8, marginTop: 2 },
  mascot: { fontSize: 40, marginLeft: 8 },
  topRight: { alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  starPill: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6, elevation: 1 },
  starPillText: { fontSize: 16, fontWeight: '800' },
  grownUpsButton: { alignItems: 'center', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 },
  grownUpsIcon: { fontSize: 18 },
  grownUpsText: { fontSize: 11, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 8 },
  cell: { width: '50%', minHeight: 130 },
  rewardsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
    marginTop: 4,
    marginBottom: 12,
    padding: 14,
    width: '96%',
  },
  rewardsIcon: { fontSize: 34, marginRight: 12 },
  rewardsText: { flex: 1 },
  rewardsTitle: { fontSize: 20, fontWeight: '800' },
  rewardsSubtitle: { fontSize: 13, opacity: 0.75, marginTop: 2 },
  rewardsChevron: { fontSize: 28, fontWeight: '800', marginLeft: 8 },
});
