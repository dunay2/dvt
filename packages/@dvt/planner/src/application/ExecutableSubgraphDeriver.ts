/**
 * Owned concern: derive the selected executable closure from editable
 * workspace-graph authoring truth and canonical execution-selection intent.
 */
import {
  EXECUTABLE_SUBGRAPH_DIAGNOSTIC_CODE,
  EXECUTION_SELECTION_MODE,
  parseExecutableSubgraph,
  type ExecutableSubgraph,
  type ExecutableSubgraphDiagnostic,
  type ExecutionSelection,
  type WorkspaceGraphAuthoringDraft,
} from '@dvt/contracts';

import { PlannerError, PlannerErrorCode } from '../domain/errors.js';
import { BuildGraphCommand, GraphBuilder, type BuiltGraph } from '../domain/graph/GraphBuilder.js';
import { topoSort } from '../domain/graph/TopoSort.js';
import { resolveLimits, type PlannerLimits } from '../domain/limits.js';
import { binaryCompare } from '../domain/sorting.js';
import type { GraphNode } from '../domain/types.js';

export interface DeriveExecutableSubgraphInput {
  draft: WorkspaceGraphAuthoringDraft;
  selection: ExecutionSelection;
}

export interface ExecutableSubgraphDeriverOptions {
  limits?: Partial<PlannerLimits>;
}

type VisibleGraphProjection = {
  graph: BuiltGraph;
  visibleNodeIds: readonly string[];
  externalDependenciesByTargetId: ReadonlyMap<string, ReadonlyArray<MissingDependencyRef>>;
};

type VisibleEdge = {
  id: string;
  sourceId: string;
  targetId: string;
};

type MissingDependencyRef = {
  edgeId: string;
  nodeId: string;
};

export class ExecutableSubgraphDeriver {
  private readonly limits: PlannerLimits;
  private readonly graphBuilder = new GraphBuilder();

  constructor(options?: ExecutableSubgraphDeriverOptions) {
    this.limits = resolveLimits(options?.limits);
  }

  derive(input: DeriveExecutableSubgraphInput): ExecutableSubgraph {
    const projection = this.projectVisibleGraph(input.draft);
    const visibleNodeIdSet = new Set(projection.visibleNodeIds);
    const missingSelectedNodeIds = this.collectMissingSelectedNodeIds(
      input.selection.nodeIds,
      visibleNodeIdSet
    );
    const presentSelectedNodeIds = input.selection.nodeIds
      .filter((nodeId) => visibleNodeIdSet.has(nodeId))
      .sort(binaryCompare);
    const diagnostics: ExecutableSubgraphDiagnostic[] = [];

    if (missingSelectedNodeIds.length > 0) {
      diagnostics.push({
        code: EXECUTABLE_SUBGRAPH_DIAGNOSTIC_CODE.selectedNodeMissing,
        message: 'Selected node ids are not visible in the authoring draft.',
        nodeIds: missingSelectedNodeIds,
      });
    }

    const selectedNodeIds = this.resolveSelectedNodeIds(
      projection.graph,
      presentSelectedNodeIds,
      input.selection
    );
    const selectedEdgeIds = this.collectSelectedEdgeIds(
      input.draft.edges,
      new Set(selectedNodeIds),
      visibleNodeIdSet
    );

    const dependencyGap = this.collectDependencyGapDiagnostics(
      projection,
      selectedNodeIds,
      input.draft.edges
    );
    if (dependencyGap !== null) {
      diagnostics.push(dependencyGap);
    }

    const cycleDiagnostic = this.detectCycleDiagnostic(projection.graph, selectedNodeIds);
    if (cycleDiagnostic !== null) {
      diagnostics.push(cycleDiagnostic);
    }

    return parseExecutableSubgraph({
      selection: input.selection,
      nodeIds: selectedNodeIds,
      edgeIds: selectedEdgeIds,
      executable: diagnostics.length === 0 && selectedNodeIds.length > 0,
      diagnostics,
    });
  }

  private projectVisibleGraph(draft: WorkspaceGraphAuthoringDraft): VisibleGraphProjection {
    const visibleNodeIds = [...draft.nodeIds].sort(binaryCompare);
    const visibleNodeIdSet = new Set(visibleNodeIds);
    const visibleNodeMap = new Map(
      draft.nodes
        .filter((node) => visibleNodeIdSet.has(node.id))
        .map((node) => [node.id, node] as const)
    );
    const dependsOnByNodeId = new Map<string, string[]>();
    const externalDependenciesByTargetId = new Map<string, MissingDependencyRef[]>();

    for (const nodeId of visibleNodeIds) {
      dependsOnByNodeId.set(nodeId, []);
      externalDependenciesByTargetId.set(nodeId, []);
      if (!visibleNodeMap.has(nodeId)) {
        throw new PlannerError(
          PlannerErrorCode.INTERNAL_ERROR,
          `Visible authoring node is missing semantic record: ${nodeId}`
        );
      }
    }

    for (const edge of draft.edges) {
      const sourceVisible = visibleNodeIdSet.has(edge.sourceId);
      const targetVisible = visibleNodeIdSet.has(edge.targetId);

      if (sourceVisible && targetVisible) {
        dependsOnByNodeId.get(edge.targetId)?.push(edge.sourceId);
        continue;
      }

      if (!sourceVisible && targetVisible) {
        externalDependenciesByTargetId.get(edge.targetId)?.push({
          edgeId: edge.id,
          nodeId: edge.sourceId,
        });
      }
    }

    const graphNodes: GraphNode[] = visibleNodeIds.map((nodeId) => {
      const node = visibleNodeMap.get(nodeId);
      if (node === undefined) {
        throw new PlannerError(
          PlannerErrorCode.INTERNAL_ERROR,
          `Visible authoring node is missing semantic record: ${nodeId}`
        );
      }

      return {
        nodeId,
        stepKind: node.kind,
        dependsOn: [...(dependsOnByNodeId.get(nodeId) ?? [])].sort(binaryCompare),
        metadata: {
          displayName: node.name,
          ...(node.path == null ? {} : { sourceRef: node.path }),
          tags: {
            pluginId: node.pluginId,
            role: node.role,
            kind: node.kind,
          },
        },
      };
    });

    return {
      graph: this.graphBuilder.execute(new BuildGraphCommand(graphNodes, this.limits)),
      visibleNodeIds,
      externalDependenciesByTargetId,
    };
  }

