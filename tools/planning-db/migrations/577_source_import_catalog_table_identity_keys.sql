-- Record the Source Import catalog table identity correction: table display names
-- stay human-readable while selection and active metadata use structured identity.

update planning_query_store.frontend_component_local_components
set
  reuse_decision = 'harden',
  raw_component = coalesce(raw_component, '{}'::jsonb)
    || jsonb_build_object(
      'tableIdentityInvariant', 'Source table selection and active metadata use a structured [database, schema, table] identity key instead of the user-facing canonical name.'
    ),
  evidence_refs = (
    select jsonb_agg(distinct ref order by ref)
    from jsonb_array_elements_text(
      coalesce(evidence_refs, '[]'::jsonb)
      || jsonb_build_array('EV-WEB-SOURCE-IMPORT-CATALOG-TABLE-IDENTITY-KEYS')
    ) as refs(ref)
  ),
  source_path = 'tools/planning-db/migrations/577_source_import_catalog_table_identity_keys.sql',
  source_content_sha256 = md5('SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW:table-identity-keys:577'),
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
    'buildWarehouseTableIdentityKey',
    jsonb_build_object(
      'role', 'Provide structured source table identity for catalog selection and active metadata resolution.',
      'rail', 'RenderSourceImportCatalogView',
      'tableIdentityInvariant', 'identityKey is structured [database, schema, table]; canonicalName remains display-only',
      'forbiddenPattern', 'activeTableKey compares against dot-joined database.schema.table display text'
    ),
    'tools/planning-db/migrations/577_source_import_catalog_table_identity_keys.sql',
    md5('sourceImportCatalogModel.ts:buildWarehouseTableIdentityKey:577')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
    'model',
    'resolveActiveTable',
    jsonb_build_object(
      'role', 'Resolve active source metadata by structured table identity rather than display name.',
      'rail', 'RenderSourceImportCatalogView',
      'collisionExample', 'RAW.PROD/PUBLIC/ORDERS and RAW/PROD.PUBLIC/ORDERS share the same display string but different identity keys'
    ),
    'tools/planning-db/migrations/577_source_import_catalog_table_identity_keys.sql',
    md5('sourceImportWizardModel.ts:resolveActiveTable:577')
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
  'EV-WEB-SOURCE-IMPORT-CATALOG-TABLE-IDENTITY-KEYS',
  'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
  'test',
  'pnpm --dir apps/web exec vitest run --config vitest.unit.config.ts src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
  'passing',
  jsonb_build_object(
    'reviewFinding', 'Source Import used dot-joined table names as active metadata identity after schema identity had already been hardened.',
    'redBehavior', 'RAW.PROD/PUBLIC/ORDERS and RAW/PROD.PUBLIC/ORDERS can share the same display canonicalName while representing different tables.',
    'greenBehavior', 'activeTableKey and view-model keys use buildWarehouseTableIdentityKey while canonicalName remains display-only.',
    'userValue', 'Catalog metadata, selection, and review surfaces keep the correct source object active in demanding warehouse naming cases.'
  ),
  'tools/planning-db/migrations/577_source_import_catalog_table_identity_keys.sql',
  md5('EV-WEB-SOURCE-IMPORT-CATALOG-TABLE-IDENTITY-KEYS:577')
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
        'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts#buildWarehouseTableIdentityKey',
        'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts#SourceImportTableViewModel.identityKey',
        'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts#resolveActiveTable'
      )
    ) as refs(ref)
  ),
  raw_manifest = coalesce(rails.raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'tableIdentityInvariant', 'active source table identity is structured [database, schema, table]',
      'forbiddenTableIdentity', 'activeTableKey compares against dot-joined database.schema.table display text'
    ),
  source_path = 'tools/planning-db/migrations/577_source_import_catalog_table_identity_keys.sql',
  source_content_sha256 = md5('E-CANVAS-ADD-SOURCE-CATALOG-CATEGORIES-1:RenderSourceImportCatalogView:table-identity-keys:577'),
  revision = rails.revision + 1,
  updated_at = now()
where rails.feature_id = 'E-CANVAS-ADD-SOURCE-CATALOG-CATEGORIES-1'
  and rails.rail_name = 'RenderSourceImportCatalogView';
