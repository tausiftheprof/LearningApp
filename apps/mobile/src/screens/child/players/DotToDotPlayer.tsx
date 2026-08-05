import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import { Canvas, Circle, Group, Image as SkiaImage, Path, Skia, useImage } from '@shopify/react-native-skia';
import type { GameActivity } from '@littlegrip/core';
import type { Theme } from '../../../ui/theme';
import { dotArtFor } from '../../../ui/dotArt';
import { audioService } from '../../../services/audio';
import { CompletionBanner } from '../ActivityPlayerScreen';

interface Pt { x: number; y: number }

/**
 * Picture Dot-to-Dot (owner art, Aug 2026): the numbered dots are printed ON
 * the artwork (a puppy, an elephant), so we blit the raster contain-fit and map
 * each stored dot (a fraction x1000 of the panel) onto that rect. The child
 * taps the printed dots in order; a joining line is drawn as they go and a bold
 * ring marks the NEXT dot. We do NOT stamp our own numbered circles — the
 * picture already prints the numbers. Mirrors the web demo's `printedDots`
 * branch of the `dot-to-dot` renderer (demo-shell.html), ported to Skia.
 *
 * Only the printed-dots picture mode is ported to mobile; the procedural vector
 * dot-to-dots (whale/shapes) stay demo-only and are gated out of the picker.
 */
export function DotToDotPlayer(props: {
  activity: GameActivity;
  theme: Theme;
  onComplete: (r: { attempts: number; hintCount: number; accuracyScore: number | null }) => void;
  onDone: () => void;
  onReplay?: () => void;
}): React.JSX.Element {
  const p = props.activity.params;
  const picture = useImage(dotArtFor(typeof p.image === 'string' ? p.image : undefined) ?? 0);
  const dots = useMemo<Pt[]>(
    () => (Array.isArray(p.dots) ? (p.dots as Pt[]).map((d) => ({ x: d.x, y: d.y })) : []),
    [p.dots],
  );
  const closed = p.closed === true;

  const [size, setSize] = useState({ w: 1, h: 1 });
  const [nextIndex, setNextIndex] = useState(0);
  const [done, setDone] = useState(false);
  const nextRef = useRef(0);
  const doneRef = useRef(false);

  // Force one repaint the moment the picture decodes, so it shows immediately
  // instead of staying blank until the first touch (owner-reported on cut-along).
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (picture) forceTick((t) => t + 1);
  }, [picture]);

  // Contain-fit the panel into the stage, then centre it (letterboxed).
  const irect = useMemo(() => {
    const iw = picture?.width() ?? 2;
    const ih = picture?.height() ?? 1;
    const s = Math.min(size.w / iw, size.h / ih);
    const w = iw * s;
    const h = ih * s;
    return { x: (size.w - w) / 2, y: (size.h - h) / 2, w, h };
  }, [picture, size.w, size.h]);

  const toScreen = (d: Pt): Pt => ({ x: irect.x + (d.x / 1000) * irect.w, y: irect.y + (d.y / 1000) * irect.h });

  // Tap handling — kept in a ref so the once-built PanResponder always calls the
  // latest closure (current irect/dots), never a stale one (the puzzle lesson).
  const handleTap = (x: number, y: number): void => {
    if (doneRef.current || dots.length === 0) return;
    const i = nextRef.current;
    const target = dots[i];
    if (!target) return;
    const s = toScreen(target);
    const tapR = Math.max(30, irect.w * 0.06);
    if (Math.hypot(x - s.x, y - s.y) <= tapR) {
      const ni = i + 1;
      nextRef.current = ni;
      setNextIndex(ni);
      if (ni >= dots.length) {
        doneRef.current = true;
        setDone(true);
        void audioService.playEffect('soft-chime');
        props.onComplete({ attempts: 1, hintCount: 0, accuracyScore: null });
      } else {
        void audioService.playEffect('gentle-pop');
      }
    }
  };
  const tapRef = useRef(handleTap);
  tapRef.current = handleTap;

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !doneRef.current,
        onPanResponderGrant: (e) => tapRef.current(e.nativeEvent.locationX, e.nativeEvent.locationY),
      }),
    // Built once; the refs carry the moving state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const lineW = Math.max(4, irect.w * 0.012);
  const ringBase = Math.max(14, irect.w * 0.028);

  // The joining line through the dots tapped so far.
  const connectPath = useMemo(() => {
    const path = Skia.Path.Make();
    if (nextIndex > 0 && dots.length > 0) {
      const first = toScreen(dots[0]!);
      path.moveTo(first.x, first.y);
      for (let i = 1; i < nextIndex; i++) {
        const s = toScreen(dots[i]!);
        path.lineTo(s.x, s.y);
      }
      if (done && closed && dots.length > 2) {
        const s0 = toScreen(dots[0]!);
        path.lineTo(s0.x, s0.y);
      }
    }
    return path;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextIndex, dots, irect.x, irect.y, irect.w, irect.h, done, closed]);

  const next = !done && dots[nextIndex] ? toScreen(dots[nextIndex]!) : null;

  return (
    <View style={styles.root}>
      <View
        style={styles.canvasWrap}
        onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        {...pan.panHandlers}
      >
        <Canvas style={styles.canvas}>
          {picture && (
            <SkiaImage image={picture} x={irect.x} y={irect.y} width={irect.w} height={irect.h} fit="fill" />
          )}
          <Path path={connectPath} color={props.theme.accent} style="stroke" strokeWidth={lineW} strokeCap="round" strokeJoin="round" />
          {dots.slice(0, nextIndex).map((d, i) => {
            const s = toScreen(d);
            return <Circle key={`done-${i}`} cx={s.x} cy={s.y} r={lineW * 0.9} color="#5FBF6A" />;
          })}
          {next && (
            <Group>
              <Circle cx={next.x} cy={next.y} r={ringBase} color="rgba(232,72,63,0.16)" />
              <Circle cx={next.x} cy={next.y} r={ringBase} color="#E8483F" style="stroke" strokeWidth={Math.max(3, irect.w * 0.008)} />
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
