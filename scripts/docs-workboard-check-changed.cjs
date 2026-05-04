#!/usr/bin/env node
/** Owned concern: trigger planning workboard validation only when lane sources changed. */
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { listLocalChangedFiles } = require('./git-local-changes.cjs');

const repoRoot = path.resolve(__dirname, '..');

function needsWorkboardCheck(changedFiles) {
  return changedFiles.some(
    (filePath) =>
      filePath.startsWith('docs/planning/state/agent-lane-') && filePath.endsWith('.yaml')
  );
}

const changedFiles = listLocalChangedFiles({ repoRootPath: repoRoot });
if (!needsWorkboardCheck(changedFiles)) {
  console.log(
    '[docs:workboard:check:changed] No lane YAML changes detected. Skipping workboard drift check.'
  );
  process.exit(0);
}

const result = spawnSync('pnpm', ['docs:workboard:check'], {
  shell: true,
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status || 0);
