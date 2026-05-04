#!/usr/bin/env node
/** Owned concern: lint changed Markdown files from the local changed-file set. */
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { listLocalChangedFiles } = require('./git-local-changes.cjs');

const repoRoot = path.resolve(__dirname, '..');

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

function listChangedMarkdownFiles() {
  return listLocalChangedFiles({ repoRootPath: repoRoot }).filter((filePath) =>
    /(^README\.md$|\.md$)/i.test(filePath)
  );
}

const markdownlintCli = resolveMarkdownlintCli();
if (!markdownlintCli) {
  console.error('Unable to resolve markdownlint-cli2');
  process.exit(1);
}

const changedMarkdownFiles = listChangedMarkdownFiles();
if (changedMarkdownFiles.length === 0) {
  console.log('No changed Markdown files detected. Skipping markdownlint.');
  process.exit(0);
}

const args = [
  markdownlintCli,
  '--ignore-path',
  '.markdownlintignore',
  '--config',
  '.markdownlint-cli2.jsonc',
  ...changedMarkdownFiles,
];

const result = spawnSync(process.execPath, args, {
  cwd: path.resolve(__dirname, '..'),
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status || 0);
