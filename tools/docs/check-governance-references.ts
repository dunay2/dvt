#!/usr/bin/env tsx
/**
 * @file tools/docs/check-governance-references.ts
 * Reference integrity gate for canonical governance documents.
 *
 * Rules enforced:
 *   1. (ERROR) Every ADR number mentioned in canonical matrices must resolve to
 *              an existing ADR file (docs/adr/ADR-NNNN*.md).
 *   2. (ERROR) Files listed as "source of truth" in docs/planning/status/
 *              canonical-doc-code-matrix.md must exist on disk.
 *   3. (WARN)  ADRs referenced in Evidence docs (code_refs / evidence section)
 *              must also exist.
 *
 * Files checked:
 *   - docs/planning/status/canonical-doc-code-matrix.md
 *   - docs/architecture/system-delivery-status.md
 *   - docs/evidence/ED-*.md (frontmatter evidence section)
 *
 * Exit codes: 0 = OK, 1 = errors found
 *
 * Usage:
 *   tsx tools/docs/check-governance-references.ts
 */
import { existsSync, readdirSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { walkMarkdown } from './lib/walkDocs.js';
import { readIfExists, splitFrontmatter, parseFrontmatter } from './lib/markdown.js';
import { parseAdrFilename } from './lib/adr.js';
import { Report } from './lib/report.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const DOCS_DIR = join(REPO_ROOT, 'docs');
const ADR_DIR = join(DOCS_DIR, 'adr');
const EVIDENCE_DIR = join(DOCS_DIR, 'evidence');

// Canonical governance docs to check references in
const CANONICAL_DOCS = [
  join(DOCS_DIR, 'planning', 'status', 'canonical-doc-code-matrix.md'),
  join(DOCS_DIR, 'architecture', 'system-delivery-status.md'),
];

// ── Build ADR inventory ───────────────────────────────────────────────────────

function buildAdrInventory(adrDir: string): Map<string, string> {
  const inventory = new Map<string, string>(); // "ADR-0003" → absolute path
  let entries: ReturnType<typeof readdirSync>;
  try {
    entries = readdirSync(adrDir, { withFileTypes: true });
  } catch {
    return inventory;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      for (const [k, v] of buildAdrInventory(join(adrDir, entry.name))) {
        inventory.set(k, v);
      }
    } else if (/^ADR-\d{4}/i.test(entry.name) && entry.name.endsWith('.md')) {
      const parsed = parseAdrFilename(entry.name);
      if (parsed) {
        inventory.set(parsed.full.toUpperCase(), join(adrDir, entry.name));
      }
    }
  }
  return inventory;
}

// ── Scan a document for ADR references ───────────────────────────────────────

const ADR_REF_RE = /\bADR-(\d{4}[a-z]?)\b/gi;

function extractAdrRefs(content: string): string[] {
  const refs: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = ADR_REF_RE.exec(content)) !== null) {
    // Reconstruct the normalized key "ADR-NNNN[a]"
    refs.push(`ADR-${match[1]!.slice(0, 4).toUpperCase()}${match[1]!.slice(4).toLowerCase()}`);
  }
  return [...new Set(refs)];
}

// ── Scan for file-path references in canonical matrices ───────────────────────

/** Extract markdown link targets from content. */
const MD_LINK_RE = /\[[^\]]*\]\(([^)]+)\)/g;

function extractFileRefs(content: string, sourceFile: string): string[] {
  const paths: string[] = [];
  const sourceDir = dirname(sourceFile);
  let match: RegExpExecArray | null;
  while ((match = MD_LINK_RE.exec(content)) !== null) {
    const href = match[1]!;
    if (/^https?:\/\/|^mailto:|^#/.test(href)) continue;
    const rawPath = href.split('#')[0]!;
    if (!rawPath) continue;
    paths.push(resolve(sourceDir, rawPath));
  }
  return paths;
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main(): void {
  const report = new Report();
  const adrInventory = buildAdrInventory(ADR_DIR);

  // ── 1. Check canonical governance docs ─────────────────────────────────
  for (const canonicalPath of CANONICAL_DOCS) {
    if (!existsSync(canonicalPath)) {
      report.warn(canonicalPath, 'Canonical governance doc not found on disk');
      continue;
    }

    const content = readIfExists(canonicalPath)!;

    // ADR references
    const adrRefs = extractAdrRefs(content);
    for (const ref of adrRefs) {
      if (!adrInventory.has(ref)) {
        report.error(
          canonicalPath,
          `References ADR that does not exist: ${ref}`,
          `No file found matching ${ref}*.md in ${ADR_DIR}`,
        );
      }
    }

    // File link targets
    const fileRefs = extractFileRefs(content, canonicalPath);
    for (const targetPath of fileRefs) {
      if (!existsSync(targetPath)) {
        report.error(
          canonicalPath,
          `Link target not found: ${targetPath}`,
        );
      }
    }
  }

  // ── 2. Check Evidence docs reference existing ADRs ──────────────────────
  if (existsSync(EVIDENCE_DIR)) {
    const evidenceFiles = walkMarkdown(EVIDENCE_DIR).filter((f) => /^ED-/.test(basename(f)));
    for (const filePath of evidenceFiles) {
      const content = readIfExists(filePath);
      if (!content) continue;

      // Check ADR references in the body
      const adrRefs = extractAdrRefs(content);
      for (const ref of adrRefs) {
        if (!adrInventory.has(ref)) {
          report.warn(
            filePath,
            `Evidence doc references unknown ADR: ${ref}`,
          );
        }
      }

      // Check code_refs in frontmatter point to existing files
      const { hasFrontmatter, frontmatter } = splitFrontmatter(content);
      if (hasFrontmatter) {
        const fm = parseFrontmatter(frontmatter);
        const codeRefs = fm['code_refs'];
        if (Array.isArray(codeRefs)) {
          for (const ref of codeRefs) {
            const refPath = join(REPO_ROOT, ref);
            if (!existsSync(refPath)) {
              report.warn(
                filePath,
                `code_refs entry not found: ${ref}`,
              );
            }
          }
        }
      }
    }
  }

  report.print();
  process.exit(report.exitCode);
}

main();
