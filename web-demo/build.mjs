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
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));

// The owner artwork in assets/images/ is stored full-resolution (1254px+), but
// the demo never renders a raster larger than ~900px (maze/scene canvases cap at
// MAXW=900) and home tiles show at ~112px. Inlining the originals as base64 made
// index.html ~54MB. So for the *demo bundle only* we downsample each raster to
// the size it is actually shown at and re-encode as WebP (keeps tile alpha,
// far smaller for photos). Source files are untouched, so the mobile app and
// any future print/CMS pipeline still use the originals. Maze photos feed the
// collision engine, so they keep a generous cap + high quality.
const RASTER_CAPS = [
  { test: /^tile-/, max: 400, quality: 90 },
  { test: /^maze-/, max: 1000, quality: 95 },
  { test: /^scene-/, max: 1000, quality: 88 },
  { test: /./, max: 700, quality: 88 },
];
async function encodeRaster(name, buf) {
  const cap = RASTER_CAPS.find((c) => c.test.test(name));
  const meta = await sharp(buf).metadata();
  let pipe = sharp(buf);
  if (meta.width && meta.width > cap.max) pipe = pipe.resize({ width: cap.max });
  const out = await pipe.webp({ quality: cap.quality }).toBuffer();
  return `data:image/webp;base64,${out.toString('base64')}`;
}

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

// Image library: every assets/images/*.svg ships into the page as inline SVG
// markup. Full-page colouring scenes (assets/images/scene-*.png) are owner-
// supplied raster artwork - they ship as base64 data URIs in a separate map,
// since they're not text/markup like the SVG icon set. Replacing either kind
// of file in that folder and rebuilding swaps the image everywhere (README).
const imagesDir = join(here, '../assets/images');
const images = {};
const rasterImages = {};
const RASTER_EXT = /\.(png|jpe?g)$/i;
for (const f of readdirSync(imagesDir)) {
  if (f.endsWith('.svg')) {
    images[f.replace(/\.svg$/, '')] = readFileSync(join(imagesDir, f), 'utf8');
  } else if (RASTER_EXT.test(f)) {
    const name = f.replace(RASTER_EXT, '');
    rasterImages[name] = await encodeRaster(name, readFileSync(join(imagesDir, f)));
  }
}
const imagesJs = `window.LG_IMAGES = ${JSON.stringify(images)};\nwindow.LG_RASTER_IMAGES = ${JSON.stringify(rasterImages)};`;

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
console.log(`web-demo/index.html rebuilt: core + ${Object.keys(images).length} images + ${Object.keys(rasterImages).length} scene photos`);
