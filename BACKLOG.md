# Backlog

A running list of ideas and not-yet-started work for Little Grip. Drop half-formed
ideas here as they come up; we knock them out in focused batches rather than one-at-a-time
(see the "Working efficiently" note in `CLAUDE.md`). Keep entries short — one line of intent,
plus a note on scope/surface if it matters.

Status key: `[ ]` open · `[~]` in progress · `[x]` done (move to the bottom or delete)

## Open

- [ ] **Port the demo-first tracing controls to the mobile app.** The colour picker
  (rainbow/black/grey/glitter/colour-blind), CAPS toggle, right-side panel, left undo/trash,
  and the fun name-completion card currently exist and are verified only in the web demo.
  Porting them to `apps/mobile/.../players/TracingPlayer.tsx` is best paired with a
  device/emulator run so the touch UI can actually be driven.

### New little games still to build (need the owner's cute/funny art, ages 2-5)

These three are genuinely new mechanics (not yet in the app) and each needs its own art set,
per the agreed one-game-at-a-time flow. The other four the owner picked already exist or are
built: **Feed the Animal** ✅ (built with real art), **Pop the Bubbles** ✅ (exists),
**Sorting Bins** ✅ (exists as `drag-sort`), **Count & Tap** ✅ (exists as `counting`).

- [ ] **Cutting Practice** — drag "scissors" along a dotted line. Reuses the tracing corridor
  engine. Needs: 1 scissors sprite (+ optional fun paper shapes).
- [ ] **Build a Face** — drag eyes/nose/mouth onto a blank head. Needs: 1 head + 4-8 face parts.
- [ ] **Number Path Hop** — tap stepping stones 1→2→3 in order. Needs: 1 stone/lilypad
  (+ optional hopping character).

- [ ] **Verify the mobile app is adaptive across device sizes.** The web demo was audited and
  fixed for 320-1366px (July 2026); the Expo app's layouts (`HomeScreen`, players, pickers)
  haven't been checked on small phones vs. large tablets — best done on a device/emulator.

## Done

- [x] **Feed the Animal** (2 characters) — drag food into a hungry mouth; it chomps (image swap
  + bounce), soft "nom" per bite, stars + chime on finish. Built with the owner's real art:
  **Mascot** eats treats (strawberry, cupcake, watermelon, ice cream); **Kangaroo** eats plants
  (2 plants + grass). Cut out from the uploads (background removed, interior whites kept). Demo +
  mobile + core content + test.
- [x] **Top bar layout** — star + rewards total now sit next to the child's name; Grown-ups and
  Rewards icons share one row, top-right.
- [x] **Blank Canvas → straight to canvas** — the intermediate picker is skipped; tapping Blank
  Canvas opens the drawing canvas immediately.
- [x] **Colour: removed 3 pages** — "Fish by Numbers", "Pack of Balloons", "Rocket" dropped.
- [x] **Colour split into two sections** — **"Colour by Numbers"** (owner's 4 uploaded pages:
  Bunny, Car, Flower, Puppy — processed into `assets/images/scene-cbn-*.png`, flood-fill with the
  number key printed in the art) and **"Colour Your Way"** (the 6 free scenes). Two-door chooser
  with back navigation.
- [x] **"Big Kid Games" retired** — the preschool games moved into "Little Games" (toddler); the
  5-7 home band now shows Little Games + Think & Solve. A genuine big-kid set to be designed later.
