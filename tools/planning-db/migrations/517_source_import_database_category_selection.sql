-- Keep Add Source database-category selection DB-first. The catalog is grouped
-- by database and schema, so selecting a complete database category must use a
-- database value object instead of UI text or a raw table scan in the view.

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
        'name', 'SourceImportDatabaseIdentity',
        'path', 'apps/web/src/app/components/sourceImportWizard/types.ts',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals', jsonb_build_array('value_object_identity', 'primitive_obsession_fix'),
        'architectureGuard', 'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.architecture.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts'),
        'presentationTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx'),
        'userFlowTests', jsonb_build_array('apps/web/src/app/components/SourceImportWizard.test.tsx')
      )
    ),
    (
      jsonb_build_object(
        'name', 'toggleSourceImportDatabaseSelection',
        'path', 'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals', jsonb_build_array('pure_function', 'selection_policy'),
        'architectureGuard', 'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.architecture.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts'),
        'presentationTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx'),
        'userFlowTests', jsonb_build_array('apps/web/src/app/components/SourceImportWizard.test.tsx')
      )
    )
),
new_symbol_refs(ref) as (
  values
    ('apps/web/src/app/components/sourceImportWizard/types.ts#SourceImportDatabaseIdentity'),
    ('apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts#toggleSourceImportDatabaseSelection')
),
new_surfaces(ref) as (
  values
    ('apps/web/src/app/components/sourceImportWizard/types.ts'),
    ('apps/web/src/app/components/sourceImportWizard/copy.ts'),
    ('apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts'),
    ('apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts'),
    ('apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts'),
    ('apps/web/src/app/components/sourceImportWizard/WizardStepContent.tsx'),
    ('apps/web/src/app/components/sourceImportWizard/SelectionStep.tsx'),
    ('apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx'),
    ('apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.tsx'),
    ('apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts'),
    ('apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts'),
    ('apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx'),
    ('apps/web/src/app/components/SourceImportWizard.test.tsx'),
    ('apps/web/src/app/components/SourceImportWizard.testHarness.tsx'),
    ('tools/planning-db/migrations/517_source_import_database_category_selection.sql')
),
new_guards(ref) as (
  values
    ('apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts'),
    ('apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx'),
    ('apps/web/src/app/components/SourceImportWizard.test.tsx')
),
new_completion_tests(ref) as (
  values
    ('pnpm --filter @dvt/web exec vitest run --config vitest.config.ts src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx src/app/components/SourceImportWizard.test.tsx'),
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
        from jsonb_array_elements_text(coalesce(rail.allowed_implementation_surfaces, '[]'::jsonb)) existing(ref)
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
        select distinct on (value ->> 'path', value ->> 'name')
          case
            when (
              value ->> 'path' like 'apps/web/src/app/components/sourceImportWizard/%'
              or value ->> 'path' like 'apps/web/src/app/components/SourceImportWizard%'
            )
            and not (value ? 'cypressCoverage')
            then value || jsonb_build_object(
              'cypressCoverage',
              'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'
            )
            else value
          end as value
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
        from jsonb_array_elements_text(coalesce(rail.completion_gate -> 'tests', '[]'::jsonb)) existing(ref)
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
  source_content_sha256 = md5('source-import-database-category-selection:517:' || rail.rail_id),
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
    'SourceImportDatabaseIdentity',
    jsonb_build_object(
      'responsibility', 'Carry exact database identity for catalog category selection.',
      'rail', 'RenderSourceImportCatalogView',
      'identityScope', jsonb_build_array('database')
    ),
    'tools/planning-db/migrations/517_source_import_database_category_selection.sql',
    md5('SourceImportDatabaseIdentity:517')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
    'selection-model',
    'toggleSourceImportDatabaseSelection',
    jsonb_build_object(
      'responsibility', 'Apply database category selection without React state coupling.',
      'rail', 'RenderSourceImportCatalogView'
    ),
    'tools/planning-db/migrations/517_source_import_database_category_selection.sql',
    md5('toggleSourceImportDatabaseSelection:517')
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
    'EV-SOURCE-IMPORT-DATABASE-CATEGORY-MODEL',
    'unit-test',
    'current',
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
    'RenderSourceImportCatalogView',
    'source-import-browse',
    'Database category selection selects all tables in that database and does not select another database.',
    jsonb_build_object('identityScope', jsonb_build_array('database')),
    'tools/planning-db/migrations/517_source_import_database_category_selection.sql',
    md5('EV-SOURCE-IMPORT-DATABASE-CATEGORY-MODEL:517')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'EV-SOURCE-IMPORT-DATABASE-CATEGORY-PRESENTATION',
    'presentation-test',
    'current',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx',
    'RenderSourceImportCatalogView',
    'source-import-browse',
    'Catalog view emits database identity from the database group header.',
    jsonb_build_object('domDataKey', 'database'),
    'tools/planning-db/migrations/517_source_import_database_category_selection.sql',
    md5('EV-SOURCE-IMPORT-DATABASE-CATEGORY-PRESENTATION:517')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'EV-SOURCE-IMPORT-DATABASE-CATEGORY-WIZARD',
    'integration-test',
    'current',
    'apps/web/src/app/components/SourceImportWizard.test.tsx',
    'RenderSourceImportCatalogView',
    'source-import-browse',
    'Wizard flow attaches all selected source tables from a database category through ImportWarehouseSources.',
    jsonb_build_object('coveredRails', jsonb_build_array('RenderSourceImportCatalogView', 'ImportWarehouseSources')),
    'tools/planning-db/migrations/517_source_import_database_category_selection.sql',
    md5('EV-SOURCE-IMPORT-DATABASE-CATEGORY-WIZARD:517')
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
