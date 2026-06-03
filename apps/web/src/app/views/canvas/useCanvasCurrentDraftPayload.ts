/** Owned concern: derive the current Canvas authoring draft aggregate and persistence posture. */
import { useMemo } from 'react';

import {
  canPersistWorkspaceGraphAuthoringDraft,
  serializeCanvasDraftAuthoringSignature,
} from './canvasDraftAuthoring';
import {
  buildCurrentDraftPayload,
  isCurrentDraftProjectable,
} from './canvasDraftLifecycleSnapshot';
import type { CanvasCurrentDraftPayloadDto } from './canvasDraftLifecycle.types';

export function useCanvasCurrentDraftPayload({
  graphNodes,
  draftSession,
  canvasDocument,
  baselineDraft,
  canonicalNodes,
  canonicalEdges,
}: CanvasCurrentDraftPayloadDto) {
  const currentDraftPayload = useMemo(
    () =>
      buildCurrentDraftPayload(
        graphNodes,
        draftSession,
        canvasDocument ?? { kind: '', title: '' },
        baselineDraft,
        canonicalNodes,
        canonicalEdges
      ),
    [baselineDraft, canvasDocument, canonicalEdges, canonicalNodes, draftSession, graphNodes]
  );
  const currentDraftPayloadSignature = useMemo(
    () => serializeCanvasDraftAuthoringSignature(currentDraftPayload),
    [currentDraftPayload]
  );
  const canPersistCurrentDraft = useMemo(
    () =>
      isCurrentDraftProjectable(currentDraftPayload, draftSession) &&
      canPersistWorkspaceGraphAuthoringDraft(currentDraftPayload),
    [currentDraftPayload, draftSession]
  );

  return {
    currentDraftPayload,
    currentDraftPayloadSignature,
    canPersistCurrentDraft,
  };
}
