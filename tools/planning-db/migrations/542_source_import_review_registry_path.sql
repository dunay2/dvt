-- Show the governed source registry path in the Add Source review step.
-- This is presentation/read-model evidence for the existing ImportWarehouseSources
-- command and must not create a second source-import command rail.

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
    'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
    'apps/web/src/app/components/sourceImportWizard/SourceImportReviewView.tsx',
    'presentation-template',
    'SourceImportReviewView',
    jsonb_build_object(
      'responsibility',
      'Render selected-source review groups with the governed dbt source registry file path before ImportWarehouseSources runs.',
      'rail',
      'ImportWarehouseSources',
      'stableSelectors',
      jsonb_build_array('data-source-import-registry-path'),
      'exports',
      jsonb_build_array(
        'SourceImportReviewView',
        'SourceImportAttachmentPreview'
      ),
      'fowlerSignal',
      'presentation_template_with_registry_destination_evidence'
    ),
    'tools/planning-db/migrations/542_source_import_review_registry_path.sql',
    md5('file:source-import-review-registry-path-view:542')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
    'apps/web/src/app/components/sourceImportWizard/SourceImportReviewView.test.tsx',
    'presentation-test',
    null,
    jsonb_build_object(
      'coverage',
      'Selected-source review renders the governed dbt source registry file path and stable selector before import.',
      'rail',
      'ImportWarehouseSources',
      'asserts',
      jsonb_build_array(
        'sourceImportWizardCopy.review.registryFileLabel',
        'data-source-import-registry-path',
        'models/sources/src_erp.yml'
      )
    ),
    'tools/planning-db/migrations/542_source_import_review_registry_path.sql',
    md5('file:source-import-review-registry-path-test:542')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
    'read-model',
    'buildSourceImportRegistryPath',
    jsonb_build_object(
      'responsibility',
      'Resolve the dbt source registry path used by the review preview from the selected grouping strategy.',
      'rail',
      'ImportWarehouseSources',
      'exports',
      jsonb_build_array('buildSourceImportRegistryPath', 'buildPreviewGroups'),
      'invariant',
      'Schema grouping resolves to models/sources/src_<schema>.yml and database grouping resolves to models/sources/src_<database>.yml.',
      'fowlerSignal',
      'deterministic_review_read_model'
    ),
    'tools/planning-db/migrations/542_source_import_review_registry_path.sql',
    md5('file:source-import-review-registry-path-model:542')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
    'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
    'unit-test',
    null,
    jsonb_build_object(
      'coverage',
      'The source import wizard model resolves schema and database registry paths for review preview groups.',
      'rail',
      'ImportWarehouseSources',
      'asserts',
      jsonb_build_array(
        'buildSourceImportRegistryPath',
        'buildPreviewGroups'
      )
    ),
    'tools/planning-db/migrations/542_source_import_review_registry_path.sql',
    md5('file:source-import-review-registry-path-model-test:542')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
    'apps/web/src/app/components/sourceImportWizard/copy.ts',
    'copy-contract',
    'sourceImportWizardCopy.review.registryFileLabel',
    jsonb_build_object(
      'responsibility',
      'Own selected-source review copy for the registry file destination label.',
      'rail',
      'ImportWarehouseSources',
      'tokens',
      jsonb_build_array('registryFileLabel')
    ),
    'tools/planning-db/migrations/542_source_import_review_registry_path.sql',
    md5('file:source-import-review-registry-path-copy:542')
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
values
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
    'EV-SOURCE-IMPORT-REVIEW-REGISTRY-PATH-PRESENTATION',
    'presentation-test',
    'current',
    'apps/web/src/app/components/sourceImportWizard/SourceImportReviewView.test.tsx',
    'ImportWarehouseSources',
    'source-import-review-registry-path',
    'The Add Source review step renders the governed registry file path for selected source groups before import.',
    jsonb_build_object(
      'selector',
      'data-source-import-registry-path',
      'examplePath',
      'models/sources/src_erp.yml',
      'redGreen',
      true
    ),
    'tools/planning-db/migrations/542_source_import_review_registry_path.sql',
    md5('evidence:source-import-review-registry-path-presentation:542')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
    'EV-SOURCE-IMPORT-REVIEW-REGISTRY-PATH-E2E',
    'e2e-test',
    'current',
    'apps/web/cypress/e2e/canvas/canvas-source-import-contextual.cy.ts',
    'ImportWarehouseSources',
    'source-import-review-registry-path',
    'The contextual Add Source browser flow verifies the registry file path before submitting ImportWarehouseSources.',
    jsonb_build_object(
      'selector',
      'data-source-import-registry-path',
      'flow',
      'canvas-context-menu-add-source-review-attach'
    ),
    'tools/planning-db/migrations/542_source_import_review_registry_path.sql',
    md5('evidence:source-import-review-registry-path-e2e:542')
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

