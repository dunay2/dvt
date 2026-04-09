#!/usr/bin/env node
const { spawnSync } = require('node:child_process');

const checks = [
  ['pnpm', ['docs:gov:locations', '--', '--changed-only']],
  ['pnpm', ['docs:arc:evidence:check', '--', '--changed-only']],
  ['pnpm', ['lint:md:changed']],
  ['node', ['scripts/docs-workboard-check-changed.cjs']],
  ['node', ['scripts/check-changed.cjs']],
  ['node', ['scripts/check-forbidden-tracked-files.cjs']],
];

for (const [command, args] of checks) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: true });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

process.exit(0);
