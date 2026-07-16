import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { GameActivity } from '@littlegrip/core';
import { pickFeedback } from '@littlegrip/core';
import type { Theme } from '../../../ui/theme';
import { CompletionBanner } from '../ActivityPlayerScreen';
import { audioService } from '../../../services/audio';

/**
 * Parameterised game player (FR-008..FR-010, docs/03 S14).
 * Implements six safe, self-contained templates with emoji art
 * (ILLUSTRATIVE - production illustrations arrive via content packs).
 * Every template: large targets, no fail states, positive feedback only.
 */
export function GamePlayer(props: {
  activity: GameActivity;
  theme: Theme;
  onComplete: (r: { attempts: number; hintCount: number; accuracyScore: number | null }) => void;
  onDone: () => void;
}): React.JSX.Element {
  const [done, setDone] = useState(false);
  const [attempts, setAttempts] = useState(1);

  function finish(): void {
    if (done) return;
    setDone(true);
    props.onComplete({ attempts, hintCount: 0, accuracyScore: null });
  }

  const t = props.activity.template;
  return (
    <View style={styles.root}>
      {(t === 'pop-bubbles' || t === 'tap-target') && (
        <TapGame theme={props.theme} onFinish={finish} />
      )}
      {(t === 'match-pairs' || t === 'memory-cards') && (
        <MemoryGame theme={props.theme} faceUp={t === 'match-pairs'} onMiss={() => setAttempts((a) => a + 1)} onFinish={finish} />
      )}
      {t === 'counting' && <CountingGame theme={props.theme} onMiss={() => setAttempts((a) => a + 1)} onFinish={finish} />}
      {t === 'odd-one-out' && <OddOneOutGame theme={props.theme} onMiss={() => setAttempts((a) => a + 1)} onFinish={finish} />}
      <CompletionBanner visible={done} onDone={props.onDone} colour={props.theme.success} />
    </View>
  );
}

/* --- Pop the bubbles / tap the target: pure tapping (2-3 years) --- */
function TapGame(props: { theme: Theme; onFinish: () => void }): React.JSX.Element {
  const positions = useMemo(
    () => Array.from({ length: 8 }, (_, i) => ({ id: i, left: `${8 + (i % 4) * 23}%`, top: `${12 + Math.floor(i / 4) * 38}%` })),
    [],
  );
  const [popped, setPopped] = useState<Set<number>>(new Set());
  return (
    <View style={styles.playArea}>
      <Text style={[styles.prompt, { color: props.theme.text }]}>Pop them all! 🫧</Text>
      {positions.map((b) =>
        popped.has(b.id) ? null : (
          <Pressable
            key={b.id}
            accessibilityRole="button"
            accessibilityLabel="Bubble"
            onPress={() => {
              void audioService.playEffect('gentle-pop');
              const next = new Set(popped);
              next.add(b.id);
              setPopped(next);
              if (next.size === positions.length) props.onFinish();
            }}
            style={[styles.bubble, { left: b.left as never, top: b.top as never }]}
          >
            <Text style={styles.bubbleEmoji}>🫧</Text>
          </Pressable>
        ),
      )}
    </View>
  );
}

/* --- Match pairs / memory cards --- */
const CARD_EMOJI = ['🐨', '🦘', '🐸', '🦋', '🐠', '🌻'];

function MemoryGame(props: {
  theme: Theme;
  faceUp: boolean;
  onMiss: () => void;
  onFinish: () => void;
}): React.JSX.Element {
  const deck = useMemo(() => {
    const pairs = CARD_EMOJI.slice(0, 4);
    const cards = [...pairs, ...pairs].map((emoji, i) => ({ id: i, emoji }));
    // Deterministic interleave (calm, not random each render).
    return cards.sort((a, b) => ((a.id * 7) % 8) - ((b.id * 7) % 8));
  }, []);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [open, setOpen] = useState<number[]>([]);
  const [note, setNote] = useState<string | null>(null);

  function flip(id: number): void {
    if (matched.has(id) || open.includes(id) || open.length === 2) return;
    const next = [...open, id];
    setOpen(next);
    if (next.length === 2) {
      const [a, b] = next.map((i) => deck.find((c) => c.id === i)!);
      if (a!.emoji === b!.emoji) {
        const m = new Set(matched);
        next.forEach((i) => m.add(i));
        setTimeout(() => {
          setMatched(m);
          setOpen([]);
          setNote(pickFeedback('completed'));
          if (m.size === deck.length) props.onFinish();
        }, 350);
      } else {
        props.onMiss();
        setNote(pickFeedback('try-again'));
        setTimeout(() => setOpen([]), 900);
      }
    }
  }

  return (
    <View style={styles.playArea}>
      <Text style={[styles.prompt, { color: props.theme.text }]}>Find the pairs!</Text>
      <View style={styles.cardGrid}>
        {deck.map((card) => {
          const shown = props.faceUp || open.includes(card.id) || matched.has(card.id);
          return (
            <Pressable
              key={card.id}
              accessibilityRole="button"
              accessibilityLabel={shown ? `Card showing ${card.emoji}` : 'Face-down card'}
              onPress={() => flip(card.id)}
              style={[styles.card, { backgroundColor: shown ? '#FFFFFF' : props.theme.accent, opacity: matched.has(card.id) ? 0.55 : 1 }]}
            >
              <Text style={styles.cardEmoji}>{shown ? card.emoji : '❓'}</Text>
            </Pressable>
          );
        })}
      </View>
      {note && (
        <Text accessibilityLiveRegion="polite" style={[styles.note, { color: props.theme.text }]}>
          {note}
        </Text>
      )}
    </View>
  );
}

