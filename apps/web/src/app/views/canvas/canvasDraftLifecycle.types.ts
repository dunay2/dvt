import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import type { WorkspaceScope } from '../../ports/sessionContext';
import type { WorkspaceBootstrapConfig } from '../../services/config/workspaceConfig';
import type { WorkspaceGraphDraftRecord } from '../../ports/workspace';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasDraftQueryCache } from './canvasDraftQueryCache';
import type { CanvasDraftRepository } from './canvasDraftRepository';
import type { CanvasDraftSession } from './canvasDraftSession';
import type {
  CanvasDraftLifecycleCanonicalSnapshot,
  CanvasDraftLifecycleGraphNode,
  CanvasDraftLifecycleGraphStrategy,
} from './canvasDraftLifecycleSnapshot';

export type GraphSnapshotQueryState = {
  isPending: boolean;
  isError: boolean;
};

export type GraphDraftQueryState = {
  data: WorkspaceGraphDraftRecord | null | undefined;
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

export type UseCanvasDraftLifecycleArgs = {
  draftRepository: CanvasDraftRepository;
  graphDraftQuery: GraphDraftQueryState;
  draftQueryCache: CanvasDraftQueryCache;
  workspaceLayoutKey: string;
  draftSession: CanvasDraftSession;
  setDraftSession: Dispatch<SetStateAction<CanvasDraftSession>>;
  canonicalSnapshot: CanvasDraftLifecycleCanonicalSnapshot;
  graphNodes: CanvasDraftLifecycleGraphNode[];
  canonicalNodes: CanonicalNode[];
  canonicalEdges: CanonicalEdge[];
  graphSnapshotQuery: GraphSnapshotQueryState;
  canPersistGraphDraft: boolean;
  workspaceScope: WorkspaceScope;
  previewProvenanceConfig: Pick<WorkspaceBootstrapConfig, 'gitBranch' | 'gitSha' | 'gitRepo'>;
  setCanvasNodePositions: (
    workspaceLayoutKey: string,
    positions: Record<string, { x: number; y: number }>
  ) => void;
  graphStrategy: CanvasDraftLifecycleGraphStrategy;
};

export type CanvasDraftLifecycle = {
  draftSaveStatus: DraftSaveStatus;
  reloadLatestDraft: () => void;
  adoptCurrentWorkspaceSnapshot: () => void;
};
