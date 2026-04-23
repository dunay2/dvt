/**
 * Owned concern: derive linkable markdown anchors from headings and explicit anchor tags.
 *
 * This module owns GitHub-style anchor normalization only; it does not parse
 * frontmatter or collect outbound markdown links.
 */
import { forEachRegexMatch } from './markdownRegex.js';

const HEADING_RE = /^#{1,6}\s+(.+)$/gm;
const EXPLICIT_ANCHOR_RE = /<a\s+(?:id|name)="([^"]+)"/gi;

export function extractAnchors(content: string): Set<string> {
  const anchors = new Set<string>();

  forEachRegexMatch(HEADING_RE, content, (match) => {
    const heading = match[1];
    if (heading == null) {
      return;
    }

    const anchor = toGithubHeadingAnchor(heading);
    if (anchor) {
      anchors.add(anchor);
    }
  });

  forEachRegexMatch(EXPLICIT_ANCHOR_RE, content, (match) => {
    const explicitAnchor = match[1];
    if (explicitAnchor != null) {
      anchors.add(explicitAnchor);
    }
  });

  return anchors;
}

function toGithubHeadingAnchor(heading: string): string {
  return heading
    .trim()
    .toLowerCase()
    .replaceAll(/[`*[\]()]/g, '')
    .replaceAll(/[^\w\s-]/g, '')
    .replaceAll(/\s+/g, '-')
    .replaceAll(/-+/g, '-')
    .replaceAll(/^-|-$/g, '');
}
