/**
 * @baseline ADR-0003
 */
/**
 * RFC 8785 JSON Canonicalization Scheme (JCS) implementation.
 *
 * Notes:
 * - Rejects non-finite numbers (NaN/Infinity), functions, symbols, and undefined.
 * - Serializes numbers using ECMAScript numeric toString(), with -0 normalized to 0.
 * - Sorts object keys lexicographically by Unicode code units.
 */

export function jcsCanonicalize(value: unknown): string {
  return serialize(value);
}

function serialize(value: unknown): string {
  if (value === null) {
    return 'null';
  }

  const type = typeof value;

  if (type === 'boolean') {
    return (value as boolean) ? 'true' : 'false';
  }
  if (type === 'string') {
    return JSON.stringify(value);
  }
  if (type === 'number') {
    return serializeNumber(value as number);
  }
  if (type === 'bigint') {
    throw new Error('JCS: bigint is not supported by JSON');
  }
  if (type === 'undefined') {
    throw new Error('JCS: undefined is not valid in JSON');
  }
  if (type === 'function') {
    throw new Error('JCS: function is not valid in JSON');
  }
  if (type === 'symbol') {
    throw new Error('JCS: symbol is not valid in JSON');
  }
  if (type === 'object') {
    if (Array.isArray(value)) {
      return '[' + (value as unknown[]).map((v) => serialize(v)).join(',') + ']';
    }
    return serializeObject(value as Record<string, unknown>);
  }

  throw new Error('JCS: unsupported type');
}

function serializeNumber(n: number): string {
  if (!Number.isFinite(n)) {
    throw new TypeError('JCS: non-finite numbers are not permitted');
  }
  if (Object.is(n, -0)) {
    return '0';
  }
  // ECMAScript number toString() produces a deterministic shortest representation for finite numbers.
  return n.toString();
}

function serializeObject(obj: Record<string, unknown>): string {
  const keys = Object.keys(obj).sort((a, b) => a.localeCompare(b));
  const parts: string[] = [];

  for (const k of keys) {
    const v = obj[k];
    if (v === undefined) {
      // In JSON, undefined properties are omitted.
      continue;
    }
    parts.push(JSON.stringify(k) + ':' + serialize(v));
  }

  return '{' + parts.join(',') + '}';
}
