-- Record the Source Import catalog schema identity hardening as DB-first
-- component evidence. Migration 574 fixed grouping semantics; this delta
-- closes the remaining presentation identity ambiguity for dotted identifiers.

update planning_query_store.frontend_component_local_components
set
  reuse_decision = 'harden',
  raw_component = coalesce(raw_component, '{}'::jsonb)
    || jsonb_build_object(
      'schemaDomIdentityInvariant', 'Schema presentation identity keys are structured [database, schema] values, not dot-joined database.schema strings.',
      'schemaAccessibilityInvariant', 'Schema category actions name the schema and database as separate concepts so dotted identifiers remain distinguishable to assistive tech.'
    ),
  evidence_refs = (
    select jsonb_agg(distinct ref order by ref)
    from jsonb_array_elements_text(
      coalesce(evidence_refs, '[]'::jsonb)
      || jsonb_build_array('EV-WEB-SOURCE-IMPORT-CATALOG-SCHEMA-IDENTITY-KEYS')
    ) as refs(ref)
  ),
  source_path = 'tools/planning-db/migrations/575_source_import_catalog_schema_identity_keys.sql',
  source_content_sha256 = md5('SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW:schema-identity-keys:575'),
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
    'buildSourceImportSchemaKey',
    jsonb_build_object(
      'role', 'Build collision-free schema presentation identity tokens from structured database and schema values.',
      'rail', 'RenderSourceImportCatalogView',
      'schemaDomIdentityInvariant', 'structured [database, schema] token',
      'forbiddenPattern', 'dot-joined database.schema semantic key'
    ),
    'tools/planning-db/migrations/575_source_import_catalog_schema_identity_keys.sql',
    md5('sourceImportCatalogModel.ts:buildSourceImportSchemaKey:575')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx',
    'test',
    'SourceImportCatalogView dotted schema identity regression',
    jsonb_build_object(
      'role', 'Prove dotted warehouse identifiers produce distinct schema DOM identities and non-ambiguous accessible names.',
      'rail', 'RenderSourceImportCatalogView',
      'redFailure', 'two distinct schema actions shared one dot-joined data-source-import-schema value'
    ),
    'tools/planning-db/migrations/575_source_import_catalog_schema_identity_keys.sql',
    md5('SourceImportCatalogView.test.tsx:schema-identity-keys:575')
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
  'EV-WEB-SOURCE-IMPORT-CATALOG-SCHEMA-IDENTITY-KEYS',
  'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
  'test',
  'pnpm --dir apps/web exec vitest run --config vitest.unit.config.ts src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts && pnpm --dir apps/web exec vitest run --config vitest.presentation.config.ts src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx',
  'passing',
  jsonb_build_object(
    'redFailure', 'SourceImportCatalogView rendered RAW.PROD/PUBLIC and RAW/PROD.PUBLIC with the same data-source-import-schema identity.',
    'greenBehavior', 'Schema DOM identities use a structured [database, schema] token and accessible names separate schema from database.',
    'userValue', 'A demanding user can distinguish and select source schemas even when warehouse identifiers contain dots.'
  ),
  'tools/planning-db/migrations/575_source_import_catalog_schema_identity_keys.sql',
  md5('EV-WEB-SOURCE-IMPORT-CATALOG-SCHEMA-IDENTITY-KEYS:575')
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
        'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts#buildSourceImportSchemaKey',
        'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx#keeps schema DOM identities and accessible labels collision-free when identifiers contain dots'
      )
    ) as refs(ref)
  ),
  raw_manifest = coalesce(rails.raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'schemaDomIdentityInvariant', 'structured [database, schema] token',
      'schemaAccessibilityInvariant', 'schema and database named separately'
    ),
  source_path = 'tools/planning-db/migrations/575_source_import_catalog_schema_identity_keys.sql',
  source_content_sha256 = md5('E-CANVAS-ADD-SOURCE-CATALOG-CATEGORIES-1:RenderSourceImportCatalogView:schema-identity-keys:575'),
  revision = rails.revision + 1,
  updated_at = now()
where rails.feature_id = 'E-CANVAS-ADD-SOURCE-CATALOG-CATEGORIES-1'
  and rails.rail_name = 'RenderSourceImportCatalogView';