  private collectMissingSelectedNodeIds(
    selectedNodeIds: readonly string[],
    visibleNodeIdSet: ReadonlySet<string>
  ): string[] {
    return selectedNodeIds.filter((nodeId) => !visibleNodeIdSet.has(nodeId)).sort(binaryCompare);
  }

  private resolveSelectedNodeIds(
    graph: BuiltGraph,
    presentSelectedNodeIds: readonly string[],
    selection: ExecutionSelection
  ): string[] {
    if (presentSelectedNodeIds.length === 0) {
      return [];
    }

    switch (selection.mode) {
      case EXECUTION_SELECTION_MODE.explicit:
        return [...presentSelectedNodeIds].sort(binaryCompare);
      case EXECUTION_SELECTION_MODE.upstream:
        return this.expandReachable(
          presentSelectedNodeIds,
          (nodeId) => graph.nodesById.get(nodeId)?.dependsOn ?? []
        );
      case EXECUTION_SELECTION_MODE.downstream:
        return this.expandReachable(
          presentSelectedNodeIds,
          (nodeId) => graph.dependentsById.get(nodeId) ?? []
        );
      case EXECUTION_SELECTION_MODE.connectedComponent:
        return this.expandReachable(presentSelectedNodeIds, (nodeId) =>
          [
            ...(graph.nodesById.get(nodeId)?.dependsOn ?? []),
            ...(graph.dependentsById.get(nodeId) ?? []),
          ].sort(binaryCompare)
        );
      default:
        return [];
    }
  }

  private expandReachable(
    seedNodeIds: readonly string[],
    getNeighbors: (nodeId: string) => readonly string[]
  ): string[] {
    const resolved = new Set(seedNodeIds);
    const stack = [...seedNodeIds];

    while (stack.length > 0) {
      const nodeId = stack.pop();
      if (nodeId === undefined) {
        continue;
      }

      for (const neighborId of getNeighbors(nodeId)) {
        if (resolved.has(neighborId)) {
          continue;
        }
        resolved.add(neighborId);
        stack.push(neighborId);
      }
    }

    return [...resolved].sort(binaryCompare);
  }

  private collectSelectedEdgeIds(
    edges: ReadonlyArray<WorkspaceGraphAuthoringDraft['edges'][number]>,
    selectedNodeIdSet: ReadonlySet<string>,
    visibleNodeIdSet: ReadonlySet<string>
  ): string[] {
    return edges
      .filter(
        (edge) =>
          visibleNodeIdSet.has(edge.sourceId) &&
          visibleNodeIdSet.has(edge.targetId) &&
          selectedNodeIdSet.has(edge.sourceId) &&
          selectedNodeIdSet.has(edge.targetId)
      )
      .map((edge) => edge.id)
      .sort(binaryCompare);
  }

  private collectDependencyGapDiagnostics(
    projection: VisibleGraphProjection,
    selectedNodeIds: readonly string[],
    edges: readonly VisibleEdge[]
  ): ExecutableSubgraphDiagnostic | null {
    if (selectedNodeIds.length === 0) {
      return null;
    }

    const selectedNodeIdSet = new Set(selectedNodeIds);
    const missingNodeIds = new Set<string>();
    const missingEdgeIds = new Set<string>();

    for (const nodeId of selectedNodeIds) {
      const graphNode = projection.graph.nodesById.get(nodeId);
      if (graphNode !== undefined) {
        for (const dependencyId of graphNode.dependsOn) {
          if (selectedNodeIdSet.has(dependencyId)) {
            continue;
          }

          missingNodeIds.add(dependencyId);
          for (const edge of edges) {
            if (edge.sourceId === dependencyId && edge.targetId === nodeId) {
              missingEdgeIds.add(edge.id);
            }
          }
        }
      }

      for (const dependency of projection.externalDependenciesByTargetId.get(nodeId) ?? []) {
        missingNodeIds.add(dependency.nodeId);
        missingEdgeIds.add(dependency.edgeId);
      }
    }

    if (missingNodeIds.size === 0) {
      return null;
    }

    return {
      code: EXECUTABLE_SUBGRAPH_DIAGNOSTIC_CODE.dependencyGap,
      message: 'Selected closure is missing required upstream dependencies.',
      nodeIds: [...missingNodeIds].sort(binaryCompare),
      edgeIds: [...missingEdgeIds].sort(binaryCompare),
    };
  }

  private detectCycleDiagnostic(
    graph: BuiltGraph,
    selectedNodeIds: readonly string[]
  ): ExecutableSubgraphDiagnostic | null {
    if (selectedNodeIds.length === 0) {
      return null;
    }

    try {
      topoSort(graph, selectedNodeIds);
      return null;
    } catch (error) {
      if (error instanceof PlannerError && error.code === PlannerErrorCode.GRAPH_CYCLE) {
        return {
          code: EXECUTABLE_SUBGRAPH_DIAGNOSTIC_CODE.cycleDetected,
          message: error.message,
          nodeIds: [...selectedNodeIds].sort(binaryCompare),
        };
      }

      throw error;
    }
  }
}
