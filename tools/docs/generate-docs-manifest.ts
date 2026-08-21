#!/usr/bin/env tsx
/**
 * @file tools/docs/generate-docs-manifest.ts
 * Generates docs/.manifest.json — a machine-readable catalog of all normative docs.
 *
 * Tracked output shape:
 *   {
 *     summary: { adrs, evidenceDocs, normativeDocs, statusDocs, total }
 *     catalogs: [{ name, count, contentSha256 }]
 *   }
 *
 * Full audit output remains available with --full --stdout.
 *
 * Used for: auditing, drift detection, dashboards, PR comments.
 *
 * Usage:
 *   tsx tools/docs/generate-docs-manifest.ts [--stdout] [--full]
 *   (--stdout prints to stdout instead of writing docs/.manifest.json)
 */
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { walkMarkdown } from './lib/walkDocs.js';
import {
  extractAdrFields,
  parseFrontmatter,
  readIfExists,
  splitFrontmatter,
} from './lib/markdown.js';
import { parseAdrFilename } from './lib/adr.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const DOCS_DIR = join(REPO_ROOT, 'docs');

const STDOUT_ONLY = process.argv.includes('--stdout');
const FULL_OUTPUT = process.argv.includes('--full');

// ── Types ─────────────────────────────────────────────────────────────────────

interface AdrEntry {
  path: string;
  filename: string;
  num: number | null;
  id: string | null;
  status: string | null;
  date: string | null;
  owners: string | null;
  archived: boolean;
  draft: boolean;
}

interface EvidenceEntry {
  path: string;
  filename: string;
  title: string | null;
  status: string | null;
  date: string | null;
  arc_level: string | null;
  breaking: string | null;
}

interface DocEntry {
  path: string;
  filename: string;
}

interface FullManifest {
  summary: {
    adrs: number;
    evidenceDocs: number;
    normativeDocs: number;
    statusDocs: number;
    total: number;
  };
  adrs: AdrEntry[];
  evidenceDocs: EvidenceEntry[];
  normativeDocs: DocEntry[];
  statusDocs: DocEntry[];
}

interface CompactManifest {
  summary: FullManifest['summary'];
  catalogs: Array<{
    name: keyof Omit<FullManifest, 'summary'>;
    count: number;
    contentSha256: string;
  }>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function relPath(absPath: string): string {
  return absPath.replace(/\\/g, '/').replace(REPO_ROOT.replace(/\\/g, '/') + '/', '');
}

function str(val: string | string[] | undefined): string | null {
  if (!val) return null;
  return Array.isArray(val) ? val.join(', ') : val;
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main(): void {
  const allFiles = walkMarkdown(DOCS_DIR)
    .filter(
      (filePath) =>
        ![
          'docs/planning/index.md',
          'docs/planning/proposals/index.md',
          'docs/planning/reviews/index.md',
          'docs/planning/status/index.md',
        ].includes(relPath(filePath))
    )
    .sort((left, right) => left.localeCompare(right));

  const adrs: AdrEntry[] = [];
  const evidenceDocs: EvidenceEntry[] = [];
  const normativeDocs: DocEntry[] = [];
  const statusDocs: DocEntry[] = [];

  for (const filePath of allFiles) {
    const name = basename(filePath);
    const rel = relPath(filePath);
    const normalizedPath = filePath.replace(/\\/g, '/');
    const content = readIfExists(filePath);
    if (!content) continue;

    // ADR files
    if (/^ADR-\d{4}/i.test(name)) {
      const parsed = parseAdrFilename(name);
      const fields = extractAdrFields(content);
      adrs.push({
        path: rel,
        filename: name,
        num: parsed?.num ?? null,
        id: parsed?.full ?? null,
        status: fields['Status'] ?? null,
        date: fields['Date'] ?? null,
        owners: fields['Owners'] ?? null,
        archived:
          normalizedPath.includes('/docs/archive/') || normalizedPath.includes('/_archive/'),
        draft: normalizedPath.includes('/_drafts/'),
      });
      continue;
    }

    // Evidence docs
    if (/^ED-\d{8}-/.test(name)) {
      const { hasFrontmatter, frontmatter } = splitFrontmatter(content);
      const fm = hasFrontmatter ? parseFrontmatter(frontmatter) : {};
      evidenceDocs.push({
        path: rel,
        filename: name,
        title: str(fm['title']),
        status: str(fm['status']),
        date: str(fm['date']),
        arc_level: str(fm['arc_level']),
        breaking: str(fm['breaking']),
      });
      continue;
    }

    // Status / gap tracker docs
    if (
      normalizedPath.includes('/planning/status/') ||
      normalizedPath.includes('/planning/gaps/')
    ) {
      statusDocs.push({ path: rel, filename: name });
      continue;
    }

    // Normative architecture / concepts / contracts
    if (
      normalizedPath.includes('/architecture/') ||
      normalizedPath.includes('/concepts/') ||
      normalizedPath.includes('/contracts/')
    ) {
      normativeDocs.push({ path: rel, filename: name });
    }
  }

  adrs.sort((left, right) => {
    const leftNum = left.num ?? Number.MAX_SAFE_INTEGER;
    const rightNum = right.num ?? Number.MAX_SAFE_INTEGER;
    if (leftNum !== rightNum) return leftNum - rightNum;
    return left.path.localeCompare(right.path);
  });
  evidenceDocs.sort((left, right) => left.path.localeCompare(right.path));
  normativeDocs.sort((left, right) => left.path.localeCompare(right.path));
  statusDocs.sort((left, right) => left.path.localeCompare(right.path));

  const summary = {
    adrs: adrs.length,
    evidenceDocs: evidenceDocs.length,
    normativeDocs: normativeDocs.length,
    statusDocs: statusDocs.length,
    total: adrs.length + evidenceDocs.length + normativeDocs.length + statusDocs.length,
  };

  const fullManifest: FullManifest = {
    summary,
    adrs,
    evidenceDocs,
    normativeDocs,
    statusDocs,
  };

  const compactManifest: CompactManifest = {
    summary,
    catalogs: [
      createCatalogDigest('adrs', adrs),
      createCatalogDigest('evidenceDocs', evidenceDocs),
      createCatalogDigest('normativeDocs', normativeDocs),
      createCatalogDigest('statusDocs', statusDocs),
    ],
  };

  const manifest = FULL_OUTPUT ? fullManifest : compactManifest;
  const json = JSON.stringify(manifest, null, 2) + '\n';

  if (STDOUT_ONLY) {
    process.stdout.write(json);
  } else {
    const outPath = join(DOCS_DIR, '.manifest.json');
    writeFileSync(outPath, json);
    const { adrs: a, evidenceDocs: e, normativeDocs: n, statusDocs: s } = summary;
    process.stderr.write(`Manifest written → ${outPath}\n`);
    process.stderr.write(`  ${a} ADRs · ${e} evidence docs · ${n} normative · ${s} status\n`);
  }
}

function createCatalogDigest<T>(
  name: keyof Omit<FullManifest, 'summary'>,
  entries: readonly T[]
): CompactManifest['catalogs'][number] {
  return {
    name,
    count: entries.length,
    contentSha256: createHash('sha256').update(JSON.stringify(entries)).digest('hex'),
  };
}

main();
