-- Preserve hidden DBT execution-selection members when graph lifecycle
-- updates reconcile the visible subset.

update architecture.design
set
  rationale = 'CollectCanvasExecutionSelection remains the single policy seam. Workspace fallback and explicit empty intent are distinct states; explicit empty intent fails closed; selection gestures and graph lifecycle updates operate on the complete requested set; hidden requested ids are retained; and selecting an available root deliberately replaces an unavailable-only recovery set.',
  updated_at = now()
where design_id = 'AD-DBT-SELECTION-INTENT-INTEGRITY-20260716';

update architecture.component_port
set
  negative_tests = case
    when coalesce(negative_tests, array[]::text[]) @> array[
      'removing a visible DBT selection member must retain hidden requested members'
    ]::text[] then negative_tests
    else array_append(
      coalesce(negative_tests, array[]::text[]),
      'removing a visible DBT selection member must retain hidden requested members'
    )
  end,
  status = 'implemented'
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION'
  and port_name = 'CollectCanvasExecutionSelection';

update planning_query_store.governance_component_local_semantic_items
set item_value = 'DBT selection gestures and graph lifecycle updates operate on the complete requested-id set and never silently discard hidden requested members.'
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION'
  and item_kind = 'invariant'
  and item_order = 9;

update planning_query_store.governance_component_local_semantic_items
set item_value = case
  when position('reconcileDbtExecutionSelectionVisibleSubset' in item_value) > 0 then item_value
  else item_value || ';reconcileDbtExecutionSelectionVisibleSubset'
end
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION'
  and item_kind = 'public_api';

update planning_query_store.frontend_component_local_files
set
  raw_file = jsonb_build_object(
    'ownership', 'consumed',
    'purpose', 'adapt visible graph lifecycle updates without discarding hidden DBT selection intent'
  ),
  source_path = 'tools/planning-db/migrations/720_dbt_selection_lifecycle_hidden_intent.sql',
  source_content_sha256 = md5('selection:controller-lifecycle-hidden-intent:720'),
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION'
  and file_path = 'apps/web/src/app/views/canvas/useCanvasController.ts'
  and file_role = 'authored-controller-adapter';

update planning_query_store.frontend_component_local_files
set
  raw_file = jsonb_build_object(
    'ownership', 'evidence',
    'purpose', 'prove visible graph lifecycle fallout retains hidden requested DBT selection members'
  ),
  source_path = 'tools/planning-db/migrations/720_dbt_selection_lifecycle_hidden_intent.sql',
  source_content_sha256 = md5('selection:controller-lifecycle-hidden-intent-test:720'),
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION'
  and file_path = 'apps/web/src/app/views/canvas/useCanvasController.draftLifecycle.scopeAndProjection.test.tsx'
  and file_role = 'authored-controller-integration-test';

update planning_query_store.frontend_component_local_files
set
  exported_symbol = 'resolveDbtExecutionScope;applyDbtExecutionSelectionToggle;reconcileDbtExecutionSelectionVisibleSubset',
  raw_file = jsonb_build_object(
    'ownership', 'owned',
    'purpose', 'derive fail-closed DBT scope and reconcile gestures or visible lifecycle subsets against complete intent'
  ),
  source_path = 'tools/planning-db/migrations/720_dbt_selection_lifecycle_hidden_intent.sql',
  source_content_sha256 = md5('selection:visible-subset-policy:720'),
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION'
  and file_path = 'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.ts'
  and file_role = 'policy';

update planning_query_store.frontend_component_local_files
set
  raw_file = jsonb_build_object(
    'ownership', 'evidence',
    'purpose', 'prove complete-intent set algebra for DBT gestures and visible lifecycle reconciliation'
  ),
  source_path = 'tools/planning-db/migrations/720_dbt_selection_lifecycle_hidden_intent.sql',
  source_content_sha256 = md5('selection:visible-subset-policy-test:720'),
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION'
  and file_path = 'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.test.ts'
  and file_role = 'unit-test';

