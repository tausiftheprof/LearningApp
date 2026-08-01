import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurMask, Canvas, Circle, Group, Path, Skia } from '@shopify/react-native-skia';
import type { BrushKind, GuidedDrawingActivity, Stroke } from '@littlegrip/core';
import { DrawingSession, PALETTES } from '@littlegrip/core';
import type { Theme } from '../../../ui/theme';
import { useAppStore } from '../../../state/appStore';
import { getRepositories } from '../../../storage/db';
import { CompletionBanner } from '../ActivityPlayerScreen';

/**
 * Free Draw board — the owner-approved "Magic drawer" layout (ported from the
 * web demo): a right colour rail with a white selected ring, a slim bottom bar
 * (crayon · paint · eraser · 🪄 wand), a floating size pod, undo/redo +
 * start-over/save in the corners, and a wand-opened drawer of magic brushes
 * (rainbow / glitter / glow / star + heart stamps). The white stage IS the paper.
 * Skia renders each brush kind; saving writes the vector document to the
 * on-device gallery only (A-04).
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const live = useRef<{ x: number; y: number }[]>([]);
  // Latest brush/colour/size for the once-built pan responder.
  const cur = useRef({ brush, colour, size });
  cur.current = { brush, colour, size };
  const accent = props.theme.accent;

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
          if (live.current.length > 0) {
            session.apply({
              kind: 'stroke',
              stroke: {
                brush: { kind: cur.current.brush, colour: cur.current.colour, size: cur.current.size },
                points: [...live.current],
              },
            });
            refresh();
          }
          live.current = [];
          setLivePoints([]);
        },
      }),
    // Built once; the current brush/colour/size are read through `cur`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session],
  );

  async function save(): Promise<void> {
    if (!profile) return;
    const repos = await getRepositories();
    await repos.artwork.save(session.toDocument(`art-${Date.now()}`, profile.id, Date.now()));
    setSaved(true);
    props.onComplete({ attempts: 1, hintCount: 0, accuracyScore: null });
  }

  const liveStroke: Stroke | null =
    livePoints.length > 0 ? { brush: { kind: brush, colour, size }, points: livePoints } : null;
  const allStrokes = liveStroke ? [...strokes, liveStroke] : strokes;

  const BASIC: Array<[BrushKind, string]> = [['crayon', '🖍️'], ['paint', '🖌️'], ['eraser', '🧽']];
  const MAGIC: Array<[BrushKind, string]> = [['rainbow', '🌈'], ['glitter', '✨'], ['glow', '🔆'], ['stampStar', '⭐'], ['stampHeart', '💖']];

  return (
    <View style={styles.root}>
      <View style={styles.canvasWrap}>
        <View style={StyleSheet.absoluteFill} {...pan.panHandlers}>
          <Canvas style={styles.canvas}>
            {allStrokes.map((stroke, i) => (
              <StrokeView key={i} stroke={stroke} index={i} />
            ))}
          </Canvas>
        </View>

        {/* Right colour rail (white ring on the selected chip). */}
        <View style={styles.rail}>
          {PALETTES.standard.map((c) => (
            <Pressable
              key={c}
              accessibilityRole="button"
              accessibilityLabel={`Colour ${c}`}
              onPress={() => { setColour(c); if (brush === 'eraser') setBrush('crayon'); }}
              style={[
                styles.chip,
                { backgroundColor: c, borderColor: colour === c ? '#FFFFFF' : 'rgba(0,0,0,0.12)', borderWidth: colour === c ? 4 : 1 },
                colour === c ? { shadowColor: accent, shadowOpacity: 0.5, shadowRadius: 5, elevation: 4 } : null,
              ]}
            />
          ))}
        </View>

        {/* Floating size pod. */}
        <View style={styles.sizePod}>
          <Text style={styles.podCap}>size</Text>
          {(['large', 'medium', 'small'] as const).map((s) => {
            const d = s === 'small' ? 12 : s === 'medium' ? 20 : 30;
            return (
              <Pressable
                key={s}
                accessibilityRole="button"
                accessibilityLabel={`${s} size`}
                onPress={() => setSize(s)}
                style={[styles.sDot, { width: d + 12, height: d + 12, borderColor: size === s ? accent : 'transparent', borderWidth: size === s ? 3 : 0 }]}
              >
                <View style={{ width: d, height: d, borderRadius: d / 2, backgroundColor: '#4A3B32' }} />
              </Pressable>
            );
          })}
        </View>

        {/* Corner controls. */}
        <View style={[styles.corner, styles.cornerTL]}>
          <CornerBtn label="↶" aria="Undo" onPress={() => { session.undo(); refresh(); }} />
          <CornerBtn label="↷" aria="Redo" onPress={() => { session.redo(); refresh(); }} />
        </View>
        <View style={[styles.corner, styles.cornerTR]}>
          <CornerBtn label="🗑️" aria="Start over" onPress={() => { session.clear(); refresh(); }} />
          <CornerBtn label="💾" aria="Save my picture" onPress={() => void save()} />
        </View>

        {/* Wand drawer of magic brushes. */}
        {drawerOpen && (
          <View style={styles.drawer}>
            <Text style={styles.podCap}>🪄 magic brushes</Text>
            <View style={styles.drawerRow}>
              {MAGIC.map(([k, ic]) => (
                <ToolBtn key={k} label={ic} active={brush === k} magic onPress={() => { setBrush(k); }} />
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Slim bottom bar. */}
      <View style={styles.bar}>
        {BASIC.map(([k, ic]) => (
          <ToolBtn key={k} label={ic} active={brush === k} onPress={() => { setBrush(k); setDrawerOpen(false); }} />
        ))}
        <ToolBtn label="🪄" active={drawerOpen} magic onPress={() => setDrawerOpen((o) => !o)} />
      </View>

      <CompletionBanner visible={saved} onDone={props.onDone} colour={props.theme.success} />
    </View>
  );
}

const WIDTHS = { small: 4, medium: 9, large: 16 } as const;

/** Renders one stroke with its brush kind's look (Skia). */
function StrokeView({ stroke, index }: { stroke: Stroke; index: number }): React.JSX.Element | null {
  const kind = stroke.brush.kind;
  const w = WIDTHS[stroke.brush.size];
  const pts = stroke.points;

  if (kind === 'stampStar' || kind === 'stampHeart') {
    const step = w * 3.4 + 14;
    const stampR = (w * 3.4 + 12) / 2;
    const path = Skia.Path.Make();
    let last: { x: number; y: number } | null = null;
    const drop = (p: { x: number; y: number }) => {
      if (kind === 'stampStar') addStar(path, p.x, p.y, stampR);
      else addHeart(path, p.x, p.y, stampR);
    };
    for (const p of pts) {
      if (!last || Math.hypot(p.x - last.x, p.y - last.y) > step * 0.72) { drop(p); last = p; }
    }
    if (!last && pts[0]) drop(pts[0]);
    return <Path path={path} color={stroke.brush.colour} style="fill" />;
  }

  if (pts.length < 2) return null;
  const linePath = Skia.Path.Make();
  linePath.moveTo(pts[0]!.x, pts[0]!.y);
  for (const p of pts.slice(1)) linePath.lineTo(p.x, p.y);

  const colour =
    kind === 'eraser' ? '#FFFFFF' : kind === 'rainbow' ? PALETTES.standard[index % PALETTES.standard.length]! : stroke.brush.colour;
  const strokeWidth = w * (kind === 'marker' ? 1.6 : 1);
  const opacity = kind === 'pencil' ? 0.75 : 1;

  return (
    <Group>
      {kind === 'glow' && (
        <Path path={linePath} color={stroke.brush.colour} style="stroke" strokeWidth={strokeWidth * 2.1} strokeCap="round" strokeJoin="round" opacity={0.55}>
          <BlurMask blur={10} style="normal" />
        </Path>
      )}
      <Path path={linePath} color={colour} style="stroke" strokeWidth={strokeWidth} strokeCap="round" strokeJoin="round" opacity={opacity} />
      {kind === 'glitter' &&
        pts.filter((_, j) => j % 3 === 0).map((p, j) => (
          <Circle key={j} cx={p.x + Math.sin(j * 7) * 6} cy={p.y + Math.cos(j * 5) * 6} r={1.7} color="#FFF59D" />
        ))}
    </Group>
  );
}

/** A five-point star sub-path centred at (cx, cy). */
function addStar(path: ReturnType<typeof Skia.Path.Make>, cx: number, cy: number, r: number): void {
  const inner = r * 0.42;
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    if (i === 0) path.moveTo(x, y); else path.lineTo(x, y);
  }
  path.close();
}

/** A heart sub-path centred at (cx, cy). */
function addHeart(path: ReturnType<typeof Skia.Path.Make>, cx: number, cy: number, r: number): void {
  const s = r / 16;
  const x = (dx: number) => cx + dx * s;
  const y = (dy: number) => cy + dy * s;
  path.moveTo(x(0), y(6));
  path.cubicTo(x(0), y(3), x(-3), y(-4), x(-9), y(-4));
  path.cubicTo(x(-17), y(-4), x(-17), y(6), x(-17), y(6));
  path.cubicTo(x(-17), y(11), x(-10), y(15), x(0), y(20));
  path.cubicTo(x(10), y(15), x(17), y(11), x(17), y(6));
  path.cubicTo(x(17), y(6), x(17), y(-4), x(9), y(-4));
  path.cubicTo(x(3), y(-4), x(0), y(3), x(0), y(6));
  path.close();
}

function ToolBtn(props: { label: string; active: boolean; magic?: boolean; onPress: () => void }): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.label}
      onPress={props.onPress}
      style={[styles.tool, props.magic && styles.toolMagic, props.active && styles.toolActive]}
    >
      <Text style={styles.toolText}>{props.label}</Text>
    </Pressable>
  );
}

