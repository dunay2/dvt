import type { WorkspaceGraphAuthoringEdgeExecutionGate } from '@dvt/contracts';
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasAuthoringDraftRecord } from './canvasDraftReadModel';

export type CanvasDraftSyncState =
  'bootstrapping' | 'editing' | 'saving' | 'conflict' | 'missing_remote';

export type CanvasDraftEdge = {
  sourceId: string;
  targetId: string;
  executionGate?: WorkspaceGraphAuthoringEdgeExecutionGate;
};

export type CanvasDraftBaseline = {
  record: CanvasAuthoringDraftRecord | null;
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
  savingWorkingSet?: CanvasDraftWorkingSet;
  savingBaseRevision?: string | null;
  savingLocalNodeCatalog?: Record<string, CanonicalNode>;
  localNodeCatalog?: Record<string, CanonicalNode>;
};

export type BootstrapSessionArgs = {
  remoteDraft: CanvasAuthoringDraftRecord | null;
  canonicalNodeIds: string[];
  canonicalEdges: CanvasDraftEdge[];
};

export type CanonicalSnapshotArgs = {
  canonicalNodeIds: string[];
  canonicalEdges: CanvasDraftEdge[];
};
