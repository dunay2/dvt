/**
 * @file tools/docs/lib/adr.ts
 * ADR-specific utilities: filename parsing, catalog table parsing, status normalization.
 */

// ── Filename parsing ──────────────────────────────────────────────────────────

export interface AdrFilenameInfo {
  /** Raw numeric part, e.g. 3 for ADR-0003 */
  num: number;
  /** Zero-padded string, e.g. "0003" */
  numStr: string;
  /** Optional lower-case letter suffix, e.g. "a" for ADR-0012a */
  suffix: string;
  /** Full ADR id, e.g. "ADR-0003" or "ADR-0012a" */
  full: string;
}

const ADR_FILENAME_RE = /^ADR-(\d{4})([a-z]?)[-_]/i;

/**
 * Parse ADR filename prefix into structured info.
 * Returns `null` if the filename does not start with a valid ADR prefix.
 */
export function parseAdrFilename(filename: string): AdrFilenameInfo | null {
  const match = filename.match(ADR_FILENAME_RE);
  if (!match) return null;
  const numStr = match[1]!;
  const suffix = match[2]!.toLowerCase();
  return {
    num: parseInt(numStr, 10),
    numStr,
    suffix,
    full: `ADR-${numStr}${suffix}`,
  };
}

// ── Index table parsing ───────────────────────────────────────────────────────

export interface AdrIndexEntry {
  /** e.g. "ADR-0003" */
  num: string;
  title: string;
  status: string;
  date: string;
  /** Relative path extracted from the link cell */
  filename: string;
}

/**
 * Parse the ADR catalog table from index.md content.
 * Handles table rows of the form:
 *   | ADR-NNNN | Title | Status | Date | [link](file.md) |
 */
export function parseAdrIndex(content: string): AdrIndexEntry[] {
  const records: AdrIndexEntry[] = [];
  // Match table data rows that start with an ADR number cell
  const rowRe = /^\|\s*(ADR-\d{4}[a-z]?)\s*\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|/gim;
  let match: RegExpExecArray | null;
  while ((match = rowRe.exec(content)) !== null) {
    const [, num, title, status, date, fileCell] = match as RegExpExecArray & string[];
    // Extract filename from a markdown link `[label](file.md)` in the file cell
    const linkMatch = fileCell!.match(/\[([^\]]+)\]\(([^)]+)\)/);
    const filename = linkMatch ? linkMatch[2]!.trim() : fileCell!.trim();
    records.push({
      num: num!.trim(),
      title: title!.trim(),
      status: status!.trim(),
      date: date!.trim(),
      filename,
    });
  }
  return records;
}

// ── Status normalization ──────────────────────────────────────────────────────

/** Normalize a status string for comparison: lowercase, no spaces. */
export function normalizeStatus(status: string): string {
  return status.toLowerCase().replace(/\s+/g, '');
}

/** Known valid ADR statuses (normalized). */
export const VALID_ADR_STATUSES = new Set([
  'accepted',
  'proposed',
  'superseded',
  'approved',
  'rejected',
  'partial',
  'active',
  'draft',
]);

// ── Path classification ───────────────────────────────────────────────────────

/** Returns true if `filePath` is under `_archive` or `_drafts`. */
export function isSpecialDir(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  return normalized.includes('/_archive/') || normalized.includes('/_drafts/');
}
