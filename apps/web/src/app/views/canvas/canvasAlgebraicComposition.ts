/** Owned concern: admit and persist a supported algebraic operation over two Canvas inputs. */
import type { Connection, Edge } from '@xyflow/react';
import { DVT_TRANSFORM_AUTHORING_MODE } from '@dvt/contracts';

import type { PluginPortMap } from '../../plugins/contracts/ConnectionRules';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { proposeConnection } from './canvasConnectionAggregate';
import { canvasDraftSession, type CanvasDraftSession } from './canvasDraftSession';
import { resolveCanvasDraftNodes } from './canvasDraftNodeCatalog';
import { applyDvtNodeAuthoringMetadata } from './canvasDvtAuthoringModel';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import {
  createDvtSubstraitInnerJoinDraft,
  resolveDvtSubstraitInnerJoinEntry,
} from './canvasDvtSubstraitJoinComposition';
import {
  createDvtSubstraitUnionAllDraft,
  resolveDvtSubstraitUnionAllEntry,
} from './canvasDvtSubstraitSetComposition';
import {
  resolveCanvasEdgeCreationTransaction,
  type CanvasEdgeAdmissionTransaction,
} from './canvasEdgeAdmissionTransaction';

export type CanvasAlgebraicCompositionOperation = 'inner_join' | 'union_all';

type CompositionState = {
  canonicalNodesById: Map<string, CanonicalNode>;
  draftSession: CanvasDraftSession;
  edges: Edge[];
  pluginPortMap: PluginPortMap;
};

export type CanvasAlgebraicCompositionIdentity = {
  sourceNodeId: string;
  targetNodeId: string;
};

export type CanvasAlgebraicCompositionTransaction =
  | CanvasEdgeAdmissionTransaction
  | { outcome: 'noop'; rejection: { code: 'operation_not_available' } };

function connection(identity: CanvasAlgebraicCompositionIdentity): Connection {
  return {
    source: identity.sourceNodeId,
    sourceHandle: null,
    target: identity.targetNodeId,
    targetHandle: null,
  };
}

function canonicalEdges(draftSession: CanvasDraftSession): CanonicalEdge[] {
  return draftSession.workingSet.visibleEdges.map((edge, index) => ({
    id: `draft-edge-${index}`,
    sourceId: edge.sourceId,
    targetId: edge.targetId,
    relation: 'lineage',
  }));
}

function admittedOperations(args: {
  nodes: readonly CanonicalNode[];
  targetNode: CanonicalNode;
  draftSession: CanvasDraftSession;
}): CanvasAlgebraicCompositionOperation[] {
  const edges = canonicalEdges(args.draftSession);
  return [
    resolveDvtSubstraitInnerJoinEntry({ ...args, edges }) == null ? null : 'inner_join',
    resolveDvtSubstraitUnionAllEntry({ ...args, edges }) == null ? null : 'union_all',
  ].filter((operation): operation is CanvasAlgebraicCompositionOperation => operation != null);
}

export function resolveCanvasAlgebraicCompositionOperations(
  args: CompositionState & CanvasAlgebraicCompositionIdentity
): CanvasAlgebraicCompositionOperation[] {
  const nodes = resolveCanvasDraftNodes(args.draftSession, args.canonicalNodesById);
  const canonicalNodesById = new Map(nodes.map((node) => [node.id, node]));
  const targetNode = canonicalNodesById.get(args.targetNodeId);
  if (targetNode == null) return [];
  try {
    const authority = readDvtTransformAuthoringAuthority(targetNode);
    if (authority.mode !== DVT_TRANSFORM_AUTHORING_MODE.sql || authority.sql.trim().length > 0) {
      return [];
    }
  } catch {
    return [];
  }
  if (
    proposeConnection({
      connection: connection(args),
      canonicalNodesById,
      edges: args.edges,
      pluginPortMap: args.pluginPortMap,
    }).outcome === 'rejected'
  ) {
    return [];
  }
  const draftSession = canvasDraftSession.workingSet.replaceEdges(args.draftSession, [
    ...args.draftSession.workingSet.visibleEdges,
    { sourceId: args.sourceNodeId, targetId: args.targetNodeId },
  ]);
  return admittedOperations({ nodes, targetNode, draftSession });
}

function createSemanticDraft(args: {
  operation: CanvasAlgebraicCompositionOperation;
  targetNode: CanonicalNode;
  nodes: readonly CanonicalNode[];
  draftSession: CanvasDraftSession;
}) {
  const edges = canonicalEdges(args.draftSession);
  if (args.operation === 'inner_join') {
    const entry = resolveDvtSubstraitInnerJoinEntry({ ...args, edges });
    return entry == null ? null : createDvtSubstraitInnerJoinDraft(entry);
  }
  const entry = resolveDvtSubstraitUnionAllEntry({ ...args, edges });
  return entry == null ? null : createDvtSubstraitUnionAllDraft(entry);
}

export function resolveCanvasAlgebraicCompositionTransaction(
  args: CompositionState &
    CanvasAlgebraicCompositionIdentity & { operation: CanvasAlgebraicCompositionOperation }
): CanvasAlgebraicCompositionTransaction {
  if (!resolveCanvasAlgebraicCompositionOperations(args).includes(args.operation)) {
    return { outcome: 'noop', rejection: { code: 'operation_not_available' } };
  }
  const nodes = resolveCanvasDraftNodes(args.draftSession, args.canonicalNodesById);
  const canonicalNodesById = new Map(nodes.map((node) => [node.id, node]));
  const transaction = resolveCanvasEdgeCreationTransaction({
    ...args,
    canonicalNodesById,
    connection: connection(args),
  });
  if (transaction.outcome !== 'created') return transaction;
  const updatedNodes = resolveCanvasDraftNodes(transaction.draftSession, canonicalNodesById);
  const targetNode = updatedNodes.find((node) => node.id === args.targetNodeId);
  if (targetNode == null) {
    return { outcome: 'noop', rejection: { code: 'operation_not_available' } };
  }
  const semanticDraft = createSemanticDraft({
    operation: args.operation,
    targetNode,
    nodes: updatedNodes,
    draftSession: transaction.draftSession,
  });
  if (semanticDraft == null) {
    return { outcome: 'noop', rejection: { code: 'operation_not_available' } };
  }
  const composedNode = applyDvtNodeAuthoringMetadata(targetNode, {
    kind: 'transform',
    mode: DVT_TRANSFORM_AUTHORING_MODE.substrait,
    shape: args.operation,
    plan: semanticDraft.plan,
    sidecar: semanticDraft.sidecar,
  });
  return {
    ...transaction,
    draftSession: canvasDraftSession.workingSet.upsertNode(transaction.draftSession, composedNode),
  };
}
