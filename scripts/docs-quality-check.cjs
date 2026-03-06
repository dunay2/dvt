#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const docsRoot = path.join(repoRoot, 'docs');

const disallowedPlaceholder = ['Placeholder index for this directory.'];
const spanishHints = [
  ' objetivo',
  ' alcance',
  ' contexto',
  ' resumen',
  ' estado',
  ' ejecución',
  ' revisi',
  ' planificación',
  ' sustitución',
  ' estabilización',
  ' qué ',
  ' cómo ',
  ' para ',
  ' con ',
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

function rel(p) {
  return path.relative(repoRoot, p).replace(/\\/g, '/');
}

function main() {
  const failures = [];
  const warnings = [];
  const files = walk(docsRoot);
  const legacyUppercaseIndexes = new Set(['docs/decisions/INDEX.md', 'docs/knowledge/INDEX.md']);

  const uppercaseIndexes = files
    .filter((p) => path.basename(p) === 'INDEX.md')
    .map((p) => rel(p))
    .filter((p) => !legacyUppercaseIndexes.has(p));
  for (const p of uppercaseIndexes) {
    failures.push(`${p} -> rename to index.md (avoid duplicate index variants).`);
  }

  const planningFiles = files.filter(
    (p) => p.includes(`${path.sep}planning${path.sep}`) && p.endsWith('.md')
  );
  for (const p of planningFiles) {
    const base = path.basename(p).toLowerCase();
    if (base === 'index.md' || base === 'template_planning_doc.md') continue;
    const raw = fs.readFileSync(p, 'utf8').toLowerCase();

    for (const marker of disallowedPlaceholder) {
      if (raw.includes(marker.toLowerCase())) {
        failures.push(`${rel(p)} -> contains placeholder text.`);
      }
    }

    if (spanishHints.some((m) => raw.includes(m))) {
      warnings.push(`${rel(p)} -> contains likely non-English content. Translate to English.`);
    }
  }

  if (warnings.length > 0) {
    console.warn('[docs:quality:check] WARN');
    for (const item of warnings) console.warn(`- ${item}`);
  }

  if (failures.length > 0) {
    console.error('[docs:quality:check] FAIL');
    for (const item of failures) console.error(`- ${item}`);
    process.exit(1);
  }

  console.log('[docs:quality:check] OK');
}

main();
