/**
 * Owned concern: name protected runtime run rail vocabulary once so run rail
 * catalog entries do not embed ad hoc string literals.
 */

export const PROTECTED_RUNTIME_RUN_RAIL = {
  cancelRun: {
    name: 'CancelRun',
    boundedContext: 'Runtime control',
    dddObject: 'Run cancel command',
    applicationPort: 'CancelRunUseCase',
    adapterSurface: 'POST /runs/:runId/cancel',
    scopeAndAuthorization: 'run:cancel, tenant scope',
  },
  getRunEvents: {
    name: 'GetRunEvents',
    boundedContext: 'Runtime read model',
    dddObject: 'Run event stream read model',
    applicationPort: 'GetRunEventsUseCase',
    adapterSurface: 'GET /runs/:runId/events',
    scopeAndAuthorization: 'run:logs:view, tenant scope',
  },
  getRunStatus: {
    name: 'GetRunStatus',
    boundedContext: 'Runtime read model',
    dddObject: 'Run status read model',
    applicationPort: 'GetRunStatusUseCase',
    adapterSurface: 'GET /runs/:runId',
    scopeAndAuthorization: 'run:view, tenant scope',
  },
  listRuns: {
    name: 'ListRuns',
    boundedContext: 'Runtime read model',
    dddObject: 'Run list read model',
    applicationPort: 'ListRunsUseCase',
    adapterSurface: 'GET /runs',
    scopeAndAuthorization: 'run:list, tenant scope',
  },
  rebuildRunSnapshot: {
    name: 'RebuildRunSnapshot',
    boundedContext: 'Runtime repair operations',
    dddObject: 'Snapshot rebuild command',
    applicationPort: 'registerAdminRoutes maintenance port',
    adapterSurface: 'POST /admin/runs/:runId/rebuild-snapshot',
    scopeAndAuthorization: 'admin:rebuild-snapshot, tenant/admin scope',
  },
  recoverRun: {
    name: 'RecoverRun',
    boundedContext: 'Runtime recovery',
    dddObject: 'Run recovery command',
    applicationPort: 'RecoverRunUseCase',
    adapterSurface: 'POST /runs/:runId/recover',
    scopeAndAuthorization: 'run:retry, tenant scope',
  },
  signalRun: {
    name: 'SignalRun',
    boundedContext: 'Runtime control',
    dddObject: 'Run signal command',
    applicationPort: 'SignalRunUseCase',
    adapterSurface: 'POST /runs/:runId/signal',
    scopeAndAuthorization: 'run:signal, or run:cancel only for compatibility CANCEL',
  },
} as const;

export const PROTECTED_RUNTIME_RUN_COMPATIBILITY_POLICY = {
  cancelThroughSignal: {
    status: 'compatibility',
    legacyAccepted: false,
    compatibilityCase: 'CANCEL through POST /runs/:runId/signal',
    canonicalRail: PROTECTED_RUNTIME_RUN_RAIL.cancelRun.name,
    policy: 'DVT_SIGNAL_ROUTE_ALLOW_CANCEL gates the compatibility signal type.',
    removalRequires: 'separate governed deprecation plan',
  },
} as const;
