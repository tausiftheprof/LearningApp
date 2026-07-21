import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import {
  dayKeyFrom,
  canStartNewActivity,
  defaultAccessibilitySettings,
  homeTilesForAge,
} from '@littlegrip/core';
import type { HomeTile, HomeTarget } from '@littlegrip/core';
import { useAppStore } from '../../state/appStore';
import { childTheme } from '../../ui/theme';
import { BigTile } from '../../ui/components';
import { audioService } from '../../services/audio';

// Shared artwork in the repo-root assets/images/. Metro only resolves literal
// require paths, so every home tile image is required up-front by its key. The
// Candy home uses these floating art tiles (approved mockup); other themes and
// high-contrast fall back to the emoji BigTile.
const MASCOT_IMAGE = require('../../../../../assets/images/mascot.png');
const TILE_ART: Record<string, number> = {
  'tile-daily': require('../../../../../assets/images/tile-daily.png'),
  'tile-draw': require('../../../../../assets/images/tile-draw.png'),
  'tile-colour': require('../../../../../assets/images/tile-colour.png'),
  'tile-tracing': require('../../../../../assets/images/tile-tracing.png'),
  'tile-puzzles': require('../../../../../assets/images/tile-puzzles.png'),
  'tile-toddler': require('../../../../../assets/images/tile-toddler.png'),
  'tile-logic': require('../../../../../assets/images/tile-logic.png'),
};
// Category → tile-art key (mirrors the demo's CANDY_TILE_PHOTOS mapping).
const CATEGORY_ART: Record<string, string> = {
  drawing: 'tile-draw',
  colouring: 'tile-colour',
  puzzles: 'tile-puzzles',
  tracing: 'tile-tracing',
  toddler: 'tile-toddler',
  logic: 'tile-logic',
};

const SPARK_EMOJI = ['✨', '⭐', '🌟'];

/** A short outward burst of sparkles, retriggered whenever `trigger` changes. */
function Sparkles({ trigger }: { trigger: number }): React.JSX.Element | null {
  const anims = useRef(Array.from({ length: 5 }, () => new Animated.Value(0))).current;
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (trigger === 0) return;
    setShow(true);
    Animated.parallel(
      anims.map((a) => {
        a.setValue(0);
        return Animated.timing(a, {
          toValue: 1,
          duration: 650,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        });
      }),
    ).start(() => setShow(false));
  }, [trigger, anims]);
  if (!show) return null;
  return (
    <View pointerEvents="none" style={styles.sparkLayer}>
      {anims.map((a, k) => {
        const ang = (k / anims.length) * Math.PI * 2;
        const translateX = a.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(ang) * 46] });
        const translateY = a.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(ang) * 46] });
        const opacity = a.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] });
        const scale = a.interpolate({ inputRange: [0, 1], outputRange: [1, 0.4] });
        return (
          <Animated.Text
            key={k}
            style={[styles.spark, { opacity, transform: [{ translateX }, { translateY }, { scale }] }]}
          >
            {SPARK_EMOJI[k % SPARK_EMOJI.length]}
          </Animated.Text>
        );
      })}
    </View>
  );
}

/** Candy home door: floating art (no card), label underneath, idle bob + tap sparkle. */
function FloatingTile({
  artSource,
  label,
  index,
  textColour,
  cellW,
  artSize,
  onPress,
}: {
  artSource: number;
  label: string;
  index: number;
  textColour: string;
  cellW: number;
  artSize: number;
  onPress: () => void;
}): React.JSX.Element {
  const bob = useRef(new Animated.Value(0)).current;
  const [sparkKey, setSparkKey] = useState(0);
  useEffect(() => {
    // Stagger the idle bob so the doors don't pulse in lock-step.
    const dur = 1700 + (index % 4) * 200;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: dur, delay: index * 160, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: dur, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob, index]);
  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });
  return (
    <Animated.View style={[styles.tileCell, { width: cellW, transform: [{ translateY }] }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => {
          setSparkKey((k) => k + 1);
          onPress();
        }}
        style={({ pressed }) => [styles.homeTile, pressed && styles.homeTilePressed]}
      >
        <Image
          source={artSource}
          style={{ width: artSize, height: artSize }}
          resizeMode="contain"
          accessibilityElementsHidden
        />
        <Text style={[styles.tileLabel, { color: textColour }]}>{label}</Text>
        <Sparkles trigger={sparkKey} />
      </Pressable>
    </Animated.View>
  );
}

/**
 * Child Home — age-adaptive design (Direction C, July 2026): greeting card with
 * the teal mascot and an inline star pill next to the child's name, Rewards +
 * Grown-ups on the right, then the age-adaptive doors. On the Candy theme the
 * doors are floating art tiles (approved mockup); other themes / high-contrast
 * keep the emoji tiles.
 */
