/** Owned concern: apply structured-field authoring through ConfigureCanvasDvtNode. */
import type { CanonicalNode } from '../../types/canonical';
import { createCanvasColumnOutputId } from './canvasColumnMappingModel';
import { canvasDraftSession, type CanvasDraftSession } from './canvasDraftSession';
import {
  decodeDvtSubstraitProjectionDocument,
  resolveDvtSubstraitProjectionEntry,
} from './canvasDvtSubstraitProjection';
import { encodeDvtSubstraitStructuredFieldDocument } from './canvasDvtSubstraitStructuredField';
import { composeDvtSubstraitProjectionFields } from './canvasDvtSubstraitStructuredFieldMutation';
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

function nodeCatalog(
  draftSession: CanvasDraftSession,
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>
): Map<string, CanonicalNode> {
  const nodes = new Map(canonicalNodesById);
  Object.values(draftSession.localNodeCatalog ?? {}).forEach((node) => nodes.set(node.id, node));
  return nodes;
}

export function applyCanvasStructuredField(args: {
  draftSession: CanvasDraftSession;
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>;
  request: CanvasStructuredFieldRequest;
}): CanvasStructuredFieldResult {
  const nodes = nodeCatalog(args.draftSession, args.canonicalNodesById);
  const target = nodes.get(args.request.nodeId);
  if (target?.pluginId !== 'dvt' || target.kind !== 'dvt:transform') {
    return { outcome: 'rejected' };
  }
  try {
    const authority = readDvtTransformAuthoringAuthority(target);
    if (authority?.mode !== 'substrait') return { outcome: 'rejected' };
    const draft = decodeDvtSubstraitProjectionDocument(authority.semanticDocument);
    if (
      resolveDvtSubstraitProjectionEntry({
        targetNode: target,
        nodes: [...nodes.values()],
        edges: args.draftSession.workingSet.visibleEdges,
        draft,
      }) == null
    ) {
      return { outcome: 'rejected' };
    }
    const composed = composeDvtSubstraitProjectionFields(draft, {
      draggedFieldId: args.request.draggedFieldId,
      targetFieldId: args.request.targetFieldId,
      parentFieldId: createCanvasColumnOutputId(args.request.parentName.trim()),
      parentName: args.request.parentName,
    });
    if (composed === draft) return { outcome: 'rejected' };
    const node = applyDvtSubstraitSemanticDocument(
      target,
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
