# Backlog

A running list of ideas and not-yet-started work for Little Grip. Drop half-formed
ideas here as they come up; we knock them out in focused batches rather than one-at-a-time
(see the "Working efficiently" note in `CLAUDE.md`). Keep entries short — one line of intent,
plus a note on scope/surface if it matters.

Status key: `[ ]` open · `[~]` in progress · `[x]` done (move to the bottom or delete)

## Open

- [ ] **Guided Drawing — "zoom & build" step trace (from owner cat worksheet).** Owner reference: a
  6-step "Cute Cat" guided-drawing worksheet (oval → ears → eyes/nose/mouth → whiskers → body/legs/tail →
  coloured reveal). Corrected trace mechanic (owner: "it should trace towards the edge, not random spots";
  "show step 1 only, trace the dotted line, then expand to step 2"). Approved-for-review mock:
  artifact `64c16821-447e-4223-a4ed-f6d3d9bdd220` (vector cat, all 6 steps live). Requirements the mock
  nails, to fold into `GuidedDrawingPlayer`/`guidedBuilds.ts` + demo `renderGuidedBuild`:
  - **The dotted guide IS the object's edge.** Each step's stroke is a real polyline/outline of that part,
    so tracing follows the edge exactly (never arbitrary points). We already author guided-drawing geometry
    this way (`guidedBuilds.ts` polylines) — the fix is presentation, not data model.
  - **One step shown at a time, camera zoom that EXPANDS.** Start zoomed on step 1's part; as each step
    completes, refit the camera to the bbox of everything drawn so far so the view grows (step 1 tight →
    step 5 whole figure). New for the renderers (both currently show the whole subject at once).
  - **Multi-stroke steps trace in order**, previous strokes solid, current dashed + leader dot, upcoming
    faint. (Matches the existing per-stroke tracing; just grouped by worksheet step + a step caption
    "Add two ears on top".)
  - **Coloured reveal as the payoff** (step "N": your cute cat is ready) + confetti — the guided-drawing
    completion, non-covering.
  - Content note: worksheet subjects can be authored as vector (like the cat) OR the owner supplies the
    6-frame raster and we trace corridors over each frame. Vector is preferred (edge-exact, themeable).
  - This is the TRACE half; the unicorn mock (`8acdfc90`) is the COLOUR half. A full subject could chain
    zoom-build-trace → colour.

- [ ] **"Colour Your Way" experience upgrade — pattern/gradient/glitter fills (+ optional trace-to-build
  intro, scene finish).** From an owner reference video (a toddler colouring app) — mock built &
  approved-for-review as scratchpad artifact `8acdfc90-db42-405b-898b-933b7c92de90` (unicorn, all
  features live). Goal: make our existing flood-fill **Colour Your Way** feel like the video without a
  new section — it's an enhancement of the current line-art colouring engine on both surfaces
  (`renderColouringLineArt` in `demo-shell.html`; `LineArtColouringPlayer` in mobile `ColouringPlayer`).
  Build-ready spec:
  - **Pattern fills (the headline, NEW).** Beyond solid colours, a region can be filled with a repeating
    **texture**: stripes, confetti, leopard/spots, polka, stars, hearts. Implement as a swatch whose
    "paint" is a tile: on fill, stamp the tile clipped to the flooded region mask (demo: an offscreen
    canvas tiled + `globalCompositeOperation='source-in'` against the region mask, or an SVG `<pattern>`
    for the vector path; mobile Skia: `Skia.Shader`/`ImageShader` with `TileMode.Repeat` painted into the
    flooded mask, mirroring the existing `SkImage` paint-buffer rebuild). Reuse the current BFS flood mask
    — patterns just change what colour each masked pixel gets.
  - **Gradient & glitter fills (NEW).** Rainbow **linear gradient** across the region's bbox; **glitter** =
    base colour + scattered sparkle specks + a gentle shimmer (demo: CSS/animated overlay clipped to mask;
    mobile: sparkle dots baked into the paint buffer + a subtle animated brightness). We already have
    rainbow/glitter/glow as *brushes*; this is the same idea as a whole-region *fill*.
  - **Palette drawer additions.** Add a "patterns" row to the existing right colour rail + full palette
    grid (both surfaces already have the rail + slide-up grid). No locked/premium swatches — the video's
    app gates some; ours stays fully free (child-experience rule).
  - **Decorative spots (NEW authoring).** Optional pre-placed fillable dots on a scene (author as extra
    small closed regions in the line-art, or `byNumberPlan`-style target points for taps). Nice-to-have.
  - **Trace-to-build intro (mostly HAVE).** The video builds the outline by tracing dashed parts first —
    that's essentially our **Guided Drawing** (part-by-part trace→fill). Follow-up: add the sparkle trail
    to the tracing/guided renderers and optionally chain "build → colour" into one flow.
  - **Scene finish + cheer (HAVE, combine).** Drop the finished picture onto a themed scene background
    (scenes already exist for Colour) and fire the existing non-covering Option-B toast + mascot. Don't
    reintroduce a covering popup.
  - Suggested slice order: (1) pattern + gradient + glitter fills on the **demo** Colour Your Way (verify
    headless: fill a region with each, assert the mask pixels changed + zero console errors), (2) mobile
    Skia port of the same, (3) optional spots + trace sparkle + scene-finish chaining. Start with (1) —
    highest impact, reuses the whole flood-fill + rail.

