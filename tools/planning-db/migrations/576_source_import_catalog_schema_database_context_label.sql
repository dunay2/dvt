-- Record the Source Import catalog accessibility correction that keeps schema
-- selection as the single action and announces database as context.

update planning_query_store.frontend_component_local_components
set
  reuse_decision = 'harden',
  raw_component = coalesce(raw_component, '{}'::jsonb)
    || jsonb_build_object(
      'schemaDatabaseContextInvariant', 'Schema category actions announce schema selection as the action and database as non-action context.'
    ),
  evidence_refs = (
    select jsonb_agg(distinct ref order by ref)
    from jsonb_array_elements_text(
      coalesce(evidence_refs, '[]'::jsonb)
      || jsonb_build_array('EV-WEB-SOURCE-IMPORT-CATALOG-SCHEMA-DATABASE-CONTEXT-LABEL')
    ) as refs(ref)
  ),
  source_path = 'tools/planning-db/migrations/576_source_import_catalog_schema_database_context_label.sql',
  source_content_sha256 = md5('SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW:schema-database-context-label:576'),
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
    'apps/web/src/app/components/sourceImportWizard/copy.ts',
    'copy',
    'SOURCE_IMPORT_WIZARD_COPY.catalog.inSourceDatabase',
    jsonb_build_object(
      'role', 'Provide non-action database context copy for schema category accessibility labels.',
      'rail', 'RenderSourceImportCatalogView',
      'schemaDatabaseContextInvariant', 'database label is context, not a second selection action'
    ),
    'tools/planning-db/migrations/576_source_import_catalog_schema_database_context_label.sql',
    md5('copy.ts:SOURCE_IMPORT_WIZARD_COPY.catalog.inSourceDatabase:576')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts',
    'model',
    'SourceImportSchemaGroupViewModel.accessibilityLabel',
    jsonb_build_object(
      'role', 'Build schema category accessibility labels that announce the schema action with database context.',
      'rail', 'RenderSourceImportCatalogView',
      'forbiddenPattern', 'schema label reuses selectSourceDatabase action copy'
    ),
    'tools/planning-db/migrations/576_source_import_catalog_schema_database_context_label.sql',
    md5('sourceImportCatalogModel.ts:SourceImportSchemaGroupViewModel.accessibilityLabel:576')
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
  'EV-WEB-SOURCE-IMPORT-CATALOG-SCHEMA-DATABASE-CONTEXT-LABEL',
  'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
  'test',
  'pnpm --dir apps/web exec vitest run --config vitest.unit.config.ts src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts && pnpm --dir apps/web exec vitest run --config vitest.presentation.config.ts src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx',
  'passing',
  jsonb_build_object(
    'reviewFinding', 'Schema category actions reused selectSourceDatabase copy and could announce a database selection action the control does not perform.',
    'greenBehavior', 'Schema category actions announce schema selection with database context using inSourceDatabase copy.',
    'userValue', 'Assistive technology and voice-control users can distinguish schema selection from database category selection.'
  ),
  'tools/planning-db/migrations/576_source_import_catalog_schema_database_context_label.sql',
  md5('EV-WEB-SOURCE-IMPORT-CATALOG-SCHEMA-DATABASE-CONTEXT-LABEL:576')
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
      coalesce(rails.symbol_refs, '[]'::jsonb)
      || jsonb_build_array(
        'apps/web/src/app/components/sourceImportWizard/copy.ts#SOURCE_IMPORT_WIZARD_COPY.catalog.inSourceDatabase',
        'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts#SourceImportSchemaGroupViewModel.accessibilityLabel'
      )
    ) as refs(ref)
  ),
  raw_manifest = coalesce(rails.raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'schemaDatabaseContextInvariant', 'schema action with database context',
      'forbiddenAccessibilityCopy', 'schema label reuses selectSourceDatabase action copy'
    ),
  source_path = 'tools/planning-db/migrations/576_source_import_catalog_schema_database_context_label.sql',
  source_content_sha256 = md5('E-CANVAS-ADD-SOURCE-CATALOG-CATEGORIES-1:RenderSourceImportCatalogView:schema-database-context-label:576'),
  revision = rails.revision + 1,
  updated_at = now()
where rails.feature_id = 'E-CANVAS-ADD-SOURCE-CATALOG-CATEGORIES-1'
  and rails.rail_name = 'RenderSourceImportCatalogView';
