import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { Activity, ActivityCategory } from '@littlegrip/core';
import { defaultAccessibilitySettings, recommendActivities, ACTIVITY_CATEGORIES, nameStrokes } from '@littlegrip/core';
import { useAppStore } from '../../state/appStore';
import { childTheme } from '../../ui/theme';
import { HoldToHomeButton } from '../../ui/components';
import { isImplementedGame } from './games/registry';
import { tracingArtFor, gameArtFor, sectionIcon } from '../../ui/tracingArt';
import { puzzleArtFor } from '../../ui/puzzleArt';
import { gamePictureFor } from '../../ui/cutArt';
import { sceneArtFor } from '../../ui/sceneArt';

/**
 * Little Games groups (owner direction, July 2026): the toddler door opens a
 * chooser — Sort & Match, Tap & Count, Patterns, Busy Hands — each listing only
 * its own games. Membership is a template predicate; empty groups are hidden.
 * Three tiles carry the group name baked into the clay art (`labelled`).
 */
const GAME_GROUPS = [
  { key: 'games-sort' as const, label: 'Sort & Match', icon: 'games-sort', labelled: true, has: (t: string) => t === 'match-pairs' || t === 'memory-cards' || t === 'shadow-match' || t === 'letter-match' || t === 'drag-sort' },
  { key: 'games-tap' as const, label: 'Tap & Count', icon: 'games-tap', labelled: true, has: (t: string) => t === 'pop-bubbles' || t === 'tap-target' || t === 'counting' || t === 'number-hop' || t === 'odd-one-out' },
  { key: 'games-patterns' as const, label: 'Patterns', icon: 'games-patterns', labelled: true, has: (t: string) => t === 'sequence' || t === 'pattern-complete' },
  { key: 'games-hands' as const, label: 'Busy Hands', icon: 'games-hands', labelled: false, has: (t: string) => t === 'feed-animal' || t === 'cut-along' || t === 'stack-blocks' || t === 'reveal-wipe' },
];
type GameGroupKey = (typeof GAME_GROUPS)[number]['key'];

/** Colour Your Way tiles reuse the finished COLOURED art (the photo-puzzle
 *  pictures) as their thumbnail, so the tile reads clearly instead of a faint
 *  black-and-white outline (owner direction). Keyed by activity id → puzzle key. */
const COLOUR_TILE_ART: Record<string, string> = {
  'colour-unicorn-rainbow': 'puzzle-unicorn',
  'colour-monkey-tree': 'puzzle-monkey',
  'colour-rabbit-carrot': 'puzzle-rabbit',
  'colour-whale-waves': 'puzzle-whale',
};

const SPARK_EMOJI = ['✨', '⭐', '🌟'];

/** A short outward sparkle burst, retriggered whenever `trigger` changes. */
function Sparkles({ trigger }: { trigger: number }): React.JSX.Element | null {
  const anims = useRef(Array.from({ length: 5 }, () => new Animated.Value(0))).current;
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (trigger === 0) return;
    setShow(true);
    Animated.parallel(
      anims.map((a) => {
        a.setValue(0);
        return Animated.timing(a, { toValue: 1, duration: 620, easing: Easing.out(Easing.quad), useNativeDriver: true });
      }),
    ).start(() => setShow(false));
  }, [trigger, anims]);
  if (!show) return null;
  return (
    <View pointerEvents="none" style={styles.sparkLayer}>
      {anims.map((a, k) => {
        const ang = (k / anims.length) * Math.PI * 2;
        const translateX = a.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(ang) * 44] });
        const translateY = a.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(ang) * 44] });
        const opacity = a.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] });
        const scale = a.interpolate({ inputRange: [0, 1], outputRange: [1, 0.4] });
        return (
          <Animated.Text key={k} style={[styles.spark, { opacity, transform: [{ translateX }, { translateY }, { scale }] }]}>
            {SPARK_EMOJI[k % SPARK_EMOJI.length]}
          </Animated.Text>
        );
      })}
    </View>
  );
}

/**
 * A round balloon "bubble" door (approved demo look). `bare` drops the coloured
 * circle so clay art floats on its own (used for the letter/number/shape lists);
 * otherwise the icon sits in a soft colour bubble. Idle bob + pop + tap sparkle.
 */
