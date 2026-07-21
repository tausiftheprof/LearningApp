# Backlog

A running list of ideas and not-yet-started work for Little Grip. Drop half-formed
ideas here as they come up; we knock them out in focused batches rather than one-at-a-time
(see the "Working efficiently" note in `CLAUDE.md`). Keep entries short — one line of intent,
plus a note on scope/surface if it matters.

Status key: `[ ]` open · `[~]` in progress · `[x]` done (move to the bottom or delete)

## Open

- [ ] **Tracing — clay art for the Shapes (owner uploading).** Letters (A-Z) and numbers (1-10) clay
  header art is in and wired (`trace-letter-*`, `trace-number-*`). Shapes still need art — when the
  owner uploads them, run the checkerboard-cleanup pipeline (region-size key-out) and wire each to its
  shape id as the header cue, same as letters/numbers. The pre-writing strokes (line/curve/zigzag) may
  not need art.

- [ ] **Port the recent demo-first work to the mobile app.** These all shipped and are verified in
  the web demo but are not yet in the Expo app (mobile needs a device/emulator to drive + verify):
  - The two new games — **Cutting Practice** (`cut-along`) and **Number Path Hop** (`number-hop`)
    — are demo-only; add them to `apps/mobile/.../games/registry.ts` + `GamePlayer`/new players.
  - **Feed the Animal** — layout tweaks (big centre animal + right food column), seamless feeding,
    and the Again/Back completion card (no Home) — demo has them; mobile `FeedAnimalGame` doesn't.
  - **Draw panel redesign** (Magic drawer) — demo `renderDrawing` done; port to mobile `DrawingBoard`.
  - **Colour by Numbers number-locked flow** — core data + demo done; mobile has no line-art
    colouring pipeline at all yet (line-art scenes are filtered from the mobile picker).
  - **Tracing upgrade** — seamless guide, leading dot, ruled-between-lines, clay art header — demo
    done; port to `TracingPlayer.tsx` (plus the trace-colour picker / CAPS controls).
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

- [x] **Tracing upgrade (demo)** — seamless flat grey guide (no outline), a dotted track with a
  single glowing dot leading the trace direction + pulsing start dot + arrow, ruled notebook lines
  pushed out so glyphs sit BETWEEN the lines, school-correct start points (round bowl-first glyphs
  `a c d g o q`, `O Q`, `0` start at ~2 o'clock and sweep anticlockwise), the owner's clay
  letter/number art as a header cue, no pop-out reward. 26 letters + 10 numbers cleaned of their
  baked-in checkerboard (region-size key-out) → `trace-letter-*` / `trace-number-*`.
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
