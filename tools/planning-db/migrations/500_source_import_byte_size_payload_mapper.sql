-- DB-first correction for the Source Import byte-size rail.
-- The existing E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1 rail already owns
-- WarehouseTable.byteSize, but the web command payload mapper was not
-- recorded as evidence. This migration keeps the existing rail and adds the
-- SourceImportDialog controller symbol/test that preserves byteSize before the
-- ImportWarehouseSources command crosses the port boundary.

with command_rail as (
  select 'local#E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1#command#importwarehousesources'::text as rail_id
),
payload_symbol as (
  select jsonb_build_object(
    'name', 'useSourceImportWizard',
    'path', 'apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts',
    'dddOwner', 'web.component.canvas.SourceImportDialog',
    'cqRails', jsonb_build_array('ImportWarehouseSources'),
    'fowlerSignals', jsonb_build_array(
      'application_controller',
      'explicit_interface',
      'single_source_of_truth'
    ),
    'architectureGuard', 'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx',
    'cypressCoverage', 'not_applicable: command payload metadata preservation is covered by presentation-port integration test',
    'unitTests', jsonb_build_array(
      'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx'
    )
  ) as value
),
payload_red_green as (
  select jsonb_build_object(
    'id', 'SOURCE-IMPORT-BYTE-SIZE-WEB-PAYLOAD-001',
    'redTest', 'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/SourceImportWizard.metadata.test.tsx',
    'expectedFailure', 'SourceImportWizard selected-table mapper omitted WarehouseTable.byteSize from ImportWarehouseSources payload.',
    'patchSurfaces', jsonb_build_array(
      'apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts'
    ),
    'greenTest', 'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/SourceImportWizard.metadata.test.tsx'
  ) as value
)
update planning_query_store.feature_mechanization_local_rails rails
set
  symbol_refs = case
    when rails.symbol_refs @> jsonb_build_array(
      'apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts#useSourceImportWizard'
    ) then rails.symbol_refs
    else rails.symbol_refs || jsonb_build_array(
      'apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts#useSourceImportWizard'
    )
  end,
  implementation_refs = case
    when rails.implementation_refs @> jsonb_build_array(
      'apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts'
    ) then rails.implementation_refs
    else rails.implementation_refs || jsonb_build_array(
      'apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts'
    )
  end,
  allowed_implementation_surfaces = case
    when rails.allowed_implementation_surfaces @> jsonb_build_array(
      'apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts'
    ) then rails.allowed_implementation_surfaces
    else rails.allowed_implementation_surfaces || jsonb_build_array(
      'apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts'
    )
  end,
  architecture_guards = case
    when rails.architecture_guards @> jsonb_build_array(
      'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx'
    ) then rails.architecture_guards
    else rails.architecture_guards || jsonb_build_array(
      'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx'
    )
  end,
  completion_gate = jsonb_set(
    rails.completion_gate,
    '{tests}',
    case
      when coalesce(rails.completion_gate -> 'tests', '[]'::jsonb) @> jsonb_build_array(
        'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/SourceImportWizard.metadata.test.tsx'
      ) then coalesce(rails.completion_gate -> 'tests', '[]'::jsonb)
      else coalesce(rails.completion_gate -> 'tests', '[]'::jsonb) || jsonb_build_array(
        'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/SourceImportWizard.metadata.test.tsx'
      )
    end,
    true
  ),
  raw_manifest = jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            rails.raw_manifest,
            '{allowedImplementationSurfaces}',
            case
              when coalesce(rails.raw_manifest -> 'allowedImplementationSurfaces', '[]'::jsonb) @> jsonb_build_array(
                'apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts'
              ) then coalesce(rails.raw_manifest -> 'allowedImplementationSurfaces', '[]'::jsonb)
              else coalesce(rails.raw_manifest -> 'allowedImplementationSurfaces', '[]'::jsonb) || jsonb_build_array(
                'apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts'
              )
            end,
            true
          ),
          '{architectureGuards}',
          case
            when coalesce(rails.raw_manifest -> 'architectureGuards', '[]'::jsonb) @> jsonb_build_array(
              'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx'
            ) then coalesce(rails.raw_manifest -> 'architectureGuards', '[]'::jsonb)
            else coalesce(rails.raw_manifest -> 'architectureGuards', '[]'::jsonb) || jsonb_build_array(
              'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx'
            )
          end,
          true
        ),
        '{completionGate}',
        case
          when coalesce(rails.raw_manifest -> 'completionGate', '[]'::jsonb) @> jsonb_build_array(
            'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/SourceImportWizard.metadata.test.tsx'
          ) then coalesce(rails.raw_manifest -> 'completionGate', '[]'::jsonb)
          else coalesce(rails.raw_manifest -> 'completionGate', '[]'::jsonb) || jsonb_build_array(
            'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/SourceImportWizard.metadata.test.tsx'
          )
        end,
        true
      ),
      '{symbols}',
      case
        when coalesce(rails.raw_manifest -> 'symbols', '[]'::jsonb) @> jsonb_build_array(
          jsonb_build_object(
            'name', 'useSourceImportWizard',
            'path', 'apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts'
          )
        ) then coalesce(rails.raw_manifest -> 'symbols', '[]'::jsonb)
        else coalesce(rails.raw_manifest -> 'symbols', '[]'::jsonb) || jsonb_build_array(payload_symbol.value)
      end,
      true
    ),
    '{redGreenCycles}',
    case
      when coalesce(rails.raw_manifest -> 'redGreenCycles', '[]'::jsonb) @> jsonb_build_array(
        jsonb_build_object('id', 'SOURCE-IMPORT-BYTE-SIZE-WEB-PAYLOAD-001')
      ) then coalesce(rails.raw_manifest -> 'redGreenCycles', '[]'::jsonb)
      else coalesce(rails.raw_manifest -> 'redGreenCycles', '[]'::jsonb) || jsonb_build_array(payload_red_green.value)
    end,
    true
  ),
  source_content_sha256 = md5('E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1:web-payload-mapper:500'),
  revision = rails.revision + 1,
  updated_at = now()
from command_rail, payload_symbol, payload_red_green
where rails.rail_id = command_rail.rail_id;

insert into planning_query_store.frontend_component_validation_evidence (
  component_id,
  evidence_id,
  evidence_kind,
  evidence_status,
  evidence_ref,
  rail_name,
  context_id,
  proves,
  raw_evidence,
  source_path,
  source_content_sha256
)
values (
  'web.component.canvas.SourceImportDialog',
  'EV-SOURCE-IMPORT-BYTE-SIZE-PAYLOAD-MAPPER',
  'presentation-test',
  'current',
  'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx',
  'ImportWarehouseSources',
  'source-import-byte-size-command-payload',
  'Source Import selected-table mapper preserves WarehouseTable.byteSize in the ImportWarehouseSources command payload.',
  jsonb_build_object(
    'redGreen', true,
    'testName', 'preserves selected table byte size in the import command payload',
    'source', 'WarehouseTable.byteSize',
    'owner', 'web.component.canvas.SourceImportDialog',
    'rail', 'ImportWarehouseSources'
  ),
  'tools/planning-db/migrations/500_source_import_byte_size_payload_mapper.sql',
  md5('evidence:SourceImportDialog:byteSizePayloadMapper:500')
)
on conflict (component_id, evidence_id) do update set
  evidence_status = excluded.evidence_status,
  evidence_ref = excluded.evidence_ref,
  rail_name = excluded.rail_name,
  context_id = excluded.context_id,
  proves = excluded.proves,
  raw_evidence = excluded.raw_evidence,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();
