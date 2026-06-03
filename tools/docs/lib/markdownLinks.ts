/**
 * Owned concern: extract markdown links while ignoring fenced and inline code examples.
 *
 * This module owns outbound markdown link discovery only; it treats code spans
 * and fenced blocks as examples, not governed links.
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
    if (line.startsWith('```')) {
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
  const stripped = stripInlineCode(line);

  forEachRegexMatch(MARKDOWN_LINK_RE, stripped, (match) => {
    const text = match[1];
    const href = match[2];
    if (text != null && href != null) {
      links.push({ text, href, line: lineNumber });
    }
  });
}

function stripInlineCode(line: string): string {
  let stripped = '';
  let inInlineCode = false;

  for (const character of line) {
    if (character === '`') {
      inInlineCode = !inInlineCode;
      stripped += '`';
      continue;
    }

    stripped += inInlineCode ? ' ' : character;
  }

  return stripped;
}
