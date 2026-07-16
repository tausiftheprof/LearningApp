/**
 * Rebuilds web-demo/index.html from the demo shell + the current
 * @littlegrip/core sources + the image library in assets/images/, so the
 * hosted demo always runs the repo's real engines and artwork.
 * Usage:  node web-demo/build.mjs   (requires npm install first)
 */
import { build } from 'esbuild';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

const result = await build({
  entryPoints: [join(here, '../packages/core/src/index.ts')],
  bundle: true,
  format: 'iife',
  globalName: 'LH',
  minify: true,
  lineLimit: 300,
  write: false,
});
const core = result.outputFiles[0].text;

// Image library: every assets/images/*.svg ships into the page. Replacing a
// file in that folder and rebuilding swaps the image everywhere (see its README).
const imagesDir = join(here, '../assets/images');
const images = {};
for (const f of readdirSync(imagesDir)) {
  if (f.endsWith('.svg')) images[f.replace(/\.svg$/, '')] = readFileSync(join(imagesDir, f), 'utf8');
}
const imagesJs = `window.LG_IMAGES = ${JSON.stringify(images)};`;

const shell = readFileSync(join(here, 'demo-shell.html'), 'utf8');
const coreMarker = '<script>/*__CORE_BUNDLE__*/</script>';
const imgMarker = '<script>/*__IMAGES__*/</script>';
for (const m of [coreMarker, imgMarker]) {
  if (!shell.includes(m)) throw new Error(`marker missing from demo-shell.html: ${m}`);
}

// Replacement callbacks: a plain string replacement would corrupt the output
// wherever the minified bundle contains `$&`/`$'`/`$\`` sequences.
writeFileSync(
  join(here, 'index.html'),
  shell
    .replace(coreMarker, () => '<script>\n' + core + '\n</script>')
    .replace(imgMarker, () => '<script>' + imagesJs + '</script>'),
);
console.log(`web-demo/index.html rebuilt: core + ${Object.keys(images).length} images`);
