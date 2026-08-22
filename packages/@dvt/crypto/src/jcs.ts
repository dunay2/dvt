import { canonicalize } from 'json-canonicalize';

export function jcsCanonicalize(value: unknown): string {
  assertJsonValue(value, new WeakSet<object>(), false);
  return canonicalize(value);
}

function assertJsonValue(
  value: unknown,
  ancestors: WeakSet<object>,
  objectProperty: boolean
): void {
  if (value === undefined && objectProperty) {
    return;
  }
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  ) {
    return;
  }
  if (typeof value !== 'object') {
    throw new TypeError('JCS_VALUE_OUTSIDE_JSON_DATA_MODEL');
  }
  if (ancestors.has(value)) {
    throw new TypeError('JCS_CIRCULAR_REFERENCE');
  }

  ancestors.add(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      assertJsonValue(item, ancestors, false);
    }
  } else {
    for (const item of Object.values(value as Record<string, unknown>)) {
      assertJsonValue(item, ancestors, true);
    }
  }
  ancestors.delete(value);
}
