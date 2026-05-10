/**
 * Owned concern: name protected runtime rail vocabulary once so rail catalogs
 * compose semantic constants instead of ad hoc string literals.
 */

export const PROTECTED_RUNTIME_RAIL_KIND = {
  command: 'command',
  query: 'query',
} as const;

export const PROTECTED_RUNTIME_NEGATIVE_CASE = {
  authenticationFailed: 'authentication failed',
  clientRunId: 'client runId',
  compatibilityDisabled: 'compatibility disabled',
  disabledRoute: 'disabled route',
  invalidGraphSource: 'invalid graph source',
  invalidPath: 'invalid path',
  invalidPlanSource: 'invalid plan source',
  invalidPlanRef: 'invalid plan ref',
  invalidRecoverySource: 'invalid recovery source',
  invalidSelection: 'invalid selection',
  missingAction: 'missing action',
  missingFile: 'missing file',
  missingScope: 'missing scope',
  missingToken: 'missing token',
  nonEmptyReason: 'non-empty reason',
  staleAuthority: 'stale authority',
  tenantMismatch: 'tenant mismatch',
  tenantWorkspaceMismatch: 'tenant/workspace mismatch',
  unknownRun: 'unknown run',
  unsupportedAdapter: 'unsupported adapter',
  unsupportedSignal: 'unsupported signal',
  workspaceContextNotGranted: 'workspace context not granted',
} as const;

export const PROTECTED_RUNTIME_TEST_REF = {
  adminRoutes: 'apps/api/test/entrypoints/http/adminRoutes.test.ts',
  adminRebuildSnapshotAccess: 'apps/api/test/contracts/adminRebuildSnapshotAccessContract.test.ts',
  cancelRunParser: 'apps/api/test/entrypoints/http/cancelRunRouteParser.test.ts',
  cancelRunRoute: 'apps/api/test/entrypoints/http/cancelRunRoute.test.ts',
  compilePlanRoute: 'apps/api/test/entrypoints/http/compilePlanRoute.test.ts',
  getRunEventsRoute: 'apps/api/test/entrypoints/http/getRunEventsRoute.test.ts',
  getRunRoute: 'apps/api/test/entrypoints/http/getRunRoute.test.ts',
  importPlanRoute: 'apps/api/test/entrypoints/http/importPlanRoute.test.ts',
  listRunsRoute: 'apps/api/test/entrypoints/http/listRunsRoute.test.ts',
  planRequestResolver: 'apps/api/test/entrypoints/http/planRouteRequestResolver.test.ts',
  planRouteSelectionParser: 'apps/api/test/entrypoints/http/planRouteSelectionParser.test.ts',
  previewPlanRouteAuth: 'apps/api/test/entrypoints/http/previewPlanRoute.auth.test.ts',
  previewPlanRouteInputPolicy:
    'apps/api/test/entrypoints/http/previewPlanRoute.inputPolicy.test.ts',
  protectedRuntimeRoutes: 'apps/api/test/entrypoints/http/registerProtectedRuntimeRoutes.test.ts',
  recoverRunParser: 'apps/api/test/entrypoints/http/recoverRunRouteParser.test.ts',
  recoverRunRoute: 'apps/api/test/entrypoints/http/recoverRunRoute.test.ts',
  sessionRoute: 'apps/api/test/entrypoints/http/sessionRoute.test.ts',
  signalRunParser: 'apps/api/test/entrypoints/http/signalRunRouteParser.test.ts',
  signalRunRoute: 'apps/api/test/entrypoints/http/signalRunRoute.test.ts',
  startRunAuthAndSuccess: 'apps/api/test/entrypoints/http/startRunRoute.authAndSuccess.test.ts',
  startRunAuthorizedFacadeAuth:
    'apps/api/test/application/services/startRunAuthorizedFacade.auth.test.ts',
  startRunPlanSourcePolicy: 'apps/api/test/entrypoints/http/startRunRoute.planSourcePolicy.test.ts',
  startRunValidation: 'apps/api/test/entrypoints/http/startRunRoute.validation.test.ts',
  workspaceDraftAuth:
    'apps/api/test/application/services/authorizeWorkspaceGraphDraftCapabilityService.test.ts',
  workspaceDraftRoutes: 'apps/api/test/entrypoints/http/workspaceGraphDraftRoutes.test.ts',
  workspaceContextRoute: 'apps/api/test/entrypoints/http/workspaceContextRoute.test.ts',
  workspaceFilesRoutes: 'apps/api/test/entrypoints/http/workspaceFilesRoutes.test.ts',
} as const;

