import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';
import { Canvas, Circle, DashPathEffect, Path, Skia } from '@shopify/react-native-skia';
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
import { CompletionBanner } from '../ActivityPlayerScreen';

const DESIGN = 1000; // activity design space (core engine coordinates)

interface DesignPoint { x: number; y: number }

/**
 * Point (screen) + unit direction along a guide path at arc-fraction `frac`.
 * Scale is uniform with no rotation, so a design-space direction is also the
 * screen direction. `sc`/`ox`/`oy` map design space into the stage.
 */
function sampleAt(pathD: DesignPoint[], frac: number, sc: number, ox: number, oy: number) {
  let total = 0;
  const segs: { ax: number; ay: number; dx: number; dy: number; len: number }[] = [];
  for (let i = 0; i < pathD.length - 1; i++) {
    const a = pathD[i]!, b = pathD[i + 1]!;
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
    segs.push({ ax: a.x, ay: a.y, dx, dy, len });
    total += len;
  }
  if (segs.length === 0 || total === 0) {
    const p = pathD[0]!;
    return { x: p.x * sc + ox, y: p.y * sc + oy, dx: 1, dy: 0 };
  }
  const target = Math.max(0, Math.min(1, frac)) * total;
  let acc = 0, seg = segs[0]!, t = 0;
  for (const s of segs) { if (acc + s.len >= target) { seg = s; t = s.len ? (target - acc) / s.len : 0; break; } acc += s.len; }
  const dl = seg.len || 1;
  return { x: (seg.ax + seg.dx * t) * sc + ox, y: (seg.ay + seg.dy * t) * sc + oy, dx: seg.dx / dl, dy: seg.dy / dl };
}

/**
 * Chevron arrows spaced along the strokes still to trace (from `startIndex`),
 * showing the way to trace a letter/number/shape — more for longer strokes.
 */
function arrowsPathFor(paths: DesignPoint[][], startIndex: number, sc: number, ox: number, oy: number, corridorWidth: number) {
  const path = Skia.Path.Make();
  const w = Math.max(9, corridorWidth * 0.6 * sc);
  for (let i = startIndex; i < paths.length; i++) {
    const pathD = paths[i]!;
    let total = 0;
    for (let j = 0; j < pathD.length - 1; j++) total += Math.hypot(pathD[j + 1]!.x - pathD[j]!.x, pathD[j + 1]!.y - pathD[j]!.y);
    const count = Math.max(2, Math.min(7, Math.round(total / 180)));
    for (let k = 0; k < count; k++) {
      const s = sampleAt(pathD, (k + 0.5) / count, sc, ox, oy);
      const a = Math.atan2(s.dy, s.dx);
      const tx = s.x + Math.cos(a) * w * 0.5, ty = s.y + Math.sin(a) * w * 0.5;
      path.moveTo(tx - Math.cos(a - 0.6) * w, ty - Math.sin(a - 0.6) * w);
      path.lineTo(tx, ty);
      path.lineTo(tx - Math.cos(a + 0.6) * w, ty - Math.sin(a + 0.6) * w);
    }
  }
  return path;
}

/**
 * Tracing player (FR-005, docs/03 S11). Touch points are mapped into the
 * 0..1000 design space and fed to the core corridor engine. On-path movement
 * sparkles; off-path movement gently fades - never a red cross (PRD section 9).
 */
