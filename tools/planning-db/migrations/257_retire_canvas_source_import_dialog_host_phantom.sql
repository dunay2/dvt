-- Retire the phantom Canvas source import dialog host component and repoint the
-- stale local feature manifest away from the non-existent migration/file path.
-- The active Canvas source import surface is CanvasShell -> SourceImportWizard.

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
  'PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-PHANTOM-RETIREMENT-20260625',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Retire phantom Canvas source import dialog host component',
  'Architecture / Planning DB / Frontend',
  'implemented',
  'The Planning DB carried SYS-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST as a review component backed by CanvasSourceImportDialogHost.tsx and a local feature manifest backed by tools/planning-db/migrations/254_web_canvas_source_import_dialog_host.sql. Neither file is tracked. The active implementation is CanvasShell rendering SourceImportWizard and the existing SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD component tree. This migration preserves audit history, retires the phantom host, and redirects shell chrome dependency evidence to the real wizard component.',
  'boundary_drift',
  'ValidateComponentIntegrity;ValidateSourceDrift;ReadComponentProfile',
  'WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-20260625',
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
    'PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-PHANTOM-RETIREMENT-20260625',
    'component',
    'SYS-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-PHANTOM-RETIREMENT-20260625',
    'component',
    'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD',
    'may_reference',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-PHANTOM-RETIREMENT-20260625',
    'relation',
    'REL-WEB-CANVAS-SHELL-CHROME-USES-SOURCE-IMPORT-DIALOG-HOST',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-PHANTOM-RETIREMENT-20260625',
    'relation',
    'REL-WEB-CANVAS-SHELL-CHROME-USES-SOURCE-IMPORT-WIZARD',
    'may_create',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-PHANTOM-RETIREMENT-20260625',
    'path',
    'apps/web/src/app/views/canvas/CanvasSourceImportDialogHost.tsx',
    'may_delete',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-PHANTOM-RETIREMENT-20260625',
    'path',
    'tools/planning-db/migrations/254_web_canvas_source_import_dialog_host.sql',
    'may_delete',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update architecture.design
set
  status = 'superseded',
  rationale =
    rationale
    || ' Superseded by PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-PHANTOM-RETIREMENT-20260625 because the declared dialog host source and migration are not tracked.',
  updated_at = now()
where design_id = 'WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-20260625';

update planning_query_store.governance_component_local_definitions
set
  status = 'superseded',
  owned_concern = 'Superseded phantom component. CanvasSourceImportDialogHost.tsx is not tracked; active source import presentation is owned by SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD and rendered from CanvasShell.',
  ddd_owner = 'CanvasSourceImportDialogHostRetirement',
  cq_rails = 'none - superseded phantom component',
  source_path = 'tools/planning-db/migrations/257_retire_canvas_source_import_dialog_host_phantom.sql',
  source_content_sha256 =
    md5('SYS-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST:257')
    || md5('retire canvas source import dialog host phantom:257'),
  revision = greatest(revision, 1) + 1
where component_id = 'SYS-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST';

delete from planning_query_store.governance_component_local_ownership_patterns
where component_id = 'SYS-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST'
  and pattern = 'apps/web/src/app/views/canvas/CanvasSourceImportDialogHost.tsx';

delete from planning_query_store.governance_component_files
where component_id = 'SYS-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST'
  and path = 'apps/web/src/app/views/canvas/CanvasSourceImportDialogHost.tsx';

delete from planning_query_store.governance_files
where path = 'apps/web/src/app/views/canvas/CanvasSourceImportDialogHost.tsx';

update architecture.component
set
  owner = 'CanvasSourceImportDialogHostRetirement',
  repo_path =
    'planning_query_store.governance_component_local_definitions#SYS-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST',
  public_contract = 'Deprecated phantom component. CanvasSourceImportDialogHost.tsx is not tracked; active source import presentation uses CanvasShell and SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD.',
  status = 'deprecated',
  maturity_score = null,
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST';

update architecture.component_responsibility
set
  responsibility = 'Superseded phantom component retained only for audit.',
  reason_to_change = 'Declared dialog host path is absent; active behavior belongs to CanvasShell and the SourceImportWizard component tree.',
  ddd_owner = 'CanvasSourceImportDialogHostRetirement',
  status = 'drift'
where responsibility_id = 'RESP-SYS-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST';

update architecture.component_relation
set
  status = 'drift',
  failure_mode = 'Superseded phantom relation. Active shell chrome source import presentation depends on SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD.',
  source_refs = jsonb_build_array(
    'tools/planning-db/migrations/257_retire_canvas_source_import_dialog_host_phantom.sql'
  ),
  updated_at = now()
where relation_id = 'REL-WEB-CANVAS-SHELL-CHROME-USES-SOURCE-IMPORT-DIALOG-HOST';

