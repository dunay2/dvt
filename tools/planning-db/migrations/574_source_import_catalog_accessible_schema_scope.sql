-- Harden the DB-first Source Import catalog component after the schema-scope
-- accessibility fix. This is append-only because migration 327 already
-- introduced the component boundary.

update planning_query_store.frontend_component_local_components
set
  reuse_decision = 'harden',
  responsibility = 'Render warehouse databases, schemas, table metrics, column previews, accessible category actions and selection callbacks from the source import catalog read model through component-owned presentation primitives.',
  evidence_refs = (
    select jsonb_agg(distinct ref order by ref)
    from jsonb_array_elements_text(
      coalesce(evidence_refs, '[]'::jsonb)
      || jsonb_build_array('EV-WEB-SOURCE-IMPORT-CATALOG-SCHEMA-SCOPE-A11Y')
    ) as refs(ref)
  ),
  raw_component = coalesce(raw_component, '{}'::jsonb)
    || jsonb_build_object(
      'schemaScopeInvariant', 'Schema category actions are keyed and labelled by database.schema; same-named schemas from different databases must not be merged.',
      'deadSymbolsRetired', jsonb_build_array(
        'groupTablesBySchema',
        'buildPreviewGroups'
      )
    ),
  source_path = 'tools/planning-db/migrations/574_source_import_catalog_accessible_schema_scope.sql',
  source_content_sha256 = md5('SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW:accessible-schema-scope:574'),
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW';

insert into planning_query_store.frontend_component_local_files (
  component_id,
  file_path,
  file_role,
  exported_symbol,
  raw_file,
  source_path,
  source_content_sha256
)
values
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts',
    'model',
    'buildSourceImportCatalogViewModel',
    jsonb_build_object(
      'role', 'Build the Source Import catalog read model with database-scoped schema groups and accessible category labels.',
      'rail', 'RenderSourceImportCatalogView',
      'schemaScopeInvariant', 'database.schema'
    ),
    'tools/planning-db/migrations/574_source_import_catalog_accessible_schema_scope.sql',
    md5('sourceImportCatalogModel.ts:accessible-schema-scope:574')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx',
    'component',
    'SourceImportSchemaHeader',
    jsonb_build_object(
      'role', 'Render accessible source schema category action.',
      'rail', 'RenderSourceImportCatalogView',
      'ariaContract', 'button name includes database.schema and table count'
    ),
    'tools/planning-db/migrations/574_source_import_catalog_accessible_schema_scope.sql',
    md5('SourceImportCatalogPrimitives.tsx:SourceImportSchemaHeader:a11y:574')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
    'flow-policy',
    'buildSourceImportRegistryPath',
    jsonb_build_object(
      'role', 'Own wizard flow policy and registry path calculation only; catalog grouping helpers were retired from this file.',
      'rail', 'ImportWarehouseSources',
      'retiredSymbols', jsonb_build_array(
        'groupTablesBySchema',
        'buildPreviewGroups'
      )
    ),
    'tools/planning-db/migrations/574_source_import_catalog_accessible_schema_scope.sql',
    md5('sourceImportWizardModel.ts:dead-symbol-retirement:574')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = coalesce(planning_query_store.frontend_component_local_files.raw_file, '{}'::jsonb)
    || excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_local_evidence (
  evidence_id,
  component_id,
  evidence_kind,
  evidence_ref,
  evidence_status,
  raw_evidence,
  source_path,
  source_content_sha256
)
values (
  'EV-WEB-SOURCE-IMPORT-CATALOG-SCHEMA-SCOPE-A11Y',
  'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
  'test',
  'pnpm --dir apps/web exec vitest run --config vitest.unit.config.ts src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts && pnpm --dir apps/web exec vitest run --config vitest.presentation.config.ts src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx',
  'passing',
  jsonb_build_object(
    'redFailure', 'sourceImportCatalogModel merged same-named schemas across databases and SourceImportSchemaHeader lacked an explicit database.schema accessible name.',
    'greenBehavior', 'Source Import catalog schema groups are database-scoped and the schema action is discoverable by role/name.',
    'retiredDeadSymbols', jsonb_build_array(
      'groupTablesBySchema',
      'buildPreviewGroups'
    )
  ),
  'tools/planning-db/migrations/574_source_import_catalog_accessible_schema_scope.sql',
  md5('EV-WEB-SOURCE-IMPORT-CATALOG-SCHEMA-SCOPE-A11Y:574')
)
on conflict (evidence_id) do update set
  component_id = excluded.component_id,
  evidence_kind = excluded.evidence_kind,
  evidence_ref = excluded.evidence_ref,
  evidence_status = excluded.evidence_status,
  raw_evidence = excluded.raw_evidence,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

update planning_query_store.feature_mechanization_local_rails rails
set
  symbol_refs = (
    select jsonb_agg(distinct ref order by ref)
    from jsonb_array_elements_text(
      (coalesce(rails.symbol_refs, '[]'::jsonb) - 'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts#groupTablesBySchema')
      - 'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts#buildPreviewGroups'
      || jsonb_build_array(
        'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts#SourceImportSchemaGroupViewModel.accessibilityLabel',
        'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts#SourceImportCatalogCopy.selectSourceSchema',
        'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx#SourceImportSchemaHeader'
      )
    ) as refs(ref)
  ),
  raw_manifest = coalesce(rails.raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'schemaScopeInvariant', 'database.schema',
      'deadSymbolsRetired', jsonb_build_array(
        'groupTablesBySchema',
        'buildPreviewGroups'
      )
    ),
  source_path = 'tools/planning-db/migrations/574_source_import_catalog_accessible_schema_scope.sql',
  source_content_sha256 = md5('E-CANVAS-ADD-SOURCE-CATALOG-CATEGORIES-1:RenderSourceImportCatalogView:schema-scope:574'),
  revision = rails.revision + 1,
  updated_at = now()
where rails.feature_id = 'E-CANVAS-ADD-SOURCE-CATALOG-CATEGORIES-1'
  and rails.rail_name = 'RenderSourceImportCatalogView';
