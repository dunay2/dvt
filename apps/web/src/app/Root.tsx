import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import {
  buildShellHealthPresentationModel,
  type PlatformHealthCapabilityApi,
  usePlatformHealthSnapshotQuery,
} from '../capabilities/platform-health';

import BottomConsoleDrawer from './components/Console';
import LeftNavigation from './components/LeftNavigation';
import ShellHealthBanner from './components/ShellHealthBanner';
import TopAppBar from './components/TopAppBar';
import AppShellFrame from './components/shell/AppShellFrame';
import {
  completeBootstrapScreen,
  setBootstrapStepStatus,
} from './bootstrap/appBootstrapScreen';
import { useCapabilitiesQuery } from './queries/useCapabilitiesQuery';
import { useUiLayoutStore } from './stores/uiLayoutStore';
import '@xyflow/react/dist/style.css';

type RootShellProps = {
  readonly platformHealthCapability?: PlatformHealthCapabilityApi;
};

export function RootShell({ platformHealthCapability }: RootShellProps = {}) {
  const location = useLocation();
  const focusMode = useUiLayoutStore((state) => state.focusMode);
  const consolePanelHeight = useUiLayoutStore((state) => state.consolePanelHeight);
  const consolePanelVisible = useUiLayoutStore((state) => state.consolePanelVisible);
  const connectionStatus = useUiLayoutStore((state) => state.connectionStatus);
  const setConnectionStatus = useUiLayoutStore((state) => state.setConnectionStatus);
  const capabilitiesQuery = useCapabilitiesQuery();
  const platformHealth = usePlatformHealthSnapshotQuery(platformHealthCapability);
  const shellHealth = buildShellHealthPresentationModel({
    data: platformHealth.data,
    isError: platformHealth.isError,
    error: platformHealth.error,
    isPending: platformHealth.isPending,
    isFetching: platformHealth.isFetching,
    failureCount: platformHealth.failureCount,
    dataUpdatedAt: platformHealth.dataUpdatedAt,
    errorUpdatedAt: platformHealth.errorUpdatedAt,
  });
  const isInitialCapabilitiesBootstrapPending =
    capabilitiesQuery.isPending && !capabilitiesQuery.data && !capabilitiesQuery.isError;

  useEffect(() => {
    if (shellHealth.connectionState === null) {
      return;
    }

    if (
      connectionStatus.rest === shellHealth.connectionState.rest &&
      connectionStatus.liveEvents === shellHealth.connectionState.liveEvents
    ) {
      return;
    }

    setConnectionStatus(shellHealth.connectionState);
  }, [connectionStatus, setConnectionStatus, shellHealth.connectionState]);

  useEffect(() => {
    if (isInitialCapabilitiesBootstrapPending) {
      setBootstrapStepStatus('capabilities', 'pending');
      return;
    }

    if (capabilitiesQuery.isError) {
      setBootstrapStepStatus(
        'capabilities',
        'error',
        'Capabilities could not be loaded. Using the fallback shell configuration.'
      );
      return;
    }

    setBootstrapStepStatus('capabilities', 'complete');
  }, [
    capabilitiesQuery.isError,
    capabilitiesQuery.isPending,
    capabilitiesQuery.data,
    isInitialCapabilitiesBootstrapPending,
  ]);

  useEffect(() => {
    if (shellHealth.isInitialHealthCheckPending) {
      setBootstrapStepStatus('health', 'pending');
      return;
    }

    if (platformHealth.isError) {
      setBootstrapStepStatus(
        'health',
        'error',
        shellHealth.connectionDetail ?? 'Platform health probes failed during startup.'
      );
      return;
    }

    setBootstrapStepStatus(
      'health',
      'complete',
      shellHealth.connectionDetail ?? 'Platform health settled.'
    );
  }, [
    platformHealth.isError,
    shellHealth.connectionDetail,
    shellHealth.isInitialHealthCheckPending,
  ]);

  useEffect(() => {
    if (location.pathname.startsWith('/canvas')) {
      setBootstrapStepStatus('route', 'pending', 'Preparing canvas workspace');
      return;
    }

    setBootstrapStepStatus('route', 'complete', 'Initial route is ready');
  }, [
    isInitialCapabilitiesBootstrapPending,
    location.pathname,
    shellHealth.isInitialHealthCheckPending,
  ]);

  useEffect(() => {
    if (!isInitialCapabilitiesBootstrapPending && !shellHealth.isInitialHealthCheckPending) {
      completeBootstrapScreen();
    }
  }, [isInitialCapabilitiesBootstrapPending, shellHealth.isInitialHealthCheckPending]);

  return (
    <AppShellFrame
      bottomDrawer={<BottomConsoleDrawer />}
      focusMode={focusMode}
      healthBanner={
        <ShellHealthBanner
          autoRefreshIntervalMs={shellHealth.pollingIntervalMs}
          connectionState={shellHealth.connectionState}
          detailMessage={shellHealth.connectionDetail}
          isFetching={shellHealth.isFetching}
          lastSettledAtMs={shellHealth.lastSettledAtMs}
          onRetry={() => {
            void platformHealth.refetch();
          }}
        />
      }
      leftNavigation={<LeftNavigation />}
      showBottomDrawer={consolePanelVisible && consolePanelHeight > 0}
      topBar={
        <TopAppBar
          connectionDetail={shellHealth.connectionDetail}
          connectionStateOverride={shellHealth.connectionState}
          isConnectionChecking={shellHealth.isInitialHealthCheckPending}
        />
      }
    >
      <Outlet />
    </AppShellFrame>
  );
}

export default function Root() {
  return <RootShell />;
}
