import { DrawingSession, PALETTES } from '../src/drawing/drawing';
import {
  allFeedbackPhrases,
  pickFeedback,
  validateRegistry,
  violatesTone,
} from '../src/feedback/feedback';
import { deleteAllChildData, verifyNoChildDataRemains } from '../src/deletion/deletion';
import { inMemoryRepositories } from '../src/storage/memory';
import { createProfile } from '../src/profiles/profile';
import { emptyRewardsState } from '../src/rewards/rewardsEngine';
import { emptyScreenTime } from '../src/screenTime/screenTime';

describe('drawing session (FR-003, PRD section 27 acceptance criteria)', () => {
  const stroke = (x: number) => ({
    kind: 'stroke' as const,
    stroke: {
      brush: { kind: 'crayon' as const, colour: '#E53935', size: 'medium' as const },
      points: [{ x, y: 0 }, { x: x + 10, y: 10 }],
    },
  });

  it('supports undo and redo correctly', () => {
    const s = new DrawingSession();
    s.apply(stroke(1));
    s.apply(stroke(2));
    expect(s.undo()).toBe(true);
    expect(s.operations).toHaveLength(1);
    expect(s.redo()).toBe(true);
    expect(s.operations).toHaveLength(2);
  });

  it('a new stroke clears the redo stack', () => {
    const s = new DrawingSession();
    s.apply(stroke(1));
    s.undo();
    s.apply(stroke(2));
    expect(s.canRedo).toBe(false);
  });

  it('clear is itself undoable and hides earlier work until undone', () => {
    const s = new DrawingSession();
    s.apply(stroke(1));
    s.clear();
    expect(s.visibleOps()).toHaveLength(0);
    s.undo();
    expect(s.visibleOps()).toHaveLength(1);
  });

  it('replays the drawing as incremental frames (PRD 6.2 replay animation)', () => {
    const s = new DrawingSession();
    s.apply(stroke(1));
    s.apply(stroke(2));
    const frames = s.replayFrames();
    expect(frames).toHaveLength(2);
    expect(frames[0]!).toHaveLength(1);
    expect(frames[1]!).toHaveLength(2);
  });

  it('round-trips through the gallery document format', () => {
    const s = new DrawingSession();
    s.apply(stroke(1));
    const doc = s.toDocument('art1', 'child1', 42);
    const restored = DrawingSession.fromDocument(doc);
    expect(restored.operations).toEqual(s.operations);
  });

  it('ships pastel and high-contrast palettes (FR-003/FR-023)', () => {
    expect(PALETTES.pastel.length).toBeGreaterThan(0);
    expect(PALETTES['high-contrast'].length).toBeGreaterThan(0);
  });
});

describe('feedback registry (FR-015)', () => {
  it('contains no banned negative or pressure language', () => {
    expect(validateRegistry()).toEqual([]);
  });
  it('flags banned words', () => {
    expect(violatesTone('That was wrong!')).toBe('wrong');
    expect(violatesTone('Hurry, last chance to play!')).not.toBeNull();
    expect(violatesTone('Great work!')).toBeNull();
  });
  it('every phrase is short and child-friendly', () => {
    for (const phrase of allFeedbackPhrases()) {
      expect(phrase.split(' ').length).toBeLessThanOrEqual(10);
    }
  });
  it('picks deterministic feedback with an injected rng', () => {
    expect(pickFeedback('completed', () => 0)).toBe('Great work!');
  });
});

describe('child-data deletion (FR-018/FR-025, docs/07 section 7.4)', () => {
  it('wipes profile, progress, rewards, artwork and screen time in one operation', async () => {
    const repos = inMemoryRepositories();
    const profile = createProfile({ nickname: 'Sunny', ageBand: '3-5' }, 'child1', 1);
    await repos.profiles.save(profile);
    await repos.progress.save({
      id: 'r1', profileId: 'child1', activityId: 'trace-circle', category: 'tracing',
      startedAt: 1, completedAt: 2, attempts: 1, hintCount: 0, accuracyScore: 90, durationSeconds: 30,
    });
    await repos.rewards.save('child1', emptyRewardsState('2026-07-15'));
    await repos.artwork.save({ id: 'art1', profileId: 'child1', createdAt: 1, ops: [] });
    await repos.screenTime.save('child1', emptyScreenTime(15));

    const summary = await deleteAllChildData(repos, 'child1');

    expect(summary).toEqual({
      profileDeleted: true,
      progressRecordsDeleted: 1,
      artworkDeleted: 1,
      rewardsCleared: true,
      screenTimeCleared: true,
    });
    expect(await verifyNoChildDataRemains(repos, 'child1')).toBe(true);
  });

  it('does not touch other profiles', async () => {
    const repos = inMemoryRepositories();
    await repos.profiles.save(createProfile({ nickname: 'A', ageBand: '2-3' }, 'c1', 1));
    await repos.profiles.save(createProfile({ nickname: 'B', ageBand: '5-7' }, 'c2', 1));
    await repos.artwork.save({ id: 'art2', profileId: 'c2', createdAt: 1, ops: [] });

    await deleteAllChildData(repos, 'c1');

    expect(await repos.profiles.get('c2')).not.toBeNull();
    expect(await repos.artwork.forProfile('c2')).toHaveLength(1);
    expect(await verifyNoChildDataRemains(repos, 'c1')).toBe(true);
  });

  it('is safe to run twice (idempotent for the parent)', async () => {
    const repos = inMemoryRepositories();
    await repos.profiles.save(createProfile({ nickname: 'A', ageBand: '2-3' }, 'c1', 1));
    await deleteAllChildData(repos, 'c1');
    const second = await deleteAllChildData(repos, 'c1');
    expect(second.profileDeleted).toBe(false);
    expect(await verifyNoChildDataRemains(repos, 'c1')).toBe(true);
  });
});
