import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';
import { Canvas, Circle, Image as SkiaImage, Path, Skia, useImage } from '@shopify/react-native-skia';
import type { TracingActivity } from '@littlegrip/core';
import {
  defaultAccessibilitySettings,
  pickFeedback,
  TracingSession,
  tracingConfigFor,
} from '@littlegrip/core';
import type { Theme } from '../../../ui/theme';
import { useAppStore } from '../../../state/appStore';
import { CompletionBanner } from '../ActivityPlayerScreen';

const DESIGN = 1000; // activity design space (core engine coordinates)

/**
 * Unit direction of the guide path at arc-fraction `frac` (0..1). Scale is
 * uniform with no rotation, so a design-space direction is also the screen
 * direction — used to point the "go this way" arrow ahead of the mascot.
 */
function dirAt(pathD: { x: number; y: number }[], frac: number): { x: number; y: number } {
  let total = 0;
  const segs: { dx: number; dy: number; len: number }[] = [];
  for (let i = 0; i < pathD.length - 1; i++) {
    const dx = pathD[i + 1]!.x - pathD[i]!.x, dy = pathD[i + 1]!.y - pathD[i]!.y;
    const len = Math.hypot(dx, dy);
    segs.push({ dx, dy, len });
    total += len;
  }
  if (segs.length === 0 || total === 0) return { x: 1, y: 0 };
  const target = Math.max(0, Math.min(1, frac)) * total;
  let acc = 0, seg = segs[0]!;
  for (const s of segs) { if (acc + s.len >= target) { seg = s; break; } acc += s.len; }
  return seg.len === 0 ? { x: 1, y: 0 } : { x: seg.dx / seg.len, y: seg.dy / seg.len };
}

/** A friendly arrow just ahead of the mascot, pointing the way to trace. */
function arrowPathFor(anchor: { x: number; y: number }, dir: { x: number; y: number }, mSize: number) {
  const p = Skia.Path.Make();
  const ah = Math.max(15, mSize * 0.34);
  const bx = anchor.x + dir.x * (mSize * 0.5 + 6), by = anchor.y + dir.y * (mSize * 0.5 + 6);
  const ex = bx + dir.x * ah, ey = by + dir.y * ah;
  const ang = Math.atan2(dir.y, dir.x), wing = ah * 0.55;
  p.moveTo(bx, by); p.lineTo(ex, ey);
  p.moveTo(ex, ey); p.lineTo(ex - Math.cos(ang - 0.5) * wing, ey - Math.sin(ang - 0.5) * wing);
  p.moveTo(ex, ey); p.lineTo(ex - Math.cos(ang + 0.5) * wing, ey - Math.sin(ang + 0.5) * wing);
  return p;
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
  // Latest on-path arc position (0..1) — aims the direction arrow.
  const lastPos = useRef(0);

  const [size, setSize] = useState({ w: 1, h: 1 });
  const [childPoints, setChildPoints] = useState<{ x: number; y: number; onPath: boolean }[]>([]);
  const [done, setDone] = useState(false);
  const [encouragement, setEncouragement] = useState<string | null>(null);
  // The brand mascot leads the trace (shared artwork in assets/images/).
  const mascot = useImage(require('../../../../../../assets/images/mascot.png'));

  const side = Math.min(size.w, size.h);
  const scale = side / DESIGN;
  // Centre the square design space in the stage (letters were left-aligned).
  const ox = (size.w - side) / 2;
  const oy = (size.h - side) / 2;
  const toDesign = (x: number, y: number) => ({ x: (x - ox) / scale, y: (y - oy) / scale });
  const fromDesign = (p: { x: number; y: number }) => ({ x: p.x * scale + ox, y: p.y * scale + oy });

  const guidePath = useMemo(() => {
    const path = Skia.Path.Make();
    for (const polyline of props.activity.paths) {
      const first = fromDesign(polyline[0]!);
      path.moveTo(first.x, first.y);
      for (const p of polyline.slice(1)) {
        const s = fromDesign(p);
        path.lineTo(s.x, s.y);
      }
    }
    return path;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.activity, scale]);

  // Colour the corridor in behind the mascot: the child's on-path points are
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
  const mascotSize = Math.max(56, Math.min(108, config.corridorWidth * 2.2 * scale));
  const tip = childPoints.length ? childPoints[childPoints.length - 1]! : null;

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !done,
        onMoveShouldSetPanResponder: () => !done,
        onPanResponderMove: (e) => {
          const { locationX, locationY } = e.nativeEvent;
          const result = session.current.addPoint(toDesign(locationX, locationY));
          if (result.onPath) lastPos.current = result.pathPosition;
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
              lastPos.current = 0;
              setEncouragement(pickFeedback('completed') + ' Now the next one!');
            } else {
              setDone(true);
              const avg = Math.round(scores.current.reduce((a, b) => a + b, 0) / scores.current.length);
              props.onComplete({ attempts: summary.attemptNumber, hintCount: 0, accuracyScore: avg });
            }
          }
        },
        onPanResponderRelease: () => {
          if (done) return;
          const summary = session.current.endAttempt();
          if (!summary.completed) {
            setEncouragement(pickFeedback(summary.showDemo ? 'hint' : summary.coverage > 0.4 ? 'almost' : 'try-again'));
            setChildPoints([]);
            lastPos.current = 0;
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
          {/* Corridor guide */}
          <Path
            path={guidePath}
            color="#D7CCC8"
            style="stroke"
            strokeWidth={config.corridorWidth * 2 * scale}
            strokeCap="round"
            strokeJoin="round"
            opacity={0.5}
          />
          {/* Centre line */}
          <Path path={guidePath} color="#8D6E63" style="stroke" strokeWidth={4} strokeCap="round" />
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
          {/* The mascot IS the cursor: it waits at the start point, then rides
              the finger tip and leads the trace (no bare dot), with an arrow
              pointing the way to go. */}
          {!done && (() => {
            const anchor = tip ?? start;
            const halo = Math.max(11, mascotSize * 0.17);
            const dir = dirAt(props.activity.paths[Math.min(strokeIndex, props.activity.paths.length - 1)]!, lastPos.current);
            return (
              <React.Fragment>
                <Path
                  path={arrowPathFor(anchor, dir, mascotSize)}
                  color={props.theme.accent}
                  style="stroke"
                  strokeWidth={Math.max(4, mascotSize * 0.1)}
                  strokeCap="round"
                  strokeJoin="round"
                  opacity={0.9}
                />
                <Circle cx={anchor.x} cy={anchor.y} r={halo} color={props.theme.accent} opacity={0.3} />
                {mascot ? (
                  <SkiaImage
                    image={mascot}
                    x={anchor.x - mascotSize / 2}
                    y={anchor.y - mascotSize / 2}
                    width={mascotSize}
                    height={mascotSize}
                    fit="contain"
                  />
                ) : (
                  <Circle cx={anchor.x} cy={anchor.y} r={13} color={props.theme.accent} />
                )}
              </React.Fragment>
            );
          })()}
        </Canvas>
      </View>
      {encouragement && !done && (
        <Text accessibilityLiveRegion="polite" style={[styles.encouragement, { color: props.theme.text }]}>
          {encouragement}
        </Text>
      )}
      <CompletionBanner visible={done} onDone={props.onDone} colour={props.theme.success} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  canvasWrap: { flex: 1, margin: 8, borderRadius: 16, overflow: 'hidden', backgroundColor: '#FFFFFF' },
  canvas: { flex: 1 },
  encouragement: { fontSize: 22, fontWeight: '700', textAlign: 'center', padding: 8 },
});
