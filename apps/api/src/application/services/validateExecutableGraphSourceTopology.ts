/** Owned concern: compare client graph dependencies with the protected selected topology. */
import type {
  ExecutableSubgraph,
  GenericGraphSourceV1,
  WorkspaceGraphAuthoringDraft,
} from '@dvt/contracts';

export type ExecutableGraphSourceTopologyMismatch = Readonly<{
  cause: 'graph_source_selection_mismatch' | 'graph_source_dependency_mismatch';
  reason: string;
}>;

export function findExecutableGraphSourceTopologyMismatch(
  graphSource: GenericGraphSourceV1,
  executableSubgraph: ExecutableSubgraph,
  draft: WorkspaceGraphAuthoringDraft
): ExecutableGraphSourceTopologyMismatch | null {
  const sourceNodeIds = graphSource.nodes
    .map((node) => node.nodeId)
    .slice()
    .sort(compareStrings);
  const selectedNodeIds = [...executableSubgraph.nodeIds].sort(compareStrings);
  if (!sameStringArray(sourceNodeIds, selectedNodeIds)) {
    return {
      cause: 'graph_source_selection_mismatch',
      reason:
        'graphSource nodes must match the planner-derived executable subgraph for the selection.',
    };
  }

  const expectedDependencies = buildExpectedDependencies(executableSubgraph, draft);
  for (const node of graphSource.nodes) {
    const expected = expectedDependencies.get(node.nodeId) ?? [];
    const actual = [...new Set(node.dependsOn)].sort(compareStrings);
    if (!sameStringArray(actual, expected)) {
      return {
        cause: 'graph_source_dependency_mismatch',
        reason: `graphSource dependencies for ${node.nodeId} must match the planner-derived executable topology.`,
      };
    }
  }

  return null;
}

function buildExpectedDependencies(
  executableSubgraph: ExecutableSubgraph,
  draft: WorkspaceGraphAuthoringDraft
): ReadonlyMap<string, readonly string[]> {
  const selectedNodeIds = new Set(executableSubgraph.nodeIds);
  const selectedEdgeIds = new Set(executableSubgraph.edgeIds);
  const dependencies = new Map<string, Set<string>>(
    executableSubgraph.nodeIds.map((nodeId) => [nodeId, new Set<string>()])
  );

  for (const edge of draft.edges) {
    if (
      selectedEdgeIds.has(edge.id) &&
      selectedNodeIds.has(edge.sourceId) &&
      selectedNodeIds.has(edge.targetId)
    ) {
      dependencies.get(edge.targetId)?.add(edge.sourceId);
    }
  }

  return new Map(
    [...dependencies.entries()].map(([nodeId, nodeDependencies]) => [
      nodeId,
      [...nodeDependencies].sort(compareStrings),
    ])
  );
}

function sameStringArray(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function compareStrings(left: string, right: string): number {
  return left.localeCompare(right);
}
