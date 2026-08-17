/** Owned concern: define the closed outbound contract for browser-only operability evidence. */

declare const frontendOperabilityRouteIdBrand: unique symbol;

export type FrontendOperabilityRouteId = string & {
  readonly [frontendOperabilityRouteIdBrand]: true;
};

export type FrontendOperabilityEvent =
  | Readonly<{
      type: 'frontend.bootstrap.failed';
      phase: 'capabilities' | 'health' | 'route' | 'unknown';
      reasonCode:
        'capabilities-query-failed' | 'health-probe-unavailable' | 'route-boundary-activated';
    }>
  | Readonly<{
      type: 'frontend.route.failed';
      routeId: FrontendOperabilityRouteId;
      reasonCode: 'route-boundary-activated';
    }>
  | Readonly<{
      type: 'frontend.contract.failed';
      operation: 'ListWarehouseConnectionSourceObjects' | 'PreviewWarehouseSourceObjectRows';
      reasonCode: 'response-contract-rejected';
    }>
  | Readonly<{
      type: 'frontend.surface.degraded';
      surface: 'shell.platform-health';
      state: 'stale' | 'probe-unavailable' | 'partial';
      reasonCode: 'platform-health-state-transition';
    }>;

export interface FrontendOperabilitySink {
  record(event: FrontendOperabilityEvent): void;
}
