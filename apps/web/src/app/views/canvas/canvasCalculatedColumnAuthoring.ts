/** Owned concern: execute calculated-column authoring through ConfigureCanvasDvtNode. */
import type { CanonicalNode } from '../../types/canonical';
import {
  appendDvtSubstraitCalculatedColumn,
  type DvtSubstraitCalculatedColumnRequest,
} from './canvasDvtSubstraitCalculatedColumn';
import type { CanvasDraftSession } from './canvasDraftSession';
import { canvasDraftSession } from './canvasDraftSession';
import { createDvtNodeAuthoringMetadata } from './canvasDvtAuthoringModel';
import {
  createDvtSubstraitProjectionDraft,
  encodeDvtSubstraitProjectionDocument,
  resolveDvtSubstraitProjectionEntry,
  resolveDvtSubstraitProjectionSource,
  type DvtSubstraitProjection,
  type DvtSubstraitProjectionDraft,
} from './canvasDvtSubstraitProjection';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';

export type CanvasCalculatedColumnRequest = Readonly<{ nodeId: string }> &
  DvtSubstraitCalculatedColumnRequest;

export type CanvasCalculatedColumnResult =
  | Readonly<{ outcome: 'applied'; draftSession: CanvasDraftSession }>
  | Readonly<{ outcome: 'rejected' }>;

function outputFieldId(name: string): string {
  return `output:${encodeURIComponent(name)}`;
}

function nodeCatalog(
  draftSession: CanvasDraftSession,
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>
): Map<string, CanonicalNode> {
  const catalog = new Map(canonicalNodesById);
  Object.values(draftSession.localNodeCatalog ?? {}).forEach((node) => catalog.set(node.id, node));
  return catalog;
}

function normalizedRequest(
  request: CanvasCalculatedColumnRequest,
  projection: DvtSubstraitProjection
): DvtSubstraitCalculatedColumnRequest {
  const resolveFieldId = (identity: string): string =>
    projection.outputs.find(
      (output) =>
        output.fieldId === identity ||
        output.name === identity ||
        output.sourceFieldId === identity ||
        output.sourceFieldName === identity
    )?.fieldId ?? identity;
  if (request.kind === 'scalar-function') {
    return { ...request, inputFieldId: resolveFieldId(request.inputFieldId) };
  }
  if (request.kind === 'row-number') {
    return { ...request, orderFieldId: resolveFieldId(request.orderFieldId) };
  }
  return request;
}

function append(args: {
  request: CanvasCalculatedColumnRequest;
  projection: DvtSubstraitProjection;
  draft: DvtSubstraitProjectionDraft;
}): DvtSubstraitProjectionDraft {
  const request = normalizedRequest(args.request, args.projection);
  const inputFieldId =
    request.kind === 'scalar-function'
      ? request.inputFieldId
      : request.kind === 'row-number'
        ? request.orderFieldId
        : undefined;
  const input = args.projection.outputs.find((output) => output.fieldId === inputFieldId);
  return appendDvtSubstraitCalculatedColumn(
    args.draft,
    request,
    request.kind === 'scalar-function' && input != null
      ? {
          inputDataType: input.dataType,
          provider: args.projection.source.sourceRef.connectionRef.provider,
        }
      : undefined
  );
}

function applyToSource(
  target: CanonicalNode,
  request: CanvasCalculatedColumnRequest
): CanonicalNode | null {
  const source = resolveDvtSubstraitProjectionSource(target);
  if (source == null) return null;
  const draft = createDvtSubstraitProjectionDraft({
    source,
    targetNodeId: target.id,
    outputs: source.fields.map((field) => ({
      fieldId: outputFieldId(field.name),
      name: field.name,
      sourceFieldName: field.name,
    })),
  });
  const projection: DvtSubstraitProjection = {
    targetNodeId: target.id,
    source,
    outputs: source.fields.map((field, outputOrdinal) => ({
      fieldId: outputFieldId(field.name),
      name: field.name,
      sourceFieldId: `field:${source.nodeId}:${field.name}`,
      sourceFieldName: field.name,
      dataType: field.dataType,
      outputOrdinal,
    })),
  };
  const nextDraft = append({ request, projection, draft });
  if (nextDraft === draft) return null;
  return applyDvtSubstraitSemanticDocument(
    { ...target, pluginId: 'dvt', kind: 'dvt:transform', role: 'transform', status: 'idle' },
    encodeDvtSubstraitProjectionDocument(nextDraft)
  );
}

function applyToTransform(args: {
  target: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: CanvasDraftSession['workingSet']['visibleEdges'];
  request: CanvasCalculatedColumnRequest;
}): CanonicalNode | null {
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
  const nextDraft = append({ request: args.request, projection, draft });
  return nextDraft === draft
    ? null
    : applyDvtSubstraitSemanticDocument(
        args.target,
        encodeDvtSubstraitProjectionDocument(nextDraft)
      );
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
    const node =
      target.kind === 'dvt:source'
        ? applyToSource(target, args.request)
        : target.kind === 'dvt:transform'
          ? applyToTransform({
              target,
              nodes: [...catalog.values()],
              edges: args.draftSession.workingSet.visibleEdges,
              request: args.request,
            })
          : null;
    return node == null
      ? { outcome: 'rejected' }
      : {
          outcome: 'applied',
          draftSession: canvasDraftSession.workingSet.upsertNode(args.draftSession, node),
        };
  } catch {
    return { outcome: 'rejected' };
  }
}
