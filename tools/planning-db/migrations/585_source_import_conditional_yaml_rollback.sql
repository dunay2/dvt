-- Harden ImportWarehouseSources YAML rollback against concurrent winners on the
-- same source YAML path. This extends the existing command rail evidence
-- without creating a parallel Source Import command.

with command_rail as (
  select 'local#E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1#command#importwarehousesources'::text as rail_id
),
current_content_symbol as (
  select jsonb_build_object(
    'name', 'ImportWarehouseSourcesUseCase.readCurrentSourceYamlContent',
    'path', 'apps/api/src/application/services/importWarehouseSourcesUseCase.ts',
    'dddOwner', 'api.component.warehouseSourceImport.ImportWarehouseSourcesUseCase',
    'cqRails', jsonb_build_array('ImportWarehouseSources'),
    'fowlerSignals', jsonb_build_array(
      'application_service_compensation',
      'fail_closed_boundary',
      'concurrent_write_guard'
    ),
    'architectureGuard', 'apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts',
    'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
    'unitTests', jsonb_build_array(
      'apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts'
    )
  ) as value
),
concurrent_rollback_cycle as (
  select jsonb_build_object(
    'id', 'SOURCE-IMPORT-ATOMICITY-003',
    'redTest', 'pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/application/services/importWarehouseSourcesUseCase.test.ts -t "does not roll back source YAML replaced by a concurrent winning import"',
    'expectedFailure', 'ImportWarehouseSources deleted models/sources/src_erp.yml even after another import replaced the failed request content before the draft conflict returned.',
    'patchSurfaces', jsonb_build_array(
      'apps/api/src/application/services/importWarehouseSourcesUseCase.ts',
      'apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts',
      'tools/planning-db/migrations/585_source_import_conditional_yaml_rollback.sql'
    ),
    'greenTest', 'pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/application/services/importWarehouseSourcesUseCase.test.ts'
  ) as value
)
update planning_query_store.feature_mechanization_local_rails rails
set
  symbol_refs = (
    select jsonb_agg(distinct ref order by ref)
    from jsonb_array_elements_text(
      coalesce(rails.symbol_refs, '[]'::jsonb) || jsonb_build_array(
        'apps/api/src/application/services/importWarehouseSourcesUseCase.ts#ImportWarehouseSourcesUseCase.readCurrentSourceYamlContent'
      )
    ) as refs(ref)
  ),
  implementation_refs = (
    select jsonb_agg(distinct ref order by ref)
    from jsonb_array_elements_text(
      coalesce(rails.implementation_refs, '[]'::jsonb) || jsonb_build_array(
        'apps/api/src/application/services/importWarehouseSourcesUseCase.ts',
        'apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts',
        'tools/planning-db/migrations/585_source_import_conditional_yaml_rollback.sql'
      )
    ) as refs(ref)
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct ref order by ref)
    from jsonb_array_elements_text(
      coalesce(rails.allowed_implementation_surfaces, '[]'::jsonb) || jsonb_build_array(
        'apps/api/src/application/services/importWarehouseSourcesUseCase.ts',
        'apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts',
        'tools/planning-db/migrations/585_source_import_conditional_yaml_rollback.sql'
      )
    ) as refs(ref)
  ),
  architecture_guards = case
    when rails.architecture_guards @> jsonb_build_array(
      'apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts'
    ) then rails.architecture_guards
    else rails.architecture_guards || jsonb_build_array(
      'apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts'
    )
  end,
  raw_rail = coalesce(rails.raw_rail, '{}'::jsonb)
    || jsonb_build_object(
      'atomicityPolicy', 'source_yaml_writes_are_compensated_only_when_current_content_matches_failed_write',
      'atomicityEvidence', jsonb_build_array(
        'apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts#does not persist source YAML when the authoritative draft changed before save',
        'apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts#does not roll back source YAML replaced by a concurrent winning import'
      ),
      'rollbackReadGuard', 'ImportWarehouseSourcesUseCase.readCurrentSourceYamlContent'
    ),
  raw_manifest = jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          coalesce(rails.raw_manifest, '{}'::jsonb),
          '{allowedImplementationSurfaces}',
          (
            select jsonb_agg(distinct ref order by ref)
            from jsonb_array_elements_text(
              coalesce(rails.raw_manifest -> 'allowedImplementationSurfaces', '[]'::jsonb)
              || jsonb_build_array(
                'apps/api/src/application/services/importWarehouseSourcesUseCase.ts',
                'apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts',
                'tools/planning-db/migrations/585_source_import_conditional_yaml_rollback.sql'
              )
            ) as refs(ref)
          ),
          true
        ),
        '{architectureGuards}',
        case
          when coalesce(rails.raw_manifest -> 'architectureGuards', '[]'::jsonb) @> jsonb_build_array(
            'apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts'
          ) then coalesce(rails.raw_manifest -> 'architectureGuards', '[]'::jsonb)
          else coalesce(rails.raw_manifest -> 'architectureGuards', '[]'::jsonb) || jsonb_build_array(
            'apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts'
          )
        end,
        true
      ),
      '{symbols}',
      (
        select coalesce(jsonb_agg(symbol), '[]'::jsonb) || jsonb_build_array(current_content_symbol.value)
        from jsonb_array_elements(coalesce(rails.raw_manifest -> 'symbols', '[]'::jsonb)) as existing(symbol)
        where symbol ->> 'name' <> 'ImportWarehouseSourcesUseCase.readCurrentSourceYamlContent'
      ),
      true
    ),
    '{redGreenCycles}',
    (
      select coalesce(jsonb_agg(cycle), '[]'::jsonb) || jsonb_build_array(concurrent_rollback_cycle.value)
      from jsonb_array_elements(coalesce(rails.raw_manifest -> 'redGreenCycles', '[]'::jsonb)) as existing(cycle)
      where cycle ->> 'id' <> 'SOURCE-IMPORT-ATOMICITY-003'
    ),
    true
  ),
  source_path = 'tools/planning-db/migrations/585_source_import_conditional_yaml_rollback.sql',
  source_content_sha256 = md5('E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1:source-import-conditional-yaml-rollback:585'),
  revision = rails.revision + 1,
  updated_at = now()
from command_rail, current_content_symbol, concurrent_rollback_cycle
where rails.rail_id = command_rail.rail_id;
