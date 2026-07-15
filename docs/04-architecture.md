# 4. Architecture & Data Design

## 4.1 Technology stack recommendation

| Layer | Choice | Why |
|---|---|---|
| Mobile app | **React Native (Expo SDK 53+, TypeScript strict)** | One strongly-typed codebase for Android + iOS (PRD §21); first-class accessibility APIs; RN-Web path for the future web/Chromebook expansion; EAS build/signing pipeline; huge hiring pool. |
| Drawing/canvas | **@shopify/react-native-skia** | GPU-accelerated Skia canvas gives the <16 ms stroke latency the PRD demands (§22, §27); powers production drawing apps; supports replay by re-rendering the stroke model. |
| Local data | **SQLite (expo-sqlite, WAL mode) + typed repository layer** | Reliable, transactional, offline-first (§17, §22); WAL survives interruption; simple encrypted-at-rest option via SQLCipher build flag. Artwork = files (vector JSON + PNG thumbnail) in app sandbox. |
| Domain logic | **`@littlehands/core` — pure TypeScript package, zero RN dependencies** | Tracing engine, rewards, screen-time, recommendation, parental gate, content-pack schema all unit-testable in Node CI and reusable by the future web app and CMS validator. |
| Validation | **zod** | Runtime validation of content packs and stored records; schema = single source of truth. |
| State | **zustand** (UI state) + repositories (persistent state) | Minimal, typed, testable. |
| Backend (phase 2) | **Fastify (Node/TS) + PostgreSQL** on Australian-region hosting (e.g. AWS ap-southeast-2 / Sydney) | Only needed for CMS + content delivery + (later) parent accounts; same language as app team; AU data residency simplifies APP 8 (overseas disclosure). |
| CMS (phase 2) | Backend admin app (React) with role-based workflow | docs/12. |
| Content delivery | Signed, versioned **content packs** (JSON manifest + assets, zip, SHA-256) via CDN | §18 "correct content without a new app version". |
| Billing | **Native store billing** (StoreKit 2 / Google Play Billing) via `react-native-iap`; no third-party billing SDK sending child data | Parents pay through OS sheets; Kids Category compatible; docs/11. |
| CI/CD | GitHub Actions (lint, typecheck, tests, secret scan, dep audit) + EAS Build | Quality gates, docs/13. |

**Considered alternatives:** Flutter (excellent canvas performance; rejected mainly for team/js-ecosystem reuse toward web + CMS and the pure-TS shared core; it remains a valid choice — decision reversible before phase 3 at low cost). Native ×2 (best performance, double cost — unjustified at MVP). Unity (game engine overkill; poor accessibility support).

## 4.2 Solution architecture

```
┌────────────────────────── Device ──────────────────────────┐
│  Child space (RN screens)      Parent space (gated)        │
│      │  activity runtime            │ settings/reports     │
│  ┌───▼─────────────────────────────▼───┐                   │
│  │        @littlehands/core (TS)       │                   │
│  │ tracing · puzzles · rewards · plan  │                   │
│  │ recommendation · gate · feedback    │                   │
│  │ progress · settings · content-pack  │                   │
│  └───┬───────────────┬─────────────────┘                   │
│  ┌───▼────┐      ┌───▼──────────┐   ┌──────────────┐       │
│  │ SQLite │      │ File store   │   │ OS services  │       │
│  │(profiles,     │(packs, art,  │   │ IAP · local  │       │
│  │ progress,     │ audio)       │   │ notifications│       │
│  │ rewards)      └──────────────┘   │ keystore     │       │
│  └────────┘                         └──────────────┘       │
└───────────────▲─────────────────────────────────────────────┘
                │ HTTPS (TLS 1.2+), only from parent-initiated flows
        ┌───────┴────────────┐        ┌─────────────────────┐
        │ Content API (P2)   │◄───────│ CMS + review        │
        │ pack manifest/CDN  │        │ workflow (P2)       │
        └────────────────────┘        └─────────────────────┘
```
No runtime network calls occur in child flows. MVP ships with the Content API optional (bundled starter pack); the app polls the pack manifest + **revocation list** on parent-area entry when online (rapid unpublish, §18).

## 4.3 Data model (local, MVP)

