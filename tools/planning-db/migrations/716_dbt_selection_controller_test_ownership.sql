-- Complete relational ownership for controller tests adapted to the atomic
-- Canvas execution-selection intent contract.

insert into planning_query_store.frontend_component_local_files (
  component_id, file_path, file_role, exported_symbol, raw_file,
  source_path, source_content_sha256
)
values
  (
    'SYS-WEB-CANVAS-EXECUTION-SELECTION',
    'apps/web/src/app/views/canvas/useCanvasController.inspector.test.tsx',
    'controller-selection-integration-test',
    null,
    jsonb_build_object('ownership', 'evidence', 'purpose', 'consume atomic selection intent through the controller harness'),
    'tools/planning-db/migrations/716_dbt_selection_controller_test_ownership.sql',
    md5('selection:controller-inspector-test:716')
  ),
  (
    'SYS-WEB-CANVAS-EXECUTION-SELECTION',
    'apps/web/src/app/views/canvas/useCanvasController.reloadHydrationGuards.test.tsx',
    'controller-hydration-integration-test',
    null,
    jsonb_build_object('ownership', 'evidence', 'purpose', 'consume atomic selection intent through reload reconciliation'),
    'tools/planning-db/migrations/716_dbt_selection_controller_test_ownership.sql',
    md5('selection:controller-reload-test:716')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
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
      select 'tools/planning-db/migrations/716_dbt_selection_controller_test_ownership.sql'
    ) normalized_implementation_refs
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(surface order by surface)
    from (
      select distinct value as surface
      from jsonb_array_elements_text(allowed_implementation_surfaces)
      union
      select 'apps/web/src/app/views/canvas/useCanvasController.inspector.test.tsx'
      union
      select 'apps/web/src/app/views/canvas/useCanvasController.reloadHydrationGuards.test.tsx'
      union
      select 'tools/planning-db/migrations/716_dbt_selection_controller_test_ownership.sql'
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
        select 'apps/web/src/app/views/canvas/useCanvasController.inspector.test.tsx'
        union
        select 'apps/web/src/app/views/canvas/useCanvasController.reloadHydrationGuards.test.tsx'
        union
        select 'tools/planning-db/migrations/716_dbt_selection_controller_test_ownership.sql'
      ) normalized_manifest_surfaces
    )
  ),
  source_path = 'tools/planning-db/migrations/716_dbt_selection_controller_test_ownership.sql',
  source_content_sha256 = repeat(md5('CollectCanvasExecutionSelection:controller-test-ownership:716'), 2),
  revision = revision + 1,
  updated_at = now()
where rail_id = 'local#E-DBT-PROJECT-ROUNDTRIP-1#query#collectcanvasexecutionselection#fail-closed';

update planning_query_store.governance_component_local_definitions
set
  source_path = 'tools/planning-db/migrations/716_dbt_selection_controller_test_ownership.sql',
  source_content_sha256 = repeat(md5('SYS-WEB-CANVAS-EXECUTION-SELECTION:controller-test-ownership:716'), 2),
  revision = revision + 1
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION';

update planning_query_store.frontend_component_local_components
set
  source_path = 'tools/planning-db/migrations/716_dbt_selection_controller_test_ownership.sql',
  source_content_sha256 = md5('frontend:CanvasExecutionSelection:controller-test-ownership:716'),
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION';

do $$
declare
  mapped_test_count integer;
  duplicate_file_role_count integer;
begin
  select count(*) into mapped_test_count
  from planning_query_store.frontend_component_local_files
  where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION'
    and file_path in (
      'apps/web/src/app/views/canvas/useCanvasController.inspector.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasController.reloadHydrationGuards.test.tsx'
    )
    and source_path = 'tools/planning-db/migrations/716_dbt_selection_controller_test_ownership.sql';

  select count(*) into duplicate_file_role_count
  from (
    select file_path
    from planning_query_store.frontend_component_local_files
    where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION'
    group by file_path
    having count(*) > 1
  ) duplicates;

  if mapped_test_count <> 2 then
    raise exception 'Canvas execution-selection requires two reconciled controller tests, found %', mapped_test_count;
  end if;

  if duplicate_file_role_count <> 0 then
    raise exception 'Canvas execution-selection component has % paths with duplicate roles', duplicate_file_role_count;
  end if;
end $$;
