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

async function runEslint(files, options = {}) {
  const createEslint = options.createEslint ?? ((config) => new (require('eslint').ESLint)(config));
  const write = options.write ?? ((message) => process.stdout.write(message));
  const reportError = options.reportError ?? ((message) => console.error(message));

  try {
    const eslint = createEslint({ cwd: repoRoot, warnIgnored: false });
    const results = await eslint.lintFiles(files);
    const formatter = await eslint.loadFormatter('stylish');
    const report = formatter.format(results);
    if (report) write(report);
    return results.some((result) => result.errorCount > 0 || result.warningCount > 0) ? 1 : 0;
  } catch (error) {
    reportError(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

async function main() {
  const changed = listLocalChangedFiles({ repoRootPath: repoRoot });
  if (changed.length === 0) {
    console.log('No changed files detected. Skipping format/lint checks.');
    return 0;
  }

  const prettierFiles = changed.filter((f) => /\.(ts|tsx|js|cjs|mjs|json|md|yml|yaml)$/.test(f));
  const eslintFiles = changed
    .filter((f) => /\.(ts|tsx|js|cjs|mjs)$/.test(f))
    // Declaration files and packages/frontend are outside this ESLint project.
    .filter((f) => !f.endsWith('.d.ts') && !f.startsWith('packages/frontend/'));

  // Deleted files are in the diff but cannot be passed to format or lint tools.
  const existingPrettierFiles = prettierFiles.filter((f) => fs.existsSync(path.join(repoRoot, f)));
  const existingEslintFiles = eslintFiles.filter((f) => fs.existsSync(path.join(repoRoot, f)));

  if (existingPrettierFiles.length) {
    console.log('Running Prettier check on changed files:');
    console.log(existingPrettierFiles.join('\n'));
    const status = runToolBatched(
      (args) => runNodeCli('Prettier', PRETTIER_CLI, args),
      ['--check', '--end-of-line', 'auto'],
      existingPrettierFiles,
      'Prettier files'
    );
    if (status !== 0) return status;
  }

  if (existingEslintFiles.length) {
    console.log('Running ESLint on changed files:');
    console.log(existingEslintFiles.join('\n'));
    const status = await runEslint(existingEslintFiles);
    if (status !== 0) return status;
  }

  console.log('Changed-file checks passed.');
  return 0;
}

if (require.main === module) {
  main()
    .then((status) => {
      process.exitCode = status;
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}

module.exports = { main, runEslint };
