-- Harden the existing CanvasExecutionSelection query model. Explicit DBT
-- selection is a set-valued user intent: every requested member must be an
-- available executable root. Dependency closure is derived data and remains
-- distinguishable in the browser Preview read model.

insert into architecture.design (
  design_id, work_item_id, title, owner, status, rationale, fowler_signal,
  rail_ref, approved_at
)
values (
  'AD-DBT-SELECTION-INTENT-INTEGRITY-20260716',
  'E-DBT-PROJECT-ROUNDTRIP-P4-SELECTION-INTENT-1',
  'DBT execution selection intent integrity',
  'Frontend / Canvas execution selection',
  'implemented',
  'CollectCanvasExecutionSelection remains the single policy seam. It rejects a non-empty explicit set when any member is unavailable or non-executable, exposes selection affordances only for executable DBT roots, and separates requested roots from dependencies derived by transitive closure.',
  'boundary_drift',
  'CollectCanvasExecutionSelection;PreviewExecutionPlan;ObservePlanRunReadiness;RenderCanvasGraphNodeCard',
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
  ('AD-DBT-SELECTION-INTENT-INTEGRITY-20260716', 'component', 'SYS-WEB-CANVAS-EXECUTION-SELECTION', 'may_update', true),
  ('AD-DBT-SELECTION-INTENT-INTEGRITY-20260716', 'component', 'web.component.canvas.GraphNodeCard', 'may_reference', true),
  ('AD-DBT-SELECTION-INTENT-INTEGRITY-20260716', 'component', 'SYS-WEB-CANVAS-DBT-FILE-EXECUTION', 'may_reference', true),
  ('AD-DBT-SELECTION-INTENT-INTEGRITY-20260716', 'query', 'CollectCanvasExecutionSelection', 'may_update', true),
  ('AD-DBT-SELECTION-INTENT-INTEGRITY-20260716', 'test', 'TEST-WEB-DBT-EXECUTION-SCOPE-POLICY', 'must_prove', true),
  ('AD-DBT-SELECTION-INTENT-INTEGRITY-20260716', 'test', 'TEST-DBT-PROJECT-ROUNDTRIP-RT006', 'must_prove', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update architecture.component_responsibility
set
  responsibility = 'Classify DBT execution-selection eligibility, preserve complete caller intent, and derive requested roots plus deterministic executable dependency closure.',
  reason_to_change = 'Generic or DBT selection semantics, executable-root eligibility, closure classification, or canonical selection contract changes.',
  status = 'implemented'
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION';

update architecture.component_port
set
  negative_tests = array[
    'explicit DBT selection contains a non-executable resource',
    'explicit DBT selection contains an unavailable resource',
    'mixed explicit DBT selection must not be filtered to a successful subset',
    'duplicate selected node ids',
    'cyclic executable dependency input',
    'browser selection differs from server-authorized resource set'
  ]::text[],
  status = 'implemented'
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION'
  and port_name = 'CollectCanvasExecutionSelection';

insert into planning_query_store.frontend_component_local_cq_rails (
  component_id, rail_name, rail_kind, rail_status, raw_rail, source_path,
  source_content_sha256
)
values (
  'web.component.canvas.GraphNodeCard',
  'CollectCanvasExecutionSelection',
  'query',
  'implemented',
  jsonb_build_object(
    'ownership', 'consumed',
    'purpose', 'render execution selection only for executable DBT roots',
    'failureMode', 'non-executable resource exposes an execution-selection control'
  ),
  'tools/planning-db/migrations/709_dbt_execution_selection_intent_integrity.sql',
  md5('GraphNodeCard:CollectCanvasExecutionSelection:709')
)
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = excluded.raw_rail,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

delete from planning_query_store.governance_component_local_semantic_items
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION'
  and item_kind = 'public_api';

delete from planning_query_store.governance_component_local_semantic_items
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION'
  and item_kind = 'invariant'
  and item_value = 'An absent selection may derive executable workspace scope; a non-empty explicit selection never widens to workspace scope.';

insert into planning_query_store.governance_component_local_semantic_items (
  component_id, item_kind, item_value, item_order
)
values
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'public_api', 'collectPreviewSelection;collectPlanSelection;isDbtExecutionSelectableNode;resolveDbtExecutionScope;buildCanvasDbtExecutionProjection', 0),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'invariant', 'An absent selection may derive executable workspace scope; every member of a non-empty explicit DBT selection must be an available executable root.', 0),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'invariant', 'Requested execution roots and dependencies included by closure remain separate read-model sets.', 3),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'invariant', 'Graph node selection affordances consume DBT root eligibility from this query model and do not duplicate kind policy.', 4)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update planning_query_store.governance_component_local_definitions
set
  source_path = 'tools/planning-db/migrations/709_dbt_execution_selection_intent_integrity.sql',
  source_content_sha256 = repeat(md5('SYS-WEB-CANVAS-EXECUTION-SELECTION:intent-integrity:709'), 2),
  owned_concern = 'Preserve complete generic and DBT execution-selection intent, classify executable roots, and derive deterministic requested-root and dependency-closure sets without widening or filtering explicit intent.',
  revision = revision + 1
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION';

