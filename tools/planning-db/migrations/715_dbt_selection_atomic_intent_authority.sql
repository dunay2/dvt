-- Reconcile explicit-empty intent to one atomic route-local state authority.
-- The policy stays pure; the pre-existing interaction store is the sole adapter.

update planning_query_store.frontend_component_local_files
set
  exported_symbol = 'CanvasExecutionSelectionIntent;createCanvasExecutionSelectionIntent',
  raw_file = jsonb_build_object(
    'ownership', 'owned',
    'purpose', 'atomic discriminated route-local execution-selection intent'
  ),
  source_path = 'tools/planning-db/migrations/715_dbt_selection_atomic_intent_authority.sql',
  source_content_sha256 = md5('selection:atomic-intent-contract:715'),
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION'
  and file_path = 'apps/web/src/app/types/canvasExecutionSelection.ts'
  and file_role = 'state-contract';

update planning_query_store.frontend_component_local_files
set
  raw_file = jsonb_build_object(
    'ownership', 'consumed',
    'purpose', 'sole pre-existing route-local adapter for one atomic selection-intent snapshot'
  ),
  source_path = 'tools/planning-db/migrations/715_dbt_selection_atomic_intent_authority.sql',
  source_content_sha256 = md5('selection:sole-state-adapter:715'),
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION'
  and file_path = 'apps/web/src/app/stores/canvasInteractionStore.ts'
  and file_role = 'state-adapter';

delete from architecture.component_test
where test_id = 'TEST-WEB-DBT-SELECTION-STATE-MODE';

insert into architecture.component_test (
  test_id, component_id, test_path, test_kind, coverage_level, required,
  validation_command
)
values
  (
    'TEST-WEB-DBT-SELECTION-ATOMIC-INTENT',
    'SYS-WEB-CANVAS-EXECUTION-SELECTION',
    'apps/web/src/app/stores/canvasInteractionStore.test.ts',
    'unit', 'boundary', true,
    'pnpm --filter @dvt/web exec vitest run src/app/stores/canvasInteractionStore.test.ts'
  ),
  (
    'TEST-WEB-DBT-SELECTION-SOLE-AUTHORITY',
    'SYS-WEB-CANVAS-EXECUTION-SELECTION',
    'apps/web/src/app/views/canvas/canvasExecutionSelection.architecture.test.ts',
    'architecture', 'boundary', true,
    'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/canvasExecutionSelection.architecture.test.ts'
  )
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

delete from planning_query_store.frontend_component_validation_evidence
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION'
  and evidence_id = 'VAL-WEB-DBT-SELECTION-MODE-STATE';

