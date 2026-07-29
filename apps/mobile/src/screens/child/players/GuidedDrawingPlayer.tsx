import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { Canvas, Circle, Path, Skia } from '@shopify/react-native-skia';
import type { GuidedDrawingActivity } from '@littlegrip/core';
import type { Point } from '@littlegrip/core';
import { defaultAccessibilitySettings, pickFeedback, TracingSession, tracingConfigFor } from '@littlegrip/core';
import type { Theme } from '../../../ui/theme';
import { useAppStore } from '../../../state/appStore';
import { CompletionBanner } from '../ActivityPlayerScreen';

/**
 * Guided drawing — "build a picture" (owner Option A; mirrors the web demo's
 * renderGuidedBuild). The child makes the picture ONE PART at a time: each step
 * highlights a part's corridor, the child traces it, and each stroke fills the
 * instant it's traced (with the colour they picked, or the part's fixed colour
 * for wheels / seeds / eyes). Geometry is the shared source of truth in
 * packages/core `guidedBuilds.ts` (steps carry label / strokes / fill /
 * fixedColour). Fixed-colour steps show a single lively swatch, not a dead rail.
 */
interface BuildStep {
  label: string;
  fill: boolean;
  fixedColour: string | null;
  strokes: Point[][];
}

const PALETTE = ['#EF5350', '#FF8A65', '#FFCA28', '#66BB6A', '#26A69A', '#42A5F5', '#7E57C2', '#EC407A', '#8D6E63', '#FFFFFF'];

