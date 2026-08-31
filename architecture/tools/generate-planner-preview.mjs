import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Reuse the source-first inventory generator, then normalize its LikeC4 output
// to the currently published DSL. `navigateTo` belongs to view predicates or
// relationships; scoped `view ... of <element>` already provides folder drill-down.
await import('./generate-planner-inventory.mjs');

const scriptDir = dirname(fileURLToPath(import.meta.url));
const architectureDir = dirname(scriptDir);
const generatedPath = join(architectureDir, 'generated', 'planner-source.c4');
const source = readFileSync(generatedPath, 'utf8');
const normalized = source
  .split(/\r?\n/)
  .filter((line) => !/^\s*navigateTo\s+/.test(line))
  .join('\n');

if (/^\s*navigateTo\s+/m.test(normalized)) {
  throw new Error('Planner generated LikeC4 still contains model-level navigateTo');
}

writeFileSync(generatedPath, normalized.endsWith('\n') ? normalized : `${normalized}\n`);
console.log('Normalized Planner LikeC4 source: drill-down is provided by scoped views.');
