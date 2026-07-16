import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import type { ParentReport } from '@littlegrip/core';
import {
  APP_THEMES,
  buildParentReport,
  dayKeyFrom,
  grantExtraTime,
  secondsUsed,
  themeById,
} from '@littlegrip/core';
import { useAppStore } from '../../state/appStore';
import { getRepositories } from '../../storage/db';
import { parentTheme } from '../../ui/theme';
import { ParentRow, PrimaryButton } from '../../ui/components';

type Section =
  | 'dashboard' | 'profile' | 'progress' | 'screen-time'
  | 'accessibility' | 'privacy' | 'subscription' | 'help';

/**
 * Parent area (FR-018, docs/03 S20-S29). Visually distinct standard UI
 * (PRD section 13). Reached only through the gate; leaving relocks it
 * (handled in the store's navigate()).
 */
export function ParentAreaScreen(props: { section: Section }): React.JSX.Element {
  const { navigate, gateTouch } = useAppStore();
  const theme = parentTheme;

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]} onTouchStart={gateTouch}>
      <View style={styles.topBar}>
        {props.section !== 'dashboard' && (
          <Text
            accessibilityRole="button"
            accessibilityLabel="Back to parent dashboard"
            onPress={() => navigate({ name: 'parent', section: 'dashboard' })}
            style={styles.backLink}
          >
            ← Dashboard
          </Text>
        )}
        <Text
          accessibilityRole="button"
          accessibilityLabel="Exit to child home"
          onPress={() => navigate({ name: 'home' })}
          style={styles.exitLink}
        >
          Exit to child mode ✕
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {props.section === 'dashboard' && <Dashboard />}
        {props.section === 'profile' && <ProfileSection />}
        {props.section === 'progress' && <ProgressSection />}
        {props.section === 'screen-time' && <ScreenTimeSection />}
        {props.section === 'accessibility' && <AccessibilitySection />}
        {props.section === 'privacy' && <PrivacySection />}
        {props.section === 'subscription' && <SubscriptionSection />}
        {props.section === 'help' && <HelpSection />}
      </ScrollView>
    </View>
  );
}

function Dashboard(): React.JSX.Element {
  const { navigate, screenTime, rewards, profile } = useAppStore();
  const theme = parentTheme;
  const today = secondsUsed(screenTime, dayKeyFrom(new Date()));
  const rows: Array<{ title: string; subtitle: string; section: Section }> = [
    { title: 'Child profile', subtitle: profile ? `${profile.nickname}, ${profile.ageBand} years` : 'Not set up', section: 'profile' },
    { title: 'Progress', subtitle: 'Skills, favourites and suggestions', section: 'progress' },
    { title: 'Screen time', subtitle: `${Math.round(today / 60)} min today`, section: 'screen-time' },
    { title: 'Accessibility', subtitle: 'See, hear, touch and pace settings', section: 'accessibility' },
    { title: 'Privacy & data', subtitle: 'Notice, export and delete', section: 'privacy' },
    { title: 'Subscription', subtitle: 'Free plan', section: 'subscription' },
    { title: 'Help & support', subtitle: 'FAQ, contact, complaints', section: 'help' },
  ];
  return (
    <View>
      <Text style={styles.h1}>Parent dashboard</Text>
      <Text style={styles.stat}>⭐ {rewards.totalStars} stars earned · {Math.round(today / 60)} minutes today</Text>
      {rows.map((row) => (
        <ParentRow key={row.section} title={row.title} subtitle={row.subtitle} theme={theme} onPress={() => navigate({ name: 'parent', section: row.section })} />
      ))}
    </View>
  );
}

