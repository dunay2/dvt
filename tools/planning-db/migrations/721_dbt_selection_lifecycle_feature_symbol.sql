-- Reconcile the DBT visible-subset policy symbol with the existing
-- CollectCanvasExecutionSelection feature-mechanization rail.

update planning_query_store.feature_mechanization_local_rails rails
set
  symbol_refs = (
    select jsonb_agg(symbol_ref order by symbol_ref)
    from (
      select distinct value as symbol_ref
      from jsonb_array_elements_text(coalesce(rails.symbol_refs, '[]'::jsonb))
      union
      select 'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.ts#reconcileDbtExecutionSelectionVisibleSubset'
    ) normalized_symbol_refs
  ),
  implementation_refs = (
    select jsonb_agg(implementation_ref order by implementation_ref)
    from (
      select distinct value as implementation_ref
      from jsonb_array_elements_text(coalesce(rails.implementation_refs, '[]'::jsonb))
      union
      select 'tools/planning-db/migrations/721_dbt_selection_lifecycle_feature_symbol.sql'
    ) normalized_implementation_refs
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(surface order by surface)
    from (
      select distinct value as surface
      from jsonb_array_elements_text(coalesce(rails.allowed_implementation_surfaces, '[]'::jsonb))
      union
      select 'tools/planning-db/migrations/721_dbt_selection_lifecycle_feature_symbol.sql'
    ) normalized_surfaces
  ),
  raw_manifest = jsonb_set(
    jsonb_set(
      rails.raw_manifest,
      '{symbols}',
      coalesce(
        (
          select jsonb_agg(symbol order by symbol ->> 'path', symbol ->> 'name')
          from (
            select existing as symbol
            from jsonb_array_elements(
              coalesce(rails.raw_manifest -> 'symbols', '[]'::jsonb)
            ) symbols(existing)
            where not (
              existing ->> 'path' = 'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.ts'
              and existing ->> 'name' = 'reconcileDbtExecutionSelectionVisibleSubset'
            )
            union all
            select jsonb_build_object(
              'name', 'reconcileDbtExecutionSelectionVisibleSubset',
              'path', 'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.ts',
              'dddOwner', 'CanvasExecutionSelection',
              'cqRails', jsonb_build_array('CollectCanvasExecutionSelection'),
              'fowlerSignals', jsonb_build_array('boundary drift'),
              'architectureGuard', 'canvasExecutionSelection.architecture.test.ts',
              'cypressCoverage', 'dbt-project-preview-run-live.cy.ts',
              'unitTests', jsonb_build_array(
                'dbtExecutionScopePolicy.test.ts',
                'useCanvasController.draftLifecycle.scopeAndProjection.test.tsx'
              )
            )
          ) normalized_symbols
        ),
        '[]'::jsonb
      ),
      true
    ),
    '{allowedImplementationSurfaces}',
    (
      select jsonb_agg(surface order by surface)
      from (
        select distinct value as surface
        from jsonb_array_elements_text(
          coalesce(rails.raw_manifest -> 'allowedImplementationSurfaces', '[]'::jsonb)
        )
        union
        select 'tools/planning-db/migrations/721_dbt_selection_lifecycle_feature_symbol.sql'
      ) normalized_manifest_surfaces
    ),
    true
  ),
  source_path = 'tools/planning-db/migrations/721_dbt_selection_lifecycle_feature_symbol.sql',
  source_content_sha256 = repeat(md5('CollectCanvasExecutionSelection:lifecycle-feature-symbol:721'), 2),
  revision = rails.revision + 1,
  updated_at = now()
where rail_id = 'local#E-DBT-PROJECT-ROUNDTRIP-1#query#collectcanvasexecutionselection#fail-closed';

do $$
declare
  relational_symbol_count integer;
  manifest_symbol_count integer;
begin
  select count(*) into relational_symbol_count
  from planning_query_store.feature_mechanization_local_rails rails,
    jsonb_array_elements_text(rails.symbol_refs) symbol_ref
  where rails.rail_id = 'local#E-DBT-PROJECT-ROUNDTRIP-1#query#collectcanvasexecutionselection#fail-closed'
    and symbol_ref = 'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.ts#reconcileDbtExecutionSelectionVisibleSubset';

  select count(*) into manifest_symbol_count
  from planning_query_store.feature_mechanization_local_rails rails,
    jsonb_array_elements(rails.raw_manifest -> 'symbols') symbol
  where rails.rail_id = 'local#E-DBT-PROJECT-ROUNDTRIP-1#query#collectcanvasexecutionselection#fail-closed'
    and symbol ->> 'path' = 'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.ts'
    and symbol ->> 'name' = 'reconcileDbtExecutionSelectionVisibleSubset'
    and coalesce(symbol -> 'cqRails', '[]'::jsonb) ? 'CollectCanvasExecutionSelection';

  if relational_symbol_count <> 1 then
    raise exception 'DBT lifecycle visible-subset policy requires one relational symbol ref, found %', relational_symbol_count;
  end if;

  if manifest_symbol_count <> 1 then
    raise exception 'DBT lifecycle visible-subset policy requires one canonical manifest symbol, found %', manifest_symbol_count;
  end if;
end $$;
