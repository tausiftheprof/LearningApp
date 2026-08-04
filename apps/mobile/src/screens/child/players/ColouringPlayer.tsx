import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { GestureResponderEvent } from 'react-native';
import {
  AlphaType,
  Canvas,
  Circle,
  ColorType,
  Group,
  Image as SkiaImage,
  LinearGradient,
  Path,
  Skia,
  useCanvasRef,
  useImage,
  vec,
} from '@shopify/react-native-skia';
import type { SkImage } from '@shopify/react-native-skia';
import type { ColouringActivity } from '@littlegrip/core';
import { PALETTES } from '@littlegrip/core';
import { useAppStore } from '../../../state/appStore';
import { getRepositories } from '../../../storage/db';
import type { Theme } from '../../../ui/theme';
import { UI_ART } from '../../../ui/uiArt';
import { sceneArtFor } from '../../../ui/sceneArt';
import { audioService } from '../../../services/audio';
import { CompletionBanner } from '../ActivityPlayerScreen';

const DESIGN = 1000;
const RAINBOW = ['#E53935', '#FB8C00', '#FDD835', '#43A047', '#1E88E5', '#5E35B1', '#8E24AA'];

/** A selected "colour": a solid swatch, glitter, or the rainbow gradient. */
type Swatch = { kind: 'solid'; colour: string } | { kind: 'glitter' } | { kind: 'rainbow' };
type RegionStroke = { swatch: Swatch; width: number; points: { x: number; y: number }[] };

const GLITTER_BASE = '#F5C8DF';
const GLITTER_SPECKS = ['#FFFFFF', '#FFE082', '#F8BBD0', '#FFF59D'];