insert into planning_query_store.frontend_component_validation_evidence (
  component_id, evidence_id, evidence_kind, evidence_status, evidence_ref,
  rail_name, context_id, proves, raw_evidence, source_path,
  source_content_sha256
)
values
  (
    'SYS-WEB-CANVAS-EXECUTION-SELECTION',
    'VAL-WEB-DBT-SELECTION-ATOMIC-INTENT',
    'unit-test', 'current',
    'apps/web/src/app/stores/canvasInteractionStore.test.ts',
    'CollectCanvasExecutionSelection',
    'canvas-selection-state-adapter',
    'Workspace and explicit-empty intent are distinct atomic snapshots in the existing route-local adapter.',
    jsonb_build_object('atomicSnapshot', true, 'explicitEmptyStored', true, 'persisted', false),
    'tools/planning-db/migrations/715_dbt_selection_atomic_intent_authority.sql',
    md5('validation:dbt-selection-atomic-intent:715')
  ),
  (
    'SYS-WEB-CANVAS-EXECUTION-SELECTION',
    'VAL-WEB-DBT-SELECTION-SOLE-AUTHORITY',
    'architecture-test', 'current',
    'apps/web/src/app/views/canvas/canvasExecutionSelection.architecture.test.ts',
    'CollectCanvasExecutionSelection',
    'canvas-selection-state-authority',
    'No second store owns CanvasExecutionSelectionIntent and the state cannot split mode from requested ids.',
    jsonb_build_object('singleStoreAuthority', true, 'discriminatedIntent', true),
    'tools/planning-db/migrations/715_dbt_selection_atomic_intent_authority.sql',
    md5('validation:dbt-selection-sole-authority:715')
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
  'Selection mode and requested ids form one atomic discriminated intent snapshot; no second browser state authority may own them.',
  11
)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update planning_query_store.feature_mechanization_local_rails
set
  symbol_refs = (
    select jsonb_agg(symbol_ref order by symbol_ref)
    from (
      select distinct value as symbol_ref
      from jsonb_array_elements_text(symbol_refs)
      where value <> 'apps/web/src/app/types/canvasExecutionSelection.ts#CanvasExecutionSelectionIntentMode'
      union
      select 'apps/web/src/app/types/canvasExecutionSelection.ts#CanvasExecutionSelectionIntent'
      union
      select 'apps/web/src/app/types/canvasExecutionSelection.ts#createCanvasExecutionSelectionIntent'
      union
      select 'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.ts#applyDbtExecutionSelectionToggle'
    ) normalized_symbol_refs
  ),
  implementation_refs = (
    select jsonb_agg(implementation_ref order by implementation_ref)
    from (
      select distinct value as implementation_ref
      from jsonb_array_elements_text(implementation_refs)
      union
      select 'tools/planning-db/migrations/715_dbt_selection_atomic_intent_authority.sql'
    ) normalized_implementation_refs
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(surface order by surface)
    from (
      select distinct value as surface
      from jsonb_array_elements_text(allowed_implementation_surfaces)
      union
      select 'tools/planning-db/migrations/714_dbt_selection_component_file_ownership.sql'
      union
      select 'tools/planning-db/migrations/715_dbt_selection_atomic_intent_authority.sql'
    ) normalized_surfaces
  ),
  raw_manifest = jsonb_set(
    jsonb_set(
      jsonb_set(
        raw_manifest,
        '{allowedImplementationSurfaces}',
        (
          select jsonb_agg(surface order by surface)
          from (
            select distinct value as surface
            from jsonb_array_elements_text(raw_manifest->'allowedImplementationSurfaces')
            union
            select 'tools/planning-db/migrations/714_dbt_selection_component_file_ownership.sql'
            union
            select 'tools/planning-db/migrations/715_dbt_selection_atomic_intent_authority.sql'
          ) normalized_manifest_surfaces
        )
      ),
      '{forbiddenImplementationSurfaces}',
      (
        select coalesce(jsonb_agg(surface order by surface), '[]'::jsonb)
        from (
          select value as surface
          from jsonb_array_elements_text(raw_manifest->'forbiddenImplementationSurfaces')
          where value not like 'apps/web/src/app/stores/**%'
        ) retained_forbidden_surfaces
      )
    ),
    '{symbols}',
    (
      select jsonb_agg(symbol order by symbol->>'path', symbol->>'name')
      from (
        select symbol
        from jsonb_array_elements(raw_manifest->'symbols') symbol
        where symbol->>'name' not in (
          'CanvasExecutionSelectionIntentMode',
          'CanvasExecutionSelectionIntent',
          'createCanvasExecutionSelectionIntent',
          'applyDbtExecutionSelectionToggle'
        )
        union all
        select jsonb_build_object(
          'name', 'CanvasExecutionSelectionIntent',
          'path', 'apps/web/src/app/types/canvasExecutionSelection.ts',
          'dddOwner', 'CanvasExecutionSelection',
          'cqRails', jsonb_build_array('CollectCanvasExecutionSelection'),
          'fowlerSignals', jsonb_build_array('primitive obsession', 'state authority drift'),
          'architectureGuard', 'canvasExecutionSelection.architecture.test.ts',
          'cypressCoverage', 'dbt-project-preview-run-live.cy.ts',
          'unitTests', jsonb_build_array('canvasInteractionStore.test.ts')
        )
        union all
        select jsonb_build_object(
          'name', 'createCanvasExecutionSelectionIntent',
          'path', 'apps/web/src/app/types/canvasExecutionSelection.ts',
          'dddOwner', 'CanvasExecutionSelection',
          'cqRails', jsonb_build_array('CollectCanvasExecutionSelection'),
          'fowlerSignals', jsonb_build_array('primitive obsession'),
          'architectureGuard', 'canvasExecutionSelection.architecture.test.ts',
          'cypressCoverage', 'dbt-project-preview-run-live.cy.ts',
          'unitTests', jsonb_build_array('canvasInteractionStore.test.ts')
        )
        union all
        select jsonb_build_object(
          'name', 'applyDbtExecutionSelectionToggle',
          'path', 'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.ts',
          'dddOwner', 'CanvasExecutionSelection',
          'cqRails', jsonb_build_array('CollectCanvasExecutionSelection'),
          'fowlerSignals', jsonb_build_array('duplicated conditional fragments', 'boundary drift'),
          'architectureGuard', 'canvasExecutionSelection.architecture.test.ts',
          'cypressCoverage', 'dbt-project-preview-run-live.cy.ts',
          'unitTests', jsonb_build_array('dbtExecutionScopePolicy.test.ts')
        )
      ) normalized_symbols
    )
  ),
  source_path = 'tools/planning-db/migrations/715_dbt_selection_atomic_intent_authority.sql',
  source_content_sha256 = repeat(md5('CollectCanvasExecutionSelection:atomic-intent-authority:715'), 2),
  revision = revision + 1,
  updated_at = now()
