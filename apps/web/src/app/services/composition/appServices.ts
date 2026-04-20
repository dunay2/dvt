import type { CapabilitiesPort } from '../../ports/capabilities';
import type { IPlansPort } from '../../ports/plans';
import type { IRunsPort } from '../../ports/runs';
import type { SessionContextPort } from '../../ports/sessionContext';
import type { ShellFeedbackPort } from '../../ports/shellFeedback';
import type { IWorkspacePort } from '../../ports/workspace';
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
import { createMockWorkspaceGraphDraftAuthoringPort } from '../workspace/workspaceGraphDraftAuthoring.mock';
import { createWorkspaceService } from '../workspace/workspaceService';

export interface AppServices {
  readonly dataSourceMode: DataSourceMode;
  readonly apiClient: ApiClient;
  readonly workspaceService: IWorkspacePort;
  readonly workspaceGraphDraftAuthoringPort: IWorkspaceGraphDraftAuthoringPort;
  readonly runsService: IRunsPort;
  readonly plansService: IPlansPort;
  readonly capabilitiesPort: CapabilitiesPort;
  readonly sessionContext: SessionContextPort;
  readonly shellFeedback: ShellFeedbackPort;
}

export interface AppServicesOverrides {
  readonly mode?: DataSourceMode;
  readonly apiClient?: ApiClient;
  readonly workspaceService?: IWorkspacePort;
  readonly workspaceGraphDraftAuthoringPort?: IWorkspaceGraphDraftAuthoringPort;
  readonly runsService?: IRunsPort;
  readonly plansService?: IPlansPort;
  readonly capabilitiesPort?: CapabilitiesPort;
  readonly sessionContext?: SessionContextPort;
  readonly shellFeedback?: ShellFeedbackPort;
}

export function buildAppServices(overrides: AppServicesOverrides = {}): AppServices {
  const dataSourceMode = overrides.mode ?? resolveDataSource();
  setRuntimeDataSourceMode(dataSourceMode);
  const apiClient = overrides.apiClient ?? createApiClient();
  const sessionContext = overrides.sessionContext ?? createSessionContextPort();
  const workspaceService =
    overrides.workspaceService ?? createWorkspaceService(dataSourceMode, apiClient);
  const workspaceGraphDraftAuthoringPort =
    overrides.workspaceGraphDraftAuthoringPort ??
    (dataSourceMode === 'api'
      ? createApiWorkspaceGraphDraftAuthoringPort(apiClient)
      : createMockWorkspaceGraphDraftAuthoringPort({
          workspaceService,
          sessionContext,
        }));

  return {
    dataSourceMode,
    apiClient,
    workspaceService,
    workspaceGraphDraftAuthoringPort,
    runsService:
      overrides.runsService ?? createRunsService(dataSourceMode, apiClient, { sessionContext }),
    plansService: overrides.plansService ?? createPlansService(dataSourceMode, apiClient),
    capabilitiesPort: overrides.capabilitiesPort ?? createCapabilitiesPort(apiClient),
    sessionContext,
    shellFeedback: overrides.shellFeedback ?? createToastShellFeedbackPort(),
  };
}
