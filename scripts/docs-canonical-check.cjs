#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const docsRoot = path.join(repoRoot, 'docs');
const zensicalConfigPath = path.join(repoRoot, 'zensical.yml');

const FORBIDDEN_SEGMENTS = ['dvt execution model'];

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(abs));
      continue;
    }
    out.push(abs);
  }
  return out;
}

function rel(absPath) {
  return path.relative(repoRoot, absPath).replace(/\\/g, '/');
}

function findMarkdownLinks(content) {
  const links = [];
  const rx = /\[[^\]]+\]\(([^)]+)\)/g;
  let m = rx.exec(content);
  while (m) {
    links.push(m[1]);
    m = rx.exec(content);
  }
  return links;
}

function normalizeForMatch(input) {
  const decoded = decodeURIComponent(input).replace(/\\/g, '/').toLowerCase();
  return decoded.replace(/\s+/g, ' ');
}

function main() {
  const errors = [];
  const files = walk(docsRoot);

  // 1) Forbid legacy filesystem segments under docs/
  for (const absPath of files) {
    const relPath = rel(absPath);
    const normalized = normalizeForMatch(relPath);
    for (const segment of FORBIDDEN_SEGMENTS) {
      if (normalized.includes(segment)) {
        errors.push(`${relPath} -> forbidden legacy path segment "${segment}".`);
      }
    }
  }

  // 2) Forbid legacy links in markdown docs
  for (const absPath of files.filter((p) => p.toLowerCase().endsWith('.md'))) {
    const relPath = rel(absPath);
    const content = fs.readFileSync(absPath, 'utf8');
    for (const target of findMarkdownLinks(content)) {
      const normalizedTarget = normalizeForMatch(target);
      for (const segment of FORBIDDEN_SEGMENTS) {
        if (normalizedTarget.includes(segment)) {
          errors.push(`${relPath} -> legacy link target "${target}" contains "${segment}".`);
        }
      }
    }
  }

  // 3) Forbid legacy path references in the docs config
  if (fs.existsSync(zensicalConfigPath)) {
    const zensicalConfig = fs.readFileSync(zensicalConfigPath, 'utf8');
    const normalizedZensicalConfig = normalizeForMatch(zensicalConfig);
    for (const segment of FORBIDDEN_SEGMENTS) {
      if (normalizedZensicalConfig.includes(segment)) {
        errors.push(`zensical.yml -> contains forbidden legacy segment "${segment}".`);
      }
    }
  }

  if (errors.length > 0) {
    console.error('[docs:canonical:check] FAIL');
    for (const e of errors) console.error(`- ${e}`);
    process.exit(1);
  }

  console.log('[docs:canonical:check] OK');
}

main();
