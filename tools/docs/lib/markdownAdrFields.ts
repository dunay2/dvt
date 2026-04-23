/**
 * @file tools/docs/lib/markdownAdrFields.ts
 * ADR header-field extraction helpers for docs governance tools.
 */
import { parseFrontmatter, splitFrontmatter } from './markdownFrontmatter.js';
import { forEachRegexMatch } from './markdownRegex.js';

const BOLD_ADR_FIELD_RE = /^-\s+\*\*([^*]+)\*\*\s*:\s*(.*)$/gm;
const PLAIN_LIST_ADR_FIELD_RE = /^-\s+(\w[\w\s]*?)\s*:\s*(.+)$/gm;
const BARE_ADR_FIELD_RE = /^(Status|Date|Owners?|Owner|ARC Level|Version)\s*:\s*(.+)$/gim;

const FRONTMATTER_FIELD_ALIASES: Record<string, string> = {
  status: 'Status',
  date: 'Date',
  last_reviewed: 'Date',
  owner: 'Owners',
  owners: 'Owners',
  title: 'Title',
  arc_level: 'ARC Level',
};

export function extractAdrFields(content: string): Record<string, string> {
  const { hasFrontmatter, frontmatter, body } = splitFrontmatter(content);
  if (!hasFrontmatter) {
    return extractAdrFieldsFromBody(content);
  }

  return {
    ...extractAdrFieldsFromFrontmatter(frontmatter),
    ...extractAdrFieldsFromBody(body),
  };
}

function extractAdrFieldsFromFrontmatter(frontmatter: string): Record<string, string> {
  const result: Record<string, string> = {};
  const fields = parseFrontmatter(frontmatter);

  for (const [key, value] of Object.entries(fields)) {
    const canonical = canonicalFrontmatterFieldName(key);
    if (!(canonical in result)) {
      result[canonical] = stringifyFrontmatterValue(value);
    }
  }

  return result;
}

function extractAdrFieldsFromBody(body: string): Record<string, string> {
  const result: Record<string, string> = {};

  mergeAdrFieldMatches(result, BOLD_ADR_FIELD_RE, body, false);
  mergeAdrFieldMatches(result, PLAIN_LIST_ADR_FIELD_RE, body, true);
  mergeAdrFieldMatches(result, BARE_ADR_FIELD_RE, getAdrPreamble(body), true);

  return result;
}

function mergeAdrFieldMatches(
  result: Record<string, string>,
  pattern: RegExp,
  body: string,
  keepExisting: boolean
): void {
  forEachRegexMatch(pattern, body, (match) => {
    const rawKey = match[1]?.trim();
    const rawValue = match[2]?.trim();
    if (rawKey == null || rawValue == null) {
      return;
    }

    const key = normalizeAdrFieldKey(rawKey);
    if (!keepExisting || !(key in result)) {
      result[key] = rawValue;
    }
  });
}

function canonicalFrontmatterFieldName(key: string): string {
  return FRONTMATTER_FIELD_ALIASES[key.toLowerCase()] ?? capitalizeFirstLetter(key);
}

function capitalizeFirstLetter(value: string): string {
  if (value.length === 0) {
    return value;
  }

  return `${value[0]?.toUpperCase() ?? ''}${value.slice(1)}`;
}

function stringifyFrontmatterValue(value: unknown): string {
  if (value == null) {
    return '';
  }

  if (Array.isArray(value)) {
    return value.map(String).join(', ');
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

function normalizeAdrFieldKey(key: string): string {
  return key.toLowerCase() === 'owner' ? 'Owners' : key;
}

function getAdrPreamble(body: string): string {
  const firstH2 = body.search(/^##\s/m);
  return firstH2 === -1 ? body.slice(0, 300) : body.slice(0, firstH2);
}
