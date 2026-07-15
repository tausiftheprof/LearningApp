import type { DrawingDocument } from '../drawing/drawing';
import type { ChildProfile } from '../profiles/profile';
import type { ProgressRecord } from '../progress/progress';
import type { RewardsState } from '../rewards/rewardsEngine';
import type { ScreenTimeState } from '../screenTime/screenTime';

/**
 * Repository interfaces - the seam between domain logic and storage.
 * The mobile app implements these over SQLite/files; tests and the deletion
 * orchestrator use them; `InMemory*` reference implementations live in
 * memory.ts. Keeping deletion behind these interfaces lets one code path
 * wipe EVERYTHING for a child (docs/07 section 7.4) and be tested.
 */

export interface ProfileRepository {
  getAll(): Promise<ChildProfile[]>;
  get(id: string): Promise<ChildProfile | null>;
  save(profile: ChildProfile): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface ProgressRepository {
  forProfile(profileId: string): Promise<ProgressRecord[]>;
  save(record: ProgressRecord): Promise<void>;
  deleteForProfile(profileId: string): Promise<number>;
  replaceForProfile(profileId: string, records: ProgressRecord[]): Promise<void>;
}

export interface RewardsRepository {
  forProfile(profileId: string): Promise<RewardsState | null>;
  save(profileId: string, state: RewardsState): Promise<void>;
  deleteForProfile(profileId: string): Promise<void>;
}

export interface ArtworkRepository {
  forProfile(profileId: string): Promise<DrawingDocument[]>;
  save(doc: DrawingDocument): Promise<void>;
  delete(id: string): Promise<void>;
  deleteForProfile(profileId: string): Promise<number>;
}

export interface ScreenTimeRepository {
  forProfile(profileId: string): Promise<ScreenTimeState | null>;
  save(profileId: string, state: ScreenTimeState): Promise<void>;
  deleteForProfile(profileId: string): Promise<void>;
}

export interface Repositories {
  profiles: ProfileRepository;
  progress: ProgressRepository;
  rewards: RewardsRepository;
  artwork: ArtworkRepository;
  screenTime: ScreenTimeRepository;
}
