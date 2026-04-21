import type { WorkspaceGraphDraftRecord } from '../../ports/workspace';

export type CanvasDraftSyncState =
  | 'bootstrapping'
  | 'editing'
  | 'saving'
  | 'conflict'
  | 'missing_remote';

export type CanvasDraftEdge = { sourceId: string; targetId: string };

export type CanvasDraftBaseline = {
  record: WorkspaceGraphDraftRecord | null;
  signature: string | null;
};

export type CanvasDraftWorkingSet = {
  visibleNodeIds: string[];
  visibleEdges: CanvasDraftEdge[];
  pendingExplicitNodeIds: string[];
};

export type CanvasDraftSession = {
  syncState: CanvasDraftSyncState;
  baseline: CanvasDraftBaseline;
  workingSet: CanvasDraftWorkingSet;
  draftRevision: string | null;
};

export type BootstrapSessionArgs = {
  remoteDraft: WorkspaceGraphDraftRecord | null;
  canonicalNodeIds: string[];
  canonicalEdges: CanvasDraftEdge[];
};

export type CanonicalSnapshotArgs = {
  canonicalNodeIds: string[];
  canonicalEdges: CanvasDraftEdge[];
};
