import { useMemo } from 'react';

import { serializeWorkspaceGraphDraft } from './canvasDraftSession';
import {
  buildCurrentDraftPayload,
  isCurrentDraftProjectable,
  type CanvasDraftLifecycleGraphNode,
} from './canvasDraftLifecycleSnapshot';
import type { CanvasDraftSession } from './canvasDraftSession';

export function useCanvasCurrentDraftPayload(
  graphNodes: CanvasDraftLifecycleGraphNode[],
  draftSession: CanvasDraftSession
) {
  const currentDraftPayload = useMemo(
    () => buildCurrentDraftPayload(graphNodes, draftSession),
    [draftSession, graphNodes]
  );
  const currentDraftPayloadSignature = useMemo(
    () => serializeWorkspaceGraphDraft(currentDraftPayload),
    [currentDraftPayload]
  );
  const canPersistCurrentDraft = useMemo(
    () => isCurrentDraftProjectable(currentDraftPayload, draftSession),
    [currentDraftPayload, draftSession]
  );

  return {
    currentDraftPayload,
    currentDraftPayloadSignature,
    canPersistCurrentDraft,
  };
}
