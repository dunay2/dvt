-- Keep the Source Import review-template slice from becoming a second active
-- ImportWarehouseSources rail. The slice is presentation-only evidence for the
-- existing API-owned command.

update planning_query_store.feature_mechanization_local_rails
set
  rail_status = 'retired',
  raw_rail = coalesce(raw_rail, '{}'::jsonb)
    || jsonb_build_object(
      'retiredAsRailDeclaration', true,
      'retirementReason',
      'SourceImportReviewView is presentation evidence for the canonical ImportWarehouseSources command, not a new command/query rail declaration.',
      'canonicalRailOwner',
      'api.component.warehouseSourceImport.ImportWarehouseSourcesUseCase'
    ),
  raw_manifest = jsonb_set(
    coalesce(raw_manifest, '{}'::jsonb),
    '{commandQueryRails}',
    jsonb_build_array(
      jsonb_build_object(
        'name', 'ImportWarehouseSources',
        'type', 'command',
        'dddOwner', 'api.component.warehouseSourceImport.ImportWarehouseSourcesUseCase',
        'status', 'retired',
        'relationship', 'referenced-existing-rail'
      )
    ),
    true
  ),
  source_content_sha256 = md5(
    'E-CANVAS-ADD-SOURCE-REVIEW-TEMPLATE-1:retire-local-importwarehousesources-rail-reference:516'
  ),
  revision = revision + 1,
  updated_at = now()
where rail_id = 'local#E-CANVAS-ADD-SOURCE-REVIEW-TEMPLATE-1#command#importwarehousesources';

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
  'EV-SOURCE-IMPORT-REVIEW-TEMPLATE-RAIL-REFERENCE-RETIREMENT',
  'architecture-test',
  'current',
  'pnpm planning:db:integrity:check',
  'ImportWarehouseSources',
  'source-import-review-template-rail-reference-retirement',
  'The review-template component references ImportWarehouseSources without adding a duplicate active command/query rail.',
  jsonb_build_object(
    'canonicalRailOwner',
    'api.component.warehouseSourceImport.ImportWarehouseSourcesUseCase',
    'retiredLocalRailId',
    'local#E-CANVAS-ADD-SOURCE-REVIEW-TEMPLATE-1#command#importwarehousesources',
    'expectedRailVocabularyExactDuplicates',
    0
  ),
  'tools/planning-db/migrations/516_source_import_review_template_rail_reference_retirement.sql',
  md5('evidence:source-import-review-template-rail-reference-retirement:516')
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
