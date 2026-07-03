-- Register the Source Import catalog copy/formatter contract under the existing
-- catalog query-view component. This keeps RenderSourceImportCatalogView DB-first
-- without creating a parallel rail or encoding human-language strings in the
-- catalog read-model builder.

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
    'copy-contract',
    'sourceImportWizardCopy',
    jsonb_build_object(
      'responsibility', 'Own Source Import catalog labels and number formatting defaults consumed by the catalog query read model.',
      'rail', 'RenderSourceImportCatalogView',
      'exports', jsonb_build_array(
        'sourceImportWizardCopy.catalog',
        'sourceImportCatalogNumberFormatter'
      ),
      'fowlerSignal', 'presentation_copy_outside_read_model_projection',
      'tokens', jsonb_build_array(
        'selectSourceTable',
        'inspectSourceTableMetadata',
        'metadata',
        'rowsUnknown',
        'rowSingular',
        'rowPlural',
        'columnSingular',
        'columnPlural',
        'tableSingular',
        'tablePlural',
        'schemaSingular',
        'schemaPlural',
        'nullable',
        'required',
        'primaryKey',
        'unique',
        'available',
        'showing',
        'of'
      )
    ),
    'tools/planning-db/migrations/509_source_import_catalog_copy_token_contract.sql',
    md5('file:source-import-catalog-copy-contract:509')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts',
    'model',
    'buildSourceImportCatalogViewModel',
    jsonb_build_object(
      'responsibility', 'Project source catalog metadata with injected catalog copy and formatter dependencies.',
      'rail', 'RenderSourceImportCatalogView',
      'exports', jsonb_build_array(
        'SourceImportCatalogCopy',
        'buildSourceImportCatalogViewModel',
        'buildSourceImportTableViewModel',
        'formatSourceImportRowCount',
        'formatSourceImportColumnCount',
        'formatSourceImportTableCount',
        'formatSourceImportSchemaCount'
      ),
      'fowlerSignal', 'pure_read_model_projection_with_injected_copy',
      'negativeTests', jsonb_build_array(
        'catalog labels are projected from injected copy tokens',
        'number formatting is projected from injected formatter',
        'metadata aria label remains stable without model literals'
      )
    ),
    'tools/planning-db/migrations/509_source_import_catalog_copy_token_contract.sql',
    md5('file:source-import-catalog-model-copy-contract:509')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = coalesce(planning_query_store.frontend_component_local_files.raw_file, '{}'::jsonb)
    || excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_local_cq_rails (
  component_id,
  rail_name,
  rail_kind,
  rail_status,
  raw_rail,
  source_path,
  source_content_sha256
)
values (
  'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
  'RenderSourceImportCatalogView',
  'query',
  'implemented-ui',
  jsonb_build_object(
    'kind', 'query',
    'dddObject', 'SourceImportCatalogViewModel',
    'readModel', 'CategorizedWarehouseSourceCatalog',
    'applicationPort', 'SourceImportCatalogView',
    'adapterSurface', 'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.tsx',
    'scope', 'canvas_add_source_dialog',
    'authorization', 'inherits_workspace_source_import_permissions',
    'collaborators', jsonb_build_array(
      'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts',
      'apps/web/src/app/components/sourceImportWizard/copy.ts'
    ),
    'negativeTests', jsonb_build_array(
      'catalog labels are supplied by SourceImportCatalogCopy',
      'catalog number formatting is supplied by sourceImportCatalogNumberFormatter',
      'catalog model does not own human-language copy literals'
    )
  ),
  'tools/planning-db/migrations/509_source_import_catalog_copy_token_contract.sql',
  md5('rail:RenderSourceImportCatalogView:copy-token-contract:509')
)
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = coalesce(planning_query_store.frontend_component_local_cq_rails.raw_rail, '{}'::jsonb)
    || excluded.raw_rail,
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
values
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'EV-SOURCE-IMPORT-CATALOG-COPY-TOKENS',
    'unit-test',
    'current',
    'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts',
    'RenderSourceImportCatalogView',
    'source-import-catalog-copy-token-contract',
    'Source Import catalog read-model output is driven by injected copy and number formatter contracts.',
    jsonb_build_object(
      'redGreen', true,
      'symbols', jsonb_build_array('SourceImportCatalogCopy', 'sourceImportCatalogNumberFormatter'),
      'componentOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW'
    ),
    'tools/planning-db/migrations/509_source_import_catalog_copy_token_contract.sql',
    md5('evidence:source-import-catalog-copy-tokens:509')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'EV-SOURCE-IMPORT-CATALOG-COPY-PRESENTATION',
    'presentation-test',
    'current',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx',
    'RenderSourceImportCatalogView',
    'source-import-catalog-copy-token-contract',
    'Source Import catalog presentation keeps metadata aria labels and metrics stable while using catalog copy tokens.',
    jsonb_build_object(
      'componentOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
      'integrationEvidence', jsonb_build_array(
        'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx',
        'apps/web/src/app/components/SourceImportWizard.test.tsx'
      )
    ),
    'tools/planning-db/migrations/509_source_import_catalog_copy_token_contract.sql',
    md5('evidence:source-import-catalog-copy-presentation:509')
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

