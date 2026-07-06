-- Attach live Cypress proof for Source Import selected-source review metrics.
-- 534 introduced the review presenter/model; this append-only migration records
-- the browser proof added after that migration had already been applied locally.

insert into planning_query_store.frontend_component_local_files (
  component_id,
  file_path,
  file_role,
  exported_symbol,
  raw_file,
  source_path,
  source_content_sha256
)
values (
  'web.component.canvas.SourceImportDialog',
  'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
  'e2e-test',
  'importLocalPostgresSource',
  jsonb_build_object(
    'coverage', 'Live Add Source flow proves selected-source review displays catalog-backed row and column metrics before ImportWarehouseSources submits.',
    'rail', 'ImportWarehouseSources',
    'assertedSelector', '[data-source-import-review-table="dvt.public.source_1"]',
    'forbidden', jsonb_build_array('cy.intercept(/workspace/graph/draft)', 'direct draft seeding')
  ),
  'tools/planning-db/migrations/535_source_import_review_live_metrics_evidence.sql',
  md5('file:SourceImportDialog:canvas-source-import-live-clean:535')
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
  'web.component.canvas.SourceImportDialog',
  'EV-SOURCE-IMPORT-REVIEW-PREVIEW-METRICS-LIVE',
  'e2e-test',
  'current',
  'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
  'ImportWarehouseSources',
  'source-import-review-preview-metrics',
  'The live Canvas Add Source flow reaches Selected sources and verifies source_1 shows 3 rows and 3 columns before attachment.',
  jsonb_build_object(
    'noDraftIntercepts', true,
    'liveProtectedRuntime', true,
    'assertedSelector', '[data-source-import-review-table="dvt.public.source_1"]'
  ),
  'tools/planning-db/migrations/535_source_import_review_live_metrics_evidence.sql',
  md5('evidence:source-import-review-preview-metrics-live:535')
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

update planning_query_store.feature_mechanization_local_rails
set
  implementation_refs = (
    select jsonb_agg(distinct ref order by ref)
    from jsonb_array_elements_text(
      implementation_refs || jsonb_build_array(
        'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'tools/planning-db/migrations/535_source_import_review_live_metrics_evidence.sql'
      )
    ) as refs(ref)
  ),
  raw_manifest = jsonb_set(
    jsonb_set(
      raw_manifest,
      '{cypressFlows}',
      (
        select jsonb_agg(distinct ref order by ref)
        from jsonb_array_elements_text(
          coalesce(raw_manifest->'cypressFlows', '[]'::jsonb)
          || jsonb_build_array('apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts')
        ) as refs(ref)
      ),
      true
    ),
    '{symbols}',
    (
      select jsonb_agg(
        case
          when symbol->>'name' in (
            'SourceImportReviewPreviewGroupViewModel',
            'buildSourceImportReviewPreviewGroups'
          )
          then symbol || jsonb_build_object(
            'cypressCoverage',
            'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'
          )
          else symbol
        end
      )
      from jsonb_array_elements(coalesce(raw_manifest->'symbols', '[]'::jsonb)) as symbol
    ),
    true
  ),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-SOURCE-IMPORT-CATALOG-UX-1'
  and rail_name = 'ImportWarehouseSources';
