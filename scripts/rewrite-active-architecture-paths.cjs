const fs = require('fs');
const path = require('path');

const repoRoot = process.cwd();
const targets = [
  'docs/architecture',
  'docs/planning/state',
  'docs/planning/status',
  'docs/planning/roadmap',
  'docs/planning/proposals',
  'docs/index.md',
  'docs/concepts',
];

const fileExts = new Set(['.md', '.yaml', '.yml', '.json']);
const skipPrefixes = [
  'docs/archive/',
  'docs/planning/archive/',
  'docs/planning/closeouts/',
  'docs/planning/reviews/',
  'docs/architecture/components/engine/contracts/engine/events/',
  'docs/architecture/components/engine/contracts/schemas/',
  'docs/architecture/components/engine/contracts/engine/fixtures/',
];

const replacements = [
  ['docs/architecture/frontend/', 'docs/architecture/components/web/'],
  ['docs/architecture/engine/', 'docs/architecture/components/engine/'],
  ['docs/architecture/subsystems/', 'docs/architecture/system/subsystems/'],
];

function walk(relPath, out) {
  const absPath = path.join(repoRoot, relPath);
  const stat = fs.statSync(absPath);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(absPath)) {
      walk(path.posix.join(relPath.replace(/\\/g, '/'), entry), out);
    }
    return;
  }
  const normalized = relPath.replace(/\\/g, '/');
  if (!fileExts.has(path.extname(normalized))) return;
  if (skipPrefixes.some((prefix) => normalized.startsWith(prefix))) return;
  out.push(normalized);
}

const files = [];
for (const target of targets) {
  walk(target, files);
}

let changed = 0;
for (const relPath of files) {
  const absPath = path.join(repoRoot, relPath);
  const original = fs.readFileSync(absPath, 'utf8');
  let next = original;
  for (const [from, to] of replacements) {
    next = next.split(from).join(to);
  }
  if (next !== original) {
    fs.writeFileSync(absPath, next, 'utf8');
    changed += 1;
    console.log(relPath);
  }
}

console.log(`Rewrote ${changed} files.`);
