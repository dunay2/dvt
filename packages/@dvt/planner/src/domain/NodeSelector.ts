/**
 * Design (SOLID + DDD + CQRS):
 *
 *  CQRS segregation:
 *   - COMMAND side → SelectNodesCommand (input VO)
 *   - QUERY side   → readonly string[] (sorted selected node IDs)
 *
 *  SRP: sole responsibility — resolve which nodes participate in a plan run
 *       given a selection descriptor (upstream/downstream traversal).
 */
import { PlannerError, PlannerErrorCode } from './errors.js';
import { binaryCompare } from './sorting.js';
import type { GraphNode, PlannerSelection } from './types.js';

// ── COMMAND ────────────────────────────────────────────────────────────────────

export class SelectNodesCommand {
  constructor(
    readonly nodesById: ReadonlyMap<string, GraphNode>,
    readonly dependentsById: ReadonlyMap<string, readonly string[]>,
    readonly selection: PlannerSelection
  ) {}
}

// ── NodeSelector (Domain Service / Command Handler) ───────────────────────────

export class NodeSelector {
  /**
   * - includeUpstream (default true): include transitive dependencies.
   * - includeDownstream (default false): include transitive dependents.
   */
  execute(command: SelectNodesCommand): readonly string[] {
    const { nodesById, dependentsById, selection } = command;
    const out = new Set<string>(selection.selectedNodeIds);
    this.assertSeedsExist(nodesById, selection.selectedNodeIds);

    if (selection.includeUpstream ?? true)
      this.expandReachable((id) => nodesById.get(id)?.dependsOn ?? [], out);
    if (selection.includeDownstream ?? false)
      this.expandReachable((id) => dependentsById.get(id) ?? [], out);

    return [...out].sort(binaryCompare);
  }

  private assertSeedsExist(
    nodesById: ReadonlyMap<string, GraphNode>,
    ids: readonly string[]
  ): void {
    for (const id of ids) {
      if (!nodesById.has(id)) {
        throw new PlannerError(
          PlannerErrorCode.INVALID_INPUT,
          `Selected node does not exist: ${id}`
        );
      }
    }
  }

  private expandReachable(
    getNeighbors: (id: string) => readonly string[],
    out: Set<string>
  ): void {
    const stack = [...out];
    let id: string | undefined;
    while ((id = stack.pop()) !== undefined) {
      getNeighbors(id)
        .filter((n) => !out.has(n))
        .forEach((n) => {
          out.add(n);
          stack.push(n);
        });
    }
  }
}