/* --- Count the objects, tap the right number --- */
function CountingGame(props: { theme: Theme; onMiss: () => void; onFinish: () => void }): React.JSX.Element {
  const [round, setRound] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const counts = [2, 3, 4];
  const target = counts[round]!;
  const options = [target, target + 1, Math.max(1, target - 1)].sort((a, b) => a - b);

  function pick(n: number): void {
    if (n === target) {
      if (round + 1 >= counts.length) props.onFinish();
      else {
        setNote(pickFeedback('completed'));
        setRound(round + 1);
      }
    } else {
      props.onMiss();
      setNote(pickFeedback('try-again'));
    }
  }

  return (
    <View style={styles.playArea}>
      <Text style={[styles.prompt, { color: props.theme.text }]}>How many apples?</Text>
      <Text style={styles.countRow}>{'🍎'.repeat(target)}</Text>
      <View style={styles.optionRow}>
        {options.map((n) => (
          <Pressable
            key={n}
            accessibilityRole="button"
            accessibilityLabel={`${n}`}
            onPress={() => pick(n)}
            style={[styles.numberOption, { backgroundColor: props.theme.accent }]}
          >
            <Text style={styles.numberText}>{n}</Text>
          </Pressable>
        ))}
      </View>
      {note && (
        <Text accessibilityLiveRegion="polite" style={[styles.note, { color: props.theme.text }]}>
          {note}
        </Text>
      )}
    </View>
  );
}

/* --- Odd one out --- */
const ODD_ROUNDS = [
  { items: ['🐶', '🐶', '🚗', '🐶'], oddIndex: 2 },
  { items: ['🍌', '🍎', '🍌', '🍌'], oddIndex: 1 },
  { items: ['⭐', '⭐', '⭐', '🌙'], oddIndex: 3 },
];

function OddOneOutGame(props: { theme: Theme; onMiss: () => void; onFinish: () => void }): React.JSX.Element {
  const [round, setRound] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const current = ODD_ROUNDS[round]!;

  function pick(index: number): void {
    if (index === current.oddIndex) {
      if (round + 1 >= ODD_ROUNDS.length) props.onFinish();
      else {
        setNote(pickFeedback('completed'));
        setRound(round + 1);
      }
    } else {
      props.onMiss();
      setNote(pickFeedback('almost'));
    }
  }

  return (
    <View style={styles.playArea}>
      <Text style={[styles.prompt, { color: props.theme.text }]}>Which one is different?</Text>
      <View style={styles.optionRow}>
        {current.items.map((emoji, i) => (
          <Pressable
            key={i}
            accessibilityRole="button"
            accessibilityLabel={`Choice ${i + 1}: ${emoji}`}
            onPress={() => pick(i)}
            style={styles.oddOption}
          >
            <Text style={styles.cardEmoji}>{emoji}</Text>
          </Pressable>
        ))}
      </View>
      {note && (
        <Text accessibilityLiveRegion="polite" style={[styles.note, { color: props.theme.text }]}>
          {note}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  playArea: { flex: 1, padding: 12 },
  prompt: { fontSize: 24, fontWeight: '800', textAlign: 'center', marginVertical: 12 },
  bubble: { position: 'absolute', width: 76, height: 76, alignItems: 'center', justifyContent: 'center' },
  bubbleEmoji: { fontSize: 56 },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  card: { width: 84, height: 84, margin: 8, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cardEmoji: { fontSize: 40 },
  note: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginTop: 16 },
  countRow: { fontSize: 48, textAlign: 'center', marginVertical: 16 },
  optionRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 12 },
  numberOption: { width: 84, height: 84, margin: 10, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
  numberText: { fontSize: 34, fontWeight: '800', color: '#FFFFFF' },
  oddOption: { width: 84, height: 84, margin: 8, borderRadius: 16, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
});
