-- Register Source Import catalog category filter symbols on the existing
-- RenderSourceImportCatalogView rail. This is not a new command/query rail.

update planning_query_store.feature_mechanization_local_rails
set
  symbol_refs = (
    select jsonb_agg(distinct symbol order by symbol)
    from jsonb_array_elements_text(
      symbol_refs || jsonb_build_array(
        'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts#SourceImportCatalogFilterId',
        'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts#SourceImportCatalogFilterViewModel',
        'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts#tableMatchesSourceImportFilter',
        'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts#buildSourceImportCatalogFilters',
        'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx#SourceImportCatalogFilterListProps',
        'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx#SourceImportCatalogFilterList'
      )
    ) as refs(symbol)
  ),
  implementation_refs = (
    select jsonb_agg(distinct ref order by ref)
    from jsonb_array_elements_text(
      implementation_refs || jsonb_build_array(
        'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts',
        'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts',
        'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx',
        'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.tsx',
        'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx',
        'apps/web/src/app/components/sourceImportWizard/SelectionStep.tsx',
        'apps/web/cypress/e2e/canvas/canvas-source-import-contextual.cy.ts',
        'tools/planning-db/migrations/540_source_import_catalog_filter_symbols.sql'
      )
    ) as refs(ref)
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct surface order by surface)
    from jsonb_array_elements_text(
      allowed_implementation_surfaces || jsonb_build_array(
        'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts',
        'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts',
        'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx',
        'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.tsx',
        'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx',
        'apps/web/src/app/components/sourceImportWizard/SelectionStep.tsx',
        'apps/web/cypress/e2e/canvas/canvas-source-import-contextual.cy.ts',
        'tools/planning-db/migrations/540_source_import_catalog_filter_symbols.sql'
      )
    ) as refs(surface)
  ),
  architecture_guards = (
    select jsonb_agg(distinct guard order by guard)
    from jsonb_array_elements_text(
      architecture_guards || jsonb_build_array(
        'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts',
        'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx',
        'apps/web/cypress/e2e/canvas/canvas-source-import-contextual.cy.ts'
      )
    ) as refs(guard)
  ),
  completion_gate = jsonb_set(
    completion_gate,
    '{tests}',
    (
      select jsonb_agg(distinct test_command order by test_command)
      from jsonb_array_elements_text(
        coalesce(completion_gate->'tests', '[]'::jsonb) || jsonb_build_array(
          'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts',
          'pnpm --filter @dvt/web test:presentation:run -- src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx src/app/components/sourceImportWizard/SourceImportActiveTableMetadata.test.tsx src/app/components/sourceImportWizard/SourceImportSectionTabs.test.tsx',
          'pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/canvas/canvas-source-import-contextual.cy.ts'
        )
      ) as refs(test_command)
    ),
    true
  ),
  raw_manifest = raw_manifest || jsonb_build_object(
    'categoryFilterSemantics',
    jsonb_build_object(
      'scope', 'Current source catalog result set',
      'filters', jsonb_build_array('all', 'selected', 'withColumns', 'withSize'),
      'rail', 'RenderSourceImportCatalogView',
      'noBackendContractChange', true
    ),
    'symbols',
    coalesce(raw_manifest->'symbols', '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'name', 'SourceImportCatalogFilterId',
        'path', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals', jsonb_build_array('explicit_vocabulary', 'closed_set'),
        'architectureGuard', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-contextual.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts')
      ),
      jsonb_build_object(
        'name', 'SourceImportCatalogFilterViewModel',
        'path', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals', jsonb_build_array('read_model_projection', 'presentation_contract'),
        'architectureGuard', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-contextual.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts')
      ),
      jsonb_build_object(
        'name', 'tableMatchesSourceImportFilter',
        'path', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals', jsonb_build_array('pure_function', 'set_membership'),
        'architectureGuard', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-contextual.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts')
      ),
      jsonb_build_object(
        'name', 'buildSourceImportCatalogFilters',
        'path', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals', jsonb_build_array('read_model_projection', 'closed_set'),
        'architectureGuard', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-contextual.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts')
      ),
      jsonb_build_object(
        'name', 'SourceImportCatalogFilterListProps',
        'path', 'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals', jsonb_build_array('presentation_contract'),
        'architectureGuard', 'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-contextual.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx')
      ),
      jsonb_build_object(
        'name', 'SourceImportCatalogFilterList',
        'path', 'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals', jsonb_build_array('presentation_component', 'single_responsibility'),
        'architectureGuard', 'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx',
        'unitTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx'),
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-contextual.cy.ts'
      )
    )
  ),
  source_path = 'tools/planning-db/migrations/540_source_import_catalog_filter_symbols.sql',
  source_content_sha256 = md5('E-CANVAS-ADD-SOURCE-CATALOG-CATEGORIES-1:catalog-filter-symbols:540'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-ADD-SOURCE-CATALOG-CATEGORIES-1'
  and rail_name = 'RenderSourceImportCatalogView';

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
  'EV-SOURCE-IMPORT-CATALOG-FILTERS',
  'e2e-test',
  'current',
  'apps/web/cypress/e2e/canvas/canvas-source-import-contextual.cy.ts',
  'RenderSourceImportCatalogView',
  'source-import-browse',
  'Browse exposes category filters and filters source tables by recorded metadata before selection.',
  jsonb_build_object(
    'filters', jsonb_build_array('all', 'selected', 'withColumns', 'withSize'),
    'noWorkspaceDraftIntercept', true
  ),
  'tools/planning-db/migrations/540_source_import_catalog_filter_symbols.sql',
  md5('EV-SOURCE-IMPORT-CATALOG-FILTERS:540')
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
