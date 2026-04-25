/** Owned concern: apply validated route-owned Inspector drafts back into the Canvas draft aggregate. */
import { canvasDraftSession, type CanvasDraftSession } from './canvasDraftSession';
import {
  applyCanvasInspectorNodeDraft,
  hasCanvasInspectorNodeDraftChanges,
} from './canvasInspectorAuthoringModel';
import type { CanvasInspectorNodeDraft } from './canvasInspectorAuthoring.types';
import type { CanonicalNode } from '../../types/canonical';

export function applyCanvasInspectorNodeDraftToSession(args: {
  draftSession: CanvasDraftSession;
  node: CanonicalNode;
  draft: CanvasInspectorNodeDraft;
}): CanvasDraftSession {
  const { draftSession, node, draft } = args;

  if (!hasCanvasInspectorNodeDraftChanges(node, draft)) {
    return draftSession;
  }

  return canvasDraftSession.workingSet.upsertNode(
    draftSession,
    applyCanvasInspectorNodeDraft(node, draft)
  );
}
