import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, StyleSheet, Text, View } from 'react-native';
import { Canvas, Circle, DashPathEffect, Group, Path, Skia } from '@shopify/react-native-skia';
import type { TracingActivity } from '@littlegrip/core';
import {
  defaultAccessibilitySettings,
  pickFeedback,
  TracingSession,
  tracingConfigFor,
  tracingGuideLines,
} from '@littlegrip/core';
import type { Theme } from '../../../ui/theme';
import { useAppStore } from '../../../state/appStore';
import { audioService } from '../../../services/audio';
import { CompletionBanner } from '../ActivityPlayerScreen';

const DESIGN = 1000; // activity design space (core engine coordinates)

interface DPoint {
  x: number;
  y: number;
}

/** Design-space bounding box of the glyph strokes + the ruled-line span,
 *  padded by half the drawn band so nothing is clipped. Mirrors the demo. */
function contentBounds(strokes: DPoint[][], guides: { top: number; base: number } | null, drawBand: number) {
  let minx = 1e9;
  let maxx = -1e9;
  let miny = 1e9;
  let maxy = -1e9;
  for (const s of strokes) {
    for (const p of s) {
      minx = Math.min(minx, p.x);
      maxx = Math.max(maxx, p.x);
      miny = Math.min(miny, p.y);
      maxy = Math.max(maxy, p.y);
    }
  }
  if (guides) {
    const half = drawBand / 2;
    miny = Math.min(miny, guides.top - half);
    maxy = Math.max(maxy, guides.base + half);
  }
  const pad = drawBand / 2 + 14;
  return { minx: minx - pad, maxx: maxx + pad, miny: miny - pad, maxy: maxy + pad };
}

/** Fit the ACTUAL content into the stage (letters fill the screen instead of
 *  shrinking to the middle of the 1000² box). Uniform scale keeps aspect. */
function computeFit(strokes: DPoint[][], guides: { top: number; base: number } | null, drawBand: number, w: number, h: number) {
  const padH = w < 380 ? 16 : 26;
  const padV = 18;
  const availW = Math.max(60, w - padH * 2);
  const availH = Math.max(60, h - padV * 2);
  const b = contentBounds(strokes, guides, drawBand);
  const cw = Math.max(1, b.maxx - b.minx);
  const ch = Math.max(1, b.maxy - b.miny);
  const scale = Math.min(availW / cw, availH / ch);
  const ox = padH + (availW - cw * scale) / 2 - b.minx * scale;
  const oy = padV + (availH - ch * scale) / 2 - b.miny * scale;
  return { scale, ox, oy };
}

/** Screen point + unit direction along a design polyline at arc-fraction `frac`. */
function sampleAt(pathD: DPoint[], frac: number, sc: number, ox: number, oy: number) {
  const segs: { ax: number; ay: number; dx: number; dy: number; len: number }[] = [];
  let total = 0;
  for (let i = 0; i < pathD.length - 1; i++) {
    const a = pathD[i]!;
    const b = pathD[i + 1]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    segs.push({ ax: a.x, ay: a.y, dx, dy, len });
    total += len;
  }
  if (segs.length === 0 || total === 0) {
    const p = pathD[0]!;
    return { x: p.x * sc + ox, y: p.y * sc + oy, dx: 1, dy: 0 };
  }
  const target = Math.max(0, Math.min(1, frac)) * total;
  let acc = 0;
  let seg = segs[0]!;
  let t = 0;
  for (const s of segs) {
    if (acc + s.len >= target) {
      seg = s;
      t = s.len ? (target - acc) / s.len : 0;
      break;
    }
    acc += s.len;
  }
  const dl = seg.len || 1;
  return { x: (seg.ax + seg.dx * t) * sc + ox, y: (seg.ay + seg.dy * t) * sc + oy, dx: seg.dx / dl, dy: seg.dy / dl };
}

/** A Skia path tracing a design polyline from its start up to arc-fraction
 *  `frac` (screen coords) — used to fill the glyph along its own centre line. */
function partialPath(pathD: DPoint[], frac: number, sc: number, ox: number, oy: number) {
  const path = Skia.Path.Make();
  if (pathD.length < 2 || frac <= 0) return path;
  const segs: { a: DPoint; b: DPoint; len: number }[] = [];
  let total = 0;
  for (let i = 0; i < pathD.length - 1; i++) {
    const a = pathD[i]!;
    const b = pathD[i + 1]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    segs.push({ a, b, len });
    total += len;
  }
  const target = Math.min(1, frac) * total;
  path.moveTo(pathD[0]!.x * sc + ox, pathD[0]!.y * sc + oy);
  let acc = 0;
  for (const s of segs) {
    if (acc + s.len <= target) {
      path.lineTo(s.b.x * sc + ox, s.b.y * sc + oy);
      acc += s.len;
    } else {
      const t = (target - acc) / s.len;
      path.lineTo((s.a.x + (s.b.x - s.a.x) * t) * sc + ox, (s.a.y + (s.b.y - s.a.y) * t) * sc + oy);
      break;
    }
  }
  return path;
}

