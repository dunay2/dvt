import {
  getPlatformConnectionDetail,
  getPlatformHealthErrorMessageFromQuery,
  isPlatformReady,
  type PlatformHealthSnapshot,
} from '../../../capabilities/platform-health';

type CanvasDataSourceMode = 'mock' | 'api';

type PlatformHealthQueryState = {
  isPending: boolean;
  isError: boolean;
  data?: PlatformHealthSnapshot;
  error?: unknown;
};

type DeriveCanvasBackendPostureArgs = {
  dataSourceMode: CanvasDataSourceMode;
  platformHealthQuery: PlatformHealthQueryState;
};

export type CanvasBackendPosture = {
  isBackendCheckPending: boolean;
  backendReady: boolean;
  backendBlockMessage: string | null;
  backendAllowsMutations: boolean;
};

function deriveBackendBlockMessage(
  shouldExposeBackendBlockMessage: boolean,
  platformHealthQuery: PlatformHealthQueryState
): string | null {
  if (!shouldExposeBackendBlockMessage) {
    return null;
  }

  return (
    getPlatformConnectionDetail(
      platformHealthQuery.isError ? 'offline' : 'degraded',
      platformHealthQuery.data,
      getPlatformHealthErrorMessageFromQuery(
        platformHealthQuery.isError,
        platformHealthQuery.error
      )
    ) ?? null
  );
}

export function deriveCanvasBackendPosture({
  dataSourceMode,
  platformHealthQuery,
}: DeriveCanvasBackendPostureArgs): CanvasBackendPosture {
  const isBackendCheckPending =
    dataSourceMode === 'api' &&
    platformHealthQuery.isPending &&
    !platformHealthQuery.data &&
    !platformHealthQuery.isError;
  const backendReady =
    dataSourceMode !== 'api' || isPlatformReady(platformHealthQuery.data);
  const shouldExposeBackendBlockMessage =
    dataSourceMode === 'api' && !isBackendCheckPending && !backendReady;

  return {
    isBackendCheckPending,
    backendReady,
    backendBlockMessage: deriveBackendBlockMessage(
      shouldExposeBackendBlockMessage,
      platformHealthQuery
    ),
    backendAllowsMutations:
      dataSourceMode !== 'api' || (!isBackendCheckPending && backendReady),
  };
}
