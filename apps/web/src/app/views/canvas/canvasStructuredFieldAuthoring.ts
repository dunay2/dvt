/** Owned concern: apply structured-field authoring through ConfigureCanvasDvtNode. */
import type { CanonicalNode } from '../../types/canonical';
import { projectWorkspaceGraphAuthoringDraftSemanticGraph } from '../../services/workspace/workspaceGraphDraftProjection';
import { createCanvasColumnOutputId } from './canvasColumnMappingModel';
import { canvasDraftSession, type CanvasDraftSession } from './canvasDraftSession';
import {
  decodeDvtSubstraitProjectionDocument,
  resolveDvtSubstraitProjectionEntry,
  resolveDvtSubstraitProjectionSource,
} from './canvasDvtSubstraitProjection';
import {
  encodeDvtSubstraitStructuredFieldDocument,
  inspectDvtSubstraitStructuredFieldDraft,
  resolveDvtSubstraitStructuredProjectionParts,
} from './canvasDvtSubstraitStructuredField';
import { composeDvtSubstraitProjectionFields } from './canvasDvtSubstraitStructuredFieldMutation';
import { reorderDvtSubstraitStructuredFieldChildren } from './canvasDvtSubstraitStructuredFieldReorder';
import {
  applyDvtSubstraitSemanticDocument,
  readDvtTransformAuthoringAuthority,
} from './canvasDvtTransformAuthoringAuthority';

export type CanvasStructuredFieldRequest = Readonly<{
  nodeId: string;
  draggedFieldId: string;
  targetFieldId: string;
  parentName: string;
}>;
export type CanvasStructuredFieldResult =
  | Readonly<{ outcome: 'applied'; draftSession: CanvasDraftSession }>
  | Readonly<{ outcome: 'rejected' }>;
export type CanvasStructuredFieldReorderRequest = Readonly<{
  nodeId: string;
  parentFieldId: string;
  fieldId: string;
  targetFieldId: string;
  placement: 'before' | 'after';
}>;

function nodeCatalog(
  draftSession: CanvasDraftSession,
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>
): Map<string, CanonicalNode> {
  const nodes = new Map(canonicalNodesById);
  const baselineDraft = draftSession.baseline.record?.draft;
  if (baselineDraft != null) {
    projectWorkspaceGraphAuthoringDraftSemanticGraph(baselineDraft).canonicalNodes.forEach((node) =>
      nodes.set(node.id, node)
    );
  }
  Object.values(draftSession.localNodeCatalog ?? {}).forEach((node) => nodes.set(node.id, node));
  return nodes;
}

function resolveStructuredFieldDraft(args: {
  draftSession: CanvasDraftSession;
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>;
  nodeId: string;
}) {
  const nodes = nodeCatalog(args.draftSession, args.canonicalNodesById);
  const target = nodes.get(args.nodeId);
  if (target?.pluginId !== 'dvt' || target.kind !== 'dvt:transform') return null;
  const authority = readDvtTransformAuthoringAuthority(target);
  if (authority?.mode !== 'substrait') return null;
  const draft = decodeDvtSubstraitProjectionDocument(authority.semanticDocument);
  const flatEntry = resolveDvtSubstraitProjectionEntry({
    targetNode: target,
    nodes: [...nodes.values()],
    edges: args.draftSession.workingSet.visibleEdges,
    draft,
  });
  if (flatEntry != null) return { target, draft };
  const parts = resolveDvtSubstraitStructuredProjectionParts(draft);
  if (
    !inspectDvtSubstraitStructuredFieldDraft(draft).ok ||
    parts == null ||
    parts.targetRelation.displayName !== target.id
  )
    return null;
  const incomingSourceIds = new Set(
    args.draftSession.workingSet.visibleEdges
      .filter((edge) => edge.targetId === target.id)
      .map((edge) => edge.sourceId)
  );
  const sourceMatches = [...nodes.values()].some((node) => {
    if (!incomingSourceIds.has(node.id) || parts.sourceRelation.sourceRef == null) return false;
    const source = resolveDvtSubstraitProjectionSource(node);
    return (
      source?.sourceRef.sourceObjectId === parts.sourceRelation.sourceRef.sourceObjectId &&
      source.sourceRef.connectionRef.connectionId ===
        parts.sourceRelation.sourceRef.connectionRef.connectionId &&
      source.sourceRef.connectionRef.provider ===
        parts.sourceRelation.sourceRef.connectionRef.provider
    );
  });
  return sourceMatches ? { target, draft } : null;
}

export function applyCanvasStructuredField(args: {
  draftSession: CanvasDraftSession;
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>;
  request: CanvasStructuredFieldRequest;
}): CanvasStructuredFieldResult {
  try {
    const resolved = resolveStructuredFieldDraft({
      ...args,
      nodeId: args.request.nodeId,
    });
    if (resolved == null) return { outcome: 'rejected' };
    const composed = composeDvtSubstraitProjectionFields(resolved.draft, {
      draggedFieldId: args.request.draggedFieldId,
      targetFieldId: args.request.targetFieldId,
      parentFieldId: createCanvasColumnOutputId(args.request.parentName.trim()),
      parentName: args.request.parentName,
    });
    if (composed === resolved.draft) return { outcome: 'rejected' };
    const node = applyDvtSubstraitSemanticDocument(
      resolved.target,
      encodeDvtSubstraitStructuredFieldDocument(composed)
    );
    return {
      outcome: 'applied',
      draftSession: canvasDraftSession.workingSet.upsertNode(args.draftSession, node),
    };
  } catch {
    return { outcome: 'rejected' };
  }
}

export function reorderCanvasStructuredFieldChildren(args: {
  draftSession: CanvasDraftSession;
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>;
  request: CanvasStructuredFieldReorderRequest;
}): CanvasStructuredFieldResult {
  try {
    const resolved = resolveStructuredFieldDraft({ ...args, nodeId: args.request.nodeId });
    if (resolved == null) return { outcome: 'rejected' };
    const reordered = reorderDvtSubstraitStructuredFieldChildren(resolved.draft, {
      parentFieldId: args.request.parentFieldId,
      fieldId: args.request.fieldId,
      targetFieldId: args.request.targetFieldId,
      placement: args.request.placement,
    });
    if (reordered === resolved.draft) return { outcome: 'rejected' };
    const node = applyDvtSubstraitSemanticDocument(
      resolved.target,
      encodeDvtSubstraitStructuredFieldDocument(reordered)
    );
    return {
      outcome: 'applied',
      draftSession: canvasDraftSession.workingSet.upsertNode(args.draftSession, node),
    };
  } catch {
    return { outcome: 'rejected' };
  }
}