with target_rails(rail_id) as (
  values
    ('local#E-CANVAS-ADD-SOURCE-CATALOG-CATEGORIES-1#query#rendersourceimportcatalogview'),
    ('local#E-CANVAS-ADD-SOURCE-INSPECT-SELECT-1#query#rendersourceimportcatalogview'),
    ('local#E-CANVAS-ADD-SOURCE-CATALOG-SEARCH-1#query#rendersourceimportcatalogview'),
    ('local#E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1#query#listwarehouseconnectiontables'),
    ('local#E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1#command#importwarehousesources')
),
symbol_refs(ref) as (
  values
    ('apps/web/src/app/components/sourceImportWizard/copy.ts#sourceImportWizardCopy.catalog'),
    ('apps/web/src/app/components/sourceImportWizard/copy.ts#sourceImportCatalogNumberFormatter'),
    ('apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts#SourceImportCatalogCopy')
),
implementation_refs(ref) as (
  values
    ('apps/web/src/app/components/sourceImportWizard/copy.ts'),
    ('apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts'),
    ('apps/web/src/app/components/sourceImportWizard/SelectionStep.tsx'),
    ('apps/web/src/app/components/sourceImportWizard/SourceImportActiveTableMetadata.tsx'),
    ('apps/web/src/app/components/sourceImportWizard/ReviewStep.tsx'),
    ('tools/planning-db/migrations/509_source_import_catalog_copy_token_contract.sql')
),
guard_refs(ref) as (
  values
    ('apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts'),
    ('apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx')
),
completion_tests(ref) as (
  values
    ('pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts'),
    ('pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx src/app/components/SourceImportWizard.metadata.test.tsx src/app/components/SourceImportWizard.test.tsx')
),
patched as (
  select
    rail.rail_id,
    (
      select jsonb_agg(to_jsonb(ref) order by ref)
      from (
        select distinct existing.ref
        from jsonb_array_elements_text(coalesce(rail.symbol_refs, '[]'::jsonb)) existing(ref)
        union
        select ref from symbol_refs
      ) refs
    ) as symbol_refs,
    (
      select jsonb_agg(to_jsonb(ref) order by ref)
      from (
        select distinct existing.ref
        from jsonb_array_elements_text(coalesce(rail.implementation_refs, '[]'::jsonb)) existing(ref)
        union
        select ref from implementation_refs
      ) refs
    ) as implementation_refs,
    (
      select jsonb_agg(to_jsonb(ref) order by ref)
      from (
        select distinct existing.ref
        from jsonb_array_elements_text(coalesce(rail.allowed_implementation_surfaces, '[]'::jsonb)) existing(ref)
        union
        select ref from implementation_refs
      ) refs
    ) as allowed_implementation_surfaces,
    (
      select jsonb_agg(to_jsonb(ref) order by ref)
      from (
        select distinct existing.ref
        from jsonb_array_elements_text(coalesce(rail.architecture_guards, '[]'::jsonb)) existing(ref)
        union
        select ref from guard_refs
      ) refs
    ) as architecture_guards,
    (
      select jsonb_agg(to_jsonb(ref) order by ref)
      from (
        select distinct existing.ref
        from jsonb_array_elements_text(coalesce(rail.completion_gate -> 'tests', '[]'::jsonb)) existing(ref)
        union
        select ref from completion_tests
      ) refs
    ) as completion_tests
  from planning_query_store.feature_mechanization_local_rails rail
  join target_rails
    on target_rails.rail_id = rail.rail_id
)
update planning_query_store.feature_mechanization_local_rails rail
set
  symbol_refs = patched.symbol_refs,
  implementation_refs = patched.implementation_refs,
  allowed_implementation_surfaces = patched.allowed_implementation_surfaces,
  architecture_guards = patched.architecture_guards,
  completion_gate = jsonb_set(
    coalesce(rail.completion_gate, '{}'::jsonb),
    '{tests}',
    coalesce(patched.completion_tests, '[]'::jsonb),
    true
  ),
  source_content_sha256 = md5(
    'source-import-catalog-copy-token-contract:509:' || rail.rail_id
  ),
  revision = rail.revision + 1,
  updated_at = now()
from patched
where rail.rail_id = patched.rail_id;
