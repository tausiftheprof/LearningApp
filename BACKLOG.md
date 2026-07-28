# Backlog

A running list of ideas and not-yet-started work for Little Grip. Drop half-formed
ideas here as they come up; we knock them out in focused batches rather than one-at-a-time
(see the "Working efficiently" note in `CLAUDE.md`). Keep entries short — one line of intent,
plus a note on scope/surface if it matters.

Status key: `[ ]` open · `[~]` in progress · `[x]` done (move to the bottom or delete)

## Open

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

- [ ] **Fix tracing fill "jump" + enforce start-from-the-dot.** Touching near the END of a
  shape (especially closed polygons, where the last corner sits near the start) fills almost
  the whole glyph for a moment — confusing. Cause: `lastPos = max(lastPos, result.pathPosition)`
  accepts *any* nearest-point fraction, so a far touch leaps the fill ahead. Fix: only advance
  the fill **contiguously** — accept a new `pathPosition` only when it's within ~0.12 of the
  current `lastPos` (tune), so the ink can only grow by tracing forward from the start dot;
  a touch at the end does nothing. This also enforces "start on the dot" visually with no voice.
  **Shared logic — apply to BOTH `web-demo/demo-shell.html` (`renderTracing`) and mobile
  `TracingPlayer.tsx`.** (Optional later: once CMS instruction-voice ships, add a spoken "Start
  on the dot!" — today mobile's `playInstruction` is a documented silent scaffold, so voice
  won't play yet.)

- [ ] **Section-complete card for tracing (numbers/letters/shapes).** When a child finishes the
  whole set (e.g. 0→10 numbers), don't just silently wrap to the start — celebrate: give a star +
  show a two-button card **"Play again" (restart the set from the first item) / "Back (one screen)"**,
  mirroring the game-completion pattern (Feed the Animal is the reference). Today tracing
  auto-advances and wraps after the last item with no end-of-set moment. Applies to demo
  (`renderTracing` `letterQueue` wrap) + mobile (`TracingPlayer` / `ActivityPlayerScreen` advance),
  for all three sets (letters / numbers / shapes).

- [ ] **Polygon tracing start points — use the school convention (top vertex, clockwise).**
  Hexagon, pentagon and rectangle currently start partway along the right side. There's no strict
  school standard for polygons, but the teaching norm is **start at the top and trace clockwise**
  (rectangle: top-left corner, across the top first). Round shapes (circle/oval) + triangle
  (apex → base L-to-R) are already school-correct; re-author the polygon skeletons in
  `content/starterPack.ts` so their start vertex is at the top and stroke order is clockwise, and
  keep every stroke completable (the `tracing.test.ts` "every glyph is completable" guard). Owner
  to confirm "top-start, clockwise" before the geometry change.

- [ ] **Swap the Games tile to the revised (pastel) Play badge.** Owner uploaded
  `assets/images/Icon - Games home screen 3.png` — same composition as the shipped one
  (trophy / coins / rocket / rainbow / clouds / stars) but in a softer pastel palette that
  matches the Candy-Clouds theme better. Build step: check alpha (looks transparent already,
  but confirm — if it's the baked checkerboard, region-size key-out), trim + cap ~560px,
  overwrite `assets/images/tile-toddler.png` (the key the Games tile is already wired to),
  delete the messy-named source, `node web-demo/build.mjs`, republish `ad14d5cb`.

- [ ] **Port the recent demo-first work to the mobile app.** These all shipped and are verified in
  the web demo but are not yet in the Expo app (mobile needs a device/emulator to drive + verify):
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