/** Dark or white ink for a number badge, by the badge colour's luminance. */
function badgeInk(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62 ? '#4A3B32' : '#FFFFFF';
}

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
  // Line-art scenes flood-fill a rasterised picture (owner art) bounded by its
  // ink lines - the free "Colour Your Way" scenes and the number-locked
  // Colour-by-Numbers pages. Region (polygon) colouring is a separate path.
  // Branching here (rather than an early return inside a sub-player) keeps every
  // hook call unconditional, as React requires.
  if (props.activity.mode === 'line-art') {
    return <LineArtColouringPlayer {...props} />;
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

/**
 * Line-art flood-fill colouring (owner scenes) — ported from the web demo's
 * `renderColouringLineArt`. The picture is rasterised once into an offscreen
 * Skia surface at RES², its ink read into a "wall" mask (dark pixels), and the
 * background keyed to transparent so the same buffer doubles as the crisp top
 * overlay. A tap flood-fills (BFS) the connected non-ink area into a paint
 * buffer; the buffer is rebuilt into an SkImage drawn UNDER the ink overlay.
 * Colour-by-Numbers pages are number-locked: only the current number's colour
 * is pickable, and a region is accepted only if one of that number's printed
 * targets falls inside the flooded area (targets sit on the printed digits,
 * which are ink and never flooded, so the check samples a neighbourhood).
 */
const RES = 720;
const CBN_TARGET_R = Math.round(RES * 0.045);

function LineArtColouringPlayer(props: {
  activity: ColouringActivity;
  theme: Theme;
  onComplete: (r: { attempts: number; hintCount: number; accuracyScore: number | null }) => void;
  onDone: () => void;
}): React.JSX.Element {
  const { activity } = props;
  const profile = useAppStore((st) => st.profile);
  const image = useImage(sceneArtFor(activity.image) ?? 0);
  const cbnPlan = activity.byNumberPlan && activity.byNumberPlan.length ? activity.byNumberPlan : null;

  const [size, setSize] = useState({ w: 1, h: 1 });
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);
  const [menuOpen, setMenuOpen] = useState(true);
  const [mode, setMode] = useState<'fill' | 'brush'>('fill');
  const [brushWidth, setBrushWidth] = useState(14);
  const [cbnStep, setCbnStep] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const [swatch, setSwatch] = useState<Swatch>(
    cbnPlan ? { kind: 'solid', colour: cbnPlan[0]!.colour } : { kind: 'solid', colour: PALETTES.standard[0]! },
  );
  const [paintImg, setPaintImg] = useState<SkImage | null>(null);
  const [lineImg, setLineImg] = useState<SkImage | null>(null);

  const canvasRef = useCanvasRef();
  const wall = useRef<Uint8Array | null>(null);
  const buf = useRef<Uint8Array | null>(null);
  const cbnFilled = useRef<boolean[][]>(cbnPlan ? cbnPlan.map((s) => s.targets.map(() => false)) : []);
  const cbnStepRef = useRef(0);
  const swatchRef = useRef(swatch);
  swatchRef.current = swatch;
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const builtFor = useRef<number | null>(null);
  const lastBrush = useRef<{ x: number; y: number } | null>(null);
  const lastBake = useRef(0);

  const IMG_INFO = { width: RES, height: RES, colorType: ColorType.RGBA_8888, alphaType: AlphaType.Unpremul };

  // Build the wall mask + crisp overlay once the raster decodes.
  useEffect(() => {
    if (!image) return;
    const key = sceneArtFor(activity.image) ?? 0;
    if (builtFor.current === key) return;
    builtFor.current = key;
    const surface = Skia.Surface.MakeOffscreen(RES, RES);
    if (!surface) return;
    const paint = Skia.Paint();
    surface.getCanvas().drawImageRect(
      image,
      Skia.XYWHRect(0, 0, image.width(), image.height()),
      Skia.XYWHRect(0, 0, RES, RES),
      paint,
    );
    const px = surface.makeImageSnapshot().readPixels(0, 0, IMG_INFO) as Uint8Array | null;
    if (!px) return;
    const w = new Uint8Array(RES * RES);
    const line = new Uint8Array(RES * RES * 4);
    for (let i = 0; i < RES * RES; i++) {
      const o = i * 4;
      const whiteness = (px[o]! + px[o + 1]! + px[o + 2]!) / 3;
      w[i] = whiteness < 170 ? 1 : 0;
      line[o] = px[o]!;
      line[o + 1] = px[o + 1]!;
      line[o + 2] = px[o + 2]!;
      line[o + 3] = Math.max(0, Math.min(255, Math.round((255 - whiteness) * 4)));
    }
    wall.current = w;
    buf.current = new Uint8Array(RES * RES * 4);
    setLineImg(Skia.Image.MakeImage(IMG_INFO, Skia.Data.fromBytes(line), RES * 4));
    setPaintImg(Skia.Image.MakeImage(IMG_INFO, Skia.Data.fromBytes(buf.current.slice()), RES * 4));
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image]);

  const side = Math.max(1, Math.min(size.w, size.h));
  const ox = (size.w - side) / 2;
  const oy = (size.h - side) / 2;
  const toRes = (x: number, y: number) => ({ x: ((x - ox) / side) * RES, y: ((y - oy) / side) * RES });

  const rebuildPaint = () => {
    if (!buf.current) return;
    // Pass a copy so later in-place fills don't mutate the SkImage's backing data.
    setPaintImg(Skia.Image.MakeImage(IMG_INFO, Skia.Data.fromBytes(buf.current.slice()), RES * 4));
  };

  const rgbOf = (hex: string): [number, number, number] => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
  const GLITTER_RGB = rgbOf(GLITTER_BASE);

  function paintRegion(pixels: number[], minX: number, maxX: number, minY: number, maxY: number): void {
    const b = buf.current;
    if (!b) return;
    const sw = swatchRef.current;
    let base: [number, number, number] = sw.kind === 'solid' ? rgbOf(sw.colour) : sw.kind === 'glitter' ? GLITTER_RGB : [244, 143, 177];
    for (let i = 0; i < pixels.length; i += 2) {
      const x = pixels[i]!;
      const y = pixels[i + 1]!;
      let [r, g, bl] = base;
      if (sw.kind === 'rainbow') {
        const t = maxX > minX ? (x - minX) / (maxX - minX) : 0;
        const t2 = maxY > minY ? (y - minY) / (maxY - minY) : 0;
        const tt = Math.max(0, Math.min(1, (t + t2) / 2));
        const seg = tt * (RAINBOW.length - 1);
        const i0 = Math.floor(seg);
        const frac = seg - i0;
        const c0 = rgbOf(RAINBOW[Math.min(i0, RAINBOW.length - 1)]!);
        const c1 = rgbOf(RAINBOW[Math.min(i0 + 1, RAINBOW.length - 1)]!);
        r = c0[0] + (c1[0] - c0[0]) * frac;
        g = c0[1] + (c1[1] - c0[1]) * frac;
        bl = c0[2] + (c1[2] - c0[2]) * frac;
      }
      const idx = (y * RES + x) * 4;
      b[idx] = r; b[idx + 1] = g; b[idx + 2] = bl; b[idx + 3] = 255;
    }
    if (sw.kind === 'glitter') {
      const specks = [[255, 255, 255], [255, 224, 130], [248, 187, 208], [255, 245, 157]];
      for (let i = 0; i < pixels.length; i += 2 * 23) {
        const x = pixels[i]!;
        const y = pixels[i + 1]!;
        const sp = specks[(i / 46) % specks.length]!;
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
          const pxx = x + dx, pyy = y + dy;
          if (pxx < 0 || pyy < 0 || pxx >= RES || pyy >= RES) continue;
          const idx = (pyy * RES + pxx) * 4;
          b[idx] = sp[0]!; b[idx + 1] = sp[1]!; b[idx + 2] = sp[2]!; b[idx + 3] = 255;
        }
      }
    }
    rebuildPaint();
  }

  function cbnAdvance(): void {
    if (!cbnPlan) return;
    if (!cbnFilled.current[cbnStepRef.current]!.every(Boolean)) return;
    const next = cbnStepRef.current + 1;
    cbnStepRef.current = next;
    setCbnStep(next);
    if (next >= cbnPlan.length) {
      setDone(true);
      setNote(null);
      void audioService.playEffect('soft-chime');
      props.onComplete({ attempts: 1, hintCount: 0, accuracyScore: 100 });
    } else {
      const sw: Swatch = { kind: 'solid', colour: cbnPlan[next]!.colour };
      swatchRef.current = sw;
      setSwatch(sw);
      setNote(`Now number ${cbnPlan[next]!.number}!`);
    }
  }

  function floodFill(sxIn: number, syIn: number): void {
    const wmask = wall.current;
    if (!ready || done || !wmask || !buf.current) return;
    let sx = Math.round(sxIn);
    let sy = Math.round(syIn);
    if (sx < 0 || sy < 0 || sx >= RES || sy >= RES) return;
    if (wmask[sy * RES + sx]) {
      // Tapped on ink / a printed digit — hop to the nearest open pixel.
      let found: { x: number; y: number } | null = null;
      for (let r = 3; r <= 33 && !found; r += 3) {
        for (let a = 0; a < 16 && !found; a++) {
          const x = sx + Math.round(Math.cos((a * Math.PI) / 8) * r);
          const y = sy + Math.round(Math.sin((a * Math.PI) / 8) * r);
          if (x < 0 || y < 0 || x >= RES || y >= RES) continue;
          if (!wmask[y * RES + x]) found = { x, y };
        }
      }
      if (!found) return;
      sx = found.x; sy = found.y;
    }
    const visited = new Uint8Array(RES * RES);
    const qx = new Int32Array(RES * RES);
    const qy = new Int32Array(RES * RES);
    let head = 0;
    let tail = 0;
    qx[tail] = sx; qy[tail] = sy; tail++;
    visited[sy * RES + sx] = 1;
    let minX = sx, maxX = sx, minY = sy, maxY = sy;
    const pts: number[] = [];
    while (head < tail) {
      const x = qx[head]!;
      const y = qy[head]!;
      head++;
      pts.push(x, y);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      const cand = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
      for (const c of cand) {
        const nx = c[0]!;
        const ny = c[1]!;
        if (nx < 0 || ny < 0 || nx >= RES || ny >= RES) continue;
        const idx = ny * RES + nx;
        if (visited[idx] || wmask[idx]) continue;
        visited[idx] = 1;
        qx[tail] = nx; qy[tail] = ny; tail++;
      }
    }
    if (cbnPlan) {
      const near = (t: { x: number; y: number }) => {
        const cx = Math.round(t.x * RES);
        const cy = Math.round(t.y * RES);
        for (let dy = -CBN_TARGET_R; dy <= CBN_TARGET_R; dy += 9) {
          for (let dx = -CBN_TARGET_R; dx <= CBN_TARGET_R; dx += 9) {
            const x = cx + dx;
            const y = cy + dy;
            if (x < 0 || y < 0 || x >= RES || y >= RES) continue;
            if (visited[y * RES + x]) return true;
          }
        }
        return false;
      };
      const hits: Array<[number, number]> = [];
      cbnPlan.forEach((step, si) => step.targets.forEach((t, ti) => { if (near(t)) hits.push([si, ti]); }));
      const current = hits.filter(([si]) => si === cbnStepRef.current);
      if (!current.length) {
        const other = hits.find(([si]) => si !== cbnStepRef.current);
        setNote(
          other
            ? `That one is number ${cbnPlan[other[0]]!.number} — find the ${cbnPlan[cbnStepRef.current]!.number}s first!`
            : `Find a space with a ${cbnPlan[cbnStepRef.current]!.number} in it!`,
        );
        return;
      }
      current.forEach(([si, ti]) => { cbnFilled.current[si]![ti] = true; });
      paintRegion(pts, minX, maxX, minY, maxY);
      cbnAdvance();
      return;
    }
    paintRegion(pts, minX, maxX, minY, maxY);
  }

  // Brush: stamp a disc into the paint buffer, skipping ink pixels (paint stays
  // inside the lines). Rebuild throttled during the drag, always on release.
  function brushStamp(rx: number, ry: number, force: boolean): void {
    const wmask = wall.current;
    const b = buf.current;
    if (!ready || done || !wmask || !b || cbnPlan) return;
    const sw = swatchRef.current;
    const col = sw.kind === 'solid' ? rgbOf(sw.colour) : sw.kind === 'glitter' ? GLITTER_RGB : rgbOf('#E53935');
    const rad = Math.max(2, Math.round((brushWidth * RES) / 1000 / 2));
    const prev = lastBrush.current ?? { x: rx, y: ry };
    const steps = Math.max(1, Math.round(Math.hypot(rx - prev.x, ry - prev.y) / rad));
    for (let s = 1; s <= steps; s++) {
      const cx = Math.round(prev.x + ((rx - prev.x) * s) / steps);
      const cy = Math.round(prev.y + ((ry - prev.y) * s) / steps);
      for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
        if (dx * dx + dy * dy > rad * rad) continue;
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || y < 0 || x >= RES || y >= RES) continue;
        const i = y * RES + x;
        if (wmask[i]) continue;
        const idx = i * 4;
        b[idx] = col[0]; b[idx + 1] = col[1]; b[idx + 2] = col[2]; b[idx + 3] = 255;
      }
    }
    lastBrush.current = { x: rx, y: ry };
    const now = Date.now();
    if (force || now - lastBake.current > 55) {
      lastBake.current = now;
      rebuildPaint();
    }
  }

  async function saveArtwork(): Promise<void> {
    const snap = canvasRef.current?.makeImageSnapshot();
    const b64 = snap?.encodeToBase64();
    if (b64 && profile) {
      const repos = await getRepositories();
      await repos.artwork.save({ id: 'art-' + Date.now(), profileId: profile.id, createdAt: Date.now(), ops: [], png: 'data:image/png;base64,' + b64 });
    }
    if (!done) {
      setDone(true);
      props.onComplete({ attempts: 1, hintCount: 0, accuracyScore: null });
    }
  }
  function resetAll(): void {
    if (buf.current) buf.current.fill(0);
    cbnFilled.current = cbnPlan ? cbnPlan.map((s) => s.targets.map(() => false)) : [];
    cbnStepRef.current = 0;
    setCbnStep(0);
    setDone(false);
    if (cbnPlan) { const sw: Swatch = { kind: 'solid', colour: cbnPlan[0]!.colour }; swatchRef.current = sw; setSwatch(sw); }
    rebuildPaint();
  }

  const brushTouch = mode === 'brush' && !cbnPlan
    ? {
        onStartShouldSetResponder: () => true,
        onMoveShouldSetResponder: () => true,
        onResponderGrant: (e: GestureResponderEvent) => { lastBrush.current = null; const p = toRes(e.nativeEvent.locationX, e.nativeEvent.locationY); brushStamp(p.x, p.y, true); },
        onResponderMove: (e: GestureResponderEvent) => { const p = toRes(e.nativeEvent.locationX, e.nativeEvent.locationY); brushStamp(p.x, p.y, false); },
        onResponderRelease: () => { rebuildPaint(); lastBrush.current = null; },
        onResponderTerminate: () => { rebuildPaint(); lastBrush.current = null; },
      }
    : {};

  const bgRect = useMemo(() => Skia.Path.Make().addRect(Skia.XYWHRect(0, 0, size.w, size.h)), [size.w, size.h]);

  return (
    <View style={styles.root}>
      <Pressable
        style={styles.canvasWrap}
        onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        onPress={mode === 'fill' || cbnPlan ? (e) => { const p = toRes(e.nativeEvent.locationX, e.nativeEvent.locationY); floodFill(p.x, p.y); } : undefined}
        accessibilityLabel="Colouring picture. Tap an area to fill it with colour."
        {...brushTouch}
      >
        <Canvas style={styles.canvas} ref={canvasRef}>
          <Path path={bgRect} color="#FFFFFF" style="fill" />
          {paintImg && <SkiaImage image={paintImg} x={ox} y={oy} width={side} height={side} fit="fill" />}
          {lineImg && <SkiaImage image={lineImg} x={ox} y={oy} width={side} height={side} fit="fill" />}
        </Canvas>

        {!ready && (
          <View style={styles.loadingWrap} pointerEvents="none">
            <Text style={styles.loadingText}>Getting your picture ready…</Text>
          </View>
        )}

        {note && !done && (
          <Text accessibilityLiveRegion="polite" style={styles.cbnNote} pointerEvents="none">{note}</Text>
        )}

        {/* Colour-coordinated number badges (owner direction): every numbered
            space shows a clear badge in that number's colour — including regions
            the printed art left blank. Retired numbers and filled regions drop
            their badge; the current number's badges are bold, later ones dimmed. */}
        {cbnPlan && ready && !done && (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {cbnPlan.map((step, si) =>
              si < cbnStep
                ? null
                : step.targets.map((t, ti) =>
                    cbnFilled.current[si]?.[ti] ? null : (
                      <View
                        key={`${si}-${ti}`}
                        style={[
                          styles.numBadge,
                          {
                            left: ox + t.x * side - 15,
                            top: oy + t.y * side - 15,
                            backgroundColor: step.colour,
                            borderColor: si === cbnStep ? '#4A3B32' : '#FFFFFF',
                            opacity: si === cbnStep ? 1 : 0.55,
                          },
                        ]}
                      >
                        <Text style={[styles.numBadgeText, { color: badgeInk(step.colour) }]}>{step.number}</Text>
                      </View>
                    ),
                  ),
            )}
          </View>
        )}

        {/* Palette: number-locked for CBN, collapsible for free scenes. */}
        {cbnPlan ? (
          <ScrollView style={styles.panel} contentContainerStyle={styles.panelContent}>
            {cbnPlan.map((step, i) =>
              i < cbnStep ? null : (
                <Pressable
                  key={step.number}
                  accessibilityRole="button"
                  accessibilityLabel={`Colour number ${step.number}${i === cbnStep ? '' : ' (locked)'}`}
                  onPress={() => { if (i !== cbnStep) setNote(`Finish all the number ${cbnPlan[cbnStep]!.number}s first!`); }}
                  style={[styles.swatch, { backgroundColor: step.colour, borderWidth: i === cbnStep ? 4 : 1, opacity: i === cbnStep ? 1 : 0.4 }]}
                >
                  <Text style={styles.swatchNumber}>{step.number}</Text>
                </Pressable>
              ),
            )}
          </ScrollView>
        ) : menuOpen ? (
          <ScrollView style={styles.panel} contentContainerStyle={styles.panelContent}>
            <ModeButton label="🪣" aria="Fill with a tap" active={mode === 'fill'} onPress={() => setMode('fill')} />
            <ModeButton label="🖌️" aria="Paint inside the lines" active={mode === 'brush'} onPress={() => setMode('brush')} />
            {mode === 'brush' && ([[7, '•'], [14, '●'], [26, '⬤']] as const).map(([w, icon]) => (
              <ModeButton key={w} label={icon} aria={`Brush width ${w}`} active={brushWidth === w} onPress={() => setBrushWidth(w)} />
            ))}
            <View style={styles.panelSep} />
            {PALETTES.standard.map((c) => (
              <Swatch key={c} colour={c} active={swatch.kind === 'solid' && swatch.colour === c} aria={`Colour ${c}`}
                onPress={() => { setSwatch({ kind: 'solid', colour: c }); setMenuOpen(false); }} />
            ))}
            {PALETTES.pastel.map((c) => (
              <Swatch key={c} colour={c} active={swatch.kind === 'solid' && swatch.colour === c} aria={`Pastel colour ${c}`}
                onPress={() => { setSwatch({ kind: 'solid', colour: c }); setMenuOpen(false); }} />
            ))}
            <Swatch colour={GLITTER_BASE} active={swatch.kind === 'glitter'} aria="Glitter"
              onPress={() => { setSwatch({ kind: 'glitter' }); setMenuOpen(false); }}>
              <Text style={styles.swatchIcon}>✨</Text>
            </Swatch>
            <Pressable accessibilityRole="button" accessibilityLabel="Rainbow"
              onPress={() => { setSwatch({ kind: 'rainbow' }); setMenuOpen(false); }}
              style={[styles.swatch, { borderWidth: swatch.kind === 'rainbow' ? 4 : 1, overflow: 'hidden', backgroundColor: '#FFF' }]}>
              <Canvas style={styles.rainbowSwatch}>
                <Path path={Skia.Path.Make().addRect(Skia.XYWHRect(0, 0, 44, 44))} style="fill">
                  <LinearGradient start={vec(0, 0)} end={vec(44, 44)} colors={RAINBOW} />
                </Path>
              </Canvas>
            </Pressable>
          </ScrollView>
        ) : (
          <Pressable accessibilityRole="button" accessibilityLabel="Open colours" onPress={() => setMenuOpen(true)}
            style={[styles.fab, { backgroundColor: swatch.kind === 'solid' ? swatch.colour : GLITTER_BASE }]}>
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

        <View style={styles.actions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Save my picture" onPress={() => void saveArtwork()} style={props.theme.highContrast ? styles.actionBtn : undefined}>
            {props.theme.highContrast ? <Text style={styles.actionIcon}>💾</Text> : <Image source={UI_ART.save} resizeMode="contain" style={{ width: 54, height: 54 }} />}
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
  loadingWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 18, color: '#8A80A5', fontWeight: '700' },
  cbnNote: {
    position: 'absolute', top: 10, alignSelf: 'center', backgroundColor: 'rgba(74,59,50,0.86)', color: '#FFFFFF',
    fontSize: 15, fontWeight: '700', paddingVertical: 6, paddingHorizontal: 16, borderRadius: 999, overflow: 'hidden',
    marginHorizontal: 16, textAlign: 'center',
  },
  numBadge: {
    position: 'absolute', width: 30, height: 30, borderRadius: 15, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#3B2D2D', shadowOpacity: 0.2, shadowRadius: 2, elevation: 2,
  },
  numBadgeText: { fontSize: 15, fontWeight: '800' },
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
