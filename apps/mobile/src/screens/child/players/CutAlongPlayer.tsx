import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import { Canvas, Group, Image as SkiaImage, Path, Skia, useImage } from '@shopify/react-native-skia';
import type { GameActivity } from '@littlegrip/core';
import { TracingSession, tracingConfigFor } from '@littlegrip/core';
import type { Theme } from '../../../ui/theme';
import { cutArtFor } from '../../../ui/cutArt';
import { audioService } from '../../../services/audio';
import { CompletionBanner } from '../ActivityPlayerScreen';

interface Pt { x: number; y: number }

/**
 * Cut-Along (Busy Hands) — the child drags the scissors along the dotted line
 * across a picture; the corridor engine keeps them on the line, the blades snip
 * (open/closed swap), and on completion the picture splits into two halves that
 * tip and slide open. Owner art + the shared TracingSession engine. Mirrors the
 * web demo's `cut-along` renderer (demo-shell.html), ported to Skia.
 *
 * Coordinates are in canvas pixels throughout (the path is built in screen
 * space and fed screen-space points), matching the demo.
 */
export function CutAlongPlayer(props: {
  activity: GameActivity;
  theme: Theme;
  onComplete: (r: { attempts: number; hintCount: number; accuracyScore: number | null }) => void;
  onDone: () => void;
  onReplay?: () => void;
}): React.JSX.Element {
  const p = props.activity.params;
  const picture = useImage(cutArtFor(typeof p.image === 'string' ? p.image : undefined) ?? 0);
  const scissorsOpen = useImage(cutArtFor(typeof p.scissorsOpen === 'string' ? p.scissorsOpen : undefined) ?? 0);
  const scissorsClosed = useImage(cutArtFor(typeof p.scissorsClosed === 'string' ? p.scissorsClosed : undefined) ?? 0);
  const lineKind = typeof p.line === 'string' ? p.line : 'straight';
  const vertical = p.orientation === 'vertical';

  const [size, setSize] = useState({ w: 1, h: 1 });
  const [progress, setProgress] = useState(0);
  const [splitK, setSplitK] = useState(0);
  const [snipOpen, setSnipOpen] = useState(true);
  const [done, setDone] = useState(false);

  const progressRef = useRef(0);
  const doneRef = useRef(false);
  const lastSnip = useRef(-999);
  const session = useRef<TracingSession | null>(null);

  // Contain-fit the picture into the stage (80% so the halves have room to
  // slide), then centre it. Same geometry as the demo's fit().
  const irect = useMemo(() => {
    const iw = picture?.width() ?? 1;
    const ih = picture?.height() ?? 1;
    const s = Math.min((size.w * 0.8) / iw, (size.h * 0.8) / ih);
    const w = iw * s;
    const h = ih * s;
    return { x: (size.w - w) / 2, y: (size.h - h) / 2, w, h };
  }, [picture, size.w, size.h]);

  // The dotted cut path (48 samples), in canvas pixels.
  const path = useMemo<Pt[]>(() => {
    const n = 48;
    const out: Pt[] = [];
    if (vertical) {
      const y0 = irect.y + irect.h * 0.05, y1 = irect.y + irect.h * 0.95;
      const xmid = irect.x + irect.w * 0.5, amp = irect.w * 0.13;
      for (let i = 0; i <= n; i++) {
        const t = i / n, y = y0 + (y1 - y0) * t;
        let x = xmid;
        if (lineKind === 'wavy') x = xmid + Math.sin(t * Math.PI * 3) * amp;
        else if (lineKind === 'zigzag') x = xmid + (Math.abs(((t * 3) % 1) - 0.5) * 4 - 1) * amp;
        out.push({ x, y });
      }
    } else {
      const x0 = irect.x + irect.w * 0.05, x1 = irect.x + irect.w * 0.95;
      const ymid = irect.y + irect.h * 0.5, amp = irect.h * 0.13;
      for (let i = 0; i <= n; i++) {
        const t = i / n, x = x0 + (x1 - x0) * t;
        let y = ymid;
        if (lineKind === 'wavy') y = ymid + Math.sin(t * Math.PI * 3) * amp;
        else if (lineKind === 'zigzag') y = ymid + (Math.abs(((t * 3) % 1) - 0.5) * 4 - 1) * amp;
        out.push({ x, y });
      }
    }
    return out;
  }, [irect, vertical, lineKind]);

  // Build a fresh corridor session whenever the path changes (layout/rotation).
  useEffect(() => {
    if (path.length < 2) return;
    const cfg = { ...tracingConfigFor(2), coverageToComplete: 0.9 };
    cfg.corridorWidth = Math.max(38, (vertical ? irect.w : irect.h) * 0.16);
    session.current = new TracingSession(path, cfg);
    if (!doneRef.current) {
      progressRef.current = 0;
      setProgress(0);
    }
  }, [path, vertical, irect.w, irect.h]);

  function startSplit(): void {
    const t0 = Date.now();
    void audioService.playEffect('soft-chime');
    const anim = (): void => {
      const raw = Math.min(1, (Date.now() - t0) / 700);
      setSplitK(raw * raw * (3 - 2 * raw)); // smoothstep tip-open
      if (raw < 1) requestAnimationFrame(anim);
    };
    requestAnimationFrame(anim);
    props.onComplete({ attempts: 1, hintCount: 0, accuracyScore: null });
  }

  function step(pt: Pt): void {
    const s = session.current;
    if (!s || doneRef.current) return;
    const res = s.addPoint(pt);
    if (res.onPath && res.pathPosition > progressRef.current) {
      progressRef.current = res.pathPosition;
      setProgress(res.pathPosition);
      const idx = Math.min(path.length - 1, Math.floor(res.pathPosition * (path.length - 1)));
      const cx = path[idx]!.x;
      if (Math.abs(cx - lastSnip.current) > 22) {
        lastSnip.current = cx;
        setSnipOpen((o) => !o);
        void audioService.playEffect('gentle-pop');
      }
      if (res.pathPosition > 0.92) {
        doneRef.current = true;
        setDone(true);
        startSplit();
      }
    }
  }

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !doneRef.current,
        onMoveShouldSetPanResponder: () => !doneRef.current,
        onPanResponderGrant: (e) => step({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY }),
        onPanResponderMove: (e) => step({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY }),
        onPanResponderRelease: () => {},
      }),
    // Built once; the session + refs carry the moving state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // A Skia clip polygon for one half of the picture, matching the demo's half().
  function halfClip(side: 'top' | 'bottom' | 'left' | 'right') {
    const clip = Skia.Path.Make();
    if (vertical) {
      const outX = side === 'left' ? irect.x - 60 : irect.x + irect.w + 60;
      clip.moveTo(outX, irect.y - 60);
      for (const pt of path) clip.lineTo(pt.x, pt.y);
      clip.lineTo(outX, irect.y + irect.h + 60);
    } else if (side === 'top') {
      clip.moveTo(irect.x - 60, irect.y - 60);
      clip.lineTo(irect.x + irect.w + 60, irect.y - 60);
      for (let i = path.length - 1; i >= 0; i--) clip.lineTo(path[i]!.x, path[i]!.y);
    } else {
      clip.moveTo(irect.x + irect.w + 60, irect.y + irect.h + 60);
      clip.lineTo(irect.x - 60, irect.y + irect.h + 60);
      for (const pt of path) clip.lineTo(pt.x, pt.y);
    }
    clip.close();
    return clip;
  }

  // Outward tip-and-slide transform for a half (owner: pieces flop open).
  // Always returns an array (identity when unsplit) so the Group prop is never
  // `undefined` (exactOptionalPropertyTypes).
  function halfTransform(side: 'top' | 'bottom' | 'left' | 'right') {
    if (splitK <= 0) return [{ translateX: 0 }];
    const dir = side === 'top' || side === 'left' ? -1 : 1;
    const mid = path[Math.floor(path.length / 2)] ?? { x: irect.x + irect.w / 2, y: irect.y + irect.h / 2 };
    const tx = dir * splitK * Math.min(30, irect.w * 0.06);
    const ty = vertical ? 0 : dir * splitK * Math.min(20, irect.h * 0.05);
    const rot = dir * splitK * 0.11;
    return [
      { translateX: tx },
      { translateY: ty },
      { translateX: mid.x },
      { translateY: mid.y },
      { rotate: rot },
      { translateX: -mid.x },
      { translateY: -mid.y },
    ];
  }

  // The dotted line, drawn ahead of the cut only (from the current index on).
  const dashPath = useMemo(() => {
    const cutIdx = Math.max(0, Math.floor(progress * (path.length - 1)));
    const d = Skia.Path.Make();
    if (cutIdx >= path.length - 1) return d;
    d.moveTo(path[cutIdx]!.x, path[cutIdx]!.y);
    for (let i = cutIdx + 1; i < path.length; i++) d.lineTo(path[i]!.x, path[i]!.y);
    return d;
  }, [progress, path]);

  // The white "paper opening" sliver behind the blades (already-cut part).
  const cutPath = useMemo(() => {
    const cutIdx = Math.max(0, Math.floor(progress * (path.length - 1)));
    const c = Skia.Path.Make();
    if (cutIdx <= 0) return c;
    c.moveTo(path[0]!.x, path[0]!.y);
    for (let i = 1; i <= cutIdx; i++) c.lineTo(path[i]!.x, path[i]!.y);
    return c;
  }, [progress, path]);

  // Scissors position + rotation along the path.
  const scissors = useMemo(() => {
    const idx = Math.min(path.length - 1, Math.floor(progress * (path.length - 1)));
    const a = path[idx] ?? { x: irect.x, y: irect.y };
    const b = path[Math.min(path.length - 1, idx + 1)] ?? a;
    const ang = Math.atan2(b.y - a.y, b.x - a.x) + Math.PI / 2;
    return { x: a.x, y: a.y, ang };
  }, [progress, path, irect.x, irect.y]);

  const sides = vertical ? (['left', 'right'] as const) : (['top', 'bottom'] as const);
  const blade = snipOpen ? scissorsOpen : scissorsClosed;
  const scW = 74, scH = 92;

  return (
    <View style={styles.root}>
      <View
        style={styles.canvasWrap}
        onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        {...pan.panHandlers}
      >
        <Canvas style={styles.canvas}>
          {picture &&
            sides.map((side) => (
              <Group key={side} clip={halfClip(side)} transform={halfTransform(side)}>
                <SkiaImage image={picture} x={irect.x} y={irect.y} width={irect.w} height={irect.h} fit="fill" />
              </Group>
            ))}
          {!done && (
            <Path path={cutPath} color="#FFFFFF" style="stroke" strokeWidth={Math.max(7, irect.h * 0.04)} strokeCap="round" />
          )}
          {!done && (
            <Path path={dashPath} color="rgba(74,59,50,0.5)" style="stroke" strokeWidth={4} strokeCap="round" />
          )}
          {!done && blade && (
            <Group
              transform={[
                { translateX: scissors.x },
                { translateY: scissors.y },
                { rotate: scissors.ang },
                { translateX: -scW / 2 },
                { translateY: -scH * 0.5 },
              ]}
            >
              <SkiaImage image={blade} x={0} y={0} width={scW} height={scH} fit="contain" />
            </Group>
          )}
        </Canvas>
      </View>
      <CompletionBanner visible={done} onDone={props.onDone} colour={props.theme.success} onReplay={props.onReplay} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  canvasWrap: { flex: 1, margin: 8, borderRadius: 16, overflow: 'hidden', backgroundColor: '#FFFFFF' },
  canvas: { flex: 1 },
});
