/** Owned concern: project canonical DVT relation structure into one immutable Canvas read model. */
import type { ConnectedSourceRef, DvtSubstraitAuthoringSidecarV1 } from '@dvt/contracts';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  resolveCanvasDvtCompositionInputs,
  type CanvasDvtCompositionInput,
} from './canvasDvtCompositionInputCatalog';
import { decodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { hasSameConnectedSourceRef } from './canvasDvtSubstraitJoinSourceResolution';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import { buildCanvasRelationalTreeRelation } from './canvasRelationalTreeRelationProjection';

export type CanvasRelationalTreeOperator =
  | 'read'
  | 'project'
  | 'filter'
  | 'join'
  | 'cross'
  | 'set'
  | 'aggregate'
  | 'sort'
  | 'fetch'
  | 'unsupported';

export type CanvasRelationalTreeChildRole = 'input' | 'left' | 'right' | 'primary' | 'secondary';

export type CanvasRelationalTreeField = Readonly<{
  fieldId: string;
  outputOrdinal: number;
  displayName: string | null;
  sourceFieldId: string | null;
  operandFieldIds: readonly string[];
}>;

export type CanvasRelationalTreeExpressionRef = Readonly<{
  slot:
    | 'filter-condition'
    | 'join-condition'
    | 'project-expression'
    | 'aggregate-expression'
    | 'sort-key';
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
    const projectedRoot = buildCanvasRelationalTreeRelation({
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
