/** Owned concern: rebase a stale simple Transform projection onto its sole connected source. */
import { DVT_TRANSFORM_AUTHORING_MODE } from '@dvt/contracts';

import type { CanonicalNode } from '../../types/canonical';
import { resolveCanvasDraftNodes } from './canvasDraftNodeCatalog';
import { canvasDraftSession, type CanvasDraftSession } from './canvasDraftSession';
import {
  applyDvtSubstraitSemanticDocument,
  readDvtTransformAuthoringAuthority,
} from './canvasDvtTransformAuthoringAuthority';
import {
  createDvtSubstraitProjectionDraft,
  decodeDvtSubstraitProjectionDocument,
  encodeDvtSubstraitProjectionDocument,
  inspectDvtSubstraitProjectionDraft,
  resolveDvtSubstraitProjectionSource,
} from './canvasDvtSubstraitProjection';

export function rebaseStaleTransformProjection(args: {
  draftSession: CanvasDraftSession;
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>;
  targetNodeId: string;
}): CanvasDraftSession {
  const nodes = resolveCanvasDraftNodes(args.draftSession, args.canonicalNodesById);
  const targetNode = nodes.find((node) => node.id === args.targetNodeId);
  if (targetNode?.pluginId !== 'dvt' || targetNode.kind !== 'dvt:transform') {
    return args.draftSession;
  }

  const incomingSourceIds = args.draftSession.workingSet.visibleEdges
    .filter((edge) => edge.targetId === targetNode.id)
    .map((edge) => edge.sourceId);
  if (incomingSourceIds.length !== 1) return args.draftSession;

  const sourceNode = nodes.find((node) => node.id === incomingSourceIds[0]);
  const source = sourceNode == null ? null : resolveDvtSubstraitProjectionSource(sourceNode);
  if (source == null) return args.draftSession;

  try {
    const authority = readDvtTransformAuthoringAuthority(targetNode);
    if (authority.mode !== DVT_TRANSFORM_AUTHORING_MODE.substrait) return args.draftSession;
    const inspection = inspectDvtSubstraitProjectionDraft(
      decodeDvtSubstraitProjectionDocument(authority.semanticDocument)
    );
    if (!inspection.ok || inspection.projection.source.nodeId === source.nodeId) {
      return args.draftSession;
    }

    const projection = createDvtSubstraitProjectionDraft({
      source,
      targetNodeId: targetNode.id,
      outputs: source.fields.map((field) => ({
        fieldId: `output:${encodeURIComponent(field.name)}`,
        name: field.name,
        sourceFieldName: field.name,
      })),
    });
    return canvasDraftSession.workingSet.upsertNode(
      args.draftSession,
      applyDvtSubstraitSemanticDocument(
        targetNode,
        encodeDvtSubstraitProjectionDocument(projection)
      )
    );
  } catch {
    return args.draftSession;
  }
}
