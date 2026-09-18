/** Owned concern: project canonical DVT relation structure into one immutable Canvas read model. */
import type { Expression, Rel } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { SetRel_SetOp } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import type { ConnectedSourceRef, DvtSubstraitAuthoringSidecarV1 } from '@dvt/contracts';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  resolveCanvasDvtCompositionInputs,
  type CanvasDvtCompositionInput,
} from './canvasDvtCompositionInputCatalog';
import { decodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { hasSameConnectedSourceRef } from './canvasDvtSubstraitJoinSourceResolution';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';

export type CanvasRelationalTreeOperator =
  'read' | 'project' | 'filter' | 'join' | 'set' | 'aggregate' | 'unsupported';

export type CanvasRelationalTreeChildRole = 'input' | 'left' | 'right' | 'primary' | 'secondary';

export type CanvasRelationalTreeField = Readonly<{
  fieldId: string;
  outputOrdinal: number;
  displayName: string | null;
  sourceFieldId: string | null;
  operandFieldIds: readonly string[];
}>;

export type CanvasRelationalTreeExpressionRef = Readonly<{
  slot: 'filter-condition' | 'join-condition' | 'project-expression' | 'aggregate-expression';
  ordinal: number;
}>;

export type CanvasRelationalTreeNode = Readonly<{
  locator: string;
  operator: CanvasRelationalTreeOperator;
  substraitKind: string;
  operationLabel?: string;
  relationId: string | null;
  displayName: string | null;
  sourceRef: ConnectedSourceRef | null;
  output: Readonly<{ fields: readonly CanvasRelationalTreeField[] }>;
  expressionRefs: readonly CanvasRelationalTreeExpressionRef[];
  decorations: readonly Readonly<{ kind: 'window'; count: number }>[];
  children: readonly Readonly<{
    role: CanvasRelationalTreeChildRole;
    ordinal: number;
    node: CanvasRelationalTreeNode;
  }>[];
}>;

export type CanvasRelationalTreeInput = Readonly<{
  sourceRef: ConnectedSourceRef;
  sourceNodeId: string | null;
  relationId: string | null;
  state: 'participating' | 'pending' | 'missing';
}>;

export type CanvasRelationalTreeProjection = Readonly<{
  transformNodeId: string;
  semanticDigest: string;
  root: CanvasRelationalTreeNode;
  output: CanvasRelationalTreeNode['output'];
  inputs: readonly CanvasRelationalTreeInput[];
}>;

export type CanvasRelationalTreeProjectionResult =
  | Readonly<{ ok: true; projection: CanvasRelationalTreeProjection }>
  | Readonly<{
      ok: false;
      failure: Readonly<{
        code:
          | 'missing-semantic-authority'
          | 'invalid-semantic-authority'
          | 'input-identity-unavailable';
      }>;
    }>;

type RelationBinding = DvtSubstraitAuthoringSidecarV1['relations'][number];

type ChildInput = Readonly<{
  role: CanvasRelationalTreeChildRole;
  ordinal: number;
  rel: Rel;
}>;

function relationAnchor(rel: Rel): number | null {
  switch (rel.relType.case) {
    case 'read':
    case 'project':
    case 'filter':
    case 'join':
    case 'set':
    case 'aggregate':
      return rel.relType.value.common?.relAnchor ?? null;
    default: {
      const value: unknown = rel.relType.value;
      if (value == null || typeof value !== 'object') return null;
      const common: unknown = (value as { common?: unknown }).common;
      if (common == null || typeof common !== 'object') return null;
      const anchor: unknown = (common as { relAnchor?: unknown }).relAnchor;
      return typeof anchor === 'number' ? anchor : null;
    }
  }
}

function requireRelation(value: Rel | undefined, label: string): Rel {
  if (value == null) throw new Error(`Canonical ${label} relation input is absent.`);
  return value;
}

function childInputs(rel: Rel): readonly ChildInput[] {
  switch (rel.relType.case) {
    case 'project':
    case 'filter':
    case 'aggregate':
      return [
        {
          role: 'input',
          ordinal: 0,
          rel: requireRelation(rel.relType.value.input, rel.relType.case),
        },
      ];
    case 'join':
      return [
        { role: 'left', ordinal: 0, rel: requireRelation(rel.relType.value.left, 'JOIN left') },
        { role: 'right', ordinal: 1, rel: requireRelation(rel.relType.value.right, 'JOIN right') },
      ];
    case 'set':
      if (rel.relType.value.inputs.length === 0) {
        throw new Error('Canonical SetRel has no inputs.');
      }
      return rel.relType.value.inputs.map((input, ordinal) => ({
        role: ordinal === 0 ? 'primary' : 'secondary',
        ordinal,
        rel: input,
      }));
    default:
      return [];
  }
}

function operator(rel: Rel): CanvasRelationalTreeOperator {
  switch (rel.relType.case) {
    case 'read':
    case 'project':
    case 'filter':
    case 'join':
    case 'set':
    case 'aggregate':
      return rel.relType.case;
    default:
      return 'unsupported';
  }
}

function expressionRefs(rel: Rel): readonly CanvasRelationalTreeExpressionRef[] {
  switch (rel.relType.case) {
    case 'filter':
      return rel.relType.value.condition == null ? [] : [{ slot: 'filter-condition', ordinal: 0 }];
    case 'join':
      return rel.relType.value.expression == null ? [] : [{ slot: 'join-condition', ordinal: 0 }];
    case 'project':
      return rel.relType.value.expressions.map((_, ordinal) => ({
        slot: 'project-expression',
        ordinal,
      }));
    case 'aggregate': {
      const aggregate = rel.relType.value;
      return [
        ...aggregate.groupingExpressions.map((_, ordinal) => ({
          slot: 'aggregate-expression' as const,
          ordinal,
        })),
        ...aggregate.measures.map((_, ordinal) => ({
          slot: 'aggregate-expression' as const,
          ordinal: aggregate.groupingExpressions.length + ordinal,
        })),
      ];
    }
    default:
      return [];
  }
}

function windowCount(expressions: readonly Expression[]): number {
  return expressions.filter((expression) => expression.rexType.case === 'windowFunction').length;
}

function relationWindowCount(rel: Rel): number {
  return rel.relType.case === 'project' ? windowCount(rel.relType.value.expressions) : 0;
}

function fieldsForRelation(
  sidecar: DvtSubstraitAuthoringSidecarV1,
  relationId: string | null
): readonly CanvasRelationalTreeField[] {
  if (relationId == null) return [];
  return sidecar.fields
    .filter((field) => field.relationId === relationId)
    .sort((left, right) => left.outputOrdinal - right.outputOrdinal)
    .map((field) => ({
      fieldId: field.fieldId,
      outputOrdinal: field.outputOrdinal,
      displayName: field.displayName ?? null,
      sourceFieldId: field.sourceFieldId ?? null,
      operandFieldIds: field.operandFieldIds ?? [],
    }));
}

function buildTree(
  args: Readonly<{
    rel: Rel;
    path: string;
    semanticDigest: string;
    sidecar: DvtSubstraitAuthoringSidecarV1;
    relationByAnchor: ReadonlyMap<number, RelationBinding>;
  }>
): CanvasRelationalTreeNode {
  const anchor = relationAnchor(args.rel);
  const binding = anchor == null ? undefined : args.relationByAnchor.get(anchor);
  const relationId = binding?.relationId ?? null;
  const inputs = childInputs(args.rel);
  const windows = relationWindowCount(args.rel);
  return {
    locator: `rel:${args.semanticDigest}:${args.path}`,
    operator: operator(args.rel),
    substraitKind: args.rel.relType.case ?? 'unknown',
    ...(args.rel.relType.case === 'set' && args.rel.relType.value.op === SetRel_SetOp.UNION_ALL
      ? { operationLabel: 'UNION ALL' }
      : {}),
    relationId,
    displayName: binding?.displayName ?? null,
    sourceRef: binding?.sourceRef ?? null,
    output: { fields: fieldsForRelation(args.sidecar, relationId) },
    expressionRefs: expressionRefs(args.rel),
    decorations: windows === 0 ? [] : [{ kind: 'window', count: windows }],
    children: inputs.map((input) => ({
      role: input.role,
      ordinal: input.ordinal,
      node: buildTree({
        ...args,
        rel: input.rel,
        path: `${args.path}/${input.role}:${input.ordinal}`,
      }),
    })),
  };
}

function sourceRefKey(sourceRef: ConnectedSourceRef): string {
  return [
    sourceRef.connectionRef.provider,
    sourceRef.connectionRef.connectionId,
    sourceRef.sourceObjectId,
  ].join('|');
}

function uniqueSourceBindings(relations: readonly RelationBinding[]): readonly RelationBinding[] {
  return relations.filter(
    (relation, index) =>
      relation.sourceRef != null &&
      relations.findIndex(
        (candidate) =>
          candidate.sourceRef != null &&
          hasSameConnectedSourceRef(candidate.sourceRef, relation.sourceRef!)
      ) === index
  );
}

function projectInputs(
  relations: readonly RelationBinding[],
  connected: readonly CanvasDvtCompositionInput[]
): readonly CanvasRelationalTreeInput[] {
  const canonical = uniqueSourceBindings(relations).map((relation) => {
    const match = connected.find((input) =>
      hasSameConnectedSourceRef(input.sourceRef, relation.sourceRef!)
    );
    return {
      sourceRef: relation.sourceRef!,
      sourceNodeId: match?.nodeId ?? null,
      relationId: relation.relationId,
      state: match == null ? ('missing' as const) : ('participating' as const),
    };
  });
  const pending = connected
    .filter(
      (input) =>
        !relations.some(
          (relation) =>
            relation.sourceRef != null &&
            hasSameConnectedSourceRef(relation.sourceRef, input.sourceRef)
        )
    )
    .sort((left, right) =>
      sourceRefKey(left.sourceRef).localeCompare(sourceRefKey(right.sourceRef))
    )
    .map((input) => ({
      sourceRef: input.sourceRef,
      sourceNodeId: input.nodeId,
      relationId: null,
      state: 'pending' as const,
    }));
  return [...canonical, ...pending];
}

export function projectCanvasRelationalTree(
  args: Readonly<{
    node: CanonicalNode;
    nodes: readonly CanonicalNode[];
    edges: readonly Pick<CanonicalEdge, 'sourceId' | 'targetId'>[];
  }>
): CanvasRelationalTreeProjectionResult {
  try {
    if (
      args.node.pluginId !== 'dvt' ||
      args.node.kind !== 'dvt:transform' ||
      args.node.role !== 'transform'
    ) {
      return { ok: false, failure: { code: 'invalid-semantic-authority' } };
    }
    const authority = readDvtTransformAuthoringAuthority(args.node);
    if (authority == null) {
      return { ok: false, failure: { code: 'missing-semantic-authority' } };
    }
    const connectedNodeIds = new Set(
      args.edges.filter((edge) => edge.targetId === args.node.id).map((edge) => edge.sourceId)
    );
    const connected = resolveCanvasDvtCompositionInputs({
      targetNodeId: args.node.id,
      nodes: args.nodes,
      edges: args.edges,
    });
    if (connected.length !== connectedNodeIds.size) {
      return { ok: false, failure: { code: 'input-identity-unavailable' } };
    }
    const draft = decodeDvtSubstraitSemanticDocument(authority.semanticDocument);
    const root = draft.plan.relations.length === 1 ? draft.plan.relations[0]?.relType : undefined;
    if (root?.case !== 'root' || root.value.input == null) {
      return { ok: false, failure: { code: 'invalid-semantic-authority' } };
    }
    const relationByAnchor = new Map(
      draft.sidecar.relations.map((relation) => [relation.relAnchor, relation] as const)
    );
    const projectedRoot = buildTree({
      rel: root.value.input,
      path: 'root',
      semanticDigest: authority.semanticDocument.semanticPlan.sha256,
      sidecar: draft.sidecar,
      relationByAnchor,
    });
    return {
      ok: true,
      projection: {
        transformNodeId: args.node.id,
        semanticDigest: authority.semanticDocument.semanticPlan.sha256,
        root: projectedRoot,
        output: projectedRoot.output,
        inputs: projectInputs(draft.sidecar.relations, connected),
      },
    };
  } catch {
    return { ok: false, failure: { code: 'invalid-semantic-authority' } };
  }
}
