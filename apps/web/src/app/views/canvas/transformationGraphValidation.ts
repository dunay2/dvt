import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { buildPreviewGraphSignature } from './previewGraphSource';

export type TransformationNodeRole = 'source' | 'sql_transform' | 'sink';
export type TransformationGraphValidationSummaryCode =
  | 'valid'
  | 'requires_three_nodes'
  | 'unsupported_roles'
  | 'requires_one_of_each_role'
  | 'requires_two_edges'
  | 'invalid_edge_order';

export type TransformationGraphValidationResult = {
  valid: boolean;
  summaryCode: TransformationGraphValidationSummaryCode;
  draftSignature: string;
  scopedNodeIds: string[];
  scopedEdgeIds: string[];
  nodeRolesById: Record<string, TransformationNodeRole>;
};

type ValidateTransformationGraphArgs = {
  nodes: CanonicalNode[];
  edges: CanonicalEdge[];
  selectedNodeIds?: string[];
  workspaceNodeIds?: string[];
};

type ScopedTransformationGraph = {
  scopedNodes: CanonicalNode[];
  scopedNodeIds: string[];
  scopedEdges: CanonicalEdge[];
  scopedEdgeIds: string[];
};

type TransformationValidationContext = ScopedTransformationGraph & {
  allNodes: CanonicalNode[];
  allEdges: CanonicalEdge[];
};

function buildDraftSignature(
  allNodes: readonly CanonicalNode[],
  allEdges: readonly CanonicalEdge[],
  scopedNodeIds: readonly string[]
): string {
  return buildPreviewGraphSignature(allNodes, allEdges, scopedNodeIds);
}

function buildInvalidResult(
  summaryCode: Exclude<TransformationGraphValidationSummaryCode, 'valid'>,
  allNodes: readonly CanonicalNode[],
  allEdges: readonly CanonicalEdge[],
  scopedNodeIds: string[],
  scopedEdgeIds: string[] = []
): TransformationGraphValidationResult {
  const signature = buildDraftSignature(allNodes, allEdges, scopedNodeIds);
  return {
    valid: false,
    summaryCode,
    draftSignature: signature,
    scopedNodeIds,
    scopedEdgeIds,
    nodeRolesById: {},
  };
}

function buildValidResult(
  context: TransformationValidationContext,
  nodeRolesById: Record<string, TransformationNodeRole>
): TransformationGraphValidationResult {
  const draftSignature = buildDraftSignature(
    context.allNodes,
    context.allEdges,
    context.scopedNodeIds
  );

  const result: TransformationGraphValidationResult = {
    valid: true,
    summaryCode: 'valid',
    draftSignature,
    scopedNodeIds: context.scopedNodeIds,
    scopedEdgeIds: context.scopedEdgeIds,
    nodeRolesById,
  };

  return result;
}

function buildContextInvalidResult(
  context: TransformationValidationContext,
  summaryCode: Exclude<TransformationGraphValidationSummaryCode, 'valid'>
): TransformationGraphValidationResult {
  return buildInvalidResult(
    summaryCode,
    context.allNodes,
    context.allEdges,
    context.scopedNodeIds,
    context.scopedEdgeIds
  );
}

function mapCanonicalRole(node: CanonicalNode): TransformationNodeRole | null {
  switch (node.role) {
    case 'input':
      return 'source';
    case 'transform':
      return 'sql_transform';
    case 'output':
      return 'sink';
    default:
      return null;
  }
}

function resolveScopeNodeIds({
  nodes,
  selectedNodeIds,
  workspaceNodeIds,
}: ValidateTransformationGraphArgs): string[] {
  if (selectedNodeIds?.length) {
    return selectedNodeIds;
  }

  if (workspaceNodeIds?.length) {
    return workspaceNodeIds;
  }

  return nodes.map((node) => node.id);
}

function scopeTransformationGraph(
  nodes: CanonicalNode[],
  edges: CanonicalEdge[],
  scopeNodeIds: readonly string[]
): ScopedTransformationGraph {
  const scopedNodeIdSet = new Set(scopeNodeIds);
  const scopedNodes = nodes.filter((node) => scopedNodeIdSet.has(node.id));
  const scopedNodeIds = scopedNodes.map((node) => node.id);
  const resolvedScopedNodeIdSet = new Set(scopedNodeIds);
  const scopedEdges = edges.filter(
    (edge) =>
      resolvedScopedNodeIdSet.has(edge.sourceId) && resolvedScopedNodeIdSet.has(edge.targetId)
  );

  return {
    scopedNodes,
    scopedNodeIds,
    scopedEdges,
    scopedEdgeIds: scopedEdges.map((edge) => edge.id),
  };
}

function resolveTransformationValidationContext(
  args: ValidateTransformationGraphArgs
): TransformationValidationContext {
  const scopeNodeIds = resolveScopeNodeIds(args);

  return {
    allNodes: args.nodes,
    allEdges: args.edges,
    ...scopeTransformationGraph(args.nodes, args.edges, scopeNodeIds),
  };
}

