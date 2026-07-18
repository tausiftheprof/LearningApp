import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { AlphaType, Canvas, ColorType, Group, Image, Path, Skia, useImage } from '@shopify/react-native-skia';
import type { GameActivity } from '@littlegrip/core';
import {
  buildCollisionMap,
  erodeWalls,
  isolateLargestRegion,
  planRoute,
  reachedFinish,
  slideMove,
} from '@littlegrip/core';
import type { MazeCollisionMap, Point } from '@littlegrip/core';
import type { Theme } from '../../../ui/theme';
import { useAppStore } from '../../../state/appStore';
import { CompletionBanner } from '../ActivityPlayerScreen';
import { MAZE_GOAL_EMOJI, MAZE_IMAGES, MAZE_MOVER_EMOJI } from './mazeImages';

/**
 * Maze player (owner direction, July 2026). FREE-DRAG with real collision,
 * built on the shared core maze engine (`@littlegrip/core` maze). The printed
 * maze photo is rasterised once into a wall mask; the child grabs the
 * character and glides it through, stopping at walls and sliding along them.
 *
 * All collision runs in MASK SPACE via the core engine, so it is identical to
 * the web demo and stays aligned at any size. There is no auto-movement or
 * pathfinding-to-goal: the character only moves while being dragged and stops
 * the instant it is released. The engine's route is used only to size the
 * character and to draw the optional hint.
 */
