/** Normalize dbt identifiers while preserving the caller's fallback verbatim. */
export function normalizeDbtIdentifier(value: string | undefined, fallback: string): string {
  const raw = value?.trim() ?? '';
  const normalized = raw
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();

  return normalized.length > 0 ? normalized : fallback;
}
