# Backlog

A running list of ideas and not-yet-started work for Little Grip. Drop half-formed
ideas here as they come up; we knock them out in focused batches rather than one-at-a-time
(see the "Working efficiently" note in `CLAUDE.md`). Keep entries short — one line of intent,
plus a note on scope/surface if it matters.

Status key: `[ ]` open · `[~]` in progress · `[x]` done (move to the bottom or delete)

## Open

- [ ] **Consistent "bubble" visual language across all inner screens.** Owner approved the bubble-tile
  mockup for the games picker (round balloon tiles + plain-text names, gentle bob, pop + sparkle on
  tap) and wants that look carried through every inner page for one coherent app. **Home screen stays
  unchanged** — it's the approved landing; bubbles are the language for everything *inside* it.
  Build-ready spec:
  - **Bubble tiles + plain-text labels on every "pick something" grid** (replaces the current
    `.big-tile` rectangles in the picker): Little Games, Puzzles, Think & Solve; the choosers —
    Colour (2 doors), Draw (3 sections), Tracing chooser; and the Tracing lists (shapes / letters /
    numbers). Round tile, artwork/emoji bursting out, name as **plain bold text under** the bubble
    (no white pill — owner chose plain text over ribbon/inside/none). Each game keeps its own art
    (feed→mascot, cut→scissors, hop→lily-pad); shape tiles show the shape outline inside the bubble,
    letter/number tiles show the big glyph pair. Tile/bubble colours rotate from the **active theme
    palette** (`tiles()`), so Candy/Storybook/Aussie each stay coherent.
  - **Shared chrome on every "do the activity" screen** (workspaces — tracing, colouring, feed, cut,
    hop, draw, puzzles): NOT bubbles. Unify the frame instead — same rounded home button, white pill
    buttons, one completion-card style (the "play again + back" card), and **accent/success colours
    pulled from the child's active theme** instead of the hardcoded orange/green. (This folds in the
    already-drafted "theme-matched inside screens" plan — the start-dot, tool highlight, banner, and
    primary buttons become `var(--accent)`/`var(--success)`.)
  - **One shared tap language everywhere**: gentle idle bob on tiles, a pop-scale + sparkle burst on
    tap (respect `prefers-reduced-motion`), matching the mockup.
  - **Reference mockup**: scratchpad artifact `91d4579a-a1d3-494c-8c23-128e0071cc30`
    (styling lives in `demo-shell.html`'s `.big-tile`/`.picker-grid` block).
  - **Surfaces**: demo-first (`web-demo/demo-shell.html` picker + player chrome, then
    `node web-demo/build.mjs`); mobile port (`ActivityPickerScreen.tsx` `BigTile` + players) folds
    into the existing mobile-port item. No core/schema change — this is renderer styling only.

- [ ] **Port the recent demo-first work to the mobile app.** These all shipped and are verified in
  the web demo but are not yet in the Expo app (mobile needs a device/emulator to drive + verify):
  - The two new games — **Cutting Practice** (`cut-along`) and **Number Path Hop** (`number-hop`)
    — are demo-only; add them to `apps/mobile/.../games/registry.ts` + `GamePlayer`/new players.
  - **Feed the Animal** — layout tweaks (big centre animal + right food column), seamless feeding,
    and the Again/Back completion card (no Home) — demo has them; mobile `FeedAnimalGame` doesn't.
  - **Draw panel redesign** (Magic drawer) — demo `renderDrawing` done; port to mobile `DrawingBoard`.
  - **Colour by Numbers number-locked flow** — core data + demo done; mobile has no line-art
    colouring pipeline at all yet (line-art scenes are filtered from the mobile picker).
  - **Tracing controls** (colour picker / CAPS / undo-trash / name-finish) — still demo-only.
  - **Stylus behaviour on-device** — pen-first fixes shipped (see Done); verify with the real stylus.

- [ ] **Rename "Little Games" → "Games".** The home door labelled **Little Games** becomes just
  **Games** (and "Big Kid Games" is already retired, so there's one games door). Change the `label`
  in `packages/core/src/home/homeLayout.ts` (`LITTLE_GAMES`), update the "Little Games" wording in
  code comments / `themes.ts` notes, and the `renderPicker` "Pick one!" flow is unaffected. Check for
  any hardcoded "Little Games" string in `demo-shell.html` / mobile and the homeLayout test
  expectations; update copy + tests together. Renderer/copy only — no mechanic change.

- [ ] **Tracing upgrade — cleaner guide, directional dot, ruled lines, school-correct strokes.**
  Owner approved the redesigned tracing screen (mock: scratchpad artifact
  `27410411-324f-4437-b5ae-3500d6f6006e`, "neat, clean, light, seamless"). Apply to the real tracing
  engine — `renderTracing()` in `web-demo/demo-shell.html` first (then `node web-demo/build.mjs`),
  then mobile `TracingPlayer.tsx` (mobile-port item). Build-ready spec:
  - **Seamless grey guide**: the traceable band is ONE flat soft-grey shape (no darker outline/rim),
    thick and rounded. The child's ink trail is drawn thinner than the band, in the theme accent,
    turning "done" green per stroke (this matches `tracingConfigFor` widths — keep band > ink).
  - **Directional guide = glowing dots + one leading colour dot**: the current stroke shows a static
    dotted white track plus a **single accent-coloured dot that travels along the stroke in the trace
    direction** (start → end), with a pulsing start dot + a small direction arrow at the start. Drop
    the old scattered trailing dots and the "sweeping trail" variant — owner chose the single leader
    dot. One stroke active at a time; finishing one lights up the next.
  - **Ruled "notebook" lines** (`tracingGuideLines` already returns top/mid/base y): draw a top line,
    a **dashed midline** (x-height) and a baseline. **Letters must sit BETWEEN the lines** — size each
    glyph so the band's *outer edge* only touches the lines, never crosses: capitals span top→base,
    x-height letters span midline→base, so account for half the band width as inset when laying out
    glyph geometry (`glyphs.ts` / shape strokes).
  - **School-correct start point & direction for EVERY glyph** (owner emphasis): e.g. lowercase **a**
    starts on the **right (~2 o'clock)** and goes **all the way around anticlockwise** ("c then close"),
    then the down-stem — NOT from the top. Round glyphs/shapes start top-and-anticlockwise per the
    existing CLAUDE.md rule; audit every letter/number/shape skeleton in `glyphs.ts` +
    `starterPack.ts` so each begins where a teacher would start it and the leader dot follows that
    order. The `tracing.test.ts` "every glyph is completable" guard must still pass.
  - **No pop-out reward** on finish (owner dropped it) — keep the existing name/word-finish celebration
    (sparkle + advance to next item in the section).
  - **Per-letter clay art (owner uploading)**: owner is supplying 3D-clay letter/number/shape art
    (e.g. `Tracing - A.png`) shown as the small header "this is the letter" label (and available if we
    ever want a reward image). **These uploads have a checkerboard baked in as the background, NOT real
    transparency** — process each with the art pipeline (flood-fill/region-remove the white+grey
    checker to transparent by region size so enclosed counters like A's triangle & a's ring clear too,
    keep clay highlights, trim, cap width, save clean `assets/images/` keys). Ask owner to enable
    "transparent background" on export to skip this.
  - Demo-first; mobile port folds into the existing mobile-port item.

- [ ] **Home screen — add life & polish (keep the approved art/layout).** Owner approved a mockup
  (scratchpad artifact `f1349581-e720-422d-a309-4a0c05faf86c`) that keeps the existing Candy-Clouds
  illustrated tiles and colours but adds motion and tightens the top bar. Build-ready spec:
  - **Keep** the real illustrated blob-card tiles (`CANDY_TILE_PHOTOS`) and per-tile colours/labels —
    owner likes them; do **not** swap to bubbles or emoji here (home stays distinct from the inner
    bubble screens).
  - **Shared tap language** (same as the bubble work): gentle idle **bob** on tiles, a **squish on
    press** (scale-down + slight drop), and a **pop + sparkle burst** on tap. Respect
    `prefers-reduced-motion`. The tile art already has its own soft drop-shadow so it reads liftable —
    no hard rectangular bottom-edge (would clip wrong behind the transparent-corner blob art).
  - **Mascot greeter**: put the real `mascot.png` in the greeting card beside "Hi \[name\]!", with a
    subtle idle **hop** animation (not a wave — the mascot has no free hand).
  - **Merge the star count into the greeting**: `⭐ × N` sits **inline, right next to the child's
    name** inside the greeting card (owner confirmed inline beside, not underneath) — remove the
    separate star pill from the top-right, leaving only Rewards + Grown-ups there.
  - **Size-cap the tiles** so they stay small/tidy on tablets instead of blowing up: cap each tile
    (~172px) and centre-pack the grid (`repeat(auto-fit, minmax(132px, 172px))`), rather than a fixed
    2-column grid that stretches. Phone still ~2 across; tablet gets more at a sensible size.
  - **No hero tile** — owner preferred the uniform equal-tile layout; dropped.
  - Surfaces: demo `renderHome()` in `demo-shell.html` (then `node web-demo/build.mjs`); mobile
    `HomeScreen`/tiles port folds into the mobile-port item. Renderer/styling only, no core change.

- [ ] **"What comes next?" — more pages with the owner's uploaded art, split by age.** Today there
  is a single page (`preschool-sequence`, sun/moon SVG icons, plain A-B alternation). Build more
  pages from art already in `assets/images/` (feed foods: strawberry / cupcake / watermelon /
  ice-cream / grass / plant1 / plant2; plus hop-stone, cut-cake, cut-car, mascot):
  - **Easy pages (ageBands `['3-5']`)**: simple **AB** patterns, short sequence (~4 shown + "?"),
    2-3 answer choices. Suggested pages: fruit snack (strawberry/watermelon), sweet treats
    (cupcake/ice-cream), kangaroo food (grass/plant1).
  - **Difficult pages (ageBands `['5-7']`)**: harder pattern types — **ABC**, **AAB**, **AABB** —
    longer sequence (~6 shown), 3 answer choices. Suggested pages: picnic mix
    (strawberry/cupcake/watermelon ABC), garden (plant1/plant2/grass AAB or AABB), on-the-go
    (cut-car/hop-stone/mascot ABC).
  - **Engine change needed**: `sequenceGame` in `demo-shell.html` only alternates two images —
    add a `pattern` param to the schema/params (e.g. `'AB' | 'ABC' | 'AAB' | 'AABB'`) and have
    the renderer build the shown sequence + correct answer from it, rounds cycling which image
    plays which role. Confirm `itemHtml()` resolves raster keys (feed-* PNGs), not just SVG names.
  - Per-page tiles follow the per-game icon rule (each page can show its own first image).
  - Demo-first; mobile port folds into the existing port item above.

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
