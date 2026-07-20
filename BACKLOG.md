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

- [ ] **Split Colour into two sections:** **"Colour by Numbers"** (guided — match number to
  colour) and **"Colour Your Way"** (free-form flood-fill). Names chosen by owner.
  - **Artwork split:** the **Colour by Numbers** set is the 4 files the owner uploaded to
    `design-reference/colouring-pages/` — Bunny, Car, Flower, Puppy (all `Color by number - … -2to4Age.png`).
    Everything else already in the Colour section goes to **Colour Your Way**. (When building:
    these design-reference PNGs need processing into the flood-fill/by-numbers pipeline — they're
    not yet in `assets/images/`; confirm the numbered-region + palette-key format expected.)

### New little games (owner picked — build into app; art must be cute & funny for ages 2-5)

- [ ] **Feed the Animal** — drag food to a hungry animal's mouth; it chomps on a hit. Drag
  precision (reuses puzzle/match drag engine). Ages 2-3.
- [ ] **Pop the Bubbles** — bubbles drift up, tap to pop with a satisfying sound. Tap accuracy.
  Small new engine. Ages 2-3.
- [ ] **Cutting Practice** — drag "scissors" along a dotted line. Reuses the tracing corridor
  engine, new metaphor. Real-world scissor skill.
- [ ] **Build a Face** — drag eyes/nose/mouth onto a blank head. Creative, no wrong answer.
  Reuses drag engine.
- [ ] **Sorting Bins** — drag items into the right bin by colour/shape. Drag + categorisation.
  Reuses drag engine.
- [ ] **Count & Tap** (#14) — "how many ducks? tap that number." Reuses counting template.
- [ ] **Number Path Hop** (#15) — tap stepping stones 1→2→3 in order. Reuses counting template.
  - **Art direction:** all seven need cute/funny sprites for ages 2-5. Decision pending (emoji-
    style sprites that ship now vs. owner-supplied illustrations). Build order: prove the pattern
    with a 1-2 game vertical slice, get sign-off, then batch the rest across core + demo + mobile.

## Done

<!-- move completed items here (or delete) so Open stays the live list -->