export const PROTECTED_RUNTIME_PLAN_RAIL = {
  compileExecutablePlan: {
    name: 'CompileExecutablePlan',
    boundedContext: 'Planner boundary',
    dddObject: 'Compiled plan read model',
    applicationPort: 'CompilePlanUseCase',
    adapterSurface: 'POST /plans/compile',
    scopeAndAuthorization: 'run:start authorization, tenant scope',
  },
  getRuntimeSession: {
    name: 'GetRuntimeSession',
    boundedContext: 'Runtime session admission',
    dddObject: 'Authenticated session read model',
    applicationPort: 'IAuthenticator',
    adapterSurface: 'GET /session',
    scopeAndAuthorization: 'authenticated principal bearer token',
  },
  importExecutablePlan: {
    name: 'ImportExecutablePlan',
    boundedContext: 'Runtime plan ingestion',
    dddObject: 'Imported executable plan',
    applicationPort: 'ImportPlanUseCase',
    adapterSurface: 'POST /plans/import',
    scopeAndAuthorization: 'run:start authorization, tenant scope',
  },
  previewExecutablePlan: {
    name: 'PreviewExecutablePlan',
    boundedContext: 'Planner/runtime admission',
    dddObject: 'Executable plan draft',
    applicationPort: 'PreviewPlanUseCase',
    adapterSurface: 'POST /plans/preview',
    scopeAndAuthorization: 'run:start authorization, tenant scope',
  },
  startRun: {
    name: 'StartRun',
    boundedContext: 'Runtime safety and admission',
    dddObject: 'Run command admission',
    applicationPort: 'StartRunAuthorizedFacade',
    adapterSurface: 'POST /runs/start',
    scopeAndAuthorization: 'run:start, tenant scope',
  },
} as const;

export const PROTECTED_RUNTIME_WORKSPACE_RAIL = {
  getEffectiveWorkspaceContext: {
    name: 'GetEffectiveWorkspaceContext',
    boundedContext: 'Protected runtime workspace context',
    dddObject: 'EffectiveWorkspaceContext',
    applicationPort: 'IWorkspaceContextQuery',
    adapterSurface: 'GET /workspace/context',
    scopeAndAuthorization: 'authenticated principal plus backend grant store',
  },
  getWorkspaceGraphDraft: {
    name: 'GetWorkspaceGraphDraft',
    boundedContext: 'Workspace graph drafting',
    dddObject: 'Workspace draft read model',
    applicationPort: 'getWorkspaceGraphDraftUseCase',
    adapterSurface: 'GET /workspace/graph/draft',
    scopeAndAuthorization: 'workspace:graph-draft:view, tenant/project/environment scope',
  },
  saveWorkspaceGraphDraft: {
    name: 'SaveWorkspaceGraphDraft',
    boundedContext: 'Workspace graph drafting',
    dddObject: 'Workspace draft aggregate',
    applicationPort: 'saveWorkspaceGraphDraftUseCase',
    adapterSurface: 'PUT /workspace/graph/draft',
    scopeAndAuthorization: 'workspace:graph-draft:save, tenant/project/environment scope',
  },
  workspaceFiles: {
    listName: 'ListWorkspaceFiles',
    getContentName: 'GetWorkspaceFileContent',
    boundedContext: 'Operational evidence read models',
    treeReadModel: 'WorkspaceFileTree',
    contentReadModel: 'WorkspaceFileContent and WorkspacePath',
    listPort: 'ListWorkspaceFilesUseCase',
    getContentPort: 'GetWorkspaceFileContentUseCase',
    listSurface: 'GET /workspace/files',
    getContentSurface: 'GET /workspace/files/:path',
    scopeAndAuthorization: 'workspace:files:view, tenant/project/environment scope',
  },
} as const;
