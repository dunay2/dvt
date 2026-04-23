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
 *              (all lowercase, hyphens only - no underscores, no uppercase).
 *
 * Usage:
 *   tsx tools/docs/check-filenames.ts [--strict] [--changed-only]
 */
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Report } from './lib/report.js';
import { walkMarkdown } from './lib/walkDocs.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const DOCS_DIR = join(REPO_ROOT, 'docs');

const STRICT = process.argv.includes('--strict');
const CHANGED_ONLY = process.argv.includes('--changed-only');

const ADR_PREFIX_RE = /^ADR-\d{4}/i;
const ADR_VALID_RE = /^ADR-\d{4}[a-z]?[-_].+\.(?:[a-z]{2}\.)?md$/i;

const UPPERCASE_EXCEPTIONS = new Set([
  'README.md',
  'CHANGELOG.md',
  'CONTRIBUTING.md',
  'AGENTS.md',
  'LICENSE.md',
  'DOCS_README.md',
  'SPANISH_TEXTS.md',
]);

function main(): void {
  const report = new Report();
  const files = CHANGED_ONLY ? getChangedMarkdownFiles() : walkMarkdown(DOCS_DIR);

  if (CHANGED_ONLY && files.length === 0) {
    console.log('[check-filenames] No changed docs markdown files - skipping');
    return;
  }

  for (const filePath of files) {
    checkFilename(filePath, report);
  }

  report.print();
  process.exit(report.exitCode);
}

function checkFilename(filePath: string, report: Report): void {
  const name = getFilename(filePath);

  reportSpaces(filePath, name, report);
  reportAdrPattern(filePath, name, report);
  reportStrictKebabCase(filePath, name, report);
}

function reportSpaces(filePath: string, name: string, report: Report): void {
  if (!name.includes(' ')) {
    return;
  }

  report.error(filePath, 'Filename contains spaces', `Suggested rename: ${name.replaceAll(' ', '-')}`);
}

function reportAdrPattern(filePath: string, name: string, report: Report): void {
  if (!ADR_PREFIX_RE.test(name) || ADR_VALID_RE.test(name)) {
    return;
  }

  reportPolicyFinding(
    report,
    filePath,
    'ADR filename does not match expected pattern (ADR-NNNN[-_]<slug>.md)',
    'New or changed ADR docs must use the canonical ADR pattern',
    name
  );
}

function reportStrictKebabCase(filePath: string, name: string, report: Report): void {
  if (!shouldCheckStrictKebabCase(name) || !hasKebabCaseIssue(name)) {
    return;
  }

  reportPolicyFinding(
    report,
    filePath,
    'Filename should be kebab-case (lowercase, hyphens only)',
    'New or changed docs must use canonical kebab-case names',
    name
  );
}

function reportPolicyFinding(
  report: Report,
  filePath: string,
  message: string,
  changedOnlyMessage: string,
  fullScanMessage: string
): void {
  if (CHANGED_ONLY) {
    report.error(filePath, message, changedOnlyMessage);
    return;
  }

  report.warn(filePath, message, fullScanMessage);
}

function shouldCheckStrictKebabCase(name: string): boolean {
  return STRICT && !ADR_PREFIX_RE.test(name) && !UPPERCASE_EXCEPTIONS.has(name);
}

function hasKebabCaseIssue(name: string): boolean {
  return /[A-Z]/.test(name) || name.includes('_');
}

function getFilename(filePath: string): string {
  return filePath.replaceAll('\\', '/').split('/').pop() ?? '';
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
  if (!candidate.toLowerCase().endsWith('.md')) {
    return [];
  }

  const absolute = resolve(REPO_ROOT, candidate);
  if (!absolute.startsWith(DOCS_DIR)) {
    return [];
  }

  return [absolute];
}

main();
