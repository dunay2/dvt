/**
 * Owned concern: shared markdown-guide assertions for semantic module
 * component documentation tests in `apps/api`.
 */
export const REQUIRED_COMPONENT_GUIDE_SECTIONS = [
  '## Owned concern',
  '## Public API',
  '## Invariants',
  '## Transitions',
  '## Consumers',
] as const;

export function collectMissingTextSnippets(
  text: string,
  snippets: readonly string[]
): string[] {
  return snippets.filter((snippet) => !text.includes(snippet));
}

export function buildDocumentedApiSnippets(
  fileName: string,
  exportedIdentifiers: readonly string[]
): string[] {
  return [fileName, ...exportedIdentifiers];
}

export function hasMermaidDiagram(text: string): boolean {
  return text.includes('```mermaid');
}
