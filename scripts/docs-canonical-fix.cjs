#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const docsRoot = path.join(repoRoot, 'docs');
const mkdocsPath = path.join(repoRoot, 'mkdocs.yml');

const replacements = [
  // URL-encoded and plain variants
  [/dvt%20execution%20model/gi, 'execution-model'],
  [/dvt execution model/gi, 'execution-model'],
  [/dvt\\execution model/gi, 'execution-model'],
];

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

function applyReplacements(content) {
  let next = content;
  for (const [rx, value] of replacements) {
    next = next.replace(rx, value);
  }
  return next;
}

function writeIfChanged(filePath) {
  const current = fs.readFileSync(filePath, 'utf8');
  const next = applyReplacements(current);
  if (next === current) return false;
  fs.writeFileSync(filePath, next, 'utf8');
  return true;
}

function main() {
  let changed = 0;
  const files = walk(docsRoot).filter((p) => p.toLowerCase().endsWith('.md'));

  for (const filePath of files) {
    if (writeIfChanged(filePath)) changed += 1;
  }

  if (fs.existsSync(mkdocsPath) && writeIfChanged(mkdocsPath)) {
    changed += 1;
  }

  console.log(`[docs:canonical:fix] Updated ${changed} file(s).`);
}

main();