export function GuidedDrawingPlayer(props: {
  activity: GuidedDrawingActivity;
  theme: Theme;
  onComplete: (r: { attempts: number; hintCount: number; accuracyScore: number | null }) => void;
  onDone: () => void;
  onReplay?: () => void;
}): React.JSX.Element {
  const { profile } = useAppStore();
  const accessibility = profile?.accessibility ?? defaultAccessibilitySettings();
  const config = useMemo(() => {
    const base = tracingConfigFor(profile?.difficulty ?? 1, { accessibilityWiderCorridor: accessibility.widerTracingCorridor });
    return { ...base, corridorWidth: base.corridorWidth * 1.5, coverageToComplete: 0.5 };
  }, [profile, accessibility]);

  const steps: BuildStep[] = useMemo(
    () =>
      props.activity.steps.map((s) => ({
        label: s.label ?? 'Part',
        fill: Boolean(s.fill),
        fixedColour: s.fixedColour ?? null,
        strokes: s.strokes && s.strokes.length ? s.strokes : [s.overlay],
      })),
    [props.activity],
  );

  // Design-space bounding box of the whole picture (so the fit centres it).
  const CB = useMemo(() => {
    let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
    for (const st of steps) for (const stroke of st.strokes) for (const p of stroke) {
      minx = Math.min(minx, p.x); maxx = Math.max(maxx, p.x); miny = Math.min(miny, p.y); maxy = Math.max(maxy, p.y);
    }
    return { minx, maxx, miny, maxy };
  }, [steps]);

  const [stepIndex, setStepIndex] = useState(0);
  const [strokeIndex, setStrokeIndex] = useState(0);
  const [colour, setColour] = useState<string>(PALETTE[3]!);
  const [done, setDone] = useState(new Array(steps.length).fill(false) as boolean[]);
  const [partColour, setPartColour] = useState<(string | null)[]>(new Array(steps.length).fill(null));
  const [finished, setFinished] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [live, setLive] = useState<Point[]>([]);
  const session = useRef(new TracingSession(steps[0]!.strokes[0]!, config));
  const scores = useRef<number[]>([]);
  const liveRef = useRef<Point[]>([]);

  const [layout, setLayout] = useState({ w: 1, h: 1 });
  const margin = 22;
  const bw = Math.max(1, CB.maxx - CB.minx), bh = Math.max(1, CB.maxy - CB.miny);
  const scale = Math.min((layout.w - 2 * margin) / bw, (layout.h - 2 * margin) / bh);
  const ox = (layout.w - bw * scale) / 2 - CB.minx * scale;
  const oy = (layout.h - bh * scale) / 2 - CB.miny * scale;
  const X = (x: number) => x * scale + ox;
  const Y = (y: number) => y * scale + oy;
  const toDesign = (x: number, y: number) => ({ x: (x - ox) / scale, y: (y - oy) / scale });

  const curFixed = !finished && steps[stepIndex] ? steps[stepIndex]!.fixedColour : null;

  function pathOf(stroke: Point[], close: boolean) {
    const p = Skia.Path.Make();
    if (stroke.length) {
      p.moveTo(X(stroke[0]!.x), Y(stroke[0]!.y));
      for (const pt of stroke.slice(1)) p.lineTo(X(pt.x), Y(pt.y));
      if (close) p.close();
    }
    return p;
  }

  function advance(): void {
    const step = steps[stepIndex]!;
    scores.current.push(1);
    if (strokeIndex + 1 < step.strokes.length) {
      const ni = strokeIndex + 1;
      session.current = new TracingSession(step.strokes[ni]!, config);
      setStrokeIndex(ni);
      return;
    }
    // Step complete.
    setDone((d) => d.map((v, i) => (i === stepIndex ? true : v)));
    setPartColour((pc) => pc.map((v, i) => (i === stepIndex ? step.fixedColour ?? colour : v)));
    if (stepIndex + 1 < steps.length) {
      const ns = stepIndex + 1;
      session.current = new TracingSession(steps[ns]!.strokes[0]!, config);
      setStepIndex(ns);
      setStrokeIndex(0);
      setNote(pickFeedback('completed') + ' Now the ' + steps[ns]!.label.toLowerCase() + '!');
      return;
    }
    setFinished(true);
    const avg = scores.current.length ? Math.round((scores.current.reduce((a, b) => a + b, 0) / scores.current.length) * 100) : null;
    props.onComplete({ attempts: 1, hintCount: 0, accuracyScore: avg });
  }

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !finished,
        onMoveShouldSetPanResponder: () => !finished,
        onPanResponderGrant: (e) => {
          if (finished) return;
          const p = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
          liveRef.current = [p];
          setLive([p]);
          session.current.addPoint(toDesign(p.x, p.y));
        },
        onPanResponderMove: (e) => {
          if (finished) return;
          const p = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
          liveRef.current.push(p);
          const res = session.current.addPoint(toDesign(p.x, p.y));
          if (res.completed) {
            session.current.endAttempt();
            liveRef.current = [];
            setLive([]);
            advance();
            return;
          }
          setLive([...liveRef.current]);
        },
        onPanResponderRelease: () => {
          liveRef.current = [];
          setLive([]);
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [finished, stepIndex, strokeIndex, colour, scale, ox, oy],
  );

  const bandHalo = Math.max(10, config.corridorWidth * scale);
  const inkW = Math.max(4, config.corridorWidth * 0.32 * scale);

  return (
    <View style={styles.root}>
      {/* Step strip */}
      <View style={styles.strip}>
        {steps.map((s, i) => (
          <View key={i} style={[styles.chip, done[i] ? styles.chipDone : i === stepIndex && !finished ? { borderColor: props.theme.accent, borderWidth: 2 } : null]}>
            <Text style={styles.chipText}>{done[i] ? '✓' : i + 1} {s.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.canvasWrap} onLayout={(e) => setLayout({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })} {...pan.panHandlers}>
        <Canvas style={styles.canvas}>
          {steps.map((st, si) => {
            const c = partColour[si] ?? '#BDBDBD';
            if (done[si]) {
              return st.strokes.map((stroke, k) =>
                st.fill ? (
                  <Path key={`d${si}-${k}`} path={pathOf(stroke, true)} color={c} style="fill" />
                ) : (
                  <Path key={`d${si}-${k}`} path={pathOf(stroke, false)} color={c} style="stroke" strokeWidth={11 * scale} strokeCap="round" strokeJoin="round" />
                ),
              );
            }
            if (si !== stepIndex || finished) {
              // faint ghost of parts not yet reached
              return st.strokes.map((stroke, k) => (
                <Path key={`g${si}-${k}`} path={pathOf(stroke, false)} color="rgba(120,108,102,0.22)" style="stroke" strokeWidth={3} strokeCap="round" strokeJoin="round" />
              ));
            }
            return null;
          })}

          {/* Current step: colour finished strokes immediately; ghost + guide the rest */}
          {!finished && steps[stepIndex] && steps[stepIndex]!.strokes.map((stroke, k) => {
            const step = steps[stepIndex]!;
            const partC = step.fixedColour ?? colour;
            if (k < strokeIndex) {
              return step.fill ? (
                <Path key={`c${k}`} path={pathOf(stroke, true)} color={partC} style="fill" />
              ) : (
                <Path key={`c${k}`} path={pathOf(stroke, false)} color={partC} style="stroke" strokeWidth={11 * scale} strokeCap="round" strokeJoin="round" />
              );
            }
            if (k === strokeIndex) {
              return (
                <React.Fragment key={`a${k}`}>
                  <Path path={pathOf(stroke, false)} color="rgba(210,200,196,0.7)" style="stroke" strokeWidth={bandHalo} strokeCap="round" strokeJoin="round" />
                  <Path path={pathOf(stroke, false)} color={step.fixedColour ?? props.theme.accent} style="stroke" strokeWidth={inkW} strokeCap="round" strokeJoin="round" />
                </React.Fragment>
              );
            }
            return <Path key={`f${k}`} path={pathOf(stroke, false)} color="rgba(120,108,102,0.3)" style="stroke" strokeWidth={3} strokeCap="round" strokeJoin="round" />;
          })}

          {/* Leader dot at the start of the active stroke */}
          {!finished && steps[stepIndex] && steps[stepIndex]!.strokes[strokeIndex]?.[0] && (
            <Circle
              cx={X(steps[stepIndex]!.strokes[strokeIndex]![0]!.x)}
              cy={Y(steps[stepIndex]!.strokes[strokeIndex]![0]!.y)}
              r={11}
              color={curFixed ?? props.theme.accent}
            />
          )}

          {/* Live finger trail */}
          {live.length > 1 && (
            <Path path={pathOf(live.map((p) => toDesign(p.x, p.y)), false)} color={curFixed ?? colour} style="stroke" strokeWidth={inkW} strokeCap="round" strokeJoin="round" />
          )}
        </Canvas>
      </View>

      {note && !finished && (
        <Text accessibilityLiveRegion="polite" style={[styles.note, { color: props.theme.text }]}>{note}</Text>
      )}

      {/* Colour rail — a single lively swatch on a fixed-colour part, else the palette */}
      <View style={styles.rail}>
        {curFixed ? (
          <View accessibilityLabel="This part is this colour" style={[styles.swatch, styles.swatchFixed, { backgroundColor: curFixed, borderColor: props.theme.accent }]} />
        ) : (
          PALETTE.map((c) => (
            <Pressable
              key={c}
              accessibilityRole="button"
              accessibilityLabel={`Colour ${c}`}
              onPress={() => setColour(c)}
              style={[styles.swatch, { backgroundColor: c, borderColor: colour === c ? props.theme.accent : '#4A3B32', borderWidth: colour === c ? 4 : 1 }]}
            />
          ))
        )}
      </View>

      <CompletionBanner visible={finished} onDone={props.onDone} colour={props.theme.success} onReplay={props.onReplay} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  strip: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8, paddingTop: 6, gap: 6 },
  chip: { borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E0D8D2' },
  chipDone: { backgroundColor: '#E6F1EE', borderColor: '#8FC7B8' },
  chipText: { fontSize: 12, fontWeight: '800', color: '#4A3B32' },
  canvasWrap: { flex: 1, margin: 8, borderRadius: 16, overflow: 'hidden', backgroundColor: '#FFFFFF' },
  canvas: { flex: 1 },
  note: { fontSize: 18, fontWeight: '700', textAlign: 'center', padding: 6 },
  rail: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', paddingVertical: 8, gap: 8 },
  swatch: { width: 40, height: 40, borderRadius: 20 },
  swatchFixed: { width: 48, height: 48, borderRadius: 24, borderWidth: 4 },
});