```
child_profile(id PK, nickname, age_band, avatar_id, difficulty, handedness,
              sound_prefs JSON, accessibility JSON, screen_time_mins, created_at)
activity_progress(id PK, profile_id FK, activity_id, category, started_at,
              completed_at?, attempts, hint_count, accuracy_score?, duration_s)
reward_grant(id PK, profile_id FK, kind[star|sticker|badge], ref_id, granted_at, reason)
artwork(id PK, profile_id FK, activity_id?, vector_path, thumb_path, created_at)
daily_usage(profile_id FK, date, seconds_used)   -- screen-time ledger
settings(scope, key, value)                       -- parent/app settings
content_pack(pack_id PK, version, state[bundled|downloaded|revoked], hash, installed_at)
```
Migrations are ordered SQL files applied at startup (`apps/mobile/src/storage/migrations`). **No table stores**: full name (nickname only), DOB, email, location, raw stroke coordinates, free text from children, device identifiers.

## 4.4 Content pack format & versioning

`manifest.json` (zod-validated): packId, semver, minAppVersion, locale(s), activities[] — each with id, type (`tracing|colouring|jigsaw|game-template:*|guided-drawing`), title, ageBands, difficulty params, motorSkills tags, estimated minutes, theme, accessibility notes, asset refs, audio refs, review approval id. Packs are signed (SHA-256 + server signature phase 2); the app refuses unverified packs and honours the revocation list. Older app versions ignore packs with higher `formatVersion` (forward-compat rule).

## 4.5 Offline synchronisation approach

MVP: nothing syncs; progress/settings/artwork are device-local (honest UI label, C-02). Phase 2 (parent account): per-profile change-log with lamport timestamps; last-writer-wins for settings, additive merge for progress/rewards; artwork sync opt-in and end-to-end encrypted; deletion is a tombstone that propagates before purge. Full design gated on updated PIA.

## 4.6 Authentication & authorisation

- **Child:** never authenticates. Profile selection only.
- **Parent (MVP):** possession of device + parental gate (+ optional OS biometric). Parent PIN, if enabled, stored as salted hash in OS keystore/Keychain — never in SQLite.
- **Parent (phase 2 accounts):** email + passkey/OTP (no child email anywhere); tokens in secure storage; server-side authorisation on every request; child profiles are rows owned by the parent account — **children have no credentials, ever**.
- **CMS staff:** SSO + MFA, RBAC roles (docs/12), server-side enforcement, immutable audit log.
- **API keys/secrets:** none in the app binary (NFR-003); mobile uses public CDN + signed manifests; any privileged operation is server-side. CI secret scanning (gitleaks) gates merges.

## 4.7 Analytics architecture (AN-001)

MVP: on-device aggregation only → parent report. The `Telemetry` interface in core has exactly one production implementation: `LocalAggregator`. A future `BatchedAnonymousExporter` (opt-in, no identifiers, k-anonymity threshold ≥ 50 before dashboard display, AU-region storage, 90-day raw retention) ships **only after** the Kids-Category/Play-Families and PIA assessments in docs/07 §7. Crash reporting: deferred until an assessed provider/self-hosted Sentry passes the same review; MVP relies on store-console vitals (aggregate, no SDK).

## 4.8 Deployment environments

| Env | Purpose | Notes |
|---|---|---|
| dev | local + PR builds | mock packs |
| staging | EAS internal distribution + TestFlight/Internal testing track | staging content API |
| prod | App Store (Kids Category, band "5 & under"+"6–8") / Play (Families, Teacher Approved application) | AU-region backend, prod CDN |

## 4.9 Backup, recovery & deletion

- Device data participates in OS backups (Android Auto Backup / iCloud) — encrypted by the OS; artwork included; documented in privacy notice. Sensitive keys excluded via backup rules.
- Backend (phase 2): daily encrypted snapshots, 35-day retention, AU region, restore runbook + quarterly restore test.
- **Deletion:** parent-triggered wipe removes profile, progress, rewards, artwork, usage ledger, settings in one transaction + file unlink; verified by automated test; confirmation summary shown. Phase 2 adds server-side cascade + backup-expiry note ("removed from backups within 35 days") — legal review item.

## 4.10 API specification

OpenAPI 3.1 spec for the phase-2 content service: **docs/05-api-specification.yaml** (manifest, pack download, revocation list, CMS workflow endpoints). MVP app uses only the three unauthenticated read endpoints.

## 4.11 Performance budgets

Cold start < 3 s (mid-2019 tablet); activity load < 1.5 s; stroke render ≤ 1 frame (16.6 ms); puzzle drag 60 fps; memory < 350 MB during drawing; pack install atomic (temp dir + rename). Budgets enforced by the phase-3 device-lab suite (docs/13 §4).
