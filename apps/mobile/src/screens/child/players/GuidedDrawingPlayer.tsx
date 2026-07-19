import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Canvas, Circle, Path, Skia } from '@shopify/react-native-skia';
import type { BrushKind, GuidedDrawingActivity, Stroke } from '@littlegrip/core';
import {
  defaultAccessibilitySettings,
  DrawingSession,
  PALETTES,
  pickFeedback,
  TracingSession,
  tracingConfigFor,
} from '@littlegrip/core';
import type { Theme } from '../../../ui/theme';
import { useAppStore } from '../../../state/appStore';
import { getRepositories } from '../../../storage/db';
import { CompletionBanner } from '../ActivityPlayerScreen';

const DESIGN = 1000;

/**
 * Guided drawing (owner pilot, July 2026): the child follows real outline
 * strokes with their own chosen brush/colour, one at a time. Combines the
 * corridor-tracking engine (tracing.TracingSession, to know when a guide
 * stroke is "done") with the real ink model (drawing.DrawingSession, what
 * actually gets saved) - mirrors web-demo's renderGuidedDrawing.
 *
 * Deliberately more forgiving than letter/shape tracing: ink is never
 * clipped or rejected, and lifting the pen mid-stroke does not reset the
 * guide's accumulated coverage - a few short dabs across several lifts
 * still add up to "done". Saving (not finishing the last guide) is what
 * records completion, same as the free-draw board.
 */
