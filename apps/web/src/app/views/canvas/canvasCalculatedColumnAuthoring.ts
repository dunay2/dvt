/** Owned concern: execute calculated-column authoring through ConfigureCanvasDvtNode. */
import type { CanonicalNode } from '../../types/canonical';
import {
  createDvtSubstraitProjectionOutput,
  type DvtSubstraitCreateOutputRequest,
} from './canvasDvtSubstraitCalculatedColumn';
import type { CanvasDraftSession } from './canvasDraftSession';
import { canvasDraftSession } from './canvasDraftSession';
import { createDvtNodeAuthoringMetadata } from './canvasDvtAuthoringModel';
import {
  encodeDvtSubstraitProjectionDocument,
  resolveDvtSubstraitProjectionEntry,
  type DvtSubstraitProjection,
  type DvtSubstraitProjectionDraft,
} from './canvasDvtSubstraitProjection';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';

export type CanvasCalculatedColumnRequest =
  | Readonly<{ nodeId: string; kind: 'string-literal'; alias: string; value: string }>
  | Readonly<{ nodeId: string; kind: 'timestamp-literal'; alias: string; value: string }>
  | Readonly<{
      nodeId: string;
      kind: 'scalar-function';
      alias: string;
      inputFieldId: string;
      capabilityId: string;
    }>
  | Readonly<{
      nodeId: string;
      kind: 'row-number';
      alias: string;
      orderFieldId: string;
    }>;

export type CanvasCalculatedColumnResult =
  | Readonly<{ outcome: 'applied'; draftSession: CanvasDraftSession; createdFieldId: string }>
  | Readonly<{ outcome: 'rejected' }>;

function nodeCatalog(
  draftSession: CanvasDraftSession,
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>
): Map<string, CanonicalNode> {
  const catalog = new Map(canonicalNodesById);
  Object.values(draftSession.localNodeCatalog ?? {}).forEach((node) => catalog.set(node.id, node));
  return catalog;
}

function creationRequest(request: CanvasCalculatedColumnRequest): DvtSubstraitCreateOutputRequest {
  if (request.kind === 'scalar-function') {
    return {
      alias: request.alias,
      expression: {
        kind: 'scalar-function',
        inputFieldId: request.inputFieldId,
        capabilityId: request.capabilityId,
      },
    };
  }
  if (request.kind === 'row-number') {
    return {
      alias: request.alias,
      expression: { kind: 'row-number', orderFieldId: request.orderFieldId },
    };
  }
  return {
    alias: request.alias,
    expression: { kind: request.kind, value: request.value },
  };
}
function createOutput(args: {
  request: CanvasCalculatedColumnRequest;
  projection: DvtSubstraitProjection;
  draft: DvtSubstraitProjectionDraft;
}) {
  const request = creationRequest(args.request);
  const inputFieldId =
    request.expression.kind === 'scalar-function' ? request.expression.inputFieldId : undefined;
  const input = args.projection.outputs.find((output) => output.fieldId === inputFieldId);
  return createDvtSubstraitProjectionOutput(
    args.draft,
    request,
    request.expression.kind === 'scalar-function' && input != null
      ? {
          inputDataType: input.dataType,
          provider: args.projection.source.sourceRef.connectionRef.provider,
        }
      : undefined
  );
}

function applyToTransform(args: {
  target: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: CanvasDraftSession['workingSet']['visibleEdges'];
  request: CanvasCalculatedColumnRequest;
}): Readonly<{ node: CanonicalNode; createdFieldId: string }> | null {
  const metadata = createDvtNodeAuthoringMetadata(args.target);
  if (
    metadata?.kind !== 'transform' ||
    metadata.mode !== 'substrait' ||
    metadata.shape !== 'projection'
  ) {
    return null;
  }
  const draft = { plan: metadata.plan, sidecar: metadata.sidecar };
  const projection = resolveDvtSubstraitProjectionEntry({
    targetNode: args.target,
    nodes: args.nodes,
    edges: args.edges,
    draft,
  });
  if (projection == null) return null;
  const creation = createOutput({ request: args.request, projection, draft });
  if (creation.outcome !== 'applied') return null;
  return {
    node: applyDvtSubstraitSemanticDocument(
      args.target,
      encodeDvtSubstraitProjectionDocument(creation.draft)
    ),
    createdFieldId: creation.createdFieldId,
  };
}

export function applyCanvasCalculatedColumn(args: {
  draftSession: CanvasDraftSession;
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>;
  request: CanvasCalculatedColumnRequest;
}): CanvasCalculatedColumnResult {
  try {
    const catalog = nodeCatalog(args.draftSession, args.canonicalNodesById);
    const target = catalog.get(args.request.nodeId);
    if (target == null) return { outcome: 'rejected' };
    const update =
      target.kind === 'dvt:transform'
        ? applyToTransform({
            target,
            nodes: [...catalog.values()],
            edges: args.draftSession.workingSet.visibleEdges,
            request: args.request,
          })
        : null;
    return update == null
      ? { outcome: 'rejected' }
      : {
          outcome: 'applied',
          draftSession: canvasDraftSession.workingSet.upsertNode(args.draftSession, update.node),
          createdFieldId: update.createdFieldId,
        };
  } catch {
    return { outcome: 'rejected' };
  }
}
