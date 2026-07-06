-- Keep Source Import selected-source review metrics from becoming a second
-- active ImportWarehouseSources command rail. The review slice is UI evidence
-- for the existing API-owned command, not a new command authority.

update planning_query_store.feature_mechanization_local_rails
set
  rail_status = 'retired',
  governing_sources = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(governing_sources, '[]'::jsonb))
      union all
      values
        ('docs/architecture/command-query-rail-governance.md'),
        ('docs/adr/ADR-0058-warehouse-source-import-rails.md')
    ) refs(value)
  ),
  architecture_guards = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(architecture_guards, '[]'::jsonb))
      union all
      values
        ('pnpm planning:db:query rail-vocabulary --rail ImportWarehouseSources --limit 20 must report no exact_duplicate rows'),
        ('pnpm planning:db:integrity:check must report zero rail_vocabulary violations')
    ) refs(value)
  ),
  completion_gate = jsonb_set(
    coalesce(completion_gate, '{}'::jsonb),
    '{tests}',
    (
      select jsonb_agg(distinct value order by value)
      from (
        select value
        from jsonb_array_elements_text(coalesce(completion_gate->'tests', '[]'::jsonb))
        union all
        values
          ('pnpm planning:db:query rail-vocabulary --rail ImportWarehouseSources --limit 20'),
          ('pnpm planning:db:integrity:check'),
          ('pnpm verify:prepush')
      ) refs(value)
    ),
    true
  ),
  raw_rail = coalesce(raw_rail, '{}'::jsonb)
    || jsonb_build_object(
      'status',
      'retired',
      'retiredAsRailDeclaration',
      true,
      'retirementReason',
      'Source Import selected-source review metrics render command readiness evidence for the existing API-owned ImportWarehouseSources command; they do not define a second command rail.',
      'canonicalRailOwner',
      'api.component.warehouseSourceImport.ImportWarehouseSourcesUseCase',
      'canonicalRailRelationship',
      'referenced-existing-rail'
    ),
  raw_manifest = jsonb_set(
    coalesce(raw_manifest, '{}'::jsonb)
      || jsonb_build_object(
        'commandRailReferenceRetirement',
        jsonb_build_object(
          'status',
          'implemented',
          'retiredAsRailDeclaration',
          true,
          'retiredLocalRailId',
          'local#E-CANVAS-SOURCE-IMPORT-CATALOG-UX-1#command#importwarehousesources',
          'canonicalRail',
          'ImportWarehouseSources',
          'canonicalRailOwner',
          'api.component.warehouseSourceImport.ImportWarehouseSourcesUseCase'
        )
      ),
    '{commandQueryRails}',
    jsonb_build_array(
      jsonb_build_object(
        'name',
        'ImportWarehouseSources',
        'type',
        'command',
        'dddOwner',
        'api.component.warehouseSourceImport.ImportWarehouseSourcesUseCase',
        'status',
        'retired',
        'relationship',
        'referenced-existing-rail'
      )
    ),
    true
  ),
  source_path =
    'tools/planning-db/migrations/537_source_import_review_metrics_command_rail_reference_retirement.sql',
  source_content_sha256 = md5(
    'E-CANVAS-SOURCE-IMPORT-CATALOG-UX-1:review-metrics-command-rail-reference-retirement:537'
  ),
  revision = revision + 1,
  updated_at = now()
where rail_id = 'local#E-CANVAS-SOURCE-IMPORT-CATALOG-UX-1#command#importwarehousesources';

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
  'EV-SOURCE-IMPORT-REVIEW-METRICS-COMMAND-RAIL-REFERENCE-RETIREMENT',
  'architecture-test',
  'current',
  'pnpm planning:db:query rail-vocabulary --rail ImportWarehouseSources --limit 20',
  'ImportWarehouseSources',
  'source-import-review-metrics-command-rail-reference-retirement',
  'Source Import review metrics reference the API-owned ImportWarehouseSources command without remaining a second active command declaration.',
  jsonb_build_object(
    'retiredLocalRailId',
    'local#E-CANVAS-SOURCE-IMPORT-CATALOG-UX-1#command#importwarehousesources',
    'canonicalRailOwner',
    'api.component.warehouseSourceImport.ImportWarehouseSourcesUseCase',
    'expectedRailVocabularyExactDuplicates',
    0
  ),
  'tools/planning-db/migrations/537_source_import_review_metrics_command_rail_reference_retirement.sql',
  md5('evidence:source-import-review-metrics-command-rail-reference-retirement:537')
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
