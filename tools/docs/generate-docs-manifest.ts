#!/usr/bin/env tsx
/**
 * @file tools/docs/generate-docs-manifest.ts
 * Generates docs/.manifest.json — a machine-readable catalog of all normative docs.
 *
 * Output shape:
 *   {
 *     generatedAt: string (ISO-8601)
 *     summary: { adrs, evidenceDocs, normativeDocs, statusDocs }
 *     adrs: AdrEntry[]
 *     evidenceDocs: EvidenceEntry[]
 *     normativeDocs: DocEntry[]
 *     statusDocs: DocEntry[]
 *   }
 *
 * Used for: auditing, drift detection, dashboards, PR comments.
 *
 * Usage:
 *   tsx tools/docs/generate-docs-manifest.ts [--stdout]
 *   (--stdout prints to stdout instead of writing docs/.manifest.json)
 */
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
import { parseAdrFilename, isSpecialDir } from './lib/adr.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const DOCS_DIR = join(REPO_ROOT, 'docs');

const STDOUT_ONLY = process.argv.includes('--stdout');

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

interface Manifest {
  generatedAt: string;
  summary: {
    adrs: number;
    evidenceDocs: number;
    normativeDocs: number;
    statusDocs: number;
  };
  adrs: AdrEntry[];
  evidenceDocs: EvidenceEntry[];
  normativeDocs: DocEntry[];
  statusDocs: DocEntry[];
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
  const allFiles = walkMarkdown(DOCS_DIR);

  const adrs: AdrEntry[] = [];
  const evidenceDocs: EvidenceEntry[] = [];
  const normativeDocs: DocEntry[] = [];
  const statusDocs: DocEntry[] = [];

  for (const filePath of allFiles) {
    const name = basename(filePath);
    const rel = relPath(filePath);
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
        archived: isSpecialDir(filePath) && filePath.replace(/\\/g, '/').includes('/_archive/'),
        draft: filePath.replace(/\\/g, '/').includes('/_drafts/'),
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
    const normalizedPath = filePath.replace(/\\/g, '/');
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

  // Sort ADRs numerically
  adrs.sort((a, b) => (a.num ?? 9999) - (b.num ?? 9999));

  const manifest: Manifest = {
    generatedAt: new Date().toISOString(),
    summary: {
      adrs: adrs.length,
      evidenceDocs: evidenceDocs.length,
      normativeDocs: normativeDocs.length,
      statusDocs: statusDocs.length,
    },
    adrs,
    evidenceDocs,
    normativeDocs,
    statusDocs,
  };

  const json = JSON.stringify(manifest, null, 2) + '\n';

  if (STDOUT_ONLY) {
    process.stdout.write(json);
  } else {
    const outPath = join(DOCS_DIR, '.manifest.json');
    writeFileSync(outPath, json);
    const { adrs: a, evidenceDocs: e, normativeDocs: n, statusDocs: s } = manifest.summary;
    process.stderr.write(`Manifest written → ${outPath}\n`);
    process.stderr.write(`  ${a} ADRs · ${e} evidence docs · ${n} normative · ${s} status\n`);
  }
}

main();