with target_rails as (
  select rail_id
  from planning_query_store.feature_mechanization_local_rails
  where feature_id = 'E-CANVAS-ADD-SOURCE-REVIEW-TEMPLATE-1'
),
symbol_refs(ref) as (
  values
    ('apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts#buildSourceImportRegistryPath'),
    ('apps/web/src/app/components/sourceImportWizard/SourceImportReviewView.tsx#SourceImportAttachmentPreview'),
    ('apps/web/src/app/components/sourceImportWizard/copy.ts#sourceImportWizardCopy.review.registryFileLabel')
),
implementation_refs(ref) as (
  values
    ('apps/web/src/app/components/sourceImportWizard/SourceImportReviewView.tsx'),
    ('apps/web/src/app/components/sourceImportWizard/SourceImportReviewView.test.tsx'),
    ('apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts'),
    ('apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts'),
    ('apps/web/src/app/components/sourceImportWizard/copy.ts'),
    ('apps/web/cypress/e2e/canvas/canvas-source-import-contextual.cy.ts'),
    ('scripts/planning-db-migrate.test.cjs'),
    ('tools/planning-db/migrations/542_source_import_review_registry_path.sql')
),
guard_refs(ref) as (
  values
    ('apps/web/src/app/components/sourceImportWizard/SourceImportReviewView.test.tsx'),
    ('apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts'),
    ('apps/web/cypress/e2e/canvas/canvas-source-import-contextual.cy.ts'),
    ('scripts/planning-db-migrate.test.cjs')
),
completion_tests(ref) as (
  values
    ('pnpm --filter @dvt/web test:presentation:run -- src/app/components/sourceImportWizard/SourceImportReviewView.test.tsx'),
    ('pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts'),
    ('pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/canvas/canvas-source-import-contextual.cy.ts'),
    ('node --test --test-name-pattern "source import review registry path" scripts/planning-db-migrate.test.cjs'),
    ('pnpm docs:feature-mechanization:implementation'),
    ('pnpm verify:prepush')
),
new_symbols(symbol) as (
  values
    (
      jsonb_build_object(
        'name',
        'buildSourceImportRegistryPath',
        'path',
        'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
        'dddOwner',
        'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
        'cqRails',
        jsonb_build_array('ImportWarehouseSources'),
        'fowlerSignals',
        jsonb_build_array('deterministic_read_model', 'review_destination_policy'),
        'architectureGuard',
        'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
        'cypressCoverage',
        'apps/web/cypress/e2e/canvas/canvas-source-import-contextual.cy.ts',
        'unitTests',
        jsonb_build_array(
          'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
          'apps/web/src/app/components/sourceImportWizard/SourceImportReviewView.test.tsx'
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
        'reviewRegistryPath',
        jsonb_build_object(
          'component',
          'SourceImportReviewView',
          'selector',
          'data-source-import-registry-path',
          'rail',
          'ImportWarehouseSources',
          'canonicalCommandOwner',
          'api.component.warehouseSourceImport.ImportWarehouseSourcesUseCase',
          'noNewBackendContract',
          true
        )
      ),
    '{symbols}',
    coalesce(patched.manifest_symbols, '[]'::jsonb),
    true
  ),
  source_path = 'tools/planning-db/migrations/542_source_import_review_registry_path.sql',
  source_content_sha256 = md5(
    'source-import-review-registry-path:542:' || rail.rail_id
  ),
  revision = rail.revision + 1,
  updated_at = now()
from patched
where rail.rail_id = patched.rail_id;
