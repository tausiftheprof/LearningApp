import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ACTIVITY_CATEGORIES, buildDailyPlan, defaultAccessibilitySettings } from '@littlehands/core';
import { useAppStore } from '../../state/appStore';
import { childTheme } from '../../ui/theme';
import { HoldToHomeButton, PrimaryButton } from '../../ui/components';
import { IMPLEMENTED_GAME_TEMPLATES } from './games/registry';

/**
 * Daily Adventure (FR-020, docs/03 S15): the recipe session as a path of
 * footsteps. Session length comes from the profile's daily target
 * (5/10/15/custom - parent sets it in Screen Time settings).
 */
export function DailyAdventureScreen(): React.JSX.Element {
  const { profile, catalogue, navigate } = useAppStore();
  const theme = childTheme(profile?.accessibility ?? defaultAccessibilitySettings());
  const [step, setStep] = useState(0);

  const plan = useMemo(
    () =>
      buildDailyPlan(
        catalogue.filter((a) => a.type !== 'game' || IMPLEMENTED_GAME_TEMPLATES.includes(a.template)),
        {
          ageBand: profile?.ageBand ?? '3-5',
          difficulty: profile?.difficulty ?? 2,
          favouriteCategories: profile?.favouriteCategories ?? [],
          enabledCategories: [...ACTIVITY_CATEGORIES],
          recentActivityIds: [],
        },
        Math.min(profile?.dailyScreenTimeMinutes ?? 15, 15),
      ),
    [catalogue, profile],
  );

  const current = plan.slots[step];

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <HoldToHomeButton theme={theme} onHome={() => navigate({ name: 'home' })} />
        <Text style={[styles.title, { color: theme.text }]}>Daily Adventure 🗺️</Text>
      </View>
      <View style={styles.path}>
        {plan.slots.map((slot, i) => (
          <Text key={slot.activity.id} style={[styles.foot, { opacity: i <= step ? 1 : 0.35 }]}>
            {i < step ? '✅' : i === step ? '👣' : '⬜'}
          </Text>
        ))}
      </View>
      {current ? (
        <View style={styles.card}>
          <Text style={[styles.next, { color: theme.text }]}>Next up:</Text>
          <Text style={[styles.activityName, { color: theme.text }]}>{current.activity.title}</Text>
          <PrimaryButton
            label="Play! ▶"
            theme={theme}
            onPress={() => {
              setStep(step + 1);
              navigate({ name: 'activity', activity: current.activity });
            }}
          />
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.celebrate}>🎉🏆🎉</Text>
          <Text style={[styles.activityName, { color: theme.text }]}>Adventure complete!</Text>
          <PrimaryButton label="Home 🏠" theme={theme} onPress={() => navigate({ name: 'home' })} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', padding: 8 },
  title: { fontSize: 24, fontWeight: '700', marginLeft: 8 },
  path: { flexDirection: 'row', justifyContent: 'center', marginVertical: 24 },
  foot: { fontSize: 36, marginHorizontal: 6 },
  card: { alignItems: 'center', padding: 24 },
  next: { fontSize: 18 },
  activityName: { fontSize: 26, fontWeight: '800', marginVertical: 12, textAlign: 'center' },
  celebrate: { fontSize: 48 },
});
