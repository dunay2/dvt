-- Refresh the component engineering ownership projection after the
-- WarehouseConnectionCreateForm owner reconciliation. component-profile reads
-- this materialized projection, so ownership migrations must refresh it.

refresh materialized view planning_query_store.component_engineering_file_ownership_projection;

update planning_query_store.frontend_component_validation_evidence
set
  evidence_ref = 'pnpm planning:db:query component-profile --component SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS --limit 300',
  proves = 'WarehouseConnectionCreateForm.tsx resolves to SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS in the component-profile ownership projection.',
  raw_evidence = coalesce(raw_evidence, '{}'::jsonb)
    || jsonb_build_object(
      'projectionRefreshed', 'planning_query_store.component_engineering_file_ownership_projection',
      'verifiedQuery', 'component-profile --component SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS'
    ),
  source_path = 'tools/planning-db/migrations/521_source_import_create_connection_component_profile_refresh.sql',
  source_content_sha256 = md5('EV-SOURCE-IMPORT-CREATE-CONNECTION-FILE-OWNER-RECONCILE:521'),
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS'
  and evidence_id = 'EV-SOURCE-IMPORT-CREATE-CONNECTION-FILE-OWNER-RECONCILE';
