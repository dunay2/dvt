-- Split API HTTP entrypoints into semantic leaves and map the canonical
-- bearer-auth helper that removes duplicate route-local authentication code.

drop table if exists pg_temp.api_http_entrypoint_leaf_map;
drop table if exists pg_temp.api_http_entrypoint_leaf_port_map;

create temporary table api_http_entrypoint_leaf_map (
  component_id text primary key,
  name text not null,
  kind text not null,
  layer text not null,
  ddd_owner text not null,
  cq_rails text not null,
  owned_concern text not null,
  responsibility text not null,
  reason_to_change text not null,
  invariant text not null,
  transition text not null,
  consumer text not null,
  repo_path text not null,
  criticality text not null,
  maturity_score numeric not null,
  public_contract text not null,
  fowler_signal text not null,
  public_api text[] not null,
  owns text[] not null,
  test_paths text[] not null,
  test_kind text not null,
  coverage_level text not null,
  validation_command text not null
);

create temporary table api_http_entrypoint_leaf_port_map (
  component_id text not null,
  port_name text not null,
  port_kind text not null,
  primary key (component_id, port_name)
);

insert into api_http_entrypoint_leaf_map (
  component_id,
  name,
  kind,
  layer,
  ddd_owner,
  cq_rails,
  owned_concern,
  responsibility,
  reason_to_change,
  invariant,
  transition,
  consumer,
  repo_path,
  criticality,
  maturity_score,
  public_contract,
  fowler_signal,
  public_api,
  owns,
  test_paths,
  test_kind,
  coverage_level,
  validation_command
)
values
  (
    'SYS-API-HTTP-AUTHENTICATION',
    'API HTTP authentication and execution scope adapter',
    'adapter',
    'adapter',
    'HttpAuthenticationAdapter',
    'AuthenticateHttpBearerPrincipal;AuthorizeHttpExecutionScope;ReadSessionPrincipal',
    'Owns bearer token extraction, canonical unauthenticated HTTP response semantics, execution-scope authorization adapters, and session principal exposure.',
    'Adapt external HTTP authentication and scope checks to API application authorization ports without duplicating bearer semantics in route groups.',
    'Authentication header parsing, route-level bearer failure contract, execution-scope authorization, session exposure, or start-run identity mapping changes.',
    'Every route that only needs bearer principal authentication must use authenticateHttpBearerRequest instead of route-local copies.',
    'review -> implemented once duplicate bearer authentication symbols disappear and API HTTP auth/session tests pass.',
    'API protected route groups, session/profile callers, run commands, and workspace routes.',
    'apps/api/src/entrypoints/http/httpBearerAuthentication.ts',
    'high',
    78,
    'Canonical API HTTP bearer authentication and execution-scope authorization surface.',
    'ports_and_adapters',
    array[
      'authenticateHttpBearerRequest',
      'extractBearerToken',
      'authorizeExecutionScope',
      'authorizeAdminExecutionScope',
      'sessionRoute'
    ]::text[],
    array[
      'apps/api/src/entrypoints/http/authHeaders.ts',
      'apps/api/src/entrypoints/http/authorizeAdminExecutionScope.ts',
      'apps/api/src/entrypoints/http/authorizeExecutionScope.ts',
      'apps/api/src/entrypoints/http/extractBearerToken.ts',
      'apps/api/src/entrypoints/http/httpBearerAuthentication.ts',
      'apps/api/src/entrypoints/http/sessionRoute.ts',
      'apps/api/src/entrypoints/http/signalRunRouteAuthorization.constants.ts',
      'apps/api/src/entrypoints/http/startRunIdentity.ts'
    ]::text[],
    array[
      'apps/api/test/entrypoints/http/extractBearerToken.test.ts',
      'apps/api/test/entrypoints/http/httpBearerAuthentication.test.ts',
      'apps/api/test/entrypoints/http/sessionRoute.test.ts',
      'apps/api/test/entrypoints/http/startRunIdentity.architecture.test.ts'
    ]::text[],
    'unit',
    'negative',
    'pnpm --filter dvt-api test -- httpBearerAuthentication.test.ts extractBearerToken.test.ts sessionRoute.test.ts startRunIdentity.architecture.test.ts'
  ),
  (
    'SYS-API-HTTP-ADMIN-REPAIR',
    'API HTTP admin repair routes',
    'adapter',
    'adapter',
    'AdminRepairHttpAdapter',
    'RebuildRunSnapshot',
    'Owns optional admin-only HTTP repair routes and their guarded route group registration.',
    'Expose operational repair commands through disabled-by-default admin HTTP routes with explicit authorization and error translation.',
    'Admin repair route behavior, admin route enablement, rebuild-snapshot parsing, or admin authorization changes.',
    'Admin repair routes must remain disabled unless the runtime environment explicitly enables them.',
    'review -> implemented once admin route tests and protected route group architecture tests pass.',
    'Runtime operators and protected runtime route registration.',
    'apps/api/src/entrypoints/http/adminRoutes.ts',
    'high',
    72,
    'Admin HTTP repair command adapter for run snapshot rebuild.',
    'explicit_operational_boundary',
    array['registerAdminRoutes', 'registerProtectedAdminRouteGroup']::text[],
    array[
      'apps/api/src/entrypoints/http/adminRoutes.ts',
      'apps/api/src/entrypoints/http/protectedRuntimeAdminRouteGroup.ts'
    ]::text[],
    array['apps/api/test/entrypoints/http/adminRoutes.test.ts']::text[],
    'unit',
    'negative',
    'pnpm --filter dvt-api test -- adminRoutes.test.ts'
  ),
  (
    'SYS-API-HTTP-RUNTIME-ROUTE-REGISTRY',
    'API HTTP protected runtime route registry',
    'adapter',
    'adapter',
    'ProtectedRuntimeHttpRouteRegistry',
    'RegisterProtectedRuntimeHttpRoutes',
    'Owns protected runtime HTTP route grouping, shared dependencies, and registration topology.',
    'Wire route groups to Fastify without making route registration own command/query semantics.',
    'Route path constants, protected route dependency composition, route group registration, or runtime route topology changes.',
    'Route registry files must compose route adapters and must not implement domain behavior directly.',
    'review -> implemented once protected runtime registration tests pass and parent HTTP entrypoints own no direct files.',
    'API server bootstrap and protected runtime module composition.',
    'apps/api/src/entrypoints/http/registerProtectedRuntimeRoutes.ts',
    'high',
    74,
    'Protected runtime HTTP route registration surface.',
    'bounded_context_route_registry',
    array[
      'registerProtectedRuntimeRoutes',
      'registerProtectedPlanRoutes',
      'registerProtectedRunRoutes',
      'RUNTIME_ROUTE_PATH'
    ]::text[],
    array[
      'apps/api/src/entrypoints/http/projectOnboardingRouteGroup.ts',
      'apps/api/src/entrypoints/http/protectedRuntimePlanRoutes.ts',
      'apps/api/src/entrypoints/http/protectedRuntimeRouteDependencies.ts',
      'apps/api/src/entrypoints/http/protectedRuntimeRunRoutes.ts',
      'apps/api/src/entrypoints/http/protectedRuntimeWorkspaceContextRouteGroup.ts',
      'apps/api/src/entrypoints/http/protectedRuntimeWorkspaceGraphDraftRouteGroup.ts',
      'apps/api/src/entrypoints/http/registerProtectedRuntimeRoutes.ts',
      'apps/api/src/entrypoints/http/runtimeRoutes.constants.ts',
      'apps/api/src/entrypoints/http/warehouseSourceImportRouteGroup.ts',
      'apps/api/src/entrypoints/http/workspaceDiffChangesRouteGroup.ts',
      'apps/api/src/entrypoints/http/workspaceFilesRouteGroup.ts',
      'apps/api/src/entrypoints/http/workspacePluginCatalogRouteGroup.ts'
    ]::text[],
    array[
      'apps/api/test/entrypoints/http/protectedRuntimeRouteDependencies.test.ts',
      'apps/api/test/entrypoints/http/protectedRuntimeRouteGroup.architecture.test.ts',
      'apps/api/test/entrypoints/http/registerProtectedRuntimeRoutes.test.ts'
    ]::text[],
    'architecture',
    'boundary',
    'pnpm --filter dvt-api test -- protectedRuntimeRouteDependencies.test.ts protectedRuntimeRouteGroup.architecture.test.ts registerProtectedRuntimeRoutes.test.ts'
  ),
  (
    'SYS-API-HTTP-ERROR-TRANSLATION',
    'API HTTP error translation and parser primitives',
    'adapter',
    'adapter',
    'HttpErrorTranslationAdapter',
    'TranslateDomainErrorToHttpResponse',
    'Owns HTTP error contracts, domain error classification, reason catalog, parser issues, and route parser primitives.',
    'Translate domain and parser failures into canonical HTTP error responses for route adapters.',
    'HTTP error response shape, parser primitive semantics, reason catalog, or runtime domain error mapping changes.',
    'HTTP route adapters must emit canonical error reasons through this translation surface instead of local response copies.',
    'review -> implemented once HTTP error translation tests and parser helper tests pass.',
    'All API HTTP route adapters and web clients consuming error contracts.',
    'apps/api/src/entrypoints/http/httpErrorTranslation.ts',
    'high',
    76,
    'Canonical API HTTP error contract and translation surface.',
    'anti_corruption_layer',
    array[
      'httpErrorTranslation',
      'httpErrorMapper',
      'HTTP_ERROR_REASON',
      'badRequestIssue',
      'parseStringField'
    ]::text[],
    array[
      'apps/api/src/entrypoints/http/httpDomainErrorClassifier.ts',
      'apps/api/src/entrypoints/http/httpErrorContract.ts',
      'apps/api/src/entrypoints/http/httpErrorDetails.ts',
      'apps/api/src/entrypoints/http/httpErrorMapper.ts',
      'apps/api/src/entrypoints/http/httpErrorReasonCatalog.ts',
      'apps/api/src/entrypoints/http/httpErrorTranslation.ts',
      'apps/api/src/entrypoints/http/planPreviewContractErrorMapper.ts',
      'apps/api/src/entrypoints/http/routeParseIssue.ts',
      'apps/api/src/entrypoints/http/routeParserPrimitives.ts'
    ]::text[],
    array[
      'apps/api/test/entrypoints/http/httpErrorTranslation.respondAndStatic.test.ts',
      'apps/api/test/entrypoints/http/httpErrorTranslation.runtimeDomain.test.ts',
      'apps/api/test/entrypoints/http/httpErrorTranslation.startRunEngineError.test.ts',
      'apps/api/test/entrypoints/http/httpErrorTranslation.startRunFacade.test.ts',
      'apps/api/test/entrypoints/http/httpRuntimeErrorTranslation.architecture.test.ts',
      'apps/api/test/entrypoints/http/planRouteParserHelpers.test.ts'
    ]::text[],
    'unit',
    'negative',
    'pnpm --filter dvt-api test -- httpErrorTranslation.respondAndStatic.test.ts httpErrorTranslation.runtimeDomain.test.ts httpErrorTranslation.startRunEngineError.test.ts httpErrorTranslation.startRunFacade.test.ts httpRuntimeErrorTranslation.architecture.test.ts planRouteParserHelpers.test.ts'
  ),
  (
    'SYS-API-HTTP-PLAN-COMMANDS',
    'API HTTP plan preview, import, compile, and execution routes',
    'adapter',
    'adapter',
    'PlanHttpCommandAdapter',
    'PreviewPlan;CompilePlan;ImportPlan;ExecutePlan;ResolvePlanReference',
    'Owns HTTP adapters for plan preview, plan import, plan compile, plan execution, plan-ref binding, and response translation.',
    'Adapt plan authoring and execution command/query rails to HTTP while keeping planner and execution semantics in application services.',
    'Plan request parsing, preview policy, plan source policy, plan-ref mapping, import/compile response mapping, or execute-plan facade routing changes.',
    'Plan HTTP routes must delegate product semantics to application services and use shared error translation.',
    'review -> implemented once plan route tests and response translation architecture tests pass.',
    'Web plan authoring, run execution entrypoints, and route-level plan consumers.',
    'apps/api/src/entrypoints/http/previewPlanRoute.ts',
    'high',
    78,
    'Plan HTTP command/query adapter surface.',
    'application_service_adapter',
    array[
      'previewPlanRoute',
      'compilePlanRoute',
      'importPlanRoute',
      'executePlanRouteFacade',
      'planRouteRequestResolver',
      'planRouteResponseTranslation'
    ]::text[],
    array[
      'apps/api/src/entrypoints/http/compilePlanRoute.ts',
      'apps/api/src/entrypoints/http/compilePlanRouteRequestResolver.ts',
      'apps/api/src/entrypoints/http/compilePlanRouteResponseMapper.ts',
      'apps/api/src/entrypoints/http/executePlanRouteFacade.ts',
      'apps/api/src/entrypoints/http/importPlanRoute.ts',
      'apps/api/src/entrypoints/http/importPlanRouteParser.ts',
      'apps/api/src/entrypoints/http/importPlanRouteRequestResolver.ts',
      'apps/api/src/entrypoints/http/importPlanRouteResponseMapper.ts',
      'apps/api/src/entrypoints/http/planCompileResponseMapper.ts',
      'apps/api/src/entrypoints/http/planCompileRouteInputParser.ts',
      'apps/api/src/entrypoints/http/planImportResponseMapper.ts',
      'apps/api/src/entrypoints/http/planPreviewContractGuard.ts',
      'apps/api/src/entrypoints/http/planPreviewEnvelopeBinder.ts',
      'apps/api/src/entrypoints/http/planPreviewResponseMapper.ts',
      'apps/api/src/entrypoints/http/planRefHttpMapper.ts',
      'apps/api/src/entrypoints/http/planRouteBodyParser.ts',
      'apps/api/src/entrypoints/http/planRoutePlannerEnvelopeParser.ts',
      'apps/api/src/entrypoints/http/planRoutePlanRefParser.ts',
      'apps/api/src/entrypoints/http/planRoutePlanSourcePolicy.ts',
      'apps/api/src/entrypoints/http/planRouteRequestResolver.ts',
      'apps/api/src/entrypoints/http/planRouteResponseTranslation.ts',
      'apps/api/src/entrypoints/http/planRouteRunExecutionContextRefParser.ts',
      'apps/api/src/entrypoints/http/planRouteScope.ts',
      'apps/api/src/entrypoints/http/planRouteScopeParser.ts',
      'apps/api/src/entrypoints/http/planRouteSelectionParser.ts',
      'apps/api/src/entrypoints/http/planRouteTargetAdapterParser.ts',
      'apps/api/src/entrypoints/http/previewPlanRoute.ts',
      'apps/api/src/entrypoints/http/previewPlanRouteCommandParser.ts',
      'apps/api/src/entrypoints/http/previewPlanRouteParser.ts',
      'apps/api/src/entrypoints/http/previewPlanRoutePolicyParser.ts',
      'apps/api/src/entrypoints/http/previewPlanRouteRequestBinder.ts',
      'apps/api/src/entrypoints/http/previewPlanRouteRequestResolver.ts',
      'apps/api/src/entrypoints/http/previewPlanRouteResponseMapper.ts',
      'apps/api/src/entrypoints/http/previewProfilePolicy.ts',
      'apps/api/src/entrypoints/http/previewProvenanceParser.ts'
    ]::text[],
    array[
      'apps/api/test/entrypoints/http/compilePlanRoute.test.ts',
      'apps/api/test/entrypoints/http/executePlanRouteFacade.test.ts',
      'apps/api/test/entrypoints/http/importPlanRoute.test.ts',
      'apps/api/test/entrypoints/http/planRouteHardCutSemantic.architecture.test.ts',
      'apps/api/test/entrypoints/http/planRoutePlanSourcePolicy.test.ts',
      'apps/api/test/entrypoints/http/planRouteRequestResolver.test.ts',
      'apps/api/test/entrypoints/http/planRouteResponseTranslation.architecture.test.ts',
      'apps/api/test/entrypoints/http/planRouteResponseTranslation.test.ts',
      'apps/api/test/entrypoints/http/previewPlanRoute.auth.test.ts',
      'apps/api/test/entrypoints/http/previewPlanRoute.inputPolicy.test.ts',
      'apps/api/test/entrypoints/http/previewPlanRoute.outcomes.test.ts'
    ]::text[],
    'integration',
    'flow',
    'pnpm --filter dvt-api test -- compilePlanRoute.test.ts executePlanRouteFacade.test.ts importPlanRoute.test.ts planRouteRequestResolver.test.ts planRouteResponseTranslation.test.ts previewPlanRoute.auth.test.ts previewPlanRoute.inputPolicy.test.ts previewPlanRoute.outcomes.test.ts'
  ),
  (
    'SYS-API-HTTP-RUN-LIFECYCLE',
    'API HTTP run lifecycle routes',
    'adapter',
    'adapter',
    'RunLifecycleHttpAdapter',
    'StartRun;CancelRun;SignalRun;RecoverRun;GetRun;ListRuns;GetRunEvents;GetCostAttributionSummary',
    'Owns HTTP adapters for run start, cancel, signal, recover, run reads, run events, run command execution, and cost attribution summary.',
    'Adapt runtime run lifecycle commands and read models to HTTP with explicit parsing, authorization, and error translation.',
    'Run lifecycle route behavior, run parser contracts, signal validation, run command execution, or run read model HTTP shape changes.',
    'Run lifecycle routes must keep execution semantics in engine/application services and only adapt HTTP concerns.',
    'review -> implemented once run lifecycle route and parser tests pass.',
    'Web run screens, runtime controls, and operational dashboards.',
    'apps/api/src/entrypoints/http/startRunRoute.ts',
    'high',
    79,
    'Run lifecycle HTTP command/query adapter surface.',
    'application_service_adapter',
    array[
      'startRunRoute',
      'cancelRunRoute',
      'signalRunRoute',
      'recoverRunRoute',
      'getRunRoute',
      'listRunsRoute',
      'getRunEventsRoute',
      'costAttributionSummaryRoute'
    ]::text[],
    array[
      'apps/api/src/entrypoints/http/cancelRunRoute.ts',
      'apps/api/src/entrypoints/http/cancelRunRouteParser.ts',
      'apps/api/src/entrypoints/http/costAttributionSummaryRoute.ts',
      'apps/api/src/entrypoints/http/costAttributionSummaryRouteParser.constants.ts',
      'apps/api/src/entrypoints/http/costAttributionSummaryRouteParser.ts',
      'apps/api/src/entrypoints/http/getRunEventsRoute.ts',
      'apps/api/src/entrypoints/http/getRunEventsRouteParser.constants.ts',
      'apps/api/src/entrypoints/http/getRunEventsRouteParser.ts',
      'apps/api/src/entrypoints/http/getRunRoute.ts',
      'apps/api/src/entrypoints/http/getRunRouteParser.constants.ts',
      'apps/api/src/entrypoints/http/getRunRouteParser.ts',
      'apps/api/src/entrypoints/http/listRunsRoute.ts',
      'apps/api/src/entrypoints/http/listRunsRouteParser.constants.ts',
      'apps/api/src/entrypoints/http/listRunsRouteParser.ts',
      'apps/api/src/entrypoints/http/recoverRunRoute.ts',
      'apps/api/src/entrypoints/http/recoverRunRouteParser.ts',
      'apps/api/src/entrypoints/http/runCommandFieldParsers.ts',
      'apps/api/src/entrypoints/http/runCommandRoute.constants.ts',
      'apps/api/src/entrypoints/http/runCommandRouteExecutor.ts',
      'apps/api/src/entrypoints/http/signalRunRoute.ts',
      'apps/api/src/entrypoints/http/signalRunRouteParser.constants.ts',
      'apps/api/src/entrypoints/http/signalRunRouteParser.ts',
      'apps/api/src/entrypoints/http/signalRunRouteValidation.constants.ts',
      'apps/api/src/entrypoints/http/startRunRoute.ts',
      'apps/api/src/entrypoints/http/startRunRouteCommandBuilder.ts',
      'apps/api/src/entrypoints/http/startRunRouteParser.ts',
      'apps/api/src/entrypoints/http/startRunRouteTargetAdapterParser.ts'
    ]::text[],
    array[
      'apps/api/test/entrypoints/http/cancelRunRoute.test.ts',
      'apps/api/test/entrypoints/http/cancelRunRouteParser.test.ts',
      'apps/api/test/entrypoints/http/getCostAttributionSummaryRoute.test.ts',
      'apps/api/test/entrypoints/http/getRunEventsRoute.test.ts',
      'apps/api/test/entrypoints/http/getRunRoute.test.ts',
      'apps/api/test/entrypoints/http/listRunsRoute.test.ts',
      'apps/api/test/entrypoints/http/recoverRunRoute.test.ts',
      'apps/api/test/entrypoints/http/runCommandRouteExecutor.test.ts',
      'apps/api/test/entrypoints/http/signalRunRoute.test.ts',
      'apps/api/test/entrypoints/http/startRunRoute.authAndSuccess.test.ts',
      'apps/api/test/entrypoints/http/startRunRoute.validation.test.ts'
    ]::text[],
    'integration',
    'flow',
    'pnpm --filter dvt-api test -- cancelRunRoute.test.ts getRunEventsRoute.test.ts getRunRoute.test.ts listRunsRoute.test.ts recoverRunRoute.test.ts runCommandRouteExecutor.test.ts signalRunRoute.test.ts startRunRoute.authAndSuccess.test.ts startRunRoute.validation.test.ts'
  ),
  (
    'SYS-API-HTTP-WORKSPACE-ROUTES',
    'API HTTP workspace, project, plugin, and source routes',
    'adapter',
    'adapter',
    'WorkspaceHttpAdapter',
    'ReadWorkspaceContext;ListWorkspacePlugins;ListProjects;CreateProject;ManageWorkspaceFiles;ReadWorkspaceDiffChanges;ReadWorkspaceGraphDraft;ImportWarehouseSources',
    'Owns HTTP adapters for effective workspace context, project onboarding, workspace files, diff changes, graph drafts, warehouse source import, and plugin catalog reads.',
    'Adapt workspace/project/plugin/source command and query rails to HTTP without turning route groups into domain services.',
    'Workspace context shape, project onboarding request parsing, plugin catalog scope parsing, workspace file route shape, diff route shape, or warehouse source import changes.',
    'Workspace route adapters must keep authorization, parsing, and response mapping explicit and covered by route tests.',
    'review -> implemented once workspace, project, plugin, source, and file route tests pass.',
    'Web workspace shell, graph authoring, file explorer, source import, and project onboarding flows.',
    'apps/api/src/entrypoints/http/workspaceContextRoute.ts',
    'high',
    77,
    'Workspace/project/plugin/source HTTP command/query adapter surface.',
    'application_service_adapter',
    array[
      'workspaceContextRoute',
      'registerProjectOnboardingRoutes',
      'registerWorkspacePluginCatalogRoutes',
      'registerWorkspaceFilesRoutes',
      'registerWarehouseSourceImportRoutes'
    ]::text[],
    array[
      'apps/api/src/entrypoints/http/projectOnboardingRoutes.ts',
      'apps/api/src/entrypoints/http/warehouseSourceImportRoutes.ts',
      'apps/api/src/entrypoints/http/workspaceContextRoute.ts',
      'apps/api/src/entrypoints/http/workspaceDiffChangesRoutes.ts',
      'apps/api/src/entrypoints/http/workspaceFileHistoryRoutes.ts',
      'apps/api/src/entrypoints/http/workspaceFilesRoutes.ts',
      'apps/api/src/entrypoints/http/workspaceGraphDraftRoutes.ts',
      'apps/api/src/entrypoints/http/workspacePluginCatalogRoutes.ts'
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
    'pnpm --filter dvt-api test -- projectOnboardingRoutes.test.ts warehouseSourceImportRoutes.test.ts workspaceContextRoute.test.ts workspaceDiffChangesRoutes.test.ts workspaceFileHistoryRoutes.test.ts workspaceFilesRoutes.test.ts workspaceGraphDraftRoutes.test.ts workspacePluginCatalogRoutes.test.ts'
  );

insert into api_http_entrypoint_leaf_port_map (component_id, port_name, port_kind)
values
  ('SYS-API-HTTP-AUTHENTICATION', 'AuthenticateHttpBearerPrincipal', 'query'),
  ('SYS-API-HTTP-AUTHENTICATION', 'AuthorizeHttpExecutionScope', 'query'),
  ('SYS-API-HTTP-AUTHENTICATION', 'ReadSessionPrincipal', 'query'),
  ('SYS-API-HTTP-ADMIN-REPAIR', 'RebuildRunSnapshot', 'command'),
  ('SYS-API-HTTP-RUNTIME-ROUTE-REGISTRY', 'RegisterProtectedRuntimeHttpRoutes', 'api'),
  ('SYS-API-HTTP-ERROR-TRANSLATION', 'TranslateDomainErrorToHttpResponse', 'query'),
  ('SYS-API-HTTP-PLAN-COMMANDS', 'PreviewPlan', 'query'),
  ('SYS-API-HTTP-PLAN-COMMANDS', 'CompilePlan', 'command'),
  ('SYS-API-HTTP-PLAN-COMMANDS', 'ImportPlan', 'command'),
  ('SYS-API-HTTP-PLAN-COMMANDS', 'ExecutePlan', 'command'),
  ('SYS-API-HTTP-PLAN-COMMANDS', 'ResolvePlanReference', 'query'),
  ('SYS-API-HTTP-RUN-LIFECYCLE', 'StartRun', 'command'),
  ('SYS-API-HTTP-RUN-LIFECYCLE', 'CancelRun', 'command'),
  ('SYS-API-HTTP-RUN-LIFECYCLE', 'SignalRun', 'command'),
  ('SYS-API-HTTP-RUN-LIFECYCLE', 'RecoverRun', 'command'),
  ('SYS-API-HTTP-RUN-LIFECYCLE', 'GetRun', 'query'),
  ('SYS-API-HTTP-RUN-LIFECYCLE', 'ListRuns', 'query'),
  ('SYS-API-HTTP-RUN-LIFECYCLE', 'GetRunEvents', 'query'),
  ('SYS-API-HTTP-RUN-LIFECYCLE', 'GetCostAttributionSummary', 'query'),
  ('SYS-API-HTTP-WORKSPACE-ROUTES', 'ReadWorkspaceContext', 'query'),
  ('SYS-API-HTTP-WORKSPACE-ROUTES', 'ListWorkspacePlugins', 'query'),
  ('SYS-API-HTTP-WORKSPACE-ROUTES', 'ListProjects', 'query'),
  ('SYS-API-HTTP-WORKSPACE-ROUTES', 'CreateProject', 'command'),
  ('SYS-API-HTTP-WORKSPACE-ROUTES', 'ManageWorkspaceFiles', 'command'),
  ('SYS-API-HTTP-WORKSPACE-ROUTES', 'ReadWorkspaceDiffChanges', 'query'),
  ('SYS-API-HTTP-WORKSPACE-ROUTES', 'ReadWorkspaceGraphDraft', 'query'),
  ('SYS-API-HTTP-WORKSPACE-ROUTES', 'ImportWarehouseSources', 'command');

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
  'PLANNING-DB-API-HTTP-ENTRYPOINT-LEAF-MAPPING-20260618',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Planning DB API HTTP entrypoint leaf component mapping',
  'Architecture / API / Planning DB',
  'review',
  'SYS-API-HTTP-ENTRYPOINTS was a broad 100+ file HTTP adapter bucket. This mapping creates semantic leaves for authentication, route registration, error translation, plan commands, run lifecycle routes, workspace routes, and admin repair. It also records the canonical bearer-auth helper used to remove duplicate route-local authentication functions.',
  'responsibility_overload',
  'RecordArchitectureComponent;ReadComponentProfile;CheckPlanningDbComponentIntegrity;FindCodeSymbolDuplicates',
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
select
  'PLANNING-DB-API-HTTP-ENTRYPOINT-LEAF-MAPPING-20260618',
  scope.subject_kind,
  scope.subject_id,
  scope.scope_kind,
  true
from (
  select 'component'::text as subject_kind, 'SYS-API-HTTP-ENTRYPOINTS'::text as subject_id, 'may_update'::text as scope_kind
  union all
  select 'path', 'apps/api/src/entrypoints/http', 'may_update'
  union all
  select 'path', 'apps/api/test/entrypoints/http', 'may_reference'
  union all
  select 'path', 'docs/architecture/command-query-rail-governance.md', 'may_reference'
  union all
  select 'path', 'docs/architecture/fowler-opportunity-planning-governance.md', 'may_reference'
  union all
  select 'component', component_id, 'may_create' from api_http_entrypoint_leaf_map
  union all
  select 'path', path, 'may_update'
  from api_http_entrypoint_leaf_map
  cross join lateral unnest(owns) as owned(path)
) scope
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

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
  'SYS-API-HTTP-ENTRYPOINTS',
  'tools/planning-db/migrations/183_api_http_entrypoint_leaf_components.sql',
  md5('SYS-API-HTTP-ENTRYPOINTS:183') || md5('api-http-entrypoint-parent:183'),
  0,
  'API HTTP entrypoints and route mappers',
  'component',
  'SYS-API-ROOT',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  true,
  'Owns the aggregate API HTTP adapter boundary while concrete route files resolve to semantic HTTP leaves.',
  'Architecture / API',
  'HandleApiHttpRequest;RegisterProtectedRuntimeHttpRoutes',
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
  'tools/planning-db/migrations/183_api_http_entrypoint_leaf_components.sql',
  md5(component_id || ':183') || md5(name || ':api-http-leaf:183'),
  0,
  name,
  'component',
  'SYS-API-HTTP-ENTRYPOINTS',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  false,
  owned_concern,
  ddd_owner,
  cq_rails,
  'codex'
from api_http_entrypoint_leaf_map
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
from api_http_entrypoint_leaf_map
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
  select component_id, 'responsibility' as item_kind, responsibility as item_value, 0 as item_order
  from api_http_entrypoint_leaf_map
  union all
  select component_id, 'reason_to_change', reason_to_change, 0
  from api_http_entrypoint_leaf_map
  union all
  select component_id, 'invariant', invariant, 0
  from api_http_entrypoint_leaf_map
  union all
  select component_id, 'transition', transition, 0
  from api_http_entrypoint_leaf_map
  union all
  select component_id, 'consumer', consumer, 0
  from api_http_entrypoint_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/architecture/command-query-rail-governance.md', 0
  from api_http_entrypoint_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/architecture/fowler-opportunity-planning-governance.md', 1
  from api_http_entrypoint_leaf_map
  union all
  select component_id, 'fowler_signal', fowler_signal, 0
  from api_http_entrypoint_leaf_map
  union all
  select component_id, 'public_api', api.value, api.item_order - 1
  from api_http_entrypoint_leaf_map
  cross join lateral unnest(public_api) with ordinality as api(value, item_order)
) item
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  (
    'SYS-API-HTTP-ENTRYPOINTS',
    'responsibility',
    'Own the aggregate API HTTP adapter boundary and delegate concrete route files to semantic HTTP leaves.',
    0
  ),
  (
    'SYS-API-HTTP-ENTRYPOINTS',
    'reason_to_change',
    'HTTP adapter topology, route file ownership, or route family boundaries change.',
    0
  ),
  (
    'SYS-API-HTTP-ENTRYPOINTS',
    'invariant',
    'Concrete HTTP route files must be owned by semantic leaves rather than the aggregate entrypoint component.',
    0
  ),
  (
    'SYS-API-HTTP-ENTRYPOINTS',
    'transition',
    'review -> implemented once component-quality shows no direct files owned by SYS-API-HTTP-ENTRYPOINTS.',
    0
  ),
  (
    'SYS-API-HTTP-ENTRYPOINTS',
    'consumer',
    'API server bootstrap, web app clients, and protected runtime modules.',
    0
  ),
  (
    'SYS-API-HTTP-ENTRYPOINTS',
    'fowler_signal',
    'responsibility_overload',
    0
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update architecture.component
set
  kind = 'api',
  layer = 'adapter',
  owner = 'Architecture / API',
  repo_path = 'apps/api/src/entrypoints/http',
  public_contract = 'Aggregate API HTTP adapter boundary; concrete route files are owned by semantic HTTP leaves.',
  runtime = 'node',
  criticality = 'high',
  status = 'review',
  maturity_score = 72,
  parent_component_id = 'SYS-API-ROOT',
  updated_at = now()
where component_id = 'SYS-API-HTTP-ENTRYPOINTS';

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
  kind,
  layer,
  ddd_owner,
  repo_path,
  public_contract,
  'node',
  criticality,
  'review',
  maturity_score,
  'SYS-API-HTTP-ENTRYPOINTS'
from api_http_entrypoint_leaf_map
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
from api_http_entrypoint_leaf_map
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
  'CONTRACT-' || component_id || '-SURFACE',
  case
    when component_id = 'SYS-API-HTTP-RUNTIME-ROUTE-REGISTRY' then 'workflow'
    else 'api'
  end,
  component_id,
  public_contract,
  'internal',
  'implemented',
  validation_command
from api_http_entrypoint_leaf_map
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
  status
)
select
  'REL-API-HTTP-ENTRYPOINTS-CONTAINS-' ||
    replace(replace(component_id, 'SYS-API-HTTP-', ''), '_', '-'),
  'SYS-API-HTTP-ENTRYPOINTS',
  component_id,
  'contains',
  'outbound',
  'sync',
  null,
  'not_applicable',
  'implemented'
