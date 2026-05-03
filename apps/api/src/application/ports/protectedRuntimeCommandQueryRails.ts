/**
 * Owned concern: publish the protected runtime command/query rail catalog for
 * the API application boundary.
 *
 * The catalog names product-intent rails and their DDD ownership. HTTP routes,
 * route handlers, and tests implement these rails; they do not define new
 * command/query semantics locally.
 */

export type ProtectedRuntimeRailKind = 'command' | 'query';

export type ProtectedRuntimeNegativeCoverage = {
  readonly case: string;
  readonly testRefs: readonly string[];
};

export type ProtectedRuntimeCompatibilityPosture =
  | {
      readonly status: 'canonical';
      readonly legacyAccepted: false;
    }
  | {
      readonly status: 'compatibility';
      readonly legacyAccepted: false;
      readonly compatibilityCase: string;
      readonly canonicalRail: string;
      readonly policy: string;
      readonly removalRequires: string;
    };

export type ProtectedRuntimeCommandQueryRail = {
  readonly name: string;
  readonly kind: ProtectedRuntimeRailKind;
  readonly boundedContext: string;
  readonly dddObject: string;
  readonly applicationPort: string;
  readonly adapterSurface: string;
  readonly scopeAndAuthorization: string;
  readonly negativeTests: readonly string[];
  readonly negativeCoverage: readonly ProtectedRuntimeNegativeCoverage[];
  readonly compatibilityPosture: ProtectedRuntimeCompatibilityPosture;
};

