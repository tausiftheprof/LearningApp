import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { defaultAccessibilitySettings } from '@littlegrip/core';
import { useAppStore } from '../../state/appStore';
import { childTheme } from '../../ui/theme';
import { HoldToHomeButton } from '../../ui/components';

/**
 * My Rewards (FR-016, docs/03 S16): purely celebratory. No locked/greyed
 * teaser items, no "come back tomorrow" pressure - by design.
 */
export function RewardsScreen(): React.JSX.Element {
  const { profile, rewards, navigate } = useAppStore();
  const theme = childTheme(profile?.accessibility ?? defaultAccessibilitySettings());

  const stickerEmoji: Record<string, string> = {
    'sticker-sun': '☀️', 'sticker-koala': '🐨', 'sticker-rainbow': '🌈', 'sticker-rocket': '🚀',
    'sticker-wombat': '🦫', 'sticker-star-fish': '⭐', 'sticker-paint-pot': '🎨', 'sticker-kite': '🪁',
    'sticker-frog': '🐸', 'sticker-balloon': '🎈', 'sticker-echidna': '🦔', 'sticker-sailboat': '⛵',
    'sticker-flower': '🌻', 'sticker-dino': '🦕', 'sticker-moon': '🌙',
  };

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <HoldToHomeButton theme={theme} onHome={() => navigate({ name: 'home' })} />
        <Text style={[styles.title, { color: theme.text }]}>My Rewards</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.stars, { color: theme.text }]} accessibilityLabel={`${rewards.totalStars} stars`}>
          ⭐ × {rewards.totalStars}
        </Text>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Sticker book</Text>
        <View style={styles.stickerGrid}>
          {rewards.stickers.map((sticker, i) => (
            <View key={`${sticker}-${i}`} style={[styles.sticker, { backgroundColor: theme.surface }]}>
              <Text style={styles.stickerEmoji}>{stickerEmoji[sticker.replace(/-\d+$/, '')] ?? '🏵️'}</Text>
            </View>
          ))}
          {rewards.stickers.length === 0 && (
            <Text style={[styles.empty, { color: theme.text }]}>
              Play anything to earn your first sticker! 🌟
            </Text>
          )}
        </View>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Badges</Text>
        <View style={styles.stickerGrid}>
          {rewards.badges.map((badge) => (
            <View key={badge} style={[styles.sticker, { backgroundColor: theme.surface }]}>
              <Text style={styles.stickerEmoji}>🏅</Text>
            </View>
          ))}
          {rewards.badges.length === 0 && (
            <Text style={[styles.empty, { color: theme.text }]}>Badges live here. 🏅</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', padding: 8 },
  title: { fontSize: 24, fontWeight: '700', marginLeft: 8 },
  content: { padding: 16 },
  stars: { fontSize: 40, fontWeight: '800', textAlign: 'center', marginVertical: 12 },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  stickerGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  sticker: { width: 84, height: 84, borderRadius: 20, margin: 6, alignItems: 'center', justifyContent: 'center' },
  stickerEmoji: { fontSize: 44 },
  empty: { fontSize: 16, padding: 8 },
});
