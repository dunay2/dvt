#!/usr/bin/env tsx
/**
 * @file tools/docs/check-filenames.ts
 * Filename naming-policy gate for the docs/ tree.
 *
 * Rules enforced:
 *   1. (ERROR) No spaces in any .md filename.
 *   2. (ERROR) ADR files must match: ADR-NNNN[a-z]?[-_]<slug>.md
 *              Language variants like ADR-0019-foo.en.md are allowed.
 *   3. (WARN --strict) Non-ADR, non-exception docs should be kebab-case
 *              (all lowercase, hyphens only — no underscores, no uppercase).
 *
 * Usage:
 *   tsx tools/docs/check-filenames.ts [--strict]
 */
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { walkMarkdown } from './lib/walkDocs.js';
import { Report } from './lib/report.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const DOCS_DIR = join(REPO_ROOT, 'docs');

const STRICT = process.argv.includes('--strict');

// Valid ADR filename: ADR-NNNN[a-z]?[-_]<something>.md  (optional .en before .md)
const ADR_VALID_RE = /^ADR-\d{4}[a-z]?[-_].+\.(?:[a-z]{2}\.)?md$/i;

// Exceptions: legacy uppercase files that are not ADR-prefixed
const UPPERCASE_EXCEPTIONS = new Set([
  'README.md',
  'CHANGELOG.md',
  'CONTRIBUTING.md',
  'AGENTS.md',
  'LICENSE.md',
  'DOCS_README.md',
  'SPANISH_TEXTS.md',
]);

// ── Main ──────────────────────────────────────────────────────────────────────

function main(): void {
  const report = new Report();
  const files = walkMarkdown(DOCS_DIR);

  for (const filePath of files) {
    const name = getFilename(filePath);

    // Rule 1: No spaces
    if (name.includes(' ')) {
      const suggested = name.replace(/ /g, '-');
      report.error(filePath, 'Filename contains spaces', `Suggested rename: ${suggested}`);
    }

    // Rule 2: ADR files must match the canonical pattern
    if (/^ADR-\d{4}/i.test(name) && !ADR_VALID_RE.test(name)) {
      report.warn(
        filePath,
        'ADR filename does not match expected pattern (ADR-NNNN[-_]<slug>.md)',
        name
      );
    }

    // Rule 3 (strict): non-ADR, non-exception filenames should be kebab-case
    if (STRICT && !/^ADR-\d{4}/i.test(name) && !UPPERCASE_EXCEPTIONS.has(name)) {
      const hasIssue = /[A-Z]/.test(name) || (name.includes('_') && !/^ADR-/.test(name));
      if (hasIssue) {
        report.warn(filePath, 'Filename should be kebab-case (lowercase, hyphens only)', name);
      }
    }
  }

  report.print();
  process.exit(report.exitCode);
}

function getFilename(filePath: string): string {
  return filePath.replace(/\\/g, '/').split('/').at(-1) ?? '';
}

main();
