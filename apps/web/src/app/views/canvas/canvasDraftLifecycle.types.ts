/** Owned concern: declare the lifecycle vocabulary for Canvas draft bootstrapping, persistence, and save-attempt coordination. */
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { WorkspaceGraphAuthoringDraft } from '@dvt/contracts';

import type { WorkspaceScope } from '../../ports/sessionContext';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type {
  CanvasAuthoringRuntimePreviewProvenanceConfig,
  CanvasNodePositions,
} from './canvasAuthoringRuntime.types';
import type { CanvasDraftQueryCache } from './canvasDraftQueryCache';
import type { CanvasDraftRepository } from './canvasDraftRepository';
import type { CanvasAuthoringDraftReadModel } from './canvasDraftReadModel';
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
  data: CanvasAuthoringDraftReadModel | undefined;
  isPending: boolean;
  isError: boolean;
};

export type DraftSaveStatus = 'idle' | 'saving' | 'saved' | 'failed';

export type DraftAttemptRefs = {
  saveDebounceTimerRef: MutableRefObject<ReturnType<typeof globalThis.setTimeout> | null>;
  lastSavedSignatureRef: MutableRefObject<string | null>;
  lastFailedSignatureRef: MutableRefObject<string | null>;
  saveAttemptGenerationRef: MutableRefObject<number>;
  nextSaveAttemptIdRef: MutableRefObject<number>;
  activeSaveAttemptRef: MutableRefObject<{ id: number; generation: number } | null>;
};

export type CanvasCurrentDraftPayloadDto = {
  graphNodes: CanvasDraftLifecycleGraphNode[];
  draftSession: CanvasDraftSession;
  canvasDocument: NonNullable<CanvasAuthoringDraftReadModel['record']>['draft']['canvas'] | null;
  baselineDraft: WorkspaceGraphAuthoringDraft | null;
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
  persistedNodePositions: CanvasNodePositions;
  setCanvasNodePositions: (workspaceLayoutKey: string, positions: CanvasNodePositions) => void;
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

export type CanvasCreateCanvasDocumentCommand = {
  kind: string;
  title: string;
  mode?: 'create_first' | 'replace_current' | 'create_new';
};

export type CanvasCreateCanvasDocumentCommandDto = {
  command: CanvasCreateCanvasDocumentCommand;
  currentDraftPayload: WorkspaceGraphAuthoringDraft;
  draftRepository: CanvasDraftRepository;
  graphDraftQuery: GraphDraftQueryState;
  draftQueryCache: CanvasDraftQueryCache;
  canPersistGraphDraft: boolean;
  setDraftSession: Dispatch<SetStateAction<CanvasDraftSession>>;
  setDraftSaveStatus: Dispatch<SetStateAction<DraftSaveStatus>>;
  lastSavedSignatureRef: { current: string | null };
};

export type CanvasProjectCanvasLifecycleCommandDto = {
  currentDraftPayload: WorkspaceGraphAuthoringDraft;
  draftRepository: CanvasDraftRepository;
  graphDraftQuery: GraphDraftQueryState;
  draftQueryCache: CanvasDraftQueryCache;
  canPersistGraphDraft: boolean;
  setDraftSession: Dispatch<SetStateAction<CanvasDraftSession>>;
  setDraftSaveStatus: Dispatch<SetStateAction<DraftSaveStatus>>;
  lastSavedSignatureRef: { current: string | null };
};

export type CanvasImportProjectSnapshotCommandDto = {
  file: File;
  canImportProjectSnapshot: boolean;
  draftRepository: CanvasDraftRepository;
  graphDraftQuery: GraphDraftQueryState;
  draftQueryCache: CanvasDraftQueryCache;
  setDraftSession: Dispatch<SetStateAction<CanvasDraftSession>>;
  setDraftSaveStatus: Dispatch<SetStateAction<DraftSaveStatus>>;
  refs: DraftAttemptRefs;
  invalidateInFlightSaveAttempt: () => void;
};

export type CanvasDraftLifecycleDto = {
  baseline: CanvasDraftLifecycleBaselineDto;
  session: CanvasDraftLifecycleSessionDto;
  projection: CanvasDraftLifecycleProjectionDto;
  policy: CanvasDraftLifecyclePolicyDto;
};

export type CanvasDraftLifecycle = {
  draftSaveStatus: DraftSaveStatus;
  invalidateInFlightSaveAttempt: () => void;
  flushDraftForExecution: () => Promise<
    | {
        ok: true;
        canonicalNodes: readonly CanonicalNode[];
        canonicalEdges: readonly CanonicalEdge[];
        workspaceNodeIds: readonly string[];
      }
    | {
        ok: false;
        message: string;
      }
  >;
  reloadLatestDraft: () => void;
  handleCreateCanvasDocument: (command: CanvasCreateCanvasDocumentCommand) => Promise<void>;
  handleSelectCanvasDocument: (canvasId: string) => Promise<void>;
  canCreateCanvasDocument: boolean;
  canExportProjectSnapshot: boolean;
  canImportProjectSnapshot: boolean;
  handleExportProjectSnapshot: () => void;
  handleImportProjectSnapshotFile: (file: File) => Promise<void>;
};
