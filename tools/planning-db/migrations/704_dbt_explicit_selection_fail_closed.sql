-- Preserve explicit DBT execution intent across Canvas readiness, Preview, and
-- server authority. An absent selection may use workspace scope; a non-empty
-- selection without an executable model, test, or snapshot must fail closed.

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
  'AD-DBT-EXPLICIT-SELECTION-SAFETY-20260716',
  'E-DBT-PROJECT-ROUNDTRIP-P4-SELECTION-SAFETY',
  'DBT explicit selection fail-closed policy',
  'Frontend / Canvas execution selection',
  'implemented',
  'Preview and readiness now consume one DBT execution projection. An absent selection may derive workspace scope, while a non-empty selection with no executable DBT resource is rejected before Preview and is rejected independently by server authority.',
  'boundary_drift',
  'CollectCanvasExecutionSelection;PreviewExecutionPlan;ObservePlanRunReadiness',
  now()
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  approved_at = excluded.approved_at,
  updated_at = now();

insert into architecture.design_scope (
  design_id, subject_kind, subject_id, scope_kind, required
)
values
  ('AD-DBT-EXPLICIT-SELECTION-SAFETY-20260716', 'component', 'SYS-WEB-CANVAS-EXECUTION-SELECTION', 'may_update', true),
  ('AD-DBT-EXPLICIT-SELECTION-SAFETY-20260716', 'component', 'SYS-WEB-CANVAS-CONTROLLER-COMMAND-SURFACE', 'may_reference', true),
  ('AD-DBT-EXPLICIT-SELECTION-SAFETY-20260716', 'component', 'SYS-WEB-CANVAS-PLAN-RUN-READINESS', 'may_reference', true),
  ('AD-DBT-EXPLICIT-SELECTION-SAFETY-20260716', 'component', 'SYS-WEB-CANVAS-SOURCE-PREVIEW-TRANSFORMATION', 'may_reference', true),
  ('AD-DBT-EXPLICIT-SELECTION-SAFETY-20260716', 'component', 'SYS-WEB-CANVAS-DBT-FILE-EXECUTION', 'may_reference', true),
  ('AD-DBT-EXPLICIT-SELECTION-SAFETY-20260716', 'component', 'SYS-API-APPLICATION-PREVIEW-SELECTION-AUTHORITY', 'may_reference', true),
  ('AD-DBT-EXPLICIT-SELECTION-SAFETY-20260716', 'query', 'CollectCanvasExecutionSelection', 'may_create', true),
  ('AD-DBT-EXPLICIT-SELECTION-SAFETY-20260716', 'test', 'TEST-WEB-DBT-EXECUTION-SCOPE-POLICY', 'must_prove', true),
  ('AD-DBT-EXPLICIT-SELECTION-SAFETY-20260716', 'test', 'TEST-DBT-PROJECT-ROUNDTRIP-RT006', 'must_prove', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update architecture.component
set
  public_contract = 'CollectCanvasExecutionSelection',
  status = 'implemented',
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION';

update architecture.component_responsibility
set
  responsibility = 'Derive caller-owned execution selection and DBT executable closure while preserving the semantic difference between absent and non-empty explicit intent.',
  reason_to_change = 'Generic or DBT preview/run selection semantics, executable-closure policy, or selection contract changes.',
  status = 'implemented'
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION';

update architecture.component_port
set
  negative_tests = array[
    'explicit DBT selection has no executable resource',
    'duplicate selected node ids',
    'cyclic executable dependency input',
    'browser selection differs from server-authorized resource set'
  ]::text[],
  status = 'implemented'
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION'
  and port_name = 'CollectCanvasExecutionSelection';

insert into architecture.component_relation (
  relation_id, source_component_id, target_component_id, relation_type,
  direction, sync_async, contract_id, failure_mode, authorization_scope,
  source_refs, status
)
values
  (
    'REL-WEB-CANVAS-COMMAND-SURFACE-DEPENDS-ON-EXECUTION-SELECTION',
    'SYS-WEB-CANVAS-CONTROLLER-COMMAND-SURFACE',
    'SYS-WEB-CANVAS-EXECUTION-SELECTION',
    'depends_on', 'outbound', 'sync',
    'CONTRACT-SYS-WEB-CANVAS-EXECUTION-SELECTION-SURFACE',
    'Preview can widen explicit intent if the command surface derives its own DBT scope.',
    'workspace:graph-draft:preview',
    jsonb_build_array('PreviewExecutionPlan'),
    'implemented'
  ),
  (
    'REL-WEB-CANVAS-READINESS-DEPENDS-ON-EXECUTION-SELECTION',
    'SYS-WEB-CANVAS-PLAN-RUN-READINESS',
    'SYS-WEB-CANVAS-EXECUTION-SELECTION',
    'depends_on', 'outbound', 'sync',
    'CONTRACT-SYS-WEB-CANVAS-EXECUTION-SELECTION-SURFACE',
    'Readiness can enable Preview for a scope that the action later rejects or widens.',
    'workspace:graph-draft:view',
    jsonb_build_array('ObservePlanRunReadiness'),
    'implemented'
  ),
  (
    'REL-WEB-CANVAS-DBT-PROJECTOR-DEPENDS-ON-EXECUTION-SELECTION',
    'SYS-WEB-CANVAS-SOURCE-PREVIEW-TRANSFORMATION',
    'SYS-WEB-CANVAS-EXECUTION-SELECTION',
    'depends_on', 'outbound', 'sync',
    'CONTRACT-SYS-WEB-CANVAS-EXECUTION-SELECTION-SURFACE',
    'The generic DBT projector can reinterpret non-executable selections as whole-workspace scope.',
    'workspace:graph-draft:preview',
    jsonb_build_array('BuildDbtPlannerGraphSource'),
    'implemented'
  ),
  (
    'REL-WEB-CANVAS-DBT-FILE-EXECUTION-DEPENDS-ON-EXECUTION-SELECTION',
    'SYS-WEB-CANVAS-DBT-FILE-EXECUTION',
    'SYS-WEB-CANVAS-EXECUTION-SELECTION',
    'depends_on', 'outbound', 'sync',
    'CONTRACT-SYS-WEB-CANVAS-EXECUTION-SELECTION-SURFACE',
    'File-authoritative Preview can widen a source-only selection to the whole project.',
    'workspace:graph-draft:preview',
    jsonb_build_array('ProjectDbtGraphFromFiles', 'PreviewExecutionPlan'),
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
  authorization_scope = excluded.authorization_scope,
  source_refs = excluded.source_refs,
  status = excluded.status,
  updated_at = now();

insert into architecture.component_test (
  test_id, component_id, test_path, test_kind, coverage_level, required,
  validation_command
)
values
  (
    'TEST-WEB-DBT-EXECUTION-SCOPE-POLICY',
    'SYS-WEB-CANVAS-EXECUTION-SELECTION',
    'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.test.ts',
    'unit', 'negative', true,
    'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/views/canvas/dbtExecutionScopePolicy.test.ts'
  ),
  (
    'TEST-SYS-WEB-CANVAS-EXECUTION-SELECTION-1',
    'SYS-WEB-CANVAS-EXECUTION-SELECTION',
    'apps/web/src/app/views/canvas/canvasExecutionSelection.architecture.test.ts',
    'architecture', 'boundary', true,
    'pnpm --filter @dvt/web test:architecture:run -- src/app/views/canvas/canvasExecutionSelection.architecture.test.ts'
  ),
  (
    'TEST-SYS-WEB-CANVAS-EXECUTION-SELECTION-2',
    'SYS-WEB-CANVAS-EXECUTION-SELECTION',
    'apps/web/src/app/views/canvas/useCanvasExecutionActions.planPreview.selection.test.tsx',
    'integration', 'boundary', true,
    'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/useCanvasExecutionActions.planPreview.selection.test.tsx'
  )
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

update architecture.component_test
set validation_command = 'node scripts/run-selected-closure-live-proof.cjs --spec apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts'
where test_id = 'TEST-DBT-PROJECT-ROUNDTRIP-RT006';

update planning_query_store.governance_component_local_definitions
set
  source_path = 'tools/planning-db/migrations/704_dbt_explicit_selection_fail_closed.sql',
  source_content_sha256 = repeat(md5('SYS-WEB-CANVAS-EXECUTION-SELECTION:704'), 2),
  status = 'canonical',
  owned_concern = 'Preserve generic and DBT execution-selection intent and derive a deterministic executable closure without widening explicit scope.',
  cq_rails = 'CollectCanvasExecutionSelection;PreviewExecutionPlan;ObservePlanRunReadiness;StartCanvasRun',
  revision = revision + 1
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION';

delete from planning_query_store.governance_component_local_ownership_patterns
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION';

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id, pattern_kind, pattern, pattern_order
)
values
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'owns', 'apps/web/src/app/views/canvas/canvasRunSelection.ts', 0),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'owns', 'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.ts', 1),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'owns', 'apps/web/src/app/views/canvas/canvasDbtExecutionProjection.ts', 2),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'owns', 'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.test.ts', 3),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'owns', 'apps/web/src/app/views/canvas/canvasExecutionSelection.architecture.test.ts', 4),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'owns', 'apps/web/src/app/views/canvas/useCanvasExecutionActions.planPreview.selection.test.tsx', 5);

