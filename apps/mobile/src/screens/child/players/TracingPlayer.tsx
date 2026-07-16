import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';
import { Canvas, Circle, Path, Skia } from '@shopify/react-native-skia';
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

  const [size, setSize] = useState({ w: 1, h: 1 });
  const [childPoints, setChildPoints] = useState<{ x: number; y: number; onPath: boolean }[]>([]);
  const [done, setDone] = useState(false);
  const [encouragement, setEncouragement] = useState<string | null>(null);

  const scale = Math.min(size.w, size.h) / DESIGN;
  const toDesign = (x: number, y: number) => ({ x: x / scale, y: y / scale });
  const fromDesign = (p: { x: number; y: number }) => ({ x: p.x * scale, y: p.y * scale });

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
          {/* Start dot */}
          <Circle cx={start.x} cy={start.y} r={16} color={props.theme.accent} />
          {/* Child's trace: sparkle on path, soft fade off path */}
          {childPoints.map((p, i) => (
            <Circle key={i} cx={p.x} cy={p.y} r={p.onPath ? 8 : 5} color={p.onPath ? '#FFB300' : '#BDBDBD'} opacity={p.onPath ? 0.95 : 0.4} />
          ))}
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
