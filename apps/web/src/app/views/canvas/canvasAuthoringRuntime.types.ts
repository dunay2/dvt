/** Owned concern: define the public local contract for the Canvas authoring-runtime component. */
import type { WorkspaceScope } from '../../ports/sessionContext';
import type { IWorkspaceGraphDraftAuthoringPort } from '../../ports/workspaceGraphDraftAuthoring';
import type { DataSourceMode } from '../../services/config/dataSource';
import type { WorkspaceBootstrapConfig } from '../../services/config/workspaceConfig';
import type { PlatformHealthSnapshot } from '../../../capabilities/platform-health';

export type CanvasNodePositions = Record<string, { x: number; y: number }>;

export type CanvasAuthoringRuntimePlatformHealthQuery = {
  isPending: boolean;
  isError: boolean;
  data?: PlatformHealthSnapshot;
  error?: unknown;
  failureCount?: number;
  errorUpdatedAt?: number;
};

export type CanvasAuthoringRuntimePreviewProvenanceConfig = Pick<
  WorkspaceBootstrapConfig,
  'gitBranch' | 'gitSha' | 'gitRepo'
>;

export type UseCanvasAuthoringRuntimeArgs = {
  dataSourceMode: DataSourceMode;
  platformHealthQuery: CanvasAuthoringRuntimePlatformHealthQuery;
  workspaceGraphDraftAuthoringPort: IWorkspaceGraphDraftAuthoringPort;
  workspaceLayoutKey: string;
  columnLevelLineageEnabled: boolean;
  persistedNodePositions: CanvasNodePositions;
  selectedNodeIds: string[];
  inspectorNodeId: string | null;
  canPersistGraphDraftTransport: boolean;
  canMutateGraphTransport: boolean;
  workspaceScope: WorkspaceScope;
  previewProvenanceConfig: CanvasAuthoringRuntimePreviewProvenanceConfig;
  setCanvasNodePositions: (workspaceLayoutKey: string, positions: CanvasNodePositions) => void;
};

export type UseCanvasAuthoringRuntimeDraftFlowArgs = Pick<
  UseCanvasAuthoringRuntimeArgs,
  | 'workspaceGraphDraftAuthoringPort'
  | 'workspaceLayoutKey'
  | 'columnLevelLineageEnabled'
  | 'persistedNodePositions'
  | 'workspaceScope'
  | 'previewProvenanceConfig'
  | 'setCanvasNodePositions'
> & {
  canPersistDraftTransport: boolean;
};

export type CanvasAuthoringRuntimeBaselineArgs = Pick<
  UseCanvasAuthoringRuntimeDraftFlowArgs,
  'workspaceGraphDraftAuthoringPort' | 'workspaceLayoutKey'
>;
