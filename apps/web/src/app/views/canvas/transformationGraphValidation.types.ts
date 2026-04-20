import type { CanonicalEdge, CanonicalNode, CoreNodeRole } from '../../types/canonical';

export type TransformationNodeRole = 'source' | 'sql_transform' | 'sink';

export const TRANSFORMATION_NODE_ROLES = {
  source: 'source',
  sqlTransform: 'sql_transform',
  sink: 'sink',
} as const satisfies Record<'source' | 'sqlTransform' | 'sink', TransformationNodeRole>;

export const CANONICAL_ROLE_TO_TRANSFORMATION_ROLE: Readonly<
  Partial<Record<CoreNodeRole, TransformationNodeRole>>
> = {
  input: TRANSFORMATION_NODE_ROLES.source,
  transform: TRANSFORMATION_NODE_ROLES.sqlTransform,
  output: TRANSFORMATION_NODE_ROLES.sink,
};

export const TRANSFORMATION_REQUIRED_ROLE_COUNTS = {
  [TRANSFORMATION_NODE_ROLES.source]: 1,
  [TRANSFORMATION_NODE_ROLES.sqlTransform]: 1,
  [TRANSFORMATION_NODE_ROLES.sink]: 1,
} as const satisfies Record<TransformationNodeRole, number>;

export const TRANSFORMATION_REQUIRED_EDGE_ROLE_PAIRS = [
  [TRANSFORMATION_NODE_ROLES.source, TRANSFORMATION_NODE_ROLES.sqlTransform],
  [TRANSFORMATION_NODE_ROLES.sqlTransform, TRANSFORMATION_NODE_ROLES.sink],
] as const satisfies readonly (readonly [TransformationNodeRole, TransformationNodeRole])[];

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

export type ValidateTransformationGraphArgs = {
  nodes: CanonicalNode[];
  edges: CanonicalEdge[];
  selectedNodeIds?: string[];
  workspaceNodeIds?: string[];
};

export type ScopedTransformationGraph = {
  scopedNodes: CanonicalNode[];
  scopedNodeIds: string[];
  scopedEdges: CanonicalEdge[];
  scopedEdgeIds: string[];
};

export type TransformationValidationContext = ScopedTransformationGraph & {
  allNodes: CanonicalNode[];
  allEdges: CanonicalEdge[];
};
