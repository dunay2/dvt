/**
 * Owned concern: project plugin metadata into deterministic JSON-compatible
 * authoring DTOs before Canvas persistence, signatures, or duplicate commands.
 */

export type CanvasAuthoringMetadataValue =
  | string
  | number
  | boolean
  | null
  | CanvasAuthoringMetadataValue[]
  | { [key: string]: CanvasAuthoringMetadataValue };

export type CanvasAuthoringMetadata = Record<string, CanvasAuthoringMetadataValue>;

function toCanvasAuthoringMetadataValue(
  value: unknown,
  seenObjects: WeakSet<object>
): CanvasAuthoringMetadataValue | undefined {
  if (value == null) {
    return null;
  }

  if (typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  if (
    typeof value === 'bigint' ||
    typeof value === 'function' ||
    typeof value === 'symbol' ||
    typeof value === 'undefined'
  ) {
    return undefined;
  }

  if (Array.isArray(value)) {
    if (seenObjects.has(value)) {
      return undefined;
    }

    seenObjects.add(value);
    const normalized = value
      .map((entry) => toCanvasAuthoringMetadataValue(entry, seenObjects))
      .filter((entry): entry is CanvasAuthoringMetadataValue => entry !== undefined);
    seenObjects.delete(value);
    return normalized;
  }

  if (seenObjects.has(value)) {
    return undefined;
  }

  seenObjects.add(value);
  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, entry]) => [key, toCanvasAuthoringMetadataValue(entry, seenObjects)] as const)
    .filter(
      (entry): entry is readonly [string, CanvasAuthoringMetadataValue] =>
        entry[1] !== undefined
    );
  seenObjects.delete(value);

  return Object.fromEntries(entries);
}

export function toCanvasAuthoringMetadata(
  metadata: Record<string, unknown> | undefined
): CanvasAuthoringMetadata | undefined {
  if (metadata == null) {
    return undefined;
  }

  const normalized = toCanvasAuthoringMetadataValue(metadata, new WeakSet<object>());
  if (normalized == null || Array.isArray(normalized) || typeof normalized !== 'object') {
    return undefined;
  }

  const entries = Object.entries(normalized);
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

export function toCanvasAuthoringSerializableValue(
  value: unknown
): CanvasAuthoringMetadataValue | undefined {
  return toCanvasAuthoringMetadataValue(value, new WeakSet<object>());
}
