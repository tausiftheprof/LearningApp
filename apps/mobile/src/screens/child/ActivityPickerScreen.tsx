import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Activity, ActivityCategory } from '@littlehands/core';
import { defaultAccessibilitySettings, recommendActivities, ACTIVITY_CATEGORIES } from '@littlehands/core';
import { useAppStore } from '../../state/appStore';
import { childTheme } from '../../ui/theme';
import { BigTile, HoldToHomeButton } from '../../ui/components';
import { IMPLEMENTED_GAME_TEMPLATES } from './games/registry';

/**
 * Activity picker (docs/03 S09). Only playable content is shown: game
 * templates not yet implemented in this scaffold are filtered out entirely -
 * children never see locked or broken teasers.
 */
export function ActivityPickerScreen(props: { category: ActivityCategory }): React.JSX.Element {
  const { profile, catalogue, navigate } = useAppStore();
  const theme = childTheme(profile?.accessibility ?? defaultAccessibilitySettings());

  const playable = catalogue.filter(
    (a) => a.type !== 'game' || IMPLEMENTED_GAME_TEMPLATES.includes(a.template),
  );
  const ranked = recommendActivities(
    playable.filter((a) => a.category === props.category),
    {
      ageBand: profile?.ageBand ?? '3-5',
      difficulty: profile?.difficulty ?? 2,
      favouriteCategories: profile?.favouriteCategories ?? [],
      enabledCategories: [...ACTIVITY_CATEGORIES],
      recentActivityIds: [],
    },
    24,
  );

  const emojiFor = (a: Activity): string =>
    ({ drawing: '🖍️', colouring: '🎨', puzzles: '🧩', tracing: '✏️', toddler: '🐣', preschool: '🦘', logic: '💡' })[a.category];

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <HoldToHomeButton theme={theme} onHome={() => navigate({ name: 'home' })} />
        <Text style={[styles.title, { color: theme.text }]}>Pick one!</Text>
      </View>
      <ScrollView contentContainerStyle={styles.grid}>
        {ranked.map((activity, i) => (
          <View key={activity.id} style={styles.cell}>
            <BigTile
              label={activity.title}
              emoji={emojiFor(activity)}
              colour={theme.tileColours[i % theme.tileColours.length]!}
              theme={theme}
              onPress={() => navigate({ name: 'activity', activity })}
            />
          </View>
        ))}
        {ranked.length === 0 && (
          <Text style={[styles.empty, { color: theme.text }]}>
            New activities are on their way! Try another door on the home screen. 🏠
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', padding: 8 },
  title: { fontSize: 24, fontWeight: '700', marginLeft: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 8 },
  cell: { width: '50%', minHeight: 110 },
  empty: { fontSize: 18, padding: 24, textAlign: 'center' },
});
