-- Complete the DB-first feature manifest for the Source Import review metrics
-- read model by registering its exported view-model type. This is an
-- incremental migration because 553 may already be applied locally.

with target_rails as (
  select *
  from planning_query_store.feature_mechanization_local_rails
  where feature_id in (
    'E-CANVAS-ADD-SOURCE-REVIEW-TEMPLATE-1',
    'E-CANVAS-ADD-SOURCE-LIVE-FLOW-1'
  )
),
new_symbols(symbol) as (
  values
    (
      jsonb_build_object(
        'name',
        'SourceImportReviewPreviewGroupViewModel',
        'path',
        'apps/web/src/app/components/sourceImportWizard/sourceImportReviewModel.ts',
        'dddOwner',
        'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
        'cqRails',
        jsonb_build_array('ImportWarehouseSources'),
        'fowlerSignals',
        jsonb_build_array('review_read_model_contract', 'presentation_logic_separation'),
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
        select
          'apps/web/src/app/components/sourceImportWizard/sourceImportReviewModel.ts#SourceImportReviewPreviewGroupViewModel'
      ) refs
    ) as symbol_refs,
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
  raw_manifest = jsonb_set(
    coalesce(rail.raw_manifest, '{}'::jsonb),
    '{symbols}',
    coalesce(patched.manifest_symbols, '[]'::jsonb),
    true
  ),
  source_path = 'tools/planning-db/migrations/554_source_import_review_preview_group_type_symbol.sql',
  source_content_sha256 = md5('source-import-review-preview-group-type-symbol:554:' || rail.rail_id),
  revision = greatest(rail.revision, 1) + 1,
  updated_at = now()
from patched
where rail.rail_id = patched.rail_id;
