import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  dayKeyFrom,
  canStartNewActivity,
  defaultAccessibilitySettings,
  homeTilesForAge,
} from '@littlegrip/core';
import type { HomeTile, HomeTarget } from '@littlegrip/core';
import { useAppStore } from '../../state/appStore';
import { childTheme } from '../../ui/theme';
import { BigTile } from '../../ui/components';
import { audioService } from '../../services/audio';

// The brand mascot (shared artwork in assets/images/). Metro resolves only
// literal require paths, and there is a single mascot across all themes, so it
// is required once here; themes opt in via `greeting.mascotImage`.
const MASCOT_IMAGE = require('../../../../../assets/images/mascot.png');

/**
 * Child Home — age-adaptive design (Direction C, July 2026): greeting card with
 * mascot and theme subtitle, star pill + Grown-ups lock on the right, then an
 * icon+label tile grid whose doors are chosen by the profile's age band
 * (`homeTilesForAge`), and a full-width "My Rewards" banner. The littlest band
 * (2-3) gets fewer, larger tiles; older children get more doors.
 */
export function HomeScreen(): React.JSX.Element {
  const { profile, screenTime, navigate, rewards } = useAppStore();
  const theme = childTheme(profile?.accessibility ?? defaultAccessibilitySettings(), profile?.themeId);
  const app = theme.app;

  const ageBand = profile?.ageBand ?? '3-5';
  const visibleTiles = homeTilesForAge(ageBand);
  const littlest = ageBand === '2-3';

  function open(target: HomeTarget, label: string): void {
    void audioService.playInstruction(`label/${label}`);
    if (!canStartNewActivity(screenTime, dayKeyFrom(new Date()))) {
      navigate({ name: 'times-up' });
      return;
    }
    if ('special' in target && target.special === 'daily') navigate({ name: 'daily-adventure' });
    else if ('category' in target) navigate({ name: 'picker', category: target.category });
  }

  return (
    <View style={styles.root}>
      <View style={styles.topRow}>
        <View style={[styles.greetingCard, { backgroundColor: app.greeting.background, borderRadius: theme.radius }]}>
          <View style={styles.greetingText}>
            <Text style={[styles.hello, { color: app.greeting.titleColor ?? theme.text }]}>
              Hi, {profile?.nickname ?? 'friend'}!
            </Text>
            <Text style={[styles.subtitle, { color: theme.text }]}>{app.greeting.subtitle}</Text>
          </View>
          {app.greeting.mascotImage ? (
            <Image source={MASCOT_IMAGE} style={styles.mascotImg} resizeMode="contain" accessibilityElementsHidden />
          ) : (
            <Text style={styles.mascot} accessibilityElementsHidden>
              {app.greeting.mascot}
            </Text>
          )}
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
        {visibleTiles.map((tile: HomeTile, i) => (
          <View key={tile.label} style={[styles.cell, littlest && styles.cellLittlest]}>
            <BigTile
              label={tile.label}
              emoji={tile.icon ?? app.tileIcons[tile.idx] ?? '⭐'}
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
  mascotImg: { width: 60, height: 60, marginLeft: 8 },
  topRight: { alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  starPill: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6, elevation: 1 },
  starPillText: { fontSize: 16, fontWeight: '800' },
  grownUpsButton: { alignItems: 'center', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 },
  grownUpsIcon: { fontSize: 18 },
  grownUpsText: { fontSize: 11, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 8 },
  cell: { width: '50%', minHeight: 130 },
  // Littlest band (2-3): fewer doors, so give each tile more room.
  cellLittlest: { minHeight: 168 },
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