const CANONICAL_PROTECTED_RUNTIME_RAIL_POSTURE = {
  status: 'canonical',
  legacyAccepted: false,
} as const satisfies ProtectedRuntimeCompatibilityPosture;

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
    negativeCoverage: [
      {
        case: 'missing token',
        testRefs: ['apps/api/test/entrypoints/http/startRunRoute.authAndSuccess.test.ts'],
      },
      {
        case: 'missing action',
        testRefs: ['apps/api/test/application/services/startRunAuthorizedFacade.auth.test.ts'],
      },
      {
        case: 'tenant mismatch',
        testRefs: ['apps/api/test/entrypoints/http/startRunRoute.authAndSuccess.test.ts'],
      },
      {
        case: 'client runId',
        testRefs: ['apps/api/test/entrypoints/http/startRunRoute.validation.test.ts'],
      },
      {
        case: 'invalid plan source',
        testRefs: ['apps/api/test/entrypoints/http/startRunRoute.planSourcePolicy.test.ts'],
      },
    ],
    compatibilityPosture: CANONICAL_PROTECTED_RUNTIME_RAIL_POSTURE,
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
    negativeCoverage: [
      {
        case: 'missing token',
        testRefs: ['apps/api/test/entrypoints/http/previewPlanRoute.auth.test.ts'],
      },
      {
        case: 'missing action',
        testRefs: ['apps/api/test/entrypoints/http/previewPlanRoute.auth.test.ts'],
      },
      {
        case: 'tenant mismatch',
        testRefs: ['apps/api/test/entrypoints/http/planRouteRequestResolver.test.ts'],
      },
      {
        case: 'invalid graph source',
        testRefs: ['apps/api/test/entrypoints/http/previewPlanRoute.inputPolicy.test.ts'],
      },
      {
        case: 'invalid selection',
        testRefs: ['apps/api/test/entrypoints/http/planRouteSelectionParser.test.ts'],
      },
    ],
    compatibilityPosture: CANONICAL_PROTECTED_RUNTIME_RAIL_POSTURE,
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
    negativeCoverage: [
      {
        case: 'missing token',
        testRefs: ['apps/api/test/entrypoints/http/planRouteRequestResolver.test.ts'],
      },
      {
        case: 'missing action',
        testRefs: ['apps/api/test/entrypoints/http/planRouteRequestResolver.test.ts'],
      },
      {
        case: 'tenant mismatch',
        testRefs: ['apps/api/test/entrypoints/http/planRouteRequestResolver.test.ts'],
      },
      {
        case: 'unsupported adapter',
        testRefs: ['apps/api/test/entrypoints/http/compilePlanRoute.test.ts'],
      },
    ],
    compatibilityPosture: CANONICAL_PROTECTED_RUNTIME_RAIL_POSTURE,
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
    negativeCoverage: [
      {
        case: 'missing token',
        testRefs: ['apps/api/test/entrypoints/http/planRouteRequestResolver.test.ts'],
      },
      {
        case: 'missing action',
        testRefs: ['apps/api/test/entrypoints/http/planRouteRequestResolver.test.ts'],
      },
      {
        case: 'tenant mismatch',
        testRefs: ['apps/api/test/entrypoints/http/importPlanRoute.test.ts'],
      },
      {
        case: 'invalid plan ref',
        testRefs: ['apps/api/test/entrypoints/http/importPlanRoute.test.ts'],
      },
    ],
    compatibilityPosture: CANONICAL_PROTECTED_RUNTIME_RAIL_POSTURE,
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
    negativeCoverage: [
      {
        case: 'missing token',
        testRefs: ['apps/api/test/entrypoints/http/workspaceGraphDraftRoutes.test.ts'],
      },
      {
        case: 'missing action',
        testRefs: [
          'apps/api/test/application/services/authorizeWorkspaceGraphDraftCapabilityService.test.ts',
        ],
      },
      {
        case: 'tenant/workspace mismatch',
        testRefs: [
          'apps/api/test/application/services/authorizeWorkspaceGraphDraftCapabilityService.test.ts',
        ],
      },
    ],
    compatibilityPosture: CANONICAL_PROTECTED_RUNTIME_RAIL_POSTURE,
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
    negativeCoverage: [
      {
        case: 'missing token',
        testRefs: ['apps/api/test/entrypoints/http/workspaceGraphDraftRoutes.test.ts'],
      },
      {
        case: 'missing action',
        testRefs: [
          'apps/api/test/application/services/authorizeWorkspaceGraphDraftCapabilityService.test.ts',
        ],
      },
      {
        case: 'tenant/workspace mismatch',
        testRefs: [
          'apps/api/test/application/services/authorizeWorkspaceGraphDraftCapabilityService.test.ts',
        ],
      },
      {
        case: 'stale authority',
        testRefs: ['apps/api/test/entrypoints/http/workspaceGraphDraftRoutes.test.ts'],
      },
    ],
    compatibilityPosture: CANONICAL_PROTECTED_RUNTIME_RAIL_POSTURE,
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
    negativeCoverage: [
      {
        case: 'missing token',
        testRefs: ['apps/api/test/entrypoints/http/listRunsRoute.test.ts'],
      },
      {
        case: 'missing action',
        testRefs: ['apps/api/test/entrypoints/http/listRunsRoute.test.ts'],
      },
      {
        case: 'tenant mismatch',
        testRefs: ['apps/api/test/entrypoints/http/listRunsRoute.test.ts'],
      },
    ],
    compatibilityPosture: CANONICAL_PROTECTED_RUNTIME_RAIL_POSTURE,
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
    negativeCoverage: [
      {
        case: 'missing token',
        testRefs: ['apps/api/test/entrypoints/http/getRunRoute.test.ts'],
      },
      {
        case: 'missing action',
        testRefs: ['apps/api/test/entrypoints/http/getRunRoute.test.ts'],
      },
      {
        case: 'tenant mismatch',
        testRefs: ['apps/api/test/entrypoints/http/getRunRoute.test.ts'],
      },
      {
        case: 'unknown run',
        testRefs: ['apps/api/test/entrypoints/http/getRunRoute.test.ts'],
      },
    ],
    compatibilityPosture: CANONICAL_PROTECTED_RUNTIME_RAIL_POSTURE,
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
    negativeCoverage: [
      {
        case: 'missing token',
        testRefs: ['apps/api/test/entrypoints/http/getRunEventsRoute.test.ts'],
      },
      {
        case: 'missing action',
        testRefs: ['apps/api/test/entrypoints/http/getRunEventsRoute.test.ts'],
      },
      {
        case: 'tenant mismatch',
        testRefs: ['apps/api/test/entrypoints/http/getRunEventsRoute.test.ts'],
      },
      {
        case: 'unknown run',
        testRefs: ['apps/api/test/entrypoints/http/getRunEventsRoute.test.ts'],
      },
    ],
    compatibilityPosture: CANONICAL_PROTECTED_RUNTIME_RAIL_POSTURE,
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
    negativeCoverage: [
      {
        case: 'missing token',
        testRefs: ['apps/api/test/entrypoints/http/signalRunRoute.test.ts'],
      },
      {
        case: 'missing action',
        testRefs: ['apps/api/test/entrypoints/http/signalRunRoute.test.ts'],
      },
      {
        case: 'tenant mismatch',
        testRefs: ['apps/api/test/entrypoints/http/signalRunRoute.test.ts'],
      },
      {
        case: 'unsupported signal',
        testRefs: ['apps/api/test/entrypoints/http/signalRunRouteParser.test.ts'],
      },
      {
        case: 'compatibility disabled',
        testRefs: ['apps/api/test/entrypoints/http/signalRunRouteParser.test.ts'],
      },
    ],
    compatibilityPosture: {
      status: 'compatibility',
      legacyAccepted: false,
      compatibilityCase: 'CANCEL through POST /runs/:runId/signal',
      canonicalRail: 'CancelRun',
      policy: 'DVT_SIGNAL_ROUTE_ALLOW_CANCEL gates the compatibility signal type.',
      removalRequires: 'separate governed deprecation plan',
    },
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
    negativeCoverage: [
      {
        case: 'missing token',
        testRefs: ['apps/api/test/entrypoints/http/cancelRunRoute.test.ts'],
      },
      {
        case: 'missing action',
        testRefs: ['apps/api/test/entrypoints/http/cancelRunRoute.test.ts'],
      },
      {
        case: 'tenant mismatch',
        testRefs: ['apps/api/test/entrypoints/http/cancelRunRouteParser.test.ts'],
      },
      {
        case: 'non-empty reason',
        testRefs: ['apps/api/test/entrypoints/http/cancelRunRouteParser.test.ts'],
      },
    ],
    compatibilityPosture: CANONICAL_PROTECTED_RUNTIME_RAIL_POSTURE,
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
    negativeCoverage: [
      {
        case: 'missing token',
        testRefs: ['apps/api/test/entrypoints/http/recoverRunRoute.test.ts'],
      },
      {
        case: 'missing action',
        testRefs: ['apps/api/test/entrypoints/http/recoverRunRoute.test.ts'],
      },
      {
        case: 'tenant mismatch',
        testRefs: ['apps/api/test/entrypoints/http/recoverRunRouteParser.test.ts'],
      },
      {
        case: 'invalid recovery source',
        testRefs: ['apps/api/test/entrypoints/http/recoverRunRouteParser.test.ts'],
      },
    ],
    compatibilityPosture: CANONICAL_PROTECTED_RUNTIME_RAIL_POSTURE,
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
    negativeCoverage: [
      {
        case: 'disabled route',
        testRefs: ['apps/api/test/entrypoints/http/registerProtectedRuntimeRoutes.test.ts'],
      },
      {
        case: 'missing token',
        testRefs: ['apps/api/test/entrypoints/http/adminRoutes.test.ts'],
      },
      {
        case: 'missing action',
        testRefs: ['apps/api/test/entrypoints/http/adminRoutes.test.ts'],
      },
      {
        case: 'tenant mismatch',
        testRefs: ['apps/api/test/contracts/adminRebuildSnapshotAccessContract.test.ts'],
      },
    ],
    compatibilityPosture: CANONICAL_PROTECTED_RUNTIME_RAIL_POSTURE,
  },
] as const satisfies readonly ProtectedRuntimeCommandQueryRail[];
