/** Owned concern: project Root query state into coarse frontend operability events. */
import type { FrontendOperabilityEvent } from './ports/frontendOperability';
import {
  createBootstrapFailureEvent,
  createSurfaceDegradedEvent,
} from './services/operability/frontendOperabilityRecorder';

type RootBootstrapOperabilityInput = Readonly<{
  capabilitiesFailed: boolean;
  platformHealthFailed: boolean;
  platformRestState: 'ok' | 'degraded' | 'offline' | undefined;
}>;

export function buildRootBootstrapFailureEvent(
  input: RootBootstrapOperabilityInput
): FrontendOperabilityEvent | null {
  if (input.capabilitiesFailed) {
    return createBootstrapFailureEvent('capabilities', 'capabilities-query-failed');
  }

  if (input.platformHealthFailed || input.platformRestState === 'offline') {
    return createBootstrapFailureEvent('health', 'health-probe-unavailable');
  }

  return null;
}

export function buildRootPlatformHealthDegradedEvent(
  platformRestState: RootBootstrapOperabilityInput['platformRestState']
): FrontendOperabilityEvent | null {
  if (platformRestState === 'offline') {
    return createSurfaceDegradedEvent(
      'shell.platform-health',
      'probe-unavailable',
      'platform-health-state-transition'
    );
  }

  if (platformRestState === 'degraded') {
    return createSurfaceDegradedEvent(
      'shell.platform-health',
      'partial',
      'platform-health-state-transition'
    );
  }

  return null;
}