function ProfileSection(): React.JSX.Element {
  const { profile, saveProfile } = useAppStore();
  const theme = parentTheme;
  if (!profile) return <Text style={styles.body}>No profile yet.</Text>;
  return (
    <View>
      <Text style={styles.h1}>Child profile</Text>
      <ParentRow title="Nickname" subtitle={profile.nickname} theme={theme} />
      <ParentRow title="Age range" subtitle={`${profile.ageBand} years`} theme={theme} />
      <Text style={styles.h2}>Difficulty</Text>
      {([1, 2, 3] as const).map((level) => (
        <ParentRow
          key={level}
          title={level === 1 ? 'Beginner' : level === 2 ? 'Developing' : 'Confident'}
          theme={theme}
          onPress={() => void saveProfile({ ...profile, difficulty: level })}
          right={<Text style={styles.radio}>{profile.difficulty === level ? '●' : '○'}</Text>}
        />
      ))}
      <Text style={styles.h2}>Handedness (mirrors tool placement)</Text>
      {(['left', 'right'] as const).map((hand) => (
        <ParentRow
          key={hand}
          title={hand === 'left' ? 'Left-handed' : 'Right-handed'}
          theme={theme}
          onPress={() => void saveProfile({ ...profile, handedness: hand })}
          right={<Text style={styles.radio}>{profile.handedness === hand ? '●' : '○'}</Text>}
        />
      ))}
      <Text style={styles.h2}>Theme (how the app looks)</Text>
      {APP_THEMES.map((t) => (
        <ParentRow
          key={t.id}
          title={t.name}
          subtitle={t.blurb}
          theme={theme}
          onPress={() => void saveProfile({ ...profile, themeId: t.id })}
          right={<Text style={styles.radio}>{themeById(profile.themeId).id === t.id ? '●' : '○'}</Text>}
        />
      ))}
      <Text style={styles.h2}>Sound</Text>
      {(['music', 'effects', 'voice'] as const).map((channel) => (
        <ParentRow
          key={channel}
          title={channel === 'music' ? 'Background music' : channel === 'effects' ? 'Sound effects' : 'Voice instructions'}
          theme={theme}
          right={
            <Switch
              accessibilityLabel={channel}
              value={profile.sound[channel]}
              onValueChange={(v) => void saveProfile({ ...profile, sound: { ...profile.sound, [channel]: v } })}
            />
          }
        />
      ))}
    </View>
  );
}

function ProgressSection(): React.JSX.Element {
  const { profile } = useAppStore();
  const [report, setReport] = useState<ParentReport | null>(null);
  useEffect(() => {
    void (async () => {
      if (!profile) return;
      const repos = await getRepositories();
      setReport(buildParentReport(await repos.progress.forProfile(profile.id)));
    })();
  }, [profile]);
  if (!report) return <Text style={styles.body}>Loading…</Text>;
  return (
    <View>
      <Text style={styles.h1}>Progress</Text>
      <Text style={styles.stat}>
        {report.totalCompleted} activities completed · {report.totalMinutes} minutes of play
      </Text>
      {report.tracingTrendLine && <Text style={styles.body}>{report.tracingTrendLine}</Text>}
      {report.byCategory.map((c) => (
        <ParentRow
          key={c.category}
          title={c.category}
          subtitle={`${c.completed}/${c.started} completed${c.averageAccuracy !== null ? ` · accuracy ~${c.averageAccuracy}%` : ''}`}
          theme={parentTheme}
        />
      ))}
      {report.suggestions.map((s) => (
        <Text key={s} style={styles.body}>💡 {s}</Text>
      ))}
      <Text style={styles.disclaimer}>{report.disclaimer}</Text>
    </View>
  );
}

function ScreenTimeSection(): React.JSX.Element {
  const { profile, saveProfile, screenTime } = useAppStore();
  const theme = parentTheme;
  const store = useAppStore;
  if (!profile) return <Text style={styles.body}>No profile yet.</Text>;
  const options: Array<number | null> = [5, 10, 15, 30, 60, null];
  return (
    <View>
      <Text style={styles.h1}>Screen time</Text>
      <Text style={styles.body}>
        Daily play target. When it's reached, the current activity finishes and a calm
        "all done today" screen appears - no countdowns, no pressure.
      </Text>
      {options.map((mins) => (
        <ParentRow
          key={String(mins)}
          title={mins === null ? 'No limit' : `${mins} minutes`}
          theme={theme}
          onPress={() => {
            void saveProfile({ ...profile, dailyScreenTimeMinutes: mins });
            store.setState({ screenTime: { ...screenTime, dailyTargetMinutes: mins } });
          }}
          right={<Text style={styles.radio}>{profile.dailyScreenTimeMinutes === mins ? '●' : '○'}</Text>}
        />
      ))}
      <PrimaryButton
        label="Add 10 minutes today"
        theme={theme}
        onPress={() => store.setState({ screenTime: grantExtraTime(screenTime, dayKeyFrom(new Date()), 10) })}
      />
    </View>
  );
}

