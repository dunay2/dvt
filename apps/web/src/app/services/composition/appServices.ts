/** Owned concern: assemble web application ports at the composition root. */
import type { CapabilitiesPort } from '../../ports/capabilities';
import type { ICanvasTransformDataSampleQueryPort } from '../../ports/canvasDataSample';
import type { ICanvasTransformSqlQueryPort } from '../../ports/canvasTransformSql';
import type { ICanvasModelSqlQueryPort } from '../../ports/canvasModelSql';
import type { IWorksheetCanvasModelQueryPort } from '../../ports/worksheetCanvasModel';
import { createWorksheetCanvasModelQuery } from '../canvas/worksheetCanvasModel.api';
import type { ISqlWorksheetPort } from '../../ports/sqlWorksheet';
import { createApiSqlWorksheetPort } from '../sql/sqlWorksheet.api';
import { createApiCanvasModelSqlQueryPort } from '../canvas/canvasModelSql.api';
import { createApiCanvasTransformSqlQueryPort } from '../canvas/canvasTransformSql.api';
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
  IWorkspaceFileVersionCommandPort,
  IWorkspaceFilesQueryPort,
  IWorkspaceFileDirectoryQueryPort,
  IWorkspaceGraphSnapshotQueryPort,
  IWorkspacePluginCatalogQueryPort,
} from '../../ports/workspace';
import type { IWorkspaceGraphDraftAuthoringPort } from '../../ports/workspaceGraphDraftAuthoring';
import type { IDbtProjectGraphQueryPort } from '../../ports/dbtProjectGraph';
import type { IDbtSelectedModelAnalysisQueryPort } from '../../ports/dbtSelectedModelAnalysis';
import type { IDbtProjectImportPort } from '../../ports/dbtProjectImport';
import type { IWorksheetDbtModelCommand } from '../../ports/worksheetDbtModel';
import { createWorksheetDbtModelCommand } from '../dbtProject/worksheetDbtModel.api';
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
import { createApiDbtSelectedModelAnalysisQueryPort } from '../dbtProject/dbtSelectedModelAnalysis.api';
import { createApiDbtProjectImportPort } from '../dbtProject/dbtProjectImport.api';
import { createApiDbtYamlDescriptionEditPort } from '../dbtProject/dbtYamlDescriptionEdit.api';
import { createApiGraphDbtWorkspaceArtifactPublicationCommandPort } from '../dbtProject/graphDbtWorkspaceArtifactPublication.api';
import { createApiGraphDbtModelCompilationQueryPort } from '../dbtProject/graphDbtModelCompilation.api';
import { createWorkspacePorts } from '../workspace/workspacePorts';
import { createApiCanvasTransformDataSampleQueryPort } from '../canvas/canvasTransformDataSample.api';

