# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Little Grip** — a local-first, ad-free fine-motor-skills learning app for children aged 2-7
(Android/iOS via Expo), designed against Australian child-privacy/safety requirements from the
start. There are no child accounts, no child email, no third-party SDKs that touch data, and no
network calls in the child experience — the bundled starter content pack lets it run fully
offline. Compliance conclusions in `docs/` are engineering-informed, not legal advice.

## Working efficiently with the owner (token-frugal iteration)

Most of this app's work is iterative UI polish on the tracing/child screens, where each
round re-reads large files (`web-demo/index.html`, `web-demo/demo-shell.html`,
`packages/core/src/content/starterPack.ts`) and re-runs the rebuild + headless verify. To
keep that cheap:

- **Batch related tweaks.** Ten fixes in one request ≈ one read + one `node web-demo/build.mjs`
  + one verify pass. The same ten fixes split across ten requests multiplies all three. When
  the owner sends a list, do the whole list before rebuilding/verifying once.
- **One canonical demo artifact.** There is a single live product-demo artifact,
  `ad14d5cb-effe-480d-a58f-890dc36a4e5a` — republish only that one after a rebuild. (An older
  duplicate `aa33398b-…` exists; ignore it — do NOT keep it in sync. Republishing two identical
  artifacts every change is pure waste.)
- **Don't waste tokens on redundant work** (owner direction): no re-reading files already in context,
  no re-verifying an unchanged surface, no double-publishing, no narrating options you won't take.
- **Prefer a visual reference over prose for shape/direction work.** "Left to right" was
  ambiguous enough to cause several wrong-direction rebuilds; a marked-up screenshot or "like a
  school handwriting worksheet" resolves it in one pass. When a request is visual and the
  wording is ambiguous, ask for a reference (or offer a quick either/or mock) *before* building
  the real thing — cheaper than build → reject → rebuild.
- **Honour the owner's stated definition of done.** If the owner says they'll check the demo
  themselves, skip the headless screenshot verify and just make the change + rebuild. Only run
  the full verify pass when correctness isn't otherwise being confirmed.
- **`BACKLOG.md` (repo root) is the owner's working queue.** A message starting "backlog:" (or
  "record feedback in the backlog") means *record it there and push — do not build yet*; the owner
  batches items and later says "build everything from the backlog". Design decisions reached in
  conversation (chosen mockup, icon mapping, mechanic details) get written into the item as a
  build-ready spec so a future session needs no archaeology. Done items move to the file's Done
  section.
- **Mock before building visual redesigns.** For layout/panel redesigns the owner likes to pick
  from 2-3 interactive HTML mockups (published as a scratchpad artifact) and iterate on the mock
  (icons, rings, canvas colour) *before* any real code is touched — far cheaper than reworking the
  live renderers.