const BURST_EMOJI = ['⭐', '✨', '🌟'];

/** A one-shot star burst over the finished glyph (matches the demo's celebrate). */
function StarBurst({ show }: { show: boolean }): React.JSX.Element | null {
  const anims = useRef(Array.from({ length: 10 }, () => new Animated.Value(0))).current;
  useEffect(() => {
    if (!show) return;
    Animated.stagger(
      30,
      anims.map((a) => {
        a.setValue(0);
        return Animated.timing(a, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true });
      }),
    ).start();
  }, [show, anims]);
  if (!show) return null;
  return (
    <View pointerEvents="none" style={styles.burstLayer}>
      {anims.map((a, k) => {
        const ang = (k / anims.length) * Math.PI * 2;
        const dist = 60 + (k % 3) * 26;
        const translateX = a.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(ang) * dist] });
        const translateY = a.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(ang) * dist] });
        const opacity = a.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] });
        const scale = a.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.4, 1.2, 0.6] });
        return (
          <Animated.Text key={k} style={[styles.burst, { opacity, transform: [{ translateX }, { translateY }, { scale }] }]}>
            {BURST_EMOJI[k % BURST_EMOJI.length]}
          </Animated.Text>
        );
      })}
    </View>
  );
}

/**
 * Tracing player (FR-005) — ported to match the approved demo overhaul: one
 * seamless grey band per stroke (no skeleton), ink that fills the glyph along
 * its own centre-line as it is traced, a single glowing leader dot + pulsing
 * start dot + arrow showing the way, ruled "notebook" lines with the glyph
 * sitting between them, and a star burst + chime on completion. Touch points
 * are mapped into the 0..1000 design space and fed to the core corridor engine.
 */
