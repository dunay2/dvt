#!/usr/bin/env node
/** Owned concern: format files introduced by local Git operations. */
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { defaultRunGitLines } = require('./git-local-changes.cjs');

const DEFAULT_BATCH_SIZE = 40;
const repoRoot = path.resolve(__dirname, '..');
const prettierPattern = /\.(ts|tsx|js|jsx|cjs|mjs|json|md|yml|yaml|html|css)$/;
const ignoredPrettierPaths = new Set(['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock']);

function parseArgs(argv = process.argv.slice(2)) {
  const parsed = {
    dryRun: false,
    fromRef: null,
    hook: false,
    label: 'post-git',
    toRef: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (current === '--dry-run' || current === '--plan') {
      parsed.dryRun = true;
      continue;
    }
    if (current === '--hook') {
      parsed.hook = true;
      continue;
    }
    if (current === '--from') {
      parsed.fromRef = argv[index + 1] || null;
      index += 1;
      continue;
    }
    if (current === '--to') {
      parsed.toRef = argv[index + 1] || null;
      index += 1;
      continue;
    }
    if (current === '--label') {
      parsed.label = argv[index + 1] || parsed.label;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${current}`);
  }

  if (!parsed.fromRef) {
    throw new Error('Missing required --from <ref>');
  }
  if (!parsed.toRef) {
    throw new Error('Missing required --to <ref>');
  }

  return parsed;
}

function resolveCliPath(candidates) {
  for (const candidate of candidates) {
    try {
      return require.resolve(candidate);
    } catch {
      // Continue searching.
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
    // Package not resolvable in current environment.
  }
  return null;
}

function resolvePrettierCli() {
  return (
    resolveCliPath(['prettier/bin/prettier.cjs', 'prettier/bin-prettier.js']) ??
    resolvePackageBin('prettier', ['bin/prettier.cjs', 'bin-prettier.js'])
  );
}

function chunk(items, size = DEFAULT_BATCH_SIZE) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function isPrettierCandidate(filePath) {
  return prettierPattern.test(filePath) && !ignoredPrettierPaths.has(filePath);
}

function listGitOperationChangedFiles(options) {
  const runGitLines = options.runGitLines || defaultRunGitLines;
  try {
    return runGitLines(
      ['diff', '--name-only', '--diff-filter=ACMR', options.fromRef, options.toRef],
      { repoRootPath: options.repoRootPath || repoRoot }
    ).sort();
  } catch {
    return [];
  }
}

function selectExistingPrettierFiles(files, options = {}) {
  const rootPath = options.repoRootPath || repoRoot;
  const fileExists =
    options.fileExists || ((filePath) => fs.existsSync(path.join(rootPath, filePath)));

  return Array.from(new Set(files)).filter(isPrettierCandidate).filter(fileExists).sort();
}

function runPrettierOnFiles(files, options = {}) {
  if (files.length === 0) {
    return { status: 0 };
  }

  const prettierCli = options.prettierCli || resolvePrettierCli();
  if (!prettierCli) {
    return {
      error: new Error('Unable to resolve Prettier CLI in node_modules'),
      status: 1,
    };
  }

  const spawn = options.spawn || spawnSync;
  for (const [index, batch] of chunk(files, options.batchSize).entries()) {
    const prefix = files.length > DEFAULT_BATCH_SIZE ? ` (${index + 1})` : '';
    console.log(`[${options.label || 'post-git'}] Running Prettier${prefix}...`);
    const result = spawn(
      process.execPath,
      [prettierCli, '--write', '--end-of-line', 'auto', '--ignore-unknown', ...batch],
      { cwd: options.repoRootPath || repoRoot, stdio: 'inherit' }
    );

    if (result.error) {
      return { error: result.error, status: 1 };
    }
    if (result.status !== 0) {
      return { status: result.status || 1 };
    }
  }

  return { status: 0 };
}

function isSkippedByEnvironment(env = process.env) {
  return env.DVT_SKIP_POST_GIT_FORMAT === '1' || env.DVT_SKIP_POST_GIT_FORMAT === 'true';
}

function formatGitOperationChanges(options) {
  const label = options.label || 'post-git';
  if (isSkippedByEnvironment(options.env)) {
    console.log(`[${label}] Skipping Prettier because DVT_SKIP_POST_GIT_FORMAT is set.`);
    return { files: [], status: 0 };
  }

  if (options.fromRef === options.toRef) {
    console.log(`[${label}] Git refs are identical. Skipping Prettier.`);
    return { files: [], status: 0 };
  }

  const changedFiles = listGitOperationChangedFiles(options);
  const prettierFiles = selectExistingPrettierFiles(changedFiles, options);

  if (prettierFiles.length === 0) {
    console.log(`[${label}] No Prettier-managed files changed.`);
    return { files: [], status: 0 };
  }

  console.log(`[${label}] Formatting Prettier-managed files changed by Git operation:`);
  console.log(prettierFiles.join('\n'));
  if (options.dryRun) {
    return { files: prettierFiles, status: 0 };
  }

  const result = runPrettierOnFiles(prettierFiles, { ...options, label });
  return { files: prettierFiles, status: result.status, error: result.error };
}

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const result = formatGitOperationChanges(args);
  if (result.error) {
    console.error(`[${args.label}] ${result.error.message}`);
  }
  if (result.status !== 0 && args.hook) {
    console.error(`[${args.label}] Prettier failed; continuing because this is a post-Git hook.`);
    process.exit(0);
  }
  process.exit(result.status);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`[post-git] ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  formatGitOperationChanges,
  isPrettierCandidate,
  isSkippedByEnvironment,
  listGitOperationChangedFiles,
  main,
  parseArgs,
  runPrettierOnFiles,
  selectExistingPrettierFiles,
};
