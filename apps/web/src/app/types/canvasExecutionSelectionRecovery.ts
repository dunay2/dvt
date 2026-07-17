import type { CanvasExecutionSelectionIntent } from './canvasExecutionSelection';

export type CanvasExecutionSelectionRecoveryStrategy =
  'discard_unavailable' | 'use_workspace_scope' | 'refresh_analysis';

export type CanvasExecutionSelectionRecoveryReceipt = Readonly<{
  rail: 'RecoverCanvasExecutionSelection';
  strategy: CanvasExecutionSelectionRecoveryStrategy;
  affectedNodeIds: readonly string[];
  retainedNodeIds: readonly string[];
  resultingMode: CanvasExecutionSelectionIntent['mode'];
}>;

export type CanvasExecutionSelectionRecoveryFailure = Readonly<{
  rail: 'RecoverCanvasExecutionSelection';
  strategy: 'refresh_analysis';
  code: 'authority_refresh_failed';
  detail: string | null;
}>;

export type CanvasExecutionSelectionRecoveryReadModel = Readonly<{
  queryRail: 'CollectCanvasExecutionSelection';
  commandRail: 'RecoverCanvasExecutionSelection';
  status: 'ready' | 'blocked';
  selectionMode: CanvasExecutionSelectionIntent['mode'];
  requestedRootNodeIds: readonly string[];
  unavailableRootNodeIds: readonly string[];
  nonExecutableRootNodeIds: readonly string[];
  derivedDependencyNodeIds: readonly string[];
  admittedScopeNodeIds: readonly string[];
  lastPreviewRevision: string | null;
  canDiscardUnavailable: boolean;
  canUseWorkspaceScope: boolean;
  canRefreshAnalysis: boolean;
  pendingStrategy: CanvasExecutionSelectionRecoveryStrategy | null;
  receipt: CanvasExecutionSelectionRecoveryReceipt | null;
  failure: CanvasExecutionSelectionRecoveryFailure | null;
}>;

export type CanvasExecutionSelectionRecoveryCommands = Readonly<{
  discardUnavailable: () => void;
  useWorkspaceScope: () => void;
  refreshAnalysis: () => void;
}>;
