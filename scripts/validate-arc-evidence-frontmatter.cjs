#!/usr/bin/env node
/**
 * Enforces ARC-2 evidence frontmatter shape in docs/evidence/*.md.
 *
 * Required shape for ARC-2:
 * evidence:
 *   tests:
 *     - <command>
 */
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const yaml = require('js-yaml');

const EVIDENCE_DIR = path.resolve(process.cwd(), 'docs', 'evidence');

function extractFrontmatter(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!m) return null;
  return m[1];
}

function listEvidenceDocs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.endsWith('.md') && d.name !== 'index.md')
    .map((d) => path.join(dir, d.name));
}

function listChangedFiles() {
  try {
    const out = cp
      .execSync('git diff --name-only --diff-filter=ACMR origin/main...HEAD', {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      })
      .trim();
    return out ? out.split(/\r?\n/) : [];
  } catch {
    return [];
  }
}

function normalizePathForMatch(filePath) {
  return filePath.split(path.sep).join('/').toLowerCase();
}

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function validateArc2Evidence(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const fmRaw = extractFrontmatter(raw);
  if (!fmRaw) return [];

  let fm;
  try {
    fm = yaml.load(fmRaw);
  } catch (err) {
    return [`${filePath}: invalid YAML frontmatter (${String(err)})`];
  }

  if (!fm || typeof fm !== 'object') return [];
  if (fm.arc_level !== 'ARC-2') return [];

  const errors = [];
  const evidence = fm.evidence;
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) {
    errors.push(`${filePath}: ARC-2 evidence doc must define evidence.tests as an array`);
    return errors;
  }

  const tests = evidence.tests;
  if (!Array.isArray(tests) || tests.length === 0) {
    errors.push(`${filePath}: ARC-2 evidence doc must define evidence.tests as a non-empty array`);
    return errors;
  }

  for (let i = 0; i < tests.length; i += 1) {
    if (!isNonEmptyString(tests[i])) {
      errors.push(`${filePath}: evidence.tests[${i}] must be a non-empty string`);
    }
  }

  return errors;
}

function main() {
  const changedOnly = process.argv.includes('--changed-only');
  let files = listEvidenceDocs(EVIDENCE_DIR);
  if (changedOnly) {
    const changed = new Set(listChangedFiles().map((f) => f.toLowerCase()));
    files = files.filter((absPath) => {
      const rel = normalizePathForMatch(path.relative(process.cwd(), absPath));
      return changed.has(rel);
    });
  }

  if (files.length === 0) {
    console.log('[validate-arc-evidence-frontmatter] No target evidence docs to validate');
    return;
  }

  const errors = files.flatMap(validateArc2Evidence);
  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`DOCS-VALIDATION-FAIL: ${error}`);
    }
    process.exit(2);
  }
  console.log('[validate-arc-evidence-frontmatter] OK');
}

main();
