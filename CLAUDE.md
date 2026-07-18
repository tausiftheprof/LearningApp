# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Little Grip** — a local-first, ad-free fine-motor-skills learning app for children aged 2-7
(Android/iOS via Expo), designed against Australian child-privacy/safety requirements from the
start. There are no child accounts, no child email, no third-party SDKs that touch data, and no
network calls in the child experience — the bundled starter content pack lets it run fully
offline. Compliance conclusions in `docs/` are engineering-informed, not legal advice.

## Commands

```bash
npm install                          # workspaces: packages/core + apps/mobile
npm test                             # core unit tests (npm test --workspace=@littlegrip/core)
npm run typecheck                    # strict TS across all workspaces
npm run lint                         # no-op today: no workspace defines a "lint" script yet

# Single test file / pattern (run from packages/core, or pass --workspace):
npm test --workspace=packages/core -- tracing
npx jest --config packages/core/jest.config.js puzzles

cd apps/mobile && npx expo start     # run the Expo app (Expo Go / dev client)

node web-demo/build.mjs              # rebuild web-demo/index.html after ANY core or demo-shell change
```

CI (`.github/workflows/ci.yml`) runs, in order: strict typecheck, core unit tests, `npm audit
--audit-level=high`, a gitleaks secret scan, and a **child-safety manifest audit** that fails the
build if `apps/mobile/app.json` ever requests location, contacts, microphone, camera, or
advertising-ID permissions.

## Architecture

### Three surfaces share one domain core

- **`packages/core`** (`@littlegrip/core`) — all domain logic as pure, framework-agnostic
  TypeScript (no React/RN imports). Runs in Node, the Expo app, and (bundled via esbuild) the
  browser. Everything is exported flat from `src/index.ts`. Each concern is a self-contained
  module under `src/<domain>/`: `tracing` (corridor-following engine), `puzzles`, `rewards`,
  `screenTime`, `parentalGate`, `recommendation`, `dailyPlan`,
  `drawing`, `progress`, `profiles`, `settings`, `account` (parent cloud-sync, off by default),
  `deletion`, and `content` (the zod-validated content-pack schema + the bundled illustrative
  starter pack).
- **`apps/mobile`** — the real Expo/React Native product. Renders core state with Skia canvases
  and RN views.
- **`web-demo`** — a single self-contained `index.html`, built by `web-demo/build.mjs`, which
  esbuild-bundles `packages/core` inline and inlines `assets/images/*` as data (SVGs as markup;
  raster PNG/JPG downsampled with `sharp` to the size the demo actually renders — tiles ≤400px,
  scene photos ≤1000px — and re-encoded as WebP, so `index.html` stays a few MB not ~50MB;
  the `assets/images/` originals are left full-res for the mobile app and print/CMS). It is a full
  parallel implementation of the UI in vanilla JS/canvas (`demo-shell.html`), used to preview and
  test features against the *real* core engines without an Expo toolchain. **Any change to a core
  engine or to `demo-shell.html` requires re-running `node web-demo/build.mjs`** or the demo goes
  stale silently (no build step catches this).

Because the mobile app and the web demo are two independent renderers of the same
`@littlegrip/core` engines, a new feature typically touches: one core module (+ its
`packages/core/__tests__/*.test.ts`), the corresponding renderer function/case in
`web-demo/demo-shell.html`, and the corresponding `apps/mobile/src/screens/child/players/*.tsx`
(or a new one) wired into `ActivityPlayerScreen.tsx`.

**Verifying UI changes**: the mobile app can't be driven here without an emulator, so the web
demo is the practical way to exercise a feature end-to-end. `demo-shell.html` exposes a Playwright
test seam — `window.__lgTest` (`{ navigate, getState, activateProfile }`) drives/reads any screen.
Drive `web-demo/index.html`
(after rebuilding it) with headless Chromium via these hooks. Onboarding path in the demo:
"Set up (for grown-ups)" → fill `#nick` → pick an age → "Next" → "Agree and start playing".

### Storage: repository interfaces are the seam

`packages/core/src/storage/repositories.ts` defines `ProfileRepository`, `ProgressRepository`,
`RewardsRepository`, `ArtworkRepository`, `ScreenTimeRepository`, `AccountRepository` (the last is
a **singleton**, not per-profile — one parent identity owns every local child profile). `memory.ts`
provides `InMemory*` implementations for tests; `apps/mobile/src/storage/db.ts` implements the
same interfaces over `expo-sqlite`, with a forward-only `MIGRATIONS` array run on startup. Routing
everything through these interfaces is what lets deletion (`deletion/deletion.ts`) wipe all of a
child's data in one orchestrated, testable path (docs/07 §7.4).

### Content packs, not hardcoded activities

`content/schema.ts` defines a zod `activitySchema` (discriminated union on `type`) and
`gameTemplateIds` (the closed set of mini-game templates: `dot-to-dot`,
`match-pairs`, `counting`, …). `content/starterPack.ts` builds the bundled `ContentPack` — every
activity's geometry is procedurally generated (helpers like `arc()`, `line()`, `polygonPath()`) in
a shared 0..1000 design space, since production illustrations arrive later via the CMS pipeline
(docs/12). A content pack is hash-verified and revocable; the schema is structurally incapable of
expressing link-outs, chat, or free-text collection — that's a deliberate safety property, not an
oversight, so don't loosen the schema to "just add a field" without checking docs/07-09.

**Feature gating**: a template/mechanic can exist in the schema and starter pack while being
unimplemented on one surface. `apps/mobile/src/screens/child/games/registry.ts`
(`IMPLEMENTED_GAME_TEMPLATES`) and `web-demo/demo-shell.html`'s `IMPLEMENTED_TEMPLATES` are the
gates — an activity whose template isn't listed is filtered out of pickers entirely (no teasers,
no broken screens) rather than shown half-working. Check these before assuming a game template
"exists" on both surfaces.

### Mazes (extracted)

The maze activity — its collision engine, players, artwork and the `path-maze` template — was
split out into a separate repository (`little-grip-mazes`) to be developed on its own, and is no
longer part of Little Grip. Don't re-add a `path-maze` template or maze activities here without
bringing the engine back first.

### Multi-child profiles, screen time, rewards

`screenTime/screenTime.ts` and `rewards/rewardsEngine.ts` are daily-capped, ledger-based state
machines (not wall-clock timers) so they're deterministic and unit-testable. `parentalGate/` is a
word-form-arithmetic gate with lockouts and auto-relock, gating the entire parent area
(`apps/mobile/src/screens/parent/`), which itself provides screen-time controls, the deletion
flow, and the optional (off-by-default) cloud-sync account settings.

## Key constraints when changing things

- No child accounts, credentials, or login of any kind, ever — the parent `account` module is
  email + one-time-code, and children never authenticate.
- Any new backend-shaped feature must be built as an honestly-labelled scaffold (see
  `apps/mobile/src/services/audio.ts`'s "MOCK/ILLUSTRATIVE" pattern) — never silently imply a real
  backend exists when it doesn't.
- `strict: true`, `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes` are on
  (`tsconfig.base.json`) — array/object indexing needs explicit narrowing or `!`.
- Artwork lives only in `assets/images/` (`README.md` there documents which filename maps to which
  feature). Replacing a same-named file and rebuilding swaps it everywhere; don't hardcode image
  paths elsewhere.
- After touching `packages/core` or `web-demo/demo-shell.html`, rebuild with
  `node web-demo/build.mjs` before considering the change done.
