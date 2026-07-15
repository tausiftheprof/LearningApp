import type { DifficultyLevel, Point } from '../types';

/**
 * Puzzle placement engine (FR-007, PRD sections 6.4 and 27).
 * Snap-assist scales with difficulty; misses trigger a hint (never a failure)
 * after `missesBeforeHint` incorrect drops (C-08: default 3, CMS-tunable).
 */

export interface PuzzleConfig {
  /** Snap radius in design units - piece snaps when dropped this close to its slot. */
  snapRadius: number;
  missesBeforeHint: number;
  rotationEnabled: boolean;
}

export function puzzleConfigFor(
  level: DifficultyLevel,
  overrides?: Partial<PuzzleConfig>,
): PuzzleConfig {
  const base: Record<DifficultyLevel, PuzzleConfig> = {
    1: { snapRadius: 120, missesBeforeHint: 3, rotationEnabled: false },
    2: { snapRadius: 80, missesBeforeHint: 3, rotationEnabled: false },
    3: { snapRadius: 48, missesBeforeHint: 4, rotationEnabled: true },
  };
  return { ...base[level], ...overrides };
}

export interface PuzzlePiece {
  id: string;
  target: Point;
  /** Target rotation in degrees (0 unless rotationEnabled). */
  targetRotation: number;
  placed: boolean;
}

export type DropResult =
  | { kind: 'snapped'; pieceId: string; puzzleComplete: boolean }
  | { kind: 'try-again'; pieceId: string; showHint: boolean; nearestSlot: Point };

export class PuzzleSession {
  private readonly pieces = new Map<string, PuzzlePiece>();
  private readonly config: PuzzleConfig;
  private misses = 0;
  private hintsShown = 0;

  constructor(pieces: Array<{ id: string; target: Point; targetRotation?: number }>, config: PuzzleConfig) {
    if (pieces.length === 0) throw new Error('puzzle needs pieces');
    this.config = config;
    for (const p of pieces) {
      this.pieces.set(p.id, {
        id: p.id,
        target: p.target,
        targetRotation: p.targetRotation ?? 0,
        placed: false,
      });
    }
  }

  get hintCount(): number {
    return this.hintsShown;
  }

  get complete(): boolean {
    return [...this.pieces.values()].every((p) => p.placed);
  }

  placedCount(): number {
    return [...this.pieces.values()].filter((p) => p.placed).length;
  }

  /**
   * Child dropped a piece. Rotation must match within 15 degrees when enabled.
   * A wrong drop is answered with a gentle drift-back and, after enough misses,
   * a hint pulse on the correct slot - no negative feedback (PRD section 27).
   */
  drop(pieceId: string, at: Point, rotation = 0): DropResult {
    const piece = this.pieces.get(pieceId);
    if (!piece) throw new Error(`unknown piece ${pieceId}`);
    if (piece.placed) return { kind: 'snapped', pieceId, puzzleComplete: this.complete };

    const dx = at.x - piece.target.x;
    const dy = at.y - piece.target.y;
    const close = Math.sqrt(dx * dx + dy * dy) <= this.config.snapRadius;
    // Angular distance folded into [0, 180]; aligned when within 15 degrees.
    const angleDiff = Math.abs(
      ((((rotation - piece.targetRotation) % 360) + 540) % 360) - 180,
    );
    const rotationOk = !this.config.rotationEnabled || angleDiff <= 15;

    if (close && rotationOk) {
      piece.placed = true;
      this.misses = 0; // hints reset once the child succeeds
      return { kind: 'snapped', pieceId, puzzleComplete: this.complete };
    }
    this.misses++;
    const showHint = this.misses >= this.config.missesBeforeHint;
    if (showHint) {
      this.hintsShown++;
      this.misses = 0;
    }
    return { kind: 'try-again', pieceId, showHint, nearestSlot: piece.target };
  }
}
