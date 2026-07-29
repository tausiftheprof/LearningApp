import React, { useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  LayoutRectangle,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { GameActivity } from '@littlegrip/core';
import { pickFeedback } from '@littlegrip/core';
import type { Theme } from '../../../ui/theme';
import { CompletionBanner } from '../ActivityPlayerScreen';
import { audioService } from '../../../services/audio';

/**
 * Shared owner artwork (assets/images/) for the Feed-the-Animal game, keyed by
 * the pack-relative asset basename. Metro resolves these at build time, so the
 * requires must be static string literals.
 */
const FEED_IMAGES: Record<string, number> = {
  'feed-mascot-open': require('../../../../../../assets/images/feed-mascot-open.png'),
  'feed-mascot-chomp': require('../../../../../../assets/images/feed-mascot-chomp.png'),
  'feed-kangaroo-open': require('../../../../../../assets/images/feed-kangaroo-open.png'),
  'feed-kangaroo-chomp': require('../../../../../../assets/images/feed-kangaroo-chomp.png'),
  'feed-strawberry': require('../../../../../../assets/images/feed-strawberry.png'),
  'feed-cupcake': require('../../../../../../assets/images/feed-cupcake.png'),
  'feed-watermelon': require('../../../../../../assets/images/feed-watermelon.png'),
  'feed-icecream': require('../../../../../../assets/images/feed-icecream.png'),
  'feed-plant1': require('../../../../../../assets/images/feed-plant1.png'),
  'feed-plant2': require('../../../../../../assets/images/feed-plant2.png'),
  'feed-grass': require('../../../../../../assets/images/feed-grass.png'),
};

/** 'images/feed-mascot-open.png' -> 'feed-mascot-open'. */
function assetName(ref: string): string {
  const base = ref.split('/').pop() ?? ref;
  return base.replace(/\.[a-z0-9]+$/i, '');
}

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
  onReplay?: () => void;
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
      {t === 'feed-animal' && (
        <FeedAnimalGame params={props.activity.params} theme={props.theme} onMiss={() => setAttempts((a) => a + 1)} onFinish={finish} />
      )}
      {t === 'number-hop' && (
        <NumberHopGame params={props.activity.params} theme={props.theme} onMiss={() => setAttempts((a) => a + 1)} onFinish={finish} />
      )}
      <CompletionBanner visible={done} onDone={props.onDone} colour={props.theme.success} onReplay={props.onReplay} />
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

/* --- Number Path Hop: tap the stones 1..max in order (owner game) --- */
function NumberHopGame(props: { params: Record<string, unknown>; theme: Theme; onMiss: () => void; onFinish: () => void }): React.JSX.Element {
  const max = typeof props.params.max === 'number' ? props.params.max : 5;
  const [next, setNext] = useState(1);
  const [note, setNote] = useState<string | null>(null);
  // A fixed, deterministic shuffle of the stone placement 1..max.
  const order = useMemo(() => {
    const a = Array.from({ length: max }, (_, i) => i + 1);
    for (let i = a.length - 1; i > 0; i--) {
      const j = (i * 7 + 3) % (i + 1);
      const tmp = a[i]!; a[i] = a[j]!; a[j] = tmp;
    }
    return a;
  }, [max]);
  function tap(n: number): void {
    if (n === next) {
      if (n >= max) { props.onFinish(); return; }
      setNext(n + 1);
      setNote(pickFeedback('completed'));
    } else {
      props.onMiss();
      setNote(pickFeedback('try-again'));
    }
  }
  return (
    <View style={styles.playArea}>
      <Text style={[styles.prompt, { color: props.theme.text }]}>Hop on {next}!</Text>
      <View style={styles.hopWrap}>
        {order.map((n) => {
          const hopped = n < next;
          return (
            <Pressable
              key={n}
              accessibilityRole="button"
              accessibilityLabel={`Stone ${n}`}
              disabled={hopped}
              onPress={() => tap(n)}
              style={[styles.stone, { backgroundColor: hopped ? '#BDBDBD' : props.theme.success, opacity: hopped ? 0.5 : 1 }]}
            >
              <Text style={styles.stoneText}>{n}</Text>
            </Pressable>
          );
        })}
      </View>
      {note && (
        <Text accessibilityLiveRegion="polite" style={[styles.note, { color: props.theme.text }]}>{note}</Text>
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

/* --- Feed the animal: drag the food into the hungry character's mouth --- */
type Mouth = { x: number; y: number; r: number };
type FoodSpec = { name: string; image: string };

function FeedAnimalGame(props: {
  params: Record<string, unknown>;
  theme: Theme;
  onMiss: () => void;
  onFinish: () => void;
}): React.JSX.Element {
  const p = props.params;
  const openSrc = FEED_IMAGES[assetName(typeof p.open === 'string' ? p.open : '')];
  const chompSrc = FEED_IMAGES[assetName(typeof p.chomp === 'string' ? p.chomp : '')];
  const mouthFrac: Mouth =
    p.mouth && typeof p.mouth === 'object'
      ? (p.mouth as Mouth)
      : { x: 0.5, y: 0.55, r: 0.24 };
  const foods: FoodSpec[] = Array.isArray(p.foods) ? (p.foods as FoodSpec[]) : [];

  const [eaten, setEaten] = useState<Set<number>>(new Set());
  const [chomping, setChomping] = useState(false);
  const mouthRef = useRef<Mouth | null>(null);
  const bounce = useRef(new Animated.Value(1)).current;

  function onCharLayout(rect: LayoutRectangle): void {
    mouthRef.current = {
      x: rect.x + rect.width * mouthFrac.x,
      y: rect.y + rect.height * mouthFrac.y,
      r: rect.width * mouthFrac.r,
    };
  }

  function eat(index: number): void {
    void audioService.playEffect('gentle-pop');
    setChomping(true);
    Animated.sequence([
      Animated.timing(bounce, { toValue: 1.06, duration: 120, useNativeDriver: true }),
      Animated.timing(bounce, { toValue: 1, duration: 240, useNativeDriver: true }),
    ]).start();
    setTimeout(() => setChomping(false), 480);
    setEaten((prev) => {
      const next = new Set(prev);
      next.add(index);
      if (next.size >= foods.length) setTimeout(props.onFinish, 500);
      return next;
    });
  }

  return (
    <View style={styles.feedRoot}>
      <Text style={[styles.prompt, { color: props.theme.text }]}>Drag the food to the mouth! 🍓</Text>
      <View style={styles.feedStage}>
        <Animated.View
          style={[styles.feedCharacter, { transform: [{ scale: bounce }] }]}
          onLayout={(e) => onCharLayout(e.nativeEvent.layout)}
        >
          {(chomping ? chompSrc : openSrc) != null && (
            <Image source={chomping ? chompSrc : openSrc} style={styles.feedCharacterImg} resizeMode="contain" />
          )}
        </Animated.View>
      </View>
      <View style={styles.feedTray}>
        {foods.map((f, i) =>
          eaten.has(i) ? (
            <View key={i} style={styles.feedFoodSlot} />
          ) : (
            <DraggableFood
              key={i}
              source={FEED_IMAGES[assetName(f.image)]}
              label={f.name}
              mouthRef={mouthRef}
              onEaten={() => eat(i)}
              onMiss={props.onMiss}
            />
          ),
        )}
      </View>
    </View>
  );
}

function DraggableFood(props: {
  source: number | undefined;
  label: string;
  mouthRef: React.MutableRefObject<Mouth | null>;
  onEaten: () => void;
  onMiss: () => void;
}): React.JSX.Element {
  const pan = useRef(new Animated.ValueXY()).current;
  const home = useRef({ cx: 0, cy: 0 }).current;
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
        onPanResponderRelease: (_e, g) => {
          const cx = home.cx + g.dx;
          const cy = home.cy + g.dy;
          const m = props.mouthRef.current;
          if (m && Math.hypot(cx - m.x, cy - m.y) <= m.r) {
            props.onEaten();
            Animated.timing(pan, {
              toValue: { x: m.x - home.cx, y: m.y - home.cy },
              duration: 140,
              useNativeDriver: false,
            }).start();
          } else {
            props.onMiss();
            Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
          }
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <Animated.View
      {...responder.panHandlers}
      onLayout={(e) => {
        const { x, y, width, height } = e.nativeEvent.layout;
        home.cx = x + width / 2;
        home.cy = y + height / 2;
      }}
      accessibilityRole="image"
      accessibilityLabel={props.label}
      style={[styles.feedFoodSlot, { transform: pan.getTranslateTransform() }]}
    >
      {props.source != null && <Image source={props.source} style={styles.feedFoodImg} resizeMode="contain" />}
    </Animated.View>
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
  hopWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  stone: { width: 76, height: 76, margin: 10, borderRadius: 38, alignItems: 'center', justifyContent: 'center', elevation: 2 },
  stoneText: { fontSize: 30, fontWeight: '800', color: '#FFFFFF' },
  oddOption: { width: 84, height: 84, margin: 8, borderRadius: 16, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  feedRoot: { flex: 1, padding: 12 },
  feedStage: { flex: 1, alignItems: 'center', justifyContent: 'flex-start' },
  feedCharacter: { width: '70%', height: '80%', alignItems: 'center', justifyContent: 'center' },
  feedCharacterImg: { width: '100%', height: '100%' },
  feedTray: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', paddingVertical: 8 },
  feedFoodSlot: { width: 84, height: 84, margin: 8, alignItems: 'center', justifyContent: 'center' },
  feedFoodImg: { width: '100%', height: '100%' },
});
