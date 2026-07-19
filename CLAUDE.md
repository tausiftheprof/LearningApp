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

Installable Android/iOS test builds are produced with EAS or a local native toolchain — see
`apps/mobile/BUILD.md` (build profiles in `apps/mobile/eas.json`). They can't be built in a
locked-down sandbox that blocks Google's Android download hosts; run them on a normal machine or
on EAS cloud.

CI (`.github/workflows/ci.yml`) runs, in order: strict typecheck, core unit tests, `npm audit
--audit-level=high`, a gitleaks secret scan, and a **child-safety manifest audit** that fails the
build if `apps/mobile/app.json` ever requests location, contacts, microphone, camera, or
advertising-ID permissions.

## Architecture

### Three surfaces share one domain core

- **`packages/core`** (`@littlegrip/core`) — all domain logic as pure, framework-agnostic
  TypeScript (no React/RN imports). Runs in Node, the Expo app, and (bundled via esbuild) the
  browser. Everything is exported flat from `src/index.ts`. Each concern is a self-contained
  module under `src/<domain>/`: `tracing` (corridor-following engine; corridor widths per
  difficulty live in `tracingConfigFor` and set both the tolerance AND the drawn band thickness),
  `puzzles`, `rewards`,
  `screenTime`, `parentalGate`, `recommendation`, `dailyPlan`, `drawing`, `feedback`,
  `home` (`homeTilesForAge` — the age-adaptive set of home-screen doors, shared by both
  renderers), `progress`, `profiles`, `settings`, `account` (parent cloud-sync, off by default),
  `deletion`, and `content` (the zod-validated content-pack schema + the bundled illustrative
  starter pack).
- **`apps/mobile`** — the real Expo/React Native product. Renders core state with Skia canvases
  and RN views. `metro.config.js` adds the workspace root to Metro's `watchFolders`, so the app
  resolves both `@littlegrip/core` and shared repo-root artwork (e.g. the mascot `HomeScreen`
  `require`s from `assets/images/`). The launcher icon + web favicon live in `apps/mobile/assets/`
  (`icon.png`, `adaptive-icon.png`, `favicon.png`), wired through `app.json`.
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

**Tracing glyphs & flow**: letter (A-Z capital+small pair) and number (0-10) stroke skeletons are
authored as polylines in `content/glyphs.ts` (`digitStrokes`/`letterStrokes`), shape strokes in
`content/starterPack.ts`; both feed the same corridor engine. Strokes render one at a time — the
**current** step is highlighted (bold guide + direction arrows drawn from the stroke's own
tangents, chevrons pointing the trace direction), earlier steps glow "done", later steps stay
greyed until their turn. On completion the player **auto-advances to the next item in the same
section** (letters / numbers / shapes), wrapping after the last, with no "Home" prompt between
them (the top-bar home button is the exit). Behind letters/numbers/name the player draws ruled
"notebook" lines (`tracingGuideLines` returns the top/mid/base y in design space). **Trace-name**
is a runtime-built activity (`nameStrokes(nickname)` lays the child's own name out on the baseline)
— it is not in the static pack, so each renderer builds it from the active profile. The
`tracingConfigFor` widths above control how thick the traceable band is. Any glyph/shape edit must keep every stroke completable — the
`packages/core/__tests__/tracing.test.ts` "every glyph is completable" test simulates a finger
following each stroke and is the guard.

**Feature gating**: a template/mechanic can exist in the schema and starter pack while being
unimplemented on one surface. `apps/mobile/src/screens/child/games/registry.ts`
(`IMPLEMENTED_GAME_TEMPLATES`) and `web-demo/demo-shell.html`'s `IMPLEMENTED_TEMPLATES` are the
gates — an activity whose template isn't listed is filtered out of pickers entirely (no teasers,
no broken screens) rather than shown half-working. Check these before assuming a game template
"exists" on both surfaces.

### Multi-child profiles, screen time, rewards

`screenTime/screenTime.ts` and `rewards/rewardsEngine.ts` are daily-capped, ledger-based state
machines (not wall-clock timers) so they're deterministic and unit-testable. `parentalGate/` is a
word-form-arithmetic gate with lockouts and auto-relock, gating the entire parent area
(`apps/mobile/src/screens/parent/`), which itself provides screen-time controls, the deletion
flow, and the optional (off-by-default) cloud-sync account settings.

The child Home is **age-adaptive**: `home/homeLayout.ts`'s `homeTilesForAge(ageBand)` returns the
ordered set of doors for a band (fewest, largest tiles for `2-3`; more for `3-5`/`5-7`), and both
renderers consume it, so the home content always matches the profile. Tiles are icon + label only
(no per-tile subtitle) to keep reading load off pre-readers.

## Key constraints when changing things

- No child accounts, credentials, or login of any kind, ever — the parent `account` module is
  email + one-time-code, and children never authenticate.
- Any new backend-shaped feature must be built as an honestly-labelled scaffold — never silently
  imply a real backend/asset exists when it doesn't. `apps/mobile/src/services/audio.ts` is the
  reference: sound **effects** are real (procedurally-generated `assets/sounds/*.wav` played via
  `expo-audio` — no plugin, so no mic/RECORD_AUDIO permission), while instruction **voice**
  (`playInstruction`) stays a documented silent no-op until the CMS ships the soft-female-voice
  recordings (docs/12).
- `strict: true`, `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes` are on
  (`tsconfig.base.json`) — array/object indexing needs explicit narrowing or `!`.
- Shared content artwork lives in `assets/images/` (`README.md` there documents which filename
  maps to which feature); replacing a same-named file and rebuilding swaps it everywhere, so don't
  hardcode image paths elsewhere. The one exception is the app's launcher icon / web favicon, which
  are Expo-project files in `apps/mobile/assets/`. Full-page scene artwork (e.g. the flood-fill
  Colour line-art) is square and is drawn *contain*-fitted (letterboxed), never stretched to the
  stage — keep that when touching any renderer that blits a whole image to a canvas.
- After touching `packages/core` or `web-demo/demo-shell.html`, rebuild with
  `node web-demo/build.mjs` before considering the change done.