function AccessibilitySection(): React.JSX.Element {
  const { profile, saveProfile } = useAppStore();
  const theme = parentTheme;
  if (!profile) return <Text style={styles.body}>No profile yet.</Text>;
  const a = profile.accessibility;
  const toggles: Array<{ key: keyof typeof a; label: string; hint: string }> = [
    { key: 'highContrast', label: 'High contrast', hint: 'Stronger colours and outlines' },
    { key: 'colourBlindFriendly', label: 'Colour-blind friendly', hint: 'Adds patterns and symbols to colour cues' },
    { key: 'reducedMotion', label: 'Reduce motion', hint: 'Crossfades instead of movement' },
    { key: 'reducedStimulation', label: 'Calm mode', hint: 'No background animation or ambient sound' },
    { key: 'largerTouchTargets', label: 'Larger touch targets', hint: 'Bigger buttons everywhere' },
    { key: 'longerResponseTime', label: 'More time to respond', hint: 'All timers 2.5x longer' },
    { key: 'noTimeLimits', label: 'No time limits', hint: 'Never offer timed challenges' },
    { key: 'widerTracingCorridor', label: 'Easier tracing', hint: 'Wider tracing path' },
    { key: 'alternativeCues', label: 'Alternative cues', hint: 'Vibration and visual cues alongside sound' },
  ];
  return (
    <View>
      <Text style={styles.h1}>Accessibility</Text>
      {toggles.map((t) => (
        <ParentRow
          key={t.key}
          title={t.label}
          subtitle={t.hint}
          theme={theme}
          right={
            <Switch
              accessibilityLabel={t.label}
              value={Boolean(a[t.key])}
              onValueChange={(v) =>
                void saveProfile({ ...profile, accessibility: { ...a, [t.key]: v } })
              }
            />
          }
        />
      ))}
    </View>
  );
}

function PrivacySection(): React.JSX.Element {
  const { deleteChildData } = useAppStore();
  const theme = parentTheme;
  return (
    <View>
      <Text style={styles.h1}>Privacy & data</Text>
      <Text style={styles.body}>
        Everything your child makes and does in Little Grip stays on this device. We store the
        nickname and age range you chose, play progress, rewards and saved artwork - nothing else.
        No ads, no chat, no location, no accounts. Uninstalling the app also removes everything.
      </Text>
      <Text style={styles.body}>
        Device backups (iCloud / Google) may include this app's data under your own account and
        control.
      </Text>
      <PrimaryButton
        label="Delete all child data"
        destructive
        theme={theme}
        onPress={() =>
          Alert.alert(
            'Delete all child data?',
            'This permanently removes the profile, progress, rewards and all saved artwork from this device. This cannot be undone.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete everything', style: 'destructive', onPress: () => void deleteChildData() },
            ],
          )
        }
      />
    </View>
  );
}

function SubscriptionSection(): React.JSX.Element {
  return (
    <View>
      <Text style={styles.h1}>Subscription</Text>
      <Text style={styles.body}>Current plan: Free.</Text>
      <Text style={styles.body}>
        [ILLUSTRATIVE PLACEHOLDER] Store billing (StoreKit / Google Play Billing) is integrated in
        delivery phase 2 following docs/11: prices in AUD including GST, clear renewal terms before
        purchase, no preselected options, cancellation as easy as sign-up, restore purchases, and
        nothing here limits your rights under the Australian Consumer Law.
      </Text>
    </View>
  );
}

function HelpSection(): React.JSX.Element {
  return (
    <View>
      <Text style={styles.h1}>Help & support</Text>
      <Text style={styles.body}>Questions, feedback or complaints: support@littlegrip.example.au (placeholder address).</Text>
      <Text style={styles.body}>
        We aim to respond within 2 business days. If you're not satisfied with our response, you can
        contact your state or territory consumer affairs body, the ACCC, or - for privacy concerns -
        the Office of the Australian Information Commissioner (oaic.gov.au).
      </Text>
      <Text style={styles.body}>Little Grip never shows external links or web content in the child area.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', padding: 12 },
  backLink: { fontSize: 15, color: '#2F6F62', padding: 6 },
  exitLink: { fontSize: 15, color: '#2F6F62', padding: 6, marginLeft: 'auto' },
  content: { padding: 12, paddingBottom: 48 },
  h1: { fontSize: 24, fontWeight: '700', color: '#1F2933', marginBottom: 12, marginLeft: 8 },
  h2: { fontSize: 16, fontWeight: '700', color: '#1F2933', marginTop: 16, marginBottom: 4, marginLeft: 8 },
  body: { fontSize: 15, lineHeight: 22, color: '#1F2933', margin: 8 },
  stat: { fontSize: 15, color: '#1F2933', marginLeft: 8, marginBottom: 12 },
  radio: { fontSize: 20, color: '#2F6F62' },
  disclaimer: { fontSize: 13, fontStyle: 'italic', color: '#52606D', margin: 8, marginTop: 16 },
});
