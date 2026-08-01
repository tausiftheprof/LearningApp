import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Activity } from '@littlegrip/core';
import { defaultAccessibilitySettings } from '@littlegrip/core';
import { useAppStore } from '../../state/appStore';
import { childTheme } from '../../ui/theme';
import { HoldToHomeButton, InstructionBar } from '../../ui/components';
import { UI_ART } from '../../ui/uiArt';
import { audioService } from '../../services/audio';
import { getRepositories } from '../../storage/db';
import { DrawingBoard } from './players/DrawingBoard';
import { GuidedDrawingPlayer } from './players/GuidedDrawingPlayer';
import { TracingPlayer } from './players/TracingPlayer';
import { ColouringPlayer } from './players/ColouringPlayer';
import { PuzzlePlayer } from './players/PuzzlePlayer';
import { GamePlayer } from './players/GamePlayer';
import { CutAlongPlayer } from './players/CutAlongPlayer';

/**
 * Activity player shell (docs/03 S10-S14): instruction bar with replay,
 * hold-to-home, play-time recorded to the screen-time ledger, completion
 * recorded to progress + rewards. Autosave is each player's responsibility.
 */
export function ActivityPlayerScreen(props: { activity: Activity }): React.JSX.Element {
  const { activity } = props;
  const { profile, navigate, recordPlaySeconds, applyReward, catalogue } = useAppStore();

  // Next item in the same tracing section (letters / numbers / shapes), wrapping
  // after the last — so a finished tracing activity flows into the next with no
  // "Home" prompt (owner direction).
  const nextTracing = (): Activity | null => {
    if (activity.type !== 'tracing' || activity.id === 'trace-name') return null;
    const isLetter = /^trace-letter-/.test(activity.id);
    const isNumber = /^trace-number-/.test(activity.id);
    const inSection = (id: string) =>
      isLetter ? /^trace-letter-/.test(id) : isNumber ? /^trace-number-/.test(id) : !/^trace-(letter|number)-/.test(id);
    const seq = catalogue
      .filter((x) => x.type === 'tracing' && inSection(x.id))
      .sort((x, y) => x.id.localeCompare(y.id, undefined, { numeric: true }));
    if (seq.length <= 1) return null;
    const idx = seq.findIndex((x) => x.id === activity.id);
    return idx >= 0 ? seq[(idx + 1) % seq.length]! : null;
  };
  const nextT = nextTracing();
  const theme = childTheme(profile?.accessibility ?? defaultAccessibilitySettings(), profile?.themeId);
  const startedAt = useRef(Date.now());
  const finished = useRef(false);

  useEffect(() => {
    void audioService.playInstruction(activity.instructionAudio);
    const started = startedAt.current;
    return () => {
      void recordPlaySeconds(Math.round((Date.now() - started) / 1000));
    };
  }, [activity, recordPlaySeconds]);

  const complete = useCallback(
    async (result: { attempts: number; hintCount: number; accuracyScore: number | null }) => {
      if (finished.current || !profile) return;
      finished.current = true;
      const repos = await getRepositories();
      const previous = await repos.progress.forProfile(profile.id);
      const previousBest = previous
        .filter((r) => r.activityId === activity.id && r.accuracyScore !== null)
        .reduce<number | undefined>(
          (best, r) => (best === undefined || (r.accuracyScore ?? 0) > best ? (r.accuracyScore ?? 0) : best),
          undefined,
        );
      await repos.progress.save({
        id: `progress-${Date.now()}`,
        profileId: profile.id,
        activityId: activity.id,
        category: activity.category,
        startedAt: startedAt.current,
        completedAt: Date.now(),
        attempts: result.attempts,
        hintCount: result.hintCount,
        accuracyScore: result.accuracyScore,
        durationSeconds: Math.round((Date.now() - startedAt.current) / 1000),
      });
      await applyReward({
        category: activity.category,
        completed: true,
        attempts: result.attempts,
        accuracyScore: result.accuracyScore ?? undefined,
        previousBestAccuracy: previousBest,
      });
      // Soft completion chime (a real bundled arpeggio; see services/audio.ts).
      void audioService.playEffect('soft-chime');
    },
    [activity, profile, applyReward],
  );

  const goHome = useCallback(() => navigate({ name: 'home' }), [navigate]);
  const goBack = useCallback(
    () => navigate({ name: 'picker', category: activity.category }),
    [navigate, activity.category],
  );
  // "Play again" (Option B): bump the key to remount the player fresh.
  const [replayKey, setReplayKey] = useState(0);
  const replay = useCallback(() => setReplayKey((k) => k + 1), []);

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={goBack}
          style={[
            theme.highContrast ? styles.backButton : styles.clayBack,
            { minWidth: theme.childMinTargetDp, minHeight: theme.childMinTargetDp },
            theme.highContrast ? { backgroundColor: theme.surface } : null,
          ]}
        >
          {theme.highContrast ? (
            <Text style={styles.backIcon}>←</Text>
          ) : (
            <Image source={UI_ART.back} resizeMode="contain" style={{ width: theme.childMinTargetDp, height: theme.childMinTargetDp }} />
          )}
        </Pressable>
        <HoldToHomeButton theme={theme} onHome={goHome} />
        <View style={styles.instruction}>
          <InstructionBar
            text={activity.title}
            theme={theme}
            onReplayAudio={() => void audioService.playInstruction(activity.instructionAudio)}
          />
        </View>
      </View>

      {activity.type === 'guided-drawing' && activity.steps.length > 1 && (
        <GuidedDrawingPlayer key={replayKey} activity={activity} theme={theme} onComplete={complete} onDone={goHome} onReplay={replay} />
      )}
      {activity.type === 'guided-drawing' && activity.steps.length <= 1 && (
        <DrawingBoard key={replayKey} activity={activity} theme={theme} onComplete={complete} onDone={goHome} />
      )}
      {activity.type === 'tracing' && (
        <TracingPlayer
          key={replayKey}
          activity={activity}
          theme={theme}
          onComplete={complete}
          onDone={goHome}
          onReplay={replay}
          onAdvance={nextT ? () => navigate({ name: 'activity', activity: nextT }) : undefined}
        />
      )}
      {activity.type === 'colouring' && (
        <ColouringPlayer key={replayKey} activity={activity} theme={theme} onComplete={complete} onDone={goHome} />
      )}
      {activity.type === 'jigsaw' && (
        <PuzzlePlayer key={replayKey} activity={activity} theme={theme} onComplete={complete} onDone={goHome} onReplay={replay} />
      )}
      {activity.type === 'game' && activity.template === 'cut-along' && (
        <CutAlongPlayer key={replayKey} activity={activity} theme={theme} onComplete={complete} onDone={goHome} onReplay={replay} />
      )}
      {activity.type === 'game' && activity.template !== 'cut-along' && (
        <GamePlayer key={replayKey} activity={activity} theme={theme} onComplete={complete} onDone={goHome} onReplay={replay} />
      )}
    </View>
  );
}

