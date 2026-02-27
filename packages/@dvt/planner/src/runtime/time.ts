/**
 * Monotonic-ish time for duration measurement.
 * - Uses performance.now() when available (Node 22 has it).
 * - Falls back to Date.now() if needed.
 */
export function nowMs(): number {
  const p = globalThis.performance;
  if (p && typeof p.now === 'function') return p.now();
  return Date.now();
}
