#!/usr/bin/env node
/** Owned concern: format changed Markdown files from the local changed-file set. */
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const { listLocalChangedFiles } = require('./git-local-changes.cjs');

const repoRoot = path.resolve(__dirname, '..');

function resolvePrettierCli() {
  const candidate = path.resolve(
    __dirname,
    '..',
    'node_modules',
    'prettier',
    'bin',
    'prettier.cjs'
  );
  return fs.existsSync(candidate) ? candidate : null;
}

function listChangedMarkdownFiles() {
  return listLocalChangedFiles({ repoRootPath: repoRoot }).filter((filePath) =>
    /(^README\.md$|\.md$)/i.test(filePath)
  );
}

const prettierCli = resolvePrettierCli();
if (!prettierCli) {
  console.error('Unable to resolve Prettier CLI');
  process.exit(1);
}

const changedMarkdownFiles = listChangedMarkdownFiles();
if (changedMarkdownFiles.length === 0) {
  console.log('No changed Markdown files detected. Skipping Prettier write.');
  process.exit(0);
}

const args = [prettierCli, '--write', '--end-of-line', 'auto', ...changedMarkdownFiles];
const result = spawnSync(process.execPath, args, {
  cwd: path.resolve(__dirname, '..'),
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status || 0);
