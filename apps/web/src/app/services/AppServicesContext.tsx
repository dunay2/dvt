import { createContext, useContext, useMemo, type ReactNode } from 'react';

import type { CapabilitiesPort } from '../ports/capabilities';
import type { IPlansPort } from '../ports/plans';
import type { IRunsPort } from '../ports/runs';
import type { SessionContextPort } from '../ports/sessionContext';
import type { ShellFeedbackPort } from '../ports/shellFeedback';
import type { IWorkspacePort } from '../ports/workspace';
import type { AppServices, AppServicesOverrides } from './composition/appServices';
import { buildAppServices } from './composition/appServices';

const APP_SERVICES_CONTEXT_KEY = '__dvtAppServicesContext';

function getOrCreateAppServicesContext(): ReturnType<typeof createContext<AppServices | null>> {
  const globalScope = globalThis as typeof globalThis & {
    [APP_SERVICES_CONTEXT_KEY]?: ReturnType<typeof createContext<AppServices | null>>;
  };

  if (!globalScope[APP_SERVICES_CONTEXT_KEY]) {
    globalScope[APP_SERVICES_CONTEXT_KEY] = createContext<AppServices | null>(null);
  }

  return globalScope[APP_SERVICES_CONTEXT_KEY];
}

// Keep a stable context identity across Vite HMR reloads. Without this,
// AppProviders can hold the old provider instance while hot-reloaded consumers
// read from a new context object and incorrectly observe `null`.
const AppServicesContext = getOrCreateAppServicesContext();

export type AppServicesProviderProps = Readonly<{
  children: ReactNode;
  overrides?: AppServicesOverrides;
}>;

export function AppServicesProvider({
  children,
  overrides,
}: AppServicesProviderProps) {
  const value = useMemo(
    () => buildAppServices(overrides),
    [
      overrides?.apiClient,
      overrides?.mode,
      overrides?.plansService,
      overrides?.runsService,
      overrides?.workspaceService,
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

export function useWorkspaceService(): IWorkspacePort {
  return useRequiredAppServicesContext().workspaceService;
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
