#!/usr/bin/env node
/** Owned concern: lint changed Markdown files from the local changed-file set. */
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { listLocalChangedFiles } = require('./git-local-changes.cjs');

const repoRoot = path.resolve(__dirname, '..');
const markdownFilePattern = /(^README\.md$|\.md$)/i;

function toPosix(filePath) {
  return filePath.replace(/\\/g, '/').replace(/^\.\//, '');
}

function resolveMarkdownlintCli() {
  const candidate = path.resolve(
    __dirname,
    '..',
    'node_modules',
    'markdownlint-cli2',
    'markdownlint-cli2-bin.mjs'
  );
  return require('node:fs').existsSync(candidate) ? candidate : null;
}

function parseIgnorePatterns(source) {
  return source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
}

function readIgnorePatterns(repoRootPath) {
  const ignorePath = path.resolve(repoRootPath, '.markdownlintignore');
  if (!fs.existsSync(ignorePath)) {
    return [];
  }

  return parseIgnorePatterns(fs.readFileSync(ignorePath, 'utf8'));
}

function isIgnoredByPattern(filePath, pattern) {
  const normalizedPath = toPosix(filePath);
  const normalizedPattern = toPosix(pattern);

  if (normalizedPattern.endsWith('/**')) {
    const prefix = normalizedPattern.slice(0, -3);
    if (prefix.startsWith('**/')) {
      const segment = prefix.slice(3);
      return normalizedPath === segment || normalizedPath.includes(`/${segment}/`);
    }

    return normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`);
  }

  return normalizedPath === normalizedPattern;
}

function isIgnored(filePath, patterns) {
  return patterns.some((pattern) => isIgnoredByPattern(filePath, pattern));
}

function listChangedMarkdownFiles(options = {}) {
  const repoRootPath = options.repoRootPath || repoRoot;
  const ignorePatterns = options.ignorePatterns || readIgnorePatterns(repoRootPath);
  const changedFiles =
    options.changedFiles || listLocalChangedFiles({ repoRootPath: repoRootPath });

  return changedFiles
    .map(toPosix)
    .filter((filePath) => markdownFilePattern.test(filePath))
    .filter((filePath) => !isIgnored(filePath, ignorePatterns));
}

function main(options = {}) {
  const markdownlintCli = options.markdownlintCli || resolveMarkdownlintCli();
  if (!markdownlintCli) {
    console.error('Unable to resolve markdownlint-cli2');
    return 1;
  }

  const changedMarkdownFiles = listChangedMarkdownFiles(options);
  if (changedMarkdownFiles.length === 0) {
    console.log('No changed Markdown files detected. Skipping markdownlint.');
    return 0;
  }

  const args = [
    markdownlintCli,
    '--ignore-path',
    '.markdownlintignore',
    '--config',
    '.markdownlint-cli2.jsonc',
    ...changedMarkdownFiles,
  ];

  const result = (options.spawn || spawnSync)(process.execPath, args, {
    cwd: options.repoRootPath || repoRoot,
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(result.error.message);
    return 1;
  }

  return result.status || 0;
}

if (require.main === module) {
  process.exit(main());
}

module.exports = {
  isIgnoredByPattern,
  listChangedMarkdownFiles,
  main,
  parseIgnorePatterns,
};
