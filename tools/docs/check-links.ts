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
const EXCLUDE_DIRS = ['closeouts', 'plans', 'archive', 'working-notes'];
const EXCLUDE_PATH_SEGMENTS = new Set([
  'archive',
  'closeouts',
  'plans',
  'working-notes',
  '_archive',
  '_drafts',
  '_templates',
  'superseded',
  'disposable',
]);

// ── Known renamed paths (old basename → new basename) ────────────────────────
// Update this when files are renamed so links are flagged immediately.
const KNOWN_RENAMES: Record<string, string> = {
  'SISTEMA DE TRABAJO OBLIGATORIO PARA IA.md': 'ai-work-protocol.md',
};

// ── Main ──────────────────────────────────────────────────────────────────────

function main(): void {
  const report = new Report();

  // Exclude historical/informal directories — links in these are not maintained.
  // Keep a segment-based filter as a second guard so changed-only mode and
  // future taxonomy drift do not re-introduce historical files into the scan.
  const files = (
    CHANGED_ONLY ? getChangedMarkdownFiles() : walkMarkdown(DOCS_DIR, { excludeDirs: EXCLUDE_DIRS })
  ).filter((filePath) => !isIgnoredDocsSource(filePath));

  // Anchor cache — avoid re-reading the same target file multiple times
  const anchorCache = new Map<string, Set<string>>();

  for (const filePath of files) {
    const content = readIfExists(filePath);
    if (!content) continue;

    const links = extractLinks(content);
    const fileDir = dirname(filePath);

    for (const { href, line } of links) {
      // Skip external links, mailto, and pure same-page anchors
      if (/^https?:\/\/|^mailto:|^#/.test(href)) continue;

      // Split into path component and optional anchor
      const hashIdx = href.indexOf('#');
      const anchor = hashIdx === -1 ? null : href.slice(hashIdx + 1);
      const rawPath = (hashIdx === -1 ? href : href.slice(0, hashIdx))
        // Strip trailing :line or :line:col suffixes on code file links (e.g. foo.ts:42)
        .replace(/:(\d+)(:\d+)?$/, '');

      // Skip if no file path (pure anchor)
      if (!rawPath) continue;

      // Check for known renames
      const targetBasename = basename(decodeURIComponent(rawPath));
      if (KNOWN_RENAMES[targetBasename]) {
        report.warn(
          `${filePath}:${line}`,
          `Link uses renamed path: ${rawPath}`,
          `Current name: ${KNOWN_RENAMES[targetBasename]}`
        );
      }

      // Resolve target path (URL-decode encoded spaces etc. in link hrefs)
      const targetPath = resolve(fileDir, decodeURIComponent(rawPath));

      if (!existsSync(targetPath)) {
        report.error(
          `${filePath}:${line}`,
          `Broken link: ${rawPath}`,
          `Resolved to: ${targetPath}`
        );
        continue;
      }

      // Check anchor if present
      if (anchor) {
        let anchors = anchorCache.get(targetPath);
        if (!anchors) {
          const targetContent = readIfExists(targetPath);
          anchors = targetContent ? extractAnchors(targetContent) : new Set();
          anchorCache.set(targetPath, anchors);
        }

        if (!anchors.has(anchor)) {
          const sample = [...anchors].slice(0, 4).join(', ');
          report.warn(
            `${filePath}:${line}`,
            `Anchor #${anchor} not found in ${basename(targetPath)}`,
            sample ? `Available: ${sample}` : 'No headings found'
          );
        }
      }
    }
  }

  report.print();
  process.exit(report.exitCode);
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
      .filter((f) => f.startsWith(DOCS_DIR))
      .filter((f) => !isIgnoredDocsSource(f));
  } catch {
    // Fall back to full scan if git is unavailable
    return walkMarkdown(DOCS_DIR, { excludeDirs: EXCLUDE_DIRS }).filter(
      (f) => !isIgnoredDocsSource(f)
    );
  }
}

function isIgnoredDocsSource(filePath: string): boolean {
  return filePath
    .replace(/\\/g, '/')
    .split('/')
    .some((segment) => EXCLUDE_PATH_SEGMENTS.has(segment));
}

main();
