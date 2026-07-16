import * as SQLite from 'expo-sqlite';
import type {
  ArtworkRepository,
  ChildProfile,
  DrawingDocument,
  ProfileRepository,
  ProgressRecord,
  ProgressRepository,
  Repositories,
  RewardsRepository,
  RewardsState,
  ScreenTimeRepository,
  ScreenTimeState,
} from '@littlegrip/core';
import { MIGRATIONS } from './migrations';

/**
 * SQLite repositories (docs/04 section 4.3). WAL mode for interruption
 * resilience (NFR-002). No table stores identity data beyond the nickname
 * and age band; deletion is transactional (docs/07 section 7.4).
 */

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('littlegrip.db');
      await db.execAsync('PRAGMA journal_mode = WAL;');
      await db.execAsync(
        'CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL);',
      );
      const row = await db.getFirstAsync<{ version: number }>(
        'SELECT version FROM schema_version LIMIT 1;',
      );
      const current = row?.version ?? 0;
      for (let v = current; v < MIGRATIONS.length; v++) {
        await db.withTransactionAsync(async () => {
          await db.execAsync(MIGRATIONS[v]!);
          await db.execAsync('DELETE FROM schema_version;');
          await db.runAsync('INSERT INTO schema_version (version) VALUES (?);', v + 1);
        });
      }
      return db;
    })();
  }
  return dbPromise;
}

class SqliteProfileRepository implements ProfileRepository {
  constructor(private db: SQLite.SQLiteDatabase) {}
  async getAll(): Promise<ChildProfile[]> {
    const rows = await this.db.getAllAsync<{ id: string; data: string }>(
      'SELECT id, data FROM child_profile;',
    );
    return rows.map((r) => JSON.parse(r.data) as ChildProfile);
  }
  async get(id: string): Promise<ChildProfile | null> {
    const row = await this.db.getFirstAsync<{ data: string }>(
      'SELECT data FROM child_profile WHERE id = ?;',
      id,
    );
    return row ? (JSON.parse(row.data) as ChildProfile) : null;
  }
  async save(profile: ChildProfile): Promise<void> {
    await this.db.runAsync(
      'INSERT OR REPLACE INTO child_profile (id, data) VALUES (?, ?);',
      profile.id,
      JSON.stringify(profile),
    );
  }
  async delete(id: string): Promise<void> {
    await this.db.runAsync('DELETE FROM child_profile WHERE id = ?;', id);
  }
}

class SqliteProgressRepository implements ProgressRepository {
  constructor(private db: SQLite.SQLiteDatabase) {}
  async forProfile(profileId: string): Promise<ProgressRecord[]> {
    const rows = await this.db.getAllAsync<{ data: string }>(
      'SELECT data FROM activity_progress WHERE profile_id = ?;',
      profileId,
    );
    return rows.map((r) => JSON.parse(r.data) as ProgressRecord);
  }
  async save(record: ProgressRecord): Promise<void> {
    await this.db.runAsync(
      'INSERT OR REPLACE INTO activity_progress (id, profile_id, data) VALUES (?, ?, ?);',
      record.id,
      record.profileId,
      JSON.stringify(record),
    );
  }
  async deleteForProfile(profileId: string): Promise<number> {
    const result = await this.db.runAsync(
      'DELETE FROM activity_progress WHERE profile_id = ?;',
      profileId,
    );
    return result.changes;
  }
  async replaceForProfile(profileId: string, records: ProgressRecord[]): Promise<void> {
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync('DELETE FROM activity_progress WHERE profile_id = ?;', profileId);
      for (const r of records) {
        await this.db.runAsync(
          'INSERT INTO activity_progress (id, profile_id, data) VALUES (?, ?, ?);',
          r.id,
          r.profileId,
          JSON.stringify(r),
        );
      }
    });
  }
}

class SqliteKeyedStateRepository<T> {
  constructor(
    private db: SQLite.SQLiteDatabase,
    private table: string,
  ) {}
  async forProfile(profileId: string): Promise<T | null> {
    const row = await this.db.getFirstAsync<{ data: string }>(
      `SELECT data FROM ${this.table} WHERE profile_id = ?;`,
      profileId,
    );
    return row ? (JSON.parse(row.data) as T) : null;
  }
  async save(profileId: string, state: T): Promise<void> {
    await this.db.runAsync(
      `INSERT OR REPLACE INTO ${this.table} (profile_id, data) VALUES (?, ?);`,
      profileId,
      JSON.stringify(state),
    );
  }
  async deleteForProfile(profileId: string): Promise<void> {
    await this.db.runAsync(`DELETE FROM ${this.table} WHERE profile_id = ?;`, profileId);
  }
}

class SqliteArtworkRepository implements ArtworkRepository {
  constructor(private db: SQLite.SQLiteDatabase) {}
  async forProfile(profileId: string): Promise<DrawingDocument[]> {
    const rows = await this.db.getAllAsync<{ data: string }>(
      'SELECT data FROM artwork WHERE profile_id = ?;',
      profileId,
    );
    return rows.map((r) => JSON.parse(r.data) as DrawingDocument);
  }
  async save(doc: DrawingDocument): Promise<void> {
    await this.db.runAsync(
      'INSERT OR REPLACE INTO artwork (id, profile_id, data) VALUES (?, ?, ?);',
      doc.id,
      doc.profileId,
      JSON.stringify(doc),
    );
  }
  async delete(id: string): Promise<void> {
    await this.db.runAsync('DELETE FROM artwork WHERE id = ?;', id);
  }
  async deleteForProfile(profileId: string): Promise<number> {
    const result = await this.db.runAsync('DELETE FROM artwork WHERE profile_id = ?;', profileId);
    return result.changes;
  }
}

let repositories: Repositories | null = null;

export async function getRepositories(): Promise<Repositories> {
  if (!repositories) {
    const db = await getDb();
    const rewards = new SqliteKeyedStateRepository<RewardsState>(db, 'reward_state');
    const screenTime = new SqliteKeyedStateRepository<ScreenTimeState>(db, 'screen_time');
    repositories = {
      profiles: new SqliteProfileRepository(db),
      progress: new SqliteProgressRepository(db),
      rewards: rewards as RewardsRepository,
      artwork: new SqliteArtworkRepository(db),
      screenTime: screenTime as ScreenTimeRepository,
    };
  }
  return repositories;
}
