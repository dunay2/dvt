#!/usr/bin/env tsx
/**
 * @file tools/docs/check-adr-catalog.ts
 * ADR catalog governance gate.
 *
 * Rules enforced:
 *   1. Every ADR-NNNN*.md must have a unique number (across _archive and _drafts too).
 *   2. docs/adr/index.md must reference every non-archived, non-draft ADR file.
 *   3. Index must not reference files that don't exist.
 *   4. Status in the ADR body must match status in the index table (case-insensitive).
 *   5. Archived ADRs that are not marked "Superseded" get a warning.
 *
 * Exit codes: 0 = OK, 1 = errors found, 2 = script error
 *
 * Usage:
 *   tsx tools/docs/check-adr-catalog.ts
 */
import { existsSync, readdirSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseAdrFilename, parseAdrIndex, normalizeStatus, isSpecialDir } from './lib/adr.js';
import { extractAdrFields, readIfExists } from './lib/markdown.js';
import { Report } from './lib/report.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const ADR_DIR = join(REPO_ROOT, 'docs', 'adr');

// ── Helpers ───────────────────────────────────────────────────────────────────

interface AdrFile {
  filePath: string;
  filename: string;
}

function collectAdrFiles(dir: string): AdrFile[] {
  const results: AdrFile[] = [];
  let entries: ReturnType<typeof readdirSync>;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectAdrFiles(full));
    } else if (entry.isFile() && /^ADR-\d{4}/i.test(entry.name) && entry.name.endsWith('.md')) {
      results.push({ filePath: full, filename: entry.name });
    }
  }
  return results;
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main(): void {
  const report = new Report();

  if (!existsSync(ADR_DIR)) {
    process.stderr.write(`ERROR: ADR directory not found: ${ADR_DIR}\n`);
    process.exit(2);
  }

  const allFiles = collectAdrFiles(ADR_DIR);
  const mainFiles = allFiles.filter((f) => !isSpecialDir(f.filePath));
  const archivedFiles = allFiles.filter((f) =>
    f.filePath.replaceAll('\\', '/').includes('/_archive/')
  );

  // ── Rule 1: Unique ADR numbers ──────────────────────────────────────────
  // Language variants (e.g. ADR-0019-foo.en.md alongside ADR-0019-foo.md)
  // share a number intentionally — they are translations, not duplicates.
  // We detect true duplicates by grouping on (number + suffix) after stripping
  // the language tag (.en, .es, …) from the extension.
  const byNum = new Map<string, string[]>();
  for (const f of allFiles) {
    const parsed = parseAdrFilename(f.filename);
    if (!parsed) continue;
    const key = parsed.full.toUpperCase();
    const existing = byNum.get(key) ?? [];
    existing.push(f.filePath);
    byNum.set(key, existing);
  }
  for (const [key, paths] of byNum) {
    // Strip language tag (.en.md, .es.md …) before deduplicating
    const canonical = paths.filter((p) => !/\.[a-z]{2}\.md$/.test(basename(p)));
    // Error only if there are multiple canonical (non-translated) files with the same number
    if (canonical.length > 1) {
      report.error(
        ADR_DIR,
        `Duplicate ADR number: ${key}`,
        canonical.map((p) => basename(p)).join(', ')
      );
    }
    // Note: an ADR that only exists as .en.md (no language-neutral counterpart)
    // is valid when the index explicitly references it. No warning emitted here.
  }

  // ── Load index ──────────────────────────────────────────────────────────
  const candidatePaths = [join(ADR_DIR, 'index.md'), join(ADR_DIR, 'ADR-Index.md')];
  const indexPath = candidatePaths.find(existsSync) ?? null;

  if (!indexPath) {
    report.error(ADR_DIR, 'No index file found', 'Expected docs/adr/index.md or ADR-Index.md');
    report.print();
    process.exit(report.exitCode);
  }

  const indexContent = readIfExists(indexPath);
  if (indexContent === null) {
    report.error(indexPath, 'Unable to read ADR index file');
    report.print();
    process.exit(report.exitCode);
  }
  const indexEntries = parseAdrIndex(indexContent);

  // ── Rule 2: Index entries must point to existing files ──────────────────
  const indexByNum = new Map<string, (typeof indexEntries)[0] & { resolvedPath: string }>();
  for (const entry of indexEntries) {
    // Filename may be relative like `./ADR-0001-foo.md` or just `ADR-0001-foo.md`
    const resolved = join(ADR_DIR, entry.filename.replace(/^\.\//, ''));
    if (!existsSync(resolved)) {
      report.error(
        indexPath,
        `Index references missing file: ${entry.filename}`,
        `ADR ${entry.num}`
      );
    } else {
      indexByNum.set(entry.num.toUpperCase(), { ...entry, resolvedPath: resolved });
    }
  }

  // ── Rule 3: All non-archived/non-draft ADR files must be in the index ───
  for (const f of mainFiles) {
    const parsed = parseAdrFilename(f.filename);
    if (!parsed) continue;
    const key = parsed.full.toUpperCase();
    if (!indexByNum.has(key)) {
      report.error(f.filePath, `ADR not listed in index`, `Expected entry for ${key}`);
    }
  }

  // ── Rule 4: Status consistency ─────────────────────────────────────────
  for (const [key, entry] of indexByNum) {
    const content = readIfExists(entry.resolvedPath);
    if (!content) continue;
    const fields = extractAdrFields(content);
    const fileStatus = fields['Status'];

    if (!fileStatus) {
      report.warn(entry.resolvedPath, 'ADR missing Status field in body');
      continue;
    }

    const fileNorm = normalizeStatus(fileStatus.split(/[,/]/)[0] ?? '');
    const indexNorm = normalizeStatus(entry.status.split(/[,/]/)[0] ?? '');

    if (fileNorm !== indexNorm) {
      report.error(
        entry.resolvedPath,
        `Status mismatch: file="${fileStatus}" index="${entry.status}"`,
        key
      );
    }
  }

  // ── Rule 5: Archived ADRs should be Superseded ─────────────────────────
  for (const f of archivedFiles) {
    const content = readIfExists(f.filePath);
    if (!content) continue;
    const fields = extractAdrFields(content);
    if (fields['Status'] && normalizeStatus(fields['Status']) !== 'superseded') {
      report.warn(f.filePath, `Archived ADR not marked Superseded`, `Status: ${fields['Status']}`);
    }
  }

  report.print();
  process.exit(report.exitCode);
}

main();
