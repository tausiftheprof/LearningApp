import React, { useMemo, useRef, useState } from 'react';
import { Image, PanResponder, StyleSheet, Text, View } from 'react-native';
import type { JigsawActivity } from '@littlegrip/core';
import { PuzzleSession, puzzleConfigFor } from '@littlegrip/core';
import type { Theme } from '../../../ui/theme';
import { useAppStore } from '../../../state/appStore';
import { puzzleArtFor } from '../../../ui/puzzleArt';
import { CompletionBanner } from '../ActivityPlayerScreen';

/**
 * Jigsaw player (FR-007, docs/03 S13). Pieces are coloured tiles in this
 * scaffold (ILLUSTRATIVE - production picture pieces come from pack images).
 * Core PuzzleSession decides snapping, misses and hints; wrong drops drift
 * back with no negative sound (PRD section 27).
 */
export function PuzzlePlayer(props: {
  activity: JigsawActivity;
  theme: Theme;
  onComplete: (r: { attempts: number; hintCount: number; accuracyScore: number | null }) => void;
  onDone: () => void;
  onReplay?: () => void;
}): React.JSX.Element {
  const { activity, theme } = props;
  const { profile } = useAppStore();
  const [board, setBoard] = useState({ w: 1, h: 1 });
  // Owner picture puzzles slice a real image into pieces; procedural (SVG)
  // jigsaws with no bundled photo fall back to the coloured-tile scaffold.
  const picture = puzzleArtFor(activity.image);

  // Board fills the top ~half; the piece tray sits below it. Cell is capped so a
  // 2-piece-wide puzzle doesn't blow up to giant pieces on a big tablet.
  const M = 14;
  const cell = Math.max(
    44,
    Math.min((board.w - 2 * M) / activity.cols, (board.h * 0.5) / activity.rows, 168),
  );
  const config = useMemo(() => puzzleConfigFor(profile?.difficulty ?? 1), [profile]);

  interface PieceView {
    id: string;
    row: number;
    col: number;
    x: number;
    y: number;
    placed: boolean;
    colour: string;
  }

  const initialPieces = useMemo<PieceView[]>(() => {
    const n = activity.rows * activity.cols;
    // Deterministic shuffle of the tray order so pieces aren't already in place.
    const order = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = (i * 7 + 3) % (i + 1);
      const t = order[i]!; order[i] = order[j]!; order[j] = t;
    }
    // A tidy, non-overlapping grid tray centred below the board.
    const gap = 14;
    const trayCols = Math.max(1, Math.floor((board.w - 2 * M + gap) / (cell + gap)));
    const trayW = trayCols * cell + (trayCols - 1) * gap;
    const trayX0 = (board.w - trayW) / 2;
    const trayTop = 16 + cell * activity.rows + 30;
    const pieces: PieceView[] = [];
    for (let r = 0; r < activity.rows; r++) {
      for (let c = 0; c < activity.cols; c++) {
        const idx = r * activity.cols + c;
        const slot = order[idx]!;
        const tc = slot % trayCols;
        const tr = Math.floor(slot / trayCols);
        pieces.push({
          id: `${r}-${c}`,
          row: r,
          col: c,
          x: trayX0 + tc * (cell + gap) + cell / 2,
          y: trayTop + tr * (cell + gap) + cell / 2,
          placed: false,
          colour: theme.tileColours[idx % theme.tileColours.length]!,
        });
      }
    }
    return pieces;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity, board.w, board.h, cell]);

  const [pieces, setPieces] = useState<PieceView[]>(initialPieces);
  const [hintFor, setHintFor] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const session = useRef<PuzzleSession | null>(null);
  const dragging = useRef<string | null>(null);
  // Board's absolute (window) origin, so we can turn gesture page coords into
  // board-local coords. locationX/Y is relative to the touched child (a piece),
  // which is why hit-testing with it never matched — pieces wouldn't move.
  const rootRef = useRef<View>(null);
  const boardOrigin = useRef({ x: 0, y: 0 });

  // (Re)build the session once layout is known.
  React.useEffect(() => {
    setPieces(initialPieces);
    session.current = new PuzzleSession(
      initialPieces.map((p) => ({ id: p.id, target: slotCentre(p.row, p.col) })),
      config,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPieces]);

  function slotCentre(row: number, col: number): { x: number; y: number } {
    const originX = (board.w - cell * activity.cols) / 2;
    return { x: originX + col * cell + cell / 2, y: 16 + row * cell + cell / 2 };
  }

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !done,
        onMoveShouldSetPanResponder: () => !done,
        onPanResponderGrant: (_e, g) => {
          const lx = g.x0 - boardOrigin.current.x;
          const ly = g.y0 - boardOrigin.current.y;
          const hit = [...pieces]
            .reverse()
            .find((p) => !p.placed && Math.abs(p.x - lx) < cell * 0.6 && Math.abs(p.y - ly) < cell * 0.6);
          dragging.current = hit?.id ?? null;
        },
        onPanResponderMove: (_e, g) => {
          const id = dragging.current;
          if (!id) return;
          const lx = g.moveX - boardOrigin.current.x;
          const ly = g.moveY - boardOrigin.current.y;
          setPieces((prev) => prev.map((p) => (p.id === id ? { ...p, x: lx, y: ly } : p)));
        },
        onPanResponderRelease: (_e, g) => {
          const id = dragging.current;
          dragging.current = null;
          const s = session.current;
          if (!id || !s) return;
          const lx = g.moveX - boardOrigin.current.x;
          const ly = g.moveY - boardOrigin.current.y;
          const result = s.drop(id, { x: lx, y: ly });
          if (result.kind === 'snapped') {
            setHintFor(null);
            setPieces((prev) =>
              prev.map((p) => {
                if (p.id !== id) return p;
                const slot = slotCentre(p.row, p.col);
                return { ...p, x: slot.x, y: slot.y, placed: true };
              }),
            );
            if (result.puzzleComplete) {
              setDone(true);
              props.onComplete({ attempts: 1, hintCount: s.hintCount, accuracyScore: null });
            }
          } else {
            // Gentle drift back to the tray; hint pulse when earned.
            setPieces((prev) => prev.map((p) => (p.id === id ? { ...p, ...initialTrayPosition(p) } : p)));
            setHintFor(result.showHint ? id : null);
          }
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pieces, done, cell],
  );

  function initialTrayPosition(p: PieceView): { x: number; y: number } {
    const original = initialPieces.find((i) => i.id === p.id)!;
    return { x: original.x, y: original.y };
  }

  return (
    <View
      ref={rootRef}
      style={styles.root}
      onLayout={(e) => {
        setBoard({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
        rootRef.current?.measureInWindow((x, y) => { boardOrigin.current = { x, y }; });
      }}
      {...pan.panHandlers}
    >
      {/* Faint whole-picture target behind the slots, so the goal is visible */}
      {picture && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: (board.w - cell * activity.cols) / 2,
            top: 16,
            width: cell * activity.cols,
            height: cell * activity.rows,
            opacity: 0.16,
          }}
        >
          <Image source={picture} resizeMode="stretch" style={{ width: '100%', height: '100%', borderRadius: 10 }} />
        </View>
      )}
      {/* Board slots */}
      {pieces.map((p) => {
        const slot = slotCentre(p.row, p.col);
        const hinted = hintFor === p.id;
        return (
          <View
            key={`slot-${p.id}`}
            style={[styles.slot, {
              width: cell - 6,
              height: cell - 6,
              left: slot.x - cell / 2 + 3,
              top: slot.y - cell / 2 + 3,
              borderColor: hinted ? theme.accent : '#D7CCC8',
              borderWidth: hinted ? 4 : 2,
            }]}
          />
        );
      })}
      {/* Pieces — a slice of the real picture, or a numbered colour tile */}
      {pieces.map((p) =>
        picture ? (
          <View
            key={p.id}
            accessibilityLabel={p.placed ? 'Placed puzzle piece' : 'Puzzle piece'}
            style={[styles.piece, {
              width: cell,
              height: cell,
              left: p.x - cell / 2,
              top: p.y - cell / 2,
              borderRadius: p.placed ? 4 : 10,
              overflow: 'hidden',
              borderWidth: p.placed ? 0 : 2,
              borderColor: '#FFFFFF',
            }]}
          >
            <Image
              source={picture}
              resizeMode="stretch"
              style={{
                position: 'absolute',
                width: cell * activity.cols,
                height: cell * activity.rows,
                left: -p.col * cell,
                top: -p.row * cell,
              }}
            />
          </View>
        ) : (
          <View
            key={p.id}
            accessibilityLabel={p.placed ? 'Placed puzzle piece' : 'Puzzle piece'}
            style={[styles.piece, {
              width: cell - 10,
              height: cell - 10,
              left: p.x - cell / 2 + 5,
              top: p.y - cell / 2 + 5,
              backgroundColor: p.colour,
              borderRadius: p.placed ? 6 : 14,
            }]}
          >
            <Text style={styles.pieceLabel}>{p.row * activity.cols + p.col + 1}</Text>
          </View>
        ),
      )}
      <CompletionBanner visible={done} onDone={props.onDone} colour={theme.success} onReplay={props.onReplay} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  slot: { position: 'absolute', borderStyle: 'dashed', borderRadius: 8, backgroundColor: '#FAF3EC' },
  piece: { position: 'absolute', alignItems: 'center', justifyContent: 'center', elevation: 3 },
  pieceLabel: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
});
