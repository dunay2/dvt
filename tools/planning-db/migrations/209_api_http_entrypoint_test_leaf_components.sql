-- Split the broad API HTTP entrypoint test evidence component into
-- responsibility-owned leaves. These files are active validation assets; old
-- or nonfunctional files require explicit deprecation evidence before they can
-- be marked deprecated.

drop table if exists pg_temp.api_http_entrypoint_test_leaf_map;

create temporary table api_http_entrypoint_test_leaf_map (
  component_id text primary key,
  name text not null,
  ddd_owner text not null,
  cq_rails text not null,
  owned_concern text not null,
  responsibility text not null,
  reason_to_change text not null,
  invariant text not null,
  repo_path text not null,
  public_contract text not null,
  fowler_signal text not null,
  public_api text[] not null,
  owns text[] not null,
  test_paths text[] not null,
  test_kind text not null,
  coverage_level text not null,
  validation_command text not null,
  port_name text not null,
  negative_tests text[] not null,
  maturity_score numeric not null,
  criticality text not null,
  relation_suffix text not null,
  target_components text[] not null
);

insert into api_http_entrypoint_test_leaf_map (
  component_id,
  name,
  ddd_owner,
  cq_rails,
  owned_concern,
  responsibility,
  reason_to_change,
  invariant,
  repo_path,
  public_contract,
  fowler_signal,
  public_api,
  owns,
  test_paths,
  test_kind,
  coverage_level,
  validation_command,
  port_name,
  negative_tests,
  maturity_score,
  criticality,
  relation_suffix,
  target_components
)
values
  (
    'SYS-API-HTTP-ENTRYPOINT-TESTS-ADMIN-REPAIR',
    'API HTTP admin repair route tests',
    'ApiHttpAdminRepairTestEvidence',
    'ValidateApiHttpAdminRepairEvidence;RebuildRunSnapshot',
    'Owns admin repair route test evidence for disabled-by-default operational HTTP repair routes.',
    'Validate admin repair route enablement, authorization, and failure translation as HTTP adapter evidence.',
    'Admin route enablement, rebuild snapshot parsing, admin authorization, or operational repair route test changes.',
    'Admin repair route tests must resolve to this leaf and guard the admin repair HTTP implementation component.',
    'apps/api/test/entrypoints/http/adminRoutes.test.ts',
    'API HTTP admin repair route test evidence boundary.',
    'test_only_confidence',
    array['Admin repair route tests']::text[],
    array['apps/api/test/entrypoints/http/adminRoutes.test.ts']::text[],
    array['apps/api/test/entrypoints/http/adminRoutes.test.ts']::text[],
    'unit',
    'negative',
    'pnpm --filter dvt-api test -- apps/api/test/entrypoints/http/adminRoutes.test.ts',
    'ValidateApiHttpAdminRepairEvidence',
    array['admin routes disabled', 'missing admin authorization', 'invalid rebuild snapshot request']::text[],
    78,
    'high',
    'ADMIN-REPAIR',
    array['SYS-API-HTTP-ADMIN-REPAIR']::text[]
  ),
  (
    'SYS-API-HTTP-ENTRYPOINT-TESTS-AUTHENTICATION',
    'API HTTP authentication route tests',
    'ApiHttpAuthenticationTestEvidence',
    'ValidateApiHttpAuthenticationEvidence;AuthenticateHttpBearerPrincipal;AuthorizeHttpExecutionScope;ReadSessionPrincipal',
    'Owns bearer extraction, HTTP bearer authentication, session route, and start-run identity test evidence.',
    'Validate HTTP authentication and identity mapping before protected routes adapt application command/query rails.',
    'Bearer parsing, unauthenticated response semantics, session principal exposure, execution scope authorization, or identity mapping test changes.',
    'Authentication tests must resolve to this leaf and guard the API HTTP authentication implementation component.',
    'apps/api/test/entrypoints/http/httpBearerAuthentication.test.ts',
    'API HTTP authentication test evidence boundary.',
    'test_only_confidence',
    array['Bearer authentication tests', 'Session route tests', 'Start-run identity architecture tests']::text[],
    array[
      'apps/api/test/entrypoints/http/extractBearerToken.test.ts',
      'apps/api/test/entrypoints/http/httpBearerAuthentication.test.ts',
      'apps/api/test/entrypoints/http/sessionRoute.test.ts',
      'apps/api/test/entrypoints/http/startRunIdentity.architecture.test.ts'
    ]::text[],
    array[
      'apps/api/test/entrypoints/http/extractBearerToken.test.ts',
      'apps/api/test/entrypoints/http/httpBearerAuthentication.test.ts',
      'apps/api/test/entrypoints/http/sessionRoute.test.ts',
      'apps/api/test/entrypoints/http/startRunIdentity.architecture.test.ts'
    ]::text[],
    'architecture',
    'negative',
    'pnpm --filter dvt-api test -- apps/api/test/entrypoints/http/extractBearerToken.test.ts apps/api/test/entrypoints/http/httpBearerAuthentication.test.ts apps/api/test/entrypoints/http/sessionRoute.test.ts apps/api/test/entrypoints/http/startRunIdentity.architecture.test.ts',
    'ValidateApiHttpAuthenticationEvidence',
    array['missing bearer token', 'invalid bearer token', 'missing session principal', 'invalid start-run identity mapping']::text[],
    82,
    'critical',
    'AUTHENTICATION',
    array['SYS-API-HTTP-AUTHENTICATION']::text[]
  ),
  (
    'SYS-API-HTTP-ENTRYPOINT-TESTS-ERROR-TRANSLATION',
    'API HTTP error translation route tests',
    'ApiHttpErrorTranslationTestEvidence',
    'ValidateApiHttpErrorTranslationEvidence;TranslateDomainErrorToHttpResponse',
    'Owns HTTP error translation, runtime domain error mapping, and parser helper test evidence.',
    'Validate domain and parser failure translation into canonical HTTP responses without route-local error semantics.',
    'HTTP error contract, runtime domain mapping, start-run error mapping, parser primitive, or error support harness changes.',
    'Error translation tests must resolve to this leaf and guard the API HTTP error translation component.',
    'apps/api/test/entrypoints/http/httpErrorTranslation.respondAndStatic.test.ts',
    'API HTTP error translation test evidence boundary.',
    'boundary_drift',
    array['HTTP error translation tests', 'Runtime domain error architecture tests', 'Route parser helper tests']::text[],
    array[
      'apps/api/test/entrypoints/http/httpErrorTranslation.respondAndStatic.test.ts',
      'apps/api/test/entrypoints/http/httpErrorTranslation.runtimeDomain.test.ts',
      'apps/api/test/entrypoints/http/httpErrorTranslation.startRunEngineError.test.ts',
      'apps/api/test/entrypoints/http/httpErrorTranslation.startRunFacade.test.ts',
      'apps/api/test/entrypoints/http/httpErrorTranslation.test.support.ts',
      'apps/api/test/entrypoints/http/httpRuntimeErrorTranslation.architecture.test.ts',
      'apps/api/test/entrypoints/http/planRouteParserHelpers.test.ts'
    ]::text[],
    array[
      'apps/api/test/entrypoints/http/httpErrorTranslation.respondAndStatic.test.ts',
      'apps/api/test/entrypoints/http/httpErrorTranslation.runtimeDomain.test.ts',
      'apps/api/test/entrypoints/http/httpErrorTranslation.startRunEngineError.test.ts',
      'apps/api/test/entrypoints/http/httpErrorTranslation.startRunFacade.test.ts',
      'apps/api/test/entrypoints/http/httpRuntimeErrorTranslation.architecture.test.ts',
      'apps/api/test/entrypoints/http/planRouteParserHelpers.test.ts'
    ]::text[],
    'architecture',
    'negative',
    'pnpm --filter dvt-api test -- apps/api/test/entrypoints/http/httpErrorTranslation.respondAndStatic.test.ts apps/api/test/entrypoints/http/httpErrorTranslation.runtimeDomain.test.ts apps/api/test/entrypoints/http/httpErrorTranslation.startRunEngineError.test.ts apps/api/test/entrypoints/http/httpErrorTranslation.startRunFacade.test.ts apps/api/test/entrypoints/http/httpRuntimeErrorTranslation.architecture.test.ts apps/api/test/entrypoints/http/planRouteParserHelpers.test.ts',
    'ValidateApiHttpErrorTranslationEvidence',
    array['unknown domain error', 'invalid parser issue', 'missing canonical error reason', 'start-run engine error mapping drift']::text[],
    82,
    'critical',
    'ERROR-TRANSLATION',
    array['SYS-API-HTTP-ERROR-TRANSLATION']::text[]
  ),
  (
    'SYS-API-HTTP-ENTRYPOINT-TESTS-PLAN-COMMANDS',
    'API HTTP plan command route tests',
    'ApiHttpPlanCommandTestEvidence',
    'ValidateApiHttpPlanCommandEvidence;PreviewPlan;CompilePlan;ImportPlan;ExecutePlan;ResolvePlanReference',
    'Owns plan preview, compile, import, execute, request resolution, response translation, and plan route policy test evidence.',
    'Validate HTTP plan command adapters while keeping planner and execution semantics in application services and PlanStore components.',
    'Plan preview policy, compile/import response mapping, execute-plan facade, route request resolution, response translation, scope parsing, or plan test support changes.',
    'Plan command tests must resolve to this leaf and guard the API HTTP plan command implementation component.',
    'apps/api/test/entrypoints/http/previewPlanRoute.outcomes.test.ts',
    'API HTTP plan command route test evidence boundary.',
    'application_service_adapter',
    array['Preview plan route tests', 'Compile plan route tests', 'Import plan route tests', 'Execute plan facade tests', 'Plan route response translation tests']::text[],
    array[
      'apps/api/test/entrypoints/http/compilePlanRoute.test.ts',
      'apps/api/test/entrypoints/http/executePlanRouteFacade.test.ts',
      'apps/api/test/entrypoints/http/importPlanRoute.test.ts',
      'apps/api/test/entrypoints/http/planRouteFixtures.ts',
      'apps/api/test/entrypoints/http/planRouteHardCutSemantic.architecture.test.ts',
      'apps/api/test/entrypoints/http/planRouteHttpTestSupport.ts',
      'apps/api/test/entrypoints/http/planRouteRequestResolver.test.ts',
      'apps/api/test/entrypoints/http/planRouteResponseTranslation.architecture.test.ts',
      'apps/api/test/entrypoints/http/planRouteResponseTranslation.test.ts',
      'apps/api/test/entrypoints/http/planRouteScope.test.ts',
      'apps/api/test/entrypoints/http/planRouteSelectionParser.test.ts',
      'apps/api/test/entrypoints/http/previewPlanRoute.auth.test.ts',
      'apps/api/test/entrypoints/http/previewPlanRoute.inputPolicy.test.ts',
      'apps/api/test/entrypoints/http/previewPlanRoute.outcomes.test.ts',
      'apps/api/test/entrypoints/http/previewPlanRouteTestSupport.ts'
    ]::text[],
    array[
      'apps/api/test/entrypoints/http/compilePlanRoute.test.ts',
      'apps/api/test/entrypoints/http/executePlanRouteFacade.test.ts',
      'apps/api/test/entrypoints/http/importPlanRoute.test.ts',
      'apps/api/test/entrypoints/http/planRouteHardCutSemantic.architecture.test.ts',
      'apps/api/test/entrypoints/http/planRouteRequestResolver.test.ts',
      'apps/api/test/entrypoints/http/planRouteResponseTranslation.architecture.test.ts',
      'apps/api/test/entrypoints/http/planRouteResponseTranslation.test.ts',
      'apps/api/test/entrypoints/http/planRouteScope.test.ts',
      'apps/api/test/entrypoints/http/planRouteSelectionParser.test.ts',
      'apps/api/test/entrypoints/http/previewPlanRoute.auth.test.ts',
      'apps/api/test/entrypoints/http/previewPlanRoute.inputPolicy.test.ts',
      'apps/api/test/entrypoints/http/previewPlanRoute.outcomes.test.ts'
    ]::text[],
    'architecture',
    'flow',
    'pnpm --filter dvt-api test -- apps/api/test/entrypoints/http/compilePlanRoute.test.ts apps/api/test/entrypoints/http/executePlanRouteFacade.test.ts apps/api/test/entrypoints/http/importPlanRoute.test.ts apps/api/test/entrypoints/http/planRouteRequestResolver.test.ts apps/api/test/entrypoints/http/planRouteResponseTranslation.test.ts apps/api/test/entrypoints/http/previewPlanRoute.auth.test.ts apps/api/test/entrypoints/http/previewPlanRoute.inputPolicy.test.ts apps/api/test/entrypoints/http/previewPlanRoute.outcomes.test.ts',
    'ValidateApiHttpPlanCommandEvidence',
    array['invalid plan source', 'unauthorized preview', 'invalid plan route scope', 'plan response mapping drift']::text[],
    84,
    'critical',
    'PLAN-COMMANDS',
    array['SYS-API-HTTP-PLAN-COMMANDS']::text[]
  ),
  (
    'SYS-API-HTTP-ENTRYPOINT-TESTS-RUN-LIFECYCLE',
    'API HTTP run lifecycle route tests',
    'ApiHttpRunLifecycleTestEvidence',
    'ValidateApiHttpRunLifecycleEvidence;StartRun;CancelRun;SignalRun;RecoverRun;GetRun;ListRuns;GetRunEvents;GetCostAttributionSummary',
    'Owns run lifecycle HTTP route, parser, command executor, start-run, signal, recover, cancel, read, events, and cost summary test evidence.',
    'Validate run lifecycle HTTP adapters and route-specific failure translations before web or operator clients rely on them.',
    'Run command parser, route executor, start-run command builder, facade translation, plan source policy, target adapter parsing, run read, event read, signal, cancel, recover, or cost route test changes.',
    'Run lifecycle tests must resolve to this leaf and guard the API HTTP run lifecycle implementation component.',
    'apps/api/test/entrypoints/http/startRunRoute.authAndSuccess.test.ts',
    'API HTTP run lifecycle route test evidence boundary.',
    'application_service_adapter',
    array['StartRun route tests', 'Run command route executor tests', 'Run read route tests', 'Signal/cancel/recover route tests']::text[],
    array[
      'apps/api/test/entrypoints/http/cancelRunRouteParser.test.ts',
      'apps/api/test/entrypoints/http/cancelRunRoute.test.ts',
      'apps/api/test/entrypoints/http/getCostAttributionSummaryRoute.test.ts',
      'apps/api/test/entrypoints/http/getRunEventsRoute.test.ts',
      'apps/api/test/entrypoints/http/getRunRouteParser.test.ts',
      'apps/api/test/entrypoints/http/getRunRoute.test.ts',
      'apps/api/test/entrypoints/http/listRunsRouteParser.test.ts',
      'apps/api/test/entrypoints/http/listRunsRoute.test.ts',
      'apps/api/test/entrypoints/http/recoverRunRouteParser.test.ts',
      'apps/api/test/entrypoints/http/recoverRunRoute.test.ts',
      'apps/api/test/entrypoints/http/runCommandFieldParsers.test.ts',
      'apps/api/test/entrypoints/http/runCommandRouteExecutor.test.ts',
      'apps/api/test/entrypoints/http/signalRunRouteParser.test.ts',
      'apps/api/test/entrypoints/http/signalRunRoute.test.ts',
      'apps/api/test/entrypoints/http/startRunControlBoundary.architecture.test.ts',
      'apps/api/test/entrypoints/http/startRunHttpEntrypointComponent.architecture.test.ts',
      'apps/api/test/entrypoints/http/startRunRoute.authAndSuccess.test.ts',
      'apps/api/test/entrypoints/http/startRunRouteCommandBuilder.test.ts',
      'apps/api/test/entrypoints/http/startRunRoute.engineErrorTranslation.test.ts',
      'apps/api/test/entrypoints/http/startRunRoute.facadeResultTranslation.test.ts',
      'apps/api/test/entrypoints/http/startRunRoute.planSourcePolicy.test.ts',
      'apps/api/test/entrypoints/http/startRunRouteTargetAdapterParser.test.ts',
      'apps/api/test/entrypoints/http/startRunRoute.test.support.ts',
      'apps/api/test/entrypoints/http/startRunRoute.validation.test.ts'
    ]::text[],
    array[
      'apps/api/test/entrypoints/http/cancelRunRouteParser.test.ts',
      'apps/api/test/entrypoints/http/cancelRunRoute.test.ts',
      'apps/api/test/entrypoints/http/getCostAttributionSummaryRoute.test.ts',
      'apps/api/test/entrypoints/http/getRunEventsRoute.test.ts',
      'apps/api/test/entrypoints/http/getRunRouteParser.test.ts',
      'apps/api/test/entrypoints/http/getRunRoute.test.ts',
      'apps/api/test/entrypoints/http/listRunsRouteParser.test.ts',
      'apps/api/test/entrypoints/http/listRunsRoute.test.ts',
      'apps/api/test/entrypoints/http/recoverRunRouteParser.test.ts',
      'apps/api/test/entrypoints/http/recoverRunRoute.test.ts',
      'apps/api/test/entrypoints/http/runCommandFieldParsers.test.ts',
      'apps/api/test/entrypoints/http/runCommandRouteExecutor.test.ts',
      'apps/api/test/entrypoints/http/signalRunRouteParser.test.ts',
      'apps/api/test/entrypoints/http/signalRunRoute.test.ts',
      'apps/api/test/entrypoints/http/startRunControlBoundary.architecture.test.ts',
      'apps/api/test/entrypoints/http/startRunHttpEntrypointComponent.architecture.test.ts',
      'apps/api/test/entrypoints/http/startRunRoute.authAndSuccess.test.ts',
      'apps/api/test/entrypoints/http/startRunRouteCommandBuilder.test.ts',
      'apps/api/test/entrypoints/http/startRunRoute.engineErrorTranslation.test.ts',
      'apps/api/test/entrypoints/http/startRunRoute.facadeResultTranslation.test.ts',
      'apps/api/test/entrypoints/http/startRunRoute.planSourcePolicy.test.ts',
      'apps/api/test/entrypoints/http/startRunRouteTargetAdapterParser.test.ts',
      'apps/api/test/entrypoints/http/startRunRoute.validation.test.ts'
    ]::text[],
    'architecture',
    'flow',
    'pnpm --filter dvt-api test -- apps/api/test/entrypoints/http/cancelRunRoute.test.ts apps/api/test/entrypoints/http/getRunEventsRoute.test.ts apps/api/test/entrypoints/http/getRunRoute.test.ts apps/api/test/entrypoints/http/listRunsRoute.test.ts apps/api/test/entrypoints/http/recoverRunRoute.test.ts apps/api/test/entrypoints/http/runCommandRouteExecutor.test.ts apps/api/test/entrypoints/http/signalRunRoute.test.ts apps/api/test/entrypoints/http/startRunRoute.authAndSuccess.test.ts apps/api/test/entrypoints/http/startRunRoute.validation.test.ts',
    'ValidateApiHttpRunLifecycleEvidence',
    array['malformed run command', 'missing run id', 'unauthorized run command', 'invalid target adapter', 'domain error mapping drift']::text[],
    86,
    'critical',
    'RUN-LIFECYCLE',
    array['SYS-API-HTTP-RUN-LIFECYCLE']::text[]
  ),
  (
    'SYS-API-HTTP-ENTRYPOINT-TESTS-RUNTIME-ROUTE-REGISTRY',
    'API HTTP runtime route registry tests',
    'ApiHttpRuntimeRouteRegistryTestEvidence',
    'ValidateApiHttpRuntimeRouteRegistryEvidence;RegisterProtectedRuntimeHttpRoutes',
    'Owns protected runtime route dependency, capabilities, route-group architecture, and registration test evidence.',
    'Validate route registration topology without letting route groups own domain command/query semantics.',
    'Protected route dependencies, capabilities route shape, route group architecture, or runtime route registration test changes.',
    'Runtime route registry tests must resolve to this leaf and guard the protected runtime route registry component.',
    'apps/api/test/entrypoints/http/registerProtectedRuntimeRoutes.test.ts',
    'API HTTP runtime route registry test evidence boundary.',
    'bounded_context_route_registry',
    array['Protected runtime route dependency tests', 'Capabilities route tests', 'Route group architecture tests']::text[],
    array[
      'apps/api/test/entrypoints/http/capabilitiesRoutes.test.ts',
      'apps/api/test/entrypoints/http/protectedRuntimeRouteDependencies.test.ts',
      'apps/api/test/entrypoints/http/protectedRuntimeRouteGroup.architecture.test.ts',
      'apps/api/test/entrypoints/http/registerProtectedRuntimeRoutes.test.ts'
    ]::text[],
    array[
      'apps/api/test/entrypoints/http/capabilitiesRoutes.test.ts',
      'apps/api/test/entrypoints/http/protectedRuntimeRouteDependencies.test.ts',
      'apps/api/test/entrypoints/http/protectedRuntimeRouteGroup.architecture.test.ts',
      'apps/api/test/entrypoints/http/registerProtectedRuntimeRoutes.test.ts'
    ]::text[],
    'architecture',
    'boundary',
    'pnpm --filter dvt-api test -- apps/api/test/entrypoints/http/capabilitiesRoutes.test.ts apps/api/test/entrypoints/http/protectedRuntimeRouteDependencies.test.ts apps/api/test/entrypoints/http/protectedRuntimeRouteGroup.architecture.test.ts apps/api/test/entrypoints/http/registerProtectedRuntimeRoutes.test.ts',
    'ValidateApiHttpRuntimeRouteRegistryEvidence',
    array['missing protected route dependency', 'capability route registration drift', 'route group boundary violation']::text[],
    82,
    'high',
    'RUNTIME-ROUTE-REGISTRY',
    array['SYS-API-HTTP-RUNTIME-ROUTE-REGISTRY']::text[]
  ),
  (
    'SYS-API-HTTP-ENTRYPOINT-TESTS-WORKSPACE-ROUTES',
    'API HTTP workspace route tests',
    'ApiHttpWorkspaceRouteTestEvidence',
    'ValidateApiHttpWorkspaceRouteEvidence;ReadWorkspaceContext;ListWorkspacePlugins;ListProjects;CreateProject;ManageWorkspaceFiles;ReadWorkspaceDiffChanges;ReadWorkspaceGraphDraft;ImportWarehouseSources',
    'Owns workspace context, project onboarding, source import, workspace file, diff, graph draft, and plugin catalog route test evidence.',
    'Validate workspace/project/plugin/source HTTP adapters without duplicating application or infrastructure semantics in route tests.',
    'Workspace context, project onboarding, warehouse source import, workspace file history, file route, diff route, graph draft, or plugin catalog route test changes.',
    'Workspace route tests must resolve to this leaf and guard the API HTTP workspace route implementation component.',
    'apps/api/test/entrypoints/http/workspaceContextRoute.test.ts',
    'API HTTP workspace route test evidence boundary.',
    'application_service_adapter',
    array['Workspace context route tests', 'Workspace file route tests', 'Workspace graph draft route tests', 'Plugin catalog route tests']::text[],
    array[
      'apps/api/test/entrypoints/http/projectOnboardingRoutes.test.ts',
      'apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts',
      'apps/api/test/entrypoints/http/workspaceContextRoute.test.ts',
      'apps/api/test/entrypoints/http/workspaceDiffChangesRoutes.test.ts',
      'apps/api/test/entrypoints/http/workspaceFileHistoryRoutes.test.ts',
      'apps/api/test/entrypoints/http/workspaceFilesRoutes.test.ts',
      'apps/api/test/entrypoints/http/workspaceGraphDraftRoutes.test.ts',
      'apps/api/test/entrypoints/http/workspacePluginCatalogRoutes.test.ts'
    ]::text[],
    array[
      'apps/api/test/entrypoints/http/projectOnboardingRoutes.test.ts',
      'apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts',
      'apps/api/test/entrypoints/http/workspaceContextRoute.test.ts',
      'apps/api/test/entrypoints/http/workspaceDiffChangesRoutes.test.ts',
      'apps/api/test/entrypoints/http/workspaceFileHistoryRoutes.test.ts',
      'apps/api/test/entrypoints/http/workspaceFilesRoutes.test.ts',
      'apps/api/test/entrypoints/http/workspaceGraphDraftRoutes.test.ts',
      'apps/api/test/entrypoints/http/workspacePluginCatalogRoutes.test.ts'
    ]::text[],
    'integration',
    'flow',
    'pnpm --filter dvt-api test -- apps/api/test/entrypoints/http/projectOnboardingRoutes.test.ts apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts apps/api/test/entrypoints/http/workspaceContextRoute.test.ts apps/api/test/entrypoints/http/workspaceDiffChangesRoutes.test.ts apps/api/test/entrypoints/http/workspaceFileHistoryRoutes.test.ts apps/api/test/entrypoints/http/workspaceFilesRoutes.test.ts apps/api/test/entrypoints/http/workspaceGraphDraftRoutes.test.ts apps/api/test/entrypoints/http/workspacePluginCatalogRoutes.test.ts',
    'ValidateApiHttpWorkspaceRouteEvidence',
    array['workspace scope denied', 'invalid project onboarding request', 'missing plugin catalog', 'invalid warehouse source import']::text[],
    84,
    'critical',
    'WORKSPACE-ROUTES',
    array['SYS-API-HTTP-WORKSPACE-ROUTES']::text[]
  ),
  (
    'SYS-API-HTTP-ENTRYPOINT-TESTS-ARCHITECTURE-HARNESS',
    'API HTTP entrypoint architecture test harness',
    'ApiHttpArchitectureHarnessEvidence',
    'ValidateApiHttpArchitectureHarness;ValidateComponentIntegrity',
    'Owns shared HTTP architecture AST support used by HTTP entrypoint architecture tests.',
    'Keep HTTP architecture-test support explicit so component profiles distinguish harness files from route behavior evidence.',
    'HTTP architecture AST support, architecture harness import, or component-profile evidence changes.',
    'Shared HTTP architecture harness files must resolve to this leaf and guard the HTTP entrypoint architecture components they support.',
    'apps/api/test/entrypoints/http/httpArchitectureAst.support.ts',
    'API HTTP architecture test harness evidence boundary.',
    'test_only_confidence',
    array['HTTP architecture AST support']::text[],
    array['apps/api/test/entrypoints/http/httpArchitectureAst.support.ts']::text[],
    array[
      'apps/api/test/entrypoints/http/protectedRuntimeRouteGroup.architecture.test.ts',
      'apps/api/test/entrypoints/http/startRunHttpEntrypointComponent.architecture.test.ts',
      'apps/api/test/entrypoints/http/planRouteHardCutSemantic.architecture.test.ts'
    ]::text[],
    'architecture',
    'boundary',
    'pnpm --filter dvt-api test -- apps/api/test/entrypoints/http/protectedRuntimeRouteGroup.architecture.test.ts apps/api/test/entrypoints/http/startRunHttpEntrypointComponent.architecture.test.ts apps/api/test/entrypoints/http/planRouteHardCutSemantic.architecture.test.ts',
    'ValidateApiHttpArchitectureHarness',
    array['missing HTTP AST support import', 'architecture helper drift', 'component profile evidence gap']::text[],
    74,
    'high',
    'ARCHITECTURE-HARNESS',
    array[
      'SYS-API-HTTP-ENTRYPOINTS',
      'SYS-API-HTTP-RUNTIME-ROUTE-REGISTRY',
      'SYS-API-HTTP-RUN-LIFECYCLE',
      'SYS-API-HTTP-PLAN-COMMANDS'
    ]::text[]
  );

