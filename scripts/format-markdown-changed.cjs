#!/usr/bin/env node
const { execSync, spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

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
  try {
    return parseChangedFiles(gitExec(resolveDiffCommand())).filter((filePath) =>
      /(^README\.md$|\.md$)/i.test(filePath)
    );
  } catch {
    return [];
  }
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
