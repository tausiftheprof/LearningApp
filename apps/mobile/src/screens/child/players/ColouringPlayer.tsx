import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import type { ColouringActivity } from '@littlehands/core';
import { PALETTES } from '@littlehands/core';
import type { Theme } from '../../../ui/theme';
import { CompletionBanner } from '../ActivityPlayerScreen';

const DESIGN = 1000;

/**
 * Colouring player (FR-006, docs/03 S12): tap-fill regions; colour-by-number
 * shows numeral chips (never colour-only cues - docs/10). Completion = every
 * region filled (by-number: correctly filled).
 */
export function ColouringPlayer(props: {
  activity: ColouringActivity;
  theme: Theme;
  onComplete: (r: { attempts: number; hintCount: number; accuracyScore: number | null }) => void;
  onDone: () => void;
}): React.JSX.Element {
  const { activity } = props;
  const [size, setSize] = useState({ w: 1, h: 1 });
  const [colour, setColour] = useState(PALETTES.standard[0]!);
  const [fills, setFills] = useState<Record<string, string>>({});
  const [attempts, setAttempts] = useState(1);
  const [done, setDone] = useState(false);

  const scale = Math.min(size.w, size.h) / DESIGN;
  const byNumber = activity.mode === 'by-number';
  // by-number: palette index n-1 is the expected colour for region number n.
  const expectedColour = (regionNumber: number | undefined): string | null =>
    regionNumber === undefined ? null : PALETTES.standard[(regionNumber - 1) % PALETTES.standard.length]!;

  const regionPaths = useMemo(
    () =>
      activity.regions.map((region) => {
        const path = Skia.Path.Make();
        const first = region.polygon[0]!;
        path.moveTo(first.x * scale, first.y * scale);
        for (const p of region.polygon.slice(1)) path.lineTo(p.x * scale, p.y * scale);
        path.close();
        return { region, path };
      }),
    [activity, scale],
  );

  function pointInPolygon(x: number, y: number, polygon: { x: number; y: number }[]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i]!.x, yi = polygon[i]!.y, xj = polygon[j]!.x, yj = polygon[j]!.y;
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }

  function tap(x: number, y: number): void {
    if (done) return;
    const dx = x / scale, dy = y / scale;
    const hit = activity.regions.find((r) => pointInPolygon(dx, dy, r.polygon));
    if (!hit) return;
    const expected = expectedColour(hit.number);
    if (byNumber && expected !== null && colour !== expected) {
      // Gentle: nothing negative happens; child can keep exploring colours.
      setAttempts((a) => a + 1);
      return;
    }
    const next = { ...fills, [hit.id]: colour };
    setFills(next);
    const allFilled = activity.regions.every((r) => {
      const filled = next[r.id];
      if (filled === undefined) return false;
      const exp = expectedColour(r.number);
      return !byNumber || exp === null || filled === exp;
    });
    if (allFilled) {
      setDone(true);
      const accuracy = Math.max(0, Math.round(100 - (attempts - 1) * 5));
      props.onComplete({ attempts, hintCount: 0, accuracyScore: byNumber ? accuracy : null });
    }
  }

  return (
    <View style={styles.root}>
      <Pressable
        style={styles.canvasWrap}
        onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        onPress={(e) => tap(e.nativeEvent.locationX, e.nativeEvent.locationY)}
        accessibilityLabel="Colouring picture. Tap an area to fill it with the selected colour."
      >
        <Canvas style={styles.canvas}>
          {regionPaths.map(({ region, path }) => (
            <Path key={region.id} path={path} color={fills[region.id] ?? '#FFFFFF'} style="fill" />
          ))}
          {regionPaths.map(({ region, path }) => (
            <Path key={`${region.id}-line`} path={path} color="#4A3B32" style="stroke" strokeWidth={3} />
          ))}
        </Canvas>
        {/* Numeral chips for by-number mode (visual, non-colour cue) */}
        {byNumber &&
          activity.regions.map((r) =>
            r.number !== undefined && fills[r.id] === undefined ? (
              <Text
                key={`chip-${r.id}`}
                style={[styles.chip, {
                  left: (r.polygon.reduce((s, p) => s + p.x, 0) / r.polygon.length) * scale - 14,
                  top: (r.polygon.reduce((s, p) => s + p.y, 0) / r.polygon.length) * scale - 14,
                }]}
              >
                {r.number}
              </Text>
            ) : null,
          )}
      </Pressable>

      <ScrollView horizontal style={styles.palette} contentContainerStyle={styles.paletteContent}>
        {PALETTES.standard.map((c, i) => (
          <Pressable
            key={c}
            accessibilityRole="button"
            accessibilityLabel={byNumber ? `Colour number ${i + 1}` : `Colour ${c}`}
            onPress={() => setColour(c)}
            style={[styles.swatch, { backgroundColor: c, borderWidth: colour === c ? 4 : 1 }]}
          >
            {byNumber && <Text style={styles.swatchNumber}>{i + 1}</Text>}
          </Pressable>
        ))}
      </ScrollView>

      <CompletionBanner visible={done} onDone={props.onDone} colour={props.theme.success} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  canvasWrap: { flex: 1, margin: 8, borderRadius: 16, overflow: 'hidden', backgroundColor: '#FFFFFF' },
  canvas: { flex: 1 },
  palette: { maxHeight: 76 },
  paletteContent: { alignItems: 'center', paddingHorizontal: 8 },
  swatch: { width: 56, height: 56, borderRadius: 28, margin: 6, borderColor: '#4A3B32', alignItems: 'center', justifyContent: 'center' },
  swatchNumber: { color: '#FFFFFF', fontWeight: '800', fontSize: 18, textShadowColor: '#000', textShadowRadius: 2 },
  chip: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4A3B32',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 28,
    fontWeight: '800',
    overflow: 'hidden',
  },
});
