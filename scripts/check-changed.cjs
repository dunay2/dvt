#!/usr/bin/env node
const { execSync, spawnSync } = require('child_process');

function gitChangedFiles() {
  try {
    const out = execSync('git rev-parse --abbrev-ref --symbolic-full-name @{u} >/dev/null 2>&1 && git diff --name-only origin/main...HEAD || git diff --name-only HEAD~1..HEAD', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], shell: true });
    return out.split('\n').map(s => s.trim()).filter(Boolean);
  } catch (err) {
    const out = execSync('git diff --name-only HEAD~1..HEAD', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], shell: true });
    return out.split('\n').map(s => s.trim()).filter(Boolean);
  }
}

const changed = gitChangedFiles();
if (changed.length === 0) {
  console.log('No changed files detected. Skipping format/lint checks.');
  process.exit(0);
}

const prettierFiles = changed.filter(f => /\.(ts|js|json|md|yml|yaml|tsx)$/.test(f));
const eslintFiles = changed.filter(f => /\.(ts|tsx|js)$/.test(f));

const fs = require('fs');
// remove deleted files from the lists
const existingPrettierFiles = prettierFiles.filter(f => fs.existsSync(f));
const existingEslintFiles = eslintFiles.filter(f => fs.existsSync(f));

if (existingPrettierFiles.length) {
  console.log('Running Prettier check on changed files:');
  console.log(existingPrettierFiles.join('\n'));
  const res = spawnSync('prettier', ['--check', ...existingPrettierFiles], { stdio: 'inherit', shell: true });
  if (res.status !== 0) process.exit(res.status);
}

if (existingEslintFiles.length) {
  console.log('Running ESLint on changed files:');
  console.log(existingEslintFiles.join('\n'));
  const res = spawnSync('eslint', ['--max-warnings', '0', ...existingEslintFiles], { stdio: 'inherit', shell: true });
  if (res.status !== 0) process.exit(res.status);
}

console.log('Changed-file checks passed.');
process.exit(0);
