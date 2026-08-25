#!/usr/bin/env node
/**
 * Owned concern: run changed-only lint and format checks from the local changed-file set.
 * Command/query rails: `ValidateChangedFiles`.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { listLocalChangedFiles } = require('./git-local-changes.cjs');

const DEFAULT_BATCH_SIZE = 40;
const repoRoot = path.resolve(__dirname, '..');

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

const changed = listLocalChangedFiles({ repoRootPath: repoRoot });
if (changed.length === 0) {
  console.log('No changed files detected. Skipping format/lint checks.');
  process.exit(0);
}

const prettierFiles = changed.filter((f) => /\.(ts|tsx|js|cjs|mjs|json|md|yml|yaml)$/.test(f));
const eslintFiles = changed
  .filter((f) => /\.(ts|tsx|js|cjs|mjs)$/.test(f))
  .filter((f) => !f.endsWith('.d.ts'))
  .filter((f) => !f.startsWith('packages/frontend/'));

const existingPrettierFiles = prettierFiles.filter((f) => fs.existsSync(path.join(repoRoot, f)));
const existingEslintFiles = eslintFiles.filter((f) => fs.existsSync(path.join(repoRoot, f)));

if (existingPrettierFiles.length) {
  console.log('Running Prettier write to inspect exact output:');
  console.log(existingPrettierFiles.join('\n'));
  const status = runToolBatched(
    (args) => runNodeCli('Prettier', PRETTIER_CLI, args),
    ['--write', '--end-of-line', 'auto'],
    existingPrettierFiles,
    'Prettier files'
  );
  if (status !== 0) process.exit(status);
  const diff = spawnSync('git', ['diff', '--', ...existingPrettierFiles], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  process.stdout.write(diff.stdout ?? '');
  process.stderr.write(diff.stderr ?? '');
  process.exit(1);
}

if (existingEslintFiles.length) {
  console.log('Running ESLint on changed files:');
  console.log(existingEslintFiles.join('\n'));
  const status = runToolBatched(
    (args) => runNodeCli('ESLint', ESLINT_CLI, args),
    ['--max-warnings', '0', '--no-warn-ignored'],
    existingEslintFiles,
    'ESLint files'
  );
  if (status !== 0) process.exit(status);
}

console.log('Changed-file checks passed.');
process.exit(0);
