import type { DifficultyLevel, Point } from '../types';

/**
 * Tracing corridor engine (FR-005, assumption A-09).
 *
 * The child traces a polyline path. We score each sampled touch point by its
 * distance to the path ("corridor"). The activity never fails: low accuracy
 * triggers encouragement and, after three low-accuracy attempts, an automatic
 * demonstration replay (PRD sections 6.2, 9, 27).
 *
 * All geometry is in the activity design space (0..1000); the UI maps touches
 * into this space, so corridor widths behave identically on every screen size.
 */

export interface TracingConfig {
  /** Corridor half-width in design units. */
  corridorWidth: number;
  /** Fraction of path that must be covered to complete (0..1). */
  coverageToComplete: number;
  /** Minimum fraction of sampled points that must be inside the corridor. */
  onPathTarget: number;
  /** Low-accuracy attempts before the demo replays automatically. */
  attemptsBeforeDemo: number;
  /** Beginner traces in any direction; higher levels expect start-to-end flow. */
  directionAgnostic: boolean;
}

/** Corridor widths per difficulty, in design units (A-09; tuned in child testing). */
export function tracingConfigFor(
  level: DifficultyLevel,
  options?: { accessibilityWiderCorridor?: boolean },
): TracingConfig {
  // Wider corridors (owner request) so the traceable band is thick enough for
  // small/chunky fingers; also widens the drawn guide on both renderers.
  const widths: Record<DifficultyLevel, number> = { 1: 120, 2: 92, 3: 68 };
  const widen = options?.accessibilityWiderCorridor ? 1.5 : 1;
  return {
    corridorWidth: widths[level] * widen,
    // Raised after owner feedback that completion fired too early: the child
    // must now cover almost the whole path AND reach both ends (see addPoint).
    coverageToComplete: level === 1 ? 0.85 : level === 2 ? 0.9 : 0.92,
    onPathTarget: 0.8,
    attemptsBeforeDemo: 3,
    directionAgnostic: level === 1,
  };
}

function distSq(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/** Distance from point to segment, plus the projected parametric position on the segment. */
function pointToSegment(p: Point, a: Point, b: Point): { dist: number; t: number } {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lenSq = abx * abx + aby * aby;
  if (lenSq === 0) return { dist: Math.sqrt(distSq(p, a)), t: 0 };
  let t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const proj = { x: a.x + t * abx, y: a.y + t * aby };
  return { dist: Math.sqrt(distSq(p, proj)), t };
}

interface PathGeometry {
  points: Point[];
  segmentLengths: number[];
  totalLength: number;
  cumulative: number[];
}

function buildGeometry(path: Point[]): PathGeometry {
  const segmentLengths: number[] = [];
  const cumulative: number[] = [0];
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const len = Math.sqrt(distSq(path[i]!, path[i + 1]!));
    segmentLengths.push(len);
    total += len;
    cumulative.push(total);
  }
  return { points: path, segmentLengths, totalLength: total, cumulative };
}

export interface TracePointResult {
  onPath: boolean;
  /** 0..1 arc-length position of the nearest path point. */
  pathPosition: number;
  /** 0..1 fraction of the path covered so far this attempt. */
  coverage: number;
  completed: boolean;
}

export interface AttemptSummary {
  accuracyScore: number; // 0..100 aggregate; stored - raw points are NOT (C-14)
  coverage: number;
  completed: boolean;
  attemptNumber: number;
  /** True when the UI should replay the demonstration before the next attempt. */
  showDemo: boolean;
}

const MAX_COVERAGE_BUCKETS = 100;
const MIN_COVERAGE_BUCKETS = 6;
const DESIGN_UNITS_PER_BUCKET = 25;

export class TracingSession {
  private readonly geometry: PathGeometry;
  private readonly config: TracingConfig;
  /**
   * Coverage resolution scales with stroke length: a long letter stroke gets
   * up to 100 buckets, a short one (a lowercase bowl, the dot on an "i")
   * proportionally fewer. Fixed 100-bucket resolution made short strokes
   * impossible to complete - the "small letters not working" defect.
   */
  private readonly bucketCount: number;
  private covered: boolean[] = [];
  private sampled = 0;
  private onPathCount = 0;
  private attemptNumber = 1;
  private lowAccuracyAttempts = 0;
  private completedFlag = false;
  private lastBucket: number | null = null;
  private lastTouch: Point | null = null;

