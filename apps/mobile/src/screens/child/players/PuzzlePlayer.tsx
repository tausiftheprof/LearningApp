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
  const n = rows * cols;
  const GAP = 8, M = 12;

  // Orientation-aware layout (owner direction): in PORTRAIT the board sits on
  // top with the tray below; in LANDSCAPE the board is on the left and the tray
  // on the right — so the puzzle stays big instead of shrinking to a strip. The
  // cell is sized so BOTH the board grid and the whole tray fit on screen with
  // no scrolling (the tray pieces are the same size as the board slots).
  const L = useMemo(() => {
    const landscape = board.w >= board.h;
    let boardR: { x: number; y: number; w: number; h: number };
    let trayR: { x: number; y: number; w: number; h: number };
    if (landscape) {
      const split = Math.round(board.w * 0.62);
      boardR = { x: M, y: M, w: split - 2 * M, h: board.h - 2 * M };
      trayR = { x: split + M, y: M, w: board.w - split - 2 * M, h: board.h - 2 * M };
    } else {
      const split = Math.round(board.h * 0.56);
      boardR = { x: M, y: M, w: board.w - 2 * M, h: split - 2 * M };
      trayR = { x: M, y: split + M, w: board.w - 2 * M, h: board.h - split - 2 * M };
    }
    const boardCell = Math.min(boardR.w / cols, boardR.h / rows);
    // Shrink the cell until the tray grid also fits its region (no scroll).
    let cell = Math.min(boardCell, 170);
    for (; cell >= 34; cell -= 2) {
      const ct = Math.max(1, Math.floor((trayR.w + GAP) / (cell + GAP)));
      const rt = Math.ceil(n / ct);
      if (rt * (cell + GAP) <= trayR.h + GAP) break;
    }
    cell = Math.max(34, cell);
    const gridW = cell * cols, gridH = cell * rows;
    const bx = boardR.x + (boardR.w - gridW) / 2;
    const by = boardR.y + (boardR.h - gridH) / 2;
    const trayCols = Math.max(1, Math.floor((trayR.w + GAP) / (cell + GAP)));
    const trayRows = Math.ceil(n / trayCols);
    const trayGW = trayCols * (cell + GAP) - GAP, trayGH = trayRows * (cell + GAP) - GAP;
    const tx0 = trayR.x + Math.max(0, (trayR.w - trayGW) / 2) + cell / 2;
    const ty0 = trayR.y + Math.max(0, (trayR.h - trayGH) / 2) + cell / 2;
    return { cell, bx, by, trayCols, tx0, ty0, ghost: { x: bx, y: by, w: gridW, h: gridH } };
  }, [board.w, board.h, cols, rows, n]);

  const cell = L.cell;

  // Snap tolerance scales with the DRAWN piece (fixed design-space px were far
  // smaller than a big tablet piece, so pieces "wouldn't stick"). Generous by
  // design for 2-7yos: a drop within ~0.9 of a cell of the slot snaps.
  const config = useMemo(() => {
    const frac = props.difficulty === 3 ? 0.8 : 0.95;
    return { ...base, snapRadius: Math.max(52, cell * frac) };
  }, [base, cell, props.difficulty]);

  // A real random scatter, computed once per grid size (stable across resizes).
  const order = useMemo(() => {
    const a = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]!; a[i] = a[j]!; a[j] = t;
    }
    return a;
  }, [n]);

  function slotCentre(row: number, col: number): { x: number; y: number } {
    return { x: L.bx + col * cell + cell / 2, y: L.by + row * cell + cell / 2 };
  }

  const initialPieces = useMemo<PieceView[]>(() => {
    const pieces: PieceView[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const slot = order[idx]!;
        const tc = slot % L.trayCols;
        const tr = Math.floor(slot / L.trayCols);
        pieces.push({
          id: `${r}-${c}`,
          row: r,
          col: c,
          x: L.tx0 + tc * (cell + GAP),
          y: L.ty0 + tr * (cell + GAP),
          placed: false,
          colour: theme.tileColours[idx % theme.tileColours.length]!,
        });
      }
    }
    return pieces;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, L, cell]);

  const [pieces, setPieces] = useState<PieceView[]>(initialPieces);
  const [hintFor, setHintFor] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const session = useRef<PuzzleSession | null>(null);
  const dragging = useRef<string | null>(null);
  const rootRef = useRef<View>(null);
  const boardOrigin = useRef({ x: 0, y: 0 });

  // Refs the ONCE-BUILT pan responder reads, so it never rebuilds mid-drag.
  // (Rebuilding PanResponder while dragging resets its gestureState, so the
  // release coords were garbage and pieces sprang back even when dead-on — the
  // "not sticking" frustration.) All moving values flow through refs.
  const piecesRef = useRef(pieces); piecesRef.current = pieces;
  const cellRef = useRef(cell); cellRef.current = cell;
  const geomRef = useRef(L); geomRef.current = L;
  const doneRef = useRef(done); doneRef.current = done;
  const initialRef = useRef(initialPieces); initialRef.current = initialPieces;

  const slotOf = (row: number, col: number) => {
    const c = cellRef.current, g = geomRef.current;
    return { x: g.bx + col * c + c / 2, y: g.by + row * c + c / 2 };
  };

  React.useEffect(() => {
    setPieces(initialPieces);
    session.current = new PuzzleSession(
      initialPieces.map((p) => ({ id: p.id, target: slotCentre(p.row, p.col) })),
      config,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPieces, config]);

  const pan = useMemo(() => {
    const finishDrag = (g: { moveX: number; moveY: number }) => {
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
          const slot = slotOf(p.row, p.col);
          return { ...p, x: slot.x, y: slot.y, placed: true };
        }));
        if (result.puzzleComplete) {
          setDone(true);
          props.onComplete({ attempts: 1, hintCount: s.hintCount, accuracyScore: null });
        }
      } else {
        const home = initialRef.current.find((i) => i.id === id);
        if (home) setPieces((prev) => prev.map((p) => (p.id === id ? { ...p, x: home.x, y: home.y } : p)));
        setHintFor(result.showHint ? id : null);
      }
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => !doneRef.current,
      onMoveShouldSetPanResponder: () => !doneRef.current,
      onPanResponderTerminationRequest: () => false, // keep the drag once started
      onPanResponderGrant: (_e, g) => {
        // Refresh the board's window origin at grab time (layout may have moved).
        rootRef.current?.measureInWindow((x: number, y: number) => { boardOrigin.current = { x, y }; });
        const c = cellRef.current;
        const lx = g.x0 - boardOrigin.current.x;
        const ly = g.y0 - boardOrigin.current.y;
        const hit = [...piecesRef.current].reverse().find((p) => !p.placed && Math.abs(p.x - lx) < c * 0.7 && Math.abs(p.y - ly) < c * 0.7);
        dragging.current = hit?.id ?? null;
      },
      onPanResponderMove: (_e, g) => {
        const id = dragging.current;
        if (!id) return;
        const lx = g.moveX - boardOrigin.current.x;
        const ly = g.moveY - boardOrigin.current.y;
        setPieces((prev) => prev.map((p) => (p.id === id ? { ...p, x: lx, y: ly } : p)));
      },
      onPanResponderRelease: (_e, g) => finishDrag(g),
      onPanResponderTerminate: (_e, g) => finishDrag(g),
    });
    // Built ONCE — all dynamic state is read through refs above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      {/* Faint whole-picture guide behind the board slots (owner: it was invisible
          at 0.16 — a clearer 0.32 with a soft frame so kids see where it goes). */}
      {picture && (
        <View pointerEvents="none" style={{ position: 'absolute', left: L.ghost.x, top: L.ghost.y, width: L.ghost.w, height: L.ghost.h, opacity: 0.32, borderRadius: 10, borderWidth: 2, borderColor: '#E6DCD3' }}>
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
