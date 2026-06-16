-- Retire the local SourceImportDialog duplicate of ListWarehouseConnections.
-- The canonical active rail is the documented frontend/API warehouse source
-- import rail governed by ADR-0058 and the frontend component inventory.

update planning_query_store.feature_mechanization_local_rails
set
  ddd_owner = 'web.component.canvas.SourceImportDialog',
  mechanization_status = 'closed',
  rail_status = 'retired',
  source_path = 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-coherence-prompt-20260615.md',
  source_content_sha256 = '154ff0acdea4ae3f9d998586b719e38c784ddd20d97867b5a8c2842f3373e760',
  implementation_refs = jsonb_build_array(
    'apps/api/src/application/services/listWarehouseConnectionsUseCase.ts#ListWarehouseConnectionsUseCase',
    'apps/web/src/app/services/workspace/workspacePorts.api.ts#listWarehouseConnections'
  ),
  documentation_refs = jsonb_build_array(
    'docs/architecture/components/web/frontend-component-inventory.md#ListWarehouseConnections'
  ),
  governing_sources = jsonb_build_array(
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/components/web/frontend-component-inventory.md'
  ),
  allowed_implementation_surfaces = jsonb_build_array(
    'GET /workspace/warehouse/connections'
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
      'Duplicate of the canonical documented ListWarehouseConnections rail in frontend-component-inventory.md.'::text
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
        'ListWarehouseConnections',
        'type',
        'query',
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
where feature_id = 'CANVAS-SOURCE-IMPORT-DATABASE-ONLY-FLOW-20260616'
  and rail_type = 'query'
  and normalized_rail_name = 'listwarehouseconnections'
  and source_path in (
    'buzon/TAREA.TXT',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-coherence-prompt-20260615.md'
  );
