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

- [ ] **Per-game tile icons (drop the generic chick).** Owner chose Option A (July 2026): every
  game in the Little Games picker currently falls back to the same 🐣 category emoji — give each
  game its own icon instead. Use the real art where we have it, a fitting emoji otherwise:
  Feed the Mascot → mascot art · Feed the Kangaroo → kangaroo art · Cutting Practice → ✂️ (or
  scissors art) · Number Path Hop → lily-pad art · Pop the Bubbles → 🫧 · Sorting Bins → 🧺 ·
  Count & Tap → 🔢 · Memory/Match → 🃏 · Tap the Animal → 🐶. Add a per-activity icon field/map
  so the picker (`renderPicker` in demo, `ActivityPickerScreen` on mobile) shows it instead of
  `emojiFor[category]`. Keeps pre-readers able to tell games apart at a glance.

- [ ] **Tracing for the 2-3 band (Shapes only).** Owner chose (July 2026): add the **Tracing**
  door to the 2-3 home band, but for 2-3 it opens **straight to the Shapes section** (circles,
  lines, zigzags — age-appropriate fine motor); **Letters & Numbers stay 3-5+**. 3-5 and 5-7 keep
  the full chooser (Letters · Numbers · Shapes · My Name). Impl: add `TRACING` to the 2-3 case in
  `home/homeLayout.ts`; make the 2-3 Tracing door route to the Shapes section directly (both
  renderers: demo `renderTracingSections`/picker + mobile), and update `homeLayout.test.ts`
  (2-3 now contains 'Tracing') + the "hides advanced doors from 2-3" test.

- [ ] **Cutting Practice — rework the split (Option A: halves tip & fall apart).** Owner
  feedback (July 2026): the current end-of-cut animation slides the top/bottom halves straight
  up/down, which reads as the picture "breaking" (floating roof, dropping wheels, diamond gap),
  not as cutting. Rework so the two pieces **rotate slightly and slide outward** — like two
  halves flopping open on a table — then stars + chime. While in there:
  - Tune the dotted line position / wavy amplitude per picture so the cut sits nicely on the
    car and cake.
  - Close the shipped-spec gaps: cut edges should **ease apart progressively during** the cut
    (not only at the end), and add the **rubber-band nudge** back onto the line when the child
    drifts off-path (currently the corridor just stops advancing with no visual cue).

- [ ] **Stylus support everywhere.** Owner tested with a stylus (July 2026) and lines **break up
  instead of drawing continuously**. Audit every pointer surface — drawing board, tracing,
  colouring, cutting, games — for stylus quirks: likely causes are palm-rejection logic dropping
  the pen pointer, `pointerId` churn between pen strokes, missing `touch-action:none`, coalesced/
  high-frequency pen events being dropped, or pressure `0` samples ending strokes early. Use
  `getCoalescedEvents()` where available and treat `pointerType === 'pen'` as first-class on both
  demo and mobile (Skia touch handling).

- [ ] **Colour by Numbers — real number-locked flow.** Owner spec (July 2026): each page's
  palette is **tagged to numbers** (colour 1, colour 2, …). The child starts with **colour 1
  selected and it's the only active choice**; they tap every region marked "1" — when all the 1s
  are filled, colour 1 **disappears from the palette** and colour 2 becomes the active colour;
  repeat until the last number finishes the page (then celebration). Needs per-region number
  data for the 4 CBN pages (bunny/car/flower/puppy currently run through the generic flood-fill
  with a free palette), progress tracking per number, and the sequenced palette UI on both
  renderers.

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
