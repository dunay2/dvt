-- Keep Add Source schema selection DB-first and unambiguous. The catalog may
-- display repeated schema names under different databases, so selection must use
-- the database/schema value object instead of a raw schema string.

with target_rails(rail_id) as (
  values
    ('local#E-CANVAS-ADD-SOURCE-CATALOG-CATEGORIES-1#query#rendersourceimportcatalogview'),
    ('local#E-CANVAS-ADD-SOURCE-INSPECT-SELECT-1#query#rendersourceimportcatalogview'),
    ('local#E-CANVAS-ADD-SOURCE-CATALOG-SEARCH-1#query#rendersourceimportcatalogview')
),
new_symbols(value) as (
  values
    (
      jsonb_build_object(
        'name', 'SourceImportSchemaIdentity',
        'path', 'apps/web/src/app/components/sourceImportWizard/types.ts',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals', jsonb_build_array('value_object_identity', 'primitive_obsession_fix'),
        'unitTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts'),
        'presentationTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx')
      )
    ),
    (
      jsonb_build_object(
        'name', 'buildSourceImportSchemaKey',
        'path', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals', jsonb_build_array('value_object_identity', 'stable_dom_identity'),
        'unitTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts'),
        'presentationTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx')
      )
    ),
    (
      jsonb_build_object(
        'name', 'toggleSourceImportSchemaSelection',
        'path', 'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals', jsonb_build_array('pure_function', 'selection_policy'),
        'unitTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts'),
        'presentationTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx')
      )
    )
),
new_symbol_refs(ref) as (
  values
    ('apps/web/src/app/components/sourceImportWizard/types.ts#SourceImportSchemaIdentity'),
    ('apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts#buildSourceImportSchemaKey'),
    ('apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts#toggleSourceImportSchemaSelection')
),
new_surfaces(ref) as (
  values
    ('apps/web/src/app/components/sourceImportWizard/types.ts'),
    ('apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts'),
    ('apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts'),
    ('apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts'),
    ('apps/web/src/app/components/sourceImportWizard/SelectionStep.tsx'),
    ('apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx'),
    ('apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.tsx'),
    ('apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts'),
    ('apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx'),
    ('tools/planning-db/migrations/512_source_import_schema_identity_selection.sql')
),
new_guards(ref) as (
  values
    ('apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts'),
    ('apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx')
),
new_completion_tests(ref) as (
  values
    ('pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts'),
    ('pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx'),
    ('pnpm docs:feature-mechanization:implementation'),
    ('pnpm verify:prepush')
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
        from jsonb_array_elements_text(
          coalesce(rail.allowed_implementation_surfaces, '[]'::jsonb)
        ) existing(ref)
        union
        select ref from new_surfaces
      ) refs
    ) as allowed_implementation_surfaces,
    (
      select jsonb_agg(to_jsonb(ref) order by ref)
      from (
        select distinct existing.ref
        from jsonb_array_elements_text(coalesce(rail.architecture_guards, '[]'::jsonb)) existing(ref)
        union
        select ref from new_guards
      ) refs
    ) as architecture_guards,
    (
      select jsonb_agg(value order by value ->> 'path', value ->> 'name')
      from (
        select distinct on (value ->> 'path', value ->> 'name') value
        from (
          select existing.value
          from jsonb_array_elements(coalesce(rail.raw_manifest -> 'symbols', '[]'::jsonb)) existing(value)
          union all
          select new_symbols.value
          from new_symbols
        ) combined
        order by value ->> 'path', value ->> 'name'
      ) deduped
    ) as manifest_symbols,
    (
      select jsonb_agg(to_jsonb(ref) order by ref)
      from (
        select distinct existing.ref
        from jsonb_array_elements_text(
          coalesce(rail.completion_gate -> 'tests', '[]'::jsonb)
        ) existing(ref)
        union
        select ref from new_completion_tests
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
  raw_manifest = jsonb_set(
    coalesce(rail.raw_manifest, '{}'::jsonb),
    '{symbols}',
    coalesce(patched.manifest_symbols, '[]'::jsonb),
    true
  ),
  source_content_sha256 = md5('source-import-schema-identity-selection:512:' || rail.rail_id),
  revision = rail.revision + 1,
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
values
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'apps/web/src/app/components/sourceImportWizard/types.ts',
    'value-object',
    'SourceImportSchemaIdentity',
    jsonb_build_object(
      'responsibility', 'Carry exact database/schema identity for catalog selection.',
      'rail', 'RenderSourceImportCatalogView',
      'identityScope', jsonb_build_array('database', 'schema')
    ),
    'tools/planning-db/migrations/512_source_import_schema_identity_selection.sql',
    md5('SourceImportSchemaIdentity:512')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
    'selection-model',
    'toggleSourceImportSchemaSelection',
    jsonb_build_object(
      'responsibility', 'Apply schema selection by database/schema identity without React state coupling.',
      'rail', 'RenderSourceImportCatalogView'
    ),
    'tools/planning-db/migrations/512_source_import_schema_identity_selection.sql',
    md5('toggleSourceImportSchemaSelection:512')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts',
    'state-controller',
    'useSourceImportWizard',
    jsonb_build_object(
      'responsibility', 'Coordinate source import wizard state while delegating schema selection policy to the model.',
      'rail', 'RenderSourceImportCatalogView'
    ),
    'tools/planning-db/migrations/512_source_import_schema_identity_selection.sql',
    md5('useSourceImportWizard:schema-identity:512')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
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
    'EV-SOURCE-IMPORT-SCHEMA-IDENTITY-MODEL',
    'unit-test',
    'current',
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
    'RenderSourceImportCatalogView',
    'source-import-browse',
    'Schema selection uses database/schema identity and does not select tables from another database with the same schema name.',
    jsonb_build_object('identityScope', jsonb_build_array('database', 'schema')),
    'tools/planning-db/migrations/512_source_import_schema_identity_selection.sql',
    md5('EV-SOURCE-IMPORT-SCHEMA-IDENTITY-MODEL:512')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'EV-SOURCE-IMPORT-SCHEMA-IDENTITY-PRESENTATION',
    'presentation-test',
    'current',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx',
    'RenderSourceImportCatalogView',
    'source-import-browse',
    'Catalog view emits database/schema identity from the selected database group instead of a raw schema label.',
    jsonb_build_object('domDataKey', 'database.schema'),
    'tools/planning-db/migrations/512_source_import_schema_identity_selection.sql',
    md5('EV-SOURCE-IMPORT-SCHEMA-IDENTITY-PRESENTATION:512')
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
