/**
 * Deterministic binary string compare.
 * Never use localeCompare for determinism guarantees.
 */
export function binaryCompare(a: string, b: string): number {
  // eslint is not in deps; keep minimal and explicit.
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}
