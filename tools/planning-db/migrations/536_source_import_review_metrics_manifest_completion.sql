-- Complete Source Import review metrics feature manifest user stories.
-- 534 was already applied locally before the feature-mechanization checker
-- enforced userStories, so this preserves migration immutability.

update planning_query_store.feature_mechanization_local_rails
set
  raw_manifest = raw_manifest || jsonb_build_object(
    'userStories',
    jsonb_build_array(
      'As a DVT/Raven author, I can review selected warehouse sources with row and column metrics before attaching them to the canvas.',
      'As a demanding Canvas user, I can verify the selected source object in the live Add Source flow before ImportWarehouseSources mutates the graph.'
    ),
    'architectureGuards',
    jsonb_build_array(
      'apps/web/src/app/components/sourceImportWizard/sourceImportReviewModel.test.ts',
      'apps/web/src/app/components/sourceImportWizard/SourceImportReviewView.test.tsx',
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
      'scripts/planning-db-migrate.test.cjs'
    )
  ),
  source_path = 'tools/planning-db/migrations/536_source_import_review_metrics_manifest_completion.sql',
  source_content_sha256 = md5('E-CANVAS-SOURCE-IMPORT-CATALOG-UX-1:review-metrics-user-stories:536'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-SOURCE-IMPORT-CATALOG-UX-1'
  and rail_name = 'ImportWarehouseSources'
  and not (raw_manifest ? 'userStories');
