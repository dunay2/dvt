import type {
  PlatformConnectionState,
  PlatformHealthSnapshot,
} from '../domain/platformHealthTypes';
import { selectPlatformConnectionState } from '../domain/platformHealthSelectors';

const MAX_RETRY_BACKOFF_MS = 60_000;
const BASE_POLL_INTERVAL_MS = 15_000;
const OFFLINE_RETRY_BASE_MS = 5_000;
const DEGRADED_RETRY_BASE_MS = 15_000;

export function getPlatformHealthErrorMessageFromQuery(
  isError: boolean,
  error: unknown
): string | null {
  if (!isError) {
    return null;
  }

  return error instanceof Error ? error.message : 'Unknown platform health query error';
}

function getDegradedReason(snapshot: PlatformHealthSnapshot | undefined): string {
  if (!snapshot) {
    return 'Platform probes are unavailable.';
  }

  if (snapshot.healthz.data.status === 'degraded') {
    const intentReconciler = snapshot.healthz.data.components.intentReconciler;
    return intentReconciler.status === 'degraded'
      ? `Intent reconciler degraded: ${intentReconciler.reasonCode}.`
      : 'The /healthz endpoint reports degraded platform status.';
  }

  if (snapshot.readyz.availability === 'available' && snapshot.readyz.data?.ok === false) {
    return `Readiness not satisfied: ${snapshot.readyz.data.reasonCode}.`;
  }

  if (snapshot.dbReady.availability === 'available' && snapshot.dbReady.data?.ok === false) {
    return `Database readiness failed: ${snapshot.dbReady.data.reason ?? 'unknown reason'}.`;
  }

  const failedOptionalProbe = [snapshot.readyz, snapshot.version, snapshot.dbReady].find(
    (probe) => probe.error !== null
  );

  if (failedOptionalProbe?.error) {
    return `${failedOptionalProbe.endpoint} probe failed: ${failedOptionalProbe.error.message}`;
  }

  return 'Platform is degraded.';
}

export function getPlatformConnectionDetail(
  restStatus: PlatformConnectionState['rest'],
  snapshot: PlatformHealthSnapshot | undefined,
  errorMessage: string | null
): string | null {
  if (restStatus === 'offline') {
    return errorMessage ?? 'Unable to reach /healthz.';
  }

  if (restStatus === 'degraded') {
    return getDegradedReason(snapshot);
  }

  return null;
}

export function getNextRetryDelayMs(currentDelayMs: number): number {
  return Math.min(currentDelayMs * 2, MAX_RETRY_BACKOFF_MS);
}

export function getShellHealthPollingIntervalMs(
  snapshot: PlatformHealthSnapshot | undefined,
  isError: boolean,
  failureCount: number
): number {
  const connectionState = selectPlatformConnectionState(snapshot, isError);

  if (connectionState.rest === 'ok') {
    return BASE_POLL_INTERVAL_MS;
  }

  const attempt = Math.max(1, failureCount);
  const baseIntervalMs =
    connectionState.rest === 'offline' ? OFFLINE_RETRY_BASE_MS : DEGRADED_RETRY_BASE_MS;

  return Math.min(baseIntervalMs * 2 ** (attempt - 1), MAX_RETRY_BACKOFF_MS);
}

type ShellHealthPresentationInput = {
  data: PlatformHealthSnapshot | undefined;
  isError: boolean;
  error: unknown;
  isPending: boolean;
  isFetching: boolean;
  failureCount: number;
  dataUpdatedAt: number;
  errorUpdatedAt: number;
};

export function buildShellHealthPresentationModel(input: ShellHealthPresentationInput) {
  const isInitialHealthCheckPending = input.isPending && !input.data && !input.isError;
  const connectionState = isInitialHealthCheckPending
    ? null
    : selectPlatformConnectionState(input.data, input.isError);
  const errorMessage = getPlatformHealthErrorMessageFromQuery(input.isError, input.error);
  const connectionDetail = connectionState
    ? getPlatformConnectionDetail(connectionState.rest, input.data, errorMessage)
    : null;

  return {
    connectionState,
    connectionDetail,
    isInitialHealthCheckPending,
    isFetching: input.isFetching,
    pollingIntervalMs: getShellHealthPollingIntervalMs(
      input.data,
      input.isError,
      input.failureCount
    ),
    lastSettledAtMs: Math.max(input.dataUpdatedAt ?? 0, input.errorUpdatedAt ?? 0),
  };
}
