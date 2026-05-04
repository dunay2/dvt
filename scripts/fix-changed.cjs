#!/usr/bin/env node
/** Owned concern: apply safe autofixes to files in the local changed-file set. */
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { listLocalChangedFiles } = require('./git-local-changes.cjs');

const DEFAULT_BATCH_SIZE = 40;
const repoRoot = path.resolve(__dirname, '..');

function resolveCliPath(candidates) {
  for (const candidate of candidates) {
    try {
      return require.resolve(candidate);
    } catch {
      // continue
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
    // package not resolvable
  }
  return null;
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
    console.log(`Running ${label}${prefix}...`);

    const result = runner(args);
    if (result.error) {
      console.error(result.error.message);
      return 1;
    }
    if (result.status !== 0) {
      return result.status || 1;
    }
  }

  return 0;
}

function runNodeCli(toolName, cliPath, args) {
  if (!cliPath) {
    return { status: 1, error: new Error(`Unable to resolve ${toolName} CLI in node_modules`) };
  }
  return spawnSync(process.execPath, [cliPath, ...args], { stdio: 'inherit' });
}

const PRETTIER_CLI =
  resolveCliPath(['prettier/bin/prettier.cjs', 'prettier/bin-prettier.js']) ??
  resolvePackageBin('prettier', ['bin/prettier.cjs', 'bin-prettier.js']);
const ESLINT_CLI =
  resolveCliPath(['eslint/bin/eslint.js', 'eslint/bin/eslint.mjs', 'eslint/bin/eslint.cjs']) ??
  resolvePackageBin('eslint', ['bin/eslint.js', 'bin/eslint.mjs', 'bin/eslint.cjs']);

const changedFiles = listLocalChangedFiles({ repoRootPath: repoRoot });

if (changedFiles.length === 0) {
  console.log('No changed files detected. Skipping fix:changed.');
  process.exit(0);
}

const prettierFiles = changedFiles
  .filter((filePath) => /\.(ts|tsx|js|jsx|cjs|mjs|json|md|yml|yaml|html|css)$/.test(filePath))
  .filter((filePath) => fs.existsSync(path.join(repoRoot, filePath)));

const eslintFiles = changedFiles
  .filter((filePath) => /\.(ts|tsx|js|jsx|cjs|mjs)$/.test(filePath))
  .filter((filePath) => !filePath.endsWith('.d.ts'))
  .filter((filePath) => !filePath.startsWith('packages/frontend/'))
  .filter((filePath) => fs.existsSync(path.join(repoRoot, filePath)));

if (prettierFiles.length > 0) {
  console.log('Auto-fixing with Prettier on changed files:');
  console.log(prettierFiles.join('\n'));
  const status = runToolBatched(
    (args) => runNodeCli('Prettier', PRETTIER_CLI, args),
    ['--write', '--end-of-line', 'auto'],
    prettierFiles,
    'Prettier --write'
  );
  if (status !== 0) process.exit(status);
}

if (eslintFiles.length > 0) {
  console.log('Auto-fixing with ESLint on changed files:');
  console.log(eslintFiles.join('\n'));
  const status = runToolBatched(
    (args) => runNodeCli('ESLint', ESLINT_CLI, args),
    ['--fix', '--max-warnings', '0', '--no-warn-ignored'],
    eslintFiles,
    'ESLint --fix'
  );
  if (status !== 0) process.exit(status);
}

console.log('fix:changed completed.');
