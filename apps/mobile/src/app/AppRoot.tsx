import React, { useEffect } from 'react';
import { AppState, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { defaultAccessibilitySettings } from '@littlegrip/core';
import { useAppStore } from '../state/appStore';
import { childTheme } from '../ui/theme';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { HomeScreen } from '../screens/child/HomeScreen';
import { ActivityPickerScreen } from '../screens/child/ActivityPickerScreen';
import { ActivityPlayerScreen } from '../screens/child/ActivityPlayerScreen';
import { RewardsScreen } from '../screens/child/RewardsScreen';
import { DailyAdventureScreen } from '../screens/child/DailyAdventureScreen';
import { TimesUpScreen } from '../screens/child/TimesUpScreen';
import { GateScreen } from '../screens/parent/GateScreen';
import { ParentAreaScreen } from '../screens/parent/ParentAreaScreen';

export function AppRoot(): React.JSX.Element {
  const { ready, screen, profile, init, gateEnforceRelock } = useAppStore();

  useEffect(() => {
    void init();
  }, [init]);

  // Backgrounding relocks the parental gate (docs/03 section 3.4).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') gateEnforceRelock(true);
    });
    return () => sub.remove();
  }, [gateEnforceRelock]);

  const theme = childTheme(profile?.accessibility ?? defaultAccessibilitySettings(), profile?.themeId);

  if (!ready) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>🖐️</Text>
          <Text style={[styles.loadingLabel, { color: theme.text }]}>Just getting ready…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
      <StatusBar style="dark" />
      {screen.name === 'onboarding' && <OnboardingScreen />}
      {screen.name === 'home' && <HomeScreen />}
      {screen.name === 'picker' && <ActivityPickerScreen category={screen.category} />}
      {screen.name === 'activity' && <ActivityPlayerScreen activity={screen.activity} />}
      {screen.name === 'rewards' && <RewardsScreen />}
      {screen.name === 'daily-adventure' && <DailyAdventureScreen />}
      {screen.name === 'times-up' && <TimesUpScreen />}
      {screen.name === 'gate' && <GateScreen />}
      {screen.name === 'parent' && <ParentAreaScreen section={screen.section} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 64 },
  loadingLabel: { fontSize: 18, marginTop: 12 },
});
