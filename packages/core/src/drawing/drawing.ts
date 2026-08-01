import type { Point, Timestamp } from '../types';

/**
 * Drawing document model (FR-003, PRD sections 6.2 and 27).
 * Pure data + undo/redo + replay; rendering is the app's Skia layer.
 * Serialised to the device gallery only (A-04) - never uploaded, never logged.
 */

export type BrushKind =
  | 'crayon'
  | 'pencil'
  | 'marker'
  | 'paint'
  | 'glitter'
  | 'rainbow'
  | 'eraser'
  // "Magic drawer" brushes (owner-approved Draw board): a soft neon glow line
  // and two stamp brushes that drop a shape along the path.
  | 'glow'
  | 'stampStar'
  | 'stampHeart';

export interface BrushStyle {
  kind: BrushKind;
  colour: string; // ignored by rainbow (cycles) and eraser
  size: 'small' | 'medium' | 'large';
}

export interface Stroke {
  brush: BrushStyle;
  points: Point[];
}

export interface StickerPlacement {
  stickerId: string;
  at: Point;
  scale: number;
}

export type DrawingOp =
  | { kind: 'stroke'; stroke: Stroke }
  | { kind: 'sticker'; sticker: StickerPlacement }
  | { kind: 'clear' };

export interface DrawingDocument {
  id: string;
  profileId: string;
  createdAt: Timestamp;
  ops: DrawingOp[];
  /** Snapshot image (data URL/base64) for artwork that isn't stroke-based,
   *  e.g. a saved colouring page. Stays on-device like every drawing. */
  png?: string;
}

/** Standard, pastel and high-contrast palettes (FR-003, docs/10 colour rules). */
export const PALETTES: Record<'standard' | 'pastel' | 'high-contrast', readonly string[]> = {
  standard: ['#E53935', '#FB8C00', '#FDD835', '#43A047', '#1E88E5', '#8E24AA', '#6D4C41', '#212121'],
  pastel: ['#F8BBD0', '#FFE0B2', '#FFF9C4', '#C8E6C9', '#BBDEFB', '#E1BEE7', '#D7CCC8', '#CFD8DC'],
  'high-contrast': ['#000000', '#FFFFFF', '#FFD700', '#0000CC', '#CC0000', '#008800'],
};

export class DrawingSession {
  private ops: DrawingOp[] = [];
  private redoStack: DrawingOp[] = [];

  get operations(): readonly DrawingOp[] {
    return this.ops;
  }

  apply(op: DrawingOp): void {
    this.ops.push(op);
    this.redoStack = []; // a new action invalidates redo history
  }

  get canUndo(): boolean {
    return this.ops.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  undo(): boolean {
    const op = this.ops.pop();
    if (!op) return false;
    this.redoStack.push(op);
    return true;
  }

  redo(): boolean {
    const op = this.redoStack.pop();
    if (!op) return false;
    this.ops.push(op);
    return true;
  }

  /** "Clear the page" is itself undoable (a child-kind clear, PRD 6.2). */
  clear(): void {
    this.apply({ kind: 'clear' });
  }

  /** Ops that are visible after honouring the most recent clear. */
  visibleOps(): DrawingOp[] {
    const lastClear = this.ops.map((o) => o.kind).lastIndexOf('clear');
    return lastClear === -1 ? [...this.ops] : this.ops.slice(lastClear + 1);
  }

  /**
   * Replay frames for "watch my drawing again" (PRD 6.2): each frame adds one
   * op; the UI animates stroke points within each frame.
   */
  replayFrames(): DrawingOp[][] {
    const visible = this.visibleOps();
    return visible.map((_, i) => visible.slice(0, i + 1));
  }

  toDocument(id: string, profileId: string, createdAt: Timestamp): DrawingDocument {
    return { id, profileId, createdAt, ops: [...this.ops] };
  }

  static fromDocument(doc: DrawingDocument): DrawingSession {
    const s = new DrawingSession();
    s.ops = [...doc.ops];
    return s;
  }
}