function validateScopedNodeCount(
  context: TransformationValidationContext
): TransformationGraphValidationResult | null {
  if (context.scopedNodes.length === 3) {
    return null;
  }

  return buildContextInvalidResult(context, 'requires_three_nodes');
}

function resolveTransformationNodeRoles(
  scopedNodes: readonly CanonicalNode[]
): Record<string, TransformationNodeRole> | null {
  const nodeRolesById: Record<string, TransformationNodeRole> = {};

  for (const node of scopedNodes) {
    const mappedRole = mapCanonicalRole(node);
    if (!mappedRole) {
      return null;
    }
    nodeRolesById[node.id] = mappedRole;
  }

  return nodeRolesById;
}

function resolveValidatedNodeRoles(
  context: TransformationValidationContext
):
  | { ok: true; nodeRolesById: Record<string, TransformationNodeRole> }
  | { ok: false; result: TransformationGraphValidationResult } {
  const nodeRolesById = resolveTransformationNodeRoles(context.scopedNodes);
  if (!nodeRolesById) {
    return {
      ok: false,
      result: buildContextInvalidResult(context, 'unsupported_roles'),
    };
  }

  return { ok: true, nodeRolesById };
}

function countTransformationRoles(
  scopedNodes: readonly CanonicalNode[],
  nodeRolesById: Record<string, TransformationNodeRole>
): Record<TransformationNodeRole, number> {
  return scopedNodes.reduce(
    (acc, node) => {
      const mappedRole = nodeRolesById[node.id];
      if (!mappedRole) {
        return acc;
      }
      acc[mappedRole] += 1;
      return acc;
    },
    {
      source: 0,
      sql_transform: 0,
      sink: 0,
    } satisfies Record<TransformationNodeRole, number>
  );
}

function hasExactlyOneOfEachTransformationRole(
  roleCounts: Record<TransformationNodeRole, number>
): boolean {
  return roleCounts.source === 1 && roleCounts.sql_transform === 1 && roleCounts.sink === 1;
}

function validateRoleCardinality(
  context: TransformationValidationContext,
  nodeRolesById: Record<string, TransformationNodeRole>
): TransformationGraphValidationResult | null {
  const roleCounts = countTransformationRoles(context.scopedNodes, nodeRolesById);
  if (hasExactlyOneOfEachTransformationRole(roleCounts)) {
    return null;
  }

  return buildContextInvalidResult(context, 'requires_one_of_each_role');
}

function hasValidTransformationEdgeOrder(
  scopedEdges: readonly CanonicalEdge[],
  nodeRolesById: Record<string, TransformationNodeRole>
): boolean {
  const hasSourceToTransform = scopedEdges.some(
    (edge) =>
      nodeRolesById[edge.sourceId] === 'source' && nodeRolesById[edge.targetId] === 'sql_transform'
  );
  const hasTransformToSink = scopedEdges.some(
    (edge) =>
      nodeRolesById[edge.sourceId] === 'sql_transform' && nodeRolesById[edge.targetId] === 'sink'
  );

  return hasSourceToTransform && hasTransformToSink;
}

function validateEdgeCount(
  context: TransformationValidationContext
): TransformationGraphValidationResult | null {
  if (context.scopedEdges.length === 2) {
    return null;
  }

  return buildContextInvalidResult(context, 'requires_two_edges');
}

function validateEdgeOrder(
  context: TransformationValidationContext,
  nodeRolesById: Record<string, TransformationNodeRole>
): TransformationGraphValidationResult | null {
  if (hasValidTransformationEdgeOrder(context.scopedEdges, nodeRolesById)) {
    return null;
  }

  return buildContextInvalidResult(context, 'invalid_edge_order');
}

export function validateTransformationGraph({
  nodes,
  edges,
  selectedNodeIds = [],
  workspaceNodeIds = [],
}: ValidateTransformationGraphArgs): TransformationGraphValidationResult {
  const context = resolveTransformationValidationContext({
    nodes,
    edges,
    selectedNodeIds,
    workspaceNodeIds,
  });

  const nodeCountResult = validateScopedNodeCount(context);
  if (nodeCountResult) {
    return nodeCountResult;
  }

  const nodeRoles = resolveValidatedNodeRoles(context);
  if (!nodeRoles.ok) {
    return nodeRoles.result;
  }

  const roleCardinalityResult = validateRoleCardinality(context, nodeRoles.nodeRolesById);
  if (roleCardinalityResult) {
    return roleCardinalityResult;
  }

  const edgeCountResult = validateEdgeCount(context);
  if (edgeCountResult) {
    return edgeCountResult;
  }

  const edgeOrderResult = validateEdgeOrder(context, nodeRoles.nodeRolesById);
  if (edgeOrderResult) {
    return edgeOrderResult;
  }

  return buildValidResult(context, nodeRoles.nodeRolesById);
}
