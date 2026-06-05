import { buildContextInvalidResult } from './transformationGraphValidationResults';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type {
  TransformationGraphValidationResult,
  TransformationNodeRole,
  TransformationValidationContext,
} from './transformationGraphValidation.types';
import {
  CANONICAL_ROLE_TO_TRANSFORMATION_ROLE,
  TRANSFORMATION_REQUIRED_EDGE_ROLE_PAIRS,
  TRANSFORMATION_REQUIRED_NODE_COUNT,
  TRANSFORMATION_REQUIRED_ROLE_COUNTS,
  TRANSFORMATION_NODE_ROLES,
} from './transformationGraphValidation.types';

export type ExecutableTransformationPath = {
  scopedNodes: CanonicalNode[];
  scopedNodeIds: string[];
  scopedEdges: CanonicalEdge[];
  scopedEdgeIds: string[];
};

export type ExecutableTransformationPathResolution =
  | { status: 'none' }
  | { status: 'one'; path: ExecutableTransformationPath }
  | { status: 'ambiguous' };

function mapCanonicalRole(
  role: TransformationValidationContext['scopedNodes'][number]['role']
): TransformationNodeRole | null {
  return CANONICAL_ROLE_TO_TRANSFORMATION_ROLE[role] ?? null;
}

function createEmptyTransformationRoleCounts(): Record<TransformationNodeRole, number> {
  return Object.fromEntries(
    (
      Object.keys(TRANSFORMATION_REQUIRED_ROLE_COUNTS) as Array<
        keyof typeof TRANSFORMATION_REQUIRED_ROLE_COUNTS
      >
    ).map((role) => [role, 0])
  ) as Record<TransformationNodeRole, number>;
}

export function validateScopedNodeCount(
  context: TransformationValidationContext
): TransformationGraphValidationResult | null {
  if (context.scopedNodes.length === TRANSFORMATION_REQUIRED_NODE_COUNT) {
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
  return scopedNodes.reduce((acc, node) => {
    const mappedRole = nodeRolesById[node.id];
    if (mappedRole) {
      acc[mappedRole] += 1;
    }
    return acc;
  }, createEmptyTransformationRoleCounts());
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

function collectNodesByRole(scopedNodes: TransformationValidationContext['scopedNodes']): {
  nodesByRole: Record<TransformationNodeRole, CanonicalNode[]>;
  nodeRolesById: Record<string, TransformationNodeRole>;
} {
  const nodesByRole: Record<TransformationNodeRole, CanonicalNode[]> = {
    source: [],
    sql_transform: [],
    sink: [],
  };
  const nodeRolesById: Record<string, TransformationNodeRole> = {};

  for (const node of scopedNodes) {
    const mappedRole = mapCanonicalRole(node.role);
    if (!mappedRole) {
      continue;
    }

    nodesByRole[mappedRole].push(node);
    nodeRolesById[node.id] = mappedRole;
  }

  return { nodesByRole, nodeRolesById };
}

export function resolveExecutableTransformationPath(
  context: TransformationValidationContext
): ExecutableTransformationPathResolution {
  const { nodesByRole, nodeRolesById } = collectNodesByRole(context.scopedNodes);
  const nodesById = new Map(context.scopedNodes.map((node) => [node.id, node]));
  let resolvedPath: ExecutableTransformationPath | null = null;

  for (const source of nodesByRole.source) {
    const sourceToTransformEdges = context.scopedEdges.filter(
      (edge) =>
        edge.sourceId === source.id &&
        nodeRolesById[edge.targetId] === TRANSFORMATION_NODE_ROLES.sqlTransform
    );

    for (const sourceToTransformEdge of sourceToTransformEdges) {
      const transform = nodesById.get(sourceToTransformEdge.targetId);
      if (!transform) {
        continue;
      }

      const transformToSinkEdges = context.scopedEdges.filter(
        (edge) =>
          edge.sourceId === transform.id &&
          nodeRolesById[edge.targetId] === TRANSFORMATION_NODE_ROLES.sink
      );

      for (const transformToSinkEdge of transformToSinkEdges) {
        const sink = nodesById.get(transformToSinkEdge.targetId);
        if (!sink) {
          continue;
        }

        const nextPath = {
          scopedNodes: [source, transform, sink],
          scopedNodeIds: [source.id, transform.id, sink.id],
          scopedEdges: [sourceToTransformEdge, transformToSinkEdge],
          scopedEdgeIds: [sourceToTransformEdge.id, transformToSinkEdge.id],
        };

        if (resolvedPath) {
          return { status: 'ambiguous' };
        }

        resolvedPath = nextPath;
      }
    }
  }

  return resolvedPath ? { status: 'one', path: resolvedPath } : { status: 'none' };
}
