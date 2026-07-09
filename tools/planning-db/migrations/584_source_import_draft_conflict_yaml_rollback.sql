-- Close the remaining ImportWarehouseSources atomicity gap: source YAML writes
-- are rolled back when the authoritative graph draft save is rejected.
-- This updates the existing command rail evidence; it does not create a
-- parallel Source Import command.

with command_rail as (
  select 'local#E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1#command#importwarehousesources'::text as rail_id
),
rollback_symbol as (
  select jsonb_build_object(
    'name', 'ImportWarehouseSourcesUseCase.rollbackSourceYamlUpdates',
    'path', 'apps/api/src/application/services/importWarehouseSourcesUseCase.ts',
    'dddOwner', 'api.component.warehouseSourceImport.ImportWarehouseSourcesUseCase',
    'cqRails', jsonb_build_array('ImportWarehouseSources'),
    'fowlerSignals', jsonb_build_array(
      'application_service_compensation',
      'fail_closed_boundary',
      'cross_resource_atomicity_guard'
    ),
    'architectureGuard', 'apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts',
    'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
    'unitTests', jsonb_build_array(
      'apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts'
    )
  ) as value
),
rollback_port_symbol as (
  select jsonb_build_object(
    'name', 'IWorkspaceFileRepository.deleteFileContent',
    'path', 'apps/api/src/application/ports/workspaceFiles.ts',
    'dddOwner', 'api.component.workspaceFiles.WorkspaceFileRepository',
    'cqRails', jsonb_build_array('ImportWarehouseSources'),
    'fowlerSignals', jsonb_build_array(
      'port_explicit_compensation_boundary',
      'fail_closed_boundary'
    ),
    'architectureGuard', 'apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts',
    'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
    'unitTests', jsonb_build_array(
      'apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts',
      'apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.test.ts'
    )
  ) as value
),
rollback_cycle as (
  select jsonb_build_object(
    'id', 'SOURCE-IMPORT-ATOMICITY-002',
    'redTest', 'pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/application/services/importWarehouseSourcesUseCase.test.ts -t "does not persist source YAML when the authoritative draft changed before save"',
    'expectedFailure', 'ImportWarehouseSources wrote models/sources/src_erp.yml and returned draft conflict without deleting the newly written YAML.',
    'patchSurfaces', jsonb_build_array(
      'apps/api/src/application/ports/workspaceFiles.ts',
      'apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts',
      'apps/api/src/application/services/importWarehouseSourcesUseCase.ts',
      'apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts',
      'apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts',
      'apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.test.ts'
    ),
    'greenTest', 'pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/application/services/importWarehouseSourcesUseCase.test.ts'
  ) as value
)
update planning_query_store.feature_mechanization_local_rails rails
set
  symbol_refs = case
    when rails.symbol_refs @> jsonb_build_array(
      'apps/api/src/application/services/importWarehouseSourcesUseCase.ts#ImportWarehouseSourcesUseCase.rollbackSourceYamlUpdates'
    ) then rails.symbol_refs
    else rails.symbol_refs || jsonb_build_array(
      'apps/api/src/application/services/importWarehouseSourcesUseCase.ts#ImportWarehouseSourcesUseCase.rollbackSourceYamlUpdates'
    )
  end,
  implementation_refs = (
    select jsonb_agg(distinct ref order by ref)
    from jsonb_array_elements_text(
      coalesce(rails.implementation_refs, '[]'::jsonb) || jsonb_build_array(
        'apps/api/src/application/ports/workspaceFiles.ts',
        'apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts',
        'apps/api/src/application/services/importWarehouseSourcesUseCase.ts',
        'apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts',
        'apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts',
        'apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.test.ts',
        'tools/planning-db/migrations/584_source_import_draft_conflict_yaml_rollback.sql'
      )
    ) as refs(ref)
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct ref order by ref)
    from jsonb_array_elements_text(
      coalesce(rails.allowed_implementation_surfaces, '[]'::jsonb) || jsonb_build_array(
        'apps/api/src/application/ports/workspaceFiles.ts',
        'apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts',
        'apps/api/src/application/services/importWarehouseSourcesUseCase.ts',
        'apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts',
        'apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts',
        'apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.test.ts',
        'tools/planning-db/migrations/584_source_import_draft_conflict_yaml_rollback.sql'
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
      'atomicityPolicy', 'source_yaml_writes_are_compensated_when_graph_draft_save_is_rejected',
      'atomicityEvidence', 'apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts#does not persist source YAML when the authoritative draft changed before save',
      'rollbackPort', 'IWorkspaceFileRepository.deleteFileContent'
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
                'apps/api/src/application/ports/workspaceFiles.ts',
                'apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts',
                'apps/api/src/application/services/importWarehouseSourcesUseCase.ts',
                'apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts',
                'apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts',
                'apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.test.ts',
                'tools/planning-db/migrations/584_source_import_draft_conflict_yaml_rollback.sql'
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
      coalesce(rails.raw_manifest -> 'symbols', '[]'::jsonb)
        || jsonb_build_array(rollback_symbol.value, rollback_port_symbol.value),
      true
    ),
    '{redGreenCycles}',
    coalesce(rails.raw_manifest -> 'redGreenCycles', '[]'::jsonb) || jsonb_build_array(rollback_cycle.value),
    true
  ),
  source_path = 'tools/planning-db/migrations/584_source_import_draft_conflict_yaml_rollback.sql',
  source_content_sha256 = md5('E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1:source-import-draft-conflict-yaml-rollback:584'),
  revision = rails.revision + 1,
  updated_at = now()
from command_rail, rollback_symbol, rollback_port_symbol, rollback_cycle
where rails.rail_id = command_rail.rail_id;
