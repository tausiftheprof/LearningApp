import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { defaultAccessibilitySettings, pickFeedback } from '@littlegrip/core';
import { useAppStore } from '../../state/appStore';
import { childTheme } from '../../ui/theme';
import { PrimaryButton } from '../../ui/components';

/**
 * Calm end-of-time screen (A-07, docs/03 S17). No countdowns, no guilt.
 * The parent can grant extra time from the gated area (Screen Time section).
 */
export function TimesUpScreen(): React.JSX.Element {
  const { profile, navigate } = useAppStore();
  const theme = childTheme(profile?.accessibility ?? defaultAccessibilitySettings(), profile?.themeId);
  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <Text style={styles.wave}>👋</Text>
      <Text style={[styles.title, { color: theme.text }]}>{pickFeedback('session-end')}</Text>
      <Text style={[styles.subtitle, { color: theme.text }]}>
        Your hands did wonderful work today.
      </Text>
      <PrimaryButton label="Bye! 🏠" theme={theme} onPress={() => navigate({ name: 'home' })} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  wave: { fontSize: 80 },
  title: { fontSize: 28, fontWeight: '800', textAlign: 'center', marginTop: 16 },
  subtitle: { fontSize: 18, textAlign: 'center', marginTop: 8, marginBottom: 24 },
});
