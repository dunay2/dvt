-- Keep the retired Canvas source import dialog local rail out of full feature
-- manifest validation. The canonical feature manifest remains in the governed
-- planning proposal; this DB-local row is retirement/reconciliation metadata.

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
  'PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-LOCAL-RAIL-MANIFEST-SANITIZE-20260625',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Sanitize Canvas source import dialog local rail manifest',
  'Architecture / Planning DB / Frontend',
  'implemented',
  'The retired OpenCanvasSourceImportDialog local rail stores reconciliation metadata, not the authoritative feature mechanization manifest. Leaving raw_manifest.featureId present makes docs:feature-mechanization:implementation validate the local retirement row as a sparse feature manifest. This migration removes featureId from the local raw_manifest while preserving feature_id and retirement metadata for command/query rail projections.',
  'boundary_drift',
  'ValidateSourceDrift;ValidateFeatureMechanizationImplementation',
  'PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-LOCAL-RAIL-SOURCE-RECONCILIATION-20260625',
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
    'PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-LOCAL-RAIL-MANIFEST-SANITIZE-20260625',
    'query',
    'DVT-CANVAS-UXDB-SOURCE-DIALOG-1:OpenCanvasSourceImportDialog',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-LOCAL-RAIL-MANIFEST-SANITIZE-20260625',
    'path',
    'tools/planning-db/migrations/257_retire_canvas_source_import_dialog_host_phantom.sql',
    'may_reference',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update planning_query_store.feature_mechanization_local_rails rail
set
  raw_manifest = (
    coalesce(rail.raw_manifest, '{}'::jsonb)
    - 'featureId'
  ) || jsonb_build_object(
    'featureMechanizationManifestSource',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    'localRetirementManifestSanitizedBy',
    '260_sanitize_canvas_source_import_dialog_local_rail_manifest'
  ),
  revision = greatest(rail.revision, 1) + 1,
  updated_at = now()
where rail.feature_id = 'DVT-CANVAS-UXDB-SOURCE-DIALOG-1'
  and rail.rail_name = 'OpenCanvasSourceImportDialog'
  and rail.raw_manifest ? 'featureId';
