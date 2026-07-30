import React, { useMemo, useRef, useState } from 'react';
import { Image, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import type { JigsawActivity } from '@littlegrip/core';
import { PuzzleSession, puzzleConfigFor } from '@littlegrip/core';
import type { Theme } from '../../../ui/theme';
import { useAppStore } from '../../../state/appStore';
import { puzzleArtFor } from '../../../ui/puzzleArt';
import { CompletionBanner } from '../ActivityPlayerScreen';

/**
 * Jigsaw player (FR-007). Owner picture puzzles slice the real photo into pieces
 * (a faint whole-picture target sits behind the slots); procedural SVG jigsaws
 * fall back to numbered colour tiles. `sizeSelectable` puzzles first ask the
 * child to pick 2×2 / 3×3 / 4×4. The board fills the top of the screen and a
 * tidy shuffled tray sits directly below, both sized to fit (no scrolling).
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
  const picture = puzzleArtFor(activity.image);

  // Size picker for sizeSelectable puzzles (n×n); otherwise the pack's rows/cols.
  const [size, setSize] = useState<number | null>(activity.sizeSelectable ? null : activity.rows);
  const cols = activity.sizeSelectable ? (size ?? 3) : activity.cols;
  const rows = activity.sizeSelectable ? (size ?? 3) : activity.rows;

  if (activity.sizeSelectable && size === null) {
    return (
      <View style={styles.chooser}>
        <Text style={[styles.chooserTitle, { color: theme.text }]}>How many pieces?</Text>
        <View style={styles.chooserRow}>
          {[2, 3, 4].map((n) => (
            <Pressable
              key={n}
              accessibilityRole="button"
              accessibilityLabel={`${n} by ${n}`}
              onPress={() => setSize(n)}
              style={[styles.sizeBtn, { backgroundColor: theme.accent }]}
            >
              <Text style={styles.sizeBtnText}>{n}×{n}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    );
  }

  return <PuzzleBoard key={`${rows}x${cols}`} activity={activity} theme={theme} rows={rows} cols={cols} picture={picture} difficulty={profile?.difficulty ?? 1} onComplete={props.onComplete} onDone={props.onDone} onReplay={props.onReplay} />;
}

interface PieceView {
  id: string;
  row: number;
  col: number;
  x: number;
  y: number;
  placed: boolean;
  colour: string;
}

function PuzzleBoard(props: {
  activity: JigsawActivity;
  theme: Theme;
  rows: number;
  cols: number;
  picture: number | null;
  difficulty: 1 | 2 | 3;
  onComplete: (r: { attempts: number; hintCount: number; accuracyScore: number | null }) => void;
  onDone: () => void;
  onReplay?: (() => void) | undefined;
}): React.JSX.Element {
  const { theme, rows, cols, picture } = props;
  const [board, setBoard] = useState({ w: 1, h: 1 });
  const base = useMemo(() => puzzleConfigFor(props.difficulty), [props.difficulty]);

  const M = 14, TOP = 12, MIDGAP = 22, GAP = 8;
  const availW = Math.max(120, board.w - 2 * M);
  const availH = Math.max(160, board.h - TOP - MIDGAP - 16);
  // Board grid on top, an equal tray-grid below → both fit in the viewport.
  const cell = Math.max(36, Math.min((availW - (cols - 1) * GAP) / cols, availH / (2 * rows), 150));

  // Snap tolerance must scale with the DRAWN piece, not the pack's fixed
  // design-space pixels — on a tablet a 48-80px radius is far smaller than a
  // 150px piece, so a piece that looks placed springs back. Forgiveness is a
  // feature for 2-7yos: a drop within ~0.6-0.9 of a cell of the slot snaps.
  const config = useMemo(() => {
    const frac = props.difficulty === 3 ? 0.65 : props.difficulty === 2 ? 0.8 : 0.95;
    return { ...base, snapRadius: Math.max(44, cell * frac) };
  }, [base, cell, props.difficulty]);

  // A real random scatter, computed once per grid size (stable across resizes).
  const order = useMemo(() => {
    const n = rows * cols;
    const a = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]!; a[i] = a[j]!; a[j] = t;
    }
    return a;
  }, [rows, cols]);

  function slotCentre(row: number, col: number): { x: number; y: number } {
    const gridW = cell * cols;
    const originX = (board.w - gridW) / 2;
    return { x: originX + col * cell + cell / 2, y: TOP + row * cell + cell / 2 };
  }

  const initialPieces = useMemo<PieceView[]>(() => {
    const trayTop = TOP + cell * rows + MIDGAP;
    const trayW = cols * cell + (cols - 1) * GAP;
    const trayX0 = (board.w - trayW) / 2;
    const pieces: PieceView[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const slot = order[idx]!;
        const tc = slot % cols;
        const tr = Math.floor(slot / cols);
        pieces.push({
          id: `${r}-${c}`,
          row: r,
          col: c,
          x: trayX0 + tc * (cell + GAP) + cell / 2,
          y: trayTop + tr * (cell + GAP) + cell / 2,
          placed: false,
          colour: theme.tileColours[idx % theme.tileColours.length]!,
        });
      }
    }
    return pieces;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, board.w, board.h, cell]);

  const [pieces, setPieces] = useState<PieceView[]>(initialPieces);
  const [hintFor, setHintFor] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const session = useRef<PuzzleSession | null>(null);
  const dragging = useRef<string | null>(null);
  const rootRef = useRef<View>(null);
  const boardOrigin = useRef({ x: 0, y: 0 });

  React.useEffect(() => {
    setPieces(initialPieces);
    session.current = new PuzzleSession(
      initialPieces.map((p) => ({ id: p.id, target: slotCentre(p.row, p.col) })),
      config,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPieces]);

  function initialTrayPosition(p: PieceView): { x: number; y: number } {
    const original = initialPieces.find((i) => i.id === p.id)!;
    return { x: original.x, y: original.y };
  }

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !done,
        onMoveShouldSetPanResponder: () => !done,
        onPanResponderGrant: (_e, g) => {
          const lx = g.x0 - boardOrigin.current.x;
          const ly = g.y0 - boardOrigin.current.y;
          const hit = [...pieces].reverse().find((p) => !p.placed && Math.abs(p.x - lx) < cell * 0.6 && Math.abs(p.y - ly) < cell * 0.6);
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
            setPieces((prev) => prev.map((p) => {
              if (p.id !== id) return p;
              const slot = slotCentre(p.row, p.col);
              return { ...p, x: slot.x, y: slot.y, placed: true };
            }));
            if (result.puzzleComplete) {
              setDone(true);
              props.onComplete({ attempts: 1, hintCount: s.hintCount, accuracyScore: null });
            }
          } else {
            setPieces((prev) => prev.map((p) => (p.id === id ? { ...p, ...initialTrayPosition(p) } : p)));
            setHintFor(result.showHint ? id : null);
          }
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pieces, done, cell],
  );

  return (
    <View
      ref={rootRef}
      style={styles.root}
      onLayout={(e) => {
        setBoard({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
        rootRef.current?.measureInWindow((x: number, y: number) => { boardOrigin.current = { x, y }; });
      }}
      {...pan.panHandlers}
    >
      {picture && (
        <View pointerEvents="none" style={{ position: 'absolute', left: (board.w - cell * cols) / 2, top: TOP, width: cell * cols, height: cell * rows, opacity: 0.16 }}>
          <Image source={picture} resizeMode="stretch" style={{ width: '100%', height: '100%', borderRadius: 10 }} />
        </View>
      )}
      {pieces.map((p) => {
        const slot = slotCentre(p.row, p.col);
        const hinted = hintFor === p.id;
        return (
          <View
            key={`slot-${p.id}`}
            style={[styles.slot, { width: cell - 6, height: cell - 6, left: slot.x - cell / 2 + 3, top: slot.y - cell / 2 + 3, borderColor: hinted ? theme.accent : '#D7CCC8', borderWidth: hinted ? 4 : 2 }]}
          />
        );
      })}
      {pieces.map((p) =>
        picture ? (
          <View
            key={p.id}
            accessibilityLabel={p.placed ? 'Placed puzzle piece' : 'Puzzle piece'}
            style={[styles.piece, { width: cell, height: cell, left: p.x - cell / 2, top: p.y - cell / 2, borderRadius: p.placed ? 4 : 10, overflow: 'hidden', borderWidth: p.placed ? 0 : 2, borderColor: '#FFFFFF' }]}
          >
            <Image source={picture} resizeMode="stretch" style={{ position: 'absolute', width: cell * cols, height: cell * rows, left: -p.col * cell, top: -p.row * cell }} />
          </View>
        ) : (
          <View
            key={p.id}
            accessibilityLabel={p.placed ? 'Placed puzzle piece' : 'Puzzle piece'}
            style={[styles.piece, { width: cell - 10, height: cell - 10, left: p.x - cell / 2 + 5, top: p.y - cell / 2 + 5, backgroundColor: p.colour, borderRadius: p.placed ? 6 : 14 }]}
          >
            <Text style={styles.pieceLabel}>{p.row * cols + p.col + 1}</Text>
          </View>
        ),
      )}
      <CompletionBanner visible={done} onDone={props.onDone} colour={theme.success} onReplay={props.onReplay} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  chooser: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  chooserTitle: { fontSize: 26, fontWeight: '800', marginBottom: 20 },
  chooserRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  sizeBtn: { width: 96, height: 96, borderRadius: 20, margin: 12, alignItems: 'center', justifyContent: 'center', elevation: 3 },
  sizeBtnText: { color: '#FFFFFF', fontSize: 26, fontWeight: '800' },
  slot: { position: 'absolute', borderStyle: 'dashed', borderRadius: 8, backgroundColor: '#FAF3EC' },
  piece: { position: 'absolute', alignItems: 'center', justifyContent: 'center', elevation: 3 },
  pieceLabel: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
});