from api_http_entrypoint_leaf_map
on conflict (relation_id) do update set
  source_component_id = excluded.source_component_id,
  target_component_id = excluded.target_component_id,
  relation_type = excluded.relation_type,
  direction = excluded.direction,
  sync_async = excluded.sync_async,
  contract_id = excluded.contract_id,
  failure_mode = excluded.failure_mode,
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
  status
)
values
  (
    'REL-API-HTTP-WORKSPACE-ROUTES-USES-AUTHENTICATION',
    'SYS-API-HTTP-WORKSPACE-ROUTES',
    'SYS-API-HTTP-AUTHENTICATION',
    'depends_on',
    'outbound',
    'sync',
    'CONTRACT-SYS-API-HTTP-AUTHENTICATION-SURFACE',
    'fail_closed',
    'implemented'
  ),
  (
    'REL-API-HTTP-RUN-LIFECYCLE-USES-AUTHENTICATION',
    'SYS-API-HTTP-RUN-LIFECYCLE',
    'SYS-API-HTTP-AUTHENTICATION',
    'depends_on',
    'outbound',
    'sync',
    'CONTRACT-SYS-API-HTTP-AUTHENTICATION-SURFACE',
    'fail_closed',
    'implemented'
  ),
  (
    'REL-API-HTTP-PLAN-COMMANDS-USES-ERROR-TRANSLATION',
    'SYS-API-HTTP-PLAN-COMMANDS',
    'SYS-API-HTTP-ERROR-TRANSLATION',
    'depends_on',
    'outbound',
    'sync',
    'CONTRACT-SYS-API-HTTP-ERROR-TRANSLATION-SURFACE',
    'fail_closed',
    'implemented'
  ),
  (
    'REL-API-HTTP-RUN-LIFECYCLE-USES-ERROR-TRANSLATION',
    'SYS-API-HTTP-RUN-LIFECYCLE',
    'SYS-API-HTTP-ERROR-TRANSLATION',
    'depends_on',
    'outbound',
    'sync',
    'CONTRACT-SYS-API-HTTP-ERROR-TRANSLATION-SURFACE',
    'fail_closed',
    'implemented'
  )
