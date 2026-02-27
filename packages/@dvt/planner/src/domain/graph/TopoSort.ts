/**
 * Deterministic topo sort over a selected set.
 * ADR baseline: ADR-0002-plan-core-hash (ordering determinism)
 *
 * Kahn's algorithm with deterministic ready queue and linear merge.
 */
import { PlannerError, PlannerErrorCode } from '../errors.js';
import { binaryCompare } from '../sorting.js';

import type { BuiltGraph } from './GraphBuilder.js';

/**
 * Topologically sorts selected nodes.
 * - Includes only nodes in `selected` array
 * - Deterministic queue ordering
 * - Throws GRAPH_CYCLE on cycle within selected subgraph
 */
export function topoSort(graph: BuiltGraph, selected: readonly string[]): readonly string[] {
  const selectedSet = new Set(selected);
  const indeg = new Map<string, number>();

  for (const id of selected) indeg.set(id, 0);

  for (const id of selected) {
    const node = graph.nodesById.get(id);
    if (!node) continue;
    for (const dep of node.dependsOn) {
      if (!selectedSet.has(dep)) continue;
      indeg.set(id, (indeg.get(id) ?? 0) + 1);
    }
  }

  const ready: string[] = [];
  for (const [id, d] of indeg.entries()) {
    if (d === 0) ready.push(id);
  }
  ready.sort(binaryCompare);

  const out: string[] = [];
  while (ready.length > 0) {
    const id = ready.shift();
    if (id === undefined) break;
    out.push(id);

    const dependents = graph.dependentsById.get(id) ?? [];
    const newlyReady: string[] = [];
    for (const child of dependents) {
      if (!selectedSet.has(child)) continue;
      const v = indeg.get(child);
      if (v === undefined) continue;
      const next = v - 1;
      indeg.set(child, next);
      if (next === 0) {
        newlyReady.push(child);
      }
    }

    if (newlyReady.length > 0) {
      newlyReady.sort(binaryCompare);
      mergeSortedInto(ready, newlyReady);
    }
  }

  if (out.length !== selected.length) {
    throw new PlannerError(PlannerErrorCode.GRAPH_CYCLE, 'Cycle detected in selected subgraph.');
  }
  return out;
}

function mergeSortedInto(target: string[], incoming: string[]): void {
  if (incoming.length === 0) return;
  if (target.length === 0) {
    target.push(...incoming);
    return;
  }

  const merged: string[] = [];
  let i = 0;
  let j = 0;
  while (i < target.length && j < incoming.length) {
    if (binaryCompare(target[i]!, incoming[j]!) <= 0) {
      merged.push(target[i++]!);
    } else {
      merged.push(incoming[j++]!);
    }
  }
  while (i < target.length) merged.push(target[i++]!);
  while (j < incoming.length) merged.push(incoming[j++]!);

  target.length = 0;
  target.push(...merged);
}
