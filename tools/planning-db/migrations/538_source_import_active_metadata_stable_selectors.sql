-- Register stable Source Import active metadata selectors under the existing
-- Source Import catalog query component. This keeps the inspect/select flow
-- DB-first without creating a parallel rail for presentation-only evidence.

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
    'apps/web/src/app/components/sourceImportWizard/SourceImportActiveTableMetadata.tsx',
    'presentation',
    'SourceImportActiveTableMetadata',
    jsonb_build_object(
      'responsibility',
      'Render active warehouse source metadata with stable selectors for demanding-user browser proof.',
      'rail',
      'RenderSourceImportCatalogView',
      'exports',
      jsonb_build_array(
        'SourceImportActiveTableMetadata',
        'sourceImportActiveMetadataClassNames'
      ),
      'stableSelectors',
      jsonb_build_array(
        'data-source-import-active-table',
        'data-source-import-metadata-column'
      ),
      'fowlerSignal',
      'presentation_component_with_tokenized_classes'
    ),
    'tools/planning-db/migrations/538_source_import_active_metadata_stable_selectors.sql',
    md5('file:source-import-active-metadata-stable-selectors:538')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'apps/web/src/app/components/sourceImportWizard/SourceImportActiveTableMetadata.test.tsx',
    'presentation-test',
    null,
    jsonb_build_object(
      'coverage',
      'Active metadata renders real table metrics and stable column selectors for browser/user proof.',
      'rail',
      'RenderSourceImportCatalogView',
      'asserts',
      jsonb_build_array(
        'data-source-import-active-table',
        'data-source-import-metadata-column',
        'real row count label',
        'real byte size label',
        'column constraint labels'
      )
    ),
    'tools/planning-db/migrations/538_source_import_active_metadata_stable_selectors.sql',
    md5('file:source-import-active-metadata-presentation-test:538')
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
  'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
  'EV-SOURCE-IMPORT-ACTIVE-METADATA-STABLE-SELECTORS',
  'presentation-test',
  'current',
  'apps/web/src/app/components/sourceImportWizard/SourceImportActiveTableMetadata.test.tsx',
  'RenderSourceImportCatalogView',
  'source-import-active-metadata-stable-selectors',
  'The active Source Import metadata panel exposes stable table and column selectors while rendering real metrics and column constraints.',
  jsonb_build_object(
    'componentOwner',
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'selectors',
    jsonb_build_array(
      'data-source-import-active-table',
      'data-source-import-metadata-column'
    ),
    'redGreen',
    true
  ),
  'tools/planning-db/migrations/538_source_import_active_metadata_stable_selectors.sql',
  md5('evidence:source-import-active-metadata-stable-selectors:538')
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
    'kind',
    'query',
    'dddObject',
    'SourceImportActiveTableMetadata',
    'readModel',
    'ActiveWarehouseSourceMetadataCard',
    'applicationPort',
    'SourceImportCatalogView',
    'adapterSurface',
    'apps/web/src/app/components/sourceImportWizard/SourceImportActiveTableMetadata.tsx',
    'scope',
    'canvas_add_source_dialog',
    'authorization',
    'inherits_workspace_source_import_permissions',
    'stableSelectors',
    jsonb_build_array(
      'data-source-import-active-table',
      'data-source-import-metadata-column'
    ),
    'negativeTests',
    jsonb_build_array(
      'active metadata does not own wizard flow state',
      'active metadata selectors are present when real table metadata exists',
      'column selector identity uses canonical table name plus column name'
    )
  ),
  'tools/planning-db/migrations/538_source_import_active_metadata_stable_selectors.sql',
  md5('rail:RenderSourceImportCatalogView:active-metadata-stable-selectors:538')
)
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = coalesce(planning_query_store.frontend_component_local_cq_rails.raw_rail, '{}'::jsonb)
    || excluded.raw_rail,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

