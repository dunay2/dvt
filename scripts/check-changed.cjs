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

if (prettierFiles.length) {
  console.log('Running Prettier check on changed files:');
  console.log(prettierFiles.join('\n'));
  const res = spawnSync('prettier', ['--check', ...prettierFiles], { stdio: 'inherit', shell: true });
  if (res.status !== 0) process.exit(res.status);
}

if (eslintFiles.length) {
  console.log('Running ESLint on changed files:');
  console.log(eslintFiles.join('\n'));
  const res = spawnSync('eslint', ['--max-warnings', '0', ...eslintFiles], { stdio: 'inherit', shell: true });
  if (res.status !== 0) process.exit(res.status);
}

console.log('Changed-file checks passed.');
process.exit(0);