  constructor(path: Point[], config: TracingConfig) {
    if (path.length < 2) throw new Error('tracing path needs at least 2 points');
    this.geometry = buildGeometry(path);
    this.config = config;
    this.bucketCount = Math.max(
      MIN_COVERAGE_BUCKETS,
      Math.min(MAX_COVERAGE_BUCKETS, Math.round(this.geometry.totalLength / DESIGN_UNITS_PER_BUCKET)),
    );
    this.covered = new Array<boolean>(this.bucketCount).fill(false);
  }

  get attempt(): number {
    return this.attemptNumber;
  }

  /** Feed one sampled touch point (UI samples at ~30 Hz while the finger is down). */
  addPoint(p: Point): TracePointResult {
    let best = { dist: Number.POSITIVE_INFINITY, position: 0 };
    const g = this.geometry;
    for (let i = 0; i < g.points.length - 1; i++) {
      const r = pointToSegment(p, g.points[i]!, g.points[i + 1]!);
      if (r.dist < best.dist) {
        const arc = g.cumulative[i]! + r.t * g.segmentLengths[i]!;
        best = { dist: r.dist, position: g.totalLength === 0 ? 0 : arc / g.totalLength };
      }
    }
    const onPath = best.dist <= this.config.corridorWidth;
    this.sampled++;
    if (onPath) {
      this.onPathCount++;
      const n = this.bucketCount;
      const bucket = Math.min(n - 1, Math.floor(best.position * n));
      // Bridge only the gap the finger PHYSICALLY swept: the allowed bucket
      // jump is bounded by how far the touch point actually moved. This keeps
      // fast strokes credited while rejecting nearest-point flips across a
      // narrow shape (tight lowercase bowls project ambiguously - crediting
      // those flips is what made "good job" fire early; refusing all wide
      // jumps is what made small letters uncompletable).
      const bucketLen = this.geometry.totalLength / n;
      const moved = this.lastTouch === null ? 0 : Math.sqrt(distSq(p, this.lastTouch));
      const allowedJump = Math.ceil(moved / bucketLen) + 2;
      if (this.lastBucket !== null && Math.abs(bucket - this.lastBucket) <= allowedJump) {
        const [lo, hi] = bucket > this.lastBucket ? [this.lastBucket, bucket] : [bucket, this.lastBucket];
        for (let b = lo; b <= hi; b++) this.covered[b] = true;
      } else {
        this.covered[bucket] = true;
      }
      this.lastBucket = bucket;
      this.lastTouch = p;
    } else {
      this.lastBucket = null; // leaving the corridor breaks the sweep bridge
      this.lastTouch = p;
    }
    const coverage = this.coverage();
    // Completion needs near-full coverage AND both ends of the path reached -
    // stopping halfway can never celebrate early again.
    const w = this.bucketCount >= 50 ? 3 : 2;
    const startReached = this.covered.slice(0, w).some(Boolean);
    const endReached = this.covered.slice(this.bucketCount - w).some(Boolean);
    if (coverage >= this.config.coverageToComplete && startReached && endReached) {
      this.completedFlag = true;
    }
    return { onPath, pathPosition: best.position, coverage, completed: this.completedFlag };
  }

  coverage(): number {
    return this.covered.filter(Boolean).length / this.bucketCount;
  }

  onPathRatio(): number {
    return this.sampled === 0 ? 1 : this.onPathCount / this.sampled;
  }

  get completed(): boolean {
    return this.completedFlag;
  }

  /**
   * End the current attempt (finger lifted / child pressed restart).
   * Never returns failure language - the caller maps low accuracy to
   * encouragement copy via the feedback registry (FR-015).
   */
  endAttempt(): AttemptSummary {
    const coverage = this.coverage();
    const onPathRatio = this.onPathRatio();
    const accuracyScore = Math.round(100 * (0.6 * onPathRatio + 0.4 * coverage));
    const completed = this.completedFlag;
    const lowAccuracy = !completed && onPathRatio < this.config.onPathTarget;
    if (lowAccuracy) this.lowAccuracyAttempts++;
    const showDemo = lowAccuracy && this.lowAccuracyAttempts >= this.config.attemptsBeforeDemo;
    const summary: AttemptSummary = {
      accuracyScore,
      coverage,
      completed,
      attemptNumber: this.attemptNumber,
      showDemo,
    };
    if (!completed) {
      this.attemptNumber++;
      this.resetProgress();
      if (showDemo) this.lowAccuracyAttempts = 0;
    }
    return summary;
  }

  restart(): void {
    this.attemptNumber++;
    this.resetProgress();
  }

  private resetProgress(): void {
    this.covered = new Array<boolean>(this.bucketCount).fill(false);
    this.sampled = 0;
    this.onPathCount = 0;
    this.completedFlag = false;
    this.lastBucket = null;
    this.lastTouch = null;
  }
}
