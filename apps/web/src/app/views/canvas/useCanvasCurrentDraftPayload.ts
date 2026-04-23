import { useMemo } from 'react';

import { canvasDraftSession } from './canvasDraftSession';
import {
  canPersistCanvasDraftAuthoringPayload,
  type CanvasDraftAuthoringPayload,
} from './canvasDraftAuthoring';
import {
  buildCurrentDraftPayload,
  isCurrentDraftProjectable,
  type CanvasDraftLifecycleGraphNode,
} from './canvasDraftLifecycleSnapshot';
import type { CanvasDraftSession } from './canvasDraftSession';
import type { WorkspaceScope } from '../../ports/sessionContext';
import type { WorkspaceBootstrapConfig } from '../../services/config/workspaceConfig';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';

export function useCanvasCurrentDraftPayload(
  graphNodes: CanvasDraftLifecycleGraphNode[],
  draftSession: CanvasDraftSession,
  canvasDocument: CanvasDraftAuthoringPayload['projectedDraft']['canvas'] | null,
  canonicalNodes: readonly CanonicalNode[],
  canonicalEdges: readonly CanonicalEdge[],
  workspaceScope: WorkspaceScope,
  previewProvenanceConfig: Pick<WorkspaceBootstrapConfig, 'gitBranch' | 'gitSha' | 'gitRepo'>
) {
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
