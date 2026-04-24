/** Owned concern: declare the lifecycle vocabulary for Canvas draft bootstrapping, persistence, and save-attempt coordination. */
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import type { WorkspaceScope } from '../../ports/sessionContext';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type {
  CanvasAuthoringRuntimePreviewProvenanceConfig,
  CanvasNodePositions,
} from './canvasAuthoringRuntime.types';
import type { CanvasDraftQueryCache } from './canvasDraftQueryCache';
import type { CanvasDraftRepository } from './canvasDraftRepository';
import type { CanvasDraftReadModel } from './canvasDraftReadModel';
import type { CanvasDraftSession } from './canvasDraftSession';
import type {
  CanvasDraftLifecycleCanonicalSnapshot,
  CanvasDraftLifecycleGraphNode,
} from './canvasDraftLifecycleSnapshot';

export type GraphAuthorityQueryState = {
  isPending: boolean;
  isError: boolean;
  error?: unknown;
};

export type GraphDraftQueryState = {
  data: CanvasDraftReadModel | undefined;
  isPending: boolean;
  isError: boolean;
};

export type DraftSaveStatus = 'idle' | 'saving' | 'saved';

export type DraftAttemptRefs = {
  saveDebounceTimerRef: MutableRefObject<ReturnType<typeof globalThis.setTimeout> | null>;
  lastSavedSignatureRef: MutableRefObject<string | null>;
  saveAttemptGenerationRef: MutableRefObject<number>;
  nextSaveAttemptIdRef: MutableRefObject<number>;
  activeSaveAttemptRef: MutableRefObject<{ id: number; generation: number } | null>;
};

export type CanvasCurrentDraftPayloadDto = {
  graphNodes: CanvasDraftLifecycleGraphNode[];
  draftSession: CanvasDraftSession;
  canvasDocument: NonNullable<CanvasDraftReadModel['record']>['draft']['canvas'] | null;
  canonicalNodes: readonly CanonicalNode[];
  canonicalEdges: readonly CanonicalEdge[];
  workspaceScope: WorkspaceScope;
  previewProvenanceConfig: CanvasAuthoringRuntimePreviewProvenanceConfig;
};

export type CanvasDraftLifecycleBaselineDto = {
  draftRepository: CanvasDraftRepository;
  graphDraftQuery: GraphDraftQueryState;
  draftQueryCache: CanvasDraftQueryCache;
  graphAuthorityQuery: GraphAuthorityQueryState;
  workspaceLayoutKey: string;
};

export type CanvasDraftLifecycleSessionDto = {
  draftSession: CanvasDraftSession;
  setDraftSession: Dispatch<SetStateAction<CanvasDraftSession>>;
  canonicalSnapshot: CanvasDraftLifecycleCanonicalSnapshot;
  setCanvasNodePositions: (
    workspaceLayoutKey: string,
    positions: CanvasNodePositions
  ) => void;
};

export type CanvasDraftLifecycleProjectionDto = {
  graphNodes: CanvasDraftLifecycleGraphNode[];
  canonicalNodes: CanonicalNode[];
  canonicalEdges: CanonicalEdge[];
  workspaceScope: WorkspaceScope;
  previewProvenanceConfig: CanvasAuthoringRuntimePreviewProvenanceConfig;
};

export type CanvasDraftLifecyclePolicyDto = {
  canPersistGraphDraft: boolean;
};

export type CanvasDraftLifecycleDto = {
  baseline: CanvasDraftLifecycleBaselineDto;
  session: CanvasDraftLifecycleSessionDto;
  projection: CanvasDraftLifecycleProjectionDto;
  policy: CanvasDraftLifecyclePolicyDto;
};

export type CanvasDraftLifecycle = {
  draftSaveStatus: DraftSaveStatus;
  reloadLatestDraft: () => void;
  handleCreateCanvasDocument: (command: { kind: string; title: string }) => Promise<void>;
};