insert into planning_query_store.governance_component_local_semantic_items (
  component_id, item_kind, item_value, item_order
)
values
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'public_api', 'collectPreviewSelection;collectPlanSelection;resolveDbtExecutionScope;buildCanvasDbtExecutionProjection', 0),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'invariant', 'An absent selection may derive executable workspace scope; a non-empty explicit selection never widens to workspace scope.', 0),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'invariant', 'Preview and ObservePlanRunReadiness consume the same DBT execution projection.', 1),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'invariant', 'Executable dependency closure is duplicate-free, cycle-safe, and ordered by the canonical executable graph.', 2),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'non_goal', 'Authorize project resources, render selection controls, build persisted plans, or start runs.', 0),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'consumer', 'Canvas Preview command, PlanRunReadiness read model, DBT graph projector, and DBT file execution strategy.', 0),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'governance_ref', 'docs/architecture/components/web/graph/canvas-execution-selection-component.md', 0),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'fowler_signal', 'boundary_drift resolved by one policy and one shared projection', 0)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

insert into planning_query_store.frontend_component_local_components (
  component_id, component_name, component_kind, component_status,
  reuse_decision, frontend_owner, responsibility, package_name, route_scope,
  plugin_scope, capability_gaps, evidence_refs, source_path,
  source_content_sha256, raw_component
)
values (
  'SYS-WEB-CANVAS-EXECUTION-SELECTION',
  'Canvas execution selection',
  'query-view',
  'current',
  'harden',
  'Frontend / Canvas execution selection',
  'Preserve caller selection intent and derive canonical generic or DBT executable scope for Preview, readiness, and run selection.',
  '@dvt/web',
  '/canvas',
  null,
  '[]'::jsonb,
  '[]'::jsonb,
  'tools/planning-db/migrations/704_dbt_explicit_selection_fail_closed.sql',
  md5('frontend:CanvasExecutionSelection:704'),
  jsonb_build_object(
    'architectureComponentId', 'SYS-WEB-CANVAS-EXECUTION-SELECTION',
    'presentationOwner', false,
    'selectionSemantics', jsonb_build_object(
      'absent', 'workspace executable scope',
      'explicitWithoutExecutableResource', 'reject'
    )
  )
)
on conflict (component_id) do update set
  component_name = excluded.component_name,
  component_kind = excluded.component_kind,
  component_status = excluded.component_status,
  reuse_decision = excluded.reuse_decision,
  frontend_owner = excluded.frontend_owner,
  responsibility = excluded.responsibility,
  package_name = excluded.package_name,
  route_scope = excluded.route_scope,
  plugin_scope = excluded.plugin_scope,
  capability_gaps = excluded.capability_gaps,
  evidence_refs = excluded.evidence_refs,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  raw_component = excluded.raw_component,
  updated_at = now();

