import { createContext, useContext, useMemo, type ReactNode } from 'react';

import type { IPlansPort } from '../ports/plans';
import type { IRunsPort } from '../ports/runs';
import type { IWorkspacePort } from '../ports/workspace';
import { createApiClient, type ApiClient } from './api/createApiClient';
import { resolveDataSource, type DataSourceMode } from './config/dataSource';
import { setRuntimeDataSourceMode } from './config/runtimeDataSourceMode';
import { createPlansService } from './plans/plansService';
import { createRunsService } from './runs/runsService';
import { createWorkspaceService } from './workspace/workspaceService';

type AppServicesContextValue = {
  readonly dataSourceMode: DataSourceMode;
  readonly apiClient: ApiClient;
  readonly workspaceService: IWorkspacePort;
  readonly runsService: IRunsPort;
  readonly plansService: IPlansPort;
};

type AppServicesOverrides = {
  readonly mode?: DataSourceMode;
  readonly apiClient?: ApiClient;
  readonly workspaceService?: IWorkspacePort;
  readonly runsService?: IRunsPort;
  readonly plansService?: IPlansPort;
};

const AppServicesContext = createContext<AppServicesContextValue | null>(null);

function buildAppServicesContextValue(
  overrides: AppServicesOverrides = {}
): AppServicesContextValue {
  const dataSourceMode = overrides.mode ?? resolveDataSource();
  setRuntimeDataSourceMode(dataSourceMode);
  const apiClient = overrides.apiClient ?? createApiClient();

  return {
    dataSourceMode,
    apiClient,
    workspaceService:
      overrides.workspaceService ?? createWorkspaceService(dataSourceMode, apiClient),
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

export function useWorkspaceService(): IWorkspacePort {
  return useRequiredAppServicesContext().workspaceService;
}

export function useRunsService(): IRunsPort {
  return useRequiredAppServicesContext().runsService;
}

export function usePlansService(): IPlansPort {
  return useRequiredAppServicesContext().plansService;
}
