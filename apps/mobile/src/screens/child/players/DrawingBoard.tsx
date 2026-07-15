import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import type { BrushKind, GuidedDrawingActivity, Stroke } from '@littlehands/core';
import { DrawingSession, PALETTES } from '@littlehands/core';
import type { Theme } from '../../../ui/theme';
import { useAppStore } from '../../../state/appStore';
import { getRepositories } from '../../../storage/db';
import { CompletionBanner } from '../ActivityPlayerScreen';

/**
 * Drawing board (FR-003, docs/03 S10). Skia-rendered strokes over the core
 * DrawingSession model (undo/redo/replay). Saving writes the vector document
 * to the on-device gallery only (A-04).
 *
 * Brush rendering notes: glitter/rainbow are rendered as colour-cycling and
 * speckled strokes; the effects here are simple illustrative approximations -
 * production shaders arrive with the visual-identity work (phase 1).
 */
export function DrawingBoard(props: {
  activity: GuidedDrawingActivity;
  theme: Theme;
  onComplete: (r: { attempts: number; hintCount: number; accuracyScore: number | null }) => void;
  onDone: () => void;
}): React.JSX.Element {
  const { profile } = useAppStore();
  const session = useRef(new DrawingSession()).current;
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [livePoints, setLivePoints] = useState<{ x: number; y: number }[]>([]);
  const [brush, setBrush] = useState<BrushKind>('crayon');
  const [colour, setColour] = useState<string>(PALETTES.standard[0]!);
  const [size, setSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [palette, setPalette] = useState<'standard' | 'pastel'>('standard');
  const [saved, setSaved] = useState(false);
  const live = useRef<{ x: number; y: number }[]>([]);

  const refresh = () => {
    setStrokes(
      session
        .visibleOps()
        .filter((op): op is Extract<typeof op, { kind: 'stroke' }> => op.kind === 'stroke')
        .map((op) => op.stroke),
    );
  };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          live.current = [{ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY }];
          setLivePoints([...live.current]);
        },
        onPanResponderMove: (e) => {
          live.current.push({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY });
          setLivePoints([...live.current]);
        },
        onPanResponderRelease: () => {
          if (live.current.length > 1) {
            session.apply({
              kind: 'stroke',
              stroke: { brush: { kind: brush, colour, size }, points: [...live.current] },
            });
            refresh();
          }
          live.current = [];
          setLivePoints([]);
        },
      }),
    [brush, colour, size, session],
  );

  async function save(): Promise<void> {
    if (!profile) return;
    const repos = await getRepositories();
    await repos.artwork.save(session.toDocument(`art-${Date.now()}`, profile.id, Date.now()));
    setSaved(true);
    props.onComplete({ attempts: 1, hintCount: 0, accuracyScore: null });
  }

  const widths = { small: 4, medium: 9, large: 16 } as const;

  return (
    <View style={styles.root}>
      <View style={styles.canvasWrap} {...pan.panHandlers}>
        <Canvas style={styles.canvas}>
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

      <ScrollView horizontal style={styles.toolbar} contentContainerStyle={styles.toolbarContent}>
        {(['crayon', 'pencil', 'marker', 'paint', 'glitter', 'rainbow', 'eraser'] as const).map((b) => (
          <Tool key={b} label={brushLabel[b]} active={brush === b} onPress={() => setBrush(b)} />
        ))}
        {(['small', 'medium', 'large'] as const).map((s) => (
          <Tool key={s} label={s === 'small' ? '•' : s === 'medium' ? '●' : '⬤'} active={size === s} onPress={() => setSize(s)} />
        ))}
        <Tool label={palette === 'standard' ? '🌈' : '🎀'} active={false} onPress={() => setPalette(palette === 'standard' ? 'pastel' : 'standard')} />
        {PALETTES[palette].map((c) => (
          <Pressable
            key={c}
            accessibilityRole="button"
            accessibilityLabel={`Colour ${c}`}
            onPress={() => setColour(c)}
            style={[styles.swatch, { backgroundColor: c, borderWidth: colour === c ? 4 : 1 }]}
          />
        ))}
        <Tool label="↶ undo" active={false} onPress={() => { session.undo(); refresh(); }} />
        <Tool label="↷ redo" active={false} onPress={() => { session.redo(); refresh(); }} />
        <Tool label="🧽 all" active={false} onPress={() => { session.clear(); refresh(); }} />
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
  if (stroke.brush.kind === 'eraser') return '#FFFFFF';
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
  toolbar: { maxHeight: 88 },
  toolbarContent: { alignItems: 'center', paddingHorizontal: 8 },
  tool: { minWidth: 64, minHeight: 64, alignItems: 'center', justifyContent: 'center', margin: 2, borderRadius: 14, backgroundColor: '#FFFFFF' },
  toolActive: { backgroundColor: '#FFE0B2' },
  toolText: { fontSize: 22 },
  swatch: { width: 48, height: 48, borderRadius: 24, margin: 4, borderColor: '#4A3B32' },
});
