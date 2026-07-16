# Little Grip image library — `assets/images/`

**This folder is the single source of every picture used in the app and the web demo.**
Replace any `.svg` file here (keep the same filename, any square `viewBox`) and your image
appears everywhere that image is used — puzzles, matching/memory games, shadow games,
reveal-and-wipe, counting, mazes, feeding games and stickers — after rebuilding
(`node assets/generate-images.mjs` is only for regenerating the built-in art; skip it if you've
placed your own files, then run `node web-demo/build.mjs` for the demo / rebuild the app).

| File | Used for (examples) |
|---|---|
| `dolphin.svg`, `whale.svg`, `fish.svg` | jigsaws, memory pairs, counting, shadow match |
| `unicorn.svg`, `dinosaur.svg` | jigsaws, odd-one-out, reveal-and-wipe |
| `elephant.svg`, `monkey.svg`, `panda.svg`, `bear.svg`, `cat.svg`, `dog.svg`, `duck.svg`, `chick.svg` | jigsaws, matching, feeding game, stickers |
| `star.svg`, `sun.svg`, `moon.svg` | rewards/stickers, sequences, patterns |
| `rocket.svg`, `balloon.svg`, `car.svg`, `treehouse.svg` | jigsaws, mazes (goal), sequences |

## Licensing / provenance

Every image in this folder was authored for this project from geometric primitives by the
generator script (`assets/generate-images.mjs`). None is copied from, traced from, or derived
from any third-party artwork, stock library, or another business's assets — there is nothing to
license and nothing to attribute. If you replace them, ensure your replacements are equally
original or properly licensed.

## Guidelines for replacements

- Square aspect (e.g. `viewBox="0 0 200 200"`); transparent background.
- Keep subjects friendly and high-contrast against the app's cream background (`#FFF8F0`).
- No text inside images (children can't read; screen readers use the app's labels instead).
- Content must pass the docs/12 review checklists (age-appropriate, no fear/violence, inclusive).
- Audio note: instruction voice is configured separately (soft female voice — see
  `apps/mobile/src/services/audio.ts` and the demo's speech settings), not in this folder.