/**
 * "Option B" completion (owner-picked): NON-COVERING — a slim top toast
 * celebrates, a bottom countdown auto-returns after ~5s, and (when a replay is
 * wired) a big "Play again" button lets the child stay and go again. The
 * finished work stays fully visible. Back-compatible: players that don't pass
 * `onReplay` just get the toast + auto-return.
 */
export function CompletionBanner(props: {
  visible: boolean;
  onDone: () => void;
  colour: string;
  onReplay?: (() => void) | undefined;
}): React.JSX.Element | null {
  const [count, setCount] = useState(5);
  const { visible, onDone } = props;
  useEffect(() => {
    if (!visible) return;
    setCount(5);
    const iv = setInterval(() => setCount((c) => (c > 1 ? c - 1 : 1)), 1000);
    const to = setTimeout(onDone, 5000);
    return () => {
      clearInterval(iv);
      clearTimeout(to);
    };
  }, [visible, onDone]);
  if (!visible) return null;
  return (
    <>
      <View style={styles.toastWrap} pointerEvents="none">
        <View style={[styles.doneToast, { backgroundColor: props.colour }]} accessibilityLiveRegion="polite">
          <Text style={styles.doneToastText}>🎉 All done!</Text>
        </View>
      </View>
      <View style={styles.doneActions}>
        {props.onReplay ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Play again" onPress={props.onReplay} style={styles.replayPill}>
            <Image source={UI_ART.replay} resizeMode="contain" style={styles.replayArt} />
            <Text style={styles.replayText}>Play again</Text>
          </Pressable>
        ) : null}
        <Pressable accessibilityRole="button" accessibilityLabel="Go home" onPress={props.onDone} style={styles.autoPill}>
          <Text style={styles.autoText}>Going home… {count}</Text>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backButton: { alignItems: 'center', justifyContent: 'center', borderRadius: 999, margin: 8, elevation: 2 },
  clayBack: { alignItems: 'center', justifyContent: 'center', margin: 8 },
  backIcon: { fontSize: 26, fontWeight: '700' },
  topBar: { flexDirection: 'row', alignItems: 'center' },
  instruction: { flex: 1 },
  toastWrap: { position: 'absolute', top: 12, left: 0, right: 0, alignItems: 'center' },
  doneToast: { borderRadius: 999, paddingVertical: 8, paddingHorizontal: 20, shadowColor: '#3B2D2D', shadowOpacity: 0.22, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  doneToastText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  doneActions: { position: 'absolute', bottom: 18, left: 0, right: 0, alignItems: 'center' },
  replayPill: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 999,
    paddingVertical: 8, paddingHorizontal: 22, marginBottom: 9,
    shadowColor: '#3B2D2D', shadowOpacity: 0.26, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  replayArt: { width: 44, height: 44, marginRight: 10 },
  replayText: { fontSize: 20, fontWeight: '800', color: '#E1568F' },
  autoPill: { backgroundColor: 'rgba(255,255,255,0.86)', borderRadius: 999, paddingVertical: 5, paddingHorizontal: 14 },
  autoText: { fontSize: 13, fontWeight: '700', color: '#6A6076' },
});
