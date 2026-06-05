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
