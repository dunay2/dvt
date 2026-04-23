/**
 * @file tools/docs/lib/markdownLinks.ts
 * Markdown link extraction helpers for docs governance tools.
 */
import { forEachRegexMatch } from './markdownRegex.js';

export interface MarkdownLink {
  text: string;
  href: string;
  line: number;
}

const MARKDOWN_LINK_RE = /\[([^]]*)]\(([^)]+)\)/g;

export function extractLinks(content: string): MarkdownLink[] {
  const links: MarkdownLink[] = [];
  const lines = content.split('\n');
  let inFence = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? '';
    if (/^```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (!inFence) {
      collectLineLinks(line, i + 1, links);
    }
  }

  return links;
}

function collectLineLinks(line: string, lineNumber: number, links: MarkdownLink[]): void {
  const stripped = line.replaceAll(/`[^`]*`/g, '``');

  forEachRegexMatch(MARKDOWN_LINK_RE, stripped, (match) => {
    const text = match[1];
    const href = match[2];
    if (text != null && href != null) {
      links.push({ text, href, line: lineNumber });
    }
  });
}
