/** Owned concern: compose the Raven shell frame and publish root bootstrap posture. */
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Outlet, useLocation } from 'react-router';
import {
  buildShellHealthPresentationModel,
  type PlatformHealthCapabilityApi,
  usePlatformHealthSnapshotQuery,
} from '../capabilities/platform-health';

import LeftNavigation from './components/LeftNavigation';
import ShellHealthBanner from './components/ShellHealthBanner';
import TopAppBar from './components/TopAppBar';
import AppShellFrame from './components/shell/AppShellFrame';
import BottomOperationalDrawer from './components/shell/BottomOperationalDrawer';
import {
  createCapabilitiesFallbackBootstrapCommand,
  createCapabilitiesPendingBootstrapCommand,
  createCapabilitiesReadyBootstrapCommand,
  createHealthDegradedBootstrapCommand,
  createHealthFailedBootstrapCommand,
  createHealthPendingBootstrapCommand,
  createHealthReadyBootstrapCommand,
} from './bootstrap/appBootstrapCommands';
import { resolveAppBootstrapCopy } from './bootstrap/appBootstrapCopy';
import { completeBootstrapScreen, setBootstrapStepStatus } from './bootstrap/appBootstrapScreen';
import {
  getPublishedRouteBootstrapPresentation,
  subscribeRouteBootstrapPresentations,
} from './bootstrap/routeBootstrapRegistry';
import { detectRouteBootstrapLocale } from './bootstrap/routeBootstrapErrorCopy';
import { RouteBootstrapActiveRegistrationMissingError } from './bootstrap/routeBootstrapErrors';
import {
  createInitialRouteBootstrapStartupReadinessState,
  resolveRouteBootstrapStartupReadiness,
} from './bootstrap/routeBootstrapStartupReadiness';
import { useActiveRouteBootstrapRegistration } from './bootstrap/useActiveRouteBootstrapRegistration';
import { useCapabilitiesQuery } from './queries/useCapabilitiesQuery';
import {
  buildRootBootstrapOperabilityTransition,
  buildRootPlatformHealthDegradedEvent,
} from './rootOperabilityModel';
import { useFrontendOperabilityTransitionRecorder } from './services/AppServicesContext';
import { useFrontendOperabilityTransition } from './services/operability/useFrontendOperabilityTransition';
import {
  isCanvasRoute,
  resolveShellNavigationDisposition,
} from './shell/shellNavigationDisposition';
import { buildShellRuntimeState } from './shell/shellRuntimeModel';
import { useCanvasInteractionStore } from './stores/canvasInteractionStore';
import { usePlatformConnectionStore } from './stores/platformConnectionStore';
import { useUiLayoutStore } from './stores/uiLayoutStore';
import '@xyflow/react/dist/style.css';

type RootShellProps = {
  readonly platformHealthCapability?: PlatformHealthCapabilityApi;
};

