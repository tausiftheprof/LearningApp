# Web demo of the Little Grip MVP

`index.html` is a self-contained, static demo of the app's MVP flows, driven by the **real
`@littlegrip/core` engines** (tracing corridors, puzzle snapping, capped rewards, screen-time
ledger, parental gate, progress reports, deletion) bundled inline. Emoji art and browser speech
synthesis are illustrative stand-ins for the production illustrations and recorded voice.

- Rebuild after core changes: `npm install` at the repo root, then `node web-demo/build.mjs`
  (uses `demo-shell.html` as the page source and inlines a fresh esbuild bundle of core).
- Deploy anywhere static hosting works. On Vercel: set the project's **Root Directory** to
  `web-demo` with framework preset **Other** and no build command — it serves `index.html` as-is.
- The demo stores its state in the browser's local storage only; no server, no network calls.

## Maze activity (free-drag with collision)

The maze is a reusable component driven by the `@littlegrip/core` **maze engine**
(`packages/core/src/maze/mazeEngine.ts`). The child grabs the character and glides it
through the printed maze; the engine handles all collision (stops at walls, slides along
them, never tunnels or leaves the maze) in the maze artwork's own pixel space, so it stays
accurate at any screen size. There is **no** auto-movement, pathfinding-to-goal or momentum —
the character moves only while being dragged and stops the instant it is released.

How it works: the maze photo is rasterised once into a wall mask (dark ink = wall); the mask
is cleaned (thin-wall erosion to reopen anti-aliasing pinches, then the largest open region is
kept so the character stays on the maze's own corridors); the engine auto-fits the largest
character disc that can still reach the finish and computes a hint route. Wide mazes get a big
character; dense pencil mazes get a small token that simply cannot cross a line.

### Adding a new maze level

Drop the artwork in `assets/images/` (e.g. `maze-castle.png`) — do not stretch or crop it; the
renderer preserves its aspect ratio. Then add one entry to the `mazes` array in
`packages/core/src/content/starterPack.ts`:

```ts
{ id: 'maze-castle', title: 'Castle Maze', template: 'path-maze',
  category: 'logic', ageBands: ['5-7'], difficulty: 3,
  motorSkills: ['controlled-movement'], minutes: 4, theme: 'fantasy',
  params: {
    image: 'images/maze-castle.png',
    bbox: [0.22, 0.22, 0.86, 0.92], // fractional box around the maze grid (ignore scenery)
    start: [0.26, 0.62],            // fractional start position (0..1 of the image)
    finish: [0.80, 0.62],           // fractional finish position
    mover: 'rocket',                // character sprite (assets/images name or emoji key)
    goal: 'star',                   // destination sprite
    // successMessage: 'You reached the castle!', // optional; defaults to "You found the way!"
  } },
```

All coordinates are fractions of the original image (0..1), so they are resolution-independent.
`start`/`finish` are snapped onto the maze automatically, so approximate values are fine. Then
rebuild the demo (`node web-demo/build.mjs`). The same config drives the mobile player.
