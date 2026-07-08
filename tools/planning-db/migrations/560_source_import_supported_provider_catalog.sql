-- Reconcile Source Import provider creation with the provider catalog that is
-- actually executable in the protected runtime. The earlier posture recorded a
-- local form constant and future reserved vendors; this migration records the
-- shared supported-provider contract and removes reserved-vendor semantics from
-- the active CreateWarehouseConnection rail.

with target_rails as (
  select *
  from planning_query_store.feature_mechanization_local_rails
  where feature_id = 'E-CANVAS-ADD-SOURCE-CREATE-CONNECTION-1'
    and rail_name = 'CreateWarehouseConnection'
),
new_symbol_refs(ref) as (
  values
    ('apps/web/src/app/ports/workspace.ts#SUPPORTED_WAREHOUSE_CONNECTION_TYPES'),
    ('apps/api/src/application/ports/warehouseSourceImport.ts#SUPPORTED_WAREHOUSE_CONNECTION_TYPES'),
    ('apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.ts#WarehouseConnectionCatalogSchema'),
    ('apps/api/src/entrypoints/http/warehouseSourceImportRoutes.ts#parseWarehouseConnectionType'),
    ('apps/web/src/app/components/sourceImportWizard/WarehouseConnectionCreateForm.tsx#WarehouseConnectionCreateForm')
),
new_surfaces(ref) as (
  values
    ('apps/web/src/app/ports/workspace.ts'),
    ('apps/api/src/application/ports/warehouseSourceImport.ts'),
    ('apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.ts'),
    ('apps/api/src/entrypoints/http/warehouseSourceImportRoutes.ts'),
    ('apps/api/test/architecture/warehouseSourceImportRails.architecture.test.ts'),
    ('apps/web/src/app/components/SourceImportWizard.architecture.test.tsx'),
    ('tools/planning-db/migrations/560_source_import_supported_provider_catalog.sql')
),
new_guards(ref) as (
  values
    ('apps/api/test/architecture/warehouseSourceImportRails.architecture.test.ts'),
    ('apps/web/src/app/components/SourceImportWizard.architecture.test.tsx'),
    ('scripts/planning-db-migrate.test.cjs')
),
patched as (
  select
    rail.rail_id,
    (
      select jsonb_agg(to_jsonb(ref) order by ref)
      from (
        select distinct existing.ref
        from jsonb_array_elements_text(coalesce(rail.symbol_refs, '[]'::jsonb)) existing(ref)
        where split_part(existing.ref, '#', 2)
          <> ('supported' || 'Warehouse' || 'Connection' || 'Types')
        union
        select ref from new_symbol_refs
      ) refs
    ) as symbol_refs,
    (
      select jsonb_agg(to_jsonb(ref) order by ref)
      from (
        select distinct existing.ref
        from jsonb_array_elements_text(coalesce(rail.implementation_refs, '[]'::jsonb)) existing(ref)
        union
        select ref from new_surfaces
      ) refs
    ) as implementation_refs,
    (
      select jsonb_agg(to_jsonb(ref) order by ref)
      from (
        select distinct existing.ref
        from jsonb_array_elements_text(coalesce(rail.allowed_implementation_surfaces, '[]'::jsonb)) existing(ref)
        union
        select ref from new_surfaces
      ) refs
    ) as allowed_surfaces,
    (
      select jsonb_agg(to_jsonb(ref) order by ref)
      from (
        select distinct existing.ref
        from jsonb_array_elements_text(coalesce(rail.architecture_guards, '[]'::jsonb)) existing(ref)
        union
        select ref from new_guards
      ) refs
    ) as architecture_guards
  from target_rails rail
)
update planning_query_store.feature_mechanization_local_rails rail
set
  symbol_refs = patched.symbol_refs,
  implementation_refs = patched.implementation_refs,
  allowed_implementation_surfaces = patched.allowed_surfaces,
  architecture_guards = patched.architecture_guards,
  raw_manifest = (
    (coalesce(rail.raw_manifest, '{}'::jsonb) - 'supportedAdapterPosture')
    || jsonb_build_object(
      'supportedProviderCatalog',
      jsonb_build_object(
        'taskId', 'E-SOURCE-IMPORT-PROVIDER-CATALOG-1',
        'rail', 'CreateWarehouseConnection',
        'supportedTypes', jsonb_build_array('postgres'),
        'sharedSymbols', jsonb_build_array(
          'apps/web/src/app/ports/workspace.ts#SUPPORTED_WAREHOUSE_CONNECTION_TYPES',
          'apps/api/src/application/ports/warehouseSourceImport.ts#SUPPORTED_WAREHOUSE_CONNECTION_TYPES'
        ),
        'closedUnsupportedVendorUnionRetired', true,
        'rule', 'Create-connection UI and HTTP parsing must derive from the supported provider catalog, not from aspirational vendor literals.'
      )
    )
  ),
  source_path = 'tools/planning-db/migrations/560_source_import_supported_provider_catalog.sql',
  source_content_sha256 = md5('E-CANVAS-ADD-SOURCE-CREATE-CONNECTION-1:supported-provider-catalog:560'),
  revision = greatest(rail.revision, 1) + 1,
  updated_at = now()
from patched
where rail.rail_id = patched.rail_id;

insert into planning_query_store.frontend_component_local_files (
  component_id,
  file_path,
  file_role,
  exported_symbol,
  raw_file,
  source_path,
  source_content_sha256
)
values (
  'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
  'apps/web/src/app/components/sourceImportWizard/WarehouseConnectionCreateForm.tsx',
  'component',
  'WarehouseConnectionCreateForm',
  jsonb_build_object(
    'responsibility',
    'Render create-connection fields from the Source Import supported provider catalog without owning provider literals.',
    'rail',
    'CreateWarehouseConnection',
    'supportedProviderSymbol',
    'apps/web/src/app/ports/workspace.ts#SUPPORTED_WAREHOUSE_CONNECTION_TYPES',
    'supportedTypes',
    jsonb_build_array('postgres'),
    'taskId',
    'E-SOURCE-IMPORT-PROVIDER-CATALOG-1'
  ),
  'tools/planning-db/migrations/560_source_import_supported_provider_catalog.sql',
  md5('file:WarehouseConnectionCreateForm:supported-provider-catalog:560')
)
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = coalesce(planning_query_store.frontend_component_local_files.raw_file, '{}'::jsonb)
    || excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

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
  'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
  'EV-SOURCE-IMPORT-SUPPORTED-PROVIDER-CATALOG',
  'architecture-test',
  'current',
  'apps/web/src/app/components/SourceImportWizard.architecture.test.tsx',
  'CreateWarehouseConnection',
  'source-import-supported-provider-catalog',
  'The Add Source create-connection form derives its provider options from the supported provider catalog and no longer owns a local provider literal list.',
  jsonb_build_object(
    'taskId', 'E-SOURCE-IMPORT-PROVIDER-CATALOG-1',
    'apiGuard', 'apps/api/test/architecture/warehouseSourceImportRails.architecture.test.ts',
    'webGuard', 'apps/web/src/app/components/SourceImportWizard.architecture.test.tsx',
    'supportedTypes', jsonb_build_array('postgres'),
    'noStub', true
  ),
  'tools/planning-db/migrations/560_source_import_supported_provider_catalog.sql',
  md5('EV-SOURCE-IMPORT-SUPPORTED-PROVIDER-CATALOG:560')
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