delete from planning_query_store.frontend_component_local_files
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION';

insert into planning_query_store.frontend_component_local_files (
  component_id, file_path, file_role, exported_symbol, raw_file, source_path,
  source_content_sha256
)
values
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'apps/web/src/app/views/canvas/canvasRunSelection.ts', 'query-model', 'collectPreviewSelection;collectPlanSelection', jsonb_build_object('scope', 'generic preview and persisted-plan selection'), 'tools/planning-db/migrations/704_dbt_explicit_selection_fail_closed.sql', md5('file:canvasRunSelection:704')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.ts', 'policy', 'resolveDbtExecutionScope', jsonb_build_object('pure', true, 'failClosed', true), 'tools/planning-db/migrations/704_dbt_explicit_selection_fail_closed.sql', md5('file:dbtExecutionScopePolicy:704')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'apps/web/src/app/views/canvas/canvasDbtExecutionProjection.ts', 'query-model', 'buildCanvasDbtExecutionProjection', jsonb_build_object('consumers', jsonb_build_array('PreviewExecutionPlan', 'ObservePlanRunReadiness')), 'tools/planning-db/migrations/704_dbt_explicit_selection_fail_closed.sql', md5('file:canvasDbtExecutionProjection:704')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.test.ts', 'unit-test', null, jsonb_build_object('scope', 'set semantics, rejection, dependency closure, cycles'), 'tools/planning-db/migrations/704_dbt_explicit_selection_fail_closed.sql', md5('file:dbtExecutionScopePolicy-test:704')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'apps/web/src/app/views/canvas/canvasExecutionSelection.architecture.test.ts', 'architecture-test', null, jsonb_build_object('scope', 'single selection and DBT projection boundary'), 'tools/planning-db/migrations/704_dbt_explicit_selection_fail_closed.sql', md5('file:canvasExecutionSelection-architecture:704')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'apps/web/src/app/views/canvas/useCanvasExecutionActions.planPreview.selection.test.tsx', 'integration-test', null, jsonb_build_object('scope', 'Canvas controller Preview selection delegation'), 'tools/planning-db/migrations/704_dbt_explicit_selection_fail_closed.sql', md5('file:planPreview-selection-test:704'));