export function TracingPlayer(props: {
  activity: TracingActivity;
  theme: Theme;
  onComplete: (r: { attempts: number; hintCount: number; accuracyScore: number | null }) => void;
  onDone: () => void;
  /** If set, auto-advance to the next tracing item instead of a Home banner. */
  onAdvance?: (() => void) | undefined;
}): React.JSX.Element {
  const { profile } = useAppStore();
  const accessibility = profile?.accessibility ?? defaultAccessibilitySettings();
  const config = useMemo(
    () =>
      tracingConfigFor(profile?.difficulty ?? 1, {
        accessibilityWiderCorridor: accessibility.widerTracingCorridor,
      }),
    [profile, accessibility],
  );
  // Multi-stroke sequencing: letters trace the capital's strokes then the
  // small letter's (side by side), matching the web demo's behaviour.
  const [strokeIndex, setStrokeIndex] = useState(0);
  const session = useRef(new TracingSession(props.activity.paths[0]!, config));
  const scores = useRef<number[]>([]);

  const [size, setSize] = useState({ w: 1, h: 1 });
  const [childPoints, setChildPoints] = useState<{ x: number; y: number; onPath: boolean }[]>([]);
  const [done, setDone] = useState(false);
  const [encouragement, setEncouragement] = useState<string | null>(null);

  const side = Math.min(size.w, size.h);
  const scale = side / DESIGN;
  // Centre the square design space in the stage (letters were left-aligned).
  const ox = (size.w - side) / 2;
  const oy = (size.h - side) / 2;
  const toDesign = (x: number, y: number) => ({ x: (x - ox) / scale, y: (y - oy) / scale });
  const fromDesign = (p: { x: number; y: number }) => ({ x: p.x * scale + ox, y: p.y * scale + oy });

  // One Skia path per stroke, so each can be styled by step (done / current /
  // upcoming) — the current step is highlighted and later steps stay greyed.
  const strokePaths = useMemo(() => {
    return props.activity.paths.map((polyline) => {
      const path = Skia.Path.Make();
      const first = fromDesign(polyline[0]!);
      path.moveTo(first.x, first.y);
      for (const p of polyline.slice(1)) { const s = fromDesign(p); path.lineTo(s.x, s.y); }
      return path;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.activity, scale, ox, oy]);

  // Colour the corridor in behind the dot: the child's on-path points are
  // stroked as one thick rounded trail in the theme accent, broken wherever the
  // finger strayed off-path, so the glyph visibly fills as it is traced.
  const fillPath = useMemo(() => {
    const path = Skia.Path.Make();
    let started = false;
    for (const p of childPoints) {
      if (!p.onPath) { started = false; continue; }
      if (!started) { path.moveTo(p.x, p.y); started = true; }
      else path.lineTo(p.x, p.y);
    }
    return path;
  }, [childPoints]);
  const fillWidth = Math.max(6, config.corridorWidth * 1.5 * scale);
  const tip = childPoints.length ? childPoints[childPoints.length - 1]! : null;
  // Direction arrows on the current stroke only (the highlighted step).
  const currentStroke = props.activity.paths[Math.min(strokeIndex, props.activity.paths.length - 1)]!;
  const arrowsPath = arrowsPathFor([currentStroke], 0, scale, ox, oy, config.corridorWidth);

  // Ruled "notebook" lines behind letters/numbers/name (top + dashed mid + base).
  const guides = tracingGuideLines(props.activity.id);
  const ruled = useMemo(() => {
    if (!guides) return null;
    const yAt = (dy: number) => dy * scale + oy;
    const x0 = ox + 40 * scale, x1 = ox + (1000 - 40) * scale;
    const solid = Skia.Path.Make();
    for (const k of ['top', 'base'] as const) { solid.moveTo(x0, yAt(guides[k])); solid.lineTo(x1, yAt(guides[k])); }
    const dash = Skia.Path.Make();
    dash.moveTo(x0, yAt(guides.mid)); dash.lineTo(x1, yAt(guides.mid));
    return { solid, dash };
  }, [guides, scale, ox, oy]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !done,
        onMoveShouldSetPanResponder: () => !done,
        onPanResponderMove: (e) => {
          const { locationX, locationY } = e.nativeEvent;
          const result = session.current.addPoint(toDesign(locationX, locationY));
          setChildPoints((prev) => [...prev.slice(-400), { x: locationX, y: locationY, onPath: result.onPath }]);
          if (result.completed && !done) {
            const summary = session.current.endAttempt();
            scores.current.push(summary.accuracyScore);
            const nextIndex = strokeIndex + 1;
            if (nextIndex < props.activity.paths.length) {
              // Next stroke of the same glyph (e.g. capital done, small next).
              session.current = new TracingSession(props.activity.paths[nextIndex]!, config);
              setStrokeIndex(nextIndex);
              setChildPoints([]);
              setEncouragement(pickFeedback('completed') + ' Now the next one!');
            } else {
              setDone(true);
              const avg = Math.round(scores.current.reduce((a, b) => a + b, 0) / scores.current.length);
              props.onComplete({ attempts: summary.attemptNumber, hintCount: 0, accuracyScore: avg });
              // Flow straight into the next item in the section (no Home prompt).
              if (props.onAdvance) setTimeout(props.onAdvance, 1300);
            }
          }
        },
        onPanResponderRelease: () => {
          if (done) return;
          const summary = session.current.endAttempt();
          if (!summary.completed) {
            setEncouragement(pickFeedback(summary.showDemo ? 'hint' : summary.coverage > 0.4 ? 'almost' : 'try-again'));
            setChildPoints([]);
          }
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [done, scale, strokeIndex],
  );

  const start = fromDesign(props.activity.paths[Math.min(strokeIndex, props.activity.paths.length - 1)]![0]!);

  return (
    <View style={styles.root}>
      <View
        style={styles.canvasWrap}
        onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        {...pan.panHandlers}
      >
        <Canvas style={styles.canvas}>
          {/* Ruled "notebook" lines so the child writes between the lines. */}
          {ruled && (
            <>
              <Path path={ruled.solid} color="rgba(120, 150, 200, 0.45)" style="stroke" strokeWidth={2} />
              <Path path={ruled.dash} color="rgba(120, 150, 200, 0.4)" style="stroke" strokeWidth={2}>
                <DashPathEffect intervals={[10, 10]} />
              </Path>
            </>
          )}
          {/* Corridor halo behind the CURRENT stroke only (the highlighted step). */}
          {!done && strokePaths[strokeIndex] && (
            <Path
              path={strokePaths[strokeIndex]!}
              color="#D7CCC8"
              style="stroke"
              strokeWidth={config.corridorWidth * 2 * scale}
              strokeCap="round"
              strokeJoin="round"
              opacity={0.5}
            />
          )}
          {/* Per-stroke centre line: done strokes glow accent, the current step
              is bold brown, upcoming steps stay greyed until their turn. */}
          {strokePaths.map((p, i) => {
            const finished = done || i < strokeIndex;
            const current = !done && i === strokeIndex;
            return (
              <Path
                key={i}
                path={p}
                color={finished ? props.theme.accent : current ? '#8D6E63' : '#D7CCC8'}
                style="stroke"
                strokeWidth={finished ? 6 : current ? 4 : 3}
                strokeCap="round"
                strokeJoin="round"
              />
            );
          })}
          {/* Direction arrows along the current stroke (covered by the fill as
              the child passes each one) */}
          {!done && (
            <Path
              path={arrowsPath}
              color={props.theme.accent}
              style="stroke"
              strokeWidth={Math.max(3, config.corridorWidth * 0.6 * scale * 0.34)}
              strokeCap="round"
              strokeJoin="round"
              opacity={0.9}
            />
          )}
          {/* Traced fill: the corridor colours in with the theme accent */}
          <Path
            path={fillPath}
            color={props.theme.accent}
            style="stroke"
            strokeWidth={fillWidth}
            strokeCap="round"
            strokeJoin="round"
            opacity={0.85}
          />
          {/* Faint off-path breadcrumbs (gentle, never a red "wrong" mark) */}
          {childPoints.map((p, i) => (p.onPath ? null : <Circle key={i} cx={p.x} cy={p.y} r={5} color="#BDBDBD" opacity={0.4} />))}
          {/* The guide dot: it marks the start point, then follows the finger tip */}
          {!done && <Circle cx={(tip ?? start).x} cy={(tip ?? start).y} r={16} color={props.theme.accent} />}
        </Canvas>
      </View>
      {encouragement && !done && (
        <Text accessibilityLiveRegion="polite" style={[styles.encouragement, { color: props.theme.text }]}>
          {encouragement}
        </Text>
      )}
      <CompletionBanner visible={done && !props.onAdvance} onDone={props.onDone} colour={props.theme.success} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  canvasWrap: { flex: 1, margin: 8, borderRadius: 16, overflow: 'hidden', backgroundColor: '#FFFFFF' },
  canvas: { flex: 1 },
  encouragement: { fontSize: 22, fontWeight: '700', textAlign: 'center', padding: 8 },
});
