/**
 * @file tools/docs/lib/markdownFrontmatter.ts
 * YAML frontmatter parsing helpers for docs governance tools.
 */
import { readFileSync } from 'node:fs';
import { load as yamlLoad, JSON_SCHEMA } from 'js-yaml';

export interface FrontmatterResult {
  hasFrontmatter: boolean;
  frontmatter: string;
  body: string;
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export function splitFrontmatter(content: string): FrontmatterResult {
  const normalizedContent = stripUtf8Bom(content);
  const match = FRONTMATTER_RE.exec(normalizedContent);
  const fullMatch = match?.[0];
  const frontmatter = match?.[1];

  if (fullMatch == null || frontmatter == null) {
    return { hasFrontmatter: false, frontmatter: '', body: normalizedContent };
  }

  return {
    hasFrontmatter: true,
    frontmatter,
    body: normalizedContent.slice(fullMatch.length).trimStart(),
  };
}

export function parseFrontmatter(frontmatter: string): Record<string, unknown> {
  try {
    const parsed = yamlLoad(frontmatter, { schema: JSON_SCHEMA });
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // malformed YAML - return empty
  }
  return {};
}

export function readIfExists(filePath: string): string | null {
  try {
    return readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

function stripUtf8Bom(content: string): string {
  return content.codePointAt(0) === 0xfeff ? content.slice(1) : content;
}