insert into architecture.design (
  design_id,
  work_item_id,
  title,
  owner,
  status,
  rationale,
  fowler_signal,
  rail_ref,
  approved_at
)
values (
  'PLANNING-DB-API-HTTP-ENTRYPOINT-TEST-LEAF-COMPONENTS-20260619',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'API HTTP entrypoint test evidence leaf mapping',
  'Architecture / Planning DB / API Tests',
  'review',
  'SYS-API-HTTP-ENTRYPOINT-TESTS owned 64 active HTTP entrypoint test and support files directly. The files are functional validation evidence, not obsolete paths. This migration turns the existing HTTP entrypoint test component into an aggregate and maps each current test or support file to a responsibility-owned evidence leaf with guards relations to the HTTP implementation components it validates.',
  'responsibility_overload',
  'ReadComponentProfile;ValidateComponentIntegrity;ValidateApiHttpEntrypoints',
  null
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  updated_at = now();

insert into architecture.design_scope (
  design_id,
  subject_kind,
  subject_id,
  scope_kind,
  required
)
select distinct
  'PLANNING-DB-API-HTTP-ENTRYPOINT-TEST-LEAF-COMPONENTS-20260619',
  scope.subject_kind,
  scope.subject_id,
  scope.scope_kind,
  true
from (
  select 'component'::text, 'SYS-API-HTTP-ENTRYPOINT-TESTS'::text, 'may_update'::text
  union all
  select 'component', 'SYS-API-HTTP-ENTRYPOINTS', 'may_reference'
  union all
  select 'path', 'apps/api/test/entrypoints/http/**', 'may_update'
  union all
  select 'component', component_id, 'may_create'
  from api_http_entrypoint_test_leaf_map
  union all
  select 'component', target_component, 'may_reference'
  from api_http_entrypoint_test_leaf_map
  cross join lateral unnest(target_components) as target(target_component)
  union all
  select 'path', pattern, 'may_update'
  from api_http_entrypoint_test_leaf_map
  cross join lateral unnest(owns) as owned(pattern)
) scope(subject_kind, subject_id, scope_kind)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update planning_query_store.governance_components component
set
  children_required = true,
  cq_rails = 'ValidateApiHttpEntrypoints;ReadComponentProfile;ValidateComponentIntegrity',
  fowler_signals = jsonb_build_array('responsibility_overload', 'test_evidence_boundary', 'component_split'),
  raw_component = component.raw_component || jsonb_build_object(
    'childrenRequired',
    true,
    'cqRails',
    'ValidateApiHttpEntrypoints;ReadComponentProfile;ValidateComponentIntegrity',
    'reconciledBy',
    '209_api_http_entrypoint_test_leaf_components',
    'ownedConcern',
    'Owns the aggregate API HTTP entrypoint test evidence boundary; concrete files resolve to responsibility-owned child evidence components.'
  )
where component.component_id = 'SYS-API-HTTP-ENTRYPOINT-TESTS';

insert into planning_query_store.governance_component_local_definitions (
  component_id,
  source_path,
  source_content_sha256,
  revision,
  name,
  level,
  parent_id,
  root_unit,
  domain_unit,
  status,
  children_required,
  owned_concern,
  ddd_owner,
  cq_rails,
  created_by
)
values (
  'SYS-API-HTTP-ENTRYPOINT-TESTS',
  'tools/planning-db/migrations/209_api_http_entrypoint_test_leaf_components.sql',
  md5('SYS-API-HTTP-ENTRYPOINT-TESTS:209') || md5('api-http-entrypoint-tests-parent:209'),
  0,
  'API HTTP entrypoint tests',
  'component',
  'SYS-API-TESTS',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  true,
  'Owns the aggregate API HTTP entrypoint test evidence boundary; concrete files resolve to responsibility-owned child evidence components.',
  'ApiHttpEntrypointTestEvidenceCatalog',
  'ValidateApiHttpEntrypoints;ReadComponentProfile;ValidateComponentIntegrity',
  'codex'
)
on conflict (component_id) do update set
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  name = excluded.name,
  level = excluded.level,
  parent_id = excluded.parent_id,
  root_unit = excluded.root_unit,
  domain_unit = excluded.domain_unit,
  status = excluded.status,
  children_required = excluded.children_required,
  owned_concern = excluded.owned_concern,
  ddd_owner = excluded.ddd_owner,
  cq_rails = excluded.cq_rails;

insert into planning_query_store.governance_component_local_definitions (
  component_id,
  source_path,
  source_content_sha256,
  revision,
  name,
  level,
  parent_id,
  root_unit,
  domain_unit,
  status,
  children_required,
  owned_concern,
  ddd_owner,
  cq_rails,
  created_by
)
select
  component_id,
  'tools/planning-db/migrations/209_api_http_entrypoint_test_leaf_components.sql',
  md5(component_id || ':209') || md5(repo_path || cq_rails || ':api-http-entrypoint-test-leaf'),
  0,
  name,
  'component',
  'SYS-API-HTTP-ENTRYPOINT-TESTS',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  false,
  owned_concern,
  ddd_owner,
  cq_rails,
  'codex'
from api_http_entrypoint_test_leaf_map
on conflict (component_id) do update set
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  name = excluded.name,
  level = excluded.level,
  parent_id = excluded.parent_id,
  root_unit = excluded.root_unit,
  domain_unit = excluded.domain_unit,
  status = excluded.status,
  children_required = excluded.children_required,
  owned_concern = excluded.owned_concern,
  ddd_owner = excluded.ddd_owner,
  cq_rails = excluded.cq_rails;

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
select
  component_id,
  'owns',
  own.pattern,
  own.pattern_order - 1
from api_http_entrypoint_test_leaf_map
cross join lateral unnest(owns) with ordinality as own(pattern, pattern_order)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
select
  item.component_id,
  item.item_kind,
  item.item_value,
  item.item_order
from (
  values
    (
      'SYS-API-HTTP-ENTRYPOINT-TESTS',
      'responsibility',
      'Own the aggregate API HTTP entrypoint test evidence boundary and delegate concrete test/support files to responsibility-owned evidence leaves.',
      0
    ),
    (
      'SYS-API-HTTP-ENTRYPOINT-TESTS',
      'reason_to_change',
      'API HTTP entrypoint test taxonomy, evidence ownership, implementation guard relation, or component hierarchy changes.',
      0
    ),
    (
      'SYS-API-HTTP-ENTRYPOINT-TESTS',
      'invariant',
      'The aggregate must own no concrete apps/api/test/entrypoints/http files directly once HTTP entrypoint test leaves are applied, except files deliberately owned by cross-context components such as PlanStore.',
      0
    ),
    (
      'SYS-API-HTTP-ENTRYPOINT-TESTS',
      'non_goal',
      'Do not deprecate active API HTTP entrypoint test files merely to reduce direct-file count; nonfunctional files require explicit deprecation evidence.',
      0
    ),
    (
      'SYS-API-HTTP-ENTRYPOINT-TESTS',
      'governance_ref',
      'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
      0
    )
) item(component_id, item_kind, item_value, item_order)
where exists (
  select 1
  from planning_query_store.governance_component_local_definitions local_definition
  where local_definition.component_id = item.component_id
)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
select
  item.component_id,
  item.item_kind,
  item.item_value,
  item.item_order
from (
  select component_id, 'responsibility' as item_kind, responsibility as item_value, 0 as item_order
  from api_http_entrypoint_test_leaf_map
  union all
  select component_id, 'reason_to_change', reason_to_change, 0
  from api_http_entrypoint_test_leaf_map
  union all
  select component_id, 'invariant', invariant, 0
  from api_http_entrypoint_test_leaf_map
  union all
  select component_id, 'transition', 'review -> implemented after component-quality shows SYS-API-HTTP-ENTRYPOINT-TESTS owns no direct files and the leaf validation command passes.', 0
  from api_http_entrypoint_test_leaf_map
  union all
  select component_id, 'consumer', 'API maintainers, Planning DB component-profile readers, component-integrity, and CI changed-slice checks', 0
  from api_http_entrypoint_test_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md', 0
  from api_http_entrypoint_test_leaf_map
  union all
  select component_id, 'fowler_signal', fowler_signal, 0
  from api_http_entrypoint_test_leaf_map
  union all
  select component_id, 'public_api', api.value, api.item_order - 1
  from api_http_entrypoint_test_leaf_map
  cross join lateral unnest(public_api) with ordinality as api(value, item_order)
) item
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update architecture.component
set
  kind = 'module',
  layer = 'infra',
  owner = 'ApiHttpEntrypointTestEvidenceCatalog',
  repo_path = 'apps/api/test/entrypoints/http',
  public_contract = 'Aggregate API HTTP entrypoint test evidence boundary; concrete test/support files resolve to responsibility-owned child evidence components.',
  runtime = 'node',
  criticality = 'high',
  status = 'review',
  maturity_score = greatest(coalesce(maturity_score, 0), 82),
  parent_component_id = 'SYS-API-TESTS',
  updated_at = now()
where component_id = 'SYS-API-HTTP-ENTRYPOINT-TESTS';

insert into architecture.component (
  component_id,
  name,
  kind,
  layer,
  owner,
  repo_path,
  public_contract,
  runtime,
  criticality,
  status,
  maturity_score,
  parent_component_id
)
select
  component_id,
  name,
  'module',
  'infra',
  ddd_owner,
  repo_path,
  public_contract,
  'node',
  criticality,
  'review',
  maturity_score,
  'SYS-API-HTTP-ENTRYPOINT-TESTS'
from api_http_entrypoint_test_leaf_map
on conflict (component_id) do update set
  name = excluded.name,
  kind = excluded.kind,
  layer = excluded.layer,
  owner = excluded.owner,
  repo_path = excluded.repo_path,
  public_contract = excluded.public_contract,
  runtime = excluded.runtime,
  criticality = excluded.criticality,
  status = excluded.status,
  maturity_score = excluded.maturity_score,
  parent_component_id = excluded.parent_component_id,
  updated_at = now();

insert into architecture.component_responsibility (
  responsibility_id,
  component_id,
  responsibility,
  reason_to_change,
  ddd_owner,
  status
)
select
  'RESP-' || component_id,
  component_id,
  responsibility,
  reason_to_change,
  ddd_owner,
  'implemented'
from api_http_entrypoint_test_leaf_map
union all
select
  'RESP-SYS-API-HTTP-ENTRYPOINT-TESTS',
  'SYS-API-HTTP-ENTRYPOINT-TESTS',
  'Own the aggregate API HTTP entrypoint test evidence boundary and delegate concrete test/support files to evidence leaves.',
  'API HTTP entrypoint test taxonomy, evidence ownership, implementation guard relation, or component hierarchy changes.',
  'ApiHttpEntrypointTestEvidenceCatalog',
  'implemented'
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

insert into architecture.contract (
  contract_id,
  contract_kind,
  owner_component_id,
  contract_ref,
  compatibility,
  status,
  validation_command
)
select
  'CONTRACT-' || component_id || '-EVIDENCE',
  'type',
  component_id,
  public_contract,
  'internal',
  'implemented',
  validation_command
from api_http_entrypoint_test_leaf_map
on conflict (contract_id) do update set
  contract_kind = excluded.contract_kind,
  owner_component_id = excluded.owner_component_id,
  contract_ref = excluded.contract_ref,
  compatibility = excluded.compatibility,
  status = excluded.status,
  validation_command = excluded.validation_command;

insert into architecture.component_relation (
  relation_id,
  source_component_id,
  target_component_id,
  relation_type,
  direction,
  sync_async,
  contract_id,
  failure_mode,
  authorization_scope,
  source_refs,
  status
)
select
  'REL-API-HTTP-ENTRYPOINT-TESTS-CONTAINS-' || relation_suffix,
  'SYS-API-HTTP-ENTRYPOINT-TESTS',
  component_id,
  'contains',
  'outbound',
  'build_time',
  null,
  'Component profile becomes incomplete if this API HTTP entrypoint test evidence leaf is removed or remapped without a governed Planning DB component update.',
  'repo-local API HTTP test governance',
  jsonb_build_array(
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    repo_path
  ),
  'implemented'
from api_http_entrypoint_test_leaf_map
on conflict (relation_id) do update set
  source_component_id = excluded.source_component_id,
  target_component_id = excluded.target_component_id,
  relation_type = excluded.relation_type,
  direction = excluded.direction,
  sync_async = excluded.sync_async,
  contract_id = excluded.contract_id,
  failure_mode = excluded.failure_mode,
  authorization_scope = excluded.authorization_scope,
  source_refs = excluded.source_refs,
  status = excluded.status,
  updated_at = now();

insert into architecture.component_relation (
  relation_id,
  source_component_id,
  target_component_id,
  relation_type,
  direction,
  sync_async,
  contract_id,
  failure_mode,
  authorization_scope,
  source_refs,
  status
)
select
  'REL-' || component_id || '-GUARDS-' ||
    replace(replace(target_component.target_component_id, 'SYS-', ''), '_', '-'),
  component_id,
  target_component.target_component_id,
  'guards',
  'outbound',
  'build_time',
  'CONTRACT-' || component_id || '-EVIDENCE',
  'Implementation component can drift without this test evidence being visible in the Planning DB component graph.',
  'repo-local API HTTP test evidence',
  jsonb_build_array(
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    repo_path
  ),
  'implemented'
from api_http_entrypoint_test_leaf_map
cross join lateral unnest(target_components) as target_component(target_component_id)
on conflict (relation_id) do update set
  source_component_id = excluded.source_component_id,
  target_component_id = excluded.target_component_id,
  relation_type = excluded.relation_type,
  direction = excluded.direction,
  sync_async = excluded.sync_async,
  contract_id = excluded.contract_id,
  failure_mode = excluded.failure_mode,
  authorization_scope = excluded.authorization_scope,
  source_refs = excluded.source_refs,
  status = excluded.status,
  updated_at = now();

insert into architecture.component_port (
  port_id,
  component_id,
  port_name,
  port_kind,
  direction,
  input_contract_id,
  output_contract_id,
  negative_tests,
  status
)
select
  'PORT-' || component_id || '-' || upper(regexp_replace(port_name, '[^A-Za-z0-9]+', '-', 'g')),
  component_id,
  port_name,
  'query',
  'inbound',
  'CONTRACT-' || component_id || '-EVIDENCE',
  'CONTRACT-' || component_id || '-EVIDENCE',
  negative_tests,
  'implemented'
from api_http_entrypoint_test_leaf_map
on conflict (port_id) do update set
  component_id = excluded.component_id,
  port_name = excluded.port_name,
  port_kind = excluded.port_kind,
  direction = excluded.direction,
  input_contract_id = excluded.input_contract_id,
  output_contract_id = excluded.output_contract_id,
  negative_tests = excluded.negative_tests,
  status = excluded.status;

insert into architecture.component_test (
  test_id,
  component_id,
  test_path,
  test_kind,
  coverage_level,
  required,
  validation_command
)
select
  'TEST-' || component_id || '-' || test_path.test_order,
  component_id,
  test_path.path,
  test_kind,
  coverage_level,
  true,
  validation_command
from api_http_entrypoint_test_leaf_map
cross join lateral unnest(test_paths) with ordinality as test_path(path, test_order)
union all
select
  'TEST-SYS-API-HTTP-ENTRYPOINT-TESTS-COMPONENT-PROFILE',
  'SYS-API-HTTP-ENTRYPOINT-TESTS',
  'scripts/planning-db-query.test.cjs',
  'architecture',
  'boundary',
  true,
  'pnpm planning:db:query component-quality --component SYS-API-HTTP-ENTRYPOINT-TESTS --no-refresh --limit 20 && pnpm planning:db:query files --component SYS-API-HTTP-ENTRYPOINT-TESTS --no-refresh --limit 20'
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

insert into architecture.component_observability (
  observability_id,
  component_id,
  signal_name,
  signal_kind,
  required,
  status
)
select
  'OBS-' || component_id || '-API-HTTP-ENTRYPOINT-TEST-EVIDENCE',
  component_id,
  name || ' is observable through component-profile, component-quality, and focused dvt-api test output.',
  'log',
  true,
  'implemented'
from api_http_entrypoint_test_leaf_map
union all
select
  'OBS-SYS-API-HTTP-ENTRYPOINT-TESTS-COMPONENT-QUALITY',
  'SYS-API-HTTP-ENTRYPOINT-TESTS',
  'API HTTP entrypoint test aggregate health is observable through component-quality and files query output.',
  'log',
  true,
  'implemented'
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;

drop table if exists pg_temp.api_http_entrypoint_test_leaf_map;
