# Backlog

A running list of ideas and not-yet-started work for Little Grip. Drop half-formed
ideas here as they come up; we knock them out in focused batches rather than one-at-a-time
(see the "Working efficiently" note in `CLAUDE.md`). Keep entries short — one line of intent,
plus a note on scope/surface if it matters.

Status key: `[ ]` open · `[~]` in progress · `[x]` done (move to the bottom or delete)

## Open

- [ ] **Port the recent demo-first work to the mobile app.** These all shipped and are verified in
  the web demo but are not yet in the Expo app (mobile needs a device/emulator to drive + verify):
  - The two new games — **Cutting Practice** (`cut-along`) and **Number Path Hop** (`number-hop`)
    — are demo-only; add them to `apps/mobile/.../games/registry.ts` + `GamePlayer`/new players.
  - **Feed the Animal layout tweaks** (big centre animal + right food column, responsive) — the
    demo has them; the mobile `FeedAnimalGame` still uses the old bottom row.
  - **Draw panel redesign** (Magic drawer) — demo `renderDrawing` is done; port to mobile
    `DrawingBoard` (colour rail, slim bar, wand drawer, floating size, stamps/glow brushes).
  - **Tracing controls** (colour picker / CAPS / undo-trash / name-finish) — still demo-only.

- [ ] **Feed the Animal — feedback (July 2026).** Two issues on both Feed the Mascot and Feed
  the Kangaroo:
  - **Feeding isn't seamless** — the drag-into-mouth interaction feels janky/not smooth.
    Investigate: drop-zone hit area, chomp timing/lockout (`chomping` flag blocks drops for
    480ms), food snap-back, and pointer/drag responsiveness. Make feeding fluid.
  - **Completion options are wrong** — when all foods are eaten, do **not** offer "go to Home".
    Only offer **"one screen back"** and **"play again / have fun again"**. (Mirror the fun
    name-completion card from tracing.) Demo `renderGame` feed-animal + mobile `FeedAnimalGame`.

- [ ] **Verify the mobile app is adaptive across device sizes.** The web demo was audited and
  fixed for 320-1366px; the Expo app's layouts (`HomeScreen`, players, pickers) haven't been
  checked on small phones vs. large tablets — best done on a device/emulator.

- ~~**Build a Face** — drag eyes/nose/mouth onto a blank head.~~ **Parked** at owner's request
  (July 2026) — revisit later. No art needed for now.

### Draw panel — two small decisions still open (defaults shipped)
Built with sensible defaults; change any time: (1) the **eraser** is kept (rubs out part; "Start
over" wipes all) — say if you'd rather drop it; (2) the **magic set** is rainbow/glitter/glow/star
+ heart stamps — stamps are emoji for now, swap in cute art whenever ready.

## Done

- [x] **Draw panel redesign (Magic drawer, Layout 2)** — free Draw board reworked: white paper
  canvas, colours on a right rail (white selected ring), slim bottom bar (crayon · paint · eraser
  · 🪄 wand), floating size pod, undo/redo + start-over/save in the corners, and a wand-opened
  magic drawer with rainbow / glitter / glow / star + heart stamp brushes. **Demo done + verified.**
- [x] **Cutting Practice** (`cut-along`) — drag the scissors along a dotted line across the car/cake
  (tracing corridor engine); scissors snip (open↔closed), rotate to the line, paper flecks, and on
  ~full traversal the shape splits into two halves + celebration. Owner art cut out to clean assets.
  Two pages (car = straight, cake = wavy). **Demo done + verified.**
- [x] **Number Path Hop** (`number-hop`) — tap the lily-pad stones in number order; the mascot hops
  pad to pad (squash/bounce), wrong taps nudge, last stone celebrates. Two levels (to 5, to 10).
  **Demo done + verified.**
- [x] **Feed the Animal — layout tweaks** — big centred character + foods in a responsive
  right-hand column that recompacts as they're eaten; layout recomputed on resize. **Demo done.**
- [x] **Feed the Animal** (2 characters) — drag food into a hungry mouth; it chomps (image swap
  + bounce), soft "nom" per bite, stars + chime on finish. Mascot eats treats; Kangaroo eats
  plants. Cut out from the uploads. Demo + mobile + core content + test.
- [x] **Top bar layout** — star + rewards total sit next to the child's name; Grown-ups and
  Rewards icons share one row, top-right. Fully adaptive across screen sizes (320-1366px).
- [x] **Blank Canvas → straight to canvas** — the intermediate picker is skipped.
- [x] **Colour: removed 3 pages** — "Fish by Numbers", "Pack of Balloons", "Rocket" dropped.
- [x] **Colour split into two sections** — **"Colour by Numbers"** (owner's 4 uploaded pages:
  Bunny, Car, Flower, Puppy) and **"Colour Your Way"** (the 6 free scenes), with a two-door chooser.
- [x] **"Big Kid Games" retired** — the preschool games moved into "Little Games" (toddler); the
  5-7 home band now shows Little Games + Think & Solve.
- [x] **Responsive audit + fixes** — home/section tiles no longer clip on narrow phones; the
  drawing toolbar wraps so every tool stays visible; verified 320-1366px (web demo).
