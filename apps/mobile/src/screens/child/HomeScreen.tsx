import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { dayKeyFrom, canStartNewActivity, defaultAccessibilitySettings } from '@littlehands/core';
import type { ActivityCategory } from '@littlehands/core';
import { useAppStore } from '../../state/appStore';
import { childTheme } from '../../ui/theme';
import { BigTile } from '../../ui/components';
import { audioService } from '../../services/audio';

/** Child Home (docs/03 S08): 8 illustrated tiles, spoken labels, gate icon low-salience. */
const TILES: Array<{ label: string; emoji: string; target: { category?: ActivityCategory; special?: 'daily' | 'rewards' } }> = [
  { label: 'Draw', emoji: '🖍️', target: { category: 'drawing' } },
  { label: 'Colour', emoji: '🎨', target: { category: 'colouring' } },
  { label: 'Puzzles', emoji: '🧩', target: { category: 'puzzles' } },
  { label: 'Tracing', emoji: '✏️', target: { category: 'tracing' } },
  { label: 'Little Games', emoji: '🐣', target: { category: 'toddler' } },
  { label: 'Big Kid Games', emoji: '🦘', target: { category: 'preschool' } },
  { label: 'Think & Solve', emoji: '💡', target: { category: 'logic' } },
  { label: 'Daily Adventure', emoji: '🗺️', target: { special: 'daily' } },
];

export function HomeScreen(): React.JSX.Element {
  const { profile, screenTime, navigate, rewards } = useAppStore();
  const theme = childTheme(profile?.accessibility ?? defaultAccessibilitySettings());

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
      <View style={styles.topBar}>
        <Text style={[styles.hello, { color: theme.text }]}>
          Hi {profile?.nickname ?? 'friend'}! 👋
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="For grown-ups: open parent settings"
          onPress={() => navigate({ name: 'gate' })}
          style={styles.grownUpsButton}
        >
          <Text style={styles.grownUpsText}>Grown-ups</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.grid}>
        {TILES.map((tile, i) => (
          <View key={tile.label} style={styles.cell}>
            <BigTile
              label={tile.label}
              emoji={tile.emoji}
              colour={theme.tileColours[i % theme.tileColours.length]!}
              theme={theme}
              onPress={() => open(tile.target, tile.label)}
            />
          </View>
        ))}
        <View style={styles.cell}>
          <BigTile
            label="My Rewards"
            emoji="⭐"
            colour={theme.tileColours[(TILES.length) % theme.tileColours.length]!}
            theme={theme}
            onPress={() => navigate({ name: 'rewards' })}
          />
        </View>
      </ScrollView>
      <Text style={[styles.stars, { color: theme.text }]} accessibilityLabel={`${rewards.totalStars} stars earned`}>
        ⭐ {rewards.totalStars}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  hello: { flex: 1, fontSize: 24, fontWeight: '700' },
  grownUpsButton: { padding: 10, opacity: 0.55 },
  grownUpsText: { fontSize: 13, color: '#4A3B32' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 8 },
  cell: { width: '50%', minHeight: 120 },
  stars: { fontSize: 20, textAlign: 'center', padding: 8, fontWeight: '700' },
});