- **Owner-supplied art pipeline.** The owner uploads cute 3D-clay-style PNGs (white/cream
  backgrounds, messy filenames) via GitHub — often mid-conversation, so `git pull --rebase` before
  looking. Process each batch with a throwaway sharp script: flood-fill transparency inward from
  the borders (tolerance ~42-44, corners as the background seed, feather edge pixels) so interior
  whites survive, trim, cap width ~560px, and save under a clean `assets/images/` key (e.g.
  `feed-mascot-open`, `cut-scissors-open`, `hop-stone`). Then view the result to confirm the
  cutout is clean before wiring it in. **Some uploads have a checkerboard baked in as the
  "transparent" background** (alternating white + light-grey squares — e.g. `Tracing - A.png`), which
  is *not* real transparency and which a border flood-fill can't fully clear (enclosed counters like
  A's triangle or a's ring are walled off from the border). For those, key the checkerboard out by
  **connected-region size**: classify low-saturation light pixels (`sat < ~0.18 && light > ~0.66`) as
  background, label bg regions, drop every region larger than ~220px (removes the exterior *and* the
  enclosed holes) while small clay highlights survive; feather one ring; then trim/cap/save. Verify by
  compositing over a solid colour and viewing. Ask the owner to enable "transparent background" on
  export to skip all this — the later home-icon sets (the `Option 1/2/3` uploads → `sb-*`/`au-*`/
  `tile-games-play`) already shipped with real alpha, so those just needed `trim()` +
  `resize({ fit: 'inside' })`, no flood-fill. **Clean up raw uploads once processed**: the
  messy-named originals (`Option N icon - *.png`, root `Tracing - N.png`) are redundant after they're
  saved under clean keys — `git rm` them (history keeps a copy) so they don't bloat the repo or the
  inlined demo bundle (`build.mjs` inlines every raster in `assets/images/`).

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
locked-down sandbox that blocks Google's Android download hosts (and this session's egress policy
403-blocks `api.expo.dev`, so `eas login`/`eas build` must be run on the **owner's** machine, not
here); run them on a normal machine or on EAS cloud. The working recipe (July 2026): `eas build -p
android --profile preview` builds an **installable APK** (the `preview` profile → `buildType: apk`,
internal distribution). The EAS project is `@justraji/little-grip` (`owner` + `extra.eas.projectId`
are committed in `app.json`). Two gotchas are already baked in: the update **`channel` was removed**
from the profiles so EAS doesn't auto-install `expo-updates` (its transitive Kotlin-2.2 libs break
SDK 53's Kotlin-2.0 build — `expo-updates:kspReleaseKotlin` fails), and **`EAS_SKIP_AUTO_FINGERPRINT=1`**
is set in the profile `env` (the fingerprint walk choked on a file read). OTA updates can be re-added
later with a proper Kotlin pin when heading to production. NB the owner's clone lives under a
**OneDrive** path, which intermittently locks files during `git pull`/checkout and EAS's file walk —
pausing OneDrive clears it.

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
  stale silently (no build step catches this). The demo wraps the app in a framed "device" mock for
  desktop viewing, but on phones / small or short viewports (`@media (max-width: 900px), (max-height:
  700px)`) it goes **full-bleed** — the header/engine-badges/footer chrome is hidden and `.device`
  fills `100dvh` — so every contain-fit activity centres and auto-sizes to the real screen (owner
  direction, July 2026). Keep that when touching the shell layout. Two things that only bite on the
  now-wider full-bleed screen: **bubble-grid columns are capped** (`repeat(auto-fit, minmax(…, 172px))`
  + `justify-content: center`), not `1fr` — otherwise a handful of tiles stretch edge-to-edge into one
  squashed row; and **`renderGuidedBuild`'s `fit()` centres the picture's own bounding box** in the
  space left of the colour rail (reserves `railW`/`stripH`), not the raw 0..1000 box, so an
  off-centre-authored subject (or the rail) doesn't shove the drawing to one side.

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
"Set up (for grown-ups)" → fill `#nick` → pick an age (the `.choice-row` buttons; default 3-5) →
"Next" → "Agree and start playing". When the owner says they'll check visually, verify with
**assertion-based headless checks instead of screenshots** — simulate the child's flow (drag foods
to the mouth, tap every colour-by-number target in order, drag the full cut line) and assert DOM
outcomes + zero console errors. This also validates hand-authored coordinate data (e.g. a CBN
target placed on ink stalls the simulated flow and fails loudly).

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
`match-pairs`, `counting`, …, plus the owner-art games `feed-animal`, `cut-along`, `number-hop`).
`content/starterPack.ts` builds the bundled `ContentPack` — most
activity geometry is procedurally generated (helpers like `arc()`, `line()`, `polygonPath()`) in
a shared 0..1000 design space, but a growing set of activities now uses **real owner artwork**
referenced by pack-relative `images/...` paths: the Feed the Animal characters/foods, the cutting
scissors/pictures, the hop lily-pad, and the `scene-cbn-*` Colour-by-Numbers pages. A content pack
is hash-verified and revocable; the schema is structurally incapable of
expressing link-outs, chat, or free-text collection — that's a deliberate safety property, not an
oversight, so don't loosen the schema to "just add a field" without checking docs/07-09.

