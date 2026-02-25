'use strict';
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
Object.defineProperty(exports, '__esModule', { value: true });
exports.jcsCanonicalize = jcsCanonicalize;
function jcsCanonicalize(value) {
  return serialize(value);
}
function serialize(value) {
  if (value === null) {
    return 'null';
  }
  switch (typeof value) {
    case 'boolean':
      return value ? 'true' : 'false';
    case 'string':
      return JSON.stringify(value);
    case 'number':
      return serializeNumber(value);
    case 'bigint':
      // JSON does not support bigint; callers must convert.
      throw new Error('JCS: bigint is not supported by JSON');
    case 'undefined':
      throw new Error('JCS: undefined is not valid in JSON');
    case 'function':
      throw new Error('JCS: function is not valid in JSON');
    case 'symbol':
      throw new Error('JCS: symbol is not valid in JSON');
    case 'object':
      if (Array.isArray(value)) {
        return '[' + value.map((v) => serialize(v)).join(',') + ']';
      }
      return serializeObject(value);
    default:
      // Exhaustive, but keep for safety.
      throw new Error('JCS: unsupported type');
  }
}
function serializeNumber(n) {
  if (!Number.isFinite(n)) {
    throw new Error('JCS: non-finite numbers are not permitted');
  }
  if (Object.is(n, -0)) {
    return '0';
  }
  // ECMAScript number toString() produces a deterministic shortest representation for finite numbers.
  return n.toString();
}
function serializeObject(obj) {
  const keys = Object.keys(obj).sort();
  const parts = [];
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
//# sourceMappingURL=jcs.js.map