export function TracingPlayer(props: {
  activity: TracingActivity;
  theme: Theme;
  onComplete: (r: { attempts: number; hintCount: number; accuracyScore: number | null }) => void;
  onDone: () => void;
  onReplay?: () => void;
  /** If set, auto-advance to the next tracing item instead of a Home banner. */
  onAdvance?: (() => void) | undefined;
  /** True when this is the LAST item of a section — show a sticker + congrats. */
  sectionComplete?: boolean;
}): React.JSX.Element {
  const { profile } = useAppStore();
  const accessibility = profile?.accessibility ?? defaultAccessibilitySettings();
  const config = useMemo(
    () => tracingConfigFor(profile?.difficulty ?? 1, { accessibilityWiderCorridor: accessibility.widerTracingCorridor }),
    [profile, accessibility],
  );
  // The corridor width is the *tolerance*; the DRAWN band is slimmer (a neat
  // letter, not a fat blob). Band / ink / dots / ruled-inset derive from it.
  const drawBand = config.corridorWidth * 0.5;
  const accent = props.theme.accent;

  const strokes = props.activity.paths;
  const guides = tracingGuideLines(props.activity.id);

  const [size, setSize] = useState({ w: 1, h: 1 });
  const [strokeIndex, setStrokeIndex] = useState(0);
  const [lastPos, setLastPos] = useState(0);
  const [done, setDone] = useState(false);
  const [encouragement, setEncouragement] = useState<string | null>(null);
  const [phase, setPhase] = useState(0);

  // Mutable refs the pan handler reads, so the PanResponder is built once.
  const session = useRef(new TracingSession(strokes[0]!, config));
  const scores = useRef<number[]>([]);
  const lastRaw = useRef<{ x: number; y: number } | null>(null);
  const lastPosRef = useRef(0);
  const strokeIndexRef = useRef(0);
  const doneRef = useRef(false);
  const geom = useRef({ scale: 1, ox: 0, oy: 0 });

  const { scale, ox, oy } = useMemo(
    () => computeFit(strokes, guides, drawBand, size.w, size.h),
    [strokes, guides, drawBand, size.w, size.h],
  );
  geom.current = { scale, ox, oy };

  const toDesign = (x: number, y: number) => ({ x: (x - geom.current.ox) / geom.current.scale, y: (y - geom.current.oy) / geom.current.scale });

  // Full-stroke Skia paths (screen coords) — the seamless grey bands, and the
  // ink for already-finished strokes.
  const strokePaths = useMemo(() => {
    return strokes.map((poly) => {
      const path = Skia.Path.Make();
      path.moveTo(poly[0]!.x * scale + ox, poly[0]!.y * scale + oy);
      for (const p of poly.slice(1)) path.lineTo(p.x * scale + ox, p.y * scale + oy);
      return path;
    });
  }, [strokes, scale, ox, oy]);

  // Leader-dot animation (single glowing dot sweeping the current stroke).
  useEffect(() => {
    if (done) return;
    let raf = 0;
    let last = 0;
    const loop = (t: number) => {
      if (t - last > 33) {
        setPhase((t % 1600) / 1600);
        last = t;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [done]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !doneRef.current,
        onMoveShouldSetPanResponder: () => !doneRef.current,
        onPanResponderGrant: () => {
          lastRaw.current = null;
        },
        onPanResponderMove: (e) => {
          if (doneRef.current) return;
          const { locationX, locationY } = e.nativeEvent;
          let reachedEnd = false;
          let maxPos = lastPosRef.current;
          const add = (px: number, py: number) => {
            const res = session.current.addPoint(toDesign(px, py));
            if (res.completed) reachedEnd = true;
            // Only advance the fill CONTIGUOUSLY: accept a new position when it's
            // just ahead of where we are, never a far jump. This stops a touch
            // near the end (e.g. a closed shape's last corner) from filling the
            // whole glyph, and enforces "start on the dot" (a mid/end touch does
            // nothing until the child traces forward from the start).
            if (res.onPath && res.pathPosition > maxPos && res.pathPosition - maxPos < 0.15) maxPos = res.pathPosition;
          };
          const prev = lastRaw.current;
          if (prev) {
            const dx = locationX - prev.x;
            const dy = locationY - prev.y;
            const steps = Math.min(32, Math.max(1, Math.round(Math.hypot(dx, dy) / 5)));
            for (let s = 1; s <= steps; s++) add(prev.x + (dx * s) / steps, prev.y + (dy * s) / steps);
          } else {
            add(locationX, locationY);
          }
          lastRaw.current = { x: locationX, y: locationY };
          lastPosRef.current = maxPos;
          setLastPos(maxPos);
          if (reachedEnd) {
            const summary = session.current.endAttempt();
            scores.current.push(summary.accuracyScore);
            const nextIndex = strokeIndexRef.current + 1;
            if (nextIndex < strokes.length) {
              session.current = new TracingSession(strokes[nextIndex]!, config);
              strokeIndexRef.current = nextIndex;
              lastPosRef.current = 0;
              lastRaw.current = null;
              setStrokeIndex(nextIndex);
              setLastPos(0);
              setEncouragement(pickFeedback('completed') + ' Now the next one!');
            } else {
              doneRef.current = true;
              lastPosRef.current = 1;
              setDone(true);
              setLastPos(1);
              void audioService.playEffect('soft-chime');
              const avg = Math.round(scores.current.reduce((a, b) => a + b, 0) / Math.max(1, scores.current.length));
              props.onComplete({ attempts: summary.attemptNumber, hintCount: 0, accuracyScore: avg });
              if (props.onAdvance) setTimeout(props.onAdvance, 1400);
            }
          }
        },
        onPanResponderRelease: () => {
          lastRaw.current = null;
          if (doneRef.current) return;
          const summary = session.current.endAttempt();
          if (!summary.completed) {
            setEncouragement(pickFeedback(summary.showDemo ? 'hint' : summary.coverage > 0.4 ? 'almost' : 'try-again'));
          }
        },
      }),
    // Built once; all moving state is read/written through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Derived render values.
  const filledCount = done ? strokes.length : strokeIndex;
  const bandWidth = Math.max(6, drawBand * scale);
  const inkWidth = Math.max(4, drawBand * 0.62 * scale);
  const trackWidth = Math.max(3, drawBand * 0.28 * scale);
  const dotR = Math.max(6, drawBand * 0.4 * scale);
  const arrowH = Math.max(8, drawBand * 0.55 * scale);

  const cur = strokes[Math.min(strokeIndex, strokes.length - 1)]!;
  // Cap the visible fill just short of the end so the glyph never LOOKS fully
  // coloured until the stroke actually completes (owner: kids saw it coloured
  // but the next step wouldn't start). On completion the stroke snaps to full.
  const currentInk = !done ? partialPath(cur, Math.min(lastPos, 0.9), scale, ox, oy) : null;

  // Directional guide on the current stroke: dotted track + start arrow +
  // pulsing start dot + a single glowing leader dot sweeping in trace direction.
  const s0 = sampleAt(cur, 0, scale, ox, oy);
  const startAng = Math.atan2(s0.dy, s0.dx);
  const arrow = useMemo(() => {
    const p = Skia.Path.Make();
    const axp = s0.x + Math.cos(startAng) * arrowH * 1.7;
    const ayp = s0.y + Math.sin(startAng) * arrowH * 1.7;
    p.moveTo(axp + Math.cos(startAng) * arrowH, ayp + Math.sin(startAng) * arrowH);
    p.lineTo(axp + Math.cos(startAng + 2.4) * arrowH * 0.7, ayp + Math.sin(startAng + 2.4) * arrowH * 0.7);
    p.lineTo(axp + Math.cos(startAng - 2.4) * arrowH * 0.7, ayp + Math.sin(startAng - 2.4) * arrowH * 0.7);
    p.close();
    return p;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s0.x, s0.y, startAng, arrowH]);
  const startPulse = dotR + Math.sin(phase * Math.PI * 2) * dotR * 0.28;
  const leader = sampleAt(cur, phase, scale, ox, oy);

  // Ruled "notebook" lines, inset by half the band so the glyph sits BETWEEN
  // them; they span the full stage width.
  const ruled = useMemo(() => {
    if (!guides) return null;
    const half = drawBand / 2;
    const yAt = (dy: number) => dy * scale + oy;
    const x0 = 12;
    const x1 = Math.max(x0 + 1, size.w - 12);
    const solid = Skia.Path.Make();
    solid.moveTo(x0, yAt(guides.top - half));
    solid.lineTo(x1, yAt(guides.top - half));
    solid.moveTo(x0, yAt(guides.base + half));
    solid.lineTo(x1, yAt(guides.base + half));
    const dash = Skia.Path.Make();
    dash.moveTo(x0, yAt(guides.mid));
    dash.lineTo(x1, yAt(guides.mid));
    return { solid, dash };
  }, [guides, scale, oy, drawBand, size.w]);

  return (
    <View style={styles.root}>
      <View
        style={styles.canvasWrap}
        onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        {...pan.panHandlers}
      >
        <Canvas style={styles.canvas}>
          {ruled && (
            <Group>
              <Path path={ruled.solid} color="rgba(120, 150, 200, 0.5)" style="stroke" strokeWidth={2} />
              <Path path={ruled.dash} color="rgba(227, 154, 166, 0.7)" style="stroke" strokeWidth={2}>
                <DashPathEffect intervals={[10, 10]} />
              </Path>
            </Group>
          )}
          {/* Seamless flat grey band for the whole glyph (no outline/skeleton). */}
          {strokePaths.map((p, i) => (
            <Path key={`band-${i}`} path={p} color="#E7DED6" style="stroke" strokeWidth={bandWidth} strokeCap="round" strokeJoin="round" />
          ))}
          {/* Ink fills the glyph along its own centre-line: finished strokes full,
              the current stroke up to how far it's been traced. */}
          {strokePaths.map((p, i) =>
            i < filledCount ? (
              <Path key={`ink-${i}`} path={p} color={accent} style="stroke" strokeWidth={inkWidth} strokeCap="round" strokeJoin="round" opacity={0.95} />
            ) : null,
          )}
          {currentInk && (
            <Path path={currentInk} color={accent} style="stroke" strokeWidth={inkWidth} strokeCap="round" strokeJoin="round" opacity={0.95} />
          )}
          {/* Directional guide on the current stroke. */}
          {!done && strokePaths[strokeIndex] && (
            <>
              <Path path={strokePaths[strokeIndex]!} color="rgba(255,255,255,0.95)" style="stroke" strokeWidth={trackWidth} strokeCap="round">
                <DashPathEffect intervals={[1.5, Math.max(9, drawBand * 1.1 * scale)]} />
              </Path>
              <Path path={arrow} color={accent} style="fill" />
              <Circle cx={s0.x} cy={s0.y} r={startPulse} color={accent} />
              {/* Leader dot with a soft glow halo. */}
              <Circle cx={leader.x} cy={leader.y} r={dotR * 1.9} color={accent} opacity={0.18} />
              <Circle cx={leader.x} cy={leader.y} r={dotR} color={accent} />
            </>
          )}
        </Canvas>
        <StarBurst show={done} />
      </View>
      {encouragement && !done && (
        <Text accessibilityLiveRegion="polite" style={[styles.encouragement, { color: props.theme.text }]}>
          {encouragement}
        </Text>
      )}
      <CompletionBanner
        visible={done && !props.onAdvance}
        onDone={props.onDone}
        colour={props.theme.success}
        onReplay={props.onReplay}
        sticker={props.sectionComplete}
        title={props.sectionComplete ? 'You finished them all!' : undefined}
        seconds={props.sectionComplete ? 3 : 5}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  canvasWrap: { flex: 1, margin: 8, borderRadius: 16, overflow: 'hidden', backgroundColor: '#FFFFFF' },
  canvas: { flex: 1 },
  encouragement: { fontSize: 22, fontWeight: '700', textAlign: 'center', padding: 8 },
  burstLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  burst: { position: 'absolute', fontSize: 30 },
});
