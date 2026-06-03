/** Owned concern: derive backend readiness and transport-mutation posture for the Canvas authoring-runtime seam. */
import {
  getPlatformConnectionDetail,
  getPlatformHealthErrorMessageFromQuery,
  isPlatformReady,
} from '../../../capabilities/platform-health';
import type { DataSourceMode } from '../../services/config/dataSource';
import type { CanvasAuthoringRuntimePlatformHealthQuery } from './canvasAuthoringRuntime.types';

type DeriveCanvasBackendPostureArgs = {
  dataSourceMode: DataSourceMode;
  platformHealthQuery: CanvasAuthoringRuntimePlatformHealthQuery;
};

export type CanvasBackendPosture = {
  isBackendCheckPending: boolean;
  backendReady: boolean;
  backendBlockMessage: string | null;
  backendAllowsMutations: boolean;
};

function deriveBackendBlockMessage(
  shouldExposeBackendBlockMessage: boolean,
  platformHealthQuery: CanvasAuthoringRuntimePlatformHealthQuery
): string | null {
  if (!shouldExposeBackendBlockMessage) {
    return null;
  }

  return (
    getPlatformConnectionDetail(
      platformHealthQuery.isError || !platformHealthQuery.data ? 'offline' : 'degraded',
      platformHealthQuery.data,
      getPlatformHealthErrorMessageFromQuery(platformHealthQuery.isError, platformHealthQuery.error)
    ) ?? null
  );
}

export function deriveCanvasBackendPosture({
  platformHealthQuery,
}: DeriveCanvasBackendPostureArgs): CanvasBackendPosture {
  const hasSettledBackendProbe =
    platformHealthQuery.data !== undefined ||
    platformHealthQuery.isError ||
    (platformHealthQuery.failureCount ?? 0) > 0 ||
    (platformHealthQuery.errorUpdatedAt ?? 0) > 0;
  const isBackendCheckPending = platformHealthQuery.isPending && !hasSettledBackendProbe;
  const backendReady = isPlatformReady(platformHealthQuery.data);
  const shouldExposeBackendBlockMessage = !isBackendCheckPending && !backendReady;

  return {
    isBackendCheckPending,
    backendReady,
    backendBlockMessage: deriveBackendBlockMessage(
      shouldExposeBackendBlockMessage,
      platformHealthQuery
    ),
    backendAllowsMutations: !isBackendCheckPending && backendReady,
  };
}
