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
export declare function jcsCanonicalize(value: unknown): string;
//# sourceMappingURL=jcs.d.ts.map
