-- Close the DB-first ownership and boundary contract for atomic Canvas DBT
-- execution-selection intent.

insert into planning_query_store.frontend_component_local_files (
  component_id, file_path, file_role, exported_symbol, raw_file,
  source_path, source_content_sha256
)
values
  (
    'SYS-WEB-CANVAS-EXECUTION-SELECTION',
    'apps/web/src/app/views/canvas/useCanvasController.permissions.test.tsx',
    'controller-permission-integration-test',
    null,
    jsonb_build_object(
      'ownership', 'evidence',
      'purpose', 'prove execution selection remains available independently of graph mutation rights'
    ),
    'tools/planning-db/migrations/717_dbt_selection_atomic_boundary_contract.sql',
    md5('selection:controller-permission-test:717')
  ),
  (
    'SYS-WEB-CANVAS-EXECUTION-SELECTION',
    'apps/web/src/app/views/canvas/useCanvasExecutionActions.dbtDraftFlush.test.tsx',
    'draft-flush-selection-integration-test',
    null,
    jsonb_build_object(
      'ownership', 'evidence',
      'purpose', 'prove atomic DBT intent survives authoritative draft flush before Preview'
    ),
    'tools/planning-db/migrations/717_dbt_selection_atomic_boundary_contract.sql',
    md5('selection:dbt-draft-flush-test:717')
  ),
  (
    'SYS-WEB-CANVAS-EXECUTION-SELECTION',
    'apps/web/src/app/views/canvas/useCanvasExecutionActions.dbtPreviewRun.test.tsx',
    'preview-run-selection-integration-test',
    null,
    jsonb_build_object(
      'ownership', 'evidence',
      'purpose', 'prove atomic DBT intent reaches persisted Preview and run readiness'
    ),
    'tools/planning-db/migrations/717_dbt_selection_atomic_boundary_contract.sql',
    md5('selection:dbt-preview-run-test:717')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

update planning_query_store.frontend_component_local_files
set
  exported_symbol = 'useCanvasInteractionStore;setExecutionSelectionIntent',
  raw_file = jsonb_build_object(
    'ownership', 'consumed',
    'purpose', 'sole route-local adapter with an atomic intent replacement command'
  ),
  source_path = 'tools/planning-db/migrations/717_dbt_selection_atomic_boundary_contract.sql',
  source_content_sha256 = md5('selection:atomic-state-command:717'),
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION'
  and file_path = 'apps/web/src/app/stores/canvasInteractionStore.ts'
  and file_role = 'state-adapter';

update planning_query_store.frontend_component_local_files
set
  exported_symbol = 'resolveDbtExecutionScope;applyDbtExecutionSelectionToggle',
  raw_file = jsonb_build_object(
    'ownership', 'owned',
    'purpose', 'derive fail-closed DBT scope and return one atomic intent from selection gestures'
  ),
  source_path = 'tools/planning-db/migrations/717_dbt_selection_atomic_boundary_contract.sql',
  source_content_sha256 = md5('selection:atomic-toggle-policy:717'),
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION'
  and file_path = 'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.ts'
  and file_role = 'policy';

insert into architecture.component_test (
  test_id, component_id, test_path, test_kind, coverage_level, required,
  validation_command
)
values
  (
    'TEST-WEB-DBT-SELECTION-CONTROLLER-PERMISSIONS',
    'SYS-WEB-CANVAS-EXECUTION-SELECTION',
    'apps/web/src/app/views/canvas/useCanvasController.permissions.test.tsx',
    'integration', 'boundary', true,
    'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/useCanvasController.permissions.test.tsx'
  ),
  (
    'TEST-WEB-DBT-SELECTION-DRAFT-FLUSH',
    'SYS-WEB-CANVAS-EXECUTION-SELECTION',
    'apps/web/src/app/views/canvas/useCanvasExecutionActions.dbtDraftFlush.test.tsx',
    'integration', 'boundary', true,
    'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/useCanvasExecutionActions.dbtDraftFlush.test.tsx'
  ),
  (
    'TEST-WEB-DBT-SELECTION-PREVIEW-RUN',
    'SYS-WEB-CANVAS-EXECUTION-SELECTION',
    'apps/web/src/app/views/canvas/useCanvasExecutionActions.dbtPreviewRun.test.tsx',
    'integration', 'boundary', true,
    'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/useCanvasExecutionActions.dbtPreviewRun.test.tsx'
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
    'VAL-WEB-DBT-SELECTION-ATOMIC-BOUNDARIES',
    'architecture-test', 'current',
    'apps/web/src/app/views/canvas/canvasExecutionSelection.architecture.test.ts',
    'CollectCanvasExecutionSelection',
    'canvas-selection-boundary-contract',
    'State commands, execution action contracts, scope projectors, and DBT controllers carry one atomic intent.',
    jsonb_build_object(
      'atomicStateCommand', true,
      'atomicExecutionBoundary', true,
      'parallelModeAndIdsRejected', true
    ),
    'tools/planning-db/migrations/717_dbt_selection_atomic_boundary_contract.sql',
    md5('validation:dbt-selection-atomic-boundaries:717')
  ),
  (
    'SYS-WEB-CANVAS-EXECUTION-SELECTION',
    'VAL-WEB-DBT-SELECTION-PREVIEW-RUN-BOUNDARY',
    'integration-test', 'current',
    'apps/web/src/app/views/canvas/useCanvasExecutionActions.dbtPreviewRun.test.tsx',
    'PreviewExecutionPlan',
    'canvas-selection-preview-run-boundary',
    'The selected DBT intent reaches persisted Preview and enables run only from its matching proof.',
    jsonb_build_object('persistedPreview', true, 'matchingRunReadiness', true),
    'tools/planning-db/migrations/717_dbt_selection_atomic_boundary_contract.sql',
    md5('validation:dbt-selection-preview-run-boundary:717')
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

insert into planning_query_store.governance_component_local_semantic_items (
  component_id, item_kind, item_value, item_order
)
values (
  'SYS-WEB-CANVAS-EXECUTION-SELECTION',
  'invariant',
  'State commands, scope projectors, readiness, and Preview carry CanvasExecutionSelectionIntent atomically; mode and requested ids are never parallel mutable parameters.',
  12
)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update planning_query_store.feature_mechanization_local_rails
set
  implementation_refs = (
    select jsonb_agg(implementation_ref order by implementation_ref)
    from (
      select distinct value as implementation_ref
      from jsonb_array_elements_text(implementation_refs)
      union
      select 'tools/planning-db/migrations/717_dbt_selection_atomic_boundary_contract.sql'
    ) normalized_implementation_refs
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(surface order by surface)
    from (
      select distinct value as surface
      from jsonb_array_elements_text(allowed_implementation_surfaces)
      union
      select 'apps/web/src/app/views/canvas/useCanvasController.permissions.test.tsx'
      union
      select 'apps/web/src/app/views/canvas/useCanvasExecutionActions.dbtDraftFlush.test.tsx'
      union
      select 'apps/web/src/app/views/canvas/useCanvasExecutionActions.dbtPreviewRun.test.tsx'
      union
      select 'tools/planning-db/migrations/717_dbt_selection_atomic_boundary_contract.sql'
    ) normalized_surfaces
  ),
  raw_manifest = jsonb_set(
    raw_manifest,
    '{allowedImplementationSurfaces}',
    (
      select jsonb_agg(surface order by surface)
      from (
        select distinct value as surface
        from jsonb_array_elements_text(raw_manifest->'allowedImplementationSurfaces')
        union
        select 'apps/web/src/app/views/canvas/useCanvasController.permissions.test.tsx'
        union
        select 'apps/web/src/app/views/canvas/useCanvasExecutionActions.dbtDraftFlush.test.tsx'
        union
        select 'apps/web/src/app/views/canvas/useCanvasExecutionActions.dbtPreviewRun.test.tsx'
        union
        select 'tools/planning-db/migrations/717_dbt_selection_atomic_boundary_contract.sql'
      ) normalized_manifest_surfaces
    )
  ),
  source_path = 'tools/planning-db/migrations/717_dbt_selection_atomic_boundary_contract.sql',
  source_content_sha256 = repeat(md5('CollectCanvasExecutionSelection:atomic-boundary-contract:717'), 2),
  revision = revision + 1,
  updated_at = now()
where rail_id = 'local#E-DBT-PROJECT-ROUNDTRIP-1#query#collectcanvasexecutionselection#fail-closed';

update planning_query_store.governance_component_local_definitions
set
  source_path = 'tools/planning-db/migrations/717_dbt_selection_atomic_boundary_contract.sql',
  source_content_sha256 = repeat(md5('SYS-WEB-CANVAS-EXECUTION-SELECTION:atomic-boundary-contract:717'), 2),
  revision = revision + 1
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION';

update planning_query_store.frontend_component_local_components
set
  source_path = 'tools/planning-db/migrations/717_dbt_selection_atomic_boundary_contract.sql',
  source_content_sha256 = md5('frontend:CanvasExecutionSelection:atomic-boundary-contract:717'),
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION';

do $$
declare
  mapped_test_count integer;
  atomic_boundary_evidence_count integer;
  atomic_boundary_invariant_count integer;
begin
  select count(*) into mapped_test_count
  from planning_query_store.frontend_component_local_files
  where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION'
    and file_path in (
      'apps/web/src/app/views/canvas/useCanvasController.permissions.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasExecutionActions.dbtDraftFlush.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasExecutionActions.dbtPreviewRun.test.tsx'
    )
    and source_path = 'tools/planning-db/migrations/717_dbt_selection_atomic_boundary_contract.sql';

  select count(*) into atomic_boundary_evidence_count
  from planning_query_store.frontend_component_validation_evidence
  where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION'
    and evidence_id in (
      'VAL-WEB-DBT-SELECTION-ATOMIC-BOUNDARIES',
      'VAL-WEB-DBT-SELECTION-PREVIEW-RUN-BOUNDARY'
    )
    and evidence_status = 'current';

  select count(*) into atomic_boundary_invariant_count
  from planning_query_store.governance_component_local_semantic_items
  where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION'
    and item_kind = 'invariant'
    and item_order = 12;

  if mapped_test_count <> 3 then
    raise exception 'Atomic selection boundary requires three newly mapped integration tests, found %', mapped_test_count;
  end if;

  if atomic_boundary_evidence_count <> 2 then
    raise exception 'Atomic selection boundary requires two current evidence rows, found %', atomic_boundary_evidence_count;
  end if;

  if atomic_boundary_invariant_count <> 1 then
    raise exception 'Atomic selection boundary invariant is missing or duplicated';
  end if;

  if not exists (
    select 1
    from planning_query_store.feature_mechanization_local_rails rail,
      jsonb_array_elements_text(rail.allowed_implementation_surfaces) surface
    where rail.rail_id = 'local#E-DBT-PROJECT-ROUNDTRIP-1#query#collectcanvasexecutionselection#fail-closed'
      and surface = 'tools/planning-db/migrations/717_dbt_selection_atomic_boundary_contract.sql'
  ) then
    raise exception 'Atomic selection boundary migration is absent from the governed implementation surface';
  end if;
end $$;
