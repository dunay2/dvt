/** Owned concern: normalize and safely record closed frontend operability events. */
import type {
  FrontendOperabilityEvent,
  FrontendOperabilityRouteId,
  FrontendOperabilitySink,
} from '../../ports/frontendOperability';

const STABLE_ROUTE_ID_PATTERN = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
const MAX_STABLE_ROUTE_ID_LENGTH = 80;

export type FrontendOperabilityTransitionChannel =
  'root.bootstrap' | 'root.platform-health' | 'route.bootstrap' | 'route.boundary';

export type FrontendOperabilityTransitionRecorder = Readonly<{
  recordTransition(
    channel: FrontendOperabilityTransitionChannel,
    event: FrontendOperabilityEvent | null
  ): void;
}>;

export function normalizeFrontendOperabilityRouteId(
  candidate: string | undefined
): FrontendOperabilityRouteId {
  const normalized =
    candidate &&
    candidate.length <= MAX_STABLE_ROUTE_ID_LENGTH &&
    STABLE_ROUTE_ID_PATTERN.test(candidate)
      ? candidate
      : 'unknown';

  return normalized as FrontendOperabilityRouteId;
}

export function createBootstrapFailureEvent(
  phase: Extract<FrontendOperabilityEvent, { type: 'frontend.bootstrap.failed' }>['phase'],
  reasonCode: Extract<FrontendOperabilityEvent, { type: 'frontend.bootstrap.failed' }>['reasonCode']
): FrontendOperabilityEvent {
  return { type: 'frontend.bootstrap.failed', phase, reasonCode };
}

export function createRouteFailureEvent(
  routeId: FrontendOperabilityRouteId,
  reasonCode: Extract<FrontendOperabilityEvent, { type: 'frontend.route.failed' }>['reasonCode']
): FrontendOperabilityEvent {
  return { type: 'frontend.route.failed', routeId, reasonCode };
}

export function createContractFailureEvent(
  operation: Extract<FrontendOperabilityEvent, { type: 'frontend.contract.failed' }>['operation'],
  reasonCode: Extract<FrontendOperabilityEvent, { type: 'frontend.contract.failed' }>['reasonCode']
): FrontendOperabilityEvent {
  return { type: 'frontend.contract.failed', operation, reasonCode };
}

export function createSurfaceDegradedEvent(
  surface: Extract<FrontendOperabilityEvent, { type: 'frontend.surface.degraded' }>['surface'],
  state: Extract<FrontendOperabilityEvent, { type: 'frontend.surface.degraded' }>['state'],
  reasonCode: Extract<FrontendOperabilityEvent, { type: 'frontend.surface.degraded' }>['reasonCode']
): FrontendOperabilityEvent {
  return { type: 'frontend.surface.degraded', surface, state, reasonCode };
}

export function getFrontendOperabilityEventKey(event: FrontendOperabilityEvent): string {
  switch (event.type) {
    case 'frontend.bootstrap.failed':
      return `${event.type}:${event.phase}:${event.reasonCode}`;
    case 'frontend.route.failed':
      return `${event.type}:${event.routeId}:${event.reasonCode}`;
    case 'frontend.contract.failed':
      return `${event.type}:${event.operation}:${event.reasonCode}`;
    case 'frontend.surface.degraded':
      return `${event.type}:${event.surface}:${event.state}:${event.reasonCode}`;
  }
}

export function recordFrontendOperabilityEvent(
  sink: FrontendOperabilitySink,
  event: FrontendOperabilityEvent
): void {
  try {
    sink.record(event);
  } catch {
    // Operability evidence must never alter product behavior.
  }
}

export function createFrontendOperabilityTransitionRecorder(
  sink: FrontendOperabilitySink
): FrontendOperabilityTransitionRecorder {
  const eventKeysByChannel = new Map<FrontendOperabilityTransitionChannel, string>();

  return {
    recordTransition(channel, event) {
      if (event === null) {
        eventKeysByChannel.delete(channel);
        return;
      }

      const eventKey = getFrontendOperabilityEventKey(event);
      if (eventKeysByChannel.get(channel) === eventKey) {
        return;
      }

      eventKeysByChannel.set(channel, eventKey);
      recordFrontendOperabilityEvent(sink, event);
    },
  };
}
