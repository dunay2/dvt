#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

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

    if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push(fullPath);
    }
  }

  return results;
}

function rel(filePath) {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

function main() {
  const violations = [];

  for (const rootName of scanRoots) {
    const rootPath = path.join(repoRoot, rootName);
    for (const filePath of walkMarkdown(rootPath)) {
      const relativePath = rel(filePath);
      const segments = relativePath.split('/');
      const offendingSegment = segments.find((segment, index) =>
        isForbiddenCodeSegment(segments, segment, index),
      );
      if (!offendingSegment) {
        continue;
      }

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

main();
