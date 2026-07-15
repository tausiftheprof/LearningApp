import type { DrawingDocument } from '../drawing/drawing';
import type { ChildProfile } from '../profiles/profile';
import type { ProgressRecord } from '../progress/progress';
import type { RewardsState } from '../rewards/rewardsEngine';
import type { ScreenTimeState } from '../screenTime/screenTime';
import type {
  ArtworkRepository,
  ProfileRepository,
  ProgressRepository,
  Repositories,
  RewardsRepository,
  ScreenTimeRepository,
} from './repositories';

/** In-memory reference implementations (tests + behaviour documentation). */

export class InMemoryProfileRepository implements ProfileRepository {
  private map = new Map<string, ChildProfile>();
  async getAll(): Promise<ChildProfile[]> {
    return [...this.map.values()];
  }
  async get(id: string): Promise<ChildProfile | null> {
    return this.map.get(id) ?? null;
  }
  async save(profile: ChildProfile): Promise<void> {
    this.map.set(profile.id, profile);
  }
  async delete(id: string): Promise<void> {
    this.map.delete(id);
  }
}

export class InMemoryProgressRepository implements ProgressRepository {
  private records: ProgressRecord[] = [];
  async forProfile(profileId: string): Promise<ProgressRecord[]> {
    return this.records.filter((r) => r.profileId === profileId);
  }
  async save(record: ProgressRecord): Promise<void> {
    this.records = this.records.filter((r) => r.id !== record.id);
    this.records.push(record);
  }
  async deleteForProfile(profileId: string): Promise<number> {
    const before = this.records.length;
    this.records = this.records.filter((r) => r.profileId !== profileId);
    return before - this.records.length;
  }
  async replaceForProfile(profileId: string, records: ProgressRecord[]): Promise<void> {
    this.records = [...this.records.filter((r) => r.profileId !== profileId), ...records];
  }
}

export class InMemoryRewardsRepository implements RewardsRepository {
  private map = new Map<string, RewardsState>();
  async forProfile(profileId: string): Promise<RewardsState | null> {
    return this.map.get(profileId) ?? null;
  }
  async save(profileId: string, state: RewardsState): Promise<void> {
    this.map.set(profileId, state);
  }
  async deleteForProfile(profileId: string): Promise<void> {
    this.map.delete(profileId);
  }
}

export class InMemoryArtworkRepository implements ArtworkRepository {
  private docs: DrawingDocument[] = [];
  async forProfile(profileId: string): Promise<DrawingDocument[]> {
    return this.docs.filter((d) => d.profileId === profileId);
  }
  async save(doc: DrawingDocument): Promise<void> {
    this.docs = this.docs.filter((d) => d.id !== doc.id);
    this.docs.push(doc);
  }
  async delete(id: string): Promise<void> {
    this.docs = this.docs.filter((d) => d.id !== id);
  }
  async deleteForProfile(profileId: string): Promise<number> {
    const before = this.docs.length;
    this.docs = this.docs.filter((d) => d.profileId !== profileId);
    return before - this.docs.length;
  }
}

export class InMemoryScreenTimeRepository implements ScreenTimeRepository {
  private map = new Map<string, ScreenTimeState>();
  async forProfile(profileId: string): Promise<ScreenTimeState | null> {
    return this.map.get(profileId) ?? null;
  }
  async save(profileId: string, state: ScreenTimeState): Promise<void> {
    this.map.set(profileId, state);
  }
  async deleteForProfile(profileId: string): Promise<void> {
    this.map.delete(profileId);
  }
}

export function inMemoryRepositories(): Repositories {
  return {
    profiles: new InMemoryProfileRepository(),
    progress: new InMemoryProgressRepository(),
    rewards: new InMemoryRewardsRepository(),
    artwork: new InMemoryArtworkRepository(),
    screenTime: new InMemoryScreenTimeRepository(),
  };
}
