import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { createApiClient, type ApiClient } from './api/createApiClient';
import { resolveDataSource, type DataSourceMode } from './config/dataSource';
import { createPlansService, type PlansService } from './plans/plansService';
import { createRunsService, type RunsService } from './runs/runsService';
import { createWorkspaceService, type WorkspaceService } from './workspace/workspaceService';

type AppServicesContextValue = {
  readonly dataSourceMode: DataSourceMode;
  readonly apiClient: ApiClient;
  readonly workspaceService: WorkspaceService;
  readonly runsService: RunsService;
  readonly plansService: PlansService;
};

type AppServicesOverrides = {
  readonly mode?: DataSourceMode;
  readonly apiClient?: ApiClient;
  readonly workspaceService?: WorkspaceService;
  readonly runsService?: RunsService;
  readonly plansService?: PlansService;
};

const AppServicesContext = createContext<AppServicesContextValue | null>(null);

function buildAppServicesContextValue(overrides: AppServicesOverrides = {}): AppServicesContextValue {
  const dataSourceMode = overrides.mode ?? resolveDataSource();
  const apiClient = overrides.apiClient ?? createApiClient();

  return {
    dataSourceMode,
    apiClient,
    workspaceService: overrides.workspaceService ?? createWorkspaceService(dataSourceMode, apiClient),
    runsService: overrides.runsService ?? createRunsService(dataSourceMode, apiClient),
    plansService: overrides.plansService ?? createPlansService(dataSourceMode, apiClient),
  };
}

export function AppServicesProvider({
  children,
  overrides,
}: Readonly<{
  children: ReactNode;
  overrides?: AppServicesOverrides;
}>) {
  const value = useMemo(
    () => buildAppServicesContextValue(overrides),
    [
      overrides?.apiClient,
      overrides?.mode,
      overrides?.plansService,
      overrides?.runsService,
      overrides?.workspaceService,
    ]
  );

  return <AppServicesContext.Provider value={value}>{children}</AppServicesContext.Provider>;
}

function useRequiredAppServicesContext(): AppServicesContextValue {
  const context = useContext(AppServicesContext);
  if (!context) {
    throw new Error('AppServicesProvider is required to consume app services.');
  }
  return context;
}

export function useAppDataSourceMode(): DataSourceMode {
  return useRequiredAppServicesContext().dataSourceMode;
}

export function useWorkspaceService(): WorkspaceService {
  return useRequiredAppServicesContext().workspaceService;
}

export function useRunsService(): RunsService {
  return useRequiredAppServicesContext().runsService;
}

export function usePlansService(): PlansService {
  return useRequiredAppServicesContext().plansService;
}