export function RootShell({ platformHealthCapability }: RootShellProps = {}) {
  const location = useLocation();
  const focusMode = useUiLayoutStore((state) => state.focusMode);
  const bottomDrawerHeight = useUiLayoutStore((state) => state.bottomDrawerHeight);
  const bottomDrawerVisible = useUiLayoutStore((state) => state.bottomDrawerVisible);
  const closeCanvasContextualWorkbench = useCanvasInteractionStore(
    (state) => state.closeContextualWorkbench
  );
  const connectionStatus = usePlatformConnectionStore((state) => state.connectionStatus);
  const setConnectionStatus = usePlatformConnectionStore((state) => state.setConnectionStatus);
  const capabilitiesQuery = useCapabilitiesQuery();
  const frontendOperabilityTransitionRecorder = useFrontendOperabilityTransitionRecorder();
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
  const bootstrapLocale = detectRouteBootstrapLocale();
  const appBootstrapCopy = useMemo(
    () => resolveAppBootstrapCopy(bootstrapLocale),
    [bootstrapLocale]
  );
  const activeRouteBootstrapRegistration = useActiveRouteBootstrapRegistration(undefined, {
    locale: bootstrapLocale,
  });
  const getRouteBootstrapSnapshot = () => {
    if (!activeRouteBootstrapRegistration) {
      throw new RouteBootstrapActiveRegistrationMissingError({
        locale: bootstrapLocale,
      });
    }

    return getPublishedRouteBootstrapPresentation(activeRouteBootstrapRegistration);
  };
  const routeBootstrapPresentation = useSyncExternalStore(
    subscribeRouteBootstrapPresentations,
    getRouteBootstrapSnapshot,
    getRouteBootstrapSnapshot
  );
  const shellHealthRestState = shellHealth.connectionState?.rest;
  const isInitialCapabilitiesBootstrapPending =
    capabilitiesQuery.isPending && !capabilitiesQuery.data && !capabilitiesQuery.isError;
  const routeBootstrapStartupReadinessRef = useRef(
    createInitialRouteBootstrapStartupReadinessState()
  );
  const bootstrapOperabilityActiveRef = useRef(true);
  const [routeBootstrapCanComplete, setRouteBootstrapCanComplete] = useState(false);
  const navigationDisposition = useMemo(
    () => resolveShellNavigationDisposition(location.pathname),
    [location.pathname]
  );
  const navigationModel = useMemo(
    () => buildShellRuntimeState(capabilitiesQuery.data).navigationModel,
    [capabilitiesQuery.data]
  );
  const bootstrapOperabilityTransition = useMemo(
    () =>
      buildRootBootstrapOperabilityTransition({
        bootstrapActive: bootstrapOperabilityActiveRef.current,
        capabilitiesFailed: capabilitiesQuery.isError,
        capabilitiesReady: Boolean(capabilitiesQuery.data),
        platformHealthFailed: platformHealth.isError,
        platformRestState: shellHealthRestState,
      }),
    [
      capabilitiesQuery.data,
      capabilitiesQuery.isError,
      platformHealth.isError,
      shellHealthRestState,
    ]
  );
  const platformHealthDegradedEvent = useMemo(
    () => buildRootPlatformHealthDegradedEvent(shellHealthRestState),
    [shellHealthRestState]
  );

  useFrontendOperabilityTransition(
    frontendOperabilityTransitionRecorder,
    'root.bootstrap',
    bootstrapOperabilityTransition
  );
  useFrontendOperabilityTransition(
    frontendOperabilityTransitionRecorder,
    'root.platform-health',
    platformHealthDegradedEvent
  );
  useFrontendOperabilityTransition(frontendOperabilityTransitionRecorder, 'route.boundary', null);

  useEffect(() => {
    if (!isCanvasRoute(location.pathname)) {
      closeCanvasContextualWorkbench();
    }
  }, [closeCanvasContextualWorkbench, location.pathname]);

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
      setBootstrapStepStatus(createCapabilitiesPendingBootstrapCommand());
      return;
    }

    if (capabilitiesQuery.isError) {
      setBootstrapStepStatus(
        createCapabilitiesFallbackBootstrapCommand({ copy: appBootstrapCopy })
      );
      return;
    }

    setBootstrapStepStatus(createCapabilitiesReadyBootstrapCommand());
  }, [
    appBootstrapCopy,
    capabilitiesQuery.isError,
    capabilitiesQuery.isPending,
    capabilitiesQuery.data,
    isInitialCapabilitiesBootstrapPending,
  ]);

  useEffect(() => {
    if (shellHealth.isInitialHealthCheckPending) {
      setBootstrapStepStatus(createHealthPendingBootstrapCommand());
      return;
    }

    if (platformHealth.isError || shellHealthRestState === 'offline') {
      setBootstrapStepStatus(
        createHealthFailedBootstrapCommand({
          copy: appBootstrapCopy,
          detail: shellHealth.connectionDetail,
        })
      );
      return;
    }

    if (shellHealthRestState !== 'ok') {
      setBootstrapStepStatus(
        createHealthDegradedBootstrapCommand({
          copy: appBootstrapCopy,
          detail: shellHealth.connectionDetail,
        })
      );
      return;
    }

    setBootstrapStepStatus(
      createHealthReadyBootstrapCommand({
        copy: appBootstrapCopy,
        detail: shellHealth.connectionDetail,
      })
    );
  }, [
    appBootstrapCopy,
    platformHealth.isError,
    shellHealth.connectionDetail,
    shellHealthRestState,
    shellHealth.isInitialHealthCheckPending,
  ]);

  useEffect(() => {
    if (!activeRouteBootstrapRegistration) {
      return;
    }

    const routeBootstrapStartupReadiness = resolveRouteBootstrapStartupReadiness({
      activeRouteId: activeRouteBootstrapRegistration.routeId,
      capabilitiesColdStartPending: isInitialCapabilitiesBootstrapPending,
      capabilitiesPendingDetail: appBootstrapCopy.routeWaitingForCapabilitiesDetail,
      presentation: routeBootstrapPresentation,
      previousState: routeBootstrapStartupReadinessRef.current,
    });

    routeBootstrapStartupReadinessRef.current = routeBootstrapStartupReadiness.nextState;
    setRouteBootstrapCanComplete(routeBootstrapStartupReadiness.canComplete);
    setBootstrapStepStatus(routeBootstrapStartupReadiness.command);
  }, [
    activeRouteBootstrapRegistration,
    appBootstrapCopy.routeWaitingForCapabilitiesDetail,
    isInitialCapabilitiesBootstrapPending,
    routeBootstrapPresentation.canComplete,
    routeBootstrapPresentation.detail,
    routeBootstrapPresentation.status,
  ]);

  useEffect(() => {
    if (isInitialCapabilitiesBootstrapPending || !routeBootstrapCanComplete) {
      return;
    }

    bootstrapOperabilityActiveRef.current = false;
    completeBootstrapScreen();
  }, [
    capabilitiesQuery.isError,
    capabilitiesQuery.isPending,
    capabilitiesQuery.data,
    routeBootstrapCanComplete,
    isInitialCapabilitiesBootstrapPending,
    platformHealth.isError,
    shellHealth.connectionDetail,
    shellHealth.connectionState,
    shellHealth.isInitialHealthCheckPending,
  ]);

  return (
    <AppShellFrame
      bottomDrawer={<BottomOperationalDrawer />}
      focusMode={focusMode}
      healthBanner={
        <ShellHealthBanner
          autoRefreshIntervalMs={shellHealth.pollingIntervalMs}
          connectionState={shellHealth.connectionState}
          detailMessage={shellHealth.connectionDetail}
          isFetching={shellHealth.isFetching}
          lastSettledAtMs={shellHealth.lastSettledAtMs}
          onRetry={() => {
            platformHealth.refetch().catch(() => undefined);
          }}
        />
      }
      leftNavigation={<LeftNavigation />}
      navigationDisposition={navigationDisposition}
      showBottomDrawer={bottomDrawerVisible && bottomDrawerHeight > 0}
      topBar={
        <TopAppBar
          connectionDetail={shellHealth.connectionDetail}
          connectionStateOverride={shellHealth.connectionState}
          isConnectionChecking={shellHealth.isInitialHealthCheckPending}
          navigationModel={navigationModel}
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