**Section structure inside doors** (owner direction, July 2026): **Colour** opens a two-door
chooser — "Colour by Numbers" (`colour-cbn-*`, owner pages with the number key printed in the art)
vs "Colour Your Way" (the free flood-fill scenes) — split by id prefix in the picker. **Draw**'s
"Blank Canvas" tile skips the intermediate picker and opens `draw-free-board` directly; the free
board's controls follow the owner-approved "Magic drawer" layout (right colour rail with a white
selected ring, slim bar of crayon/paint/eraser/🪄 wand, floating size pod, wand-opened drawer with
rainbow/glitter/glow/stamp brushes, undo-redo + start-over/save in the corners). **Big Kid Games
is retired** — the former `preschool` games are all `category: 'toddler'` ("Little Games") and no
activity uses `preschool`; 5-7 gets Little Games + Think & Solve. **Tracing shows for every band**,
but both pickers route the 2-3 band **straight to the Shapes list** (no chooser, no back button —
back would loop); Letters/Numbers/My Name are 3-5+.

**Little Games splits into four groups** (owner direction, July 2026): the `toddler` door opens a
chooser (`renderGameSections`) — **Sort & Match**, **Tap & Count**, **Patterns**, **Busy Hands** —
each a `games-*` sub-category listing only its own games (with a back button to the chooser). Group
membership is a template predicate in the `GAME_GROUPS` array (demo `demo-shell.html`); empty groups
(the youngest band) are hidden. This mirrors the Tracing/Colour/Draw chooser pattern. **Sort by
colour** is now three leveled multi-page activities (`toddler-sort-colour` 2-bucket, `sort-colour-three`,
`sort-colour-four`), each running **five pages back-to-back** via a `params.pages` array on the
`drag-sort` template — finish a page and the next appears (progress dots + a confetti beat between),
the run ends after the last page. The renderer's `buildColourPage()` helper draws one round; a bucket
count of 2/3/4 ladders by skill (beginner/developing/confident). (Demo-only so far; mobile picker +
drag-sort port pending.)

**Colour by Numbers is number-locked**: each `colour-cbn-*` activity carries a `byNumberPlan`
(schema field) — `[{ number, colour, targets }]` where `targets` is **one point per numbered
region as fractions (0..1) of the square artwork**. The child is locked to colour 1 until every
region marked 1 is filled, then 1 retires and 2 activates; the last number completes the page.
When authoring targets, put each point on/near the printed digit — the fill check samples a
~4.5% neighbourhood around the target (the digit itself is ink and never flooded), and taps on
ink hop to the nearest open pixel. Wrong-number/background taps are spoken-rejected, never filled.

**Cut-along** (Busy Hands): the child drags the scissors along a dotted line across a picture; on
completion the picture splits in two. `params.line` is the wiggle style (`straight`/`wavy`/`zigzag`)
and `params.orientation: 'vertical'` runs the cut **top-to-bottom** (splitting left/right) instead of
the default left-to-right (splitting top/bottom). The two halves are clipped as **simple,
complementary polygons** — mind the winding: each half must trace the cut path so its closing edges
don't cross, or you get a self-intersecting bow-tie that clips the picture into a pinched "hourglass"
(it looks pre-cut before a single snip). Activities: `toddler-cut-{car,cake,strawberry,cupcake,
watermelon}` reuse the clay food/vehicle art; the `contentPack.test.ts` enumerates them, so adding
one updates that expectation.

