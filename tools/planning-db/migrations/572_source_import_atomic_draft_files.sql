-- DB-first correction for ImportWarehouseSources atomicity evidence.
-- The command rail already owns the use case. This migration records the
-- fail-closed behavior that prevents graph draft acceptance when source YAML
-- persistence fails, without creating a parallel Source Import command.

with command_rail as (
  select 'local#E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1#command#importwarehousesources'::text as rail_id
),
atomicity_symbol as (
  select jsonb_build_object(
    'name', 'ImportWarehouseSourcesUseCase.execute',
    'path', 'apps/api/src/application/services/importWarehouseSourcesUseCase.ts',
    'dddOwner', 'api.component.warehouseSourceImport.ImportWarehouseSourcesUseCase',
    'cqRails', jsonb_build_array('ImportWarehouseSources'),
    'fowlerSignals', jsonb_build_array(
      'application_service',
      'fail_closed_boundary',
      'hidden_authority_removed'
    ),
    'architectureGuard', 'apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts',
    'cypressCoverage', 'not_applicable: application command atomicity is covered by package-level negative test',
    'unitTests', jsonb_build_array(
      'apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts'
    )
  ) as value
),
atomicity_red_green as (
  select jsonb_build_object(
    'id', 'SOURCE-IMPORT-ATOMICITY-001',
    'redTest', 'pnpm --filter dvt-api test -- test/application/services/ImportWarehouseSourcesUseCase.test.ts',
    'expectedFailure', 'ImportWarehouseSources saved the graph draft before failing source YAML persistence.',
    'patchSurfaces', jsonb_build_array(
      'apps/api/src/application/services/importWarehouseSourcesUseCase.ts'
    ),
    'greenTest', 'pnpm --filter dvt-api test -- test/application/services/ImportWarehouseSourcesUseCase.test.ts'
  ) as value
)
update planning_query_store.feature_mechanization_local_rails rails
set
  symbol_refs = case
    when rails.symbol_refs @> jsonb_build_array(
      'apps/api/src/application/services/importWarehouseSourcesUseCase.ts#ImportWarehouseSourcesUseCase.execute'
    ) then rails.symbol_refs
    else rails.symbol_refs || jsonb_build_array(
      'apps/api/src/application/services/importWarehouseSourcesUseCase.ts#ImportWarehouseSourcesUseCase.execute'
    )
  end,
  implementation_refs = case
    when rails.implementation_refs @> jsonb_build_array(
      'apps/api/src/application/services/importWarehouseSourcesUseCase.ts'
    ) then rails.implementation_refs
    else rails.implementation_refs || jsonb_build_array(
      'apps/api/src/application/services/importWarehouseSourcesUseCase.ts'
    )
  end,
  allowed_implementation_surfaces = case
    when rails.allowed_implementation_surfaces @> jsonb_build_array(
      'apps/api/src/application/services/importWarehouseSourcesUseCase.ts'
    ) then rails.allowed_implementation_surfaces
    else rails.allowed_implementation_surfaces || jsonb_build_array(
      'apps/api/src/application/services/importWarehouseSourcesUseCase.ts'
    )
  end,
  architecture_guards = case
    when rails.architecture_guards @> jsonb_build_array(
      'apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts'
    ) then rails.architecture_guards
    else rails.architecture_guards || jsonb_build_array(
      'apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts'
    )
  end,
  completion_gate = jsonb_set(
    rails.completion_gate,
    '{tests}',
    case
      when coalesce(rails.completion_gate -> 'tests', '[]'::jsonb) @> jsonb_build_array(
        'pnpm --filter dvt-api test -- test/application/services/ImportWarehouseSourcesUseCase.test.ts'
      ) then coalesce(rails.completion_gate -> 'tests', '[]'::jsonb)
      else coalesce(rails.completion_gate -> 'tests', '[]'::jsonb) || jsonb_build_array(
        'pnpm --filter dvt-api test -- test/application/services/ImportWarehouseSourcesUseCase.test.ts'
      )
    end,
    true
  ),
  raw_rail = coalesce(rails.raw_rail, '{}'::jsonb)
    || jsonb_build_object(
      'atomicityPolicy', 'source_yaml_persistence_must_succeed_before_graph_draft_acceptance',
      'atomicityEvidence', 'apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts#does not accept the draft mutation when source YAML persistence fails'
    ),
  raw_manifest = jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            coalesce(rails.raw_manifest, '{}'::jsonb),
            '{allowedImplementationSurfaces}',
            case
              when coalesce(rails.raw_manifest -> 'allowedImplementationSurfaces', '[]'::jsonb) @> jsonb_build_array(
                'apps/api/src/application/services/importWarehouseSourcesUseCase.ts'
              ) then coalesce(rails.raw_manifest -> 'allowedImplementationSurfaces', '[]'::jsonb)
              else coalesce(rails.raw_manifest -> 'allowedImplementationSurfaces', '[]'::jsonb) || jsonb_build_array(
                'apps/api/src/application/services/importWarehouseSourcesUseCase.ts'
              )
            end,
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
        '{completionGate}',
        case
          when coalesce(rails.raw_manifest -> 'completionGate', '[]'::jsonb) @> jsonb_build_array(
            'pnpm --filter dvt-api test -- test/application/services/ImportWarehouseSourcesUseCase.test.ts'
          ) then coalesce(rails.raw_manifest -> 'completionGate', '[]'::jsonb)
          else coalesce(rails.raw_manifest -> 'completionGate', '[]'::jsonb) || jsonb_build_array(
            'pnpm --filter dvt-api test -- test/application/services/ImportWarehouseSourcesUseCase.test.ts'
          )
        end,
        true
      ),
      '{symbols}',
      case
        when coalesce(rails.raw_manifest -> 'symbols', '[]'::jsonb) @> jsonb_build_array(
          jsonb_build_object(
            'name', 'ImportWarehouseSourcesUseCase.execute',
            'path', 'apps/api/src/application/services/importWarehouseSourcesUseCase.ts'
          )
        ) then coalesce(rails.raw_manifest -> 'symbols', '[]'::jsonb)
        else coalesce(rails.raw_manifest -> 'symbols', '[]'::jsonb) || jsonb_build_array(atomicity_symbol.value)
      end,
      true
    ),
    '{redGreenCycles}',
    case
      when coalesce(rails.raw_manifest -> 'redGreenCycles', '[]'::jsonb) @> jsonb_build_array(
        jsonb_build_object('id', 'SOURCE-IMPORT-ATOMICITY-001')
      ) then coalesce(rails.raw_manifest -> 'redGreenCycles', '[]'::jsonb)
      else coalesce(rails.raw_manifest -> 'redGreenCycles', '[]'::jsonb) || jsonb_build_array(atomicity_red_green.value)
    end,
    true
  ),
  source_path = 'tools/planning-db/migrations/572_source_import_atomic_draft_files.sql',
  source_content_sha256 = md5('E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1:source-import-atomic-draft-files:572'),
  revision = rails.revision + 1,
  updated_at = now()
from command_rail, atomicity_symbol, atomicity_red_green
where rails.rail_id = command_rail.rail_id;
