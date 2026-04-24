/** Owned concern: derive the current Canvas draft payload and persistence posture from one semantic DTO. */
import { useMemo } from 'react';

import { canvasDraftSession } from './canvasDraftSession';
import {
  canPersistCanvasDraftAuthoringPayload,
  type CanvasDraftAuthoringPayload,
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
  canonicalNodes,
  canonicalEdges,
  workspaceScope,
  previewProvenanceConfig,
}: CanvasCurrentDraftPayloadDto) {
  const currentDraftPayload = useMemo(
    () =>
      buildCurrentDraftPayload(graphNodes, draftSession, canvasDocument ?? { kind: '', title: '' }),
    [canvasDocument, draftSession, graphNodes]
  );
  const currentDraftAuthoringPayload = useMemo<CanvasDraftAuthoringPayload>(
    () => ({
      projectedDraft: currentDraftPayload,
      canonicalNodes,
      canonicalEdges,
      workspaceScope,
      previewProvenanceConfig,
    }),
    [
      canonicalEdges,
      canonicalNodes,
      currentDraftPayload,
      previewProvenanceConfig,
      workspaceScope,
    ]
  );
  const currentDraftPayloadSignature = useMemo(
    () => canvasDraftSession.baseline.serialize(currentDraftPayload),
    [currentDraftPayload]
  );
  const canPersistCurrentDraft = useMemo(
    () =>
      isCurrentDraftProjectable(currentDraftPayload, draftSession) &&
      canPersistCanvasDraftAuthoringPayload(currentDraftAuthoringPayload),
    [currentDraftAuthoringPayload, currentDraftPayload, draftSession]
  );

  return {
    currentDraftPayload: currentDraftAuthoringPayload,
    currentDraftPayloadSignature,
    canPersistCurrentDraft,
  };
}
