export function formatStructuredArtifactContent(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }

  if (content === undefined) {
    return '';
  }

  return JSON.stringify(content, null, 2) ?? '';
}
