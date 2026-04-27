#!/usr/bin/env node
const { execSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_BATCH_SIZE = 40;

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

let changedFiles;
try {
  changedFiles = parseChangedFiles(gitExec(resolveDiffCommand()));
} catch {
  changedFiles = [];
}

if (changedFiles.length === 0) {
  console.log('No changed files detected. Skipping fix:changed.');
  process.exit(0);
}

const prettierFiles = changedFiles
  .filter((filePath) => /\.(ts|tsx|js|jsx|json|md|yml|yaml|html|css)$/.test(filePath))
  .filter((filePath) => fs.existsSync(filePath));

const eslintFiles = changedFiles
  .filter((filePath) => /\.(ts|tsx|js|jsx)$/.test(filePath))
  .filter((filePath) => !filePath.endsWith('.d.ts'))
  .filter((filePath) => !filePath.startsWith('packages/frontend/'))
  .filter((filePath) => fs.existsSync(filePath));

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