insert into architecture.component_test (
  test_id, component_id, test_path, test_kind, coverage_level, required,
  validation_command
)
values (
  'TEST-WEB-DBT-SELECTION-LIFECYCLE-HIDDEN-IDS',
  'SYS-WEB-CANVAS-EXECUTION-SELECTION',
  'apps/web/src/app/views/canvas/useCanvasController.draftLifecycle.scopeAndProjection.test.tsx',
  'integration', 'boundary', true,
  'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/useCanvasController.draftLifecycle.scopeAndProjection.test.tsx'
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
values (
  'SYS-WEB-CANVAS-EXECUTION-SELECTION',
  'VAL-WEB-DBT-SELECTION-LIFECYCLE-HIDDEN-IDS',
  'integration-test', 'current',
  'apps/web/src/app/views/canvas/useCanvasController.draftLifecycle.scopeAndProjection.test.tsx',
  'CollectCanvasExecutionSelection',
  'dbt-visible-lifecycle-reconciliation',
  'Removing a visible selected DBT node reconciles that visible member while retaining every hidden requested member in the explicit intent.',
  jsonb_build_object(
    'visibleMemberRemoved', true,
    'hiddenRequestedIdsRetained', true,
    'explicitModeRetained', true
  ),
  'tools/planning-db/migrations/720_dbt_selection_lifecycle_hidden_intent.sql',
  md5('validation:dbt-selection-lifecycle-hidden-ids:720')
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
  implementation_refs = (
    select jsonb_agg(implementation_ref order by implementation_ref)
    from (
      select distinct value as implementation_ref
      from jsonb_array_elements_text(implementation_refs)
      union
      select 'tools/planning-db/migrations/720_dbt_selection_lifecycle_hidden_intent.sql'
    ) normalized_implementation_refs
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(surface order by surface)
    from (
      select distinct value as surface
      from jsonb_array_elements_text(allowed_implementation_surfaces)
      union
      select 'apps/web/src/app/views/canvas/useCanvasController.ts'
      union
      select 'apps/web/src/app/views/canvas/useCanvasController.draftLifecycle.scopeAndProjection.test.tsx'
      union
      select 'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.ts'
      union
      select 'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.test.ts'
      union
      select 'tools/planning-db/migrations/720_dbt_selection_lifecycle_hidden_intent.sql'
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
        select 'apps/web/src/app/views/canvas/useCanvasController.ts'
        union
        select 'apps/web/src/app/views/canvas/useCanvasController.draftLifecycle.scopeAndProjection.test.tsx'
        union
        select 'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.ts'
        union
        select 'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.test.ts'
        union
        select 'tools/planning-db/migrations/720_dbt_selection_lifecycle_hidden_intent.sql'
      ) normalized_manifest_surfaces
    )
  ),
  source_path = 'tools/planning-db/migrations/720_dbt_selection_lifecycle_hidden_intent.sql',
  source_content_sha256 = repeat(md5('CollectCanvasExecutionSelection:lifecycle-hidden-intent:720'), 2),
  revision = revision + 1,
  updated_at = now()
where rail_id = 'local#E-DBT-PROJECT-ROUNDTRIP-1#query#collectcanvasexecutionselection#fail-closed';

update planning_query_store.governance_component_local_definitions
set
  source_path = 'tools/planning-db/migrations/720_dbt_selection_lifecycle_hidden_intent.sql',
  source_content_sha256 = repeat(md5('SYS-WEB-CANVAS-EXECUTION-SELECTION:lifecycle-hidden-intent:720'), 2),
  revision = revision + 1
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION';

update planning_query_store.frontend_component_local_components
set
  source_path = 'tools/planning-db/migrations/720_dbt_selection_lifecycle_hidden_intent.sql',
  source_content_sha256 = md5('frontend:CanvasExecutionSelection:lifecycle-hidden-intent:720'),
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION';

do $$
declare
  lifecycle_invariant_count integer;
  lifecycle_file_count integer;
  lifecycle_test_count integer;
  lifecycle_evidence_count integer;
  duplicate_file_role_count integer;
begin
  select count(*) into lifecycle_invariant_count
  from planning_query_store.governance_component_local_semantic_items
  where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION'
    and item_kind = 'invariant'
    and item_order = 9
    and item_value like '%graph lifecycle updates%complete requested-id set%';

  select count(*) into lifecycle_file_count
  from planning_query_store.frontend_component_local_files
  where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION'
    and file_path in (
      'apps/web/src/app/views/canvas/useCanvasController.ts',
      'apps/web/src/app/views/canvas/useCanvasController.draftLifecycle.scopeAndProjection.test.tsx',
      'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.ts',
      'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.test.ts'
    )
    and source_path = 'tools/planning-db/migrations/720_dbt_selection_lifecycle_hidden_intent.sql';

  select count(*) into lifecycle_test_count
  from architecture.component_test
  where test_id = 'TEST-WEB-DBT-SELECTION-LIFECYCLE-HIDDEN-IDS'
    and component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION'
    and required;

  select count(*) into lifecycle_evidence_count
  from planning_query_store.frontend_component_validation_evidence
  where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION'
    and evidence_id = 'VAL-WEB-DBT-SELECTION-LIFECYCLE-HIDDEN-IDS'
    and rail_name = 'CollectCanvasExecutionSelection'
    and evidence_status = 'current';

  select count(*) into duplicate_file_role_count
  from (
    select file_path
    from planning_query_store.frontend_component_local_files
    where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION'
    group by file_path
    having count(*) > 1
  ) duplicates;

  if lifecycle_invariant_count <> 1 then
    raise exception 'DBT selection lifecycle invariant is missing or duplicated';
  end if;

  if lifecycle_file_count <> 4 then
    raise exception 'DBT selection lifecycle requires four mapped files, found %', lifecycle_file_count;
  end if;

  if lifecycle_test_count <> 1 then
    raise exception 'DBT selection lifecycle requires one mandatory component test, found %', lifecycle_test_count;
  end if;

  if lifecycle_evidence_count <> 1 then
    raise exception 'DBT selection lifecycle requires one current evidence row, found %', lifecycle_evidence_count;
  end if;

  if duplicate_file_role_count <> 0 then
    raise exception 'Canvas execution-selection component has % paths with duplicate roles', duplicate_file_role_count;
  end if;

  if not exists (
    select 1
    from planning_query_store.feature_mechanization_local_rails rail,
      jsonb_array_elements_text(rail.allowed_implementation_surfaces) surface
    where rail.rail_id = 'local#E-DBT-PROJECT-ROUNDTRIP-1#query#collectcanvasexecutionselection#fail-closed'
      and surface = 'tools/planning-db/migrations/720_dbt_selection_lifecycle_hidden_intent.sql'
  ) then
    raise exception 'DBT selection lifecycle migration is absent from the governed implementation surface';
  end if;
end $$;
