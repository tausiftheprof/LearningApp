import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';
import type { JigsawActivity } from '@littlehands/core';
import { PuzzleSession, puzzleConfigFor } from '@littlehands/core';
import type { Theme } from '../../../ui/theme';
import { useAppStore } from '../../../state/appStore';
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
}): React.JSX.Element {
  const { activity, theme } = props;
  const { profile } = useAppStore();
  const [board, setBoard] = useState({ w: 1, h: 1 });

  const cell = Math.min(board.w / activity.cols, (board.h * 0.6) / activity.rows);
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
    const pieces: PieceView[] = [];
    for (let r = 0; r < activity.rows; r++) {
      for (let c = 0; c < activity.cols; c++) {
        pieces.push({
          id: `${r}-${c}`,
          row: r,
          col: c,
          // Tray along the bottom, shuffled deterministically.
          x: 20 + ((r * activity.cols + c) * 90) % Math.max(90, board.w - 120),
          y: board.h * 0.66 + ((r + c) % 2) * 95,
          placed: false,
          colour: theme.tileColours[(r * activity.cols + c) % theme.tileColours.length]!,
        });
      }
    }
    return pieces;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity, board.w, board.h]);

  const [pieces, setPieces] = useState<PieceView[]>(initialPieces);
  const [hintFor, setHintFor] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const session = useRef<PuzzleSession | null>(null);
  const dragging = useRef<string | null>(null);

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
        onPanResponderGrant: (e) => {
          const { locationX, locationY } = e.nativeEvent;
          const hit = [...pieces]
            .reverse()
            .find((p) => !p.placed && Math.abs(p.x - locationX) < cell * 0.6 && Math.abs(p.y - locationY) < cell * 0.6);
          dragging.current = hit?.id ?? null;
        },
        onPanResponderMove: (e) => {
          const id = dragging.current;
          if (!id) return;
          const { locationX, locationY } = e.nativeEvent;
          setPieces((prev) => prev.map((p) => (p.id === id ? { ...p, x: locationX, y: locationY } : p)));
        },
        onPanResponderRelease: (e) => {
          const id = dragging.current;
          dragging.current = null;
          const s = session.current;
          if (!id || !s) return;
          const { locationX, locationY } = e.nativeEvent;
          const result = s.drop(id, { x: locationX, y: locationY });
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
    <View style={styles.root} onLayout={(e) => setBoard({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })} {...pan.panHandlers}>
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
      {/* Pieces */}
      {pieces.map((p) => (
        <View
          key={p.id}
          accessibilityLabel={p.placed ? 'Placed puzzle piece' : 'Puzzle piece'}
          style={[styles.piece, {
            width: cell - 10,
            height: cell - 10,
            left: p.x - cell / 2 + 5,
            top: p.y - cell / 2 + 5,
            backgroundColor: p.colour,
            opacity: p.placed ? 1 : 0.95,
            borderRadius: p.placed ? 6 : 14,
          }]}
        >
          <Text style={styles.pieceLabel}>{p.row * activity.cols + p.col + 1}</Text>
        </View>
      ))}
      <CompletionBanner visible={done} onDone={props.onDone} colour={theme.success} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  slot: { position: 'absolute', borderStyle: 'dashed', borderRadius: 8, backgroundColor: '#FAF3EC' },
  piece: { position: 'absolute', alignItems: 'center', justifyContent: 'center', elevation: 3 },
  pieceLabel: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
});
