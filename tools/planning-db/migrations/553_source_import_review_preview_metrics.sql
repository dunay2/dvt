-- Keep the Source Import review step DB-first while moving metric projection
-- out of the presentation template. This extends the existing
-- ImportWarehouseSources review rail; it does not create a duplicate command.

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
    'apps/web/src/app/components/sourceImportWizard/sourceImportReviewModel.ts',
    'read-model',
    'buildSourceImportReviewPreviewGroups',
    jsonb_build_object(
      'responsibility',
      'Build selected-source review groups with registry path, table count, row count, byte size, and column-count labels before ImportWarehouseSources runs.',
      'rail',
      'ImportWarehouseSources',
      'exports',
      jsonb_build_array(
        'SourceImportReviewPreviewGroupViewModel',
        'buildSourceImportReviewPreviewGroups'
      ),
      'fowlerSignal',
      'review_read_model_separates_projection_from_presentation'
    ),
    'tools/planning-db/migrations/553_source_import_review_preview_metrics.sql',
    md5('file:source-import-review-metrics-model:553')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
    'apps/web/src/app/components/sourceImportWizard/sourceImportReviewModel.test.ts',
    'unit-test',
    null,
    jsonb_build_object(
      'coverage',
      'Selected-source review groups preserve registry paths and table metrics while excluding unselected tables.',
      'rail',
      'ImportWarehouseSources',
      'asserts',
      jsonb_build_array(
        'buildSourceImportReviewPreviewGroups',
        'models/sources/src_raw.yml',
        '1,500 rows',
        '3.9 MB'
      )
    ),
    'tools/planning-db/migrations/553_source_import_review_preview_metrics.sql',
    md5('file:source-import-review-metrics-model-test:553')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
    'apps/web/src/app/components/sourceImportWizard/SourceImportReviewView.tsx',
    'presentation-template',
    'SourceImportReviewView',
    jsonb_build_object(
      'responsibility',
      'Render the selected-source review read model without rebuilding table metrics inside JSX.',
      'rail',
      'ImportWarehouseSources',
      'stableSelectors',
      jsonb_build_array(
        'data-source-import-registry-path',
        'data-source-import-review-table'
      ),
      'fowlerSignal',
      'presentation_template_consumes_view_model'
    ),
    'tools/planning-db/migrations/553_source_import_review_preview_metrics.sql',
    md5('file:source-import-review-metrics-view:553')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
    'apps/web/src/app/components/sourceImportWizard/SourceImportReviewView.test.tsx',
    'presentation-test',
    null,
    jsonb_build_object(
      'coverage',
      'Review presentation renders registry path plus row, size, and column metrics from the supplied view model.',
      'rail',
      'ImportWarehouseSources',
      'asserts',
      jsonb_build_array(
        'data-source-import-review-table',
        '1,500 rows',
        '3.9 MB',
        'models/sources/src_erp.yml'
      )
    ),
    'tools/planning-db/migrations/553_source_import_review_preview_metrics.sql',
    md5('file:source-import-review-metrics-view-test:553')
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
    'EV-SOURCE-IMPORT-REVIEW-METRICS-MODEL',
    'unit-test',
    'current',
    'apps/web/src/app/components/sourceImportWizard/sourceImportReviewModel.test.ts',
    'ImportWarehouseSources',
    'source-import-review-preview-metrics',
    'The review read model preserves registry paths and table metrics before source attachment.',
    jsonb_build_object(
      'selector',
      'buildSourceImportReviewPreviewGroups',
      'metrics',
      jsonb_build_array('rowCountLabel', 'byteSizeLabel', 'columnCountLabel'),
      'redGreen',
      true
    ),
    'tools/planning-db/migrations/553_source_import_review_preview_metrics.sql',
    md5('evidence:source-import-review-metrics-model:553')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
    'EV-SOURCE-IMPORT-REVIEW-METRICS-PRESENTATION',
    'presentation-test',
    'current',
    'apps/web/src/app/components/sourceImportWizard/SourceImportReviewView.test.tsx',
    'ImportWarehouseSources',
    'source-import-review-preview-metrics',
    'The review template renders table row count, byte size, and column count from the review view model.',
    jsonb_build_object(
      'selector',
      'data-source-import-review-table',
      'expectedText',
      jsonb_build_array('1,500 rows', '3.9 MB', '1 column'),
      'redGreen',
      true
    ),
    'tools/planning-db/migrations/553_source_import_review_preview_metrics.sql',
    md5('evidence:source-import-review-metrics-presentation:553')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
    'EV-SOURCE-IMPORT-REVIEW-METRICS-LIVE-E2E',
    'e2e-test',
    'current',
    'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
    'ImportWarehouseSources',
    'source-import-review-preview-metrics',
    'The live Add Source browser flow verifies selected-source row and byte metrics before attachment.',
    jsonb_build_object(
      'selector',
      'data-source-import-review-table',
      'expectedText',
      jsonb_build_array('3 rows', '32 KB', '3 columns'),
      'flow',
      'canvas-context-menu-add-source-live-review-attach'
    ),
    'tools/planning-db/migrations/553_source_import_review_preview_metrics.sql',
    md5('evidence:source-import-review-metrics-live-e2e:553')
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
  select *
  from planning_query_store.feature_mechanization_local_rails
  where feature_id in (
    'E-CANVAS-ADD-SOURCE-REVIEW-TEMPLATE-1',
    'E-CANVAS-ADD-SOURCE-LIVE-FLOW-1'
  )
),
symbol_refs(ref) as (
  values
    ('apps/web/src/app/components/sourceImportWizard/sourceImportReviewModel.ts#buildSourceImportReviewPreviewGroups'),
    ('apps/web/src/app/components/sourceImportWizard/SourceImportReviewView.tsx#SourceImportReviewSourceTableRow')
),
implementation_refs(ref) as (
  values
    ('apps/web/src/app/components/sourceImportWizard/ReviewStep.tsx'),
    ('apps/web/src/app/components/sourceImportWizard/SourceImportReviewView.tsx'),
    ('apps/web/src/app/components/sourceImportWizard/SourceImportReviewView.test.tsx'),
    ('apps/web/src/app/components/sourceImportWizard/sourceImportReviewModel.ts'),
    ('apps/web/src/app/components/sourceImportWizard/sourceImportReviewModel.test.ts'),
    ('apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'),
    ('scripts/planning-db-migrate.test.cjs'),
    ('tools/planning-db/migrations/553_source_import_review_preview_metrics.sql')
),
guard_refs(ref) as (
  values
    ('apps/web/src/app/components/sourceImportWizard/SourceImportReviewView.test.tsx'),
    ('apps/web/src/app/components/sourceImportWizard/sourceImportReviewModel.test.ts'),
    ('apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'),
    ('scripts/planning-db-migrate.test.cjs')
),
completion_tests(ref) as (
  values
    ('pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/sourceImportWizard/SourceImportReviewView.test.tsx'),
    ('pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/components/sourceImportWizard/sourceImportReviewModel.test.ts'),
    ('pnpm test:web:e2e:source-import:live'),
    ('node --test --test-name-pattern "source import review preview metrics" scripts/planning-db-migrate.test.cjs'),
    ('pnpm docs:feature-mechanization:implementation'),
    ('pnpm verify:prepush')
),
new_symbols(symbol) as (
  values
    (
      jsonb_build_object(
        'name',
        'buildSourceImportReviewPreviewGroups',
        'path',
        'apps/web/src/app/components/sourceImportWizard/sourceImportReviewModel.ts',
        'dddOwner',
        'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
        'cqRails',
        jsonb_build_array('ImportWarehouseSources'),
        'fowlerSignals',
        jsonb_build_array('review_read_model', 'presentation_logic_separation'),
        'architectureGuard',
        'apps/web/src/app/components/sourceImportWizard/sourceImportReviewModel.test.ts',
        'cypressCoverage',
        'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests',
        jsonb_build_array(
          'apps/web/src/app/components/sourceImportWizard/sourceImportReviewModel.test.ts',
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
  from target_rails rail
)
update planning_query_store.feature_mechanization_local_rails rail
set
  symbol_refs = patched.symbol_refs,
  implementation_refs = patched.implementation_refs,
  allowed_implementation_surfaces = patched.allowed_implementation_surfaces,
  architecture_guards = patched.architecture_guards,
  completion_gate = jsonb_set(
    case
      when jsonb_typeof(coalesce(rail.completion_gate, '{}'::jsonb)) = 'object'
        then coalesce(rail.completion_gate, '{}'::jsonb)
      else jsonb_build_object('legacyCompletionGate', rail.completion_gate)
    end,
    '{tests}',
    coalesce(patched.completion_tests, '[]'::jsonb),
    true
  ),
  raw_manifest = jsonb_set(
    coalesce(rail.raw_manifest, '{}'::jsonb)
      || jsonb_build_object(
        'reviewPreviewMetrics',
        jsonb_build_object(
          'component',
          'SourceImportReviewView',
          'readModel',
          'buildSourceImportReviewPreviewGroups',
          'selector',
          'data-source-import-review-table',
          'rail',
          'ImportWarehouseSources',
          'noNewBackendContract',
          true
        )
      ),
    '{symbols}',
    coalesce(patched.manifest_symbols, '[]'::jsonb),
    true
  ),
  source_path = 'tools/planning-db/migrations/553_source_import_review_preview_metrics.sql',
  source_content_sha256 = md5('source-import-review-preview-metrics:553:' || rail.rail_id),
  revision = greatest(rail.revision, 1) + 1,
  updated_at = now()
from patched
where rail.rail_id = patched.rail_id;
