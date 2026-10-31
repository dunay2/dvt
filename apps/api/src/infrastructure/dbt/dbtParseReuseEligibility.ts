/** Owned concern: admit parse reuse only for the bounded static source subset. */
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { readDbtLiteralReference } from './dbtLiteralReference.js';
import type { ProjectContentRevision } from './dbtProjectContentRevision.js';

const TEMPLATE_MARKER = /\{\{|\}\}|\{%|%\}|\{#|#\}/u;
const EXPRESSION_PATTERN = /\{\{([\s\S]*?)\}\}/gu;

export async function isDbtParseReuseEligible(
  input: Readonly<{
    snapshotDirectory: string;
    contentRevision: ProjectContentRevision;
    profileContents: readonly string[];
  }>
): Promise<boolean> {
  if (
    input.profileContents.some((content) => content.includes('\\') || TEMPLATE_MARKER.test(content))
  ) {
    return false;
  }

  for (const entry of input.contentRevision.entries) {
    const extension = path.posix.extname(entry.path).toLowerCase();
    if (extension === '.py') return false;
    const content = await readFile(
      path.join(input.snapshotDirectory, ...entry.path.split('/')),
      'utf8'
    );
    if ((extension === '.yml' || extension === '.yaml') && content.includes('\\')) return false;
    if (extension === '.sql' ? !hasOnlyLiteralReferences(content) : TEMPLATE_MARKER.test(content)) {
      return false;
    }
  }
  return true;
}

function hasOnlyLiteralReferences(content: string): boolean {
  let previousEnd = 0;
  for (const match of content.matchAll(EXPRESSION_PATTERN)) {
    if (
      TEMPLATE_MARKER.test(content.slice(previousEnd, match.index)) ||
      readDbtLiteralReference(match[1] ?? '') === null
    ) {
      return false;
    }
    previousEnd = match.index + match[0].length;
  }
  return !TEMPLATE_MARKER.test(content.slice(previousEnd));
}
