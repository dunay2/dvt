#!/usr/bin/env node
/**
 * check-determinism.mjs
 *
 * Scans engine workflow source for non-deterministic API usage.
 * Fails with exit code 1 if any violations are found.
 * Exempt: OutboxWorker.ts (intentionally uses real-time APIs).
 */

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const ENGINE_SRC = 'packages/@dvt/engine/src';
const EXEMPT_PATTERN = /OutboxWorker\.ts$/;

const FORBIDDEN = [
  { pattern: /Date\.now\(\)/, label: 'Date.now()', hint: 'use workflow.now() in Temporal workflows' },
  { pattern: /Math\.random\(\)/, label: 'Math.random()', hint: 'use workflow-seeded RNG' },
  { pattern: /crypto\.randomBytes/, label: 'crypto.randomBytes()', hint: 'use deterministic UUID generation' },
];

async function collectFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith('.ts') && !EXEMPT_PATTERN.test(e.name))
    .map((e) => join(e.parentPath ?? e.path, e.name));
}

let violations = 0;

const files = await collectFiles(ENGINE_SRC).catch(() => []);
for (const file of files) {
  const src = await readFile(file, 'utf8');
  for (const { pattern, label, hint } of FORBIDDEN) {
    if (pattern.test(src)) {
      console.error(`❌ ${label} found in ${file} (${hint})`);
      violations++;
    }
  }
}

if (violations === 0) {
  console.log('✅ No determinism violations found');
  process.exit(0);
} else {
  process.exit(1);
}
