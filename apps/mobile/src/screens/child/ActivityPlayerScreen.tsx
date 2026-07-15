import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Activity } from '@littlehands/core';
import { defaultAccessibilitySettings, pickFeedback } from '@littlehands/core';
import { useAppStore } from '../../state/appStore';
import { childTheme } from '../../ui/theme';
import { HoldToHomeButton, InstructionBar } from '../../ui/components';
import { audioService } from '../../services/audio';
import { getRepositories } from '../../storage/db';
import { DrawingBoard } from './players/DrawingBoard';
import { TracingPlayer } from './players/TracingPlayer';
import { ColouringPlayer } from './players/ColouringPlayer';
import { PuzzlePlayer } from './players/PuzzlePlayer';
import { GamePlayer } from './players/GamePlayer';

/**
 * Activity player shell (docs/03 S10-S14): instruction bar with replay,
 * hold-to-home, play-time recorded to the screen-time ledger, completion
 * recorded to progress + rewards. Autosave is each player's responsibility.
 */
export function ActivityPlayerScreen(props: { activity: Activity }): React.JSX.Element {
  const { activity } = props;
  const { profile, navigate, recordPlaySeconds, applyReward } = useAppStore();
  const theme = childTheme(profile?.accessibility ?? defaultAccessibilitySettings());
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
      void audioService.playEffect('celebrate');
    },
    [activity, profile, applyReward],
  );

  const goHome = useCallback(() => navigate({ name: 'home' }), [navigate]);

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <HoldToHomeButton theme={theme} onHome={goHome} />
        <View style={styles.instruction}>
          <InstructionBar
            text={activity.title}
            theme={theme}
            onReplayAudio={() => void audioService.playInstruction(activity.instructionAudio)}
          />
        </View>
      </View>

      {activity.type === 'guided-drawing' && (
        <DrawingBoard activity={activity} theme={theme} onComplete={complete} onDone={goHome} />
      )}
      {activity.type === 'tracing' && (
        <TracingPlayer activity={activity} theme={theme} onComplete={complete} onDone={goHome} />
      )}
      {activity.type === 'colouring' && (
        <ColouringPlayer activity={activity} theme={theme} onComplete={complete} onDone={goHome} />
      )}
      {activity.type === 'jigsaw' && (
        <PuzzlePlayer activity={activity} theme={theme} onComplete={complete} onDone={goHome} />
      )}
      {activity.type === 'game' && (
        <GamePlayer activity={activity} theme={theme} onComplete={complete} onDone={goHome} />
      )}
    </View>
  );
}

export function CompletionBanner(props: { visible: boolean; onDone: () => void; colour: string }): React.JSX.Element | null {
  if (!props.visible) return null;
  const phrase = pickFeedback('completed');
  return (
    <View style={[styles.banner, { backgroundColor: props.colour }]} accessibilityLiveRegion="polite">
      <Text style={styles.bannerText}>🎉 {phrase}</Text>
      <Text accessibilityRole="button" accessibilityLabel="Go home" onPress={props.onDone} style={styles.bannerHome}>
        🏠 Home
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center' },
  instruction: { flex: 1 },
  banner: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
  },
  bannerText: { fontSize: 26, fontWeight: '800', color: '#FFFFFF' },
  bannerHome: { fontSize: 20, marginTop: 10, color: '#FFFFFF', fontWeight: '700', padding: 12 },
});
