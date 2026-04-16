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

function shouldRunTypeCheck(filePath) {
  return (
    /\.(ts|tsx|mts|cts)$/.test(filePath) ||
    /(^|\/)package\.json$/.test(filePath) ||
    /(^|\/)pnpm-lock\.yaml$/.test(filePath) ||
    /(^|\/)pnpm-workspace\.yaml$/.test(filePath) ||
    /(^|\/)tsconfig[^/]*\.json$/.test(filePath) ||
    /(^|\/)vitest\.config\.ts$/.test(filePath)
  );
}

const changedFiles = listChangedFiles();

if (changedFiles.length === 0) {
  console.log('[type-check-prepush] No changed files detected. Skipping type-check.');
  process.exit(0);
}

const relevantFiles = changedFiles.filter(shouldRunTypeCheck);

if (relevantFiles.length === 0) {
  console.log(
    '[type-check-prepush] No TypeScript-affecting files changed. Skipping pnpm type-check.'
  );
  process.exit(0);
}

console.log('[type-check-prepush] Running pnpm type-check for changed TypeScript-affecting files:');
for (const filePath of relevantFiles) {
  console.log(filePath);
}

const result = spawnSync('pnpm', ['type-check'], {
  shell: true,
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status || 0);
