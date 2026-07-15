import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import type { Theme } from './theme';

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
}): React.JSX.Element {
  const { label, emoji, colour, theme, onPress } = props;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
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
      <Text style={styles.tileEmoji} accessibilityElementsHidden>
        {emoji}
      </Text>
      <Text style={[styles.tileLabel, { color: theme.textOnTile }]}>{label}</Text>
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
 * Hold-to-go-home (C-09): prevents accidental exit while staying operable by
 * a child on purpose. 1.2s press-and-hold; progress announced to readers.
 */
export function HoldToHomeButton(props: {
  theme: Theme;
  holdMs?: number;
  onHome: () => void;
}): React.JSX.Element {
  const holdMs = props.holdMs ?? 1200;
  const [holding, setHolding] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Hold to go home"
      accessibilityHint={`Keep pressing for ${Math.round(holdMs / 1000)} seconds to leave the activity`}
      onPressIn={() => {
        setHolding(true);
        timer.current = setTimeout(props.onHome, holdMs);
      }}
      onPressOut={() => {
        setHolding(false);
        if (timer.current) clearTimeout(timer.current);
      }}
      style={[
        styles.homeButton,
        {
          minWidth: props.theme.childMinTargetDp,
          minHeight: props.theme.childMinTargetDp,
          backgroundColor: holding ? props.theme.accent : props.theme.surface,
        },
      ]}
    >
      <Text style={styles.replayIcon}>🏠</Text>
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
  tileEmoji: { fontSize: 44 },
  tileLabel: { fontSize: 20, fontWeight: '700', marginTop: 6 },
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
