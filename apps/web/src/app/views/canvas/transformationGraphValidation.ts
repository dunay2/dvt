import { buildValidResult } from './transformationGraphValidationResults';
import {
  resolveValidatedNodeRoles,
  validateEdgeCount,
  validateEdgeOrder,
  validateRoleCardinality,
  validateScopedNodeCount,
} from './transformationGraphValidationRules';
import { resolveTransformationValidationContext } from './transformationGraphValidationScope';
import type {
  TransformationGraphValidationResult,
  TransformationGraphValidationSummaryCode,
  TransformationNodeRole,
  ValidateTransformationGraphArgs,
} from './transformationGraphValidation.types';

export type {
  TransformationGraphValidationResult,
  TransformationGraphValidationSummaryCode,
  TransformationNodeRole,
};

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