function CornerBtn(props: { label: string; aria: string; onPress: () => void }): React.JSX.Element {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={props.aria} onPress={props.onPress} style={styles.cornerBtn}>
      <Text style={styles.cornerText}>{props.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  canvasWrap: { flex: 1, margin: 8, borderRadius: 16, overflow: 'hidden', backgroundColor: '#FFFFFF' },
  canvas: { flex: 1 },
  rail: {
    position: 'absolute', right: 8, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', gap: 7,
  },
  chip: { width: 40, height: 40, borderRadius: 20 },
  sizePod: {
    position: 'absolute', left: 10, bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8,
    shadowColor: '#4A3B32', shadowOpacity: 0.16, shadowRadius: 6, elevation: 3,
  },
  podCap: { fontSize: 10, fontWeight: '800', color: '#8A80A5', textTransform: 'uppercase', letterSpacing: 0.6, marginRight: 4 },
  sDot: { borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  corner: { position: 'absolute', top: 8, flexDirection: 'row', gap: 6 },
  cornerTL: { left: 8 },
  cornerTR: { right: 8 },
  cornerBtn: {
    width: 46, height: 46, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.96)', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#4A3B32', shadowOpacity: 0.16, shadowRadius: 5, elevation: 3,
  },
  cornerText: { fontSize: 20 },
  drawer: {
    position: 'absolute', left: 72, right: 66, bottom: 10, backgroundColor: 'rgba(255,255,255,0.98)', borderRadius: 18,
    paddingHorizontal: 10, paddingTop: 8, paddingBottom: 12, alignItems: 'center',
    shadowColor: '#453D5B', shadowOpacity: 0.24, shadowRadius: 13, elevation: 8,
  },
  drawerRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 9, marginTop: 4 },
  bar: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 8 },
  tool: { minWidth: 60, minHeight: 60, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#FFFFFF', elevation: 1 },
  toolMagic: { backgroundColor: '#F3ECFF' },
  toolActive: { backgroundColor: '#FFE0B2' },
  toolText: { fontSize: 24 },
});
