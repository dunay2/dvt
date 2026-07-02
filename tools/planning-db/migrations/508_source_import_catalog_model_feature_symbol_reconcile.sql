-- Reconcile all feature-mechanization rails that still pointed moved Source
-- Import catalog symbols at sourceImportWizardModel.ts after the catalog read
-- model was extracted into sourceImportCatalogModel.ts.

with symbol_moves(name, old_path, new_path) as (
  values
    (
      'SourceImportCatalogViewModel',
      'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
      'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts'
    ),
    (
      'SourceImportColumnViewModel',
      'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
      'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts'
    ),
    (
      'SourceImportTableViewModel',
      'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
      'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts'
    ),
    (
      'SourceImportSchemaGroupViewModel',
      'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
      'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts'
    ),
    (
      'SourceImportDatabaseGroupViewModel',
      'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
      'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts'
    ),
    (
      'buildSourceImportCatalogViewModel',
      'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
      'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts'
    ),
    (
      'buildSourceImportSchemaGroup',
      'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
      'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts'
    ),
    (
      'buildSourceImportTableViewModel',
      'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
      'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts'
    ),
    (
      'buildWarehouseTableKey',
      'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
      'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts'
    ),
    (
      'formatNumber',
      'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
      'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts'
    ),
    (
      'formatSourceImportByteSize',
      'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
      'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts'
    ),
    (
      'formatSourceImportColumnCount',
      'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
      'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts'
    ),
    (
      'formatSourceImportNullability',
      'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
      'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts'
    ),
    (
      'formatSourceImportRowCount',
      'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
      'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts'
    ),
    (
      'formatSourceImportSchemaCount',
      'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
      'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts'
    ),
    (
      'formatSourceImportTableCount',
      'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
      'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts'
    ),
    (
      'normalizeCatalogSearchValue',
      'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
      'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts'
    ),
    (
      'tableMatchesSourceImportSearch',
      'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
      'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts'
    )
),
target_rails(rail_id) as (
  values
    ('local#E-CANVAS-ADD-SOURCE-CATALOG-CATEGORIES-1#query#rendersourceimportcatalogview'),
    ('local#E-CANVAS-ADD-SOURCE-INSPECT-SELECT-1#query#rendersourceimportcatalogview'),
    ('local#E-CANVAS-ADD-SOURCE-CATALOG-SEARCH-1#query#rendersourceimportcatalogview'),
    ('local#E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1#query#listwarehouseconnectiontables'),
    ('local#E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1#command#importwarehousesources')
),
required_symbol_objects(rail_id, value) as (
  values
    (
      'local#E-CANVAS-ADD-SOURCE-CATALOG-SEARCH-1#query#rendersourceimportcatalogview',
      jsonb_build_object(
        'name', 'buildSourceImportCatalogViewModel',
        'path', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals', jsonb_build_array('read_model_projection', 'pure_function'),
        'architectureGuard', 'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.architecture.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts')
      )
    ),
    (
      'local#E-CANVAS-ADD-SOURCE-CATALOG-SEARCH-1#query#rendersourceimportcatalogview',
      jsonb_build_object(
        'name', 'normalizeCatalogSearchValue',
        'path', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals', jsonb_build_array('search_normalization', 'private_helper'),
        'architectureGuard', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts')
      )
    ),
    (
      'local#E-CANVAS-ADD-SOURCE-CATALOG-SEARCH-1#query#rendersourceimportcatalogview',
      jsonb_build_object(
        'name', 'tableMatchesSourceImportSearch',
        'path', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals', jsonb_build_array('catalog_search_projection', 'private_helper'),
        'architectureGuard', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts')
      )
    ),
    (
      'local#E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1#command#importwarehousesources',
      jsonb_build_object(
        'name', 'buildSourceImportTableViewModel',
        'path', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals', jsonb_build_array('read_model_projection', 'pure_function'),
        'architectureGuard', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts')
      )
    ),
    (
      'local#E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1#command#importwarehousesources',
      jsonb_build_object(
        'name', 'formatSourceImportByteSize',
        'path', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals', jsonb_build_array('presentation_formatting', 'real_metadata'),
        'architectureGuard', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts')
      )
    )
),
new_surfaces(ref) as (
  values
    ('apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts'),
    ('apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts'),
    ('apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.architecture.test.ts'),
    ('tools/planning-db/migrations/508_source_import_catalog_model_feature_symbol_reconcile.sql')
),
new_guards(ref) as (
  values
    ('apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts'),
    ('apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.architecture.test.ts')
),
new_completion_tests(ref) as (
  values
    ('pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts'),
    ('pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/components/sourceImportWizard/SourceImportCatalogView.architecture.test.ts')
),
patched as (
  select
    rail.rail_id,
    (
      select jsonb_agg(to_jsonb(ref) order by ref)
      from (
        select distinct coalesce(move.new_path || '#' || move.name, existing.ref) as ref
        from jsonb_array_elements_text(coalesce(rail.symbol_refs, '[]'::jsonb)) existing(ref)
        left join symbol_moves move
          on existing.ref = move.old_path || '#' || move.name
        union
        select distinct (required.value ->> 'path') || '#' || (required.value ->> 'name')
        from required_symbol_objects required
        where required.rail_id = rail.rail_id
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
          select case
              when move.name is not null then
                case
                  when symbol.value ? 'cypressCoverage' then
                    symbol.value || jsonb_build_object('path', move.new_path)
                  else
                    symbol.value
                      || jsonb_build_object('path', move.new_path)
                      || jsonb_build_object(
                        'cypressCoverage',
                        'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'
                      )
                end
              when symbol.value ? 'cypressCoverage' then symbol.value
              else symbol.value || jsonb_build_object(
                'cypressCoverage',
                'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'
              )
            end as value
          from jsonb_array_elements(coalesce(rail.raw_manifest -> 'symbols', '[]'::jsonb)) symbol(value)
          left join symbol_moves move
            on symbol.value ->> 'name' = move.name
           and symbol.value ->> 'path' = move.old_path
          union all
          select required.value
          from required_symbol_objects required
          where required.rail_id = rail.rail_id
        ) combined
        order by
          value ->> 'path',
          value ->> 'name',
          case when value ? 'cypressCoverage' then 0 else 1 end
      ) deduped
    ) as manifest_symbols,
    (
      select jsonb_agg(to_jsonb(ref) order by ref)
      from (
        select distinct existing.ref
        from jsonb_array_elements_text(
          coalesce(rail.raw_manifest -> 'allowedImplementationSurfaces', '[]'::jsonb)
        ) existing(ref)
        union
        select ref from new_surfaces
      ) refs
    ) as manifest_allowed_surfaces,
    (
      select jsonb_agg(to_jsonb(ref) order by ref)
      from (
        select distinct existing.ref
        from jsonb_array_elements_text(
          coalesce(rail.raw_manifest -> 'architectureGuards', '[]'::jsonb)
        ) existing(ref)
        union
        select ref from new_guards
      ) refs
    ) as manifest_architecture_guards,
    (
      select jsonb_agg(to_jsonb(ref) order by ref)
      from (
        select distinct existing.ref
        from jsonb_array_elements_text(
          coalesce(rail.raw_manifest -> 'completionGate', '[]'::jsonb)
        ) existing(ref)
        union
        select ref from new_completion_tests
      ) refs
    ) as manifest_completion_gate,
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
    jsonb_set(
      jsonb_set(
        jsonb_set(
          coalesce(rail.raw_manifest, '{}'::jsonb),
          '{symbols}',
          coalesce(patched.manifest_symbols, '[]'::jsonb),
          true
        ),
        '{allowedImplementationSurfaces}',
        coalesce(patched.manifest_allowed_surfaces, '[]'::jsonb),
        true
      ),
      '{architectureGuards}',
      coalesce(patched.manifest_architecture_guards, '[]'::jsonb),
      true
    ),
    '{completionGate}',
    coalesce(patched.manifest_completion_gate, '[]'::jsonb),
    true
  ),
  source_content_sha256 = md5(
    'source-import-catalog-model-feature-symbol-reconcile:508:' || rail.rail_id
  ),
  revision = rail.revision + 1,
  updated_at = now()
from patched
where rail.rail_id = patched.rail_id;