export interface AppServices {
  readonly apiClient: ApiClient;
  readonly workspaceGraphSnapshotQuery: IWorkspaceGraphSnapshotQueryPort;
  readonly workspaceFilesQuery: IWorkspaceFilesQueryPort;
  readonly workspaceFileDirectoryQuery: IWorkspaceFileDirectoryQueryPort;
  readonly workspaceFileHistoryQuery: IWorkspaceFileHistoryQueryPort;
  readonly workspaceFileVersionCommand: IWorkspaceFileVersionCommandPort;
  readonly workspaceDiffQuery: IWorkspaceDiffQueryPort;
  readonly workspacePluginCatalogQuery: IWorkspacePluginCatalogQueryPort;
  readonly workspaceAdminRead: IWorkspaceAdminReadPort;
  readonly warehouseSourceImport: IWarehouseSourceImportPort;
  readonly warehouseSourceDataSampleQuery: IWarehouseSourceDataSampleQueryPort;
  readonly canvasTransformDataSampleQuery: ICanvasTransformDataSampleQueryPort;
  readonly canvasTransformSqlQuery: ICanvasTransformSqlQueryPort;
  readonly canvasModelSqlQuery: ICanvasModelSqlQueryPort;
  readonly worksheetCanvasModelQuery: IWorksheetCanvasModelQueryPort;
  readonly sqlWorksheet: ISqlWorksheetPort;
  readonly workspaceFileContentCommand: IWorkspaceFileContentCommandPort;
  readonly graphDbtWorkspaceArtifactPublicationCommand: IGraphDbtWorkspaceArtifactPublicationCommandPort;
  readonly graphDbtModelCompilationQuery: IGraphDbtModelCompilationQueryPort;
  readonly workspaceGraphDraftAuthoringPort: IWorkspaceGraphDraftAuthoringPort;
  readonly dbtProjectGraphQueryPort: IDbtProjectGraphQueryPort;
  readonly dbtSelectedModelAnalysisQueryPort: IDbtSelectedModelAnalysisQueryPort;
  readonly dbtProjectImportPort: IDbtProjectImportPort;
  readonly worksheetDbtModelCommand: IWorksheetDbtModelCommand;
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
  readonly workspaceFileDirectoryQuery?: IWorkspaceFileDirectoryQueryPort;
  readonly workspaceFileHistoryQuery?: IWorkspaceFileHistoryQueryPort;
  readonly workspaceFileVersionCommand?: IWorkspaceFileVersionCommandPort;
  readonly workspaceDiffQuery?: IWorkspaceDiffQueryPort;
  readonly workspacePluginCatalogQuery?: IWorkspacePluginCatalogQueryPort;
  readonly workspaceAdminRead?: IWorkspaceAdminReadPort;
  readonly warehouseSourceImport?: IWarehouseSourceImportPort;
  readonly warehouseSourceDataSampleQuery?: IWarehouseSourceDataSampleQueryPort;
  readonly canvasTransformDataSampleQuery?: ICanvasTransformDataSampleQueryPort;
  readonly canvasTransformSqlQuery?: ICanvasTransformSqlQueryPort;
  readonly canvasModelSqlQuery?: ICanvasModelSqlQueryPort;
  readonly worksheetCanvasModelQuery?: IWorksheetCanvasModelQueryPort;
  readonly sqlWorksheet?: ISqlWorksheetPort;
  readonly workspaceFileContentCommand?: IWorkspaceFileContentCommandPort;
  readonly graphDbtWorkspaceArtifactPublicationCommand?: IGraphDbtWorkspaceArtifactPublicationCommandPort;
  readonly graphDbtModelCompilationQuery?: IGraphDbtModelCompilationQueryPort;
  readonly workspaceGraphDraftAuthoringPort?: IWorkspaceGraphDraftAuthoringPort;
  readonly dbtProjectGraphQueryPort?: IDbtProjectGraphQueryPort;
  readonly dbtSelectedModelAnalysisQueryPort?: IDbtSelectedModelAnalysisQueryPort;
  readonly dbtProjectImportPort?: IDbtProjectImportPort;
  readonly worksheetDbtModelCommand?: IWorksheetDbtModelCommand;
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

function buildCanvasSqlPorts(
  overrides: AppServicesOverrides,
  apiClient: ApiClient,
  frontendOperabilitySink: FrontendOperabilitySink
) {
  return {
    canvasTransformDataSampleQuery:
      overrides.canvasTransformDataSampleQuery ??
      createApiCanvasTransformDataSampleQueryPort(apiClient, frontendOperabilitySink),
    canvasTransformSqlQuery:
      overrides.canvasTransformSqlQuery ??
      createApiCanvasTransformSqlQueryPort(apiClient, frontendOperabilitySink),
    canvasModelSqlQuery:
      overrides.canvasModelSqlQuery ??
      createApiCanvasModelSqlQueryPort(apiClient, frontendOperabilitySink),
    worksheetCanvasModelQuery:
      overrides.worksheetCanvasModelQuery ?? createWorksheetCanvasModelQuery(apiClient),
    sqlWorksheet: overrides.sqlWorksheet ?? createApiSqlWorksheetPort(apiClient),
  };
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

  return {
    apiClient,
    workspaceGraphSnapshotQuery:
      overrides.workspaceGraphSnapshotQuery ?? workspacePorts.workspaceGraphSnapshotQuery,
    workspaceFilesQuery: overrides.workspaceFilesQuery ?? workspacePorts.workspaceFilesQuery,
    workspaceFileDirectoryQuery:
      overrides.workspaceFileDirectoryQuery ?? workspacePorts.workspaceFileDirectoryQuery,
    workspaceFileHistoryQuery:
      overrides.workspaceFileHistoryQuery ?? workspacePorts.workspaceFileHistoryQuery,
    workspaceFileVersionCommand:
      overrides.workspaceFileVersionCommand ?? workspacePorts.workspaceFileVersionCommand,
    workspaceDiffQuery: overrides.workspaceDiffQuery ?? workspacePorts.workspaceDiffQuery,
    workspacePluginCatalogQuery:
      overrides.workspacePluginCatalogQuery ?? workspacePorts.workspacePluginCatalogQuery,
    workspaceAdminRead: overrides.workspaceAdminRead ?? workspacePorts.workspaceAdminRead,
    warehouseSourceImport: overrides.warehouseSourceImport ?? workspacePorts.warehouseSourceImport,
    warehouseSourceDataSampleQuery:
      overrides.warehouseSourceDataSampleQuery ?? workspacePorts.warehouseSourceDataSampleQuery,
    ...buildCanvasSqlPorts(overrides, apiClient, frontendOperabilitySink),
    workspaceFileContentCommand:
      overrides.workspaceFileContentCommand ?? workspacePorts.workspaceFileContentCommand,
    graphDbtWorkspaceArtifactPublicationCommand:
      overrides.graphDbtWorkspaceArtifactPublicationCommand ??
      createApiGraphDbtWorkspaceArtifactPublicationCommandPort(apiClient),
    graphDbtModelCompilationQuery:
      overrides.graphDbtModelCompilationQuery ??
      createApiGraphDbtModelCompilationQueryPort(apiClient),
    workspaceGraphDraftAuthoringPort:
      overrides.workspaceGraphDraftAuthoringPort ??
      createApiWorkspaceGraphDraftAuthoringPort(apiClient),
    dbtProjectGraphQueryPort:
      overrides.dbtProjectGraphQueryPort ?? createApiDbtProjectGraphQueryPort(apiClient),
    dbtSelectedModelAnalysisQueryPort:
      overrides.dbtSelectedModelAnalysisQueryPort ??
      createApiDbtSelectedModelAnalysisQueryPort(apiClient),
    dbtProjectImportPort:
      overrides.dbtProjectImportPort ?? createApiDbtProjectImportPort(apiClient),
    worksheetDbtModelCommand:
      overrides.worksheetDbtModelCommand ?? createWorksheetDbtModelCommand(apiClient),
    dbtYamlDescriptionEditPort:
      overrides.dbtYamlDescriptionEditPort ?? createApiDbtYamlDescriptionEditPort(apiClient),
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
