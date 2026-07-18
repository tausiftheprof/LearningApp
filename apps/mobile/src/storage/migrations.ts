/**
 * Ordered, forward-only migrations (docs/04 section 4.3). Applied inside a
 * transaction at startup; schema_version tracks the applied count.
 * Records are stored as validated JSON documents keyed for query + deletion -
 * a pragmatic MVP shape that keeps the wipe path simple and complete.
 */
export const MIGRATIONS: readonly string[] = [
  // v1: initial schema
  `
  CREATE TABLE IF NOT EXISTS child_profile (
    id TEXT PRIMARY KEY NOT NULL,
    data TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS activity_progress (
    id TEXT PRIMARY KEY NOT NULL,
    profile_id TEXT NOT NULL,
    data TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_progress_profile ON activity_progress (profile_id);
  CREATE TABLE IF NOT EXISTS reward_state (
    profile_id TEXT PRIMARY KEY NOT NULL,
    data TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS screen_time (
    profile_id TEXT PRIMARY KEY NOT NULL,
    data TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS artwork (
    id TEXT PRIMARY KEY NOT NULL,
    profile_id TEXT NOT NULL,
    data TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_artwork_profile ON artwork (profile_id);
  `,
  // v2: optional parent account & cloud sync (docs/04 section 4.6, phase 2) -
  // a single row, not per-profile: one parent identity owns every local
  // child profile. Off by default; see packages/core/src/account/account.ts.
  `
  CREATE TABLE IF NOT EXISTS parent_account (
    id TEXT PRIMARY KEY NOT NULL,
    data TEXT NOT NULL
  );
  `,
];
