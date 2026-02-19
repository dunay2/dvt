#!/usr/bin/env node
/* eslint-env node */
/* global console, process */
const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DEFAULT_BATCH_SIZE = 40;

function resolveCliPath(candidates) {
  for (const candidate of candidates) {
    try {
      return require.resolve(candidate);
    } catch {
      // continue searching
    }
  }
  return null;
}

function resolvePackageBin(packageName, relativeCandidates) {
  try {
    const packageJsonPath = require.resolve(`${packageName}/package.json`);
    const packageDir = path.dirname(packageJsonPath);
    for (const relativePath of relativeCandidates) {
      const absolutePath = path.join(packageDir, relativePath);
      if (fs.existsSync(absolutePath)) {
        return absolutePath;
      }
    }
  } catch {
    // package not resolvable in current environment
  }
  return null;
}

const PRETTIER_CLI =
  resolveCliPath(['prettier/bin/prettier.cjs', 'prettier/bin-prettier.js']) ??
  resolvePackageBin('prettier', ['bin/prettier.cjs', 'bin-prettier.js']);

const ESLINT_CLI =
  resolveCliPath(['eslint/bin/eslint.js', 'eslint/bin/eslint.mjs', 'eslint/bin/eslint.cjs']) ??
  resolvePackageBin('eslint', ['bin/eslint.js', 'bin/eslint.mjs', 'bin/eslint.cjs']);

function parseChangedFiles(output) {
  return output
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

function runGit(command) {
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

function chunk(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

function runToolBatched(runner, baseArgs, files, label) {
  const groups = chunk(files, DEFAULT_BATCH_SIZE);

  for (let i = 0; i < groups.length; i += 1) {
    const batch = groups[i];
    const args = [...baseArgs, ...batch];
    const prefix = groups.length > 1 ? ` (${i + 1}/${groups.length})` : '';
    console.log(`Checking ${label}${prefix}...`);

    const res = runner(args);

    if (res.error) {
      if (res.error.code === 'EINVAL' && batch.length > 1) {
        for (const singleFile of batch) {
          console.log(`Checking ${label} (single-file fallback): ${singleFile}`);
          const singleRes = runner([...baseArgs, singleFile]);
          if (singleRes.error) {
            console.error(singleRes.error.message);
            return 1;
          }
          if (singleRes.status !== 0) return singleRes.status || 1;
        }
        continue;
      }

      console.error(res.error.message);
      return 1;
    }

    if (res.status !== 0) return res.status || 1;
  }

  return 0;
}

function runNodeCli(toolName, cliPath, args) {
  if (!cliPath) {
    return {
      status: 1,
      error: new Error(`Unable to resolve ${toolName} CLI in node_modules`),
    };
  }

  return spawnSync(process.execPath, [cliPath, ...args], { stdio: 'inherit' });
}

function gitChangedFiles() {
  try {
    const diffCommand = hasUpstream()
      ? 'git diff --name-only @{u}..HEAD'
      : 'git diff --name-only HEAD~1..HEAD';
    return parseChangedFiles(runGit(diffCommand));
  } catch {
    return parseChangedFiles(runGit('git diff --name-only HEAD~1..HEAD'));
  }
}

const changed = gitChangedFiles();
if (changed.length === 0) {
  console.log('No changed files detected. Skipping format/lint checks.');
  process.exit(0);
}

const prettierFiles = changed.filter(f => /\.(ts|js|json|md|yml|yaml|tsx)$/.test(f));
const eslintFiles = changed
  .filter(f => /\.(ts|tsx|js)$/.test(f))
  // Frontend is not yet part of the repo's root TypeScript/ESLint project setup.
  // Exclude it from pre-push checks until it has its own tsconfig + eslint config integration.
  .filter(f => !f.startsWith('packages/frontend/'));

// remove deleted files from the lists
const existingPrettierFiles = prettierFiles.filter(f => fs.existsSync(f));
const existingEslintFiles = eslintFiles.filter(f => fs.existsSync(f));

if (existingPrettierFiles.length) {
  console.log('Running Prettier check on changed files:');
  console.log(existingPrettierFiles.join('\n'));
  const status = runToolBatched(
    (args) => runNodeCli('Prettier', PRETTIER_CLI, args),
    ['--check', '--end-of-line', 'auto'],
    existingPrettierFiles,
    'Prettier files'
  );
  if (status !== 0) process.exit(status);
}

if (existingEslintFiles.length) {
  console.log('Running ESLint on changed files:');
  console.log(existingEslintFiles.join('\n'));
  const status = runToolBatched(
    (args) => runNodeCli('ESLint', ESLINT_CLI, args),
    ['--max-warnings', '0'],
    existingEslintFiles,
    'ESLint files'
  );
  if (status !== 0) process.exit(status);
}

console.log('Changed-file checks passed.');
process.exit(0);
