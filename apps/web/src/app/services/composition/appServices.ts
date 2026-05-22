/** Owned concern: assemble web application ports at the composition root. */
import type { CapabilitiesPort } from '../../ports/capabilities';
import type { IPlansPort } from '../../ports/plans';
import type { IRunsPort } from '../../ports/runs';
import type { SessionContextPort } from '../../ports/sessionContext';
import type { ShellFeedbackPort } from '../../ports/shellFeedback';
import type {
  IWarehouseSourceImportPort,
  IWorkspaceAdminReadPort,
  IWorkspaceDiffQueryPort,
  IWorkspaceFileContentCommandPort,
  IWorkspaceFileHistoryQueryPort,
  IWorkspaceFilesQueryPort,
  IWorkspaceGraphSnapshotQueryPort,
  IWorkspacePluginCatalogQueryPort,
} from '../../ports/workspace';
import type { IWorkspaceGraphDraftAuthoringPort } from '../../ports/workspaceGraphDraftAuthoring';
import { createApiClient, type ApiClient } from '../api/createApiClient';
import { createCapabilitiesPort } from '../capabilities/capabilitiesPort';
import { resolveDataSource, type DataSourceMode } from '../config/dataSource';
import { setRuntimeDataSourceMode } from '../config/runtimeDataSourceMode';
import { createToastShellFeedbackPort } from '../feedback/shellFeedbackPort';
import { createPlansService } from '../plans/plansService';
import { createRunsService } from '../runs/runsService';
import { createSessionContextPort } from '../session/sessionContextPort';
import { createApiWorkspaceGraphDraftAuthoringPort } from '../workspace/workspaceGraphDraftAuthoring.api';
import { createWorkspacePorts } from '../workspace/workspacePorts';

export interface AppServices {
  readonly dataSourceMode: DataSourceMode;
  readonly apiClient: ApiClient;
  readonly workspaceGraphSnapshotQuery: IWorkspaceGraphSnapshotQueryPort;
  readonly workspaceFilesQuery: IWorkspaceFilesQueryPort;
  readonly workspaceFileHistoryQuery: IWorkspaceFileHistoryQueryPort;
  readonly workspaceDiffQuery: IWorkspaceDiffQueryPort;
  readonly workspacePluginCatalogQuery: IWorkspacePluginCatalogQueryPort;
  readonly workspaceAdminRead: IWorkspaceAdminReadPort;
  readonly warehouseSourceImport: IWarehouseSourceImportPort;
  readonly workspaceFileContentCommand: IWorkspaceFileContentCommandPort;
  readonly workspaceGraphDraftAuthoringPort: IWorkspaceGraphDraftAuthoringPort;
  readonly runsService: IRunsPort;
  readonly plansService: IPlansPort;
  readonly capabilitiesPort: CapabilitiesPort;
  readonly sessionContext: SessionContextPort;
  readonly shellFeedback: ShellFeedbackPort;
}

export interface AppServicesOverrides {
  readonly apiClient?: ApiClient;
  readonly workspaceGraphSnapshotQuery?: IWorkspaceGraphSnapshotQueryPort;
  readonly workspaceFilesQuery?: IWorkspaceFilesQueryPort;
  readonly workspaceFileHistoryQuery?: IWorkspaceFileHistoryQueryPort;
  readonly workspaceDiffQuery?: IWorkspaceDiffQueryPort;
  readonly workspacePluginCatalogQuery?: IWorkspacePluginCatalogQueryPort;
  readonly workspaceAdminRead?: IWorkspaceAdminReadPort;
  readonly warehouseSourceImport?: IWarehouseSourceImportPort;
  readonly workspaceFileContentCommand?: IWorkspaceFileContentCommandPort;
  readonly workspaceGraphDraftAuthoringPort?: IWorkspaceGraphDraftAuthoringPort;
  readonly runsService?: IRunsPort;
  readonly plansService?: IPlansPort;
  readonly capabilitiesPort?: CapabilitiesPort;
  readonly sessionContext?: SessionContextPort;
  readonly shellFeedback?: ShellFeedbackPort;
}

export function buildAppServices(overrides: AppServicesOverrides = {}): AppServices {
  const dataSourceMode = resolveDataSource();
  setRuntimeDataSourceMode(dataSourceMode);
  const apiClient = overrides.apiClient ?? createApiClient();
  const sessionContext = overrides.sessionContext ?? createSessionContextPort();
  const workspacePorts = createWorkspacePorts(apiClient);
  const workspaceGraphSnapshotQuery =
    overrides.workspaceGraphSnapshotQuery ?? workspacePorts.workspaceGraphSnapshotQuery;
  const workspaceFilesQuery = overrides.workspaceFilesQuery ?? workspacePorts.workspaceFilesQuery;
  const workspaceFileHistoryQuery =
    overrides.workspaceFileHistoryQuery ?? workspacePorts.workspaceFileHistoryQuery;
  const workspaceDiffQuery = overrides.workspaceDiffQuery ?? workspacePorts.workspaceDiffQuery;
  const workspacePluginCatalogQuery =
    overrides.workspacePluginCatalogQuery ?? workspacePorts.workspacePluginCatalogQuery;
  const workspaceAdminRead = overrides.workspaceAdminRead ?? workspacePorts.workspaceAdminRead;
  const warehouseSourceImport =
    overrides.warehouseSourceImport ?? workspacePorts.warehouseSourceImport;
  const workspaceFileContentCommand =
    overrides.workspaceFileContentCommand ?? workspacePorts.workspaceFileContentCommand;
  const workspaceGraphDraftAuthoringPort =
    overrides.workspaceGraphDraftAuthoringPort ??
    createApiWorkspaceGraphDraftAuthoringPort(apiClient);

  return {
    dataSourceMode,
    apiClient,
    workspaceGraphSnapshotQuery,
    workspaceFilesQuery,
    workspaceFileHistoryQuery,
    workspaceDiffQuery,
    workspacePluginCatalogQuery,
    workspaceAdminRead,
    warehouseSourceImport,
    workspaceFileContentCommand,
    workspaceGraphDraftAuthoringPort,
    runsService: overrides.runsService ?? createRunsService(apiClient, { sessionContext }),
    plansService: overrides.plansService ?? createPlansService(apiClient),
    capabilitiesPort: overrides.capabilitiesPort ?? createCapabilitiesPort(apiClient),
    sessionContext,
    shellFeedback: overrides.shellFeedback ?? createToastShellFeedbackPort(),
  };
}
