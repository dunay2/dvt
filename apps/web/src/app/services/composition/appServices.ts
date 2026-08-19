/** Owned concern: assemble web application ports at the composition root. */
import type { CapabilitiesPort } from '../../ports/capabilities';
import type { ICostAttributionSummaryPort } from '../../ports/cost';
import type { IGraphDbtWorkspaceArtifactPublicationCommandPort } from '../../ports/graphDbtWorkspaceArtifactPublication';
import type { IGraphDbtModelCompilationQueryPort } from '../../ports/graphDbtModelCompilation';
import type { FrontendOperabilitySink } from '../../ports/frontendOperability';
import type { IPlansPort } from '../../ports/plans';
import type { IRunsPort } from '../../ports/runs';
import type { SessionContextPort } from '../../ports/sessionContext';
import type { ShellFeedbackPort } from '../../ports/shellFeedback';
import type { WorkspaceScopeSelectionPort } from '../../ports/workspaceScopeSelection';
import type {
  IWarehouseSourceImportPort,
  IWarehouseSourceDataSampleQueryPort,
  IWorkspaceAdminReadPort,
  IWorkspaceDiffQueryPort,
  IWorkspaceFileContentCommandPort,
  IWorkspaceFileHistoryQueryPort,
  IWorkspaceFilesQueryPort,
  IWorkspaceGraphSnapshotQueryPort,
  IWorkspacePluginCatalogQueryPort,
} from '../../ports/workspace';
import type { IWorkspaceGraphDraftAuthoringPort } from '../../ports/workspaceGraphDraftAuthoring';
import type { IDbtProjectGraphQueryPort } from '../../ports/dbtProjectGraph';
import type { IDbtProjectImportPort } from '../../ports/dbtProjectImport';
import type { IDbtYamlDescriptionEditPort } from '../../ports/dbtYamlDescriptionEdit';
import { createApiClient, type ApiClient } from '../api/createApiClient';
import { createCapabilitiesPort } from '../capabilities/capabilitiesPort';
import { createApiCostAttributionSummaryPort } from '../cost/costService.api';
import { createToastShellFeedbackPort } from '../feedback/shellFeedbackPort';
import { createConsoleFrontendOperabilitySink } from '../operability/consoleFrontendOperabilitySink';
import {
  createFrontendOperabilityTransitionRecorder,
  type FrontendOperabilityTransitionRecorder,
} from '../operability/frontendOperabilityRecorder';
import { createPlansService } from '../plans/plansService';
import { createRunsService } from '../runs/runsService';
import { createSessionContextPort } from '../session/sessionContextPort';
import { createWorkspaceScopeSelectionPort } from '../session/workspaceScopeSelectionPort';
import { createApiWorkspaceGraphDraftAuthoringPort } from '../workspace/workspaceGraphDraftAuthoring.api';
import { createApiDbtProjectGraphQueryPort } from '../dbtProject/dbtProjectGraph.api';
import { createApiDbtProjectImportPort } from '../dbtProject/dbtProjectImport.api';
import { createApiDbtYamlDescriptionEditPort } from '../dbtProject/dbtYamlDescriptionEdit.api';
import { createApiGraphDbtWorkspaceArtifactPublicationCommandPort } from '../dbtProject/graphDbtWorkspaceArtifactPublication.api';
import { createApiGraphDbtModelCompilationQueryPort } from '../dbtProject/graphDbtModelCompilation.api';
import { createWorkspacePorts } from '../workspace/workspacePorts';

