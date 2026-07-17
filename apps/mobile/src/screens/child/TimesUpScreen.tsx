import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { defaultAccessibilitySettings, pickFeedback } from '@littlegrip/core';
import { useAppStore } from '../../state/appStore';
import { childTheme } from '../../ui/theme';
import { PrimaryButton } from '../../ui/components';

/**
 * Calm end-of-time screen (A-07, docs/03 S17). No countdowns, no guilt.
 * A grown-up standing right here can also jump straight into the gated area
 * to grant extra time (Screen Time section) instead of going via Home first.
 */
export function TimesUpScreen(): React.JSX.Element {
  const { profile, navigate } = useAppStore();
  const theme = childTheme(profile?.accessibility ?? defaultAccessibilitySettings(), profile?.themeId);
  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <Text style={styles.icon}>⏰</Text>
      <Text style={[styles.title, { color: theme.text }]}>{pickFeedback('session-end')}</Text>
      <Text style={[styles.subtitle, { color: theme.text }]}>
        Come back tomorrow for more fun.
      </Text>
      <PrimaryButton label="Bye! 🏠" theme={theme} onPress={() => navigate({ name: 'home' })} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="For grown-ups: extend screen time"
        onPress={() => navigate({ name: 'gate' })}
        style={styles.grownUpsLink}
      >
        <Text style={[styles.grownUpsText, { color: theme.text }]}>🔒 More time? For grown-ups</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  icon: { fontSize: 80 },
  title: { fontSize: 28, fontWeight: '800', textAlign: 'center', marginTop: 16 },
  subtitle: { fontSize: 18, textAlign: 'center', marginTop: 8, marginBottom: 24 },
  grownUpsLink: { marginTop: 18, padding: 8 },
  grownUpsText: { fontSize: 15, opacity: 0.7, textDecorationLine: 'underline' },
});
