-- Reconcile the post-import Canvas source import dialog feature manifest row.
-- Migration 263 records the tracked repair source. Some local stores can
-- already have applied 263 before a later governance import restores the
-- historic 262 row, so this migration closes that post-import ordering gap.

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
  'PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-POST-IMPORT-FEATURE-MANIFEST-RECONCILIATION-20260625',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Reconcile post-import Canvas source import dialog feature manifest row',
  'Architecture / Planning DB / Frontend',
  'implemented',
  'A governance import can restore the historic OpenCanvasSourceImportDialog local feature manifest after the earlier reconciliation migration has already run. This migration repairs that restored row onto a tracked 264 source, removes sparse feature-manifest markers, and records deprecated source metadata so later imports preserve the DB-local retirement state.',
  'boundary_drift',
  'ValidateFeatureMechanizationImplementation;ValidateSourceDrift',
  'PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-RESTORED-FEATURE-MANIFEST-RECONCILIATION-20260625',
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
    'PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-POST-IMPORT-FEATURE-MANIFEST-RECONCILIATION-20260625',
    'query',
    'DVT-CANVAS-UXDB-SOURCE-DIALOG-1:OpenCanvasSourceImportDialog',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-POST-IMPORT-FEATURE-MANIFEST-RECONCILIATION-20260625',
    'path',
    'tools/planning-db/migrations/262_restore_canvas_source_import_dialog_feature_manifest.sql',
    'may_delete',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-POST-IMPORT-FEATURE-MANIFEST-RECONCILIATION-20260625',
    'path',
    'tools/planning-db/migrations/264_reconcile_post_import_canvas_source_import_dialog_feature_manifest.sql',
    'may_reference',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update planning_query_store.feature_mechanization_local_rails rail
set
  mechanization_status = 'closed',
  rail_status = 'retired',
  source_path =
    'tools/planning-db/migrations/264_reconcile_post_import_canvas_source_import_dialog_feature_manifest.sql',
  source_content_sha256 = coalesce(
    (
      select file_ref.content_hash
      from planning_query_store.governance_files file_ref
      where file_ref.path =
        'tools/planning-db/migrations/264_reconcile_post_import_canvas_source_import_dialog_feature_manifest.sql'
    ),
    rail.source_content_sha256
  ),
  raw_rail = coalesce(rail.raw_rail, '{}'::jsonb)
    || jsonb_build_object(
      'status',
      'retired',
      'currentImplementationSourcePath',
      'tools/planning-db/migrations/264_reconcile_post_import_canvas_source_import_dialog_feature_manifest.sql',
      'deprecatedSourcePaths',
      jsonb_build_array(
        'tools/planning-db/migrations/254_web_canvas_source_import_dialog_host.sql',
        'tools/planning-db/migrations/255_web_canvas_source_import_dialog_post_import_persistence.sql',
        'tools/planning-db/migrations/262_restore_canvas_source_import_dialog_feature_manifest.sql',
        'tools/planning-db/migrations/263_reconcile_restored_canvas_source_import_dialog_feature_manifest.sql'
      ),
      'sourcePathReconciledBy',
      '264_reconcile_post_import_canvas_source_import_dialog_feature_manifest'
    ),
  raw_manifest = (
    coalesce(rail.raw_manifest, '{}'::jsonb)
    - 'featureId'
    - 'symbols'
  ) || jsonb_build_object(
    'mechanizationStatus',
    'closed',
    'currentImplementationSourcePath',
    'tools/planning-db/migrations/264_reconcile_post_import_canvas_source_import_dialog_feature_manifest.sql',
    'deprecatedSourcePaths',
    jsonb_build_array(
      'tools/planning-db/migrations/254_web_canvas_source_import_dialog_host.sql',
      'tools/planning-db/migrations/255_web_canvas_source_import_dialog_post_import_persistence.sql',
      'tools/planning-db/migrations/262_restore_canvas_source_import_dialog_feature_manifest.sql',
      'tools/planning-db/migrations/263_reconcile_restored_canvas_source_import_dialog_feature_manifest.sql'
    ),
    'featureMechanizationManifestSource',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    'postImportFeatureManifestReconciledBy',
    '264_reconcile_post_import_canvas_source_import_dialog_feature_manifest'
  ),
  symbol_refs = jsonb_build_array(
    'tools/planning-db/migrations/264_reconcile_post_import_canvas_source_import_dialog_feature_manifest.sql#ReconcilePostImportCanvasSourceImportDialogFeatureManifest'
  ),
  implementation_refs = jsonb_build_array(
    'apps/web/src/app/views/canvas/CanvasShell.tsx',
    'apps/web/src/app/components/SourceImportWizard.tsx',
    'tools/planning-db/migrations/264_reconcile_post_import_canvas_source_import_dialog_feature_manifest.sql'
  ),
  revision = greatest(rail.revision, 1) + 1,
  updated_at = now()
where rail.feature_id = 'DVT-CANVAS-UXDB-SOURCE-DIALOG-1'
  and rail.rail_name = 'OpenCanvasSourceImportDialog'
  and (
    rail.source_path =
      'tools/planning-db/migrations/262_restore_canvas_source_import_dialog_feature_manifest.sql'
    or rail.raw_manifest ? 'featureId'
    or exists (
      select 1
      from jsonb_array_elements_text(
        coalesce(rail.raw_manifest->'allowedImplementationSurfaces', '[]'::jsonb)
      ) allowed_surface(path)
      where allowed_surface.path =
        'tools/planning-db/migrations/262_restore_canvas_source_import_dialog_feature_manifest.sql'
    )
  );