on conflict (relation_id) do update set
  source_component_id = excluded.source_component_id,
  target_component_id = excluded.target_component_id,
  relation_type = excluded.relation_type,
  direction = excluded.direction,
  sync_async = excluded.sync_async,
  contract_id = excluded.contract_id,
  failure_mode = excluded.failure_mode,
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
  'PORT-' || port.component_id || '-' ||
    upper(regexp_replace(port.port_name, '[^A-Za-z0-9]+', '-', 'g')),
  port.component_id,
  port.port_name,
  port.port_kind,
  'inbound',
  'CONTRACT-' || port.component_id || '-SURFACE',
  'CONTRACT-' || port.component_id || '-SURFACE',
  case
    when port.port_kind = 'command' then array[
      'invalid input',
      'unauthorized scope',
      'idempotency or conflict path where applicable'
    ]::text[]
    when port.port_kind = 'query' then array[
      'missing scope',
      'unauthorized scope',
      'invalid filters',
      'stale or failure mapping where applicable'
    ]::text[]
    else array[
      'route group registration topology',
      'missing dependency coverage'
    ]::text[]
  end,
  'implemented'
from api_http_entrypoint_leaf_port_map port
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
from api_http_entrypoint_leaf_map
cross join lateral unnest(test_paths) with ordinality as test_path(path, test_order)
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
  'OBS-' || component_id || '-HTTP-TESTED',
  component_id,
  'API HTTP route behavior, authorization, and error surfaces are validated through route tests.',
  'log',
  true,
  'implemented'
from api_http_entrypoint_leaf_map
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;
