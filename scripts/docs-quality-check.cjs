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
const requiredCanonicalFiles = [
  'docs/architecture/system-delivery-status.md',
  'docs/planning/roadmap/index.md',
  'docs/planning/gaps/index.md',
  'docs/planning/archive/gaps/g6/index.md',
  'docs/planning/archive/gaps/g6/G6-OPENLINEAGE-CI-SCHEMA-PIN-PLAN.md',
  'docs/concepts/repository-map.md',
  'docs/planning/status/canonical-doc-code-matrix.md',
];
const explicitOwnerFiles = ['docs/planning/gaps/index.md'];
const forbiddenMkdocsNavTargets = [
  'planning/DVTplus_Roadmap.md',
  'knowledge/INDEX.md',
  'decisions/INDEX.md',
  'knowledge/ROADMAP_AND_ISSUES_MAP.md',
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
  const markdownFiles = files.filter((p) => p.endsWith('.md'));

  const uppercaseIndexes = files.filter((p) => path.basename(p) === 'INDEX.md').map((p) => rel(p));
  for (const p of uppercaseIndexes) {
    failures.push(`${p} -> rename to index.md (avoid duplicate index variants).`);
  }

  for (const p of markdownFiles) {
    const raw = fs.readFileSync(p, 'utf8');
    for (const marker of disallowedPlaceholder) {
      if (raw.toLowerCase().includes(marker.toLowerCase())) {
        failures.push(`${rel(p)} -> contains placeholder text.`);
      }
    }
  }

  const planningFiles = files.filter(
    (p) => p.includes(`${path.sep}planning${path.sep}`) && p.endsWith('.md')
  );
  for (const p of planningFiles) {
    const base = path.basename(p).toLowerCase();
    if (base === 'index.md' || base === 'template_planning_doc.md') continue;
    const raw = fs.readFileSync(p, 'utf8').toLowerCase();

    if (spanishHints.some((m) => raw.includes(m))) {
      warnings.push(`${rel(p)} -> contains likely non-English content. Translate to English.`);
    }
  }

  const canonicalMatrixPath = path.join(
    docsRoot,
    'planning',
    'status',
    'canonical-doc-code-matrix.md'
  );
  if (fs.existsSync(canonicalMatrixPath)) {
    const canonicalMatrix = fs.readFileSync(canonicalMatrixPath, 'utf8');
    if (
      /##\s+Scope Left For The Next Pass/i.test(canonicalMatrix) ||
      /Still missing from explicit topic mapping:/i.test(canonicalMatrix)
    ) {
      failures.push(
        'docs/planning/status/canonical-doc-code-matrix.md -> cannot carry an explicit missing-workspace backlog; classify active workspaces instead.'
      );
    }
  }

  for (const relativePath of requiredCanonicalFiles) {
    const absPath = path.join(repoRoot, ...relativePath.split('/'));
    if (!fs.existsSync(absPath)) {
      failures.push(`${relativePath} -> required canonical surface is missing.`);
      continue;
    }
    const raw = fs.readFileSync(absPath, 'utf8').toLowerCase();
    const glossaryTargets = relativePath.startsWith('docs/concepts/')
      ? ['glossary.md', './glossary.md', 'concepts/glossary.md']
      : ['concepts/glossary.md'];
    const domainLanguageTargets = relativePath.startsWith('docs/concepts/')
      ? ['domain-language.md', './domain-language.md', 'concepts/domain-language.md']
      : ['concepts/domain-language.md'];

    if (!glossaryTargets.some((target) => raw.includes(target))) {
      failures.push(`${relativePath} -> must link to concepts/glossary.md.`);
    }
    if (!domainLanguageTargets.some((target) => raw.includes(target))) {
      failures.push(`${relativePath} -> must link to concepts/domain-language.md.`);
    }
  }

  for (const relativePath of explicitOwnerFiles) {
    const absPath = path.join(repoRoot, ...relativePath.split('/'));
    if (!fs.existsSync(absPath)) continue;
    const raw = fs.readFileSync(absPath, 'utf8');
    if (/^owner:\s*docs\s*$/im.test(raw)) {
      failures.push(
        `${relativePath} -> owner must name the responsible area, not the generic placeholder "docs".`
      );
    }
  }

  const zensicalConfigPath = path.join(repoRoot, 'zensical.yml');
  if (fs.existsSync(zensicalConfigPath)) {
    const zensicalConfigRaw = fs.readFileSync(zensicalConfigPath, 'utf8');
    for (const target of forbiddenMkdocsNavTargets) {
      if (zensicalConfigRaw.includes(target)) {
        failures.push(
          `zensical.yml -> must not expose legacy compatibility target ${target} in the docs config.`
        );
      }
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
