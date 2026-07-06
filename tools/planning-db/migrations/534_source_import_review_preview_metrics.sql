-- Register Source Import review preview metrics as DB-first component evidence.
-- The review presenter belongs to SourceImportDialog because it prepares the
-- ImportWarehouseSources command review surface; the catalog query-view remains
-- the owner of raw browse/search projection.

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
    'web.component.canvas.SourceImportDialog',
    'apps/web/src/app/components/sourceImportWizard/sourceImportReviewModel.ts',
    'model',
    'buildSourceImportReviewPreviewGroups',
    jsonb_build_object(
      'responsibility', 'Project selected source tables into attachment-review groups with catalog-owned table metrics.',
      'rail', 'ImportWarehouseSources',
      'fowlerSignal', 'separate_review_projection_from_jsx_rendering',
      'usesCatalogReadModel', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts'
    ),
    'tools/planning-db/migrations/534_source_import_review_preview_metrics.sql',
    md5('file:SourceImportDialog:sourceImportReviewModel:534')
  ),
  (
    'web.component.canvas.SourceImportDialog',
    'apps/web/src/app/components/sourceImportWizard/sourceImportReviewModel.test.ts',
    'unit-test',
    null,
    jsonb_build_object(
      'coverage', 'Review presenter groups selected source tables and preserves row, byte-size, and column metrics.',
      'rail', 'ImportWarehouseSources'
    ),
    'tools/planning-db/migrations/534_source_import_review_preview_metrics.sql',
    md5('file:SourceImportDialog:sourceImportReviewModel.test:534')
  ),
  (
    'web.component.canvas.SourceImportDialog',
    'apps/web/src/app/components/sourceImportWizard/SourceImportReviewView.test.tsx',
    'presentation-test',
    null,
    jsonb_build_object(
      'coverage', 'Review view renders attachment preview metrics from projected view models instead of raw TableInfo.',
      'rail', 'ImportWarehouseSources'
    ),
    'tools/planning-db/migrations/534_source_import_review_preview_metrics.sql',
    md5('file:SourceImportDialog:SourceImportReviewView.test:534')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = coalesce(planning_query_store.frontend_component_local_files.raw_file, '{}'::jsonb)
    || excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.feature_mechanization_local_rails (
  rail_id,
  feature_id,
  mechanization_status,
  rail_name,
  normalized_rail_name,
  rail_type,
  ddd_owner,
  rail_status,
  symbol_refs,
  implementation_refs,
  documentation_refs,
  governing_sources,
  allowed_implementation_surfaces,
  architecture_guards,
  completion_gate,
  source_path,
  source_content_sha256,
  raw_rail,
  raw_manifest,
  revision,
  created_by
)
values (
  'local#E-CANVAS-SOURCE-IMPORT-CATALOG-UX-1#command#importwarehousesources',
  'E-CANVAS-SOURCE-IMPORT-CATALOG-UX-1',
  'implemented',
  'ImportWarehouseSources',
  'importwarehousesources',
  'command',
  'web.component.canvas.SourceImportDialog',
  'implemented',
  jsonb_build_array(
    'apps/web/src/app/components/sourceImportWizard/sourceImportReviewModel.ts#SourceImportReviewPreviewGroupViewModel',
    'apps/web/src/app/components/sourceImportWizard/sourceImportReviewModel.ts#buildSourceImportReviewPreviewGroups',
    'apps/web/src/app/components/sourceImportWizard/ReviewStep.tsx#ReviewStep',
    'apps/web/src/app/components/sourceImportWizard/SourceImportReviewView.tsx#SourceImportReviewView',
    'apps/web/src/app/components/sourceImportWizard/SourceImportReviewView.tsx#SourceImportAttachmentPreview'
  ),
  jsonb_build_array(
    'apps/web/src/app/components/sourceImportWizard/sourceImportReviewModel.ts',
    'apps/web/src/app/components/sourceImportWizard/sourceImportReviewModel.test.ts',
    'apps/web/src/app/components/sourceImportWizard/ReviewStep.tsx',
    'apps/web/src/app/components/sourceImportWizard/SourceImportReviewView.tsx',
    'apps/web/src/app/components/sourceImportWizard/SourceImportReviewView.test.tsx',
    'scripts/planning-db-migrate.test.cjs',
    'tools/planning-db/migrations/534_source_import_review_preview_metrics.sql'
  ),
  jsonb_build_array(
    'planning-db:task/E-CANVAS-SOURCE-IMPORT-CATALOG-UX-1',
    'planning-db:rail/ImportWarehouseSources',
    'planning-db:component/web.component.canvas.SourceImportDialog'
  ),
  jsonb_build_array(
    'AGENTS.md',
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/guides/ai-work-protocol.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md',
    'docs/planning/proposals/mandatory/frontend-and-ux/e-source-import-commercial-hardening-plan-20260531.md',
    'docs/adr/ADR-0058-warehouse-source-import-rails.md'
  ),
  jsonb_build_array(
    'apps/web/src/app/components/sourceImportWizard/sourceImportReviewModel.ts',
    'apps/web/src/app/components/sourceImportWizard/sourceImportReviewModel.test.ts',
    'apps/web/src/app/components/sourceImportWizard/ReviewStep.tsx',
    'apps/web/src/app/components/sourceImportWizard/SourceImportReviewView.tsx',
    'apps/web/src/app/components/sourceImportWizard/SourceImportReviewView.test.tsx',
    'scripts/planning-db-migrate.test.cjs',
    'tools/planning-db/migrations/534_source_import_review_preview_metrics.sql'
  ),
  jsonb_build_array(
    'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/components/sourceImportWizard/sourceImportReviewModel.test.ts',
    'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/sourceImportWizard/SourceImportReviewView.test.tsx',
    'node --test --test-name-pattern "source import review preview metrics" scripts/planning-db-migrate.test.cjs',
    'pnpm docs:feature-mechanization:implementation'
  ),
  jsonb_build_object(
    'tests',
    jsonb_build_array(
      'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/components/sourceImportWizard/sourceImportReviewModel.test.ts',
      'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/sourceImportWizard/SourceImportReviewView.test.tsx',
      'pnpm --filter @dvt/web test:e2e:source-import:live',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ),
    'noHumanDecisionsRemaining',
    true
  ),
  'tools/planning-db/migrations/534_source_import_review_preview_metrics.sql',
  md5('E-CANVAS-SOURCE-IMPORT-CATALOG-UX-1:source-import-review-preview-metrics:534'),
  jsonb_build_object(
    'purpose', 'Render Source Import selected-source review with catalog-owned metrics before ImportWarehouseSources is submitted.',
    'owner', 'web.component.canvas.SourceImportDialog',
    'command', 'ImportWarehouseSources'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'E-CANVAS-SOURCE-IMPORT-CATALOG-UX-1',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan', 'Project selected warehouse sources into review preview groups before rendering so the dialog shows row count, byte size, and column count without deriving review state inside JSX.',
    'componentGuides', jsonb_build_array(
      'web.component.canvas.SourceImportDialog',
      'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW'
    ),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/guides/ai-work-protocol.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md',
      'docs/planning/proposals/mandatory/frontend-and-ux/e-source-import-commercial-hardening-plan-20260531.md',
      'docs/adr/ADR-0058-warehouse-source-import-rails.md'
    ),
    'allowedImplementationSurfaces', jsonb_build_array(
      'apps/web/src/app/components/sourceImportWizard/sourceImportReviewModel.ts',
      'apps/web/src/app/components/sourceImportWizard/sourceImportReviewModel.test.ts',
      'apps/web/src/app/components/sourceImportWizard/ReviewStep.tsx',
      'apps/web/src/app/components/sourceImportWizard/SourceImportReviewView.tsx',
      'apps/web/src/app/components/sourceImportWizard/SourceImportReviewView.test.tsx',
      'scripts/planning-db-migrate.test.cjs',
      'tools/planning-db/migrations/534_source_import_review_preview_metrics.sql'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'apps/web/cypress/e2e/canvas/**#cy.intercept_workspace_graph_draft',
      'apps/web/src/app/components/sourceImportWizard/**#invented_metrics',
      'apps/api/**'
    ),
    'domainObjects', jsonb_build_array(
      'SourceImportReviewPreviewGroupViewModel',
      'SourceImportTableViewModel',
      'ImportWarehouseSourcesInput'
    ),
    'fowlerSignals', jsonb_build_array(
      'presentation_model',
      'separate_view_from_projection',
      'single_source_of_truth',
      'no_invented_metrics'
    ),
    'architectureGuards', jsonb_build_array(
      'apps/web/src/app/components/sourceImportWizard/sourceImportReviewModel.test.ts',
      'apps/web/src/app/components/sourceImportWizard/SourceImportReviewView.test.tsx',
      'scripts/planning-db-migrate.test.cjs'
    ),
    'cypressFlows', jsonb_build_array(
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'
    ),
    'completionGate', jsonb_build_array(
      'pnpm planning:db:migrate',
      'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/components/sourceImportWizard/sourceImportReviewModel.test.ts',
      'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/sourceImportWizard/SourceImportReviewView.test.tsx',
      'node --test --test-name-pattern "source import review preview metrics" scripts/planning-db-migrate.test.cjs',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object('name', 'ImportWarehouseSources', 'type', 'command', 'dddOwner', 'web.component.canvas.SourceImportDialog')
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'SOURCE-IMPORT-REVIEW-METRICS-MODEL-001',
        'redTest', 'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/components/sourceImportWizard/sourceImportReviewModel.test.ts',
        'expectedFailure', 'Source Import review preview presenter did not exist.',
        'patchSurfaces', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/sourceImportReviewModel.ts'),
        'greenTest', 'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/components/sourceImportWizard/sourceImportReviewModel.test.ts'
      ),
      jsonb_build_object(
        'id', 'SOURCE-IMPORT-REVIEW-METRICS-VIEW-001',
        'redTest', 'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/sourceImportWizard/SourceImportReviewView.test.tsx',
        'expectedFailure', 'Source Import review view expected raw TableInfo tuples and did not render row/byte metrics from projected groups.',
        'patchSurfaces', jsonb_build_array(
          'apps/web/src/app/components/sourceImportWizard/ReviewStep.tsx',
          'apps/web/src/app/components/sourceImportWizard/SourceImportReviewView.tsx'
        ),
        'greenTest', 'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/sourceImportWizard/SourceImportReviewView.test.tsx'
      )
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object(
        'name', 'SourceImportReviewPreviewGroupViewModel',
        'path', 'apps/web/src/app/components/sourceImportWizard/sourceImportReviewModel.ts',
        'dddOwner', 'web.component.canvas.SourceImportDialog',
        'cqRails', jsonb_build_array('ImportWarehouseSources'),
        'fowlerSignals', jsonb_build_array('presentation_model', 'parameter_object'),
        'architectureGuard', 'apps/web/src/app/components/sourceImportWizard/sourceImportReviewModel.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/sourceImportReviewModel.test.ts')
      ),
      jsonb_build_object(
        'name', 'buildSourceImportReviewPreviewGroups',
        'path', 'apps/web/src/app/components/sourceImportWizard/sourceImportReviewModel.ts',
        'dddOwner', 'web.component.canvas.SourceImportDialog',
        'cqRails', jsonb_build_array('ImportWarehouseSources'),
        'fowlerSignals', jsonb_build_array('read_model_projection', 'extract_function'),
        'architectureGuard', 'apps/web/src/app/components/sourceImportWizard/sourceImportReviewModel.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/sourceImportReviewModel.test.ts')
      )
    )
  ),
  0,
  'codex'
)
on conflict (rail_id) do update set
  mechanization_status = excluded.mechanization_status,
  rail_status = excluded.rail_status,
  symbol_refs = excluded.symbol_refs,
  implementation_refs = excluded.implementation_refs,
  allowed_implementation_surfaces = excluded.allowed_implementation_surfaces,
  architecture_guards = excluded.architecture_guards,
  completion_gate = excluded.completion_gate,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  raw_rail = excluded.raw_rail,
  raw_manifest = excluded.raw_manifest,
  revision = planning_query_store.feature_mechanization_local_rails.revision + 1,
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
    'web.component.canvas.SourceImportDialog',
    'EV-SOURCE-IMPORT-REVIEW-PREVIEW-METRICS-MODEL',
    'unit-test',
    'current',
    'apps/web/src/app/components/sourceImportWizard/sourceImportReviewModel.test.ts',
    'ImportWarehouseSources',
    'source-import-review-preview-metrics',
    'The Source Import review model groups selected tables and preserves row, byte-size, and column metrics before render.',
    jsonb_build_object('redGreen', true, 'noInventedMetrics', true),
    'tools/planning-db/migrations/534_source_import_review_preview_metrics.sql',
    md5('evidence:source-import-review-preview-metrics-model:534')
  ),
  (
    'web.component.canvas.SourceImportDialog',
    'EV-SOURCE-IMPORT-REVIEW-PREVIEW-METRICS-VIEW',
    'presentation-test',
    'current',
    'apps/web/src/app/components/sourceImportWizard/SourceImportReviewView.test.tsx',
    'ImportWarehouseSources',
    'source-import-review-preview-metrics',
    'The Source Import review view renders row, byte-size, and column metrics from projected review groups.',
    jsonb_build_object('redGreen', true, 'viewConsumesPresenterModel', true),
    'tools/planning-db/migrations/534_source_import_review_preview_metrics.sql',
    md5('evidence:source-import-review-preview-metrics-view:534')
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
