-- Reconcile the Canvas source import dialog local rail after governance import.
-- Migration 257 records the retirement for fresh databases; this follow-up
-- repairs already-migrated local DBs where import preserved the stale rail
-- source path after 257 had run.

insert into architecture.design (
  design_id,
  work_item_id,
  title,
  owner,
  status,
  rationale,
  fowler_signal,
  rail_ref,
  supersedes_id,
  approved_at
)
values (
  'PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-LOCAL-RAIL-SOURCE-RECONCILIATION-20260625',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Reconcile Canvas source import dialog local rail source',
  'Architecture / Planning DB / Frontend',
  'implemented',
  'governed_source_drift_query still reported tools/planning-db/migrations/254_web_canvas_source_import_dialog_host.sql when governance import restored the existing local rail after migration 257 had already run. This migration repairs the rail by stale source path and records metadata consumed by reconcileDeprecatedLocalRailSources so later imports keep the source on a tracked retirement migration.',
  'boundary_drift',
  'ValidateSourceDrift;ValidateComponentIntegrity',
  'PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-PHANTOM-RETIREMENT-20260625',
  now()
)
on conflict (design_id) do update set
  work_item_id = excluded.work_item_id,
  title = excluded.title,
  owner = excluded.owner,
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  supersedes_id = excluded.supersedes_id,
  approved_at = excluded.approved_at,
  updated_at = now();

insert into architecture.design_scope (
  design_id,
  subject_kind,
  subject_id,
  scope_kind,
  required
)
values
  (
    'PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-LOCAL-RAIL-SOURCE-RECONCILIATION-20260625',
    'query',
    'DVT-CANVAS-UXDB-SOURCE-DIALOG-1:OpenCanvasSourceImportDialog',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-LOCAL-RAIL-SOURCE-RECONCILIATION-20260625',
    'path',
    'tools/planning-db/migrations/254_web_canvas_source_import_dialog_host.sql',
    'may_delete',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-LOCAL-RAIL-SOURCE-RECONCILIATION-20260625',
    'path',
    'tools/planning-db/migrations/257_retire_canvas_source_import_dialog_host_phantom.sql',
    'may_reference',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update planning_query_store.feature_mechanization_local_rails rail
set
  mechanization_status = 'closed',
  rail_status = 'retired',
  source_path = 'tools/planning-db/migrations/257_retire_canvas_source_import_dialog_host_phantom.sql',
  source_content_sha256 = coalesce(
    (
      select file_ref.content_hash
      from planning_query_store.governance_files file_ref
      where file_ref.path =
        'tools/planning-db/migrations/257_retire_canvas_source_import_dialog_host_phantom.sql'
    ),
    rail.source_content_sha256
  ),
  raw_rail = coalesce(rail.raw_rail, '{}'::jsonb)
    || jsonb_build_object(
      'status',
      'retired',
      'currentImplementationSourcePath',
      'tools/planning-db/migrations/257_retire_canvas_source_import_dialog_host_phantom.sql',
      'deprecatedSourcePaths',
      jsonb_build_array(
        'tools/planning-db/migrations/254_web_canvas_source_import_dialog_host.sql'
      ),
      'sourcePathReconciledBy',
      '259_reconcile_canvas_source_import_dialog_host_local_rail_source'
    ),
  raw_manifest = coalesce(rail.raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'mechanizationStatus',
      'closed',
      'currentImplementationSourcePath',
      'tools/planning-db/migrations/257_retire_canvas_source_import_dialog_host_phantom.sql',
      'deprecatedSourcePaths',
      jsonb_build_array(
        'tools/planning-db/migrations/254_web_canvas_source_import_dialog_host.sql'
      ),
      'sourcePathReconciledBy',
      '259_reconcile_canvas_source_import_dialog_host_local_rail_source'
    ),
  revision = greatest(rail.revision, 1) + 1,
  updated_at = now()
where rail.source_path = 'tools/planning-db/migrations/254_web_canvas_source_import_dialog_host.sql';
