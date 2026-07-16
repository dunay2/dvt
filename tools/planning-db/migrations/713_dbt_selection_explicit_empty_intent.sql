-- Preserve DBT execution-selection intent through empty and partially visible
-- states without creating a parallel command/query rail.

update architecture.design
set
  rationale = 'CollectCanvasExecutionSelection remains the single policy seam. Workspace fallback and explicit empty intent are distinct states; explicit empty intent fails closed, mutations operate on the complete requested set, hidden requested ids are retained, and selecting an available root deliberately replaces an unavailable-only recovery set.',
  updated_at = now()
where design_id = 'AD-DBT-SELECTION-INTENT-INTEGRITY-20260716';

update architecture.component_port
set
  negative_tests = array[
    'explicit DBT selection contains a non-executable resource',
    'explicit DBT selection contains an unavailable resource',
    'mixed explicit DBT selection must not be filtered to a successful subset',
    'unavailable explicit selection must survive visible-scope reconciliation until validation',
    'explicit empty selection must not widen to executable workspace scope',
    'deselecting a visible member must retain hidden requested members',
    'selecting an available root deliberately replaces an unavailable-only recovery set',
    'same dependency closure with different requested roots must invalidate preview identity',
    'duplicate selected node ids',
    'cyclic executable dependency input',
    'browser selection differs from server-authorized resource set'
  ]::text[],
  status = 'implemented'
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION'
  and port_name = 'CollectCanvasExecutionSelection';

delete from planning_query_store.governance_component_local_semantic_items
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION'
  and item_kind = 'public_api';

