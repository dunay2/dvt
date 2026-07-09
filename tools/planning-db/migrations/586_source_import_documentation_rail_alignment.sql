-- Register the Source Import documentation drift correction in Planning DB.
-- The implemented source-import rails are authoritative; active architecture
-- docs must not continue describing Source Import as unavailable or stubbed.

insert into planning_query_store.frontend_component_local_evidence (
  evidence_id,
  component_id,
  evidence_kind,
  evidence_ref,
  evidence_status,
  raw_evidence,
  source_path,
  source_content_sha256
)
values (
  'EV-WEB-CANVAS-SOURCE-IMPORT-DOC-RAIL-ALIGNMENT',
  'web.component.canvas.SourceImportDialog',
  'architecture-test',
  'pnpm --filter @dvt/web exec vitest run --config vitest.config.ts src/app/services/composition/appServicesMockHardcut.architecture.test.ts src/app/views/canvas/canvasDbtAuthoringRun.architecture.test.ts',
  'passing',
  jsonb_build_object(
    'proves', 'Active workspace-port and graph architecture docs describe Source Import as implemented through ListWarehouseConnections, ListWarehouseConnectionTables, and ImportWarehouseSources instead of stale unavailable/stub posture.',
    'rails', jsonb_build_array(
      'ListWarehouseConnections',
      'ListWarehouseConnectionTables',
      'ImportWarehouseSources'
    ),
    'correctedDocs', jsonb_build_array(
      'docs/architecture/components/web/workspace/workspace-port-decomposition-user-stories.md',
      'docs/architecture/components/web/graph/graph-frontend-architecture.md'
    ),
    'fowlerSignal', 'documentation_drift'
  ),
  'tools/planning-db/migrations/586_source_import_documentation_rail_alignment.sql',
  md5('evidence:source-import-doc-rail-alignment:586')
)
on conflict (evidence_id) do update set
  component_id = excluded.component_id,
  evidence_kind = excluded.evidence_kind,
  evidence_ref = excluded.evidence_ref,
  evidence_status = excluded.evidence_status,
  raw_evidence = excluded.raw_evidence,
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
  'EV-WEB-CANVAS-SOURCE-IMPORT-DOC-RAIL-ALIGNMENT',
  'architecture-test',
  'current',
  'appServicesMockHardcut.architecture.test.ts and canvasDbtAuthoringRun.architecture.test.ts',
  'ImportWarehouseSources',
  'source-import-doc-rail-alignment',
  'The active architecture docs no longer present Source Import as an unavailable API-mode stub after the protected-runtime rails are implemented.',
  jsonb_build_object(
    'docs', jsonb_build_array(
      'workspace-port-decomposition-user-stories.md',
      'graph-frontend-architecture.md'
    ),
    'forbiddenTerms', jsonb_build_array(
      'warehouse source rails do not exist',
      'source import port returns unavailable capability',
      'API-mode warehouse source import remains unavailable'
    )
  ),
  'tools/planning-db/migrations/586_source_import_documentation_rail_alignment.sql',
  md5('validation-evidence:source-import-doc-rail-alignment:586')
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

update planning_query_store.frontend_component_local_components
set
  evidence_refs = (
    select jsonb_agg(distinct evidence_ref order by evidence_ref)
    from jsonb_array_elements_text(
      coalesce(evidence_refs, '[]'::jsonb)
      || jsonb_build_array('EV-WEB-CANVAS-SOURCE-IMPORT-DOC-RAIL-ALIGNMENT')
    ) as refs(evidence_ref)
  ),
  raw_component = coalesce(raw_component, '{}'::jsonb)
    || jsonb_build_object(
      'documentationRailAlignment', jsonb_build_object(
        'rails', jsonb_build_array(
          'ListWarehouseConnections',
          'ListWarehouseConnectionTables',
          'ImportWarehouseSources'
        ),
        'result', 'active architecture docs describe Source Import as implemented protected-runtime rails, not unavailable stubs',
        'sourcePath', 'tools/planning-db/migrations/586_source_import_documentation_rail_alignment.sql'
      )
    ),
  updated_at = now()
where component_id = 'web.component.canvas.SourceImportDialog';