insert into planning_query_store.frontend_component_local_cq_rails (
  component_id, rail_name, rail_kind, rail_status, raw_rail, source_path,
  source_content_sha256
)
values
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'CollectCanvasExecutionSelection', 'query', 'implemented', jsonb_build_object('ownership', 'owned', 'authorization', 'caller-owned browser state'), 'tools/planning-db/migrations/704_dbt_explicit_selection_fail_closed.sql', md5('rail:CollectCanvasExecutionSelection:704')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'PreviewExecutionPlan', 'command', 'implemented', jsonb_build_object('ownership', 'consumed', 'reuse', true), 'tools/planning-db/migrations/704_dbt_explicit_selection_fail_closed.sql', md5('rail:PreviewExecutionPlan:704')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'ObservePlanRunReadiness', 'query', 'implemented', jsonb_build_object('ownership', 'consumed', 'reuse', true), 'tools/planning-db/migrations/704_dbt_explicit_selection_fail_closed.sql', md5('rail:ObservePlanRunReadiness:704')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'StartCanvasRun', 'command', 'implemented', jsonb_build_object('ownership', 'consumed', 'reuse', true), 'tools/planning-db/migrations/704_dbt_explicit_selection_fail_closed.sql', md5('rail:StartCanvasRun:704'))
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = excluded.raw_rail,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_local_surface_links (
  component_id, surface_id, route_path, placement_kind, placement_order,
  raw_link, source_path, source_content_sha256
)
values (
  'SYS-WEB-CANVAS-EXECUTION-SELECTION',
  'web.canvas.graph',
  '/canvas',
  'execution-selection-policy',
  20,
  jsonb_build_object('visible', false, 'consumers', jsonb_build_array('Preview', 'readiness', 'run selection')),
  'tools/planning-db/migrations/704_dbt_explicit_selection_fail_closed.sql',
  md5('surface:CanvasExecutionSelection:web.canvas.graph:704')
)
on conflict (component_id, surface_id, placement_kind) do update set
  route_path = excluded.route_path,
  placement_order = excluded.placement_order,
  raw_link = excluded.raw_link,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_local_evidence (
  evidence_id, component_id, evidence_kind, evidence_ref, evidence_status,
  raw_evidence, source_path, source_content_sha256
)
values
  ('EV-WEB-DBT-EXECUTION-SCOPE-POLICY', 'SYS-WEB-CANVAS-EXECUTION-SELECTION', 'unit-test', 'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.test.ts', 'passing', jsonb_build_object('proves', jsonb_build_array('absent versus explicit intent', 'dependency closure', 'cycle termination')), 'tools/planning-db/migrations/704_dbt_explicit_selection_fail_closed.sql', md5('evidence:dbt-scope-policy:704')),
  ('EV-WEB-DBT-EXECUTION-SCOPE-INTEGRATION', 'SYS-WEB-CANVAS-EXECUTION-SELECTION', 'integration-test', 'apps/web/src/app/views/canvas/canvasPlanAction.dbtProjectFiles.test.ts', 'passing', jsonb_build_object('proves', jsonb_build_array('Preview does not send a request', 'readiness and action share rejection')), 'tools/planning-db/migrations/704_dbt_explicit_selection_fail_closed.sql', md5('evidence:dbt-scope-integration:704')),
  ('EV-API-DBT-EXECUTION-SCOPE-AUTHORITY', 'SYS-WEB-CANVAS-EXECUTION-SELECTION', 'server-negative-test', 'apps/api/test/application/services/resolveAuthorizedPreviewSelection.test.ts', 'passing', jsonb_build_object('proves', 'Server authority rejects a source-only DBT resource selection independently of the browser.'), 'tools/planning-db/migrations/704_dbt_explicit_selection_fail_closed.sql', md5('evidence:dbt-scope-authority:704')),
  ('EV-WEB-DBT-EXECUTION-SCOPE-LIVE', 'SYS-WEB-CANVAS-EXECUTION-SELECTION', 'e2e-test', 'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts', 'passing', jsonb_build_object('strictBrowserProof', true, 'noIntercept', true, 'noPreviewRequestForRejectedSelection', true), 'tools/planning-db/migrations/704_dbt_explicit_selection_fail_closed.sql', md5('evidence:dbt-scope-live:704'))
