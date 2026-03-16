/**
 * @file tools/docs/lib/markdown.ts
 * Markdown parsing utilities: frontmatter, links, anchors, ADR header fields.
 */
import { readFileSync } from 'node:fs';
import { load as yamlLoad, JSON_SCHEMA } from 'js-yaml';

// ── Frontmatter ──────────────────────────────────────────────────────────────

export interface FrontmatterResult {
  hasFrontmatter: boolean;
  frontmatter: string;
  body: string;
}

/**
 * Split YAML frontmatter (--- ... ---) from markdown content.
 */
export function splitFrontmatter(content: string): FrontmatterResult {
  if (!content.startsWith('---')) {
    return { hasFrontmatter: false, frontmatter: '', body: content };
  }
  const end = content.indexOf('\n---', 3);
  if (end === -1) {
    return { hasFrontmatter: false, frontmatter: '', body: content };
  }
  return {
    hasFrontmatter: true,
    frontmatter: content.slice(4, end),
    body: content.slice(end + 4).trimStart(),
  };
}

/**
 * Parse YAML frontmatter into a record using js-yaml.
 * Uses JSON_SCHEMA to prevent auto-parsing of dates (e.g. 2026-03-07 stays a string).
 */
export function parseFrontmatter(frontmatter: string): Record<string, unknown> {
  try {
    const parsed = yamlLoad(frontmatter, { schema: JSON_SCHEMA });
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // malformed YAML — return empty
  }
  return {};
}

// ── ADR body header fields ────────────────────────────────────────────────────

/**
 * Extract ADR-style header fields, supporting three observed formats:
 *   1. `- **Status**: Accepted`   (bold list item — canonical)
 *   2. `- Status: Accepted`       (plain list item)
 *   3. `Status: Accepted`         (bare key: value, no dash)
 *
 * Also merges YAML frontmatter keys (title-cased) when present, so ADRs
 * that use YAML frontmatter (ADR-0034 style) are also handled.
 */
export function extractAdrFields(content: string): Record<string, string> {
  const result: Record<string, string> = {};

  // Try YAML frontmatter first (keys become Title-cased, e.g. status → Status)
  const { hasFrontmatter, frontmatter, body } = splitFrontmatter(content);
  if (hasFrontmatter) {
    const fm = parseFrontmatter(frontmatter);
    // Canonical YAML key aliases used by different ADR authors
    const ALIASES: Record<string, string> = {
      status: 'Status',
      date: 'Date',
      last_reviewed: 'Date', // ADR-0033/0034 use last_reviewed instead of date
      owner: 'Owners', // singular → canonical plural form
      owners: 'Owners',
      title: 'Title',
      arc_level: 'ARC Level',
    };
    for (const [k, v] of Object.entries(fm)) {
      const canonical = ALIASES[k.toLowerCase()] ?? k.charAt(0).toUpperCase() + k.slice(1);
      if (!(canonical in result)) {
        result[canonical] = Array.isArray(v)
          ? v.map(String).join(', ')
          : v !== null && typeof v === 'object'
            ? JSON.stringify(v)
            : String(v ?? '');
      }
    }
    // Also scan body for overrides (prefer body if duplicated)
    Object.assign(result, extractAdrFieldsFromBody(body));
    return result;
  }

  return extractAdrFieldsFromBody(content);
}

function extractAdrFieldsFromBody(body: string): Record<string, string> {
  const result: Record<string, string> = {};

  // Format 1: `- **Key**: Value`  (bold list item)
  const bold = /^-\s+\*\*([^*]+)\*\*\s*:\s*(.*)$/gm;
  let m: RegExpExecArray | null;
  while ((m = bold.exec(body)) !== null) {
    result[m[1]!.trim()] = m[2]!.trim();
  }

  // Format 2: `- Key: Value`  (plain list item, no bold) — only if not already found
  const plainList = /^-\s+([\w][\w\s]*?)\s*:\s*(.+)$/gm;
  while ((m = plainList.exec(body)) !== null) {
    const key = m[1]!.trim();
    if (!(key in result)) result[key] = m[2]!.trim();
  }

  // Format 3: `Key: Value`  (bare, no dash, no bold) — top of document, before first H2
  const firstH2 = body.search(/^##\s/m);
  const preamble = firstH2 === -1 ? body.slice(0, 300) : body.slice(0, firstH2);
  const bare = /^(Status|Date|Owners?|Owner|ARC Level|Version)\s*:\s*(.+)$/gim;
  while ((m = bare.exec(preamble)) !== null) {
    const key = m[1]!.trim();
    // Normalize "Owner" → "Owners"
    const normalKey = key.toLowerCase() === 'owner' ? 'Owners' : key;
    if (!(normalKey in result)) result[normalKey] = m[2]!.trim();
  }

  return result;
}

// ── Links ─────────────────────────────────────────────────────────────────────

export interface MarkdownLink {
  text: string;
  href: string;
  line: number;
}

/**
 * Extract all markdown links from content, skipping fenced code blocks and inline code.
 */
export function extractLinks(content: string): MarkdownLink[] {
  const links: MarkdownLink[] = [];
  const lines = content.split('\n');
  let inFence = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (/^```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    // Strip inline code to avoid false positives
    const stripped = line.replace(/`[^`]*`/g, '``');
    const linkPattern = /\[([^\]]*)\]\(([^)]+)\)/g;
    let match: RegExpExecArray | null;
    while ((match = linkPattern.exec(stripped)) !== null) {
      links.push({ text: match[1]!, href: match[2]!, line: i + 1 });
    }
  }

  return links;
}

// ── Anchors ───────────────────────────────────────────────────────────────────

/**
 * Extract all anchor IDs from markdown content.
 * Converts headings to GitHub-style anchors (lowercase, hyphens, strip specials).
 */
export function extractAnchors(content: string): Set<string> {
  const anchors = new Set<string>();

  const headingPattern = /^#{1,6}\s+(.+)$/gm;
  let match: RegExpExecArray | null;
  while ((match = headingPattern.exec(content)) !== null) {
    const anchor = match[1]!
      .trim()
      .toLowerCase()
      .replace(/[`*[\]()]/g, '') // remove markdown formatting chars
      .replace(/[^\w\s-]/g, '') // remove remaining specials
      .replace(/\s+/g, '-') // spaces → hyphens
      .replace(/-+/g, '-') // collapse multiple hyphens
      .replace(/^-|-$/g, ''); // trim leading/trailing hyphens
    if (anchor) anchors.add(anchor);
  }

  // Explicit <a id="..."> or <a name="...">
  const explicitPattern = /<a\s+(?:id|name)="([^"]+)"/gi;
  while ((match = explicitPattern.exec(content)) !== null) {
    anchors.add(match[1]!);
  }

  return anchors;
}

// ── File I/O ──────────────────────────────────────────────────────────────────

/**
 * Read a file and return its content, or null if the file does not exist.
 */
export function readIfExists(filePath: string): string | null {
  try {
    return readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}
