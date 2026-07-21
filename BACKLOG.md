# Backlog

A running list of ideas and not-yet-started work for Little Grip. Drop half-formed
ideas here as they come up; we knock them out in focused batches rather than one-at-a-time
(see the "Working efficiently" note in `CLAUDE.md`). Keep entries short — one line of intent,
plus a note on scope/surface if it matters.

Status key: `[ ]` open · `[~]` in progress · `[x]` done (move to the bottom or delete)

## Open

- [ ] **Wire the number 0 clay art.** Owner uploaded `Tracing - 0.png` (still has the checkerboard
  background). Clean it with the region-size key-out pipeline → `trace-number-0.png`, then it auto-wires
  (the `trace-number-0` tracing activity already exists — it currently falls back to a plain black "0"
  in the picker). Confirm it appears in the Numbers list with the clay art after cleanup + rebuild.

- [ ] **Rewards section — simple, proud, industry-standard (all four pieces chosen).** Owner approved
  the interactive mockup (scratchpad artifact `1381b8f0-02ec-444d-ac9f-88b676d780e8`, "I like it for
  now"). Keep it uncomplicated and pressure-free; build on the existing `rewards/rewardsEngine.ts`
  (daily-capped ledger) + `renderRewards`. Four cards (2×2 grid, responsive to 1-col on phone):
  Star Jar · Trophies · Sticker Book · Certificates, with the mascot cheering in the corner.
  **Deliberately avoid** (owner + industry direction for under-7s): leaderboards/ranking, harsh
  streaks, coins/purchases, anything competitive.
  - **Star jar / meter** — stars collect into a jar that visibly fills; when it's full it "pops"
    (confetti + chime) and awards a new sticker, then resets. The satisfying fill-it-up loop; drives
    off the existing `totalStars` ledger (e.g. jar holds N stars → sticker).
  - **Milestone trophies** — a small set of big, *nameable* achievements with cute art: e.g.
    "Traced every letter", "First puzzle", "Counted to 10", "Wrote my name", "Coloured a picture".
    Each unlocks once; shown on a trophy shelf in `renderRewards`. (Replaces/augments the current
    generic badges — make them concrete and proud-worthy.)
  - **Sticker book (polish)** — a page of slots (mock uses 12); collected stickers fill in, empty
    slots show dashed circles, sparkle when a new one lands, tap a sticker to hear its name (spoken).
    **When a page fills, celebrate ("You filled the whole book! 🏆") and start a fresh blank page**
    (endless, no dead end), with a "📖 ×N filled!" tally the child can be proud of.
  - **Name certificate** — a simple screenshot-friendly card ("I can write my name!" / "I know my
    letters!") the parent can capture, shown when the matching milestone trophy is earned. Pride +
    involves the grown-up. (No sharing/upload — purely on-device visual.)
  - **Mascot celebrates** — the Little Grip mascot cheers on reward moments (jar pop, new trophy),
    reusing the existing celebrate()/sound effects. Emotional reward, no new engine.
  - Surfaces: core `rewardsEngine` (jar threshold, trophy unlock rules) + `renderRewards` (demo) then
    mobile `RewardsScreen`. Keep it demo-first; mobile port folds into the mobile-port item.

- [ ] **Don't read the child's name aloud.** Suppress the child's name in any spoken/voice output
  (privacy). Audit every `speak(...)` call that includes the nickname — e.g. the home greeting and the
  "My name" tracing activity (`loadActivity` speaks `next.title` = "My name: <nick>", and the name
  tile). Speak a generic phrase instead ("your name", "Let's write your name"), and keep the name
  only on-screen (visual), never in TTS. Demo + mobile (`audioService`/`playInstruction`).

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
