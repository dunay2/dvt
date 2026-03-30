#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

const repoRoot = path.resolve(__dirname, '..');
const scanRoots = ['apps', 'packages'];
const forbiddenSegments = new Set(['src', 'test', 'tests', 'cli', 'schemas', 'generated']);

function walkMarkdown(dir) {
  const results = [];

  if (!fs.existsSync(dir)) {
    return results;
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkMarkdown(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      results.push(fullPath);
    }
  }

  return results;
}

function rel(filePath) {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

function hasUpstream() {
  try {
    cp.execSync('git rev-parse --abbrev-ref --symbolic-full-name @{u}', {
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    return true;
  } catch {
    return false;
  }
}

function hasRef(ref) {
  try {
    cp.execSync(`git rev-parse --verify ${ref}`, {
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    return true;
  } catch {
    return false;
  }
}

function listChangedMarkdown() {
  try {
    const base = hasUpstream() ? '@{u}' : hasRef('origin/main') ? 'origin/main' : 'HEAD~1';
    const out = cp
      .execSync(`git diff --name-only --diff-filter=ACMR ${base}...HEAD`, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      })
      .trim();
    return out
      ? out
          .split(/\r?\n/)
          .filter((f) => f.toLowerCase().endsWith('.md'))
          .map((f) => path.resolve(repoRoot, f))
      : [];
  } catch {
    return [];
  }
}

function isForbiddenCodeSegment(segments, segment, index) {
  if (!forbiddenSegments.has(segment)) {
    return false;
  }

  // Allow package-root documentation for the `@dvt/cli` workspace itself.
  if (segment === 'cli' && segments[0] === 'packages' && index === 2) {
    return false;
  }

  return true;
}

function main() {
  const changedOnly = process.argv.includes('--changed-only');

  let filesToCheck;
  if (changedOnly) {
    filesToCheck = listChangedMarkdown().filter((f) => {
      const relative = rel(f);
      return scanRoots.some((r) => relative.startsWith(r + '/'));
    });
    if (filesToCheck.length === 0) {
      console.log('[check-markdown-locations] No changed markdown in scan roots — skipping');
      return;
    }
  } else {
    filesToCheck = [];
    for (const rootName of scanRoots) {
      filesToCheck.push(...walkMarkdown(path.join(repoRoot, rootName)));
    }
  }

  const violations = [];
  for (const filePath of filesToCheck) {
    const relativePath = rel(filePath);
    const segments = relativePath.split('/');
    const offendingSegment = segments.find((segment, index) =>
      isForbiddenCodeSegment(segments, segment, index),
    );
    if (offendingSegment) {
      violations.push(
        `${relativePath} -> Markdown must not live under code directory segment "${offendingSegment}". Move it into docs/.`,
      );
    }
  }

  if (violations.length > 0) {
    console.error('[check-markdown-locations] FAIL');
    for (const violation of violations) {
      console.error(`- ${violation}`);
    }
    process.exit(1);
  }

  console.log('[check-markdown-locations] OK');
}

main();
