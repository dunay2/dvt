/**
 * Owned concern: order technical graph identities independently of locale.
 * @baseline PreviewPlan and workload V1 bind exact selected graph identities.
 * @decision Compare UTF-16 code units without normalizing or equating distinct IDs.
 * @consequence Selection order is canonical; semantic operand order remains untouched.
 * @version 1.0.0
 */
export function compareGraphIds(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
