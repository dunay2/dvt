#!/usr/bin/env node
const { execSync, spawnSync } = require('node:child_process');

function parseChangedFiles(output) {
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function gitExec(command) {
  return execSync(command, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
}

function hasUpstream() {
  try {
    execSync('git rev-parse --abbrev-ref --symbolic-full-name @{u}', {
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    return true;
  } catch {
    return false;
  }
}

function hasRef(ref) {
  try {
    execSync(`git rev-parse --verify ${ref}`, {
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    return true;
  } catch {
    return false;
  }
}

function resolveDiffCommand() {
  if (hasRef('origin/main')) return 'git diff --name-only --diff-filter=ACMR origin/main...HEAD';
  if (hasUpstream()) return 'git diff --name-only --diff-filter=ACMR @{u}...HEAD';
  return 'git diff --name-only --diff-filter=ACMR HEAD~1..HEAD';
}

function listChangedFiles() {
  try {
    return parseChangedFiles(gitExec(resolveDiffCommand()));
  } catch {
    return [];
  }
}

function needsWorkboardCheck(changedFiles) {
  return changedFiles.some(
    (filePath) =>
      filePath.startsWith('docs/planning/state/agent-lane-') && filePath.endsWith('.yaml')
  );
}

const changedFiles = listChangedFiles();
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
