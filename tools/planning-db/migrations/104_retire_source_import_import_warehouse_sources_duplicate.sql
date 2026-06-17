-- Retire the local SourceImportDialog duplicate of ImportWarehouseSources.
-- The canonical active rail is the implemented warehouse source import command
-- governed by ADR-0058, the API source import use case, and the frontend
-- component rail inventory.

update planning_query_store.feature_mechanization_local_rails
set
  ddd_owner = 'web.component.canvas.SourceImportDialog',
  mechanization_status = 'closed',
  rail_status = 'retired',
  source_path = 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-coherence-prompt-20260615.md',
  source_content_sha256 = '154ff0acdea4ae3f9d998586b719e38c784ddd20d97867b5a8c2842f3373e760',
  implementation_refs = jsonb_build_array(
    'apps/api/src/application/services/importWarehouseSourcesUseCase.ts#ImportWarehouseSourcesUseCase',
    'apps/web/src/app/services/workspace/workspacePorts.api.ts#importSources'
  ),
  documentation_refs = jsonb_build_array(
    'docs/adr/ADR-0058-warehouse-source-import-rails.md#ImportWarehouseSources',
    'docs/architecture/components/web/frontend-component-inventory.md#ImportWarehouseSources'
  ),
  governing_sources = jsonb_build_array(
    'docs/architecture/command-query-rail-governance.md',
    'docs/adr/ADR-0058-warehouse-source-import-rails.md',
    'docs/architecture/components/web/frontend-component-inventory.md'
  ),
  allowed_implementation_surfaces = jsonb_build_array(
    'POST /workspace/warehouse/sources/import'
  ),
  architecture_guards = jsonb_build_array(
    'planning:db:integrity:check must report zero exact_duplicate rail_vocabulary errors'
  ),
  completion_gate = jsonb_build_array(
    'pnpm planning:db:integrity:check',
    'pnpm verify:prepush'
  ),
  raw_rail = jsonb_set(
    jsonb_set(
      jsonb_set(
        coalesce(raw_rail, '{}'::jsonb),
        '{status}',
        '"retired"'::jsonb,
        true
      ),
      '{dddOwner}',
      '"web.component.canvas.SourceImportDialog"'::jsonb,
      true
    ),
    '{retirementReason}',
    to_jsonb(
      'Duplicate of the canonical implemented ImportWarehouseSources rail governed by ADR-0058 and frontend-component-inventory.md.'::text
    ),
    true
  ),
  raw_manifest = jsonb_set(
    jsonb_set(
      coalesce(raw_manifest, '{}'::jsonb),
      '{mechanizationStatus}',
      '"closed"'::jsonb,
      true
    ),
    '{commandQueryRails}',
    jsonb_build_array(
      jsonb_build_object(
        'name',
        'ImportWarehouseSources',
        'type',
        'command',
        'status',
        'retired',
        'dddOwner',
        'web.component.canvas.SourceImportDialog'
      )
    ),
    true
  ),
  revision = greatest(revision, 1),
  updated_at = now()
where feature_id = 'CANVAS-SOURCE-IMPORT-COLUMNS-DEFAULT-20260616'
  and rail_type = 'command'
  and normalized_rail_name = 'importwarehousesources'
  and source_path in (
    'buzon/TAREA.TXT',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-coherence-prompt-20260615.md'
  );
