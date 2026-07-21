# Little Grip image library — `assets/images/`

**This folder is the single source of every picture used in the app and the web demo.**
Replace any `.svg` file here (keep the same filename, any square `viewBox`) and your image
appears everywhere that image is used — puzzles, matching/memory games, shadow games,
reveal-and-wipe, counting, feeding games and stickers — after rebuilding
(`node assets/generate-images.mjs` is only for regenerating the built-in art; skip it if you've
placed your own files, then run `node web-demo/build.mjs` for the demo / rebuild the app).

| File | Used for (examples) |
|---|---|
| `dolphin.svg`, `whale.svg`, `fish.svg` | jigsaws, memory pairs, counting, shadow match |
| `unicorn.svg`, `dinosaur.svg` | jigsaws, odd-one-out, reveal-and-wipe |
| `elephant.svg`, `monkey.svg`, `panda.svg`, `bear.svg`, `cat.svg`, `dog.svg`, `duck.svg`, `chick.svg` | jigsaws, matching, feeding game, stickers |
| `star.svg`, `sun.svg`, `moon.svg` | rewards/stickers, sequences, patterns |
| `rocket.svg`, `balloon.svg`, `car.svg`, `treehouse.svg` | jigsaws, sequences |
| `scene-*.png` | Colour section: full-page flood-fill scenes (solar system, rocket, unicorn, monkey, rabbit, whale) |
| `trace-letter-{a..z}.png` | Tracing section: owner clay-art "letter cue" header (capital+small pair) shown above each letter |
| `trace-number-{1..10}.png` | Tracing section: owner clay-art "number cue" header shown above each number |

## Full-page colouring scenes (`scene-*.png`)

Unlike the icon set above, these are the owner's own commissioned/supplied artwork (July 2026),
used as-is - plain photos (PNG/JPG both work), not vector. The in-app **flood-fill colouring
engine** (`renderColouringLineArt` in `web-demo/demo-shell.html`) rasterises whichever picture is
referenced, reads its dark ink as a wall, and fills whatever enclosed area a child taps - no
per-shape authoring needed. To add or replace a scene:

1. Drop a PNG/JPG here named `scene-<name>.png` - bold black outlines on a plain white (or
   transparent) background, at least ~1200px on the short side, no colour needed (small colour
   accents like a mascot are fine and stay untouched by flood fill).
2. Add a `colouring` activity in `packages/core/src/content/starterPack.ts` with
   `mode: 'line-art'` and `image: 'images/scene-<name>.png'` (`regions: []`).
3. Run `node web-demo/build.mjs` (bundles the PNG as a base64 data URI - no separate generator
   step, unlike the SVG icon set).

The original, unedited files as supplied are also kept in `design-reference/colouring-pages/`
for reference/reprinting - the copies in this folder are the ones the app actually loads.

## Licensing / provenance

Every icon `.svg` in this folder was authored for this project from geometric primitives by the
generator script (`assets/generate-images.mjs`) - none is copied from, traced from, or derived
from any third-party artwork, stock library, or another business's assets. The `scene-*.png`
full-page colouring scenes are supplied directly by the product owner; if you replace either
kind, ensure your replacements are equally original or properly licensed for this app.

## Guidelines for replacements

- Square aspect (e.g. `viewBox="0 0 200 200"`); transparent background.
- Keep subjects friendly and high-contrast against the app's cream background (`#FFF8F0`).
- No text inside images (children can't read; screen readers use the app's labels instead).
- Content must pass the docs/12 review checklists (age-appropriate, no fear/violence, inclusive).
- Audio note: instruction voice is configured separately (soft female voice — see
  `apps/mobile/src/services/audio.ts` and the demo's speech settings), not in this folder.
