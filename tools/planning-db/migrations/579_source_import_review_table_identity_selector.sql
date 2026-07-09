-- Keep Source Import review automation selectors collision-free without
-- replacing the user-facing canonical table name shown in the review.

update planning_query_store.frontend_component_local_components
set
  raw_component = coalesce(raw_component, '{}'::jsonb)
    || jsonb_build_object(
      'reviewTableIdentityInvariant',
      'Source Import review keeps canonicalName as display text and exposes structured identityKey for automation selectors.'
    ),
  evidence_refs = (
    select jsonb_agg(distinct ref order by ref)
    from jsonb_array_elements_text(
      coalesce(evidence_refs, '[]'::jsonb)
      || jsonb_build_array('EV-SOURCE-IMPORT-REVIEW-TABLE-IDENTITY-SELECTOR')
    ) as refs(ref)
  ),
  source_path = 'tools/planning-db/migrations/579_source_import_review_table_identity_selector.sql',
  source_content_sha256 = md5('SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS:review-table-identity-selector:579'),
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS';

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
      'responsibility', 'Render selected-source review rows from the review read model without making display names the automation identity.',
      'rail', 'ImportWarehouseSources',
      'stableSelectors', jsonb_build_array(
        'data-source-import-registry-path',
        'data-source-import-review-table',
        'data-source-import-review-table-identity'
      ),
      'identityInvariant', 'data-source-import-review-table-identity uses SourceImportTableViewModel.identityKey; data-source-import-review-table remains the display canonicalName for human-readable assertions.'
    ),
    'tools/planning-db/migrations/579_source_import_review_table_identity_selector.sql',
    md5('file:SourceImportReviewView:review-table-identity-selector:579')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
    'apps/web/src/app/components/sourceImportWizard/SourceImportReviewView.test.tsx',
    'presentation-test',
    null,
    jsonb_build_object(
      'coverage', 'Review presentation exposes structured selected-table identity when database/schema/table display names collide.',
      'rail', 'ImportWarehouseSources',
      'asserts', jsonb_build_array(
        'data-source-import-review-table',
        'data-source-import-review-table-identity',
        'RAW.PROD.PUBLIC.ORDERS display collision remains visible while identity selectors differ'
      )
    ),
    'tools/planning-db/migrations/579_source_import_review_table_identity_selector.sql',
    md5('file:SourceImportReviewView.test:review-table-identity-selector:579')
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
  'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
  'EV-SOURCE-IMPORT-REVIEW-TABLE-IDENTITY-SELECTOR',
  'presentation-test',
  'current',
  'apps/web/src/app/components/sourceImportWizard/SourceImportReviewView.test.tsx',
  'ImportWarehouseSources',
  'source-import-review-table-identity-selector',
  'The review template exposes a collision-free table identity selector while preserving the user-facing canonical name.',
  jsonb_build_object(
    'redBehavior', 'RAW.PROD/PUBLIC/ORDERS and RAW/PROD.PUBLIC/ORDERS both render RAW.PROD.PUBLIC.ORDERS and previously had the same review selector.',
    'greenBehavior', 'data-source-import-review-table-identity carries the structured SourceImportTableViewModel.identityKey.',
    'noNewRail', true
  ),
  'tools/planning-db/migrations/579_source_import_review_table_identity_selector.sql',
  md5('evidence:source-import-review-table-identity-selector:579')
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

update planning_query_store.feature_mechanization_local_rails rail
set
  implementation_refs = (
    select jsonb_agg(distinct ref order by ref)
    from jsonb_array_elements_text(
      coalesce(rail.implementation_refs, '[]'::jsonb)
      || jsonb_build_array(
        'apps/web/src/app/components/sourceImportWizard/SourceImportReviewView.tsx',
        'apps/web/src/app/components/sourceImportWizard/SourceImportReviewView.test.tsx',
        'tools/planning-db/migrations/579_source_import_review_table_identity_selector.sql'
      )
    ) as refs(ref)
  ),
  architecture_guards = (
    select jsonb_agg(distinct ref order by ref)
    from jsonb_array_elements_text(
      coalesce(rail.architecture_guards, '[]'::jsonb)
      || jsonb_build_array(
        'apps/web/src/app/components/sourceImportWizard/SourceImportReviewView.test.tsx',
        'scripts/planning-db-migrate.test.cjs'
      )
    ) as refs(ref)
  ),
  raw_manifest = coalesce(rail.raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'reviewTableIdentityInvariant',
      'review table automation identity uses identityKey; canonicalName remains display-only',
      'noNewRail', true
    ),
  source_path = 'tools/planning-db/migrations/579_source_import_review_table_identity_selector.sql',
  source_content_sha256 = md5('E-CANVAS-ADD-SOURCE-REVIEW-TEMPLATE-1:ImportWarehouseSources:review-table-identity-selector:579'),
  revision = rail.revision + 1,
  updated_at = now()
where rail.feature_id = 'E-CANVAS-ADD-SOURCE-REVIEW-TEMPLATE-1'
  and rail.rail_name = 'ImportWarehouseSources';
