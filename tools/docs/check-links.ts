#!/usr/bin/env tsx
/**
 * @file tools/docs/check-links.ts
 * Relative link integrity gate for the docs/ tree.
 *
 * Rules enforced:
 *   1. (ERROR) Every relative link target must resolve to an existing file.
 *   2. (WARN)  Links with #anchor must resolve to a heading that exists in the target.
 *   3. (WARN)  Links using known renamed/moved paths are flagged with the new path.
 *
 * External links (https://, mailto:) are skipped — use lychee for those.
 * Same-page anchor links (#...) are skipped.
 *
 * Usage:
 *   tsx tools/docs/check-links.ts                 # check all docs/
 *   tsx tools/docs/check-links.ts --changed-only  # only git-changed files
 */
import { existsSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { walkMarkdown } from './lib/walkDocs.js';
import { readIfExists, extractLinks, extractAnchors } from './lib/markdown.js';
import { Report } from './lib/report.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const DOCS_DIR = join(REPO_ROOT, 'docs');

const CHANGED_ONLY = process.argv.includes('--changed-only');

// ── Known renamed paths (old basename → new basename) ────────────────────────
// Update this when files are renamed so links are flagged immediately.
const KNOWN_RENAMES: Record<string, string> = {
  'SISTEMA DE TRABAJO OBLIGATORIO PARA IA.md': 'ai-work-protocol.md',
};

// ── Main ──────────────────────────────────────────────────────────────────────

function main(): void {
  const report = new Report();

  // Exclude historical/informal directories — links in these are not maintained
  const EXCLUDE_DIRS = ['closeouts', 'plans', 'archive', 'working-notes'];
  const files = CHANGED_ONLY
    ? getChangedMarkdownFiles()
    : walkMarkdown(DOCS_DIR, { excludeDirs: EXCLUDE_DIRS });

  // Anchor cache — avoid re-reading the same target file multiple times
  const anchorCache = new Map<string, Set<string>>();

  for (const filePath of files) {
    processFileLinks(filePath, report, anchorCache);
  }

  report.print();
  process.exit(report.exitCode);
}

function processFileLinks(filePath: string, report: Report, anchorCache: Map<string, Set<string>>): void {
  const content = readIfExists(filePath);
  if (!content) {
    return;
  }

  const links = extractLinks(content);
  const fileDir = dirname(filePath);
  for (const { href, line } of links) {
    processLink({ filePath, fileDir, href, line, report, anchorCache });
  }
}

function processLink(input: {
  filePath: string;
  fileDir: string;
  href: string;
  line: number;
  report: Report;
  anchorCache: Map<string, Set<string>>;
}): void {
  if (isExternalOrSamePageHref(input.href)) {
    return;
  }

  const parsed = parseHref(input.href);
  if (!parsed.rawPath) {
    return;
  }

  reportKnownRename(input.report, input.filePath, input.line, parsed.rawPath);
  const decodedPath = decodeURIComponent(parsed.rawPath);
  const targetPath = resolve(input.fileDir, decodedPath);
  if (!existsSync(targetPath)) {
    input.report.error(
      `${input.filePath}:${input.line}`,
      `Broken link: ${parsed.rawPath}`,
      `Resolved to: ${targetPath}`
    );
    return;
  }

  if (parsed.anchor !== null) {
    checkAnchor(input.report, input.filePath, input.line, targetPath, parsed.anchor, input.anchorCache);
  }
}

function isExternalOrSamePageHref(href: string): boolean {
  return /^https?:\/\/|^mailto:|^#/.test(href);
}

function parseHref(href: string): { rawPath: string; anchor: string | null } {
  const hashIdx = href.indexOf('#');
  const anchor = hashIdx === -1 ? null : href.slice(hashIdx + 1);
  const rawPath = (hashIdx === -1 ? href : href.slice(0, hashIdx)).replace(/:(\d+)(:\d+)?$/, '');
  return { rawPath, anchor };
}

function reportKnownRename(report: Report, filePath: string, line: number, rawPath: string): void {
  const targetBasename = basename(decodeURIComponent(rawPath));
  const renamedTo = KNOWN_RENAMES[targetBasename];
  if (renamedTo === undefined) {
    return;
  }
  report.warn(
    `${filePath}:${line}`,
    `Link uses renamed path: ${rawPath}`,
    `Current name: ${renamedTo}`
  );
}

function checkAnchor(
  report: Report,
  filePath: string,
  line: number,
  targetPath: string,
  anchor: string,
  anchorCache: Map<string, Set<string>>
): void {
  let anchors = anchorCache.get(targetPath);
  if (anchors === undefined) {
    const targetContent = readIfExists(targetPath);
    anchors = targetContent ? extractAnchors(targetContent) : new Set();
    anchorCache.set(targetPath, anchors);
  }

  if (anchors.has(anchor)) {
    return;
  }

  const sample = [...anchors].slice(0, 4).join(', ');
  report.warn(
    `${filePath}:${line}`,
    `Anchor #${anchor} not found in ${basename(targetPath)}`,
    sample ? `Available: ${sample}` : 'No headings found'
  );
}

function getChangedMarkdownFiles(): string[] {
  const base = process.env['GIT_BASE'] ?? 'origin/main';
  try {
    const output = execSync(`git diff --name-only --diff-filter=AM ${base} -- "*.md"`, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    return output
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((f) => join(REPO_ROOT, f))
      .filter((f) => f.startsWith(DOCS_DIR));
  } catch {
    // Fall back to full scan if git is unavailable
    return walkMarkdown(DOCS_DIR);
  }
}

main();
