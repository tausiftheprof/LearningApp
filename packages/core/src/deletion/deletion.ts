import type { Repositories } from '../storage/repositories';

/**
 * Child-data deletion (FR-018/FR-025, PRD sections 11 and 16; docs/07 §7.4).
 * One orchestrated operation removes EVERYTHING the app holds about a child:
 * profile, progress, rewards, artwork and the screen-time ledger.
 * The parent sees the returned summary as confirmation of what was erased.
 */

export interface DeletionSummary {
  profileDeleted: boolean;
  progressRecordsDeleted: number;
  artworkDeleted: number;
  rewardsCleared: boolean;
  screenTimeCleared: boolean;
}

export async function deleteAllChildData(
  repos: Repositories,
  profileId: string,
): Promise<DeletionSummary> {
  const profile = await repos.profiles.get(profileId);
  const progressRecordsDeleted = await repos.progress.deleteForProfile(profileId);
  const artworkDeleted = await repos.artwork.deleteForProfile(profileId);
  await repos.rewards.deleteForProfile(profileId);
  await repos.screenTime.deleteForProfile(profileId);
  if (profile) await repos.profiles.delete(profileId);
  return {
    profileDeleted: profile !== null,
    progressRecordsDeleted,
    artworkDeleted,
    rewardsCleared: true,
    screenTimeCleared: true,
  };
}

/** Post-deletion audit used by tests and the confirmation screen. */
export async function verifyNoChildDataRemains(
  repos: Repositories,
  profileId: string,
): Promise<boolean> {
  const [profile, progress, artwork, rewards, screenTime] = await Promise.all([
    repos.profiles.get(profileId),
    repos.progress.forProfile(profileId),
    repos.artwork.forProfile(profileId),
    repos.rewards.forProfile(profileId),
    repos.screenTime.forProfile(profileId),
  ]);
  return (
    profile === null &&
    progress.length === 0 &&
    artwork.length === 0 &&
    rewards === null &&
    screenTime === null
  );
}