where rail_id = 'local#E-DBT-PROJECT-ROUNDTRIP-1#query#collectcanvasexecutionselection#fail-closed';

update planning_query_store.governance_component_local_definitions
set
  source_path = 'tools/planning-db/migrations/715_dbt_selection_atomic_intent_authority.sql',
  source_content_sha256 = repeat(md5('SYS-WEB-CANVAS-EXECUTION-SELECTION:atomic-intent:715'), 2),
  owned_concern = 'Preserve one atomic caller selection intent, distinguish workspace fallback from explicit empty intent, classify executable roots, and derive deterministic requested-root and dependency-closure identity without widening or filtering caller intent.',
  revision = revision + 1
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION';

update planning_query_store.frontend_component_local_components
set
  responsibility = 'Preserve one atomic caller selection intent, classify executable DBT roots, and derive requested-root plus dependency-closure read models and draft identity for Preview and readiness.',
  source_path = 'tools/planning-db/migrations/715_dbt_selection_atomic_intent_authority.sql',
  source_content_sha256 = md5('frontend:CanvasExecutionSelection:atomic-intent:715'),
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION';

do $$
declare
  manifest jsonb;
  atomic_file_count integer;
  authority_evidence_count integer;
begin
  select raw_manifest into manifest
  from planning_query_store.feature_mechanization_local_rails
  where rail_id = 'local#E-DBT-PROJECT-ROUNDTRIP-1#query#collectcanvasexecutionselection#fail-closed';

  select count(*) into atomic_file_count
  from planning_query_store.frontend_component_local_files
  where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION'
    and file_path in (
      'apps/web/src/app/types/canvasExecutionSelection.ts',
      'apps/web/src/app/stores/canvasInteractionStore.ts'
    )
    and source_path = 'tools/planning-db/migrations/715_dbt_selection_atomic_intent_authority.sql';

  select count(*) into authority_evidence_count
  from planning_query_store.frontend_component_validation_evidence
  where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION'
    and evidence_id in (
      'VAL-WEB-DBT-SELECTION-ATOMIC-INTENT',
      'VAL-WEB-DBT-SELECTION-SOLE-AUTHORITY'
    )
    and evidence_status = 'current';

  if atomic_file_count <> 2 then
    raise exception 'Atomic selection authority requires two reconciled component files, found %', atomic_file_count;
  end if;

  if authority_evidence_count <> 2 then
    raise exception 'Atomic selection authority requires two current evidence rows, found %', authority_evidence_count;
  end if;

  if exists (
    select 1
    from jsonb_array_elements_text(manifest->'forbiddenImplementationSurfaces') surface
    where surface like 'apps/web/src/app/stores/**%'
  ) then
    raise exception 'The blanket store prohibition still conflicts with the governed existing state adapter';
  end if;

  if jsonb_array_length(manifest->'symbols') <> 20 then
    raise exception 'CollectCanvasExecutionSelection must declare twenty implementation symbols, found %', jsonb_array_length(manifest->'symbols');
  end if;

  if not exists (
    select 1
    from jsonb_array_elements(manifest->'architectureGuards') guard
    where guard->>'name' = 'canvasExecutionSelection.architecture.test.ts'
  ) then
    raise exception 'The sole selection-authority architecture guard is missing';
  end if;
end $$;