export function HomeScreen(): React.JSX.Element {
  const { profile, screenTime, navigate, rewards } = useAppStore();
  const accessibility = profile?.accessibility ?? defaultAccessibilitySettings();
  const theme = childTheme(accessibility, profile?.themeId);
  const app = theme.app;
  const hc = accessibility.highContrast;
  const candy = !hc && app.id === 'candy';

  const ageBand = profile?.ageBand ?? '3-5';
  const visibleTiles = homeTilesForAge(ageBand);
  const littlest = ageBand === '2-3';

  // Responsive tile sizing from the live viewport (phone → tablet → web, and
  // rotation), mirroring the demo's CSS auto-fit minmax grid: fit as many
  // columns of minTile..maxTile as the width allows, but never more than the
  // number of doors, and stretch each column up to maxTile.
  const { width: winW } = useWindowDimensions();
  const GAP = 12;
  const H_PAD = 20;
  const avail = Math.max(260, winW - H_PAD);
  const minTile = littlest ? 150 : 128;
  const maxTile = littlest ? 220 : 184;
  const fitCols = Math.max(1, Math.floor((avail + GAP) / (minTile + GAP)));
  const cols = Math.min(Math.max(1, visibleTiles.length), Math.max(2, fitCols));
  const cellW = Math.min(maxTile, Math.floor((avail - GAP * (cols - 1)) / cols));
  const artSize = Math.max(64, Math.round(cellW - 24));

  function open(target: HomeTarget, label: string): void {
    void audioService.playInstruction(`label/${label}`);
    if (!canStartNewActivity(screenTime, dayKeyFrom(new Date()))) {
      navigate({ name: 'times-up' });
      return;
    }
    if ('special' in target && target.special === 'daily') navigate({ name: 'daily-adventure' });
    else if ('category' in target) navigate({ name: 'picker', category: target.category });
  }

  function artFor(tile: HomeTile): number | undefined {
    if (!candy) return undefined;
    const isDaily = 'special' in tile.target && tile.target.special === 'daily';
    const key = isDaily ? 'tile-daily' : 'category' in tile.target ? CATEGORY_ART[tile.target.category] : undefined;
    return key ? TILE_ART[key] : undefined;
  }

  return (
    <View style={styles.root}>
      <View style={styles.topRow}>
        <View style={[styles.greetingCard, { backgroundColor: app.greeting.background, borderRadius: theme.radius }]}>
          <View style={styles.greetingText}>
            <View style={styles.hiRow}>
              <Text style={[styles.hello, { color: app.greeting.titleColor ?? theme.text }]}>
                Hi, {profile?.nickname ?? 'friend'}!
              </Text>
              <View style={[styles.starPill, { backgroundColor: app.starPill }]} accessibilityLabel={`${rewards.totalStars} stars earned`}>
                <Text style={[styles.starPillText, { color: theme.text }]}>⭐ {rewards.totalStars}</Text>
              </View>
            </View>
            <Text style={[styles.subtitle, { color: theme.text }]}>{app.greeting.subtitle}</Text>
          </View>
          {hc ? (
            <Text style={styles.mascot} accessibilityElementsHidden>
              {app.greeting.mascot}
            </Text>
          ) : (
            <Image source={MASCOT_IMAGE} style={styles.mascotImg} resizeMode="contain" accessibilityElementsHidden />
          )}
        </View>
        <View style={styles.topRight}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="My Rewards. Stickers, badges and stars!"
            onPress={() => navigate({ name: 'rewards' })}
            style={[styles.grownUpsButton, { backgroundColor: app.rewards.background }]}
          >
            <Text style={styles.grownUpsIcon}>{app.rewards.icon}</Text>
            <Text style={[styles.grownUpsText, { color: theme.text }]}>Rewards</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="For grown-ups: open parent settings"
            onPress={() => navigate({ name: 'gate' })}
            style={[styles.grownUpsButton, { backgroundColor: candy ? '#F7CFE4' : theme.surface }]}
          >
            <Text style={styles.grownUpsIcon}>🔒</Text>
            <Text style={[styles.grownUpsText, { color: theme.text }]}>Grown-ups</Text>
          </Pressable>
        </View>
      </View>
      <ScrollView contentContainerStyle={candy ? styles.gridCandy : styles.grid}>
        {visibleTiles.map((tile: HomeTile, i) => {
          const artSource = artFor(tile);
          if (candy && artSource != null) {
            return (
              <FloatingTile
                key={tile.label}
                artSource={artSource}
                label={tile.label}
                index={i}
                textColour={theme.text}
                cellW={cellW}
                artSize={artSize}
                onPress={() => open(tile.target, tile.label)}
              />
            );
          }
          return (
            <View key={tile.label} style={[styles.cell, littlest && styles.cellLittlest]}>
              <BigTile
                label={tile.label}
                emoji={tile.icon ?? app.tileIcons[tile.idx] ?? '⭐'}
                colour={theme.tileColours[i % theme.tileColours.length]!}
                theme={theme}
                onPress={() => open(tile.target, tile.label)}
              />
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topRow: { flexDirection: 'row', alignItems: 'stretch', padding: 12, gap: 10 },
  greetingCard: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 14 },
  greetingText: { flex: 1 },
  hiRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  hello: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: 14, opacity: 0.8, marginTop: 2 },
  starPill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, elevation: 1 },
  starPillText: { fontSize: 15, fontWeight: '800' },
  mascot: { fontSize: 40, marginLeft: 8 },
  mascotImg: { width: 62, height: 62, marginLeft: 8 },
  topRight: { alignItems: 'center', justifyContent: 'flex-start', gap: 8 },
  grownUpsButton: { alignItems: 'center', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, minWidth: 76 },
  grownUpsIcon: { fontSize: 18 },
  grownUpsText: { fontSize: 11, marginTop: 2 },
  // Non-candy / high-contrast: emoji BigTile grid.
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 8 },
  cell: { width: '50%', minHeight: 130 },
  cellLittlest: { minHeight: 168 },
  // Candy: floating art tiles, centre-packed. Cell/art sizes are computed from
  // the live viewport in HomeScreen (responsive) and applied inline; the image
  // is always given explicit numeric dimensions so it can never overflow.
  gridCandy: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-start', paddingHorizontal: 10, paddingBottom: 28, paddingTop: 4, gap: 12 },
  tileCell: { alignItems: 'center' },
  homeTile: { alignItems: 'center', padding: 6 },
  homeTilePressed: { transform: [{ scale: 0.94 }] },
  tileLabel: { fontSize: 16, fontWeight: '800', marginTop: 2, textAlign: 'center' },
  sparkLayer: { position: 'absolute', top: '30%', left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  spark: { position: 'absolute', fontSize: 20 },
});
