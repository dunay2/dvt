/**
 * Owned concern: decode native manifest JSON collections, strings and file separators.
 * @decision Share only the native manifest wire representation readers.
 * @consequence Unknown JSON values retain the existing empty or undefined decoding behavior.
 */
export function record(value: unknown): Record<string, unknown> {
  return isRecord(value) ? (value as Record<string, unknown>) : {};
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function collectionValues(value: unknown): readonly unknown[] {
  return Object.values(record(value));
}

export function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

export function stringArray(value: unknown): readonly string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}

export function normalizeManifestPath(value: string): string {
  return value.replaceAll('\\', '/');
}
