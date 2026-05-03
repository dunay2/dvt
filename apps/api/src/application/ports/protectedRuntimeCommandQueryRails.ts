/**
 * Owned concern: publish the protected runtime command/query rail catalog for
 * the API application boundary.
 *
 * The catalog names product-intent rails and their DDD ownership. HTTP routes,
 * route handlers, and tests implement these rails; they do not define new
 * command/query semantics locally.
 */

export type ProtectedRuntimeRailKind = 'command' | 'query';

export type ProtectedRuntimeCommandQueryRail = {
  readonly name: string;
  readonly kind: ProtectedRuntimeRailKind;
  readonly boundedContext: string;
  readonly dddObject: string;
  readonly applicationPort: string;
  readonly adapterSurface: string;
  readonly scopeAndAuthorization: string;
  readonly negativeTests: readonly string[];
  readonly compatibility?: string;
};

export const PROTECTED_RUNTIME_COMMAND_QUERY_RAILS = [
  {
    name: 'StartRun',
    kind: 'command',
    boundedContext: 'Runtime safety and admission',
    dddObject: 'Run command admission',
    applicationPort: 'StartRunAuthorizedFacade',
    adapterSurface: 'POST /runs/start',
    scopeAndAuthorization: 'run:start, tenant scope',
    negativeTests: [
      'missing token',
      'missing action',
      'tenant mismatch',
      'client runId',
      'invalid plan source',
    ],
  },
  {
    name: 'PreviewExecutablePlan',
    kind: 'command',
    boundedContext: 'Planner/runtime admission',
    dddObject: 'Executable plan draft',
    applicationPort: 'PreviewPlanUseCase',
    adapterSurface: 'POST /plans/preview',
    scopeAndAuthorization: 'run:start compatibility authorization, tenant scope',
    negativeTests: [
      'missing token',
      'missing action',
      'tenant mismatch',
      'invalid graph source',
      'invalid selection',
    ],
  },
  {
    name: 'CompileExecutablePlan',
    kind: 'query',
    boundedContext: 'Planner boundary',
    dddObject: 'Compiled plan read model',
    applicationPort: 'CompilePlanUseCase',
    adapterSurface: 'POST /plans/compile',
    scopeAndAuthorization: 'run:start compatibility authorization, tenant scope',
    negativeTests: ['missing token', 'missing action', 'tenant mismatch', 'unsupported adapter'],
  },
  {
    name: 'ImportExecutablePlan',
    kind: 'command',
    boundedContext: 'Runtime plan ingestion',
    dddObject: 'Imported executable plan',
    applicationPort: 'ImportPlanUseCase',
    adapterSurface: 'POST /plans/import',
    scopeAndAuthorization: 'run:start compatibility authorization, tenant scope',
    negativeTests: ['missing token', 'missing action', 'tenant mismatch', 'invalid plan ref'],
  },
  {
    name: 'GetWorkspaceGraphDraft',
    kind: 'query',
    boundedContext: 'Workspace graph drafting',
    dddObject: 'Workspace draft read model',
    applicationPort: 'getWorkspaceGraphDraftUseCase',
    adapterSurface: 'GET /workspace/graph/draft',
    scopeAndAuthorization: 'workspace:graph-draft:view, tenant/project/environment scope',
    negativeTests: ['missing token', 'missing action', 'tenant/workspace mismatch'],
  },
  {
    name: 'SaveWorkspaceGraphDraft',
    kind: 'command',
    boundedContext: 'Workspace graph drafting',
    dddObject: 'Workspace draft aggregate',
    applicationPort: 'saveWorkspaceGraphDraftUseCase',
    adapterSurface: 'PUT /workspace/graph/draft',
    scopeAndAuthorization: 'workspace:graph-draft:save, tenant/project/environment scope',
    negativeTests: [
      'missing token',
      'missing action',
      'tenant/workspace mismatch',
      'stale authority',
    ],
  },
  {
    name: 'ListRuns',
    kind: 'query',
    boundedContext: 'Runtime read model',
    dddObject: 'Run list read model',
    applicationPort: 'ListRunsUseCase',
    adapterSurface: 'GET /runs',
    scopeAndAuthorization: 'run:list, tenant scope',
    negativeTests: ['missing token', 'missing action', 'tenant mismatch'],
  },
  {
    name: 'GetRunStatus',
    kind: 'query',
    boundedContext: 'Runtime read model',
    dddObject: 'Run status read model',
    applicationPort: 'GetRunStatusUseCase',
    adapterSurface: 'GET /runs/:runId',
    scopeAndAuthorization: 'run:view, tenant scope',
    negativeTests: ['missing token', 'missing action', 'tenant mismatch', 'unknown run'],
  },
  {
    name: 'GetRunEvents',
    kind: 'query',
    boundedContext: 'Runtime read model',
    dddObject: 'Run event stream read model',
    applicationPort: 'GetRunEventsUseCase',
    adapterSurface: 'GET /runs/:runId/events',
    scopeAndAuthorization: 'run:logs:view, tenant scope',
    negativeTests: ['missing token', 'missing action', 'tenant mismatch', 'unknown run'],
  },
  {
    name: 'SignalRun',
    kind: 'command',
    boundedContext: 'Runtime control',
    dddObject: 'Run signal command',
    applicationPort: 'SignalRunUseCase',
    adapterSurface: 'POST /runs/:runId/signal',
    scopeAndAuthorization: 'run:signal, or run:cancel only for compatibility CANCEL',
    negativeTests: [
      'missing token',
      'missing action',
      'tenant mismatch',
      'unsupported signal',
      'compatibility disabled',
    ],
    compatibility: 'CANCEL through signal is compatibility behavior',
  },
  {
    name: 'CancelRun',
    kind: 'command',
    boundedContext: 'Runtime control',
    dddObject: 'Run cancel command',
    applicationPort: 'CancelRunUseCase',
    adapterSurface: 'POST /runs/:runId/cancel',
    scopeAndAuthorization: 'run:cancel, tenant scope',
    negativeTests: ['missing token', 'missing action', 'tenant mismatch', 'non-empty reason'],
  },
  {
    name: 'RecoverRun',
    kind: 'command',
    boundedContext: 'Runtime recovery',
    dddObject: 'Run recovery command',
    applicationPort: 'RecoverRunUseCase',
    adapterSurface: 'POST /runs/:runId/recover',
    scopeAndAuthorization: 'run:retry, tenant scope',
    negativeTests: [
      'missing token',
      'missing action',
      'tenant mismatch',
      'invalid recovery source',
    ],
  },
  {
    name: 'RebuildRunSnapshot',
    kind: 'command',
    boundedContext: 'Runtime repair operations',
    dddObject: 'Snapshot rebuild command',
    applicationPort: 'registerAdminRoutes maintenance port',
    adapterSurface: 'POST /admin/runs/:runId/rebuild-snapshot',
    scopeAndAuthorization: 'admin:rebuild-snapshot, tenant/admin scope',
    negativeTests: ['disabled route', 'missing token', 'missing action', 'tenant mismatch'],
  },
] as const satisfies readonly ProtectedRuntimeCommandQueryRail[];
