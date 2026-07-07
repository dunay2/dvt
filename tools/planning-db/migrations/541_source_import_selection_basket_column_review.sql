-- Extend the existing Add Source selected-basket component so selected tables
-- expose column metadata before ImportWarehouseSources runs. This reuses the
-- RenderSourceImportCatalogView rail and does not create a new backend rail.

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
    'apps/web/src/app/components/sourceImportWizard/SourceImportSelectionBasket.tsx',
    'presentation',
    'SourceImportSelectionBasket',
    jsonb_build_object(
      'responsibility',
      'Render selected warehouse source tables with removable basket entries and column metadata evidence before import.',
      'rail',
      'RenderSourceImportCatalogView',
      'exports',
      jsonb_build_array('SourceImportSelectionBasket'),
      'privateSymbols',
      jsonb_build_array(
        'selectedSourceColumnPreviewLimit',
        'SourceImportSelectedColumnPreview'
      ),
      'stableSelectors',
      jsonb_build_array('data-source-import-selected-column'),
      'fowlerSignal',
      'presentation_component_with_selected_source_metadata'
    ),
    'tools/planning-db/migrations/541_source_import_selection_basket_column_review.sql',
    md5('file:source-import-selection-basket-column-review:541')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'apps/web/src/app/components/sourceImportWizard/SourceImportSelectionBasket.test.tsx',
    'presentation-test',
    null,
    jsonb_build_object(
      'coverage',
      'Selected source basket renders column names, types, constraints, and missing-column metadata before import.',
      'rail',
      'RenderSourceImportCatalogView',
      'asserts',
      jsonb_build_array(
        'data-source-import-selected-column',
        'selected table column type',
        'selected table column constraint labels',
        'selected table missing-column metadata label'
      )
    ),
    'tools/planning-db/migrations/541_source_import_selection_basket_column_review.sql',
    md5('file:source-import-selection-basket-column-review-test:541')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'apps/web/src/app/components/sourceImportWizard/copy.ts',
    'copy-contract',
    'sourceImportWizardCopy.selectionBasket',
    jsonb_build_object(
      'responsibility',
      'Own selected-source basket copy for column review and missing metadata states.',
      'rail',
      'RenderSourceImportCatalogView',
      'tokens',
      jsonb_build_array(
        'noColumns',
        'moreColumnsPrefix',
        'moreColumnsSuffix'
      )
    ),
    'tools/planning-db/migrations/541_source_import_selection_basket_column_review.sql',
    md5('file:source-import-selection-basket-column-review-copy:541')
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
  'EV-SOURCE-IMPORT-SELECTION-BASKET-COLUMN-REVIEW',
  'presentation-test',
  'current',
  'apps/web/src/app/components/sourceImportWizard/SourceImportSelectionBasket.test.tsx',
  'RenderSourceImportCatalogView',
  'source-import-selected-basket-column-review',
  'The selected-source basket exposes column names, types, constraints, and missing-column metadata before the import command is submitted.',
  jsonb_build_object(
    'componentOwner',
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'selector',
    'data-source-import-selected-column',
    'redGreen',
    true
  ),
  'tools/planning-db/migrations/541_source_import_selection_basket_column_review.sql',
  md5('evidence:source-import-selection-basket-column-review:541')
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
    'SourceImportSelectionBasket',
    'readModel',
    'SelectedWarehouseSourceBasket',
    'applicationPort',
    'SourceImportCatalogViewModel',
    'adapterSurface',
    'apps/web/src/app/components/sourceImportWizard/SourceImportSelectionBasket.tsx',
    'scope',
    'canvas_add_source_dialog_selected_sources',
    'authorization',
    'inherits_workspace_source_import_permissions',
    'negativeTests',
    jsonb_build_array(
      'selected source without column metadata renders an explicit unavailable state',
      'selected source column selector identity uses canonical table name plus column name'
    )
  ),
  'tools/planning-db/migrations/541_source_import_selection_basket_column_review.sql',
  md5('rail:RenderSourceImportCatalogView:selected-basket-column-review:541')
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
  where feature_id = 'E-CANVAS-ADD-SOURCE-BASKET-REMOVE-1'
    and rail_name = 'RenderSourceImportCatalogView'
),
symbol_refs(ref) as (
  values
    ('apps/web/src/app/components/sourceImportWizard/SourceImportSelectionBasket.tsx#selectedSourceColumnPreviewLimit'),
    ('apps/web/src/app/components/sourceImportWizard/SourceImportSelectionBasket.tsx#SourceImportSelectedColumnPreview'),
    ('apps/web/src/app/components/sourceImportWizard/copy.ts#sourceImportWizardCopy.selectionBasket')
),
implementation_refs(ref) as (
  values
    ('apps/web/src/app/components/sourceImportWizard/SourceImportSelectionBasket.tsx'),
    ('apps/web/src/app/components/sourceImportWizard/SourceImportSelectionBasket.test.tsx'),
    ('apps/web/src/app/components/sourceImportWizard/copy.ts'),
    ('apps/web/cypress/e2e/canvas/canvas-source-import-contextual.cy.ts'),
    ('scripts/planning-db-migrate.test.cjs'),
    ('tools/planning-db/migrations/541_source_import_selection_basket_column_review.sql')
),
guard_refs(ref) as (
  values
    ('apps/web/src/app/components/sourceImportWizard/SourceImportSelectionBasket.test.tsx'),
    ('apps/web/cypress/e2e/canvas/canvas-source-import-contextual.cy.ts'),
    ('scripts/planning-db-migrate.test.cjs')
),
completion_tests(ref) as (
  values
    ('pnpm --filter @dvt/web test:presentation:run -- src/app/components/sourceImportWizard/SourceImportSelectionBasket.test.tsx'),
    ('pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/canvas/canvas-source-import-contextual.cy.ts'),
    ('node --test --test-name-pattern "source import selection basket column review" scripts/planning-db-migrate.test.cjs'),
    ('pnpm docs:feature-mechanization:implementation'),
    ('pnpm verify:prepush')
),
new_symbols(symbol) as (
  values
    (
      jsonb_build_object(
        'name',
        'selectedSourceColumnPreviewLimit',
        'path',
        'apps/web/src/app/components/sourceImportWizard/SourceImportSelectionBasket.tsx',
        'dddOwner',
        'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails',
        jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals',
        jsonb_build_array('bounded_preview', 'presentation_constant'),
        'architectureGuard',
        'apps/web/src/app/components/sourceImportWizard/SourceImportSelectionBasket.test.tsx',
        'cypressCoverage',
        'apps/web/cypress/e2e/canvas/canvas-source-import-contextual.cy.ts',
        'unitTests',
        jsonb_build_array(
          'apps/web/src/app/components/sourceImportWizard/SourceImportSelectionBasket.test.tsx'
        )
      )
    ),
    (
      jsonb_build_object(
        'name',
        'SourceImportSelectedColumnPreview',
        'path',
        'apps/web/src/app/components/sourceImportWizard/SourceImportSelectionBasket.tsx',
        'dddOwner',
        'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails',
        jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals',
        jsonb_build_array('private_presentation_component', 'single_responsibility'),
        'architectureGuard',
        'apps/web/src/app/components/sourceImportWizard/SourceImportSelectionBasket.test.tsx',
        'cypressCoverage',
        'apps/web/cypress/e2e/canvas/canvas-source-import-contextual.cy.ts',
        'unitTests',
        jsonb_build_array(
          'apps/web/src/app/components/sourceImportWizard/SourceImportSelectionBasket.test.tsx'
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
        'selectedBasketColumnReview',
        jsonb_build_object(
          'component',
          'SourceImportSelectionBasket',
          'selector',
          'data-source-import-selected-column',
          'rail',
          'RenderSourceImportCatalogView',
          'noBackendContractChange',
          true
        )
      ),
    '{symbols}',
    coalesce(patched.manifest_symbols, '[]'::jsonb),
    true
  ),
  source_path = 'tools/planning-db/migrations/541_source_import_selection_basket_column_review.sql',
  source_content_sha256 = md5(
    'source-import-selection-basket-column-review:541:' || rail.rail_id
  ),
  revision = rail.revision + 1,
  updated_at = now()
from patched
where rail.rail_id = patched.rail_id;
