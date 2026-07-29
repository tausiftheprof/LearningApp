import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import type { Theme } from './theme';
import { UI_ART } from './uiArt';

/**
 * Reusable accessible components (docs/03 section 3.3).
 * Every child-facing control: >=64dp target, accessibilityRole+Label, spoken
 * label on press (audio service), no colour-only signalling.
 */

export function BigTile(props: {
  label: string;
  emoji: string;
  colour: string;
  theme: Theme;
  onPress: () => void;
  /** Approved home design: small line under the label, e.g. "Trace and learn". */
  subtitle?: string;
  /** Letter/number tracing tiles: show just this big glyph pair ("A a"). */
  glyph?: string;
  /** Custom medallion content (e.g. a drawn shape outline) instead of an emoji. */
  iconNode?: React.ReactNode;
}): React.JSX.Element {
  const { label, emoji, colour, theme, onPress, subtitle, glyph, iconNode } = props;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${label}. ${subtitle}` : label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: colour,
          borderRadius: theme.radius,
          minHeight: Math.max(96, theme.childMinTargetDp),
          minWidth: theme.childMinTargetDp,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
      ]}
    >
      {glyph ? (
        <Text style={[styles.tileGlyph, { color: theme.textOnTile }]} accessibilityElementsHidden>
          {glyph}
        </Text>
      ) : (
        <>
          <View style={[styles.tileMedallion, { backgroundColor: theme.surface }]} accessibilityElementsHidden>
            {iconNode ?? <Text style={styles.tileEmoji}>{emoji}</Text>}
          </View>
          <Text style={[styles.tileLabel, { color: theme.textOnTile }]}>{label}</Text>
          {subtitle ? (
            <Text style={[styles.tileSubtitle, { color: theme.textOnTile }]}>{subtitle}</Text>
          ) : null}
        </>
      )}
    </Pressable>
  );
}

/** Instruction bar with an always-available replay button (FR-014). */
export function InstructionBar(props: {
  text: string;
  theme: Theme;
  onReplayAudio: () => void;
}): React.JSX.Element {
  return (
    <View style={[styles.instructionBar, { backgroundColor: props.theme.surface }]}>
      <Text style={[styles.instructionText, { color: props.theme.text }]} numberOfLines={2}>
        {props.text}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Hear the instructions again"
        onPress={props.onReplayAudio}
        style={[styles.replayButton, { minWidth: props.theme.childMinTargetDp, minHeight: props.theme.childMinTargetDp }]}
      >
        <Text style={styles.replayIcon}>🔊</Text>
      </Pressable>
    </View>
  );
}

/**
 * Home button: a single tap goes home (owner direction, July 2026 — the
 * original 1.2s press-and-hold read as broken in testing).
 */
export function HoldToHomeButton(props: {
  theme: Theme;
  onHome: () => void;
}): React.JSX.Element {
  const [pressed, setPressed] = useState(false);
  const size = props.theme.childMinTargetDp;
  const hc = props.theme.highContrast;
  // Owner clay home button (bare — the art carries its own tile); high-contrast
  // keeps the plain emoji-on-surface button for legibility.
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Go home"
      onPress={props.onHome}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        hc ? styles.homeButton : styles.clayButton,
        {
          minWidth: size,
          minHeight: size,
          transform: [{ scale: pressed ? 0.92 : 1 }],
          ...(hc ? { backgroundColor: pressed ? props.theme.accent : props.theme.surface } : {}),
        },
      ]}
    >
      {hc ? (
        <Text style={styles.replayIcon}>🏠</Text>
      ) : (
        <Image source={UI_ART.home} resizeMode="contain" style={{ width: size, height: size }} />
      )}
    </Pressable>
  );
}

export function ParentRow(props: {
  title: string;
  subtitle?: string;
  theme: Theme;
  onPress?: () => void;
  right?: React.ReactNode;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole={props.onPress ? 'button' : 'text'}
      accessibilityLabel={props.subtitle ? `${props.title}. ${props.subtitle}` : props.title}
      onPress={props.onPress}
      style={[styles.parentRow, { backgroundColor: props.theme.surface, borderRadius: props.theme.radius }]}
    >
      <View style={styles.parentRowText}>
        <Text style={[styles.parentRowTitle, { color: props.theme.text }]}>{props.title}</Text>
        {props.subtitle ? (
          <Text style={[styles.parentRowSubtitle, { color: props.theme.text }]}>{props.subtitle}</Text>
        ) : null}
      </View>
      {props.right}
    </Pressable>
  );
}

export function PrimaryButton(props: {
  label: string;
  theme: Theme;
  onPress: () => void;
  destructive?: boolean;
  style?: ViewStyle;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.label}
      onPress={props.onPress}
      style={[
        styles.primaryButton,
        {
          backgroundColor: props.destructive ? '#B3261E' : props.theme.accent,
          borderRadius: props.theme.radius,
          minHeight: props.theme.childMinTargetDp,
        },
        props.style,
      ]}
    >
      <Text style={styles.primaryButtonLabel}>{props.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center', padding: 16, margin: 8, flex: 1 },
  tileMedallion: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileEmoji: { fontSize: 38 },
  tileLabel: { fontSize: 20, fontWeight: '700', marginTop: 6 },
  tileSubtitle: { fontSize: 12, opacity: 0.75, marginTop: 2, textAlign: 'center' },
  tileGlyph: { fontSize: 46, fontWeight: '800', letterSpacing: 2 },
  instructionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    margin: 8,
  },
  instructionText: { flex: 1, fontSize: 18 },
  replayButton: { alignItems: 'center', justifyContent: 'center' },
  replayIcon: { fontSize: 28 },
  homeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    margin: 8,
    elevation: 2,
  },
  clayButton: { alignItems: 'center', justifyContent: 'center', margin: 8 },
  parentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginVertical: 4,
    marginHorizontal: 8,
  },
  parentRowText: { flex: 1 },
  parentRowTitle: { fontSize: 16, fontWeight: '600' },
  parentRowSubtitle: { fontSize: 13, opacity: 0.7, marginTop: 2 },
  primaryButton: { alignItems: 'center', justifyContent: 'center', padding: 14, margin: 8 },
  primaryButtonLabel: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
});
