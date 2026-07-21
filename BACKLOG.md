# Backlog

A running list of ideas and not-yet-started work for Little Grip. Drop half-formed
ideas here as they come up; we knock them out in focused batches rather than one-at-a-time
(see the "Working efficiently" note in `CLAUDE.md`). Keep entries short — one line of intent,
plus a note on scope/surface if it matters.

Status key: `[ ]` open · `[~]` in progress · `[x]` done (move to the bottom or delete)

## Open

- [ ] **Tracing polish — thinner band + drop the colour picker (match the mock).** Two owner
  corrections to the shipped tracing screen (mock reference: scratchpad artifact
  `27410411-324f-4437-b5ae-3500d6f6006e`). Both are in `renderTracing()` in `web-demo/demo-shell.html`
  (rebuild + mobile `TracingPlayer.tsx` after):
  - **Band is far too thick.** The drawn band is `config.corridorWidth * 2` (= 240 design units at
    default difficulty, ~75% of a capital's height) — the mock's band was ~19%. Fix: introduce a
    `drawBand = config.corridorWidth * 0.5` and derive EVERY drawn size from it so they stay in scale —
    band `lineWidth = drawBand*scale`; ruled-line inset `half = drawBand/2`; ink `= drawBand*0.62`;
    dotted track `= drawBand*0.28`; leader/start dot radius `= drawBand*0.4`; start arrow
    `ah = drawBand*0.55`. (Tolerance stays `corridorWidth` — only the *drawn* guide gets slimmer, so
    it's still forgiving.) A ready diff was drafted this session; reapply it.
  - **Remove the trace-colour picker.** Owner: "colour is not needed in tracing anymore — I want it as
    in the mock." The mock has a single accent-coloured ink and no right-side colour panel. Drop the
    `.trace-panel` colour swatches (rainbow/black/grey/glitter/colour-blind) and paint the ink in one
    colour (the theme accent, like the mock). Decide the **CAPS toggle** (name tracing) — it currently
    lives in that panel; either relocate it to the left actions or drop it. `fillPaint()`/`traceColor`
    state can go.

- [ ] **Drop the name label on picture-obvious bubbles.** Where the bubble image already says what it
  is, the plain-text name under it is redundant — hide `.bubble-label` for those (keep the bubble's
  `aria-label` for screen readers; label still spoken on tap). Applies to:
  - **Puzzles** picker (the jigsaw picture is enough).
  - **Tracing → Letters and Numbers** lists (the clay `A a` / `5` art is enough — owner direction).
    Shapes keep their names for now (pentagon vs hexagon clay blobs are easy to confuse) unless owner
    says otherwise.
  In `renderPicker`, pass an empty/suppressed label when `category` is `puzzles`, `tracing-letters` or
  `tracing-numbers`. Demo + mobile.

- [ ] **Straight-line tracing — vertical AND horizontal (fix icon/screen mismatch).** The clay icon is
  a **vertical** line but the activity geometry is **horizontal** (`trace-line-straight` =
  `line(150,500 → 850,500)` in `starterPack.ts`). Both a down-stroke `|` and an across-stroke `—` are
  core pre-writing skills, so give the child both. Options considered:
  - (a) a **rotate toggle** on the activity — extra UI/comprehension load for 2-5s; not recommended.
  - (b) **two separate activities** — "Down line" (vertical) + "Across line" (horizontal), each a
    single clean stroke. Cleanest for the littlest band. Needs a horizontal icon (rotate the vertical
    clay art 90° via the art pipeline; the vertical art keys the down-line).
  - (c) **two strokes in one activity** (vertical then horizontal) — one tile/icon, teaches both, but
    the single vertical icon only hints at the first stroke.
  **Recommendation: (b)** two separate activities (vertical + horizontal), horizontal icon derived by
  rotating the clay art. Keep them first in the Shapes list (2-3 pre-writing warm-ups).

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
