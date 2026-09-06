/** Owned concern: derive card-level unary outputs and confine centre-drop replacement until #2921. */
import type { CanonicalNode } from '../../types/canonical';
import { canvasDraftSession, type CanvasDraftSession } from './canvasDraftSession';
import {
  applyDvtSubstraitProjectionFunction,
  resolveDvtSubstraitProjectionEntry,
} from './canvasDvtSubstraitProjection';
import {
  applyDvtNodeAuthoringMetadata,
  createDvtNodeAuthoringMetadata,
} from './canvasDvtAuthoringModel';
import { applyCanvasCalculatedColumn } from './canvasCalculatedColumnAuthoring';

export type CanvasColumnFunctionIdentity = Readonly<{
  nodeId: string;
  columnId: string;
  capabilityId: string;
  alias: string;
  sourceColumnId?: string;
}>;

export type CanvasColumnFunctionResult =
  | Readonly<{ outcome: 'applied'; draftSession: CanvasDraftSession }>
  | Readonly<{ outcome: 'rejected' }>;

function buildNodeCatalog(
  draftSession: CanvasDraftSession,
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>
): Map<string, CanonicalNode> {
  const nodes = new Map(canonicalNodesById);
  Object.values(draftSession.localNodeCatalog ?? {}).forEach((node) => nodes.set(node.id, node));
  return nodes;
}

function deriveUnaryOutput(args: {
  draftSession: CanvasDraftSession;
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>;
  identity: CanvasColumnFunctionIdentity;
}): CanvasColumnFunctionResult {
  const result = applyCanvasCalculatedColumn({
    draftSession: args.draftSession,
    canonicalNodesById: args.canonicalNodesById,
    request: {
      nodeId: args.identity.nodeId,
      kind: 'scalar-function',
      alias: args.identity.alias,
      inputFieldId: args.identity.columnId,
      capabilityId: args.identity.capabilityId,
    },
  });
  return result.outcome === 'applied'
    ? { outcome: 'applied', draftSession: result.draftSession }
    : { outcome: 'rejected' };
}

function applyToDvtTransform(args: {
  draftSession: CanvasDraftSession;
  nodeCatalog: ReadonlyMap<string, CanonicalNode>;
  targetNode: CanonicalNode;
  identity: CanvasColumnFunctionIdentity;
}): CanvasColumnFunctionResult {
  try {
    const metadata = createDvtNodeAuthoringMetadata(args.targetNode);
    if (
      metadata?.kind !== 'transform' ||
      metadata.mode !== 'substrait' ||
      metadata.shape !== 'projection'
    ) {
      return { outcome: 'rejected' };
    }
    const draft = { plan: metadata.plan, sidecar: metadata.sidecar };
    const projection = resolveDvtSubstraitProjectionEntry({
      targetNode: args.targetNode,
      nodes: [...args.nodeCatalog.values()],
      edges: args.draftSession.workingSet.visibleEdges,
      draft,
    });
    const output = projection?.outputs.find(
      (candidate) => candidate.fieldId === args.identity.columnId
    );
    const sourceOutput =
      args.identity.sourceColumnId == null
        ? output
        : projection?.outputs.find(
            (candidate) => candidate.fieldId === args.identity.sourceColumnId
          );
    if (
      projection == null ||
      output == null ||
      sourceOutput == null ||
      args.identity.sourceColumnId === args.identity.columnId
    ) {
      return { outcome: 'rejected' };
    }
    const nextDraft = applyDvtSubstraitProjectionFunction(draft, {
      fieldId: output.fieldId,
      ...(args.identity.sourceColumnId == null ? {} : { inputFieldId: sourceOutput.fieldId }),
      capabilityId: args.identity.capabilityId,
      alias: args.identity.alias,
      dataType: sourceOutput.dataType,
      provider: projection.source.sourceRef.connectionRef.provider,
    });
    if (nextDraft === draft) return { outcome: 'rejected' };
    const node = applyDvtNodeAuthoringMetadata(args.targetNode, {
      ...metadata,
      plan: nextDraft.plan,
      sidecar: nextDraft.sidecar,
    });
    return {
      outcome: 'applied',
      draftSession: canvasDraftSession.workingSet.upsertNode(args.draftSession, node),
    };
  } catch {
    return { outcome: 'rejected' };
  }
}

export function applyCanvasColumnFunction(args: {
  draftSession: CanvasDraftSession;
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>;
  identity: CanvasColumnFunctionIdentity;
}): CanvasColumnFunctionResult {
  if (args.identity.sourceColumnId == null) {
    return deriveUnaryOutput(args);
  }
  const nodeCatalog = buildNodeCatalog(args.draftSession, args.canonicalNodesById);
  const targetNode = nodeCatalog.get(args.identity.nodeId);
  if (targetNode?.pluginId === 'dvt' && targetNode.kind === 'dvt:transform') {
    return applyToDvtTransform({ ...args, nodeCatalog, targetNode });
  }
  return { outcome: 'rejected' };
}
