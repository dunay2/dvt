-- Add the extracted Add Source review template to the engineering ownership
-- projection that powers component-profile for the wizard-steps component.

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values (
  'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
  'owns',
  'apps/web/src/app/components/sourceImportWizard/SourceImportReviewView.tsx',
  8
)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

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
  'EV-SOURCE-IMPORT-REVIEW-TEMPLATE-FILE-OWNERSHIP',
  'architecture-test',
  'current',
  'pnpm planning:db:query component-profile --component SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS --limit 300',
  'ImportWarehouseSources',
  'source-import-review-template-file-ownership',
  'SourceImportReviewView.tsx is owned by SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS in the component-profile file projection.',
  jsonb_build_object(
    'componentOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
    'file', 'apps/web/src/app/components/sourceImportWizard/SourceImportReviewView.tsx'
  ),
  'tools/planning-db/migrations/515_source_import_review_template_file_ownership.sql',
  md5('evidence:source-import-review-template-file-ownership:515')
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