export function GuidedDrawingPlayer(props: {
  activity: GuidedDrawingActivity;
  theme: Theme;
  onComplete: (r: { attempts: number; hintCount: number; accuracyScore: number | null }) => void;
  onDone: () => void;
}): React.JSX.Element {
  const { profile } = useAppStore();
  const accessibility = profile?.accessibility ?? defaultAccessibilitySettings();
  const config = useMemo(() => {
    const base = tracingConfigFor(profile?.difficulty ?? 1, {
      accessibilityWiderCorridor: accessibility.widerTracingCorridor,
    });
    return { ...base, corridorWidth: base.corridorWidth * 1.4, coverageToComplete: 0.55 };
  }, [profile, accessibility]);

  const guides = props.activity.steps.map((s) => s.overlay);
  const [guideIndex, setGuideIndex] = useState(0);
  const session = useRef(new TracingSession(guides[0]!, config));
  const guideScores = useRef<number[]>([]);
  const drawingSession = useRef(new DrawingSession()).current;

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [livePoints, setLivePoints] = useState<{ x: number; y: number }[]>([]);
  const [brush, setBrush] = useState<BrushKind>('crayon');
  const [colour, setColour] = useState<string>(PALETTES.standard[0]!);
  const [size, setSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [palette, setPalette] = useState<'standard' | 'pastel'>('standard');
  const [done, setDone] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const live = useRef<{ x: number; y: number }[]>([]);

  const [layout, setLayout] = useState({ w: 1, h: 1 });
  const side = Math.min(layout.w, layout.h);
  const scale = side / DESIGN;
  const ox = (layout.w - side) / 2;
  const oy = (layout.h - side) / 2;
  const toDesign = (x: number, y: number) => ({ x: (x - ox) / scale, y: (y - oy) / scale });
  const fromDesign = (p: { x: number; y: number }) => ({ x: p.x * scale + ox, y: p.y * scale + oy });

  const refresh = () => {
    setStrokes(
      drawingSession
        .visibleOps()
        .filter((op): op is Extract<typeof op, { kind: 'stroke' }> => op.kind === 'stroke')
        .map((op) => op.stroke),
    );
  };

  function guideDone(summary: { accuracyScore: number }): void {
    guideScores.current.push(summary.accuracyScore);
    const nextIndex = guideIndex + 1;
    if (nextIndex < guides.length) {
      session.current = new TracingSession(guides[nextIndex]!, config);
      setGuideIndex(nextIndex);
      setNote(pickFeedback('completed') + ' Now the next part!');
      return;
    }
    setDone(true);
    setNote(pickFeedback('completed') + ' Tap 💾 to save your picture!');
  }

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          const p = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
          live.current = [p];
          setLivePoints([...live.current]);
          if (!done) session.current.addPoint(toDesign(p.x, p.y));
        },
        onPanResponderMove: (e) => {
          const p = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
          live.current.push(p);
          if (!done) {
            const result = session.current.addPoint(toDesign(p.x, p.y));
            if (result.completed) {
              drawingSession.apply({ kind: 'stroke', stroke: { brush: { kind: brush, colour, size }, points: [...live.current] } });
              refresh();
              live.current = [];
              setLivePoints([]);
              guideDone(session.current.endAttempt());
              return;
            }
          }
          setLivePoints([...live.current]);
        },
        onPanResponderRelease: () => {
          // Ink is always kept even if this guide stroke isn't finished yet -
          // this is a drawing tool with a helper, not a pass/fail trace.
          if (live.current.length > 1) {
            drawingSession.apply({ kind: 'stroke', stroke: { brush: { kind: brush, colour, size }, points: [...live.current] } });
            refresh();
          }
          live.current = [];
          setLivePoints([]);
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [brush, colour, size, done, guideIndex, scale],
  );

  async function save(): Promise<void> {
    if (!profile) return;
    const repos = await getRepositories();
    await repos.artwork.save(drawingSession.toDocument(`art-${Date.now()}`, profile.id, Date.now()));
    const scores = guideScores.current;
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    setSaved(true);
    props.onComplete({ attempts: 1, hintCount: 0, accuracyScore: avg });
  }

  const guidePaths = useMemo(
    () =>
      guides.map((path) => {
        const p = Skia.Path.Make();
        const first = fromDesign(path[0]!);
        p.moveTo(first.x, first.y);
        for (const pt of path.slice(1)) {
          const s = fromDesign(pt);
          p.lineTo(s.x, s.y);
        }
        return p;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props.activity, scale],
  );
  const startDot = fromDesign(guides[Math.min(guideIndex, guides.length - 1)]![0]!);
  const widths = { small: 4, medium: 9, large: 16 } as const;

  return (
    <View style={styles.root}>
      <View
        style={styles.canvasWrap}
        onLayout={(e) => setLayout({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        {...pan.panHandlers}
      >
        <Canvas style={styles.canvas}>
          {guidePaths.map((p, i) => (
            <React.Fragment key={i}>
              {i === guideIndex && !done && (
                <Path path={p} color="rgba(215, 204, 200, 0.55)" style="stroke" strokeWidth={config.corridorWidth * 2 * scale} strokeCap="round" strokeJoin="round" />
              )}
              <Path
                path={p}
                color={i < guideIndex || done ? props.theme.accent : i === guideIndex ? '#BCAAA4' : 'rgba(215, 204, 200, 0.5)'}
                style="stroke"
                strokeWidth={i < guideIndex || done ? 5 : i === guideIndex ? 4 : 3}
                strokeCap="round"
                strokeJoin="round"
              />
            </React.Fragment>
          ))}
          {!done && <Circle cx={startDot.x} cy={startDot.y} r={12} color={props.theme.accent} />}
          {[...strokes, ...(livePoints.length > 1 ? [{ brush: { kind: brush, colour, size }, points: livePoints }] : [])].map(
            (stroke, i) => (
              <Path
                key={i}
                path={pathFrom(stroke.points)}
                color={strokeColour(stroke, i)}
                style="stroke"
                strokeWidth={widths[stroke.brush.size] * (stroke.brush.kind === 'marker' ? 1.6 : 1)}
                strokeCap="round"
                strokeJoin="round"
                opacity={stroke.brush.kind === 'pencil' ? 0.75 : 1}
              />
            ),
          )}
        </Canvas>
      </View>
      {note && !saved && (
        <Text accessibilityLiveRegion="polite" style={[styles.note, { color: props.theme.text }]}>
          {note}
        </Text>
      )}

      <ScrollView horizontal style={styles.toolbar} contentContainerStyle={styles.toolbarContent}>
        {(['crayon', 'pencil', 'marker', 'paint'] as const).map((b) => (
          <Tool key={b} label={brushLabel[b]} active={brush === b} onPress={() => setBrush(b)} />
        ))}
        {(['small', 'medium', 'large'] as const).map((s) => (
          <Tool key={s} label={s === 'small' ? '•' : s === 'medium' ? '●' : '⬤'} active={size === s} onPress={() => setSize(s)} />
        ))}
        <Tool label={palette === 'standard' ? '🎀' : '🌈'} active={false} onPress={() => setPalette(palette === 'standard' ? 'pastel' : 'standard')} />
        {PALETTES[palette].map((c) => (
          <Pressable
            key={c}
            accessibilityRole="button"
            accessibilityLabel={`Colour ${c}`}
            onPress={() => setColour(c)}
            style={[styles.swatch, { backgroundColor: c, borderWidth: colour === c ? 4 : 1 }]}
          />
        ))}
        <Tool label="↶ undo" active={false} onPress={() => { drawingSession.undo(); refresh(); }} />
        <Tool label="🧹 clear" active={false} onPress={() => { drawingSession.clear(); refresh(); }} />
        <Tool label="💾 save" active={false} onPress={() => void save()} />
      </ScrollView>

      <CompletionBanner visible={saved} onDone={props.onDone} colour={props.theme.success} />
    </View>
  );
}

const brushLabel: Record<BrushKind, string> = {
  crayon: '🖍️',
  pencil: '✏️',
  marker: '🖊️',
  paint: '🖌️',
  glitter: '✨',
  rainbow: '🌈',
  eraser: '🧽',
};

function pathFrom(points: { x: number; y: number }[]) {
  const path = Skia.Path.Make();
  if (points.length > 0) {
    path.moveTo(points[0]!.x, points[0]!.y);
    for (const p of points.slice(1)) path.lineTo(p.x, p.y);
  }
  return path;
}

function strokeColour(stroke: Stroke, index: number): string {
  if (stroke.brush.kind === 'rainbow') {
    const cycle = PALETTES.standard;
    return cycle[index % cycle.length]!;
  }
  return stroke.brush.colour;
}

function Tool(props: { label: string; active: boolean; onPress: () => void }): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.label}
      onPress={props.onPress}
      style={[styles.tool, props.active && styles.toolActive]}
    >
      <Text style={styles.toolText}>{props.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  canvasWrap: { flex: 1, margin: 8, borderRadius: 16, overflow: 'hidden', backgroundColor: '#FFFFFF' },
  canvas: { flex: 1 },
  note: { fontSize: 20, fontWeight: '700', textAlign: 'center', padding: 8 },
  toolbar: { maxHeight: 88 },
  toolbarContent: { alignItems: 'center', paddingHorizontal: 8 },
  tool: { minWidth: 64, minHeight: 64, alignItems: 'center', justifyContent: 'center', margin: 2, borderRadius: 14, backgroundColor: '#FFFFFF' },
  toolActive: { backgroundColor: '#FFE0B2' },
  toolText: { fontSize: 22 },
  swatch: { width: 48, height: 48, borderRadius: 24, margin: 4, borderColor: '#4A3B32' },
});
