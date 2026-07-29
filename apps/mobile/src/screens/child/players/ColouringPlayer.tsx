import React, { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { GestureResponderEvent } from 'react-native';
import { Canvas, Circle, Group, LinearGradient, Path, Skia, useCanvasRef, vec } from '@shopify/react-native-skia';
import type { ColouringActivity } from '@littlegrip/core';
import { PALETTES } from '@littlegrip/core';
import { useAppStore } from '../../../state/appStore';
import { getRepositories } from '../../../storage/db';
import type { Theme } from '../../../ui/theme';
import { UI_ART } from '../../../ui/uiArt';
import { CompletionBanner } from '../ActivityPlayerScreen';

const DESIGN = 1000;
const RAINBOW = ['#E53935', '#FB8C00', '#FDD835', '#43A047', '#1E88E5', '#5E35B1', '#8E24AA'];

/** A selected "colour": a solid swatch, glitter, or the rainbow gradient. */
type Swatch = { kind: 'solid'; colour: string } | { kind: 'glitter' } | { kind: 'rainbow' };
type RegionStroke = { swatch: Swatch; width: number; points: { x: number; y: number }[] };

const GLITTER_BASE = '#F5C8DF';
const GLITTER_SPECKS = ['#FFFFFF', '#FFE082', '#F8BBD0', '#FFF59D'];

/**
 * Colouring player (FR-006, docs/03 S12): tap-fill regions, or brush mode
 * where freehand paint clips inside the tapped region's lines (owner
 * direction, parity with the web demo). Colour-by-number shows numeral chips
 * (never colour-only cues - docs/10). Completion = every region coloured
 * (by-number: correctly filled).
 */
export function ColouringPlayer(props: {
  activity: ColouringActivity;
  theme: Theme;
  onComplete: (r: { attempts: number; hintCount: number; accuracyScore: number | null }) => void;
  onDone: () => void;
}): React.JSX.Element {
  // Line-art scenes (flood-fill over a rasterised SVG) ship in the web demo
  // only for now - the native app has no SVG pipeline yet. The picker already
  // filters these out (ActivityPickerScreen.tsx); this is a defensive guard.
  // Branching here (rather than an early return inside RegionColouringPlayer)
  // keeps every hook call unconditional, as React requires.
  if (props.activity.mode === 'line-art') {
    return (
      <View style={styles.unavailable}>
        <Text style={styles.unavailableText}>
          This picture is ready on the web demo - it's coming to the tablet app soon!
        </Text>
      </View>
    );
  }
  return <RegionColouringPlayer {...props} />;
}

function RegionColouringPlayer(props: {
  activity: ColouringActivity;
  theme: Theme;
  onComplete: (r: { attempts: number; hintCount: number; accuracyScore: number | null }) => void;
  onDone: () => void;
}): React.JSX.Element {
  const { activity } = props;
  const [size, setSize] = useState({ w: 1, h: 1 });
  const [swatch, setSwatch] = useState<Swatch>({ kind: 'solid', colour: PALETTES.standard[0]! });
  const [mode, setMode] = useState<'fill' | 'brush'>('fill');
  const [brushWidth, setBrushWidth] = useState(14);
  const [fills, setFills] = useState<Record<string, Swatch>>({});
  const [strokes, setStrokes] = useState<Record<string, RegionStroke[]>>({});
  const [attempts, setAttempts] = useState(1);
  const [done, setDone] = useState(false);
  const [liveRegion, setLiveRegion] = useState<string | 'background' | null>(null);
  // Owner-directed layout: the palette collapses to the picked option.
  const [menuOpen, setMenuOpen] = useState(true);
  const [bg, setBg] = useState<Swatch | null>(null);
  const [bgStrokes, setBgStrokes] = useState<RegionStroke[]>([]);
  const canvasRef = useCanvasRef();
  const profile = useAppStore((st) => st.profile);

  const scale = Math.min(size.w, size.h) / DESIGN;
  const byNumber = activity.mode === 'by-number';
  // by-number: palette index n-1 is the expected colour for region number n.
  const expectedColour = (regionNumber: number | undefined): string | null =>
    regionNumber === undefined ? null : PALETTES.standard[(regionNumber - 1) % PALETTES.standard.length]!;

  const regionPaths = useMemo(
    () =>
      activity.regions.map((region, index) => {
        const path = Skia.Path.Make();
        const first = region.polygon[0]!;
        path.moveTo(first.x * scale, first.y * scale);
        for (const p of region.polygon.slice(1)) path.lineTo(p.x * scale, p.y * scale);
        path.close();
        const xs = region.polygon.map((p) => p.x * scale);
        const ys = region.polygon.map((p) => p.y * scale);
        const box = { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
        // Deterministic glitter speckles inside the region (no Math.random -
        // renders identically every frame).
        const specks: { x: number; y: number; r: number }[] = [];
        for (let i = 0; i < 46; i++) {
          const rx = box.x0 + ((Math.sin((index + 1) * 61 + i * 37.7) + 1) / 2) * (box.x1 - box.x0);
          const ry = box.y0 + ((Math.cos((index + 1) * 43 + i * 53.3) + 1) / 2) * (box.y1 - box.y0);
          specks.push({ x: rx, y: ry, r: i % 5 === 0 ? 2.6 : 1.5 });
        }
        return { region, path, box, specks };
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

  function hitRegion(x: number, y: number) {
    const dx = x / scale, dy = y / scale;
    // Topmost (last-drawn) region wins, so layered shapes (window, eye, nose)
    // stay colourable inside the bigger shape behind them.
    return [...activity.regions].reverse().find((r) => pointInPolygon(dx, dy, r.polygon));
  }

  function checkComplete(nextFills: Record<string, Swatch>, nextStrokes: Record<string, RegionStroke[]>): void {
    const coloured = (id: string) => nextFills[id] !== undefined || (nextStrokes[id]?.length ?? 0) > 0;
    const all = activity.regions.every((r) => {
      if (!coloured(r.id)) return false;
      const exp = expectedColour(r.number);
      if (!byNumber || exp === null) return true;
      const f = nextFills[r.id];
      return f !== undefined && f.kind === 'solid' && f.colour === exp;
    });
    if (all && !done) {
      setDone(true);
      const accuracy = Math.max(0, Math.round(100 - (attempts - 1) * 5));
      props.onComplete({ attempts, hintCount: 0, accuracyScore: byNumber ? accuracy : null });
    }
  }

  function fillTap(x: number, y: number): void {
    if (done) return;
    const hit = hitRegion(x, y);
    if (!hit) {
      // Tap outside the picture colours the background (owner direction).
      setBg(swatch);
      return;
    }
    const expected = expectedColour(hit.number);
    if (byNumber && expected !== null && !(swatch.kind === 'solid' && swatch.colour === expected)) {
      // Gentle: nothing negative happens; child can keep exploring colours.
      setAttempts((a) => a + 1);
      return;
    }
    const next = { ...fills, [hit.id]: swatch };
    setFills(next);
    checkComplete(next, strokes);
  }

  function brushStart(e: GestureResponderEvent): void {
    if (done) return;
    const { locationX: x, locationY: y } = e.nativeEvent;
    const hit = hitRegion(x, y);
    const stroke: RegionStroke = { swatch, width: brushWidth, points: [{ x: x / scale, y: y / scale }] };
    if (!hit) {
      // Painting the background (behind the picture).
      setLiveRegion('background');
      setBgStrokes((list) => [...list, stroke]);
      return;
    }
    setLiveRegion(hit.id);
    setStrokes((s) => ({ ...s, [hit.id]: [...(s[hit.id] ?? []), stroke] }));
  }
  function brushMove(e: GestureResponderEvent): void {
    if (done || liveRegion === null) return;
    const { locationX: x, locationY: y } = e.nativeEvent;
    const pt = { x: x / scale, y: y / scale };
    if (liveRegion === 'background') {
      setBgStrokes((list) => {
        if (!list.length) return list;
        const updated = [...list];
        const last = updated[updated.length - 1]!;
        updated[updated.length - 1] = { ...last, points: [...last.points, pt] };
        return updated;
      });
      return;
    }
    setStrokes((s) => {
      const list = s[liveRegion];
      if (!list?.length) return s;
      const updated = [...list];
      const last = updated[updated.length - 1]!;
      updated[updated.length - 1] = { ...last, points: [...last.points, pt] };
      return { ...s, [liveRegion]: updated };
    });
  }
  function brushEnd(): void {
    if (liveRegion === null) return;
    setLiveRegion(null);
    checkComplete(fills, strokes);
  }

  const strokePath = (points: { x: number; y: number }[]) => {
    const p = Skia.Path.Make();
    if (points.length === 0) return p;
    p.moveTo(points[0]!.x * scale, points[0]!.y * scale);
    for (const pt of points.slice(1)) p.lineTo(pt.x * scale, pt.y * scale);
    return p;
  };

  async function saveArtwork(): Promise<void> {
    if (!profile) return;
    // Snapshot the whole page into the on-device artwork gallery.
    const snap = canvasRef.current?.makeImageSnapshot();
    const b64 = snap?.encodeToBase64();
    if (!b64) return;
    const repos = await getRepositories();
    await repos.artwork.save({
      id: 'art-' + Date.now(), profileId: profile.id, createdAt: Date.now(),
      ops: [], png: 'data:image/png;base64,' + b64,
    });
    if (!done) {
      setDone(true);
      props.onComplete({ attempts, hintCount: 0, accuracyScore: null });
    }
  }
  function resetAll(): void {
    setFills({}); setStrokes({}); setBg(null); setBgStrokes([]); setDone(false);
  }

  const brushTouchProps = mode === 'brush' && !byNumber
    ? {
        onStartShouldSetResponder: () => true,
        onMoveShouldSetResponder: () => true,
        onResponderGrant: brushStart,
        onResponderMove: brushMove,
        onResponderRelease: brushEnd,
        onResponderTerminate: brushEnd,
      }
    : {};

  return (
    <View style={styles.root}>
      <Pressable
        style={styles.canvasWrap}
        onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        onPress={mode === 'fill' || byNumber ? (e) => fillTap(e.nativeEvent.locationX, e.nativeEvent.locationY) : undefined}
        accessibilityLabel="Colouring picture. Tap an area to fill it, or paint inside the lines with the brush."
        {...brushTouchProps}
      >
        <Canvas style={styles.canvas} ref={canvasRef}>
          {/* Background layer (owner: the background is colourable too) */}
          <Path path={Skia.Path.Make().addRect(Skia.XYWHRect(0, 0, size.w, size.h))} color="#FFFFFF" style="fill" />
          {bg?.kind === 'solid' && (
            <Path path={Skia.Path.Make().addRect(Skia.XYWHRect(0, 0, size.w, size.h))} color={bg.colour} style="fill" />
          )}
          {bg?.kind === 'glitter' && (
            <Group>
              <Path path={Skia.Path.Make().addRect(Skia.XYWHRect(0, 0, size.w, size.h))} color={GLITTER_BASE} style="fill" />
              {Array.from({ length: 120 }, (_, i) => (
                <Circle
                  key={i}
                  cx={((Math.sin(97 * 61 + i * 37.7) + 1) / 2) * size.w}
                  cy={((Math.cos(97 * 43 + i * 53.3) + 1) / 2) * size.h}
                  r={i % 5 === 0 ? 2.6 : 1.5}
                  color={GLITTER_SPECKS[i % GLITTER_SPECKS.length]!}
                />
              ))}
            </Group>
          )}
          {bg?.kind === 'rainbow' && (
            <Path path={Skia.Path.Make().addRect(Skia.XYWHRect(0, 0, size.w, size.h))} style="fill">
              <LinearGradient start={vec(0, 0)} end={vec(size.w, size.h)} colors={RAINBOW} />
            </Path>
          )}
          {bgStrokes.map((st, si) => (
            <Path
              key={`bg-${si}`}
              path={strokePath(st.points)}
              style="stroke"
              strokeWidth={st.width * scale}
              strokeCap="round"
              strokeJoin="round"
              color={st.swatch.kind === 'solid' ? st.swatch.colour : GLITTER_BASE}
            >
              {st.swatch.kind === 'rainbow' && (
                <LinearGradient start={vec(0, 0)} end={vec(size.w, size.h)} colors={RAINBOW} />
              )}
            </Path>
          ))}
          {regionPaths.map(({ region, path, box, specks }) => {
            const f = fills[region.id];
            return (
              <Group key={region.id}>
                <Path path={path} color="#FFFFFF" style="fill" />
                {f?.kind === 'solid' && <Path path={path} color={f.colour} style="fill" />}
                {f?.kind === 'glitter' && (
                  <Group clip={path}>
                    <Path path={path} color={GLITTER_BASE} style="fill" />
                    {specks.map((sp, i) => (
                      <Circle key={i} cx={sp.x} cy={sp.y} r={sp.r} color={GLITTER_SPECKS[i % GLITTER_SPECKS.length]!} />
                    ))}
                  </Group>
                )}
                {f?.kind === 'rainbow' && (
                  <Path path={path} style="fill">
                    <LinearGradient start={vec(box.x0, box.y0)} end={vec(box.x1, box.y1)} colors={RAINBOW} />
                  </Path>
                )}
                {(strokes[region.id] ?? []).map((st, si) => (
                  // The snap: brush strokes clip to the region so paint cannot
                  // escape the lines.
                  <Group key={si} clip={path}>
                    <Path
                      path={strokePath(st.points)}
                      style="stroke"
                      strokeWidth={st.width * scale}
                      strokeCap="round"
                      strokeJoin="round"
                      color={st.swatch.kind === 'solid' ? st.swatch.colour : GLITTER_BASE}
                    >
                      {st.swatch.kind === 'rainbow' && (
                        <LinearGradient start={vec(box.x0, box.y0)} end={vec(box.x1, box.y1)} colors={RAINBOW} />
                      )}
                    </Path>
                    {st.swatch.kind === 'glitter' &&
                      st.points
                        .filter((_, i) => i % 3 === 0)
                        .map((pt, i) => (
                          <Circle
                            key={i}
                            cx={(pt.x + Math.sin(i * 7) * 9) * scale}
                            cy={(pt.y + Math.cos(i * 5) * 9) * scale}
                            r={1.7}
                            color="#FFF9E5"
                          />
                        ))}
                  </Group>
                ))}
              </Group>
            );
          })}
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

        {/* Right-aligned collapsible palette (owner direction): only the
            selected option shows once a pick is made. */}
        {menuOpen ? (
          <ScrollView style={styles.panel} contentContainerStyle={styles.panelContent}>
            {!byNumber && (
              <>
                <ModeButton label="🪣" aria="Fill with a tap" active={mode === 'fill'} onPress={() => setMode('fill')} />
                <ModeButton label="🖌️" aria="Paint inside the lines" active={mode === 'brush'} onPress={() => setMode('brush')} />
                {mode === 'brush' &&
                  ([[7, '•'], [14, '●'], [26, '⬤']] as const).map(([w, icon]) => (
                    <ModeButton key={w} label={icon} aria={`Brush width ${w}`} active={brushWidth === w} onPress={() => setBrushWidth(w)} />
                  ))}
                <View style={styles.panelSep} />
              </>
            )}
            {PALETTES.standard.map((c, i) => (
              <Swatch key={c} colour={c} active={swatch.kind === 'solid' && swatch.colour === c}
                aria={byNumber ? `Colour number ${i + 1}` : `Colour ${c}`}
                onPress={() => { setSwatch({ kind: 'solid', colour: c }); setMenuOpen(false); }}>
                {byNumber && <Text style={styles.swatchNumber}>{i + 1}</Text>}
              </Swatch>
            ))}
            {!byNumber &&
              PALETTES.pastel.map((c) => (
                <Swatch key={c} colour={c} active={swatch.kind === 'solid' && swatch.colour === c}
                  aria={`Pastel colour ${c}`} onPress={() => { setSwatch({ kind: 'solid', colour: c }); setMenuOpen(false); }} />
              ))}
            {!byNumber && (
              <Swatch colour={GLITTER_BASE} active={swatch.kind === 'glitter'} aria="Glitter"
                onPress={() => { setSwatch({ kind: 'glitter' }); setMenuOpen(false); }}>
                <Text style={styles.swatchIcon}>✨</Text>
              </Swatch>
            )}
            {!byNumber && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Rainbow"
                onPress={() => { setSwatch({ kind: 'rainbow' }); setMenuOpen(false); }}
                style={[styles.swatch, { borderWidth: swatch.kind === 'rainbow' ? 4 : 1, overflow: 'hidden', backgroundColor: '#FFF' }]}
              >
                <Canvas style={styles.rainbowSwatch}>
                  <Path path={Skia.Path.Make().addRect(Skia.XYWHRect(0, 0, 44, 44))} style="fill">
                    <LinearGradient start={vec(0, 0)} end={vec(44, 44)} colors={RAINBOW} />
                  </Path>
                </Canvas>
              </Pressable>
            )}
          </ScrollView>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open colours"
            onPress={() => setMenuOpen(true)}
            style={[styles.fab, { backgroundColor: swatch.kind === 'solid' ? swatch.colour : GLITTER_BASE }]}
          >
            {swatch.kind === 'glitter' && <Text style={styles.swatchIcon}>✨</Text>}
            {swatch.kind === 'rainbow' && (
              <Canvas style={styles.fabRainbow}>
                <Path path={Skia.Path.Make().addRect(Skia.XYWHRect(0, 0, 58, 58))} style="fill">
                  <LinearGradient start={vec(0, 0)} end={vec(58, 58)} colors={RAINBOW} />
                </Path>
              </Canvas>
            )}
          </Pressable>
        )}

        {/* Save + start-again, bottom-left (owner direction) */}
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Save my picture" onPress={() => void saveArtwork()} style={props.theme.highContrast ? styles.actionBtn : undefined}>
            {props.theme.highContrast ? (
              <Text style={styles.actionIcon}>💾</Text>
            ) : (
              <Image source={UI_ART.save} resizeMode="contain" style={{ width: 54, height: 54 }} />
            )}
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Start again" onPress={resetAll} style={styles.actionBtn}>
            <Text style={styles.actionIcon}>🗑️</Text>
          </Pressable>
        </View>
      </Pressable>

      <CompletionBanner visible={done} onDone={props.onDone} colour={props.theme.success} />
    </View>
  );
}

function ModeButton(props: { label: string; aria: string; active: boolean; onPress: () => void }): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.aria}
      onPress={props.onPress}
      style={[styles.modeButton, props.active && styles.modeButtonActive]}
    >
      <Text style={styles.modeLabel}>{props.label}</Text>
    </Pressable>
  );
}

function Swatch(props: {
  colour: string;
  active: boolean;
  aria: string;
  onPress: () => void;
  children?: React.ReactNode;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.aria}
      onPress={props.onPress}
      style={[styles.swatch, { backgroundColor: props.colour, borderWidth: props.active ? 4 : 1 }]}
    >
      {props.children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  unavailable: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  unavailableText: { fontSize: 18, textAlign: 'center', color: '#4A3B32' },
  canvasWrap: { flex: 1, margin: 8, borderRadius: 16, overflow: 'hidden', backgroundColor: '#FFFFFF' },
  canvas: { flex: 1 },
  panel: {
    position: 'absolute', top: 8, right: 8, bottom: 8, width: 66,
    backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: 20,
  },
  panelContent: { alignItems: 'center', paddingVertical: 8, gap: 4 },
  panelSep: { width: 40, height: 2, backgroundColor: 'rgba(74,59,50,0.15)', borderRadius: 1, marginVertical: 4 },
  fab: {
    position: 'absolute', top: 10, right: 10, width: 58, height: 58, borderRadius: 29,
    borderWidth: 3, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', elevation: 3,
  },
  fabRainbow: { width: 58, height: 58 },
  actions: { position: 'absolute', left: 10, bottom: 10, flexDirection: 'row', gap: 8 },
  actionBtn: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center', elevation: 2,
  },
  actionIcon: { fontSize: 22 },
  modeButton: {
    minWidth: 48, minHeight: 48, borderRadius: 14, margin: 2,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F1FA',
  },
  modeButtonActive: { backgroundColor: '#FFE0B2' },
  modeLabel: { fontSize: 22 },
  swatch: { width: 44, height: 44, borderRadius: 22, margin: 3, borderColor: '#4A3B32', alignItems: 'center', justifyContent: 'center' },
  swatchNumber: { color: '#FFFFFF', fontWeight: '800', fontSize: 18, textShadowColor: '#000', textShadowRadius: 2 },
  swatchIcon: { fontSize: 20 },
  rainbowSwatch: { width: 44, height: 44 },
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
