-- DB-first ownership for the Canvas route host that opens the contextual
-- SourceImportDialog. The canonical component remains
-- web.component.canvas.SourceImportDialog; the SYS-WEB-CANVAS-SOURCE-IMPORT-
-- DIALOG-HOST phantom component is not reactivated.

insert into architecture.design (
  design_id,
  work_item_id,
  title,
  owner,
  status,
  rationale,
  fowler_signal,
  rail_ref,
  approved_at
)
values (
  'WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-20260625',
  'DVT-CANVAS-UXDB-SOURCE-DIALOG-1',
  'Canvas contextual source import dialog host',
  'Frontend / Canvas / Planning DB',
  'implemented',
  'CanvasShell no longer owns SourceImportWizard state directly. CanvasSourceImportDialogHost and useCanvasSourceImportDialogState are files inside the canonical SourceImportDialog component and own only the contextual open/close presentation boundary.',
  'responsibility_overload',
  'OpenCanvasSourceImportDialog;ImportWarehouseSources',
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
  ('WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-20260625', 'component', 'web.component.canvas.SourceImportDialog', 'may_update', true),
  ('WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-20260625', 'component', 'SYS-WEB-CANVAS-SHELL-CHROME', 'may_reference', true),
  ('WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-20260625', 'query', 'OpenCanvasSourceImportDialog', 'may_create', true),
  ('WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-20260625', 'query', 'ImportWarehouseSources', 'may_reference', true),
  ('WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-20260625', 'path', 'apps/web/src/app/views/canvas/CanvasSourceImportDialogHost.tsx', 'may_create', true),
  ('WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-20260625', 'path', 'apps/web/src/app/views/canvas/useCanvasSourceImportDialogState.ts', 'may_create', true),
  ('WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-20260625', 'path', 'apps/web/src/app/views/canvas/CanvasShell.tsx', 'may_update', true),
  ('WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-20260625', 'path', 'apps/web/src/app/views/canvas/CanvasShell.architecture.test.tsx', 'may_update', true),
  ('WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-20260625', 'test', 'CanvasShell.architecture.test.tsx', 'must_prove', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

insert into planning_query_store.frontend_component_files (
  component_id,
  file_path,
  file_role,
  exported_symbol,
  raw_file
)
values
  (
    'web.component.canvas.SourceImportDialog',
    'apps/web/src/app/views/canvas/CanvasSourceImportDialogHost.tsx',
    'component',
    'CanvasSourceImportDialogHost',
    jsonb_build_object(
      'role', 'contextual route host',
      'rail', 'OpenCanvasSourceImportDialog',
      'delegatesTo', 'apps/web/src/app/components/SourceImportWizard.tsx#SourceImportWizard'
    )
  ),
  (
    'web.component.canvas.SourceImportDialog',
    'apps/web/src/app/views/canvas/useCanvasSourceImportDialogState.ts',
    'hook',
    'useCanvasSourceImportDialogState',
    jsonb_build_object(
      'role', 'contextual dialog state',
      'rail', 'OpenCanvasSourceImportDialog',
      'invariant', 'Closes and clears selection when SourceImportDialog is no longer permitted.'
    )
  ),
  (
    'web.component.canvas.SourceImportDialog',
    'apps/web/src/app/views/canvas/CanvasShell.architecture.test.tsx',
    'architecture-test',
    null,
    jsonb_build_object(
      'coverage', 'CanvasShell delegates contextual SourceImportDialog state and host presentation.'
    )
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file;

insert into planning_query_store.frontend_component_cq_rails (
  component_id,
  rail_name,
  rail_kind,
  rail_status,
  raw_rail
)
values
  (
    'web.component.canvas.SourceImportDialog',
    'OpenCanvasSourceImportDialog',
    'local-command',
    'implemented-local',
    jsonb_build_object(
      'purpose', 'Open the contextual SourceImportDialog from Canvas context surfaces with optional table preselection and canvas placement.',
      'owner', 'CanvasSourceImportDialogHost',
      'canonicalImportRail', 'ImportWarehouseSources'
    )
  )
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = excluded.raw_rail;

insert into planning_query_store.frontend_component_evidence (
  evidence_id,
  component_id,
  evidence_kind,
  evidence_ref,
  evidence_status,
  raw_evidence
)
values
  (
    'EV-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-ARCHITECTURE',
    'web.component.canvas.SourceImportDialog',
    'test',
    'pnpm --filter @dvt/web test:canvas-architecture:run -- src/app/views/canvas/CanvasShell.architecture.test.tsx',
    'passing',
    jsonb_build_object('scope', 'contextual source import host boundary')
  ),
  (
    'EV-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-PRESENTATION',
    'web.component.canvas.SourceImportDialog',
    'test',
    'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/CanvasShell.sourceImportLifecycle.test.tsx src/app/views/canvas/CanvasShell.sourceImportAvailability.test.tsx',
    'passing',
    jsonb_build_object('scope', 'source import lifecycle and availability')
  )
on conflict (evidence_id) do update set
  component_id = excluded.component_id,
  evidence_kind = excluded.evidence_kind,
  evidence_ref = excluded.evidence_ref,
  evidence_status = excluded.evidence_status,
  raw_evidence = excluded.raw_evidence;

-- If a local DB applied an earlier draft of this migration, keep the phantom
-- component retired instead of reactivating a second component boundary.
update planning_query_store.governance_component_local_definitions
set
  source_content_sha256 =
    md5('SYS-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST:254:retired')
    || md5('web.component.canvas.SourceImportDialog:OpenCanvasSourceImportDialog'),
  source_path = 'tools/planning-db/migrations/254_web_canvas_source_import_dialog_host.sql',
  name = 'Canvas source import dialog host phantom retirement',
  status = 'superseded',
  owned_concern = 'Superseded phantom host component. Active SourceImportDialog ownership is tracked by web.component.canvas.SourceImportDialog frontend inventory rows.',
  ddd_owner = 'SourceImportDialog',
  cq_rails = 'none - superseded phantom host; see web.component.canvas.SourceImportDialog',
  revision = revision + 1
where component_id = 'SYS-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST';

update architecture.component
set
  status = 'deprecated',
  public_contract = 'Superseded phantom host component. Active route host files are governed by web.component.canvas.SourceImportDialog.',
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST';

delete from architecture.component_relation
where relation_id = 'REL-WEB-CANVAS-SHELL-CHROME-USES-SOURCE-IMPORT-DIALOG-HOST';

delete from architecture.component_test
where test_id = 'TEST-SYS-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-ARCHITECTURE';

insert into planning_query_store.feature_mechanization_local_rails (
  rail_id,
  feature_id,
  mechanization_status,
  rail_name,
  normalized_rail_name,
  rail_type,
  ddd_owner,
  rail_status,
  symbol_refs,
  implementation_refs,
  documentation_refs,
  governing_sources,
  allowed_implementation_surfaces,
  architecture_guards,
  completion_gate,
  source_path,
  source_content_sha256,
  raw_rail,
  raw_manifest,
  revision,
  created_by
)
values (
  'local#DVT-CANVAS-UXDB-SOURCE-DIALOG-1#command#opencanvassourceimportdialog',
  'DVT-CANVAS-UXDB-SOURCE-DIALOG-1',
  'implemented',
  'OpenCanvasSourceImportDialog',
  'opencanvassourceimportdialog',
  'command',
  'SourceImportDialog',
  'implemented',
  jsonb_build_array(
    'apps/web/src/app/views/canvas/CanvasSourceImportDialogHost.tsx#CanvasSourceImportDialogHostProps',
    'apps/web/src/app/views/canvas/CanvasSourceImportDialogHost.tsx#CanvasSourceImportDialogHost',
    'apps/web/src/app/views/canvas/useCanvasSourceImportDialogState.ts#CanvasSourceImportDialogState',
    'apps/web/src/app/views/canvas/useCanvasSourceImportDialogState.ts#useCanvasSourceImportDialogState'
  ),
  jsonb_build_array(
    'apps/web/src/app/views/canvas/CanvasSourceImportDialogHost.tsx',
    'apps/web/src/app/views/canvas/useCanvasSourceImportDialogState.ts',
    'apps/web/src/app/views/canvas/CanvasShell.tsx',
    'apps/web/src/app/views/canvas/CanvasShell.architecture.test.tsx'
  ),
  jsonb_build_array(
    'docs/architecture/components/web/frontend-component-inventory.md',
    'docs/architecture/components/web/frontend-command-query-rail-inventory.md',
    'docs/adr/ADR-0058-warehouse-source-import-rails.md'
  ),
  jsonb_build_array(
    'AGENTS.md',
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/guides/ai-work-protocol.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md',
    'docs/planning/state/planning-control-tower.md',
    'docs/adr/ADR-0058-warehouse-source-import-rails.md'
  ),
  jsonb_build_array(
    'apps/web/src/app/views/canvas/CanvasSourceImportDialogHost.tsx',
    'apps/web/src/app/views/canvas/useCanvasSourceImportDialogState.ts',
    'apps/web/src/app/views/canvas/CanvasShell.tsx',
    'apps/web/src/app/views/canvas/CanvasShell.architecture.test.tsx',
    'tools/planning-db/migrations/254_web_canvas_source_import_dialog_host.sql'
  ),
  jsonb_build_array(
    'pnpm --filter @dvt/web test:canvas-architecture:run -- src/app/views/canvas/CanvasShell.architecture.test.tsx',
    'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/CanvasShell.sourceImportLifecycle.test.tsx src/app/views/canvas/CanvasShell.sourceImportAvailability.test.tsx',
    'pnpm docs:feature-mechanization:implementation'
  ),
  jsonb_build_array(
    'pnpm planning:db:migrate',
    'node --test scripts/planning-db-migrate.test.cjs',
    'pnpm --filter @dvt/web test:canvas-architecture:run -- src/app/views/canvas/CanvasShell.architecture.test.tsx',
    'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/CanvasShell.sourceImportLifecycle.test.tsx src/app/views/canvas/CanvasShell.sourceImportAvailability.test.tsx',
    'pnpm --filter @dvt/web typecheck',
    'pnpm --filter @dvt/web lint',
    'pnpm verify:prepush'
  ),
  'tools/planning-db/migrations/254_web_canvas_source_import_dialog_host.sql',
  md5('DVT-CANVAS-UXDB-SOURCE-DIALOG-1:OpenCanvasSourceImportDialog:254')
    || md5('web.component.canvas.SourceImportDialog'),
  jsonb_build_object(
    'componentId', 'web.component.canvas.SourceImportDialog',
    'railName', 'OpenCanvasSourceImportDialog',
    'railType', 'command',
    'status', 'implemented'
  ),
  jsonb_build_object(
    'featureId', 'DVT-CANVAS-UXDB-SOURCE-DIALOG-1',
    'mechanizationStatus', 'implemented',
    'implementationPlan', 'tools/planning-db/migrations/254_web_canvas_source_import_dialog_host.sql',
    'componentGuides', jsonb_build_array(
      'web.component.canvas.SourceImportDialog'
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object(
        'name', 'CanvasSourceImportDialogHostProps',
        'path', 'apps/web/src/app/views/canvas/CanvasSourceImportDialogHost.tsx',
        'dddOwner', 'SourceImportDialog',
        'cqRails', jsonb_build_array('OpenCanvasSourceImportDialog')
      ),
      jsonb_build_object(
        'name', 'CanvasSourceImportDialogHost',
        'path', 'apps/web/src/app/views/canvas/CanvasSourceImportDialogHost.tsx',
        'dddOwner', 'SourceImportDialog',
        'cqRails', jsonb_build_array('OpenCanvasSourceImportDialog', 'ImportWarehouseSources')
      ),
      jsonb_build_object(
        'name', 'CanvasSourceImportDialogState',
        'path', 'apps/web/src/app/views/canvas/useCanvasSourceImportDialogState.ts',
        'dddOwner', 'SourceImportDialog',
        'cqRails', jsonb_build_array('OpenCanvasSourceImportDialog')
      ),
      jsonb_build_object(
        'name', 'useCanvasSourceImportDialogState',
        'path', 'apps/web/src/app/views/canvas/useCanvasSourceImportDialogState.ts',
        'dddOwner', 'SourceImportDialog',
        'cqRails', jsonb_build_array('OpenCanvasSourceImportDialog')
      )
    ),
    'architectureGuards', jsonb_build_array(
      'pnpm --filter @dvt/web test:canvas-architecture:run -- src/app/views/canvas/CanvasShell.architecture.test.tsx',
      'pnpm docs:feature-mechanization:implementation'
    ),
    'cypressFlows', jsonb_build_array(),
    'completionGate', jsonb_build_array(
      'pnpm planning:db:migrate',
      'node --test scripts/planning-db-query.test.cjs',
      'node --test scripts/planning-db-migrate.test.cjs',
      'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/CanvasShell.sourceImportLifecycle.test.tsx src/app/views/canvas/CanvasShell.sourceImportAvailability.test.tsx',
      'pnpm --filter @dvt/web typecheck',
      'pnpm --filter @dvt/web lint',
      'pnpm verify:prepush'
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'redTest', 'CanvasShell.architecture.test.tsx rejects direct SourceImportWizard state in CanvasShell',
        'greenTest', 'CanvasShell delegates SourceImportDialog host and state hook'
      )
    ),
    'rails', jsonb_build_array(
      jsonb_build_object(
        'name', 'OpenCanvasSourceImportDialog',
        'type', 'command',
        'owner', 'SourceImportDialog',
        'status', 'implemented'
      )
    ),
    'validations', jsonb_build_array(
      'pnpm --filter @dvt/web test:canvas-architecture:run -- src/app/views/canvas/CanvasShell.architecture.test.tsx',
      'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/CanvasShell.sourceImportLifecycle.test.tsx src/app/views/canvas/CanvasShell.sourceImportAvailability.test.tsx'
    )
  ),
  0,
  'codex'
)
on conflict (rail_id) do update set
  feature_id = excluded.feature_id,
  mechanization_status = excluded.mechanization_status,
  rail_name = excluded.rail_name,
  normalized_rail_name = excluded.normalized_rail_name,
  rail_type = excluded.rail_type,
  ddd_owner = excluded.ddd_owner,
  rail_status = excluded.rail_status,
  symbol_refs = excluded.symbol_refs,
  implementation_refs = excluded.implementation_refs,
  documentation_refs = excluded.documentation_refs,
  governing_sources = excluded.governing_sources,
  allowed_implementation_surfaces = excluded.allowed_implementation_surfaces,
  architecture_guards = excluded.architecture_guards,
  completion_gate = excluded.completion_gate,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  raw_rail = excluded.raw_rail,
  raw_manifest = excluded.raw_manifest,
  revision = planning_query_store.feature_mechanization_local_rails.revision + 1;
