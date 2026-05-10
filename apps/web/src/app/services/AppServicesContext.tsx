/** Owned concern: publish React hooks for application service ports. */
import { createContext, useContext, useMemo, type ReactNode } from 'react';

import type { CapabilitiesPort } from '../ports/capabilities';
import type { IPlansPort } from '../ports/plans';
import type { IRunsPort } from '../ports/runs';
import type { SessionContextPort } from '../ports/sessionContext';
import type { ShellFeedbackPort } from '../ports/shellFeedback';
import type {
  IWarehouseSourceImportPort,
  IWorkspaceAdminReadPort,
  IWorkspaceDiffQueryPort,
  IWorkspaceFileContentCommandPort,
  IWorkspaceFilesQueryPort,
  IWorkspaceGraphSnapshotQueryPort,
  IWorkspacePluginCatalogQueryPort,
} from '../ports/workspace';
import type { IWorkspaceGraphDraftAuthoringPort } from '../ports/workspaceGraphDraftAuthoring';
import type { AppServices, AppServicesOverrides } from './composition/appServices';
import { buildAppServices } from './composition/appServices';

type GlobalWithAppServicesContext = typeof globalThis & {
  __dvtAppServicesContext__?: ReturnType<typeof createContext<AppServices | null>>;
};

function getAppServicesContext() {
  const globalObject = globalThis as GlobalWithAppServicesContext;
  globalObject.__dvtAppServicesContext__ ??= createContext<AppServices | null>(null);
  return globalObject.__dvtAppServicesContext__;
}

const AppServicesContext = getAppServicesContext();

export type AppServicesProviderProps = Readonly<{
  children: ReactNode;
  overrides?: AppServicesOverrides;
}>;

export function AppServicesProvider({ children, overrides }: AppServicesProviderProps) {
  const value = useMemo(
    () => buildAppServices(overrides),
    [
      overrides?.apiClient,
      overrides?.mode,
      overrides?.plansService,
      overrides?.runsService,
      overrides?.workspaceGraphSnapshotQuery,
      overrides?.workspaceFilesQuery,
      overrides?.workspaceDiffQuery,
      overrides?.workspacePluginCatalogQuery,
      overrides?.workspaceAdminRead,
      overrides?.warehouseSourceImport,
      overrides?.workspaceFileContentCommand,
      overrides?.workspaceGraphDraftAuthoringPort,
      overrides?.capabilitiesPort,
      overrides?.sessionContext,
      overrides?.shellFeedback,
    ]
  );

  return <AppServicesContext.Provider value={value}>{children}</AppServicesContext.Provider>;
}

function useRequiredAppServicesContext(): AppServices {
  const context = useContext(AppServicesContext);
  if (!context) {
    throw new Error('AppServicesProvider is required to consume app services.');
  }
  return context;
}

export function useAppDataSourceMode(): AppServices['dataSourceMode'] {
  return useRequiredAppServicesContext().dataSourceMode;
}

export function useWorkspaceGraphSnapshotQueryPort(): IWorkspaceGraphSnapshotQueryPort {
  return useRequiredAppServicesContext().workspaceGraphSnapshotQuery;
}

export function useWorkspaceFilesQueryPort(): IWorkspaceFilesQueryPort {
  return useRequiredAppServicesContext().workspaceFilesQuery;
}

export function useWorkspaceDiffQueryPort(): IWorkspaceDiffQueryPort {
  return useRequiredAppServicesContext().workspaceDiffQuery;
}

export function useWorkspacePluginCatalogQueryPort(): IWorkspacePluginCatalogQueryPort {
  return useRequiredAppServicesContext().workspacePluginCatalogQuery;
}

export function useWorkspaceAdminReadPort(): IWorkspaceAdminReadPort {
  return useRequiredAppServicesContext().workspaceAdminRead;
}

export function useWarehouseSourceImportPort(): IWarehouseSourceImportPort {
  return useRequiredAppServicesContext().warehouseSourceImport;
}

export function useWorkspaceFileContentCommandPort(): IWorkspaceFileContentCommandPort {
  return useRequiredAppServicesContext().workspaceFileContentCommand;
}

export function useWorkspaceGraphDraftAuthoringPort(): IWorkspaceGraphDraftAuthoringPort {
  return useRequiredAppServicesContext().workspaceGraphDraftAuthoringPort;
}

export function useRunsService(): IRunsPort {
  return useRequiredAppServicesContext().runsService;
}

export function usePlansService(): IPlansPort {
  return useRequiredAppServicesContext().plansService;
}

export function useCapabilitiesPort(): CapabilitiesPort {
  return useRequiredAppServicesContext().capabilitiesPort;
}

export function useSessionContext(): SessionContextPort {
  return useRequiredAppServicesContext().sessionContext;
}

export function useShellFeedback(): ShellFeedbackPort {
  return useRequiredAppServicesContext().shellFeedback;
}
