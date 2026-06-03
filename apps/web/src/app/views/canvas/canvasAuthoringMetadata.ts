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

type PrimitiveMetadataResult =
  | { readonly supported: true; readonly value: string | number | boolean }
  | { readonly supported: false };

const UNSUPPORTED_METADATA_TYPES = new Set(['bigint', 'function', 'symbol', 'undefined']);

function toCanvasAuthoringMetadataValue(
  value: unknown,
  seenObjects: WeakSet<object>
): CanvasAuthoringMetadataValue | undefined {
  if (value == null) {
    return null;
  }

  const primitive = toPrimitiveMetadataValue(value);
  if (primitive.supported) {
    return primitive.value;
  }

  if (isUnsupportedMetadataValue(value)) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return toCanvasAuthoringArray(value, seenObjects);
  }

  return toCanvasAuthoringObject(value as Record<string, unknown>, seenObjects);
}

function toPrimitiveMetadataValue(value: unknown): PrimitiveMetadataResult {
  if (typeof value === 'string' || typeof value === 'boolean') {
    return { supported: true, value };
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return { supported: true, value };
  }
  return { supported: false };
}

function isUnsupportedMetadataValue(value: unknown): boolean {
  return UNSUPPORTED_METADATA_TYPES.has(typeof value);
}

function toCanvasAuthoringArray(
  value: readonly unknown[],
  seenObjects: WeakSet<object>
): CanvasAuthoringMetadataValue[] | undefined {
  return withSeenObject(value, seenObjects, () =>
    value
      .map((entry) => toCanvasAuthoringMetadataValue(entry, seenObjects))
      .filter((entry): entry is CanvasAuthoringMetadataValue => entry !== undefined)
  );
}

function toCanvasAuthoringObject(
  value: Record<string, unknown>,
  seenObjects: WeakSet<object>
): { [key: string]: CanvasAuthoringMetadataValue } | undefined {
  return withSeenObject(value, seenObjects, () => {
    const entries = Object.entries(value)
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
      .map(([key, entry]) => [key, toCanvasAuthoringMetadataValue(entry, seenObjects)] as const)
      .filter(isDefinedAuthoringEntry);

    return Object.fromEntries(entries);
  });
}

function isDefinedAuthoringEntry(
  entry: readonly [string, CanvasAuthoringMetadataValue | undefined]
): entry is readonly [string, CanvasAuthoringMetadataValue] {
  return entry[1] !== undefined;
}

function withSeenObject<T>(
  value: object,
  seenObjects: WeakSet<object>,
  normalize: () => T
): T | undefined {
  if (seenObjects.has(value)) {
    return undefined;
  }
  seenObjects.add(value);
  try {
    return normalize();
  } finally {
    seenObjects.delete(value);
  }
}

function isCanvasAuthoringMetadataObject(
  value: CanvasAuthoringMetadataValue | undefined
): value is { [key: string]: CanvasAuthoringMetadataValue } {
  return value !== undefined && value !== null && !Array.isArray(value) && typeof value === 'object';
}

export function toCanvasAuthoringMetadata(
  metadata: Record<string, unknown> | undefined
): CanvasAuthoringMetadata | undefined {
  if (metadata == null) {
    return undefined;
  }

  const normalized = toCanvasAuthoringMetadataValue(metadata, new WeakSet<object>());
  if (!isCanvasAuthoringMetadataObject(normalized)) {
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