insert into architecture.component_relation (
  relation_id,
  source_component_id,
  target_component_id,
  relation_type,
  direction,
  sync_async,
  failure_mode,
  authorization_scope,
  source_refs,
  status
)
values (
  'REL-WEB-CANVAS-SHELL-CHROME-USES-SOURCE-IMPORT-WIZARD',
  'SYS-WEB-CANVAS-SHELL-CHROME',
  'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD',
  'depends_on',
  'outbound',
  'sync',
  'Canvas source import presentation breaks if CanvasShell stops rendering SourceImportWizard without updating component relations.',
  'browser-local Canvas source import presentation',
  jsonb_build_array(
    'apps/web/src/app/views/canvas/CanvasShell.tsx',
    'apps/web/src/app/components/SourceImportWizard.tsx',
    'tools/planning-db/migrations/257_retire_canvas_source_import_dialog_host_phantom.sql'
  ),
  'implemented'
)
on conflict (relation_id) do update set
  source_component_id = excluded.source_component_id,
  target_component_id = excluded.target_component_id,
  relation_type = excluded.relation_type,
  direction = excluded.direction,
  sync_async = excluded.sync_async,
  failure_mode = excluded.failure_mode,
  authorization_scope = excluded.authorization_scope,
  source_refs = excluded.source_refs,
  status = excluded.status,
  updated_at = now();

update architecture.component_test
set
  test_path = 'scripts/planning-db-migrate.test.cjs',
  test_kind = 'architecture',
  coverage_level = 'boundary',
  required = true,
  validation_command = 'node --test scripts/planning-db-migrate.test.cjs'
where component_id = 'SYS-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST';

insert into architecture.component_observability (
  observability_id,
  component_id,
  signal_name,
  signal_kind,
  required,
  status
)
values (
  'OBS-SYS-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-PHANTOM-RETIREMENT',
  'SYS-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST',
  'Phantom host retirement is observable through component-integrity, source-drift, component-profile, and migration evidence.',
  'dashboard',
  true,
  'implemented'
)
on conflict (observability_id) do update set
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;

update planning_query_store.feature_mechanization_local_rails rail
set
  mechanization_status = 'closed',
  rail_status = 'retired',
  source_path = 'tools/planning-db/migrations/257_retire_canvas_source_import_dialog_host_phantom.sql',
  source_content_sha256 =
    md5('DVT-CANVAS-UXDB-SOURCE-DIALOG-1:257')
    || md5('retire canvas source import dialog host phantom rail source:257'),
  symbol_refs = jsonb_build_array(
    'tools/planning-db/migrations/257_retire_canvas_source_import_dialog_host_phantom.sql#RetireCanvasSourceImportDialogHost'
  ),
  implementation_refs = jsonb_build_array(
    'apps/web/src/app/views/canvas/CanvasShell.tsx',
    'apps/web/src/app/components/SourceImportWizard.tsx',
    'tools/planning-db/migrations/257_retire_canvas_source_import_dialog_host_phantom.sql'
  ),
  allowed_implementation_surfaces = jsonb_build_array(
    'apps/web/src/app/views/canvas/CanvasShell.tsx',
    'apps/web/src/app/components/SourceImportWizard.tsx',
    'tools/planning-db/migrations/257_retire_canvas_source_import_dialog_host_phantom.sql'
  ),
  architecture_guards = jsonb_build_array(
    'pnpm planning:db:integrity:check',
    'pnpm planning:db:query source-drift --limit 20'
  ),
  completion_gate = jsonb_build_array(
    'pnpm planning:db:migrate',
    'node --test scripts/planning-db-migrate.test.cjs',
    'pnpm planning:db:integrity:check',
    'pnpm verify:prepush'
  ),
  raw_rail = coalesce(rail.raw_rail, '{}'::jsonb)
    || jsonb_build_object(
      'status',
      'retired',
      'retirementReason',
      'CanvasSourceImportDialogHost.tsx and 254_web_canvas_source_import_dialog_host.sql are not tracked; active source import presentation uses CanvasShell and SourceImportWizard.',
      'activeComponents',
      jsonb_build_array(
        'SYS-WEB-CANVAS-SHELL-CHROME',
        'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD'
      ),
      'retiredBy',
      '257_retire_canvas_source_import_dialog_host_phantom'
    ),
  raw_manifest = coalesce(rail.raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'mechanizationStatus',
      'closed',
      'retiredComponent',
      'SYS-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST',
      'activeComponent',
      'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD',
      'retiredBy',
      '257_retire_canvas_source_import_dialog_host_phantom'
    ),
  revision = greatest(rail.revision, 1) + 1,
  updated_at = now()
where rail.feature_id = 'DVT-CANVAS-UXDB-SOURCE-DIALOG-1'
  and rail.source_path = 'tools/planning-db/migrations/254_web_canvas_source_import_dialog_host.sql';
