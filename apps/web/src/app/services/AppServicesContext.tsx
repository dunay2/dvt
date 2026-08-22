/** Owned concern: publish React hooks for application service ports. */
import { createContext, useContext, useMemo, type ReactNode } from 'react';

import type { CapabilitiesPort } from '../ports/capabilities';
import type { ICostAttributionSummaryPort } from '../ports/cost';
import type { IGraphDbtWorkspaceArtifactPublicationCommandPort } from '../ports/graphDbtWorkspaceArtifactPublication';
import type { IGraphDbtModelCompilationQueryPort } from '../ports/graphDbtModelCompilation';
import type { IPlansPort } from '../ports/plans';
import type { IRunsPort } from '../ports/runs';
import type { SessionContextPort } from '../ports/sessionContext';
import type { ShellFeedbackPort } from '../ports/shellFeedback';
import type { WorkspaceScopeSelectionPort } from '../ports/workspaceScopeSelection';
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
} from '../ports/workspace';
import type { IWorkspaceGraphDraftAuthoringPort } from '../ports/workspaceGraphDraftAuthoring';
import type { IDbtProjectGraphQueryPort } from '../ports/dbtProjectGraph';
import type { IDbtProjectImportPort } from '../ports/dbtProjectImport';
import type { IDbtYamlDescriptionEditPort } from '../ports/dbtYamlDescriptionEdit';
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
      overrides?.plansService,
      overrides?.runsService,
      overrides?.costAttributionSummaryPort,
      overrides?.workspaceGraphSnapshotQuery,
      overrides?.workspaceFilesQuery,
      overrides?.workspaceFileHistoryQuery,
      overrides?.workspaceDiffQuery,
      overrides?.workspacePluginCatalogQuery,
      overrides?.workspaceAdminRead,
      overrides?.warehouseSourceImport,
      overrides?.warehouseSourceDataSampleQuery,
      overrides?.workspaceFileContentCommand,
      overrides?.graphDbtWorkspaceArtifactPublicationCommand,
      overrides?.graphDbtModelCompilationQuery,
      overrides?.workspaceGraphDraftAuthoringPort,
      overrides?.dbtProjectGraphQueryPort,
      overrides?.dbtProjectImportPort,
      overrides?.dbtYamlDescriptionEditPort,
      overrides?.capabilitiesPort,
      overrides?.sessionContext,
      overrides?.workspaceScopeSelection,
      overrides?.shellFeedback,
      overrides?.frontendOperabilitySink,
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

export function useWorkspaceGraphSnapshotQueryPort(): IWorkspaceGraphSnapshotQueryPort {
  return useRequiredAppServicesContext().workspaceGraphSnapshotQuery;
}

export function useWorkspaceFilesQueryPort(): IWorkspaceFilesQueryPort {
  return useRequiredAppServicesContext().workspaceFilesQuery;
}

export function useWorkspaceFileHistoryQueryPort(): IWorkspaceFileHistoryQueryPort {
  return useRequiredAppServicesContext().workspaceFileHistoryQuery;
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

export function useWarehouseSourceDataSampleQueryPort(): IWarehouseSourceDataSampleQueryPort {
  return useRequiredAppServicesContext().warehouseSourceDataSampleQuery;
}

export function useOptionalWarehouseSourceImportPort(): IWarehouseSourceImportPort | undefined {
  return useContext(AppServicesContext)?.warehouseSourceImport;
}

export function useWorkspaceFileContentCommandPort(): IWorkspaceFileContentCommandPort {
  return useRequiredAppServicesContext().workspaceFileContentCommand;
}

export function useGraphDbtWorkspaceArtifactPublicationCommandPort(): IGraphDbtWorkspaceArtifactPublicationCommandPort {
  return useRequiredAppServicesContext().graphDbtWorkspaceArtifactPublicationCommand;
}

export function useGraphDbtModelCompilationQueryPort(): IGraphDbtModelCompilationQueryPort {
  return useRequiredAppServicesContext().graphDbtModelCompilationQuery;
}

export function useWorkspaceGraphDraftAuthoringPort(): IWorkspaceGraphDraftAuthoringPort {
  return useRequiredAppServicesContext().workspaceGraphDraftAuthoringPort;
}

export function useDbtProjectGraphQueryPort(): IDbtProjectGraphQueryPort {
  return useRequiredAppServicesContext().dbtProjectGraphQueryPort;
}

export function useDbtProjectImportPort(): IDbtProjectImportPort {
  return useRequiredAppServicesContext().dbtProjectImportPort;
}

export function useDbtYamlDescriptionEditPort(): IDbtYamlDescriptionEditPort {
  return useRequiredAppServicesContext().dbtYamlDescriptionEditPort;
}

export function useRunsService(): IRunsPort {
  return useRequiredAppServicesContext().runsService;
}

export function usePlansService(): IPlansPort {
  return useRequiredAppServicesContext().plansService;
}

export function useCostAttributionSummaryPort(): ICostAttributionSummaryPort {
  return useRequiredAppServicesContext().costAttributionSummaryPort;
}

export function useCapabilitiesPort(): CapabilitiesPort {
  return useRequiredAppServicesContext().capabilitiesPort;
}

export function useSessionContext(): SessionContextPort {
  return useRequiredAppServicesContext().sessionContext;
}

export function useWorkspaceScopeSelection(): WorkspaceScopeSelectionPort {
  return useRequiredAppServicesContext().workspaceScopeSelection;
}

export function useShellFeedback(): ShellFeedbackPort {
  return useRequiredAppServicesContext().shellFeedback;
}

export function useFrontendOperabilityTransitionRecorder(): AppServices['frontendOperabilityTransitionRecorder'] {
  return useRequiredAppServicesContext().frontendOperabilityTransitionRecorder;
}