- [ ] **Change the Flower icon in the Guided Drawing picker.** The Flower subject
  (`draw-guided-flower`) currently shows its `feed-plant1.png` reference (a potted plant) as the tile
  icon — owner wants a proper flower icon. **Blocked on owner art:** no dedicated cute flower clay
  tile exists in `assets/images/` yet (only `scene-cbn-flower.png`, a line-art colouring page, which
  isn't tile-suitable). Owner to drop a flower PNG under a clean key (e.g. `guide-flower`), then wire
  it as the tile icon for `draw-guided-flower` (per-activity override in the picker's icon resolver).
  (Labels are already hidden on all Guided Drawing tiles — shipped July 2026.)

- [ ] **Guided Drawing — realistic/clay art + mobile port (follow-up to the shipped Option A).**
  The Option-A mechanic + flow shipped in the demo (see Done) using **simple geometric outlines**
  (authored as polylines in `packages/core/src/content/guidedBuilds.ts`, 0..400 space × 2.5). Two
  things remain:
  - **Realistic art.** Per owner direction the final subjects should read like the real object /
    clay render, not primitive shapes. Re-author each subject's `strokes` in `guidedBuilds.ts` with
    detailed traceable outlines traced from the owner's PNGs (or commissioned line-art), and show
    the owner's PNG as a faint reference behind. Keep every stroke completable (the headless
    build-to-completion verify in scratchpad `verify-guided.mjs` is the guard — it drives a real
    trace through all six).
  - **Mobile port.** `apps/mobile/.../GuidedDrawingPlayer` still runs the old whale pilot. Port the
    build-a-picture renderer (reads the same `guidedBuilds` data: `label` / `strokes` / `fill` /
    `fixedColour` per step) — step strip, per-part colour rail, fixed-colour parts, completion card.
  - **Optional:** per-part brush texture (crayon/paint) — the demo fills parts flat with the chosen
    colour; brush type doesn't change a flat fill, so the full Magic-drawer bar was intentionally
    reduced to a colour rail here. Add texture later if wanted.

- [ ] **Port the recent demo-first work to the mobile app.** These all shipped and are verified in
  the web demo but are not yet in the Expo app (mobile needs a device/emulator to drive + verify):
  - **Guided Drawing build-a-picture** — the 6 subjects + `renderGuidedBuild` (see Done); mobile
    `GuidedDrawingPlayer` still runs the old whale pilot. Reads `guidedBuilds` data.
  - **Tracing section-complete card** — demo shows a "Play again / Back" card at the end of each
    set (see Done); mobile `TracingPlayer`/`ActivityPlayerScreen` still just wraps to the first item.
  - The two new games — **Cutting Practice** (`cut-along`) and **Number Path Hop** (`number-hop`)
    — are demo-only; add them to `apps/mobile/.../games/registry.ts` + `GamePlayer`/new players.
  - **Feed the Animal** — layout tweaks (big centre animal + right food column), seamless feeding,
    and the Again/Back completion card (no Home) — demo has them; mobile `FeedAnimalGame` doesn't.
  - **Draw panel redesign** (Magic drawer) — demo `renderDrawing` done; port to mobile `DrawingBoard`.
  - **Colour by Numbers number-locked flow** — core data + demo done; mobile has no line-art
    colouring pipeline at all yet (line-art scenes are filtered from the mobile picker).
  - **Tracing upgrade** — seamless guide, leading dot, ruled-between-lines, clay art header, thinner
    band, single-colour ink (no colour picker) — demo done; port to `TracingPlayer.tsx`.
  - **Bubble-tile pickers + home motion** — demo done; port to `ActivityPickerScreen.tsx` (`BigTile`
    → bubble) and `HomeScreen` (idle bob / mascot hop / tap sparkle).
  - **"What comes next?" pattern pages** — new `seq-*` activities are in core, so they ship to mobile
    already; just confirm the mobile `sequence` player handles the `pattern`/raster-image params.
  - **Stylus behaviour on-device** — pen-first fixes shipped (see Done); verify with the real stylus.

- [ ] **Verify the mobile app is adaptive across device sizes.** The web demo was audited and
  fixed for 320-1366px; the Expo app's layouts haven't been checked on small phones vs. large
  tablets — best done on a device/emulator.

- ~~**Build a Face** — drag eyes/nose/mouth onto a blank head.~~ **Parked** at owner's request
  (July 2026) — revisit later. No art needed for now.

### Draw panel — two small decisions still open (defaults shipped)
(1) the **eraser** is kept (rubs out part; "Start over" wipes all) — say if you'd rather drop it;
(2) the **magic set** is rainbow/glitter/glow/star + heart stamps — stamps are emoji for now,
swap in cute art whenever ready.

## Done

- [x] **Picture dot-to-dots — puppy + elephant (Aug 2026, demo verified; mobile typecheck-clean,
  on-device rebuild pending).** Owner uploaded one worksheet image with two connect-the-dots panels
  (a puppy, an elephant), the numbered dots 1→10 printed ON the artwork. Split into
  `assets/images/dotdot-{puppy,elephant}.png` (seam-detected + verified), and each panel's ten dots
  detected/measured and stored as fractions×1000 in a new `printedDots` mode on the `dot-to-dot`
  template (`starterPack.ts`, `fracDots`). New renderer branch (demo `dot-to-dot`) blits the raster
  contain-fit, maps the stored dots onto that rect, draws the joining line (theme accent) + green ticks
  + a pulsing ring on the NEXT dot, and — crucially — does NOT stamp its own numbered circles (the
  picture already prints them). Headless check taps all 10 in order at landscape + portrait: completes
  with the star burst + non-covering "All done!" toast, zero console errors. **Mobile:** dot-to-dot was
  previously demo-only (not in `IMPLEMENTED_GAME_TEMPLATES`); added a Skia `DotToDotPlayer` (printed-dots
  mode only), a `dotArt.ts` require-map, `isImplementedGame()` gate (surfaces only the `printedDots`
  dot-to-dots so the vector whale/shape ones stay demo-only until a Skia numbered-dot renderer lands),
  routing in `ActivityPlayerScreen`, and the picker tile picture via `gamePictureFor`. `contentPack.test.ts`
  enumerates the two printed dot-to-dots. Follow-up (not blocking): port the vector dot-to-dots (whale/
  star/triangle/square) to mobile — needs Skia text/font for the on-canvas numbers.

- [x] **Tablet-testing feedback round (Aug 2026, typecheck-clean; on-device rebuild pending).** Eight
  items across tracing / puzzles / colouring / cut-along, fixed in shared core + the mobile renderers:
  **Tracing** — small `b`/`p` bowls start on the LEFT at the stem (not the top-middle); `i`/`j` carry a
  real dot (a short tap-stroke the band fills solid) not a hollow circle; `6` redrawn (cane → proper
  counter-clockwise loop); curves emit ≥1 point per ~4° so they render smooth not faceted (`arc`/`oval`
  in `glyphs.ts` + `starterPack.ts`); all shapes normalised to the letters' ~640 design size so the
  traced band is a consistent thickness; the ink no longer *looks* fully coloured before the stroke
  actually completes (`currentInk` capped at 0.9 until completion); finishing a whole section (A-Z /
  0-10 / shapes) shows a **sticker + congrats** then returns one screen after 3s (`tracingSection`
  no-wrap + `CompletionBanner sticker`). **Completion nav** — every activity now returns ONE screen to
  the list it came from (scene / letters / numbers / shapes / games group), never Home (`backCategory`
  in `ActivityPlayerScreen`, all players `onDone={goBack}`). **Puzzles** — orientation-aware layout
  (portrait = tray below, landscape = tray on the SIDE so the puzzle stays big), cell sized so board +
  tray both fit with no scrolling, snap tolerance made generous (~0.8-0.95 of a cell, floor 52) so the
  last piece sticks, and the faint guide image behind the board is visible again (0.16→0.32 + frame).
  **Cut-along** — the whole picture draws immediately and stays whole while cutting, splitting into two
  halves only in the final animation (fixes blank-until-touch + already-cut-in-half). **Colouring** —
  erased the dark border frame from all 10 line-art scenes (script, edge-dark% 95→0), and Colour-by-
  Numbers draws a **colour-coordinated number badge** on every planned region. **Still needs the owner:**
  (a) item 1's completed *coloured* Colour-Your-Way tile icons — not in the repo, please push them or
  confirm filenames; (b) numbering the blank decorative flower petals in bunny/car/puppy — needs printed
  numbers added to those regions in the source art (cleanest) or on-device verification of hand-placed
  targets, since a mis-placed target leaves a region uncolourable.
- [x] **Mobile port batch 1 (July 2026, typecheck-clean; on-device verify pending).** Landed on
  `apps/mobile` in 5 commits: (1) **picture puzzle pieces** — `PuzzlePlayer` slices the real photo +
  faint target ghost for the 11 photo jigsaws (`ui/puzzleArt.ts`), colour-tile fallback for the
  procedural SVG ones; (2) **clay home + back** buttons on the activity top bar (`ui/uiArt.ts`,
  `Theme.highContrast` gates the emoji fallback); (3) **non-covering Option-B completion** —
  `CompletionBanner` is now a slim toast + ~5s auto-return countdown + "Play again" (remount via a
  `replayKey` in `ActivityPlayerScreen`, wired for puzzle/tracing/guided/game); (4) **clay Save**
  (colouring) + **onboarding Next**; (5) **per-theme home icons** (`THEME_TILE_ART`
  candy/storybook/aussie in `HomeScreen`); (6) **Guided Drawing build-a-picture** — `GuidedDrawingPlayer`
  rewritten to the part-by-part trace→fill mechanic reading `guidedBuilds` (replaces the removed whale
  pilot); (7) **Number Path Hop** game (`number-hop` registered + `NumberHopGame`). **On-device round 1
  fixes (owner-verified):** puzzle pieces drag (RN `locationX` is child-relative → gesture window coords
  minus a `measureInWindow` origin; same fix for Feed the Animal's mouth/food), a **2×2/3×3/4×4 size
  picker**, real Fisher-Yates scatter, board+tray fit-to-screen (reachable without scrolling), puzzle
  picker tiles show each photo; plus the **Family-Link parent dashboard** (child-tinted zone + "General
  app settings" divider). **On-device round 2 fixes (owner-reported):** puzzle **snap tolerance** now
  scales with the drawn piece size (fixed pieces "not accepting" on the big-celled tablet — the pack's
  fixed 48–80px design-space radius was far smaller than a 150px piece; now ~0.65–0.95 of a cell).
  **Mobile port batch 2 (July 2026, typecheck-clean; on-device rebuild pending):** (1) **cut-along** —
  `CutAlongPlayer` (Skia + shared `TracingSession`), scissors drag, blades snip, picture splits into two
  clipped halves that tip open; `'cut-along'` registered + routed ahead of `GamePlayer`; `ui/cutArt.ts`.
  (2) **Little Games chooser** — the toddler door opens the four groups (Sort & Match / Tap & Count /
  Patterns / Busy Hands) via a `GAME_GROUPS` predicate, empty groups hidden, labelled clay group tiles,
  owner-art game tiles show their own picture (`gamePictureFor`). (3) **Multi-child switcher** — store
  tracks all `profiles` + `setActiveProfile`; `saveProfile` appends new children; deleting the active
  child re-activates a remaining one; parent Dashboard child-switcher chips + a **Children** screen
  (Switch/Delete/Add). (4) **Magic-drawer Free Draw board** — `DrawingBoard` rebuilt to the owner layout
  (right rail + white ring, crayon/paint/eraser/🪄 bar, size pod, corner undo-redo/start-over/save, wand
  drawer of rainbow/glitter/glow/star+heart stamps); Skia renders every kind (glow = blurred underlay,
  stamps = filled Skia star/heart paths); core `BrushKind` gained `glow`/`stampStar`/`stampHeart`.
  **Mobile port batch 3 (July 2026, typecheck-clean; on-device profiling pending):** the **line-art
  flood-fill colouring engine** — the last large engine — is now ported (`LineArtColouringPlayer` in
  `ColouringPlayer`, faithful port of the demo's `renderColouringLineArt`): offscreen Skia rasterise →
  `readPixels` → ink "wall" mask + background-keyed overlay → tap BFS flood-fill into a paint buffer
  rebuilt as an `SkImage` under the ink; taps on ink hop to the nearest open pixel; a paint-inside-lines
  brush stamps only non-ink pixels; **Colour-by-Numbers** is number-locked (current-number colour only, a
  region accepted only if a printed target of that number falls inside the flood). The picker un-filters
  line-art, shows each scene's picture on its tile, and gained the two-door **Colour chooser** (Colour by
  Numbers vs Colour Your Way). `ui/sceneArt.ts` enumerates the 10 scenes. **With this, no large engine is
  demo-only** — mobile mirrors the demo's activity set. **Only remaining check:** on-device flood-fill
  performance (RES=720 BFS + per-fill `SkImage` rebuild — confirm it's snappy on a real tablet). Build to
  verify: `eas build -p android --profile preview` (owner's machine).
- [x] **End-of-activity card → Option B (auto-return + replay), non-covering.** Owner picked Option B
  from the mockup (artifact `382698d1-c693-4ed5-9a83-9005bbeb6cb0`). The big covering
  `.banner.name-done` card is gone from all four bespoke end screens — tracing **section-complete**,
  **name-tracing**, **Feed the Animal**, **Guided Drawing**. New shared helper `completionOptionB(stage,
  { replay, exit, toastText, exitLabel, seconds })` in `demo-shell.html`: the star burst + chime still
  fire, a slim non-covering top toast celebrates, a bottom-corner **countdown ring** ("Back to the
  list…", 3→1) auto-returns to the picker, and a big round **replay** button in the other corner
  (owner's clay loop-arrows art, `assets/images/ui-replay.png` — keyed off the uploaded "return icon"
  PNG, luminance-cut to just the arrows) lets a child stay and go again (tapping it cancels the
  auto-return). Guards against firing after navigation (checks `wrap.isConnected`); reduced-motion
  keeps the auto-return but drops the ring animation. Verified headless: affordances render, replay
  fires + cancels exit, auto-return fires on the timer, zero console errors. Mobile port pending (in
  the port item). `.banner.name-done` CSS now unused but left in place.
- [x] **Removed the whale from Guided Drawing.** The `draw-guided-whale` pilot subject is gone from
  `starterPack.ts` (and its now-orphaned outline helpers `whaleFin/whaleSpout/whaleEye/whaleOutline`);
  `whaleBody`/`whaleTail` stay for the `draw-dotdot-whale` dot-to-dot (unchanged), and the colouring /
  jigsaw whales are untouched. The Guided Drawing picker now lists only the six build-a-picture
  subjects (Grip, Cupcake, Car, Cake, Watermelon, Flower). 161 core tests + typecheck green.
- [x] **Guided Drawing tiles: labels hidden.** `draw-guided` added to the picker's no-label set, so
  the subject bubbles are picture-forward (aria-label + spoken name kept). (Flower-icon swap is a
  separate Open item, blocked on owner art.)
- [x] **Child-delete (and all dialogs) work in the sandboxed iframe.** Native `window.confirm()/alert()`
  are silently ignored inside a sandboxed iframe (the published artifact), so the Delete button looked
  dead. Replaced the four native dialogs with in-app modal helpers (`uiConfirm`/`uiAlert`) rendered in
  our own DOM. Verified headless (native dialogs forced to throw): delete drops the child, zero errors.
- [x] **Polygon tracing start points — confirmed already top-start, clockwise** (owner approved the
  convention). Verified square, rectangle, pentagon and hexagon in `content/starterPack.ts`: the
  `polygonPath` helper begins at `-90°` (top) and increments the angle, i.e. clockwise in screen
  space; square/rectangle begin at the **top-left corner and go across the top first**; pentagon and
  hexagon begin at the **top apex** and sweep clockwise; triangle is apex → base L-to-R (already
  school-correct). The earlier "start partway along the right side" note was stale — a prior fix had
  already re-authored these. Checked visually (start dot + direction arrow) and by coordinates; the
  `tracing.test.ts` completability guard (50 tests) stays green. No geometry change needed.
- [x] **Section-complete card for tracing (demo).** Finishing the whole set (0→10, a→z, all shapes)
  no longer silently wraps to the first item — it celebrates with a star burst and a two-button
  **"🔁 Play again" (restart the set from the first item) / "⬅️ Back (one screen)"** card
  (game-completion pattern). `renderTracing`'s `letterQueue` became `tracingSection` (returns the
  ordered set + this item's index + kind); `strokeDone` shows `sectionDoneCard` at the end instead
  of wrapping. Verified headless: tracing the last number (10) and the last shape (zigzag) to
  completion pops the card, zero console errors. (Mobile port tracked in the port item.)
- [x] **Games tile → pastel Play badge.** Owner's `Icon - Games home screen 3.png` (solid near-white
  background, no alpha) keyed out with a border flood-fill of only near-white pixels (so the pastel
  art + white clouds survive), feathered, trimmed, capped to 560px → overwrote
  `assets/images/tile-toddler.png`; messy source removed. Confirmed clean over a colour + on the
  home screen (soft pastel Play badge matching Candy-Clouds).
- [x] **Tracing fill "jump" + start-from-the-dot — confirmed shipped.** The contiguous-fill guard is
  in place on both surfaces (demo `renderTracing`: a new `pathPosition` advances `lastPos` only when
  `onPath && 0 < Δ < 0.15`; mobile `TracingPlayer` mirrors it), so a touch near the end can't
  flash-fill the glyph and the child must trace forward from the start dot. Nothing further needed.
- [x] **Guided Drawing — Option A "build a picture" (demo).** Owner-picked Option A: a numbered
  **step strip** across the top (current part ringed in accent, green ✓ as each locks in), a
  right-side **colour rail**, and part-by-part **trace-to-build** over the core corridor engine.
  Each part is traced in the child's chosen colour and locks in **filled with that colour**;
  **per-part colour holds** (changing colour later never recolours earlier parts); **fixed-colour
  parts** aren't child-colourable (Grip's eyes dark, car wheels dark, car lights + cake dots +
  watermelon seeds their own colours) — the rail dims on those. Faint whole-picture ghost underneath;
  finishing fires the star burst + chime and shows the **"Draw again" / "Back (one screen)"** card
  (no Home). Six subjects — **Grip, Cupcake, Car, Cake, Watermelon, Flower** — authored as polyline
  geometry in `packages/core/src/content/guidedBuilds.ts` (single source of truth, so mobile can
  reuse it), wired into the starter pack, with the guided-drawing schema extended
  (`label`/`strokes`/`fill`/`fixedColour`, backward-compatible with the whale pilot). Demo renderer
  `renderGuidedBuild` in `demo-shell.html`. Verified headless: a real trace drives all six to
  completion with zero console errors. (Realistic art + mobile port tracked as an Open follow-up.)
- [x] **Home matches the approved mockup** — Candy home tiles are now the floating blob-card art with the label underneath, size-capped & centre-packed (`repeat(auto-fit, minmax(122px,168px))`), the teal Little Grip mascot greeter (hop), inline star, idle bob + tap sparkle. (Earlier "home polish" only added motion; this rebuilds the layout to the mockup.)
- [x] **Dot-to-Dot shapes** — new "Make a star / triangle / square" activities in Draw → Dot to Dot; joining the numbered dots closes into the shape (renderer closes the loop for `params.closed`).
- [x] **Bug fix: counting instruction** — the counting game spoke "count the apples" for every item; now says the real item ("Count the fish…") from `params.item`.
- [x] **Rewards section (demo)** — four-card My Rewards screen (Star Jar filling to the next sticker · Trophies with locked/unlocked milestones · Sticker Book paged by 12 with tap-to-hear + "book filled" tally · Certificate keepsake with the child's name), mascot cheer, driven off the existing rewards ledger. No core change.
- [x] **Tracing section icons** — owner clay cloud-badges for Letters/Numbers/Shapes/My Name in the chooser, with a Bubbles ⇄ Floating toggle to compare (default floating, matching the lists).
- [x] **Don't read the child's name aloud** — the home greeting and the name-tracing prompt now speak a generic phrase; the name stays on-screen only. (Demo; mobile in port item.)
- [x] **Updated 1/2/3 + number 0 clay art** — redrawn 1/2/3 wired (manual padding dropped), and the 0 cleaned + wired; all numbers read consistently.
- [x] **Tracing polish — thinner band + no colour picker (matches the mock).** Drawn band slimmed to `drawBand = corridorWidth*0.5` with ink/guide/leader/ruled-line inset all derived from it; the trace-colour panel removed (single accent ink); CAPS toggle moved to the left actions for the name; stage uses near-full width (no right panel). Responsive-verified phone/tablet/desktop.
- [x] **Drop name labels on picture-obvious bubbles** — Puzzles, Tracing Letters & Numbers, and both Colour lists (Colour by Numbers / Colour Your Way) hide the `.bubble-label` (aria-label + spoken name kept). Shapes keep names.
- [x] **Straight-line split — Down line + Across line** — one horizontal activity became a vertical `trace-line-down` + horizontal `trace-line-across`, each with a matching clay icon (vertical art renamed, across rotated 90°).
- [x] **Bug fix: bubble picker now scrolls** — `.bubble-grid` gained `flex: 1; overflow-y: auto`
  (+ `align-content: start`), so long lists (all 26 letters, 10 numbers) scroll instead of clipping
  at ~J. Verified the Letters list reaches Z.
- [x] **Tracing picker uses clay art on the bubbles** — letters/numbers/shapes show the owner's clay
  art instead of dark glyph text (high-contrast keeps the glyph/outline).
- [x] **Tracing upgrade (demo)** — seamless flat grey guide (no outline), a dotted track with a
  single glowing dot leading the trace direction + pulsing start dot + arrow, ruled notebook lines
  pushed out so glyphs sit BETWEEN the lines, school-correct start points (round bowl-first glyphs
  `a c d g o q`, `O Q`, `0` start at ~2 o'clock and sweep anticlockwise), the owner's clay
  letter/number/shape art as a header cue, no pop-out reward. 26 letters + 10 numbers + 10 shapes
  cleaned of their baked-in checkerboard (region-size key-out) → `trace-letter-*` / `trace-number-*` /
  `trace-<shape>` (each art file named after its activity id; `setHeader` is a direct id lookup).
- [x] **Bubble-tile pickers (demo)** — round balloon tiles + plain-text names, idle bob, pop +
  sparkle on tap, on the Games/Puzzles/Think&Solve picker and the Colour/Draw/Tracing choosers
  (shared `bubbleTile` + `sparkleBurst`).
- [x] **Home life polish (demo)** — idle tile bob, mascot hop, tap sparkle; approved art/layout,
  mascot greeter and inline star kept.
- [x] **"What comes next?" pattern pages** — `sequenceGame` generalised to AB / ABC / AAB / AABB;
  six new `seq-*` pages from the owner's food/vehicle art (easy AB for 3-5, harder for 5-7).
- [x] **Rename "Little Games" → "Games"** — home door label in core + tests + comments.
- [x] **Feed the Animal — seamless feeding + Again/Back completion** — drops are never bounced by
  the chomp animation (rapid feeds restart the chomp cleanly), the mouth drop-zone is 30% more
  generous, missed foods spring home smoothly instead of teleporting, and finishing shows only
  **"🍽️ Feed again" / "⬅️ Back (one screen)"** — no Home option. (Demo; mobile in port item.)
- [x] **Cutting Practice — split reworked (Option A)** — the two halves now **tip and slide
  outward** (rotate + drift, smoothstep-eased) like pieces flopping open, instead of the broken
  straight up/down slide; the **cut opens progressively** (a widening sliver of white paper behind
  the blades); drifting off the line pulses the scissors as a gentle come-back cue.
- [x] **Colour by Numbers — number-locked flow** — each page's palette is tagged to numbers
  (schema `byNumberPlan` + per-region target maps authored for bunny/car/flower/puppy). The child
  is locked to colour 1; filling every region marked 1 retires it and activates colour 2, and so
  on; finishing the last number celebrates + completes. Wrong-number and background taps are
  gently rejected; tapping the printed digit itself now hops to the region (kids do that).
  Verified end-to-end on all 4 pages headlessly.
- [x] **Stylus support (best-effort — verify on your device)** — pen-first palm rejection on every
  canvas (a palm landing first no longer blocks/breaks the stylus line; the pen takes over),
  coalesced high-frequency pen samples on drawing board / guided drawing / tracing / cutting /
  colouring brush (continuous lines), pointercancel no longer eats in-flight strokes, and dragged
  game items recover from cancelled touches.
- [x] **Per-game tile icons (Option A)** — the shared 🐣 chick is gone: Feed shows the real
  mascot/kangaroo art, Cutting shows the scissors art, Hop shows the lily-pad art, and every other
  game has its own emoji (🫧 🐶 🧺 🃏 🔢 🔎 🔤 ➡️ 🧱 👥 ✨ 🔷). Demo (art + emoji) & mobile (emoji).
- [x] **Tracing for the 2-3 band (Shapes only)** — 2-3 home now has the Tracing door; it opens
  straight to Shapes (no chooser, no back-to-chooser button); Letters/Numbers/My Name stay 3-5+.
  Core layout + tests + both pickers (demo & mobile).
- [x] **Draw panel redesign (Magic drawer, Layout 2)** — demo done + verified (see earlier entry).
- [x] **Cutting Practice / Number Path Hop games** — built with owner art (demo).
- [x] **Feed the Animal** (2 characters, real art) · **Top bar layout** (adaptive) · **Blank
  Canvas direct** · **Colour split two sections** · **3 colour pages removed** · **Big Kid Games
  retired** · **Responsive audit fixes** — all shipped earlier (July 2026).
