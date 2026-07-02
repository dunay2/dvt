-- Register the SourceImportDialog destination-posture copy as DB-first
-- component evidence. This uses the existing RenderSourceImportCatalogView
-- query rail; it does not introduce a new command/query.

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
  'EV-SOURCE-IMPORT-DESTINATION-POSTURE-COPY',
  'web.component.canvas.SourceImportDialog',
  'presentation-test',
  'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx',
  'current',
  jsonb_build_object(
    'rail', 'RenderSourceImportCatalogView',
    'copyToken', 'sourceImportWizardCopy.selection.destinationPosture',
    'test', 'opens at the selected warehouse tables when launched from the source explorer',
    'proves', 'Browse explains that output target selection belongs to a DVT Sink node after source attachment, with database, schema, table, and write mode configured there.'
  ),
  'tools/planning-db/migrations/504_source_import_destination_posture_copy.sql',
  md5('EV-SOURCE-IMPORT-DESTINATION-POSTURE-COPY:504')
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