on conflict (evidence_id) do update set
  component_id = excluded.component_id,
  evidence_kind = excluded.evidence_kind,
  evidence_ref = excluded.evidence_ref,
  evidence_status = excluded.evidence_status,
  raw_evidence = excluded.raw_evidence,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.feature_mechanization_local_rails (
  rail_id, feature_id, mechanization_status, rail_name,
  normalized_rail_name, rail_type, ddd_owner, rail_status, symbol_refs,
  implementation_refs, documentation_refs, governing_sources,
  allowed_implementation_surfaces, architecture_guards, completion_gate,
  source_path, source_content_sha256, raw_rail, raw_manifest, revision,
  created_by
)
values (
  'local#E-DBT-PROJECT-ROUNDTRIP-1#query#collectcanvasexecutionselection#fail-closed',
  'E-DBT-PROJECT-ROUNDTRIP-1',
  'implemented',
  'CollectCanvasExecutionSelection',
  'collectcanvasexecutionselection',
  'query',
  'CanvasExecutionSelection',
  'implemented',
  jsonb_build_array(
    'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.ts#resolveDbtExecutionScope',
    'apps/web/src/app/views/canvas/canvasDbtExecutionProjection.ts#buildCanvasDbtExecutionProjection'
  ),
  jsonb_build_array(
    'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.ts',
    'apps/web/src/app/views/canvas/canvasDbtExecutionProjection.ts',
    'apps/web/src/app/views/canvas/canvasPlanAction.ts',
    'apps/web/src/app/views/canvas/canvasExecutionState.ts',
    'apps/api/test/application/services/resolveAuthorizedPreviewSelection.test.ts',
    'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts',
    'tools/planning-db/migrations/704_dbt_explicit_selection_fail_closed.sql'
  ),
  jsonb_build_array(
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/components/web/graph/canvas-execution-selection-component.md'
  ),
  jsonb_build_array(
    'AGENTS.md',
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/architecture/command-query-rail-governance.md'
  ),
  jsonb_build_array(
    'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.ts',
    'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.test.ts',
    'apps/web/src/app/views/canvas/canvasDbtExecutionProjection.ts',
    'apps/web/src/app/views/canvas/canvasDbtPlannerGraphSource.ts',
    'apps/web/src/app/views/canvas/dbtProjectFileExecutionStrategy.ts',
    'apps/web/src/app/views/canvas/canvasPlanAction.ts',
    'apps/web/src/app/views/canvas/canvasExecutionState.ts',
    'apps/web/src/app/views/canvas/canvasPlanAction.dbtProjectFiles.test.ts',
    'apps/web/src/app/views/canvas/canvasPlanReadiness.test.ts',
    'apps/api/test/application/services/resolveAuthorizedPreviewSelection.test.ts',
    'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts',
    'tools/planning-db/migrations/704_dbt_explicit_selection_fail_closed.sql'
  ),
  jsonb_build_array(
    'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/views/canvas/dbtExecutionScopePolicy.test.ts src/app/views/canvas/canvasDbtPlannerGraphSource.test.ts src/app/views/canvas/dbtProjectFileExecutionStrategy.test.ts src/app/views/canvas/canvasPlanAction.dbtProjectFiles.test.ts src/app/views/canvas/canvasPlanReadiness.test.ts',
    'pnpm --filter dvt-api exec vitest run test/application/services/resolveAuthorizedPreviewSelection.test.ts',
    'node scripts/run-selected-closure-live-proof.cjs --spec apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts'
  ),
  jsonb_build_array(
    'pnpm planning:db:migrate',
    'pnpm --filter @dvt/web typecheck',
    'pnpm --filter @dvt/web lint',
    'pnpm docs:feature-mechanization:implementation',
    'pnpm verify:prepush'
  ),
  'tools/planning-db/migrations/704_dbt_explicit_selection_fail_closed.sql',
  repeat(md5('CollectCanvasExecutionSelection:fail-closed:704'), 2),
  jsonb_build_object(
    'name', 'CollectCanvasExecutionSelection',
    'type', 'query',
    'dddOwner', 'CanvasExecutionSelection',
    'status', 'implemented',
    'authorization', 'Browser selection is caller intent; server Preview authority independently revalidates it.'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'E-DBT-PROJECT-ROUNDTRIP-1',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan', 'Preserve explicit DBT selection intent through one shared readiness and Preview projection, and reject source-only selection again at server authority.',
    'userStories', jsonb_build_array(
      'A workspace editor who selects only non-executable DBT resources is blocked with actionable guidance and Preview never widens to the whole project.'
    ),
    'domainObjects', jsonb_build_array('CanvasExecutionSelection', 'DbtExecutionScopeResolution'),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object('name', 'CollectCanvasExecutionSelection', 'type', 'query', 'dddOwner', 'CanvasExecutionSelection', 'status', 'implemented'),
      jsonb_build_object('name', 'PreviewExecutionPlan', 'type', 'command', 'dddOwner', 'Execution Plan', 'status', 'implemented'),
      jsonb_build_object('name', 'ObservePlanRunReadiness', 'type', 'query', 'dddOwner', 'PlanRunReadinessReadModel', 'status', 'implemented')
    ),
    'negativeCases', jsonb_build_array(
      'explicit source-only DBT selection',
      'browser bypass reaches server authority',
      'cyclic executable dependency input'
    ),
    'allowedImplementationSurfaces', jsonb_build_array(
      'apps/web/src/app/views/canvas/**',
      'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts',
      'apps/api/test/application/services/resolveAuthorizedPreviewSelection.test.ts',
      'tools/planning-db/migrations/704_dbt_explicit_selection_fail_closed.sql'
    ),
    'completionGate', jsonb_build_array(
      'pnpm planning:db:migrate',
      'node scripts/run-selected-closure-live-proof.cjs --spec apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts',
      'pnpm verify:prepush'
    )
  ),
  0,
  'codex'
)
on conflict (rail_id) do update set
  feature_id = excluded.feature_id,
  mechanization_status = excluded.mechanization_status,
  rail_name = excluded.rail_name,
  normalized_rail_name = excluded.normalized_rail_name,
  rail_type = excluded.rail_type,
  ddd_owner = excluded.ddd_owner,
  rail_status = excluded.rail_status,
  symbol_refs = excluded.symbol_refs,
  implementation_refs = excluded.implementation_refs,
  documentation_refs = excluded.documentation_refs,
  governing_sources = excluded.governing_sources,
  allowed_implementation_surfaces = excluded.allowed_implementation_surfaces,
  architecture_guards = excluded.architecture_guards,
  completion_gate = excluded.completion_gate,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  raw_rail = excluded.raw_rail,
  raw_manifest = excluded.raw_manifest,
  revision = greatest(planning_query_store.feature_mechanization_local_rails.revision, excluded.revision) + 1,
  updated_at = now();