**Activity-completion pattern** (owner direction, July 2026): **nothing covers the child's finished
work.** The old `completionBanner` popped a full card (🎉 + Home) over the drawing/puzzle/glyph and hid
it; it is retired from every activity — tracing, drawing/guided save, colour-by-number, flood-fill
colouring, jigsaw and dot-to-dot now append a slim, non-covering **`doneToast`** ("🎉 All done!") that
pins to the top, celebrates and fades on its own, leaving the artwork fully visible (the top bar's
back/home handle navigation). Generic games still **auto-return** to the games list on their own
(`renderGame`'s `finish()` after ~1.2s). The four **bespoke** end screens — tracing **section-complete**,
**name-tracing**, **Feed the Animal**, **Guided Drawing** — used to pop a big covering `.banner.name-done`
card (owner: "covers half the screen"); they now share **`completionOptionB(stage, { replay, exit,
toastText, exitLabel, seconds })`** ("Option B", owner-picked from mockup `382698d1-…`): the star burst +
chime fire, a slim top toast celebrates, then a **centred bottom stack**: a big, clearly-labelled
**"Play again"** button (owner clay loop-arrows art `assets/images/ui-replay.png` + text — owner wanted it
prominent and named, not a bare corner icon) over a small **countdown pill** that auto-returns to the
picker after **~5s** (`seconds` default 5). Tapping Play again cancels the auto-return. The
helper guards against firing after navigation (`box.isConnected`) and honours reduced-motion (keeps the
auto-return, drops the ring animation). **Don't reintroduce a covering popup** — `.banner.name-done` CSS
is now dead. (Demo done; mobile port pending.)
**Picker icons**: game tiles never use the category illustration or the old 🐣 chick — each template
resolves its own art (feed → `params.open` character, **cut → the activity's own `params.image`
picture** — cake/car/strawberry/cupcake/watermelon, not the scissors — hop → lily-pad), else a
**per-activity** override (`GAME_ICON`, keyed by id) or a per-template emoji (`GAME_EMOJI`). The
**games-list pages hide tile labels** (`showLabel` false for any `games-*` category, alongside
puzzles / letter+number tracing / both Colour lists) — picture-forward bubbles. The **Busy Hands
group tile** (in `renderGameSections`) uses the scissors clay art via an optional `img` on its
`GAME_GROUPS` entry (high-contrast falls back to the ✂️ glyph). The old off-brand 🃏 joker card and
the single ➡️ shared across every pattern game were replaced (July 2026) so no two tiles repeat and
each reads as its own cute, on-theme icon; tile emoji are sized to fill the bubble like the clay art.
Three of the four **Little Games group tiles** now use owner **labelled clay art** (the group name
baked into the picture): `GAME_GROUPS` entries `games-sort`/`games-tap`/`games-patterns` carry
`img` + `labelled: true`, so `renderGameSections` renders the art large, floats it **bare** (no
coloured bubble) and **hides the separate text label**. Busy Hands still uses the unlabelled scissors
art + a text label until a matching "Busy Hands" labelled icon lands.

**Owner clay UI buttons** (July 2026): the top-bar **home** (`home-icon`) and **back** (`back-icon`),
the onboarding **Next** (`next-icon`), and the colouring-page **Save** (`save-with-label`) are the
owner's clay button art, wired through the shared **`clayBtn(imgName, ariaLabel, fallbackGlyph, size)`**
helper (bare `.clay-btn`, no white circle — the art carries its own tile+shadow; falls back to the
emoji `.icon-btn` in high-contrast mode). The Draw board's tiny toolbar Save (`mk`/`mkCorner`) stays
the 💾 glyph — a labelled tile doesn't fit that button row.

**Tracing glyphs & flow**: letter (A-Z capital+small pair) and number (0-10) stroke skeletons are
authored as polylines in `content/glyphs.ts` (`digitStrokes`/`letterStrokes`), shape strokes in
`content/starterPack.ts`; both feed the same corridor engine. Stroke direction follows the
"school way" the owner chose — round glyphs/shapes curve **anticlockwise**, starting at about
**2 o'clock (top-right), not 12 o'clock**: the pen goes up-and-over to the left first ("c, then
close"), so `a c d g o q` (and `0`, circle, oval) begin on the right and sweep all the way around —
lowercase **a** specifically is the reference the owner corrected (**start right, around, then the
down-stem — never from the top**). Capital A starts at the apex (left diagonal, right diagonal,
crossbar); the triangle starts at the apex with its base left-to-right. When authoring/adjusting any
skeleton, put the **start point where a teacher starts it** and order the strokes so the leading
guide dot follows that path. **Glyphs must also sit BETWEEN the ruled lines** — size each so the
traceable *band's outer edge* only touches the lines (inset the centre-line geometry by ~half the
band width): capitals span top-line→baseline, x-height letters span midline→baseline, nothing spills
past a line. Strokes render one at a time — the **current** step is highlighted (bold guide
+ direction arrows drawn from the stroke's own tangents, chevrons pointing the trace direction),
earlier steps glow "done", later steps stay greyed until their turn. On completion the player **auto-advances to the next item in the same
section** (letters / numbers / shapes), wrapping after the last, with no "Home" prompt between
them (the top-bar home button is the exit). Behind letters/numbers/name the player draws ruled
"notebook" lines (`tracingGuideLines` returns the top/mid/base y in design space). **Trace-name**
is a runtime-built activity (`nameStrokes(nickname)` lays the child's own name out on the baseline)
— it is not in the static pack, so each renderer builds it from the active profile. **`nameStrokes`
lays every letter at FULL single-letter size (`s = 0.5`), NOT a width-fit scale** — capitals must reach
the top ruled line and the band must keep the single-letter proportion, so a long name is simply wider
in design space and the renderer's content-bounds `fit()` shrinks the whole thing uniformly (the ruled
lines share the transform, so the capital stays on the top line at any size). Don't reintroduce a
`min(0.5, AVAIL_W/total)` scale — that floats the capital at the midline and makes the band look chunky. The
`tracingConfigFor` widths above control how thick the traceable *band* is (the flat seamless grey
band the child colours in), while the **ink** is a single theme-accent colour (`ink = accent`, the
active theme's accent — no colour picker; that was removed) drawn thinner than the band and, crucially,
**filling the glyph along its own centre-line** rather than tracking the raw finger: `drawFill()`/
`inkPath()` fill each finished stroke fully and the current stroke up to `lastPos` (monotonic
arc-length progress), so the letter visibly colours in as it's traced. On final completion the glyph
fills whole, a bigger `celebrate(24)` star burst fires, and `playChime()` sounds (see the audio note
below). The name keeps a CAPS toggle in the left actions (demo-first; mobile shares the core + widths).
Any glyph/shape edit must keep every stroke completable — the
`packages/core/__tests__/tracing.test.ts` "every glyph is completable" test simulates a finger
following each stroke and is the guard.

**Feature gating**: a template/mechanic can exist in the schema and starter pack while being
unimplemented on one surface. `apps/mobile/src/screens/child/games/registry.ts`
(`IMPLEMENTED_GAME_TEMPLATES`) and `web-demo/demo-shell.html`'s `IMPLEMENTED_TEMPLATES` are the
gates — an activity whose template isn't listed is filtered out of pickers entirely (no teasers,
no broken screens) rather than shown half-working. Check these before assuming a game template
"exists" on both surfaces. Development is **demo-first**: features land and get verified in the
web demo, then the mobile port follows (tracked in `BACKLOG.md`). **Ported to mobile so far**
(July 2026): the approved **Home** (floating art tiles incl. the Play badge, teal mascot, inline
star, idle bob + tap sparkle — `HomeScreen.tsx`), the **tracing overhaul** (seamless band, ink
fills the centre-line, glowing leader dot, ruled-between-lines, chime + star burst —
`TracingPlayer.tsx`, Skia), and the **bubble-tile pickers + cloud section icons + clay glyph art**
(`ActivityPickerScreen.tsx`). Metro only resolves **literal** `require()` paths, so all mobile
glyph/section/shape-game art is enumerated in `apps/mobile/src/ui/tracingArt.ts`
(`TRACING_ART`/`SECTION_ICONS`/`SHAPE_GAME_ART`, keyed by activity id / section key) — add new art
there, not via a computed path. **Still demo-only** (mobile port pending): the new games
(`feed-animal` new layout, `cut-along`, `number-hop`, number-locked `colour-cbn-*`), the Draw
Magic-drawer panel, the **Guided Drawing "build a picture"** subjects (Grip/Cupcake/Car/Cake/
Watermelon/Flower — one part traced at a time, each locking in filled with the child's colour;
geometry authored as polylines in `packages/core/src/content/guidedBuilds.ts`, single source of
truth for the mobile port; guided-drawing steps carry `label`/`strokes`/`fill`/`fixedColour`;
demo renderer `renderGuidedBuild`. `fit()` centres the picture's own bounding box in the space left
of the colour rail — for EVERY subject, not the raw 0..1000 box. On a **fixed-colour step** (wheels,
seeds, eyes…) the rail is NOT a dead grey palette — `updateRail` shows a **single lively swatch** of
that set colour (idle pulse + `pop` bounce/`playPop` on touch) so a child feels it respond instead of
getting frustrated. **Each stroke fills the instant it's traced**, not when the whole step finishes —
a step with two strokes (two wheels, two windows) must colour the first one in immediately, so
`paint()` colours strokes `< strokeIndex` of the current step (don't revert to filling only on step
completion). Test seam `window.__lgTest.guided` (`fixed()`/`goToStep`/`completeStroke`/`map`) drives
steps/strokes for headless checks. Also the tracing clay-art **header** cue, and the tracing controls; the tracing
**fill is contiguous** on both surfaces now (a new `pathPosition` is accepted only within ~0.15 of
`lastPos`, so a touch near the end can't flash-fill the glyph — this also enforces start-on-the-dot).
Responsive grids on mobile size tiles/bubbles from `useWindowDimensions()` (viewport-driven columns,
like the demo's CSS `auto-fit minmax`), and give every `<Image>` explicit numeric dimensions — a
percentage width through an `Animated` wrapper doesn't resolve and the image overflows at full res.

### Multi-child profiles, screen time, rewards

`screenTime/screenTime.ts` and `rewards/rewardsEngine.ts` are daily-capped, ledger-based state
machines (not wall-clock timers) so they're deterministic and unit-testable. `parentalGate/` is a
word-form-arithmetic gate with lockouts and auto-relock, gating the entire parent area
(`apps/mobile/src/screens/parent/`), which itself provides screen-time controls, the deletion
flow, and the optional (off-by-default) cloud-sync account settings.

**Grown-ups area layout** (owner direction, July 2026, demo `renderParent`): a Family Link pattern —
a **child-tinted zone** (badge, avatar, name, level pill, child-switcher chips, stats, and that
child's rows: Progress, Screen time, Saved artwork, Settings) bounds everything about the selected
child; a **"General app settings"** divider + a "this device" note then separate the account rows
(Privacy & data, Cloud backup & sync, Subscription, Help) on neutral ground, so account settings
don't read as per-child. The four per-child config screens fold into one **Settings for [Name]** page
(difficulty, sound, voice, theme, accessibility). A dedicated **Children** screen (reached via
"＋ Add / manage") lists each child with **Switch** and **Delete** — delete runs
`deletion.deleteAllChildData`, then re-activates a remaining child or returns to onboarding when the
last one goes. (Demo-first; mobile parent screens unchanged so far.)

The child Home is **age-adaptive**: `home/homeLayout.ts`'s `homeTilesForAge(ageBand)` returns the
ordered set of doors for a band (fewest, largest tiles for `2-3`; more for `3-5`/`5-7`), and both
renderers consume it, so the home content always matches the profile. Tiles are icon + label only
(no per-tile subtitle) to keep reading load off pre-readers. Home-tile artwork is **per-theme**
(`THEME_TILE_PHOTOS` in `demo-shell.html`, July 2026): every theme uses the same finalised floating
capped-tile layout (the "Option 2" look), only the icon set differs — Candy Clouds keeps its clay
tiles (Games tile → the "Play" badge `tile-games-play`), Soft Storybook uses the `sb-*` set, Little
Aussie Adventure the Australian-animal `au-*` set. High-contrast mode falls back to emoji medallions.
(Demo-first; mobile home still ships only the Candy set.)

**Theme reaches the inside screens too** (not just Home): the demo's `render()` publishes the active
theme onto `#app` as CSS custom properties — `--accent`, `--success`, `--tile-ink` (high-contrast
overrides them to `#0000CC`/`#006600`/`#FFFFFF`). Player chrome then inherits the theme via
`var(--accent, …)` / `var(--success, …)` with the old hardcoded orange/green kept only as fallback
(start dot / holding button / tool-active tint / primary button / card border → `--accent`; banners →
`--success`; `.danger`/`.teal` parent affordances stay fixed). So a Candy child sees pink chrome and an
Aussie child green — one look end-to-end. When adding a player surface, colour it from these vars, not a
new literal. Mobile already threads `theme.accent`/`theme.success` through its players for the same reason.

## Key constraints when changing things

- No child accounts, credentials, or login of any kind, ever — the parent `account` module is
  email + one-time-code, and children never authenticate.
- Any new backend-shaped feature must be built as an honestly-labelled scaffold — never silently
  imply a real backend/asset exists when it doesn't. `apps/mobile/src/services/audio.ts` is the
  reference: sound **effects** are real (procedurally-generated `assets/sounds/*.wav` played via
  `expo-audio` — no plugin, so no mic/RECORD_AUDIO permission), while instruction **voice**
  (`playInstruction`) stays a documented silent no-op until the CMS ships the soft-female-voice
  recordings (docs/12). The **web demo** synthesises its own effects live in WebAudio instead of
  shipping an audio file — `playChime()` (a soft ascending C5·E5·G5·C6 triangle-wave arpeggio, fired
  from `completeActivity()` and at each tracing/CBN completion) and `playPop()` (a one-shot bite blip)
  — both gated on the active profile's `sound.effects` toggle and scaled by `sound.volume`, mirroring
  how `speak()` honours the voice toggle; a no-op where WebAudio is unavailable. So effects are
  audible/testable in the browser with no bundled asset, while the mobile `audioService` chime stays
  the documented silent scaffold until the CMS audio lands.
- `strict: true`, `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes` are on
  (`tsconfig.base.json`) — array/object indexing needs explicit narrowing or `!`.
- Shared content artwork lives in `assets/images/` (`README.md` there documents which filename
  maps to which feature); replacing a same-named file and rebuilding swaps it everywhere, so don't
  hardcode image paths elsewhere. The one exception is the app's launcher icon / web favicon, which
  are Expo-project files in `apps/mobile/assets/`. Full-page scene artwork (e.g. the flood-fill
  Colour line-art) is square and is drawn *contain*-fitted (letterboxed), never stretched to the
  stage — keep that when touching any renderer that blits a whole image to a canvas.
- **Pointer-input house rules** (stylus support, July 2026) — any new canvas/drag surface must
  follow the patterns already in `demo-shell.html`: **pen-first palm rejection** (one active
  pointer, but a `pointerType === 'pen'` pointerdown always takes over from a resting palm/finger,
  committing any in-flight stroke — never the other way round); consume
  **`getCoalescedEvents()`** in pointermove so fast stylus strokes stay continuous; treat
  **`pointercancel` as "commit/return", never "discard"** (strokes are kept, dragged items spring
  home); and interpolate between samples where the engine needs dense points. Misses/returns
  animate (spring home), they don't teleport.
- After touching `packages/core` or `web-demo/demo-shell.html`, rebuild with
  `node web-demo/build.mjs` before considering the change done.
