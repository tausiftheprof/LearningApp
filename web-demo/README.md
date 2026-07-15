# Web demo of the Little Hands MVP

`index.html` is a self-contained, static demo of the app's MVP flows, driven by the **real
`@littlehands/core` engines** (tracing corridors, puzzle snapping, capped rewards, screen-time
ledger, parental gate, progress reports, deletion) bundled inline. Emoji art and browser speech
synthesis are illustrative stand-ins for the production illustrations and recorded voice.

- Rebuild after core changes: `npm install` at the repo root, then `node web-demo/build.mjs`
  (uses `demo-shell.html` as the page source and inlines a fresh esbuild bundle of core).
- Deploy anywhere static hosting works. On Vercel: set the project's **Root Directory** to
  `web-demo` with framework preset **Other** and no build command — it serves `index.html` as-is.
- The demo stores its state in the browser's local storage only; no server, no network calls.
