/**
 * Rebuilds web-demo/index.html from the demo shell + the current
 * @littlehands/core sources, so the hosted demo always runs the repo's real
 * engines. Usage:  node web-demo/build.mjs   (requires npm install first)
 */
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

const result = await build({
  entryPoints: [join(here, '../packages/core/src/index.ts')],
  bundle: true,
  format: 'iife',
  globalName: 'LH',
  minify: true,
  write: false,
});

const core = result.outputFiles[0].text;
const shell = readFileSync(join(here, 'demo-shell.html'), 'utf8');
const marker = '<script>/*__CORE_BUNDLE__*/</script>';
if (!shell.includes(marker)) throw new Error('bundle marker missing from demo-shell.html');

writeFileSync(join(here, 'index.html'), shell.replace(marker, '<script>\n' + core + '\n</script>'));
console.log('web-demo/index.html rebuilt from @littlehands/core');
