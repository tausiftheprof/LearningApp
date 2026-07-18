import { create } from 'zustand';
import type {
  Activity,
  ChildProfile,
  GateState,
  ParentAccountState,
  RewardsState,
  ScreenTimeState,
} from '@littlegrip/core';
import {
  applyRewardEvent,
  beginChallenge,
  buildStarterPack,
  confirmSignInCode,
  dayKeyFrom,
  deleteAllChildData,
  disableCloudSync,
  emptyAccountState,
  emptyRewardsState,
  emptyScreenTime,
  enableCloudSync,
  enforceRelock,
  initialGateState,
  recordSync,
  recordUsage,
  requestSignInCode,
  signOut as signOutOfAccount,
  submitAnswer,
  touchSession,
  type RewardEvent,
} from '@littlegrip/core';
import { getRepositories } from '../storage/db';

/**
 * App state (zustand). Persistent state lives in SQLite via the repositories;
 * this store is the in-memory working copy plus navigation.
 */

export type Screen =
  | { name: 'onboarding' }
  | { name: 'home' }
  | { name: 'picker'; category: Activity['category'] | 'tracing-letters' | 'tracing-numbers' | 'tracing-shapes' }
  | { name: 'activity'; activity: Activity }
  | { name: 'daily-adventure' }
  | { name: 'rewards' }
  | { name: 'times-up' }
  | { name: 'gate' }
  | { name: 'parent'; section: 'dashboard' | 'profile' | 'progress' | 'screen-time' | 'accessibility' | 'privacy' | 'cloud-sync' | 'subscription' | 'help' };

interface AppState {
  ready: boolean;
  screen: Screen;
  profile: ChildProfile | null;
  rewards: RewardsState;
  screenTime: ScreenTimeState;
  gate: GateState;
  catalogue: Activity[];
  account: ParentAccountState;

  init(): Promise<void>;
  navigate(screen: Screen): void;
  saveProfile(profile: ChildProfile): Promise<void>;
  recordPlaySeconds(seconds: number): Promise<void>;
  applyReward(event: Omit<RewardEvent, 'todayKey' | 'at'>): Promise<void>;
  gateBegin(): void;
  gateSubmit(answer: number): boolean;
  gateTouch(): void;
  gateEnforceRelock(appBackgrounded: boolean): void;
  deleteChildData(): Promise<void>;
  accountEnable(): Promise<void>;
  accountDisable(): Promise<void>;
  accountRequestCode(email: string): Promise<void>;
  accountConfirmCode(code: string): Promise<boolean>;
  accountSignOut(): Promise<void>;
  accountSyncNow(): Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  ready: false,
  screen: { name: 'onboarding' },
  profile: null,
  rewards: emptyRewardsState(dayKeyFrom(new Date())),
  screenTime: emptyScreenTime(15),
  gate: initialGateState(),
  catalogue: buildStarterPack().activities,
  account: emptyAccountState(),

  async init() {
    const repos = await getRepositories();
    const [profiles, account] = await Promise.all([repos.profiles.getAll(), repos.account.get()]);
    const profile = profiles[0] ?? null;
    if (profile) {
      const [rewards, screenTime] = await Promise.all([
        repos.rewards.forProfile(profile.id),
        repos.screenTime.forProfile(profile.id),
      ]);
      set({
        ready: true,
        profile,
        rewards: rewards ?? emptyRewardsState(dayKeyFrom(new Date())),
        screenTime: screenTime ?? emptyScreenTime(profile.dailyScreenTimeMinutes),
        screen: { name: 'home' },
        account: account ?? emptyAccountState(),
      });
    } else {
      set({ ready: true, screen: { name: 'onboarding' }, account: account ?? emptyAccountState() });
    }
  },

  navigate(screen) {
    // Leaving the parent area relocks the gate (docs/03 section 3.4).
    const leavingParent =
      get().screen.name === 'parent' && screen.name !== 'parent' && screen.name !== 'gate';
    set({
      screen,
      ...(leavingParent ? { gate: initialGateState() } : {}),
    });
  },

  async saveProfile(profile) {
    const repos = await getRepositories();
    await repos.profiles.save(profile);
    set({ profile });
  },

  async recordPlaySeconds(seconds) {
    const { profile, screenTime } = get();
    if (!profile) return;
    const updated = recordUsage(screenTime, dayKeyFrom(new Date()), seconds);
    const repos = await getRepositories();
    await repos.screenTime.save(profile.id, updated);
    set({ screenTime: updated });
  },

  async applyReward(event) {
    const { profile, rewards } = get();
    if (!profile) return;
    const outcome = applyRewardEvent(rewards, {
      ...event,
      todayKey: dayKeyFrom(new Date()),
      at: Date.now(),
    });
    const repos = await getRepositories();
    await repos.rewards.save(profile.id, outcome.state);
    set({ rewards: outcome.state });
  },

  gateBegin() {
    set({ gate: beginChallenge(get().gate, Date.now()) });
  },

  gateSubmit(answer) {
    const next = submitAnswer(get().gate, answer, Date.now());
    set({ gate: next });
    return next.status === 'unlocked';
  },

  gateTouch() {
    set({ gate: touchSession(get().gate, Date.now()) });
  },

  gateEnforceRelock(appBackgrounded) {
    const next = enforceRelock(get().gate, Date.now(), { appBackgrounded });
    if (next !== get().gate) {
      set({ gate: next, ...(appBackgrounded && { screen: { name: 'home' } as Screen }) });
    }
  },

  async deleteChildData() {
    const { profile } = get();
    if (!profile) return;
    const repos = await getRepositories();
    await deleteAllChildData(repos, profile.id);
    set({
      profile: null,
      rewards: emptyRewardsState(dayKeyFrom(new Date())),
      screenTime: emptyScreenTime(15),
      screen: { name: 'onboarding' },
    });
    // Deliberately NOT touching `account` here - deleting one child's local
    // data must never sign a parent out of their own cloud account.
  },

  async accountEnable() {
    const repos = await getRepositories();
    const next = enableCloudSync(get().account);
    await repos.account.save(next);
    set({ account: next });
  },

  async accountDisable() {
    const repos = await getRepositories();
    const next = disableCloudSync(get().account);
    await repos.account.save(next);
    set({ account: next });
  },

  async accountRequestCode(email) {
    const repos = await getRepositories();
    const next = requestSignInCode(get().account, email);
    await repos.account.save(next);
    set({ account: next });
  },

  async accountConfirmCode(code) {
    const repos = await getRepositories();
    const next = confirmSignInCode(get().account, code);
    await repos.account.save(next);
    set({ account: next });
    return next.status === 'signed-in';
  },

  async accountSignOut() {
    const repos = await getRepositories();
    const next = signOutOfAccount(get().account);
    await repos.account.save(next);
    set({ account: next });
  },

  async accountSyncNow() {
    const repos = await getRepositories();
    const next = recordSync(get().account, Date.now());
    await repos.account.save(next);
    set({ account: next });
  },
}));