with target_rails as (
  select rail_id
  from planning_query_store.feature_mechanization_local_rails
  where feature_id = 'E-CANVAS-ADD-SOURCE-INSPECT-SELECT-1'
    and rail_name = 'RenderSourceImportCatalogView'
),
symbol_refs(ref) as (
  values
    ('apps/web/src/app/components/sourceImportWizard/SourceImportActiveTableMetadata.tsx#SourceImportActiveTableMetadata'),
    ('apps/web/src/app/components/sourceImportWizard/SourceImportActiveTableMetadata.tsx#sourceImportActiveMetadataClassNames')
),
implementation_refs(ref) as (
  values
    ('apps/web/src/app/components/sourceImportWizard/SourceImportActiveTableMetadata.tsx'),
    ('apps/web/src/app/components/sourceImportWizard/SourceImportActiveTableMetadata.test.tsx'),
    ('scripts/planning-db-migrate.test.cjs'),
    ('tools/planning-db/migrations/538_source_import_active_metadata_stable_selectors.sql')
),
guard_refs(ref) as (
  values
    ('apps/web/src/app/components/sourceImportWizard/SourceImportActiveTableMetadata.test.tsx'),
    ('scripts/planning-db-migrate.test.cjs')
),
completion_tests(ref) as (
  values
    ('pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/sourceImportWizard/SourceImportActiveTableMetadata.test.tsx'),
    ('node --test --test-name-pattern "source import active metadata stable selectors" scripts/planning-db-migrate.test.cjs'),
    ('pnpm docs:feature-mechanization:implementation'),
    ('pnpm verify:prepush')
),
new_symbols(symbol) as (
  values (
    jsonb_build_object(
      'name',
      'sourceImportActiveMetadataClassNames',
      'path',
      'apps/web/src/app/components/sourceImportWizard/SourceImportActiveTableMetadata.tsx',
      'dddOwner',
      'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
      'cqRails',
      jsonb_build_array('RenderSourceImportCatalogView'),
      'fowlerSignals',
      jsonb_build_array('presentation_token', 'single_responsibility'),
      'architectureGuard',
      'apps/web/src/app/components/sourceImportWizard/SourceImportActiveTableMetadata.test.tsx',
      'cypressCoverage',
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
      'unitTests',
      jsonb_build_array(
        'apps/web/src/app/components/sourceImportWizard/SourceImportActiveTableMetadata.test.tsx'
      )
    )
  )
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
    ) as completion_tests,
    (
      select jsonb_agg(symbol order by symbol ->> 'name')
      from (
        select distinct on (symbol ->> 'path', symbol ->> 'name') symbol
        from (
          select existing.symbol
          from jsonb_array_elements(coalesce(rail.raw_manifest -> 'symbols', '[]'::jsonb)) existing(symbol)
          union all
          select symbol from new_symbols
        ) symbols
        order by symbol ->> 'path', symbol ->> 'name'
      ) unique_symbols
    ) as manifest_symbols
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
  raw_manifest = jsonb_set(
    coalesce(rail.raw_manifest, '{}'::jsonb)
      || jsonb_build_object(
        'activeMetadataStableSelectors',
        jsonb_build_object(
          'component',
          'SourceImportActiveTableMetadata',
          'selectors',
          jsonb_build_array(
            'data-source-import-active-table',
            'data-source-import-metadata-column'
          ),
          'evidence',
          'apps/web/src/app/components/sourceImportWizard/SourceImportActiveTableMetadata.test.tsx'
        )
      ),
    '{symbols}',
    coalesce(patched.manifest_symbols, '[]'::jsonb),
    true
  ),
  source_path = 'tools/planning-db/migrations/538_source_import_active_metadata_stable_selectors.sql',
  source_content_sha256 = md5(
    'source-import-active-metadata-stable-selectors:538:' || rail.rail_id
  ),
  revision = rail.revision + 1,
  updated_at = now()
from patched
where rail.rail_id = patched.rail_id;
