#!/usr/bin/env tsx
/**
 * @file tools/docs/check-frontmatter.ts
 * Frontmatter / header contract gate.
 *
 * Checked document types:
 *
 *   ADR files (docs/adr/ADR-*.md):
 *     Required body fields: Status, Date, Owners
 *     Date must be ISO-8601 (YYYY-MM-DD)
 *     Status must be a known value
 *     Must have an H1 heading
 *
 *   Evidence docs (docs/evidence/ED-*.md):
 *     Required YAML frontmatter keys:
 *       title, status, date, owners, arc_level, breaking, code_refs, evidence
 *     date must be ISO-8601
 *     status must be a known value
 *
 * Exit codes: 0 = OK, 1 = errors found
 *
 * Usage:
 *   tsx tools/docs/check-frontmatter.ts [--changed-only]
 */
import { execFileSync } from 'node:child_process';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { normalizeStatus, VALID_ADR_STATUSES } from './lib/adr.js';
import {
  extractAdrFields,
  parseFrontmatter,
  readIfExists,
  splitFrontmatter,
} from './lib/markdown.js';
import { Report } from './lib/report.js';
import { walkMarkdown } from './lib/walkDocs.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const DOCS_DIR = join(REPO_ROOT, 'docs');
const ADR_DIR = join(DOCS_DIR, 'adr');
const EVIDENCE_DIR = join(DOCS_DIR, 'evidence');
const CHANGED_ONLY = process.argv.includes('--changed-only');

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_EVIDENCE_STATUSES = new Set(['final', 'draft', 'pending', 'accepted']);

// Required YAML frontmatter keys for Evidence docs
const EVIDENCE_REQUIRED_KEYS: readonly string[] = [
  'title',
  'status',
  'date',
  'owners',
  'arc_level',
  'breaking',
  'code_refs',
  'evidence',
];

// ── ADR check ─────────────────────────────────────────────────────────────────

function checkAdrFrontmatter(filePath: string, report: Report): void {
  const content = readIfExists(filePath);
  if (!content) return;

  const fields = extractAdrFields(content);
  const _name = basename(filePath);

  // H1 heading
  if (!/^#\s+/m.test(content)) {
    warnOrError(report, filePath, 'ADR missing H1 heading');
  }

  // Status
  if (!fields['Status']) {
    report.error(filePath, 'ADR missing required field: Status');
  } else {
    const normalized = normalizeStatus(fields['Status'].split(/[,/]/)[0]!);
    if (!VALID_ADR_STATUSES.has(normalized)) {
      warnOrError(
        report,
        filePath,
        `ADR Status "${fields['Status']}" is not a standard value`,
        `Expected one of: ${[...VALID_ADR_STATUSES].join(', ')}`
      );
    }
  }

  // Date
  if (!fields['Date']) {
    report.error(filePath, 'ADR missing required field: Date');
  } else if (!ISO_DATE_RE.test(fields['Date'])) {
    warnOrError(report, filePath, `ADR Date "${fields['Date']}" is not ISO-8601 (YYYY-MM-DD)`);
  }

  // Owners (recommended)
  if (!fields['Owners']) {
    warnOrError(report, filePath, 'ADR missing recommended field: Owners');
  }

  // Unused variable placeholder (keeps lint happy)
  // _name intentionally unused
}

// ── Evidence check ────────────────────────────────────────────────────────────

function checkEvidenceFrontmatter(filePath: string, report: Report): void {
  const content = readIfExists(filePath);
  if (!content) return;

  const { hasFrontmatter, frontmatter } = splitFrontmatter(content);
  if (!hasFrontmatter) {
    report.error(filePath, 'Evidence doc missing YAML frontmatter (--- ... ---)');
    return;
  }

  const fm = parseFrontmatter(frontmatter);

  // Required keys
  for (const key of EVIDENCE_REQUIRED_KEYS) {
    const val = fm[key];
    if (val === undefined || val === '' || (Array.isArray(val) && val.length === 0)) {
      report.error(filePath, `Evidence doc missing required frontmatter field: ${key}`);
    }
  }

  // Date format
  const dateVal = fm['date'];
  if (typeof dateVal === 'string' && dateVal && !ISO_DATE_RE.test(dateVal)) {
    warnOrError(report, filePath, `Evidence doc date "${dateVal}" is not ISO-8601 (YYYY-MM-DD)`);
  }

  // Status values
  const statusVal = fm['status'];
  if (typeof statusVal === 'string' && statusVal) {
    if (!VALID_EVIDENCE_STATUSES.has(statusVal.toLowerCase().trim())) {
      warnOrError(
        report,
        filePath,
        `Evidence doc status "${statusVal}" is not a standard value`,
        `Expected one of: ${[...VALID_EVIDENCE_STATUSES].join(', ')}`
      );
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main(): void {
  const report = new Report();
  const changedFiles = CHANGED_ONLY ? getChangedMarkdownFiles() : null;

  // ADR files
  const adrFiles = (changedFiles ?? walkMarkdown(ADR_DIR)).filter(
    (f) => isUnderDirectory(f, ADR_DIR) && /ADR-\d{4}/i.test(basename(f))
  );
  for (const filePath of adrFiles) {
    checkAdrFrontmatter(filePath, report);
  }

  // Evidence docs
  const evidenceFiles = (changedFiles ?? walkMarkdown(EVIDENCE_DIR)).filter(
    (f) => isUnderDirectory(f, EVIDENCE_DIR) && /^ED-/.test(basename(f))
  );
  for (const filePath of evidenceFiles) {
    checkEvidenceFrontmatter(filePath, report);
  }

  if (CHANGED_ONLY && adrFiles.length === 0 && evidenceFiles.length === 0) {
    console.log('[check-frontmatter] No changed ADR or evidence docs - skipping');
  }

  report.print();
  process.exit(report.exitCode);
}

function warnOrError(report: Report, filePath: string, msg: string, detail?: string): void {
  if (CHANGED_ONLY) {
    report.error(filePath, msg, detail);
  } else {
    report.warn(filePath, msg, detail);
  }
}

function getChangedMarkdownFiles(): string[] {
  const override = process.env['DOCS_GOV_CHANGED_FILES'];
  if (override) {
    return override.split(/\r?\n|;/).flatMap((entry) => normalizeChangedPath(entry));
  }

  const base = process.env['GIT_BASE'] ?? 'origin/main';
  try {
    const output = execFileSync(
      'git',
      ['diff', '--name-only', '--diff-filter=AM', base, '--', 'docs/**/*.md'],
      {
        cwd: REPO_ROOT,
        encoding: 'utf8',
      }
    );
    return output
      .trim()
      .split(/\r?\n/)
      .flatMap((entry) => normalizeChangedPath(entry));
  } catch {
    return walkMarkdown(DOCS_DIR);
  }
}

function normalizeChangedPath(entry: string): string[] {
  const candidate = entry.trim();
  if (!candidate?.toLowerCase().endsWith('.md')) {
    return [];
  }

  const absolute = resolve(REPO_ROOT, candidate);
  if (!absolute.startsWith(DOCS_DIR)) {
    return [];
  }

  return [absolute];
}

function isUnderDirectory(filePath: string, directory: string): boolean {
  return filePath.startsWith(`${directory}\\`) || filePath.startsWith(`${directory}/`);
}

main();
