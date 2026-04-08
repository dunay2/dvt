/**
 * @baseline ADR-0005
 * @baseline ADR-0006
 */
/**
 * Minimal RFC 8785-style canonical JSON serializer for contract validation.
 *
 * This stays local to `@dvt/contracts` so validation helpers can compare
 * semantic equality without relying on runtime-specific object key order.
 */
export function jcsCanonicalize(value: unknown): string {
  return serialize(value);
}

function serialize(value: unknown): string {
  if (value === null) return 'null';

  const type = typeof value;
  if (type === 'boolean') return value ? 'true' : 'false';
  if (type === 'string') return JSON.stringify(value);
  if (type === 'number') return serializeNumber(value as number);
  if (type === 'bigint') throw new Error('JCS: bigint is not supported by JSON');
  if (type === 'undefined') throw new Error('JCS: undefined is not valid in JSON');
  if (type === 'function') throw new Error('JCS: function is not valid in JSON');
  if (type === 'symbol') throw new Error('JCS: symbol is not valid in JSON');

  if (Array.isArray(value)) {
    return '[' + value.map((item) => serialize(item)).join(',') + ']';
  }

  if (type === 'object') {
    return serializeObject(value as Record<string, unknown>);
  }

  throw new Error('JCS: unsupported type');
}

function serializeNumber(value: number): string {
  if (!Number.isFinite(value)) {
    throw new TypeError('JCS: non-finite numbers are not permitted');
  }
  if (Object.is(value, -0)) return '0';
  return value.toString();
}

function serializeObject(obj: Record<string, unknown>): string {
  const keys = Object.keys(obj).sort((left, right) => left.localeCompare(right));
  const parts: string[] = [];

  for (const key of keys) {
    const nested = obj[key];
    if (nested === undefined) continue;
    parts.push(JSON.stringify(key) + ':' + serialize(nested));
  }

  return '{' + parts.join(',') + '}';
}
