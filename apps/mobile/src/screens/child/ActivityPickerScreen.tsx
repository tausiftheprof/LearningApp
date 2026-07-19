import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import type { Activity, ActivityCategory, Point } from '@littlegrip/core';
import { defaultAccessibilitySettings, recommendActivities, ACTIVITY_CATEGORIES } from '@littlegrip/core';
import { useAppStore } from '../../state/appStore';
import { childTheme } from '../../ui/theme';
import { BigTile, HoldToHomeButton } from '../../ui/components';
import { IMPLEMENTED_GAME_TEMPLATES } from './games/registry';

/** A tiny outline of a shape-tracing activity, drawn from its own guide paths. */
function ShapeIcon({ paths, size, color }: { paths: Point[][]; size: number; color: string }): React.JSX.Element {
  const skPath = useMemo(() => {
    let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
    for (const s of paths) for (const p of s) { minx = Math.min(minx, p.x); miny = Math.min(miny, p.y); maxx = Math.max(maxx, p.x); maxy = Math.max(maxy, p.y); }
    const pad = 90, w = (maxx - minx || 1) + 2 * pad, h = (maxy - miny || 1) + 2 * pad;
    const sc = size / Math.max(w, h);
    const offx = (size - w * sc) / 2, offy = (size - h * sc) / 2;
    const map = (p: Point) => ({ x: offx + (p.x - (minx - pad)) * sc, y: offy + (p.y - (miny - pad)) * sc });
    const path = Skia.Path.Make();
    for (const s of paths) {
      const f = map(s[0]!); path.moveTo(f.x, f.y);
      for (const p of s.slice(1)) { const m = map(p); path.lineTo(m.x, m.y); }
    }
    return path;
  }, [paths, size]);
  return (
    <Canvas style={{ width: size, height: size }}>
      <Path path={skPath} color={color} style="stroke" strokeWidth={Math.max(3, size * 0.08)} strokeCap="round" strokeJoin="round" />
    </Canvas>
  );
}

/**
 * Activity picker (docs/03 S09). Only playable content is shown: game
 * templates not yet implemented in this scaffold are filtered out entirely -
 * children never see locked or broken teasers.
 */
type PickerCategory = ActivityCategory | 'tracing-letters' | 'tracing-numbers' | 'tracing-shapes';

export function ActivityPickerScreen(props: { category: PickerCategory }): React.JSX.Element {
  const { profile, catalogue, navigate } = useAppStore();
  const theme = childTheme(profile?.accessibility ?? defaultAccessibilitySettings(), profile?.themeId);

  const playable = catalogue.filter(
    (a) =>
      (a.type !== 'game' || IMPLEMENTED_GAME_TEMPLATES.includes(a.template)) &&
      // Line-art colouring scenes flood-fill a rasterised SVG - shipped in the
      // web demo only for now, since the native app has no SVG pipeline yet
      // (tracked as a follow-up; see ColouringPlayer.tsx for the same guard).
      !(a.type === 'colouring' && a.mode === 'line-art'),
  );
  // Tracing splits into Letters / Numbers / Shapes (owner direction).
  const numericSort = (a: Activity, b: Activity) => a.id.localeCompare(b.id, undefined, { numeric: true });
  const tracingOf = (kind: 'letters' | 'numbers' | 'shapes') =>
    playable
      .filter((a) => a.type === 'tracing')
      .filter((a) =>
        kind === 'letters' ? /^trace-letter-/.test(a.id)
        : kind === 'numbers' ? /^trace-number-/.test(a.id)
        : !/^trace-(letter|number)-/.test(a.id))
      .sort(numericSort);
  const ranked =
    props.category === 'tracing-letters' ? tracingOf('letters')
    : props.category === 'tracing-numbers' ? tracingOf('numbers')
    : props.category === 'tracing-shapes' ? tracingOf('shapes')
    : recommendActivities(
          playable.filter((a) => a.category === props.category),
          {
            ageBand: profile?.ageBand ?? '3-5',
            difficulty: profile?.difficulty ?? 2,
            favouriteCategories: profile?.favouriteCategories ?? [],
            enabledCategories: [...ACTIVITY_CATEGORIES],
            recentActivityIds: [],
          },
          24,
        );

  const emojiFor = (a: Activity): string =>
    ({ drawing: '🖍️', colouring: '🎨', puzzles: '🧩', tracing: '✏️', toddler: '🐣', preschool: '🦘', logic: '💡' })[a.category];

  // Letter/number tracing tiles show just the big glyph pair (owner direction).
  function glyphFor(id: string): string | undefined {
    const letter = /^trace-letter-(.)$/.exec(id);
    if (letter) return `${letter[1]!.toUpperCase()} ${letter[1]!}`;
    const num = /^trace-number-(\d+)$/.exec(id);
    return num ? num[1]! : undefined;
  }

  // The Tracing door shows a three-section chooser first (owner direction).
  if (props.category === 'tracing') {
    const sections = [
      { key: 'tracing-letters' as const, label: 'Letters', sub: 'A to Z, big and small', glyph: 'A a' },
      { key: 'tracing-numbers' as const, label: 'Numbers', sub: '0 to 10', glyph: '1 2 3' },
      { key: 'tracing-shapes' as const, label: 'Shapes', sub: 'Circles, squares and more', glyph: '○ △ □' },
    ];
    return (
      <View style={styles.root}>
        <View style={styles.topBar}>
          <HoldToHomeButton theme={theme} onHome={() => navigate({ name: 'home' })} />
          <Text style={[styles.title, { color: theme.text }]}>What shall we trace?</Text>
        </View>
        <ScrollView contentContainerStyle={styles.grid}>
          {sections.map((sct, i) => (
            <View key={sct.key} style={styles.cell}>
              <BigTile
                label={sct.label}
                subtitle={sct.sub}
                glyph={sct.glyph}
                emoji=""
                colour={theme.tileColours[(i + 2) % theme.tileColours.length]!}
                theme={theme}
                onPress={() => navigate({ name: 'picker', category: sct.key })}
              />
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  const isTracingSection = /^tracing-/.test(props.category);
  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <HoldToHomeButton theme={theme} onHome={() => navigate({ name: 'home' })} />
        {isTracingSection && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => navigate({ name: 'picker', category: 'tracing' })}
            style={[styles.backBtn, { backgroundColor: theme.surface }]}
          >
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
        )}
        <Text style={[styles.title, { color: theme.text }]}>Pick one!</Text>
      </View>
      <ScrollView contentContainerStyle={styles.grid}>
        {ranked.map((activity, i) => {
          // Shape-tracing tiles show a tiny outline of the shape, not the pencil.
          const shapePaths =
            activity.type === 'tracing' && !/^trace-(letter|number)-/.test(activity.id) ? activity.paths : null;
          return (
            <View key={activity.id} style={styles.cell}>
              <BigTile
                label={activity.title}
                emoji={emojiFor(activity)}
                glyph={glyphFor(activity.id) ?? ''}
                iconNode={shapePaths ? <ShapeIcon paths={shapePaths} size={46} color={theme.text} /> : undefined}
                colour={theme.tileColours[i % theme.tileColours.length]!}
                theme={theme}
                onPress={() => navigate({ name: 'activity', activity })}
              />
            </View>
          );
        })}
        {ranked.length === 0 && (
          <Text style={[styles.empty, { color: theme.text }]}>
            New activities are on their way! Try another door on the home screen. 🏠
          </Text>
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 8 },
  cell: { width: '50%', minHeight: 110 },
  empty: { fontSize: 18, padding: 24, textAlign: 'center' },
});
