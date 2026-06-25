-- Extend the DB-local materialized projection feature manifest with the
-- component tree refresh helper. Component profile reads traverse the component
-- hierarchy frequently, so the tree projection must be refreshed during
-- governance import and declared in feature mechanization from the DB.

with target as (
  select
    rail_id,
    coalesce(symbol_refs, '[]'::jsonb) as symbol_refs,
    coalesce(implementation_refs, '[]'::jsonb) as implementation_refs,
    coalesce(allowed_implementation_surfaces, '[]'::jsonb) as allowed_surfaces,
    coalesce(architecture_guards, '[]'::jsonb) as architecture_guards,
    coalesce(completion_gate, '[]'::jsonb) as completion_gate,
    coalesce(raw_manifest, '{}'::jsonb) as manifest
  from planning_query_store.feature_mechanization_local_rails
  where feature_id = 'PLANNING-DB-CODE-SYMBOL-DUPLICATE-QUERY-PERF-20260625'
    and rail_name = 'RefreshCodeSymbolDuplicateProjection'
  limit 1
),
patch as (
  select
    target.*,
    (
      select jsonb_agg(value order by value)
      from (
        select distinct value
        from jsonb_array_elements_text(
          target.symbol_refs || jsonb_build_array(
            'scripts/planning-db-import.cjs#refreshComponentTreeMaterializedProjection',
            'tools/planning-db/migrations/280_component_tree_priority_projection.sql#component_engineering_component_tree_projection',
            'tools/planning-db/migrations/280_component_tree_priority_projection.sql#component_engineering_component_tree_query',
            'tools/planning-db/migrations/280_component_tree_priority_projection.sql#component_tree_query'
          )
        ) as symbol_value(value)
      ) values
    ) as next_symbol_refs,
    (
      select jsonb_agg(value order by value)
      from (
        select distinct value
        from jsonb_array_elements_text(
          target.implementation_refs || jsonb_build_array(
            'scripts/planning-db-import.cjs',
            'scripts/planning-db-import.test.cjs',
            'scripts/planning-db-migrate.test.cjs',
            'tools/planning-db/migrations/280_component_tree_priority_projection.sql',
            'tools/planning-db/migrations/281_register_component_tree_projection_refresh_feature.sql'
          )
        ) as implementation_value(value)
      ) values
    ) as next_implementation_refs,
    (
      select jsonb_agg(value order by value)
      from (
        select distinct value
        from jsonb_array_elements_text(
          target.allowed_surfaces || jsonb_build_array(
            'scripts/planning-db-import.cjs',
            'scripts/planning-db-import.test.cjs',
            'scripts/planning-db-migrate.test.cjs',
            'tools/planning-db/migrations/280_component_tree_priority_projection.sql',
            'tools/planning-db/migrations/281_register_component_tree_projection_refresh_feature.sql'
          )
        ) as surface_value(value)
      ) values
    ) as next_allowed_surfaces,
    (
      select jsonb_agg(value order by value)
      from (
        select distinct value
        from jsonb_array_elements_text(
          target.architecture_guards || jsonb_build_array(
            'scripts/planning-db-import.test.cjs',
            'scripts/planning-db-migrate.test.cjs',
            'pnpm docs:feature-mechanization:implementation',
            'pnpm planning:db:integrity:check'
          )
        ) as guard_value(value)
      ) values
    ) as next_architecture_guards,
    (
      select jsonb_agg(value order by value)
      from (
        select distinct value
        from jsonb_array_elements_text(
          target.completion_gate || jsonb_build_array(
            'pnpm planning:db:migrate',
            'pnpm governance:db:import',
            'node --test scripts/planning-db-import.test.cjs',
            'node --test scripts/planning-db-migrate.test.cjs',
            'node --test scripts/planning-db-query.test.cjs',
            'pnpm docs:feature-mechanization:implementation',
            'pnpm planning:db:integrity:check',
            'pnpm verify:prepush'
          )
        ) as gate_value(value)
      ) values
    ) as next_completion_gate
  from target
),
manifest_patch as (
  select
    patch.*,
    case
      when exists (
        select 1
        from jsonb_array_elements(coalesce(patch.manifest->'symbols', '[]'::jsonb)) symbol
        where symbol->>'name' = 'refreshComponentTreeMaterializedProjection'
      ) then coalesce(patch.manifest->'symbols', '[]'::jsonb)
      else coalesce(patch.manifest->'symbols', '[]'::jsonb) || jsonb_build_array(
        jsonb_build_object(
          'name', 'refreshComponentTreeMaterializedProjection',
          'path', 'scripts/planning-db-import.cjs',
          'dddOwner', 'PlanningDbComponentTreeReadModel',
          'cqRails', jsonb_build_array('RefreshComponentTreeProjection'),
          'fowlerSignals', jsonb_build_array('slow_query_projection', 'component_profile_query'),
          'architectureGuard', 'scripts/planning-db-import.test.cjs',
          'cypressCoverage', 'not_applicable:planning_db_import',
          'unitTests', jsonb_build_array('node --test scripts/planning-db-import.test.cjs')
        )
      )
    end as next_symbols,
    coalesce(patch.manifest->'redGreenCycles', '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'id', 'refresh-materialized-component-tree-after-import',
        'redTest',
        'node --test --test-name-pattern "planning DB import refreshes the materialized component tree projection" scripts/planning-db-import.test.cjs',
        'expectedFailure',
        'Governance import updates component hierarchy inputs without refreshing the materialized component tree projection used by component profile reads.',
        'patchSurfaces', jsonb_build_array(
          'scripts/planning-db-import.cjs',
          'scripts/planning-db-import.test.cjs',
          'tools/planning-db/migrations/280_component_tree_priority_projection.sql',
          'tools/planning-db/migrations/281_register_component_tree_projection_refresh_feature.sql'
        ),
        'greenTest',
        'node --test --test-name-pattern "planning DB import refreshes the materialized component tree projection" scripts/planning-db-import.test.cjs'
      )
    ) as next_red_green_cycles
  from patch
)
update planning_query_store.feature_mechanization_local_rails rail
set
  symbol_refs = manifest_patch.next_symbol_refs,
  implementation_refs = manifest_patch.next_implementation_refs,
  allowed_implementation_surfaces = manifest_patch.next_allowed_surfaces,
  architecture_guards = manifest_patch.next_architecture_guards,
  completion_gate = manifest_patch.next_completion_gate,
  source_path = 'tools/planning-db/migrations/281_register_component_tree_projection_refresh_feature.sql',
  source_content_sha256 = coalesce(
    (
      select file_ref.content_hash
      from planning_query_store.governance_files file_ref
      where file_ref.path =
        'tools/planning-db/migrations/281_register_component_tree_projection_refresh_feature.sql'
    ),
    repeat('0', 64)
  ),
  raw_manifest =
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              manifest_patch.manifest || jsonb_build_object(
                'implementationPlan',
                'Planning DB materialized diagnostics refresh code-symbol, component file-ownership, component rule-evaluation, and component tree projections during governance import so priority profile reads do not recompute hierarchy or local ownership work.',
                'componentTreeProjectionRegisteredBy',
                '281_register_component_tree_projection_refresh_feature'
              ),
              '{allowedImplementationSurfaces}',
              manifest_patch.next_allowed_surfaces,
              true
            ),
            '{architectureGuards}',
            manifest_patch.next_architecture_guards,
            true
          ),
          '{completionGate}',
          manifest_patch.next_completion_gate,
          true
        ),
        '{symbols}',
        manifest_patch.next_symbols,
        true
      ),
      '{redGreenCycles}',
      manifest_patch.next_red_green_cycles,
      true
    ),
  raw_rail = coalesce(raw_rail, '{}'::jsonb) || jsonb_build_object(
    'componentTreeProjectionRegisteredBy',
    '281_register_component_tree_projection_refresh_feature'
  ),
  revision = rail.revision + 1,
  updated_at = now()
from manifest_patch
where rail.rail_id = manifest_patch.rail_id;
