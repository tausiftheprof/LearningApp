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

- [ ] **Top bar layout (home header).** Move the star + rewards total to sit next to the
  child's name. Place the Grown-ups and rewards icons next to each other on one line, top-right.

- [ ] **Blank Canvas is currently 2 screens** (Draw → Blank Canvas lands on an intermediate
  screen before the canvas). Skip the middle step — go straight to the final drawing/canvas
  screen as soon as "Blank Canvas" is tapped.

- [ ] **Colour section — remove three pages:** "Fish by Numbers", "Pack of Balloons", and
  "Rocket". Drop them from the Colour picker on both surfaces.

## Done

<!-- move completed items here (or delete) so Open stays the live list -->
