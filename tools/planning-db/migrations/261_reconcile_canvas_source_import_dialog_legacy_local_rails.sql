-- Consolidate legacy Canvas source import dialog local rails that still point
-- at untracked post-import persistence migrations and removed host symbols.

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
  'PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-LEGACY-LOCAL-RAIL-RECONCILIATION-20260625',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Reconcile legacy Canvas source import dialog local rails',
  'Architecture / Planning DB / Frontend',
  'implemented',
  'The import snapshot can preserve older OpenCanvasSourceImportDialog local rail rows that point to untracked source import dialog host migration files and removed CanvasSourceImportDialogHost symbols. The active SourceImportWizard implementation is already covered by the retirement design and tracked migration 257, so this migration consolidates legacy rail rows onto that tracked source and removes raw_manifest.featureId to keep retirement metadata out of full feature manifest validation.',
  'boundary_drift',
  'ValidateSourceDrift;ValidateFeatureMechanizationImplementation',
  'PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-LOCAL-RAIL-MANIFEST-SANITIZE-20260625',
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
    'PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-LEGACY-LOCAL-RAIL-RECONCILIATION-20260625',
    'query',
    'DVT-CANVAS-UXDB-SOURCE-DIALOG-1:OpenCanvasSourceImportDialog',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-LEGACY-LOCAL-RAIL-RECONCILIATION-20260625',
    'path',
    'tools/planning-db/migrations/254_web_canvas_source_import_dialog_host.sql',
    'may_delete',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-LEGACY-LOCAL-RAIL-RECONCILIATION-20260625',
    'path',
    'tools/planning-db/migrations/255_web_canvas_source_import_dialog_post_import_persistence.sql',
    'may_delete',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-LEGACY-LOCAL-RAIL-RECONCILIATION-20260625',
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
        'tools/planning-db/migrations/254_web_canvas_source_import_dialog_host.sql',
        'tools/planning-db/migrations/255_web_canvas_source_import_dialog_post_import_persistence.sql'
      ),
      'sourcePathReconciledBy',
      '261_reconcile_canvas_source_import_dialog_legacy_local_rails'
    ),
  raw_manifest = (
    coalesce(rail.raw_manifest, '{}'::jsonb)
    - 'featureId'
    - 'symbols'
  ) || jsonb_build_object(
    'mechanizationStatus',
    'closed',
    'currentImplementationSourcePath',
    'tools/planning-db/migrations/257_retire_canvas_source_import_dialog_host_phantom.sql',
    'deprecatedSourcePaths',
    jsonb_build_array(
      'tools/planning-db/migrations/254_web_canvas_source_import_dialog_host.sql',
      'tools/planning-db/migrations/255_web_canvas_source_import_dialog_post_import_persistence.sql'
    ),
    'featureMechanizationManifestSource',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    'legacyLocalRailReconciledBy',
    '261_reconcile_canvas_source_import_dialog_legacy_local_rails'
  ),
  symbol_refs = jsonb_build_array(
    'tools/planning-db/migrations/257_retire_canvas_source_import_dialog_host_phantom.sql#RetireCanvasSourceImportDialogHost'
  ),
  implementation_refs = jsonb_build_array(
    'apps/web/src/app/views/canvas/CanvasShell.tsx',
    'apps/web/src/app/components/SourceImportWizard.tsx',
    'tools/planning-db/migrations/257_retire_canvas_source_import_dialog_host_phantom.sql'
  ),
  revision = greatest(rail.revision, 1) + 1,
  updated_at = now()
where rail.feature_id = 'DVT-CANVAS-UXDB-SOURCE-DIALOG-1'
  and rail.rail_name = 'OpenCanvasSourceImportDialog'
  and rail.source_path in (
    'tools/planning-db/migrations/254_web_canvas_source_import_dialog_host.sql',
    'tools/planning-db/migrations/255_web_canvas_source_import_dialog_post_import_persistence.sql'
  );
