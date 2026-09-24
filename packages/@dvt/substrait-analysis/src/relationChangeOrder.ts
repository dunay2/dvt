/** Topological order for the affected region only; unaffected inputs are already settled. */
import { SubstraitAnalysisError } from './document.js';
import type { IndexedRelation } from './relationIndex.js';

export function relationChangeOrder(
  affected: ReadonlySet<string>,
  removed: ReadonlySet<string>,
  get: (id: string) => IndexedRelation
): string[] {
  const order: string[] = [];
  const done = new Set<string>();
  const visiting = new Set<string>();
  for (const start of affected) {
    if (removed.has(start) || done.has(start)) continue;
    const stack: { id: string; exit: boolean }[] = [{ id: start, exit: false }];
    while (stack.length > 0) {
      const { id, exit } = stack.pop()!;
      if (done.has(id)) continue;
      if (exit) {
        visiting.delete(id);
        done.add(id);
        order.push(id);
        continue;
      }
      if (visiting.has(id)) throw new SubstraitAnalysisError('invalid_binding', 'Relation cycle.');
      visiting.add(id);
      stack.push({ id, exit: true });
      for (const input of get(id).inputs) {
        if (affected.has(input)) stack.push({ id: input, exit: false });
      }
    }
  }
  return order;
}