insert into planning_query_store.governance_component_local_semantic_items (
  component_id, item_kind, item_value, item_order
)
values
  (
    'SYS-WEB-CANVAS-EXECUTION-SELECTION',
    'public_api',
    'collectPreviewSelection;collectPlanSelection;isDbtExecutionSelectableNode;canOfferDbtExecutionSelectionToggle;applyDbtExecutionSelectionToggle;resolveDbtExecutionScope;buildDbtExecutionIntentDraftSignature;buildCanvasDbtExecutionProjection',
    0
  ),
  (
    'SYS-WEB-CANVAS-EXECUTION-SELECTION',
    'invariant',
    'Workspace fallback and explicit empty execution-selection intent are distinct states; explicit empty intent fails closed.',
    8
  ),
  (
    'SYS-WEB-CANVAS-EXECUTION-SELECTION',
    'invariant',
    'DBT selection mutations operate on the complete requested-id set and never silently discard hidden requested members.',
    9
  ),
  (
    'SYS-WEB-CANVAS-EXECUTION-SELECTION',
    'invariant',
    'An unavailable-only DBT recovery set is replaced only by the deliberate user gesture of selecting an available executable root.',
    10
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update planning_query_store.governance_component_local_definitions
set
  source_path = 'tools/planning-db/migrations/713_dbt_selection_explicit_empty_intent.sql',
  source_content_sha256 = repeat(md5('SYS-WEB-CANVAS-EXECUTION-SELECTION:explicit-empty-intent:713'), 2),
  owned_concern = 'Preserve complete generic and DBT execution-selection intent, distinguish workspace fallback from explicit empty intent, classify executable roots, and derive deterministic requested-root and dependency-closure identity without widening or filtering caller intent.',
  revision = revision + 1
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION';

update planning_query_store.frontend_component_local_components
set
  responsibility = 'Preserve complete caller selection intent, distinguish workspace fallback from explicit empty intent, classify executable DBT roots, and derive requested-root plus dependency-closure read models and draft identity for Preview and readiness.',
  raw_component = raw_component || jsonb_build_object(
    'selectionStateAlgebra', jsonb_build_object(
      'workspace', 'derive executable workspace roots',
      'explicitNonEmpty', 'validate every requested member',
      'explicitEmpty', 'reject without widening',
      'mutationBasis', 'complete requested-id set',
      'recovery', 'select available root to replace unavailable-only set'
    )
  ),
  source_path = 'tools/planning-db/migrations/713_dbt_selection_explicit_empty_intent.sql',
  source_content_sha256 = md5('frontend:CanvasExecutionSelection:explicit-empty-intent:713'),
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION';

insert into planning_query_store.frontend_component_local_files (
  component_id, file_path, file_role, exported_symbol, raw_file,
  source_path, source_content_sha256
)
values
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'apps/web/src/app/types/canvasExecutionSelection.ts', 'state-contract', 'CanvasExecutionSelectionIntentMode', jsonb_build_object('ownership', 'owned', 'purpose', 'closed UI intent-state vocabulary'), 'tools/planning-db/migrations/713_dbt_selection_explicit_empty_intent.sql', md5('selection:type:713')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'apps/web/src/app/stores/canvasInteractionStore.ts', 'state-adapter', 'useCanvasInteractionStore', jsonb_build_object('ownership', 'consumed', 'purpose', 'route-local requested ids and selection mode'), 'tools/planning-db/migrations/713_dbt_selection_explicit_empty_intent.sql', md5('selection:store:713')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'apps/web/src/app/stores/canvasInteractionStore.test.ts', 'state-adapter-test', null, jsonb_build_object('ownership', 'evidence'), 'tools/planning-db/migrations/713_dbt_selection_explicit_empty_intent.sql', md5('selection:store-test:713')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'apps/web/src/app/views/canvas/canvasDraftScope.ts', 'scope-adapter', 'deriveExecutionScope', jsonb_build_object('ownership', 'consumed', 'purpose', 'separate requested and visible selection sets'), 'tools/planning-db/migrations/713_dbt_selection_explicit_empty_intent.sql', md5('selection:draft-scope:713')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'apps/web/src/app/views/canvas/canvasDraftScope.test.ts', 'scope-adapter-test', null, jsonb_build_object('ownership', 'evidence'), 'tools/planning-db/migrations/713_dbt_selection_explicit_empty_intent.sql', md5('selection:draft-scope-test:713')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.ts', 'policy', 'resolveDbtExecutionScope;applyDbtExecutionSelectionToggle', jsonb_build_object('ownership', 'owned'), 'tools/planning-db/migrations/713_dbt_selection_explicit_empty_intent.sql', md5('selection:policy:713')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.test.ts', 'unit-test', null, jsonb_build_object('ownership', 'evidence'), 'tools/planning-db/migrations/713_dbt_selection_explicit_empty_intent.sql', md5('selection:policy-test:713')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'apps/web/src/app/views/canvas/canvasDbtPlannerGraphSource.ts', 'authored-projector-adapter', 'resolveDbtExecutionScopeNodeIds', jsonb_build_object('ownership', 'consumed'), 'tools/planning-db/migrations/713_dbt_selection_explicit_empty_intent.sql', md5('selection:authored-projector:713')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'apps/web/src/app/views/canvas/canvasDbtPlannerGraphSource.test.ts', 'authored-projector-test', null, jsonb_build_object('ownership', 'evidence'), 'tools/planning-db/migrations/713_dbt_selection_explicit_empty_intent.sql', md5('selection:authored-projector-test:713')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'apps/web/src/app/views/canvas/dbtProjectFileExecutionStrategy.ts', 'file-projector-adapter', 'buildDbtProjectFilePlannerProjection', jsonb_build_object('ownership', 'consumed'), 'tools/planning-db/migrations/713_dbt_selection_explicit_empty_intent.sql', md5('selection:file-projector:713')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'apps/web/src/app/views/canvas/dbtProjectFileExecutionStrategy.test.ts', 'file-projector-test', null, jsonb_build_object('ownership', 'evidence'), 'tools/planning-db/migrations/713_dbt_selection_explicit_empty_intent.sql', md5('selection:file-projector-test:713')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'apps/web/src/app/views/canvas/canvasDbtExecutionProjection.ts', 'projection-facade', 'buildCanvasDbtExecutionProjection', jsonb_build_object('ownership', 'owned'), 'tools/planning-db/migrations/713_dbt_selection_explicit_empty_intent.sql', md5('selection:projection:713')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'apps/web/src/app/views/canvas/canvasExecutionState.ts', 'readiness-consumer', 'deriveCanvasExecutionState', jsonb_build_object('ownership', 'consumed'), 'tools/planning-db/migrations/713_dbt_selection_explicit_empty_intent.sql', md5('selection:readiness-consumer:713')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'apps/web/src/app/views/canvas/canvasPlanAction.ts', 'command-consumer', 'executeCanvasPlanAction', jsonb_build_object('ownership', 'consumed'), 'tools/planning-db/migrations/713_dbt_selection_explicit_empty_intent.sql', md5('selection:plan-consumer:713')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'apps/web/src/app/views/canvas/useCanvasExecutionActions.ts', 'execution-orchestrator-adapter', 'useCanvasExecutionActions', jsonb_build_object('ownership', 'consumed'), 'tools/planning-db/migrations/713_dbt_selection_explicit_empty_intent.sql', md5('selection:execution-orchestrator:713')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'apps/web/src/app/views/canvas/useCanvasPlanActionHandler.ts', 'command-handler-adapter', 'useCanvasPlanActionHandler', jsonb_build_object('ownership', 'consumed'), 'tools/planning-db/migrations/713_dbt_selection_explicit_empty_intent.sql', md5('selection:plan-handler:713')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'apps/web/src/app/views/canvas/useCanvasStoreFacade.ts', 'state-port-adapter', 'useCanvasStoreFacade', jsonb_build_object('ownership', 'consumed'), 'tools/planning-db/migrations/713_dbt_selection_explicit_empty_intent.sql', md5('selection:store-facade:713')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'apps/web/src/app/views/canvas/useCanvasAuthoringRuntime.ts', 'authoring-runtime-adapter', 'useCanvasAuthoringRuntime', jsonb_build_object('ownership', 'consumed'), 'tools/planning-db/migrations/713_dbt_selection_explicit_empty_intent.sql', md5('selection:authoring-runtime:713')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'apps/web/src/app/views/canvas/useCanvasController.ts', 'authored-controller-adapter', 'useCanvasController', jsonb_build_object('ownership', 'consumed'), 'tools/planning-db/migrations/713_dbt_selection_explicit_empty_intent.sql', md5('selection:authored-controller:713')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'apps/web/src/app/views/canvas/useCanvasControllerReadModel.ts', 'presentation-adapter', 'useCanvasControllerReadModel', jsonb_build_object('ownership', 'consumed'), 'tools/planning-db/migrations/713_dbt_selection_explicit_empty_intent.sql', md5('selection:presentation-adapter:713')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'apps/web/src/app/views/canvas/useCanvasController.draftLifecycle.scopeAndProjection.test.tsx', 'authored-controller-integration-test', null, jsonb_build_object('ownership', 'evidence'), 'tools/planning-db/migrations/713_dbt_selection_explicit_empty_intent.sql', md5('selection:authored-controller-test:713')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts', 'file-controller-adapter', 'useDbtProjectFileCanvasController', jsonb_build_object('ownership', 'consumed'), 'tools/planning-db/migrations/713_dbt_selection_explicit_empty_intent.sql', md5('selection:file-controller:713')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION', 'apps/web/src/app/views/canvas/useDbtProjectFileExecution.ts', 'file-execution-adapter', 'useDbtProjectFileExecution', jsonb_build_object('ownership', 'consumed'), 'tools/planning-db/migrations/713_dbt_selection_explicit_empty_intent.sql', md5('selection:file-execution:713'))
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into architecture.component_test (
  test_id, component_id, test_path, test_kind, coverage_level, required,
  validation_command
)
values
  (
    'TEST-WEB-DBT-SELECTION-EXPLICIT-EMPTY',
    'SYS-WEB-CANVAS-EXECUTION-SELECTION',
    'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.test.ts',
    'unit', 'boundary', true,
    'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/dbtExecutionScopePolicy.test.ts'
  ),
  (
    'TEST-WEB-DBT-SELECTION-STATE-MODE',
    'SYS-WEB-CANVAS-EXECUTION-SELECTION',
    'apps/web/src/app/stores/canvasInteractionStore.test.ts',
    'unit', 'boundary', true,
    'pnpm --filter @dvt/web exec vitest run src/app/stores/canvasInteractionStore.test.ts'
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
    'VAL-WEB-DBT-EXPLICIT-EMPTY-FAIL-CLOSED',
    'unit-test', 'current',
    'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.test.ts',
    'CollectCanvasExecutionSelection',
    'dbt-explicit-empty-intent',
    'Deselecting the final requested root produces explicit empty intent and cannot widen Preview to workspace scope.',
    jsonb_build_object('workspaceDistinctFromExplicitEmpty', true, 'failsClosed', true),
    'tools/planning-db/migrations/713_dbt_selection_explicit_empty_intent.sql',
    md5('validation:dbt-explicit-empty:713')
  ),
  (
    'SYS-WEB-CANVAS-EXECUTION-SELECTION',
    'VAL-WEB-DBT-RAW-SELECTION-MUTATION',
    'unit-test', 'current',
    'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.test.ts',
    'CollectCanvasExecutionSelection',
    'dbt-requested-set-mutation',
    'Selection toggles retain hidden requested ids and replace an unavailable-only set only through an explicit available-root selection gesture.',
    jsonb_build_object('hiddenIdsRetained', true, 'deliberateRecovery', true),
    'tools/planning-db/migrations/713_dbt_selection_explicit_empty_intent.sql',
    md5('validation:dbt-raw-selection-mutation:713')
  ),
  (
    'SYS-WEB-CANVAS-EXECUTION-SELECTION',
    'VAL-WEB-DBT-SELECTION-MODE-STATE',
    'unit-test', 'current',
    'apps/web/src/app/stores/canvasInteractionStore.test.ts',
    'CollectCanvasExecutionSelection',
    'canvas-selection-state-adapter',
    'The route-local state adapter preserves explicit mode when the requested-id set becomes empty.',
    jsonb_build_object('explicitEmptyStored', true, 'notPersistedAcrossRoutes', true),
    'tools/planning-db/migrations/713_dbt_selection_explicit_empty_intent.sql',
    md5('validation:dbt-selection-mode-state:713')
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

update planning_query_store.feature_mechanization_local_rails
set
  symbol_refs = symbol_refs || jsonb_build_array(
    'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.ts#applyDbtExecutionSelectionToggle',
    'apps/web/src/app/types/canvasExecutionSelection.ts#CanvasExecutionSelectionIntentMode'
  ),
  implementation_refs = implementation_refs || jsonb_build_array(
    'tools/planning-db/migrations/713_dbt_selection_explicit_empty_intent.sql'
  ),
  allowed_implementation_surfaces = allowed_implementation_surfaces || jsonb_build_array(
    'apps/web/src/app/types/canvasExecutionSelection.ts',
    'apps/web/src/app/stores/canvasInteractionStore.ts',
    'tools/planning-db/migrations/713_dbt_selection_explicit_empty_intent.sql'
  ),
  raw_manifest = jsonb_set(
    raw_manifest,
    '{allowedImplementationSurfaces}',
    coalesce(raw_manifest->'allowedImplementationSurfaces', '[]'::jsonb) || jsonb_build_array(
      'apps/web/src/app/types/canvasExecutionSelection.ts',
      'apps/web/src/app/stores/canvasInteractionStore.ts',
      'tools/planning-db/migrations/713_dbt_selection_explicit_empty_intent.sql'
    )
  ),
  source_path = 'tools/planning-db/migrations/713_dbt_selection_explicit_empty_intent.sql',
  source_content_sha256 = repeat(md5('CollectCanvasExecutionSelection:explicit-empty-intent:713'), 2),
  revision = revision + 1,
  updated_at = now()
where rail_id = 'local#E-DBT-PROJECT-ROUNDTRIP-1#query#collectcanvasexecutionselection#fail-closed';

do $$
declare
  semantic_invariant_count integer;
  associated_file_count integer;
  validation_evidence_count integer;
begin
  select count(*) into semantic_invariant_count
  from planning_query_store.governance_component_local_semantic_items
  where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION'
    and item_kind = 'invariant'
    and item_order in (8, 9, 10);

  select count(*) into associated_file_count
  from planning_query_store.frontend_component_local_files
  where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION'
    and source_path = 'tools/planning-db/migrations/713_dbt_selection_explicit_empty_intent.sql';

  select count(*) into validation_evidence_count
  from planning_query_store.frontend_component_validation_evidence
  where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION'
    and evidence_id in (
      'VAL-WEB-DBT-EXPLICIT-EMPTY-FAIL-CLOSED',
      'VAL-WEB-DBT-RAW-SELECTION-MUTATION',
      'VAL-WEB-DBT-SELECTION-MODE-STATE'
    )
    and evidence_status = 'current';

  if semantic_invariant_count <> 3 then
    raise exception 'Selection explicit-empty hardening requires three semantic invariants, found %', semantic_invariant_count;
  end if;

  if associated_file_count <> 23 then
    raise exception 'Selection component requires 23 associated source/test files in migration 713, found %', associated_file_count;
  end if;

  if validation_evidence_count <> 3 then
    raise exception 'Selection explicit-empty hardening requires three relational evidence rows, found %', validation_evidence_count;
  end if;
end $$;