export function MazePlayer(props: {
  activity: GameActivity;
  theme: Theme;
  onComplete: (r: { attempts: number; hintCount: number; accuracyScore: number | null }) => void;
  onDone: () => void;
}): React.JSX.Element {
  const { activity, theme } = props;
  const { profile, catalogue, navigate } = useAppStore();
  const params = activity.params as {
    image?: string; bbox?: number[]; start?: number[]; finish?: number[]; mover?: string; goal?: string; successMessage?: string;
  };
  const imgName = (params.image ?? '').replace(/^.*\//, '').replace(/\.[a-z]+$/i, '');
  const img = useImage(MAZE_IMAGES[imgName] ?? null);
  const moverEmoji = MAZE_MOVER_EMOJI[params.mover ?? 'fish'] ?? '🐠';
  const goalEmoji = MAZE_GOAL_EMOJI[params.goal ?? 'star'] ?? '⭐';
  const successMessage = params.successMessage ?? 'You found the way!';

  // Ordered maze list for this profile (for "Maze N of M" + Next Maze).
  const siblings = useMemo(
    () => catalogue
      .filter((a): a is GameActivity => a.type === 'game' && a.template === 'path-maze')
      .filter((a) => a.ageBands.includes(profile?.ageBand ?? '3-5'))
      .sort((a, b) => a.difficulty - b.difficulty),
    [catalogue, profile],
  );
  const myIndex = siblings.findIndex((a) => a.id === activity.id);

  const engine = useRef<{ map: MazeCollisionMap; plan: ReturnType<typeof planRoute>; radius: number; collideR: number; finishRadius: number } | null>(null);
  const charPos = useRef<Point>({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const [, force] = useState(0);
  const rerender = () => force((n) => n + 1);

  const [layout, setLayout] = useState({ w: 1, h: 1 });
  const [done, setDone] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [soundOn, setSoundOn] = useState(profile?.sound.voice !== false);
  const attempts = useRef(1);
  const grabbed = useRef(false);

  // --- decode the maze photo into a collision map (once the image loads) ---
  useEffect(() => {
    if (!img || !MAZE_IMAGES[imgName]) return;
    const MAXW = (activity.difficulty || 1) >= 3 ? 900 : 480;
    const nW = img.width(), nH = img.height();
    const ratio = nW > MAXW ? MAXW / nW : 1;
    const W = Math.max(1, Math.round(nW * ratio)), H = Math.max(1, Math.round(nH * ratio));
    const surface = Skia.Surface.Make(W, H);
    if (!surface) return;
    const cv = surface.getCanvas();
    cv.drawImageRect(img, Skia.XYWHRect(0, 0, nW, nH), Skia.XYWHRect(0, 0, W, H), Skia.Paint());
    const snap = surface.makeImageSnapshot();
    const raw = snap.readPixels(0, 0, { width: W, height: H, colorType: ColorType.RGBA_8888, alphaType: AlphaType.Unpremul });
    if (!raw) return;
    const data = raw as Uint8Array;
    const bbox = params.bbox ?? [0, 0, 1, 1];
    const bx0 = bbox[0]! * W, by0 = bbox[1]! * H, bx1 = bbox[2]! * W, by1 = bbox[3]! * H;
    const walls = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        // Outside the maze bbox is wall, so the character stays inside the
        // printed maze and out of the decorative border art.
        if (x < bx0 || x > bx1 || y < by0 || y > by1) { walls[i] = 1; continue; }
        const o = i * 4;
        walls[i] = (data[o]! + data[o + 1]! + data[o + 2]!) / 3 < 170 ? 1 : 0;
      }
    }
    // Clean the mask (reopen anti-aliasing pinches, keep only the maze's own
    // corridor network), then auto-fit the character + route.
    const map = buildCollisionMap(isolateLargestRegion(erodeWalls(walls, W, H, 2), W, H), W, H);
    const maxRadius = Math.round(Math.min(W, H) * ((activity.difficulty || 1) >= 3 ? 0.042 : 0.055));
    const start = params.start ?? [0.1, 0.5], finish = params.finish ?? [0.9, 0.5];
    const plan = planRoute(map, { x: start[0]!, y: start[1]! }, { x: finish[0]!, y: finish[1]! }, { maxRadius });
    const radius = plan.radius;
    engine.current = { map, plan, radius, collideR: Math.max(0.5, radius - 1), finishRadius: radius * 1.9 };
    charPos.current = { x: plan.start.x, y: plan.start.y };
    setReady(true);
  }, [img, imgName, activity.difficulty, params]);

  // --- mask <-> screen transform (keeps collision aligned at any size) ------
  const view = useMemo(() => {
    const e = engine.current;
    if (!e) return { scale: 1, ox: 0, oy: 0, W: 1, H: 1 };
    const W = e.map.width, H = e.map.height;
    const scale = Math.min(layout.w / W, layout.h / H);
    return { scale, ox: (layout.w - W * scale) / 2, oy: (layout.h - H * scale) / 2, W, H };
  }, [layout, ready]);
  const toScreen = (p: Point) => ({ x: p.x * view.scale + view.ox, y: p.y * view.scale + view.oy });
  const toMask = (x: number, y: number) => ({ x: (x - view.ox) / view.scale, y: (y - view.oy) / view.scale });

  const spriteScreen = Math.max(26, Math.min(120, (engine.current?.radius ?? 8) * view.scale * 2.3));
  const goalScreen = Math.max(40, Math.min(110, (engine.current?.finishRadius ?? 16) * view.scale * 1.7));

  function win(): void {
    if (done) return;
    setDone(true);
    grabbed.current = false;
    props.onComplete({ attempts: attempts.current, hintCount: 0, accuracyScore: null });
  }

  function resetMaze(): void {
    const e = engine.current;
    if (!e) return;
    charPos.current = { x: e.plan.start.x, y: e.plan.start.y };
    grabbed.current = false;
    rerender();
  }

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !done,
        onMoveShouldSetPanResponder: () => !done,
        onPanResponderGrant: (ev) => {
          const e = engine.current;
          if (!e || done) return;
          const { locationX, locationY } = ev.nativeEvent;
          const c = toScreen(charPos.current);
          const grab = Math.max(spriteScreen, 52) * 0.9;
          grabbed.current = Math.hypot(locationX - c.x, locationY - c.y) <= grab;
        },
        onPanResponderMove: (ev) => {
          const e = engine.current;
          if (!e || done || !grabbed.current) return;
          const { locationX, locationY } = ev.nativeEvent;
          // Ride the character a little above the fingertip so it stays visible.
          const target = toMask(locationX, locationY - spriteScreen * 0.55);
          const res = slideMove(e.map, charPos.current, target, e.collideR);
          charPos.current = res.position;
          if (reachedFinish(charPos.current, e.plan.finish, e.collideR, e.finishRadius)) win();
          else rerender();
        },
        onPanResponderRelease: () => { grabbed.current = false; }, // stop instantly on release
        onPanResponderTerminate: () => { grabbed.current = false; },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [done, ready, view.scale, spriteScreen],
  );

  const guidePath = useMemo(() => {
    const e = engine.current;
    if (!e || !showHint) return null;
    const pts = e.plan.hintPath.slice(0, Math.max(2, Math.ceil(e.plan.hintPath.length * 0.45)));
    const p = Skia.Path.Make();
    pts.forEach((pt, i) => { const s = toScreen(pt); i ? p.lineTo(s.x, s.y) : p.moveTo(s.x, s.y); });
    return p;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showHint, ready, view.scale, view.ox, view.oy]);

  const charS = toScreen(charPos.current);
  const goalS = engine.current ? toScreen(engine.current.plan.finish) : { x: 0, y: 0 };
  const imgRect = engine.current ? { x: view.ox, y: view.oy, w: view.W * view.scale, h: view.H * view.scale } : null;

  return (
    <View style={styles.root}>
      <View style={styles.controls}>
        <Text style={[styles.progress, { color: theme.text }]}>{myIndex >= 0 ? `Maze ${myIndex + 1} of ${siblings.length}` : ''}</Text>
        <Ctl label="💡 Hint" onPress={() => { if (ready && !done) { setShowHint(true); setTimeout(() => setShowHint(false), 1600); } }} />
        <Ctl label="🔄 Reset" onPress={() => { attempts.current += 1; resetMaze(); }} />
        <Ctl label={soundOn ? '🔊' : '🔇'} onPress={() => setSoundOn((s) => !s)} />
      </View>

      <View style={styles.stage} onLayout={(e) => setLayout({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })} {...pan.panHandlers}>
        <Canvas style={styles.canvas}>
          {img && imgRect && <Image image={img} x={imgRect.x} y={imgRect.y} width={imgRect.w} height={imgRect.h} fit="fill" />}
          {guidePath && (
            <Group>
              <Path path={guidePath} color="rgba(255,193,7,0.9)" style="stroke" strokeWidth={Math.max(7, (engine.current?.radius ?? 6) * view.scale)} strokeCap="round" strokeJoin="round" />
            </Group>
          )}
        </Canvas>

        {ready && !done && (
          <>
            {/* Destination */}
            <View style={[styles.goalRing, { left: goalS.x - goalScreen / 2, top: goalS.y - goalScreen / 2, width: goalScreen, height: goalScreen }]} pointerEvents="none">
              <Text style={{ fontSize: goalScreen * 0.6 }}>{goalEmoji}</Text>
            </View>
            {/* Character */}
            <View style={[styles.mover, { left: charS.x - spriteScreen / 2, top: charS.y - spriteScreen / 2, width: spriteScreen, height: spriteScreen }]} pointerEvents="none">
              <Text style={{ fontSize: spriteScreen * 0.72 }}>{moverEmoji}</Text>
            </View>
          </>
        )}
        {!ready && <Text style={[styles.loading, { color: theme.text }]}>Getting the maze ready… 🧩</Text>}
      </View>

      {!done && <Text style={[styles.hintText, { color: theme.text }]}>Hold and glide {moverEmoji} to the finish!</Text>}

      {done && (
        <View style={[styles.banner, { backgroundColor: theme.success }]} accessibilityLiveRegion="polite">
          <Text style={styles.bannerText}>🎉 {successMessage}</Text>
          <View style={styles.bannerRow}>
            <Pressable accessibilityRole="button" accessibilityLabel="Play again" onPress={() => { attempts.current += 1; setDone(false); resetMaze(); }} style={styles.bannerBtn}><Text style={styles.bannerBtnText}>🔁 Play Again</Text></Pressable>
            {myIndex >= 0 && myIndex < siblings.length - 1 ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Next maze" onPress={() => navigate({ name: 'activity', activity: siblings[myIndex + 1]! })} style={styles.bannerBtn}><Text style={styles.bannerBtnText}>➡️ Next Maze</Text></Pressable>
            ) : (
              <Pressable accessibilityRole="button" accessibilityLabel="More mazes" onPress={() => navigate({ name: 'picker', category: 'mazes' })} style={styles.bannerBtn}><Text style={styles.bannerBtnText}>🧩 More Mazes</Text></Pressable>
            )}
            <Pressable accessibilityRole="button" accessibilityLabel="Go home" onPress={props.onDone} style={styles.bannerBtn}><Text style={styles.bannerBtnText}>🏠 Home</Text></Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

function Ctl(props: { label: string; onPress: () => void }): React.JSX.Element {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={props.label} onPress={props.onPress} style={styles.ctl}>
      <Text style={styles.ctlText}>{props.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 4 },
  progress: { fontSize: 16, fontWeight: '800', marginRight: 'auto' },
  ctl: { minHeight: 48, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 14, backgroundColor: '#FFFFFF', elevation: 2 },
  ctlText: { fontSize: 16, fontWeight: '800' },
  stage: { flex: 1, margin: 8, borderRadius: 16, overflow: 'hidden', backgroundColor: '#FFF8F0' },
  canvas: { flex: 1 },
  mover: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  goalRing: { position: 'absolute', alignItems: 'center', justifyContent: 'center', borderRadius: 999, borderWidth: 4, borderColor: 'rgba(255,138,101,0.9)', borderStyle: 'dashed' },
  loading: { position: 'absolute', alignSelf: 'center', top: '45%', fontSize: 18, fontWeight: '700' },
  hintText: { fontSize: 18, fontWeight: '800', textAlign: 'center', padding: 6 },
  banner: { position: 'absolute', bottom: 20, left: 16, right: 16, borderRadius: 22, padding: 16, alignItems: 'center' },
  bannerText: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  bannerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 10 },
  bannerBtn: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
  bannerBtnText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
});