export interface AppServices {
  readonly apiClient: ApiClient;
  readonly workspaceGraphSnapshotQuery: IWorkspaceGraphSnapshotQueryPort;
  readonly workspaceFilesQuery: IWorkspaceFilesQueryPort;
  readonly workspaceFileHistoryQuery: IWorkspaceFileHistoryQueryPort;
  readonly workspaceDiffQuery: IWorkspaceDiffQueryPort;
  readonly workspacePluginCatalogQuery: IWorkspacePluginCatalogQueryPort;
  readonly workspaceAdminRead: IWorkspaceAdminReadPort;
  readonly warehouseSourceImport: IWarehouseSourceImportPort;
  readonly warehouseSourceDataSampleQuery: IWarehouseSourceDataSampleQueryPort;
  readonly workspaceFileContentCommand: IWorkspaceFileContentCommandPort;
  readonly graphDbtWorkspaceArtifactPublicationCommand: IGraphDbtWorkspaceArtifactPublicationCommandPort;
  readonly graphDbtModelCompilationQuery: IGraphDbtModelCompilationQueryPort;
  readonly workspaceGraphDraftAuthoringPort: IWorkspaceGraphDraftAuthoringPort;
  readonly dbtProjectGraphQueryPort: IDbtProjectGraphQueryPort;
  readonly dbtProjectImportPort: IDbtProjectImportPort;
  readonly dbtYamlDescriptionEditPort: IDbtYamlDescriptionEditPort;
  readonly runsService: IRunsPort;
  readonly plansService: IPlansPort;
  readonly costAttributionSummaryPort: ICostAttributionSummaryPort;
  readonly capabilitiesPort: CapabilitiesPort;
  readonly sessionContext: SessionContextPort;
  readonly workspaceScopeSelection: WorkspaceScopeSelectionPort;
  readonly shellFeedback: ShellFeedbackPort;
  readonly frontendOperabilityTransitionRecorder: FrontendOperabilityTransitionRecorder;
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
  readonly warehouseSourceDataSampleQuery?: IWarehouseSourceDataSampleQueryPort;
  readonly workspaceFileContentCommand?: IWorkspaceFileContentCommandPort;
  readonly graphDbtWorkspaceArtifactPublicationCommand?: IGraphDbtWorkspaceArtifactPublicationCommandPort;
  readonly graphDbtModelCompilationQuery?: IGraphDbtModelCompilationQueryPort;
  readonly workspaceGraphDraftAuthoringPort?: IWorkspaceGraphDraftAuthoringPort;
  readonly dbtProjectGraphQueryPort?: IDbtProjectGraphQueryPort;
  readonly dbtProjectImportPort?: IDbtProjectImportPort;
  readonly dbtYamlDescriptionEditPort?: IDbtYamlDescriptionEditPort;
  readonly runsService?: IRunsPort;
  readonly plansService?: IPlansPort;
  readonly costAttributionSummaryPort?: ICostAttributionSummaryPort;
  readonly capabilitiesPort?: CapabilitiesPort;
  readonly sessionContext?: SessionContextPort;
  readonly workspaceScopeSelection?: WorkspaceScopeSelectionPort;
  readonly shellFeedback?: ShellFeedbackPort;
  readonly frontendOperabilitySink?: FrontendOperabilitySink;
}

export function buildAppServices(overrides: AppServicesOverrides = {}): AppServices {
  const apiClient = overrides.apiClient ?? createApiClient();
  const frontendOperabilitySink =
    overrides.frontendOperabilitySink ?? createConsoleFrontendOperabilitySink();
  const frontendOperabilityTransitionRecorder =
    createFrontendOperabilityTransitionRecorder(frontendOperabilitySink);
  const sessionContext = overrides.sessionContext ?? createSessionContextPort();
  const workspaceScopeSelection =
    overrides.workspaceScopeSelection ?? createWorkspaceScopeSelectionPort();
  const workspacePorts = createWorkspacePorts(apiClient, frontendOperabilitySink);
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
  const warehouseSourceDataSampleQuery =
    overrides.warehouseSourceDataSampleQuery ?? workspacePorts.warehouseSourceDataSampleQuery;
  const workspaceFileContentCommand =
    overrides.workspaceFileContentCommand ?? workspacePorts.workspaceFileContentCommand;
  const graphDbtWorkspaceArtifactPublicationCommand =
    overrides.graphDbtWorkspaceArtifactPublicationCommand ??
    createApiGraphDbtWorkspaceArtifactPublicationCommandPort(apiClient);
  const graphDbtModelCompilationQuery =
    overrides.graphDbtModelCompilationQuery ??
    createApiGraphDbtModelCompilationQueryPort(apiClient);
  const workspaceGraphDraftAuthoringPort =
    overrides.workspaceGraphDraftAuthoringPort ??
    createApiWorkspaceGraphDraftAuthoringPort(apiClient);
  const dbtProjectGraphQueryPort =
    overrides.dbtProjectGraphQueryPort ?? createApiDbtProjectGraphQueryPort(apiClient);
  const dbtProjectImportPort =
    overrides.dbtProjectImportPort ?? createApiDbtProjectImportPort(apiClient);
  const dbtYamlDescriptionEditPort =
    overrides.dbtYamlDescriptionEditPort ?? createApiDbtYamlDescriptionEditPort(apiClient);

  return {
    apiClient,
    workspaceGraphSnapshotQuery,
    workspaceFilesQuery,
    workspaceFileHistoryQuery,
    workspaceDiffQuery,
    workspacePluginCatalogQuery,
    workspaceAdminRead,
    warehouseSourceImport,
    warehouseSourceDataSampleQuery,
    workspaceFileContentCommand,
    graphDbtWorkspaceArtifactPublicationCommand,
    graphDbtModelCompilationQuery,
    workspaceGraphDraftAuthoringPort,
    dbtProjectGraphQueryPort,
    dbtProjectImportPort,
    dbtYamlDescriptionEditPort,
    runsService: overrides.runsService ?? createRunsService(apiClient, { sessionContext }),
    plansService: overrides.plansService ?? createPlansService(apiClient),
    costAttributionSummaryPort:
      overrides.costAttributionSummaryPort ?? createApiCostAttributionSummaryPort(apiClient),
    capabilitiesPort: overrides.capabilitiesPort ?? createCapabilitiesPort(apiClient),
    sessionContext,
    workspaceScopeSelection,
    shellFeedback: overrides.shellFeedback ?? createToastShellFeedbackPort(),
    frontendOperabilityTransitionRecorder,
  };
}
