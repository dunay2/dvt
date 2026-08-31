import {
  buildContextInvalidResult,
  buildValidResult,
} from './transformationGraphValidationResults';
import {
  resolveExecutableTransformationPath,
  resolveValidatedNodeRoles,
  validateEdgeCount,
  validateEdgeOrder,
  validateRoleCardinality,
} from './transformationGraphValidationRules';
import { resolveTransformationValidationContext } from './transformationGraphValidationScope';
import type {
  TransformationGraphValidationResult,
  TransformationGraphValidationSummaryCode,
  TransformationNodeRole,
  ValidateTransformationGraphArgs,
} from './transformationGraphValidation.types';
import { TRANSFORMATION_REQUIRED_NODE_COUNT } from './transformationGraphValidation.types';
import { resolveEffectiveDvtConnectionRef } from './canvasDvtAuthoringModel';
import { resolveDvtSubstraitInnerJoinEntry } from './canvasDvtSubstraitJoinComposition';
import { resolveDvtSubstraitUnionAllEntry } from './canvasDvtSubstraitSetComposition';

export type {
  TransformationGraphValidationResult,
  TransformationGraphValidationSummaryCode,
  TransformationNodeRole,
};

function validateThreeNodeTransformationContext(
  context: ReturnType<typeof resolveTransformationValidationContext>
): TransformationGraphValidationResult {
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

  const sourceNode = context.scopedNodes.find(
    (node) => nodeRoles.nodeRolesById[node.id] === 'source'
  );
  if (
    sourceNode?.kind === 'dvt:source' &&
    resolveEffectiveDvtConnectionRef(sourceNode) === undefined
  ) {
    return buildContextInvalidResult(context, 'requires_postgres_connection');
  }

  return buildValidResult(context, nodeRoles.nodeRolesById);
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

  if (context.scopedNodes.length === 4) {
    const transformNode = context.scopedNodes.find((node) => node.role === 'transform');
    const sinkNode = context.scopedNodes.find((node) => node.role === 'output');
    const sourceNodes = context.scopedNodes.filter((node) => node.role === 'input');
    const joinEntry = transformNode
      ? resolveDvtSubstraitInnerJoinEntry({
          targetNode: transformNode,
          nodes: context.scopedNodes,
          edges: context.scopedEdges,
          requirePersistedAuthority: true,
        })
      : null;
    const unionAllEntry =
      transformNode && joinEntry == null
        ? resolveDvtSubstraitUnionAllEntry({
            targetNode: transformNode,
            nodes: context.scopedNodes,
            edges: context.scopedEdges,
            requirePersistedAuthority: true,
          })
        : null;
    const sourceNodeIds = joinEntry
      ? [joinEntry.left.nodeId, joinEntry.right.nodeId]
      : unionAllEntry?.inputs.map((input) => input.nodeId);

    if (sourceNodeIds && sinkNode && sourceNodes.length === 2 && context.scopedEdges.length === 3) {
      const expectedEdges = new Set([
        ...sourceNodeIds.map((nodeId) => `${nodeId}->${transformNode?.id}`),
        `${transformNode?.id}->${sinkNode.id}`,
      ]);
      const actualEdges = new Set(
        context.scopedEdges.map((edge) => `${edge.sourceId}->${edge.targetId}`)
      );
      if (
        actualEdges.size === expectedEdges.size &&
        [...expectedEdges].every((edge) => actualEdges.has(edge))
      ) {
        return buildValidResult(
          context,
          Object.fromEntries(
            context.scopedNodes.map((node) => [
              node.id,
              node.role === 'input'
                ? 'source'
                : node.role === 'transform'
                  ? 'sql_transform'
                  : 'sink',
            ])
          )
        );
      }
    }
  }

  if (context.scopedNodes.length !== TRANSFORMATION_REQUIRED_NODE_COUNT) {
    const executablePath = resolveExecutableTransformationPath(context);
    if (executablePath.status === 'one') {
      const scopedNodeIdSet = new Set(executablePath.path.scopedNodeIds);
      const scopedEdges = context.scopedEdges.filter(
        (edge) => scopedNodeIdSet.has(edge.sourceId) && scopedNodeIdSet.has(edge.targetId)
      );
      return validateThreeNodeTransformationContext({
        ...context,
        scopedNodes: executablePath.path.scopedNodes,
        scopedNodeIds: executablePath.path.scopedNodeIds,
        scopedEdges,
        scopedEdgeIds: scopedEdges.map((edge) => edge.id),
      });
    }

    if (executablePath.status === 'ambiguous') {
      return buildContextInvalidResult(context, 'ambiguous_executable_paths');
    }

    return buildContextInvalidResult(context, 'requires_executable_path');
  }

  return validateThreeNodeTransformationContext(context);
}
