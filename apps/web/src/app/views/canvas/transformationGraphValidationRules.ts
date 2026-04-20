import { buildContextInvalidResult } from './transformationGraphValidationResults';
import type {
  TransformationGraphValidationResult,
  TransformationNodeRole,
  TransformationValidationContext,
} from './transformationGraphValidation.types';
import {
  CANONICAL_ROLE_TO_TRANSFORMATION_ROLE,
  TRANSFORMATION_REQUIRED_EDGE_ROLE_PAIRS,
  TRANSFORMATION_REQUIRED_ROLE_COUNTS,
} from './transformationGraphValidation.types';

function mapCanonicalRole(
  role: TransformationValidationContext['scopedNodes'][number]['role']
): TransformationNodeRole | null {
  return CANONICAL_ROLE_TO_TRANSFORMATION_ROLE[role] ?? null;
}

function createEmptyTransformationRoleCounts(): Record<TransformationNodeRole, number> {
  return Object.fromEntries(
    (
      Object.keys(TRANSFORMATION_REQUIRED_ROLE_COUNTS) as Array<keyof typeof TRANSFORMATION_REQUIRED_ROLE_COUNTS>
    ).map((role) => [role, 0])
  ) as Record<TransformationNodeRole, number>;
}

export function validateScopedNodeCount(
  context: TransformationValidationContext
): TransformationGraphValidationResult | null {
  if (context.scopedNodes.length === 3) {
    return null;
  }

  return buildContextInvalidResult(context, 'requires_three_nodes');
}

function resolveTransformationNodeRoles(
  scopedNodes: TransformationValidationContext['scopedNodes']
): Record<string, TransformationNodeRole> | null {
  const nodeRolesById: Record<string, TransformationNodeRole> = {};

  for (const node of scopedNodes) {
    const mappedRole = mapCanonicalRole(node.role);
    if (!mappedRole) {
      return null;
    }
    nodeRolesById[node.id] = mappedRole;
  }

  return nodeRolesById;
}

export function resolveValidatedNodeRoles(
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
  scopedNodes: TransformationValidationContext['scopedNodes'],
  nodeRolesById: Record<string, TransformationNodeRole>
): Record<TransformationNodeRole, number> {
  return scopedNodes.reduce(
    (acc, node) => {
      const mappedRole = nodeRolesById[node.id];
      if (mappedRole) {
        acc[mappedRole] += 1;
      }
      return acc;
    },
    createEmptyTransformationRoleCounts()
  );
}

export function validateRoleCardinality(
  context: TransformationValidationContext,
  nodeRolesById: Record<string, TransformationNodeRole>
): TransformationGraphValidationResult | null {
  const roleCounts = countTransformationRoles(context.scopedNodes, nodeRolesById);
  const hasExactlyRequiredRoleCounts = (
    Object.entries(TRANSFORMATION_REQUIRED_ROLE_COUNTS) as Array<[TransformationNodeRole, number]>
  ).every(([role, requiredCount]) => roleCounts[role] === requiredCount);

  if (hasExactlyRequiredRoleCounts) {
    return null;
  }

  return buildContextInvalidResult(context, 'requires_one_of_each_role');
}

export function validateEdgeCount(
  context: TransformationValidationContext
): TransformationGraphValidationResult | null {
  if (context.scopedEdges.length === 2) {
    return null;
  }

  return buildContextInvalidResult(context, 'requires_two_edges');
}

export function validateEdgeOrder(
  context: TransformationValidationContext,
  nodeRolesById: Record<string, TransformationNodeRole>
): TransformationGraphValidationResult | null {
  const hasRequiredEdgePath = TRANSFORMATION_REQUIRED_EDGE_ROLE_PAIRS.every(
    ([sourceRole, targetRole]) =>
      context.scopedEdges.some(
        (edge) =>
          nodeRolesById[edge.sourceId] === sourceRole && nodeRolesById[edge.targetId] === targetRole
      )
  );

  if (hasRequiredEdgePath) {
    return null;
  }

  return buildContextInvalidResult(context, 'invalid_edge_order');
}