update planning_query_store.frontend_component_local_components
set
  responsibility = 'Preserve complete caller selection intent, classify executable DBT roots, and derive requested-root plus dependency-closure read models for Preview and readiness.',
  raw_component = raw_component || jsonb_build_object(
    'selectionSemantics', jsonb_build_object(
      'absent', 'workspace executable scope',
      'explicitInvalidMember', 'reject complete selection',
      'successfulProjection', 'requested roots plus derived dependency closure'
    )
  ),
  source_path = 'tools/planning-db/migrations/709_dbt_execution_selection_intent_integrity.sql',
  source_content_sha256 = md5('frontend:CanvasExecutionSelection:intent-integrity:709'),
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION';

update planning_query_store.frontend_component_context_actions
set
  raw_action = raw_action || jsonb_build_object(
    'eligibilityQuery', 'CollectCanvasExecutionSelection',
    'eligibleDbtKinds', jsonb_build_array('dbt:model', 'dbt:test', 'dbt:snapshot'),
    'ineligibleBehavior', 'do not render the action'
  ),
  source_path = 'tools/planning-db/migrations/709_dbt_execution_selection_intent_integrity.sql',
  source_content_sha256 = md5('GraphNodeCard:selection-eligibility:709'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCard'
  and context_id = 'node-card'
  and action_id = 'toggle-execution-selection-from-card';

insert into architecture.component_test (
  test_id, component_id, test_path, test_kind, coverage_level, required,
  validation_command
)
values
  (
    'TEST-WEB-DBT-EXECUTION-SELECTION-AFFORDANCE',
    'SYS-WEB-CANVAS-EXECUTION-SELECTION',
    'apps/web/src/app/views/canvas/useCanvasControllerReadModel.test.tsx',
    'integration', 'boundary', true,
    'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/views/canvas/useCanvasControllerReadModel.test.tsx'
  ),
  (
    'TEST-WEB-DBT-EXECUTION-SELECTION-PREVIEW-PRESENTATION',
    'SYS-WEB-CANVAS-EXECUTION-SELECTION',
    'apps/web/src/app/components/Modals.test.tsx',
    'unit', 'boundary', true,
    'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/components/Modals.test.tsx'
  )
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

insert into planning_query_store.frontend_component_validation_evidence (
  component_id, evidence_id, evidence_kind, evidence_status, evidence_ref,
  rail_name, context_id, proves, raw_evidence, source_path,
  source_content_sha256
)
values
  (
    'SYS-WEB-CANVAS-EXECUTION-SELECTION',
    'VAL-WEB-DBT-SCOPE-MIXED-INTENT',
    'unit-test', 'current',
    'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.test.ts',
    'CollectCanvasExecutionSelection',
    'dbt-explicit-selection',
    'A mixed explicit set containing executable and non-executable ids rejects as one intent instead of silently filtering members.',
    jsonb_build_object('setSemantics', 'all requested members must be executable'),
    'tools/planning-db/migrations/709_dbt_execution_selection_intent_integrity.sql',
    md5('validation:dbt-mixed-selection:709')
  ),
  (
    'SYS-WEB-CANVAS-EXECUTION-SELECTION',
    'VAL-WEB-DBT-SELECTION-AFFORDANCE',
    'presentation-test', 'current',
    'apps/web/src/app/views/canvas/useCanvasControllerReadModel.test.tsx',
    'CollectCanvasExecutionSelection',
    'dbt-root-selection-affordance',
    'DBT source cards omit execution selection while model, test, and snapshot roots expose it.',
    jsonb_build_object('presentationConsumesPolicy', true),
    'tools/planning-db/migrations/709_dbt_execution_selection_intent_integrity.sql',
    md5('validation:dbt-selection-affordance:709')
  ),
  (
    'SYS-WEB-CANVAS-EXECUTION-SELECTION',
    'VAL-WEB-DBT-SELECTION-PREVIEW-CLASSIFICATION',
    'presentation-test', 'current',
    'apps/web/src/app/components/Modals.test.tsx',
    'PreviewExecutionPlan',
    'dbt-preview-selection-review',
    'Execution Preview labels requested resources, included dependencies, and the authorized execution scope separately.',
    jsonb_build_object('requestedAndDerivedDistinct', true),
    'tools/planning-db/migrations/709_dbt_execution_selection_intent_integrity.sql',
    md5('validation:dbt-preview-selection-classification:709')
  )
on conflict (component_id, evidence_id) do update set
  evidence_kind = excluded.evidence_kind,
  evidence_status = excluded.evidence_status,
  evidence_ref = excluded.evidence_ref,
  rail_name = excluded.rail_name,
  context_id = excluded.context_id,
  proves = excluded.proves,
  raw_evidence = excluded.raw_evidence,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

update planning_query_store.frontend_component_validation_evidence
set
  proves = 'The real browser omits execution selection from DBT sources, selects an executable root, and shows requested resources separately from included dependencies and authorized scope.',
  raw_evidence = raw_evidence || jsonb_build_object(
    'sourceSelectionAffordanceAbsent', true,
    'requestedResourcesEqualVisibleSelection', true,
    'derivedDependenciesVisible', true
  ),
  source_path = 'tools/planning-db/migrations/709_dbt_execution_selection_intent_integrity.sql',
  source_content_sha256 = md5('validation:dbt-scope-live:intent-integrity:709'),
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION'
  and evidence_id = 'VAL-WEB-DBT-SCOPE-STRICT-BROWSER';

update planning_query_store.feature_mechanization_local_rails
set
  symbol_refs = symbol_refs || jsonb_build_array(
    'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.ts#isDbtExecutionSelectableNode'
  ),
  implementation_refs = implementation_refs || jsonb_build_array(
    'apps/web/src/app/views/canvas/useCanvasControllerReadModel.ts',
    'apps/web/src/app/views/canvas/useCanvasControllerReadModel.test.tsx',
    'apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts',
    'apps/web/src/app/components/Modals.tsx',
    'apps/web/src/app/components/Modals.test.tsx',
    'tools/planning-db/migrations/709_dbt_execution_selection_intent_integrity.sql'
  ),
  allowed_implementation_surfaces = allowed_implementation_surfaces || jsonb_build_array(
    'apps/web/src/app/views/canvas/useCanvasControllerReadModel.ts',
    'apps/web/src/app/views/canvas/useCanvasControllerReadModel.test.tsx',
    'apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts',
    'apps/web/src/app/components/Modals.tsx',
    'apps/web/src/app/components/Modals.test.tsx',
    'tools/planning-db/migrations/709_dbt_execution_selection_intent_integrity.sql'
  ),
  raw_manifest = jsonb_set(
    jsonb_set(
      jsonb_set(
        raw_manifest,
        '{implementationPlan}',
        to_jsonb('Reject any invalid member of explicit DBT selection, expose selection only on executable roots, and show requested roots separately from derived dependency closure.'::text)
      ),
      '{userStories}',
      jsonb_build_array(
        'A workspace editor can select only executable DBT roots; sources never imply they can run independently.',
        'A workspace editor sees that Preview preserves exactly the requested roots and separately includes required executable dependencies.',
        'A stale or mixed explicit selection fails closed instead of silently dropping part of the request.'
      )
    ),
    '{negativeCases}',
    jsonb_build_array(
      'explicit source-only DBT selection',
      'mixed explicit executable and non-executable DBT selection',
      'explicit unavailable resource id',
      'browser bypass reaches server authority',
      'cyclic executable dependency input'
    )
  ),
  source_path = 'tools/planning-db/migrations/709_dbt_execution_selection_intent_integrity.sql',
  source_content_sha256 = repeat(md5('CollectCanvasExecutionSelection:intent-integrity:709'), 2),
  revision = revision + 1,
  updated_at = now()
where rail_id = 'local#E-DBT-PROJECT-ROUNDTRIP-1#query#collectcanvasexecutionselection#fail-closed';

do $$
declare
  card_rail_count integer;
  validation_count integer;
  action_eligibility text;
begin
  select count(*) into card_rail_count
  from planning_query_store.frontend_component_local_cq_rails
  where component_id = 'web.component.canvas.GraphNodeCard'
    and rail_name = 'CollectCanvasExecutionSelection'
    and rail_kind = 'query'
    and rail_status = 'implemented';

  select count(*) into validation_count
  from planning_query_store.frontend_component_validation_evidence
  where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION'
    and evidence_id in (
      'VAL-WEB-DBT-SCOPE-MIXED-INTENT',
      'VAL-WEB-DBT-SELECTION-AFFORDANCE',
      'VAL-WEB-DBT-SELECTION-PREVIEW-CLASSIFICATION',
      'VAL-WEB-DBT-SCOPE-STRICT-BROWSER'
    )
    and evidence_status = 'current';

  select raw_action->>'eligibilityQuery' into action_eligibility
  from planning_query_store.frontend_component_context_actions
  where component_id = 'web.component.canvas.GraphNodeCard'
    and context_id = 'node-card'
    and action_id = 'toggle-execution-selection-from-card';

  if card_rail_count <> 1 then
    raise exception 'GraphNodeCard must consume exactly one CollectCanvasExecutionSelection query rail';
  end if;

  if validation_count <> 4 then
    raise exception 'Selection intent integrity requires four relational validation records, found %', validation_count;
  end if;

  if action_eligibility is distinct from 'CollectCanvasExecutionSelection' then
    raise exception 'GraphNodeCard selection action must consume CollectCanvasExecutionSelection';
  end if;
end $$;
