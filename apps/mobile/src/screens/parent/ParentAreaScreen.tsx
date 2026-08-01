import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
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
  | 'accessibility' | 'privacy' | 'cloud-sync' | 'subscription' | 'help' | 'children';

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
        {props.section === 'cloud-sync' && <CloudSyncSection />}
        {props.section === 'subscription' && <SubscriptionSection />}
        {props.section === 'help' && <HelpSection />}
        {props.section === 'children' && <ChildrenSection />}
      </ScrollView>
    </View>
  );
}

function Dashboard(): React.JSX.Element {
  const { navigate, screenTime, rewards, profile, account, profiles, setActiveProfile } = useAppStore();
  const theme = parentTheme;
  const today = secondsUsed(screenTime, dayKeyFrom(new Date()));
  // Family-Link layout (owner direction): a child-tinted zone bounds everything
  // about the selected child; general/account settings sit outside it.
  const accent = profile ? themeById(profile.themeId).accent : '#7E7AA6';
  const level = profile ? (profile.difficulty === 1 ? 'Beginner' : profile.difficulty === 2 ? 'Developing' : 'Confident') : '';
  const childRows: Array<{ title: string; subtitle: string; section: Section }> = [
    { title: 'Progress', subtitle: 'Skills, favourites and suggestions', section: 'progress' },
    { title: 'Screen time', subtitle: `${Math.round(today / 60)} min today`, section: 'screen-time' },
    { title: `Settings for ${profile?.nickname ?? 'your child'}`, subtitle: 'Difficulty, theme, sound, handedness', section: 'profile' },
    { title: 'Accessibility', subtitle: 'See, hear, touch and pace', section: 'accessibility' },
  ];
  const generalRows: Array<{ title: string; subtitle: string; section: Section }> = [
    { title: 'Privacy & data', subtitle: 'Notice, export and delete', section: 'privacy' },
    { title: 'Cloud backup & sync', subtitle: cloudSyncSubtitle(account), section: 'cloud-sync' },
    { title: 'Subscription', subtitle: 'Free plan', section: 'subscription' },
    { title: 'Help & support', subtitle: 'FAQ, contact, complaints', section: 'help' },
  ];
  return (
    <View>
      <View style={styles.kidZone}>
        <Text style={styles.kidBadge}>FOR {(profile?.nickname ?? 'YOUR CHILD').toUpperCase()}</Text>
        <View style={styles.kidHead}>
          <View style={[styles.kidAvatar, { backgroundColor: accent }]}>
            <Text style={styles.kidAvatarText}>{(profile?.nickname ?? '?').slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.kidName}>{profile?.nickname ?? 'Not set up'}</Text>
            <View style={styles.kidMetaRow}>
              {profile && <Text style={styles.kidMeta}>{profile.ageBand} years</Text>}
              {profile && (
                <View style={[styles.levelPill, { backgroundColor: accent }]}>
                  <Text style={styles.levelPillText}>{level}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
        <Text style={styles.kidStat}>⭐ {rewards.totalStars} stars · {Math.round(today / 60)} min today</Text>
        {/* Child switcher: one chip per child; tap to make that child active.
            (Multi-child parity with the demo's Family-Link zone.) */}
        {profiles.length > 1 && (
          <View style={styles.chipRow}>
            {profiles.map((p) => {
              const active = p.id === profile?.id;
              return (
                <Text
                  key={p.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Switch to ${p.nickname}`}
                  onPress={() => { if (!active) void setActiveProfile(p.id); }}
                  style={[styles.kidChip, active ? { backgroundColor: accent, color: '#FFFFFF' } : null]}
                >
                  {p.nickname}
                </Text>
              );
            })}
          </View>
        )}
        {childRows.map((row) => (
          <ParentRow key={row.section} title={row.title} subtitle={row.subtitle} theme={theme} onPress={() => navigate({ name: 'parent', section: row.section })} />
        ))}
        <ParentRow title="＋ Add / manage children" subtitle={`${profiles.length} ${profiles.length === 1 ? 'child' : 'children'}`} theme={theme} onPress={() => navigate({ name: 'parent', section: 'children' })} />
      </View>

      <Text style={styles.scopeDivider}>GENERAL APP SETTINGS</Text>
      <Text style={styles.deviceNote}>These apply to this device, not to one child.</Text>
      {generalRows.map((row) => (
        <ParentRow key={row.section} title={row.title} subtitle={row.subtitle} theme={theme} onPress={() => navigate({ name: 'parent', section: row.section })} />
      ))}
    </View>
  );
}

/**
 * Children management (owner direction): every local child with Switch + Delete,
 * plus "Add a child". Delete runs the orchestrated deleteAllChildData wipe, then
 * the store re-activates a remaining child or returns to onboarding.
 */
function ChildrenSection(): React.JSX.Element {
  const { profiles, profile, navigate, setActiveProfile, deleteChildData } = useAppStore();
  const theme = parentTheme;

  function confirmDelete(id: string, name: string): void {
    Alert.alert(
      `Delete ${name}?`,
      'This permanently removes this child’s profile, progress, stars and saved artwork from this device. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: () => {
            // deleteChildData wipes the ACTIVE child, so switch to the target
            // first if it isn't already active (a no-op when it is).
            void (async () => {
              if (id !== profile?.id) await setActiveProfile(id);
              await deleteChildData();
            })();
          },
        },
      ],
    );
  }

  return (
    <View>
      <Text style={styles.h1}>Children</Text>
      <Text style={styles.body}>Everyone who plays on this device. Tap Switch to change who’s playing.</Text>
      {profiles.map((p) => {
        const active = p.id === profile?.id;
        return (
          <ParentRow
            key={p.id}
            title={active ? `${p.nickname} (playing now)` : p.nickname}
            subtitle={`${p.ageBand} years`}
            theme={theme}
            right={
              <View style={styles.childActions}>
                {!active && (
                  <Text accessibilityRole="button" accessibilityLabel={`Switch to ${p.nickname}`} onPress={() => void setActiveProfile(p.id)} style={styles.switchLink}>
                    Switch
                  </Text>
                )}
                <Text accessibilityRole="button" accessibilityLabel={`Delete ${p.nickname}`} onPress={() => confirmDelete(p.id, p.nickname)} style={styles.deleteLink}>
                  Delete
                </Text>
              </View>
            }
          />
        );
      })}
      <View style={{ height: 16 }} />
      <PrimaryButton label="＋ Add a child" onPress={() => navigate({ name: 'onboarding' })} theme={theme} />
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
        No ads, no chat, no location. No account is required to use Little Grip - Cloud backup &
        sync (below) is entirely optional and off unless you turn it on. Uninstalling the app also
        removes everything that wasn't backed up.
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

function cloudSyncSubtitle(account: ReturnType<typeof useAppStore.getState>['account']): string {
  if (!account.enabled) return 'Off - everything stays on this device';
  if (account.status === 'signed-in') return `Signed in as ${account.email}`;
  return 'On - sign-in needed';
}

/**
 * Cloud backup & sync (docs/04 section 4.6, "phase 2 accounts"; off by
 * default per docs/01 A-01). Email + one-time code, never a password -
 * children never see this screen or hold credentials.
 *
 * MOCK / ILLUSTRATIVE: there is no backend in this build. The "sent" code is
 * shown directly on screen instead of emailed, and "Sync now" just
 * timestamps a sync rather than talking to a server (see
 * packages/core/src/account/account.ts). Real cloud sync needs the
 * AU-region backend and updated Privacy Impact Assessment scoped in
 * docs/07 section 7.1 before any account data leaves the device.
 */
function CloudSyncSection(): React.JSX.Element {
  const {
    account,
    accountEnable,
    accountDisable,
    accountRequestCode,
    accountConfirmCode,
    accountSignOut,
    accountSyncNow,
  } = useAppStore();
  const theme = parentTheme;
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState(false);

  if (!account.enabled) {
    return (
      <View>
        <Text style={styles.h1}>Cloud backup & sync</Text>
        <Text style={styles.body}>
          Off by default. Little Grip works fully with everything stored only on this device. Turn
          this on if you'd like progress, rewards and saved artwork backed up and available on
          another phone or tablet too.
        </Text>
        <Text style={styles.disclaimer}>
          This is a demo of the feature: no email is really sent, and syncing is simulated. A real
          launch needs a proper backend and privacy review first.
        </Text>
        <PrimaryButton label="Turn on cloud backup & sync" theme={theme} onPress={() => void accountEnable()} />
      </View>
    );
  }

  if (account.status === 'signed-in') {
    return (
      <View>
        <Text style={styles.h1}>Cloud backup & sync</Text>
        <ParentRow title="Signed in as" subtitle={account.email ?? ''} theme={theme} />
        <ParentRow
          title="Last synced"
          subtitle={account.lastSyncedAt ? new Date(account.lastSyncedAt).toLocaleString() : 'Not yet synced'}
          theme={theme}
        />
        <PrimaryButton label="Sync now" theme={theme} onPress={() => void accountSyncNow()} />
        <PrimaryButton label="Sign out" theme={theme} onPress={() => void accountSignOut()} />
        <PrimaryButton label="Turn off cloud backup & sync" destructive theme={theme} onPress={() => void accountDisable()} />
      </View>
    );
  }

  if (account.status === 'code-sent') {
    return (
      <View>
        <Text style={styles.h1}>Enter your code</Text>
        <Text style={styles.body}>
          [Demo] Since there's no real email service yet, here's the code we would have sent to{' '}
          {account.email}: <Text style={{ fontWeight: '800' }}>{account.pendingCode}</Text>
        </Text>
        <TextInput
          style={styles.textInput}
          value={code}
          onChangeText={(v) => { setCode(v); setCodeError(false); }}
          placeholder="6-digit code"
          keyboardType="number-pad"
          maxLength={6}
          accessibilityLabel="6-digit sign-in code"
        />
        {codeError && <Text style={styles.errorText}>That code didn't match - check and try again.</Text>}
        <PrimaryButton
          label="Confirm"
          theme={theme}
          onPress={async () => {
            const ok = await accountConfirmCode(code);
            if (!ok) setCodeError(true);
          }}
        />
        <PrimaryButton label="Turn off cloud backup & sync" destructive theme={theme} onPress={() => void accountDisable()} />
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.h1}>Cloud backup & sync</Text>
      <Text style={styles.body}>
        Enter the email you'd like to use. We'll send a 6-digit code - no password to remember, and
        your child never sees this screen.
      </Text>
      <TextInput
        style={styles.textInput}
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        accessibilityLabel="Email address"
      />
      <PrimaryButton label="Send code" theme={theme} onPress={() => void accountRequestCode(email)} />
      <PrimaryButton label="Turn off cloud backup & sync" destructive theme={theme} onPress={() => void accountDisable()} />
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
  kidZone: { backgroundColor: '#EDF2F0', borderColor: '#D8E4DF', borderWidth: 1, borderRadius: 16, padding: 12, marginBottom: 8 },
  kidBadge: { fontSize: 11, fontWeight: '800', letterSpacing: 1, color: '#4A5B54', marginBottom: 8 },
  kidHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  kidAvatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  kidAvatarText: { color: '#FFFFFF', fontSize: 24, fontWeight: '800' },
  kidName: { fontSize: 21, fontWeight: '800', color: '#1F2933' },
  kidMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  kidMeta: { fontSize: 13, color: '#52606D' },
  levelPill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 1 },
  levelPillText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  kidStat: { fontSize: 14, color: '#3B4A54', marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  kidChip: {
    fontSize: 14, fontWeight: '700', color: '#3B4A54', backgroundColor: '#FFFFFF',
    borderRadius: 999, paddingVertical: 6, paddingHorizontal: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
  },
  childActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  switchLink: { fontSize: 15, fontWeight: '700', color: '#2F6FEB' },
  deleteLink: { fontSize: 15, fontWeight: '700', color: '#C0392B' },
  scopeDivider: { fontSize: 12, fontWeight: '800', letterSpacing: 1, color: '#7B8794', marginTop: 18, marginBottom: 4, marginLeft: 8 },
  deviceNote: { fontSize: 12.5, color: '#7B8794', marginLeft: 8, marginBottom: 8, fontStyle: 'italic' },
  radio: { fontSize: 20, color: '#2F6F62' },
  disclaimer: { fontSize: 13, fontStyle: 'italic', color: '#52606D', margin: 8, marginTop: 16 },
  textInput: {
    fontSize: 16, padding: 12, margin: 8, borderRadius: 10,
    borderWidth: 1, borderColor: '#C5CDD4', backgroundColor: '#fff', color: '#1F2933',
  },
  errorText: { fontSize: 13, color: '#B3261E', marginHorizontal: 8, marginBottom: 8 },
});
