#!/usr/bin/env node
/**
 * Enforce repository policy for generated files that must never be tracked.
 */

const { execFileSync } = require('node:child_process');

const FORBIDDEN_BASENAMES = new Set(['AI_INDEX.json']);

function getTrackedFiles() {
  const output = execFileSync('git', ['ls-files'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function getForbiddenTrackedFiles(files) {
  return files.filter((file) => {
    const normalized = file.replace(/\\/g, '/');
    const base = normalized.split('/').pop() ?? normalized;
    return FORBIDDEN_BASENAMES.has(base);
  });
}

function main() {
  const trackedFiles = getTrackedFiles();
  const forbidden = getForbiddenTrackedFiles(trackedFiles);

  if (forbidden.length === 0) {
    console.log('[forbidden-files] OK: no forbidden generated files are tracked.');
    return;
  }

  console.error('[forbidden-files] Forbidden tracked files detected:');
  for (const file of forbidden) {
    console.error(`- ${file}`);
  }
  console.error(
    '[forbidden-files] Remove these files from source control and keep them gitignored.'
  );
  process.exit(1);
}

main();
