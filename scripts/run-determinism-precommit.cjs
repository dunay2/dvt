#!/usr/bin/env node
const { execSync, spawnSync } = require('node:child_process');

const DETERMINISM_SENSITIVE_PATTERNS = [
  /^packages\/@dvt\/engine\/src\/.+\.(ts|tsx)$/,
  /^packages\/@dvt\/adapter-temporal\/src\/workflows\/.+\.(ts|tsx)$/,
  /^eslint\.config\.cjs$/,
  /^package\.json$/,
  /^pnpm-lock\.yaml$/,
  /^tsconfig\.eslint\.json$/,
  /^scripts\/run-determinism-precommit\.cjs$/,
  /^\.husky\/pre-commit$/,
];

function normalizeGitPath(filePath) {
  return filePath.replace(/\\/g, '/').replace(/^\.\//, '').trim();
}

function isDeterminismSensitiveFile(filePath) {
  const normalizedPath = normalizeGitPath(filePath);

  return (
    normalizedPath.length > 0 &&
    DETERMINISM_SENSITIVE_PATTERNS.some((pattern) => pattern.test(normalizedPath))
  );
}

function shouldRunDeterminismPrecommit(files) {
  return files.some((filePath) => isDeterminismSensitiveFile(filePath));
}

function readStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only --diff-filter=ACMR', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });

    return output
      .split('\n')
      .map((filePath) => normalizeGitPath(filePath))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function runDeterminismLint() {
  return spawnSync('pnpm', ['lint:determinism'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
}

function main(argv = process.argv.slice(2)) {
  const stagedFiles =
    argv.length > 0 ? argv.map((filePath) => normalizeGitPath(filePath)) : readStagedFiles();

  if (!shouldRunDeterminismPrecommit(stagedFiles)) {
    console.log(
      'Skipping determinism pre-commit gate: no engine or Temporal workflow staged files.'
    );
    return 0;
  }

  console.log('Running determinism pre-commit gate...');
  const result = runDeterminismLint();

  if (result.error) {
    console.error(result.error.message);
    return 1;
  }

  return result.status ?? 1;
}

if (require.main === module) {
  process.exit(main());
}

module.exports = {
  normalizeGitPath,
  isDeterminismSensitiveFile,
  shouldRunDeterminismPrecommit,
  readStagedFiles,
  main,
};