do $$
declare
  owned_file_count integer;
  relation_count integer;
  local_rail_count integer;
  canonical_rail_count integer;
begin
  select count(*) into owned_file_count
  from planning_query_store.governance_component_local_ownership_patterns
  where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION'
    and pattern_kind = 'owns';

  select count(*) into relation_count
  from architecture.component_relation
  where target_component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION'
    and relation_id in (
      'REL-WEB-CANVAS-COMMAND-SURFACE-DEPENDS-ON-EXECUTION-SELECTION',
      'REL-WEB-CANVAS-READINESS-DEPENDS-ON-EXECUTION-SELECTION',
      'REL-WEB-CANVAS-DBT-PROJECTOR-DEPENDS-ON-EXECUTION-SELECTION',
      'REL-WEB-CANVAS-DBT-FILE-EXECUTION-DEPENDS-ON-EXECUTION-SELECTION'
    );

  select count(*) into local_rail_count
  from planning_query_store.frontend_component_local_cq_rails
  where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION'
    and rail_status = 'implemented';

  select count(*) into canonical_rail_count
  from planning_query_store.command_query_rail_query
  where rail_name = 'CollectCanvasExecutionSelection'
    and rail_type = 'query'
    and rail_status = 'implemented';

  if owned_file_count <> 6 then
    raise exception 'Canvas execution selection requires six owned files, found %', owned_file_count;
  end if;

  if relation_count <> 4 then
    raise exception 'Canvas execution selection requires four explicit consumer relations, found %', relation_count;
  end if;

  if local_rail_count <> 4 then
    raise exception 'Canvas execution selection requires four owned or consumed rails, found %', local_rail_count;
  end if;

  if canonical_rail_count <> 1 then
    raise exception 'CollectCanvasExecutionSelection must have exactly one canonical query rail, found %', canonical_rail_count;
  end if;
end $$;