function BubbleTile(props: {
  label: string;
  showLabel: boolean;
  bare: boolean;
  colour: string;
  textColour: string;
  artSource?: number | undefined;
  emoji?: string | undefined;
  glyph?: string | undefined;
  index: number;
  cellW: number;
  onPress: () => void;
}): React.JSX.Element {
  const bob = useRef(new Animated.Value(0)).current;
  const [spark, setSpark] = useState(0);
  useEffect(() => {
    const dur = 1800 + (props.index % 4) * 220;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: dur, delay: props.index * 140, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: dur, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob, props.index]);
  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -5] });

  const diameter = props.cellW - 14;
  const iconSize = props.bare ? props.cellW - 16 : Math.round(diameter * 0.62);
  const icon = props.artSource ? (
    <Image source={props.artSource} style={{ width: iconSize, height: iconSize }} resizeMode="contain" accessibilityElementsHidden />
  ) : props.glyph ? (
    <Text style={{ fontSize: iconSize * 0.5, fontWeight: '800', color: props.textColour }}>{props.glyph}</Text>
  ) : (
    <Text style={{ fontSize: iconSize * 0.55 }}>{props.emoji ?? '⭐'}</Text>
  );

  return (
    <Animated.View style={[styles.bCell, { width: props.cellW, transform: [{ translateY }] }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={props.label}
        onPress={() => {
          setSpark((k) => k + 1);
          props.onPress();
        }}
        style={({ pressed }) => [styles.bPress, pressed && styles.bPressed]}
      >
        {props.bare ? (
          <View style={[styles.bareIcon, { width: iconSize, height: iconSize }]}>{icon}</View>
        ) : (
          <View style={[styles.bubble, { width: diameter, height: diameter, borderRadius: diameter / 2, backgroundColor: props.colour }]}>
            {icon}
          </View>
        )}
        {props.showLabel && (
          <Text style={[styles.bLabel, { color: props.textColour }]} numberOfLines={1}>
            {props.label}
          </Text>
        )}
        <Sparkles trigger={spark} />
      </Pressable>
    </Animated.View>
  );
}

/**
 * Activity picker (docs/03 S09). Only playable content is shown: game
 * templates not yet implemented in this scaffold are filtered out entirely -
 * children never see locked or broken teasers. Round bubble tiles (approved
 * demo look), with the owner's cloud section icons on the tracing chooser and
 * clay glyph art on the letter/number/shape bubbles.
 */
type PickerCategory = ActivityCategory | 'tracing-letters' | 'tracing-numbers' | 'tracing-shapes' | GameGroupKey | 'colour-cbn' | 'colour-free';

export function ActivityPickerScreen(props: { category: PickerCategory }): React.JSX.Element {
  const { profile, catalogue, navigate } = useAppStore();
  const theme = childTheme(profile?.accessibility ?? defaultAccessibilitySettings(), profile?.themeId);
  const littlest = (profile?.ageBand ?? '3-5') === '2-3';
  // The littlest band (2-3) skips the tracing chooser and goes straight to
  // Shapes - letters/numbers stay a 3-5+ experience (owner direction, July 2026).
  const category: PickerCategory = props.category === 'tracing' && littlest ? 'tracing-shapes' : props.category;

  // Responsive bubble sizing from the live viewport (phone → tablet → web).
  const { width: winW } = useWindowDimensions();
  const GAP = 12;
  const avail = Math.max(260, winW - 20);
  const minTile = 118;
  const maxTile = 168;
  const fitCols = Math.max(2, Math.floor((avail + GAP) / (minTile + GAP)));
  const gridFor = (count: number) => {
    const cols = Math.min(Math.max(1, count), fitCols);
    return Math.min(maxTile, Math.floor((avail - GAP * (cols - 1)) / Math.max(1, cols)));
  };

  const playable = catalogue.filter((a) => a.type !== 'game' || isImplementedGame(a));
  // Tracing splits into Letters / Numbers / Shapes (owner direction).
  const numericSort = (a: Activity, b: Activity) => a.id.localeCompare(b.id, undefined, { numeric: true });
  const tracingOf = (kind: 'letters' | 'numbers' | 'shapes') =>
    playable
      .filter((a) => a.type === 'tracing')
      .filter((a) =>
        kind === 'letters' ? /^trace-letter-/.test(a.id) : kind === 'numbers' ? /^trace-number-/.test(a.id) : !/^trace-(letter|number)-/.test(a.id),
      )
      .sort(numericSort);
  const recommendIn = (list: Activity[], limit = 24) =>
    recommendActivities(
      list,
      {
        ageBand: profile?.ageBand ?? '3-5',
        difficulty: profile?.difficulty ?? 2,
        favouriteCategories: profile?.favouriteCategories ?? [],
        enabledCategories: [...ACTIVITY_CATEGORIES],
        recentActivityIds: [],
      },
      limit,
    );
  // Age-appropriate toddler games, then split into the four Little Games groups.
  const toddlerRanked = recommendIn(playable.filter((a) => a.category === 'toddler'), 40);
  const templateOf = (a: Activity) => (a.type === 'game' ? a.template : '');
  const gameGroup = GAME_GROUPS.find((g) => g.key === category);
  // Colour splits into "Colour by Numbers" (colour-cbn-*) and "Colour Your Way".
  const colouring = playable.filter((a) => a.category === 'colouring');
  const ranked =
    category === 'tracing-letters'
      ? tracingOf('letters')
      : category === 'tracing-numbers'
        ? tracingOf('numbers')
        : category === 'tracing-shapes'
          ? tracingOf('shapes')
          : category === 'colour-cbn'
            ? colouring.filter((a) => /^colour-cbn-/.test(a.id))
            : category === 'colour-free'
              ? recommendIn(colouring.filter((a) => !/^colour-cbn-/.test(a.id)))
              : gameGroup
                ? toddlerRanked.filter((a) => gameGroup.has(templateOf(a)))
                : recommendIn(playable.filter((a) => a.category === category));

  // Per-game icons (owner direction): every game tile shows its own emoji.
  const GAME_EMOJI: Record<string, string> = {
    'pop-bubbles': '🫧', 'tap-target': '🐶', 'drag-sort': '🧺', 'match-pairs': '🃏',
    'memory-cards': '🃏', counting: '🔢', 'odd-one-out': '🔎', 'letter-match': '🔤',
    sequence: '➡️', 'stack-blocks': '🧱', 'shadow-match': '👥', 'reveal-wipe': '✨',
    'pattern-complete': '🔷', 'dot-to-dot': '🔢', 'feed-animal': '🍓', 'cut-along': '✂️', 'number-hop': '🐸',
  };
  const emojiFor = (a: Activity): string =>
    (a.type === 'game' ? GAME_EMOJI[a.template] : undefined) ??
    ({ drawing: '🖍️', colouring: '🎨', puzzles: '🧩', tracing: '✏️', toddler: '🐣', preschool: '🦘', logic: '💡' })[a.category];

  // Letter/number tracing tiles show just the big glyph pair as a text fallback
  // when the clay art is missing (owner direction).
  function glyphFor(id: string): string | undefined {
    const letter = /^trace-letter-(.)$/.exec(id);
    if (letter) return `${letter[1]!.toUpperCase()} ${letter[1]!}`;
    const num = /^trace-number-(\d+)$/.exec(id);
    return num ? num[1]! : undefined;
  }

  // The Tracing door shows a section chooser first (owner direction): cloud
  // section icons in soft bubbles.
  if (category === 'tracing') {
    const sections = [
      { key: 'tracing-letters' as const, label: 'Letters', icon: 'sec-letters' },
      { key: 'tracing-numbers' as const, label: 'Numbers', icon: 'sec-numbers' },
      { key: 'tracing-shapes' as const, label: 'Shapes', icon: 'sec-shapes' },
    ];
    // "My Name" traces the child's own name (from their profile), if it has letters.
    const nick = profile?.nickname ?? '';
    const nameActivity =
      nameStrokes(nick).length > 0
        ? (() => {
            const template = catalogue.find((a): a is Extract<Activity, { type: 'tracing' }> => a.type === 'tracing');
            return template ? { ...template, id: 'trace-name', title: `My name: ${nick}`, paths: nameStrokes(nick) } : null;
          })()
        : null;
    const chooserCount = sections.length + (nameActivity ? 1 : 0);
    const cellW = gridFor(chooserCount);
    return (
      <View style={styles.root}>
        <View style={styles.topBar}>
          <HoldToHomeButton theme={theme} onHome={() => navigate({ name: 'home' })} />
          <Text style={[styles.title, { color: theme.text }]}>What shall we trace?</Text>
        </View>
        <ScrollView contentContainerStyle={styles.grid}>
          {sections.map((sct, i) => (
            <BubbleTile
              key={sct.key}
              label={sct.label}
              showLabel
              bare={false}
              colour={theme.tileColours[(i + 2) % theme.tileColours.length]!}
              textColour={theme.text}
              artSource={sectionIcon(sct.icon)}
              index={i}
              cellW={cellW}
              onPress={() => navigate({ name: 'picker', category: sct.key })}
            />
          ))}
          {nameActivity && (
            <BubbleTile
              key="tracing-name"
              label="My Name"
              showLabel
              bare={false}
              colour={theme.tileColours[5 % theme.tileColours.length]!}
              textColour={theme.text}
              artSource={sectionIcon('sec-name')}
              index={sections.length}
              cellW={cellW}
              onPress={() => navigate({ name: 'activity', activity: nameActivity })}
            />
          )}
        </ScrollView>
      </View>
    );
  }

  // The toddler door ("Little Games") opens a chooser of the four game groups
  // (owner direction). Empty groups (fewest for the youngest band) are hidden.
  if (category === 'toddler') {
    const groups = GAME_GROUPS.filter((g) => toddlerRanked.some((a) => g.has(templateOf(a))));
    const cellW = gridFor(groups.length);
    return (
      <View style={styles.root}>
        <View style={styles.topBar}>
          <HoldToHomeButton theme={theme} onHome={() => navigate({ name: 'home' })} />
          <Text style={[styles.title, { color: theme.text }]}>Pick a game box!</Text>
        </View>
        <ScrollView contentContainerStyle={styles.grid}>
          {groups.map((g, i) => (
            <BubbleTile
              key={g.key}
              label={g.label}
              // Labelled art bakes the group name into the picture → hide the
              // text label and float it bare (no coloured bubble), like the demo.
              showLabel={theme.highContrast || !g.labelled}
              bare={!theme.highContrast && g.labelled}
              colour={theme.tileColours[i % theme.tileColours.length]!}
              textColour={theme.text}
              artSource={theme.highContrast ? undefined : sectionIcon(g.icon)}
              emoji={theme.highContrast ? ({ 'games-sort': '🧩', 'games-tap': '🔢', 'games-patterns': '🔁', 'games-hands': '✂️' }[g.key]) : undefined}
              index={i}
              cellW={cellW}
              onPress={() => navigate({ name: 'picker', category: g.key })}
            />
          ))}
        </ScrollView>
      </View>
    );
  }

  // The Colour door opens a two-door chooser (owner direction): Colour by
  // Numbers (number-locked owner pages) vs Colour Your Way (free flood-fill).
  if (category === 'colouring') {
    const doors = [
      { key: 'colour-cbn' as const, label: 'Colour by Numbers', icon: 'sec-colour-bynum', has: colouring.some((a) => /^colour-cbn-/.test(a.id)) },
      { key: 'colour-free' as const, label: 'Colour Your Way', icon: 'sec-colour-yourway', has: colouring.some((a) => !/^colour-cbn-/.test(a.id)) },
    ].filter((d) => d.has);
    const cellW = gridFor(doors.length);
    return (
      <View style={styles.root}>
        <View style={styles.topBar}>
          <HoldToHomeButton theme={theme} onHome={() => navigate({ name: 'home' })} />
          <Text style={[styles.title, { color: theme.text }]}>How shall we colour?</Text>
        </View>
        <ScrollView contentContainerStyle={styles.grid}>
          {doors.map((d, i) => (
            <BubbleTile
              key={d.key}
              label={d.label}
              showLabel
              bare={false}
              colour={theme.tileColours[(i + 1) % theme.tileColours.length]!}
              textColour={theme.text}
              artSource={sectionIcon(d.icon)}
              index={i}
              cellW={cellW}
              onPress={() => navigate({ name: 'picker', category: d.key })}
            />
          ))}
        </ScrollView>
      </View>
    );
  }

  const isTracingSection = /^tracing-/.test(category) && !littlest;
  const isGameGroup = gameGroup != null;
  const isColourSection = category === 'colour-cbn' || category === 'colour-free';
  const isGlyphList = category === 'tracing-letters' || category === 'tracing-numbers';
  const isShapeList = category === 'tracing-shapes';
  const cellW = gridFor(ranked.length);
  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <HoldToHomeButton theme={theme} onHome={() => navigate({ name: 'home' })} />
        {(isTracingSection || isGameGroup || isColourSection) && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => navigate({ name: 'picker', category: isGameGroup ? 'toddler' : isColourSection ? 'colouring' : 'tracing' })}
            style={[styles.backBtn, { backgroundColor: theme.surface }]}
          >
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
        )}
        <Text style={[styles.title, { color: theme.text }]}>Pick one!</Text>
      </View>
      <ScrollView contentContainerStyle={styles.grid}>
        {ranked.map((activity, i) => {
          // Tracing lists float the owner's clay art bare (no bubble): letters &
          // numbers drop the label (picture-obvious); shapes keep the name.
          const traceArt = activity.type === 'tracing' ? tracingArtFor(activity.id) : undefined;
          // "Make a shape" dot-to-dot games show their clay shape art in a bubble.
          const gameArt = activity.type === 'game' ? gameArtFor(activity.id) : undefined;
          // Owner-art games (cut/feed/hop) show their own picture, not an emoji.
          const gamePic = activity.type === 'game' ? gamePictureFor(activity) : undefined;
          // Photo puzzles show their own picture as the tile (not a generic 🧩).
          const puzzleArt = activity.type === 'jigsaw' ? (puzzleArtFor(activity.image) ?? undefined) : undefined;
          // Colour Your Way tiles show the COLOURED reference picture (the same
          // finished art used for the photo puzzles) — the B&W line-art was
          // unclear (owner); the line-art is still what you actually colour.
          // CBN tiles keep the numbered line-art thumbnail.
          const isLineArt = activity.type === 'colouring' && activity.mode === 'line-art';
          const isCbn = activity.type === 'colouring' && /^colour-cbn-/.test(activity.id);
          const colourTile = isLineArt && !isCbn ? (puzzleArtFor(COLOUR_TILE_ART[activity.id]) ?? undefined) : undefined;
          const sceneArt = isLineArt ? (sceneArtFor(activity.image) ?? undefined) : undefined;
          const art = traceArt ?? gameArt ?? gamePic ?? puzzleArt ?? colourTile ?? sceneArt;
          const bare = (isGlyphList || isShapeList) && traceArt != null;
          return (
            <BubbleTile
              key={activity.id}
              label={activity.title}
              showLabel={!isGlyphList && !isColourSection}
              bare={bare}
              colour={theme.tileColours[i % theme.tileColours.length]!}
              textColour={theme.text}
              artSource={art}
              emoji={art ? undefined : emojiFor(activity)}
              glyph={art ? undefined : glyphFor(activity.id)}
              index={i}
              cellW={cellW}
              onPress={() => navigate({ name: 'activity', activity })}
            />
          );
        })}
        {ranked.length === 0 && (
          <Text style={[styles.empty, { color: theme.text }]}>New activities are on their way! Try another door on the home screen. 🏠</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 4, elevation: 2 },
  backIcon: { fontSize: 24, fontWeight: '700' },
  topBar: { flexDirection: 'row', alignItems: 'center', padding: 8 },
  title: { fontSize: 24, fontWeight: '700', marginLeft: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-start', paddingHorizontal: 10, paddingVertical: 8, gap: 12 },
  empty: { fontSize: 18, padding: 24, textAlign: 'center' },
  bCell: { alignItems: 'center' },
  bPress: { alignItems: 'center', padding: 4 },
  bPressed: { transform: [{ scale: 0.93 }] },
  bubble: {
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#4A3B32',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
  },
  bareIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4A3B32',
    shadowOpacity: 0.2,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 5 },
  },
  bLabel: { fontSize: 15, fontWeight: '800', marginTop: 5, textAlign: 'center' },
  sparkLayer: { position: 'absolute', top: '30%', left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  spark: { position: 'absolute', fontSize: 18 },
});
