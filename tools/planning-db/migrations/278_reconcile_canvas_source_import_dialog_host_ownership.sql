-- Reconcile the active Canvas source import dialog host with the DB-first
-- component ownership model. Migration 257 correctly retired a phantom host
-- when the file was not tracked; the later frontend overlay made the host and
-- state hook active again, so component engineering ownership must resolve
-- them to a leaf component instead of SYS-WEB-ROOT or a preview transformation
-- wildcard.

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
  'PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-OWNERSHIP-20260625',
  'DVT-CANVAS-P0-PRO-FLOW-1',
  'Canvas source import dialog host ownership reconciliation',
  'Frontend / Canvas',
  'review',
  'CanvasSourceImportDialogHost.tsx and useCanvasSourceImportDialogState.ts are active SourceImportDialog boundary files. They must resolve through component_engineering_file_ownership_query to a concrete source-import leaf before the professional Canvas UX work continues, otherwise SYS-WEB-ROOT and preview-transformation ownership drift hide the real component boundary.',
  'boundary_drift',
  'OpenCanvasSourceImportDialog;ImportWarehouseSources',
  now()
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  updated_at = now();

insert into planning_query_store.governance_component_local_definitions (
  component_id,
  source_path,
  source_content_sha256,
  revision,
  name,
  level,
  parent_id,
  root_unit,
  domain_unit,
  status,
  children_required,
  owned_concern,
  ddd_owner,
  cq_rails,
  created_by
)
values (
  'SYS-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST',
  'tools/planning-db/migrations/278_reconcile_canvas_source_import_dialog_host_ownership.sql',
  md5('SYS-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST:278')
    || md5('CanvasSourceImportDialogHost:useCanvasSourceImportDialogState'),
  0,
  'Canvas source import dialog host',
  'component',
  'SYS-WEB-CANVAS-ADD-SOURCE-DIALOG',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  false,
  'Owns the contextual Canvas host and state boundary that opens SourceImportWizard from canvas source-import commands.',
  'CanvasSourceImportDialogHost',
  'OpenCanvasSourceImportDialog;ImportWarehouseSources',
  'codex'
)
on conflict (component_id) do update set
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  name = excluded.name,
  level = excluded.level,
  parent_id = excluded.parent_id,
  root_unit = excluded.root_unit,
  domain_unit = excluded.domain_unit,
  status = excluded.status,
  children_required = excluded.children_required,
  owned_concern = excluded.owned_concern,
  ddd_owner = excluded.ddd_owner,
  cq_rails = excluded.cq_rails,
  revision = planning_query_store.governance_component_local_definitions.revision + 1;

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST',
    'owns',
    'apps/web/src/app/views/canvas/CanvasSourceImportDialogHost.tsx',
    0
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST',
    'owns',
    'apps/web/src/app/views/canvas/useCanvasSourceImportDialogState.ts',
    1
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-PREVIEW-TRANSFORMATION',
    'excludes',
    'apps/web/src/app/views/canvas/useCanvasSourceImportDialogState.ts',
    0
  )
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST',
    'responsibility',
    'Host the contextual source import dialog from Canvas commands and preserve canvas placement/initial table selection through completion.',
    0
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST',
    'reason_to_change',
    'Canvas source-import dialog open/close lifecycle, placement propagation, initial selection, or SourceImportWizard host wiring changes.',
    0
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST',
    'public_api',
    'CanvasSourceImportDialogHost',
    0
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST',
    'public_api',
    'useCanvasSourceImportDialogState',
    1
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST',
    'invariant',
    'The host delegates warehouse browsing and import semantics to SourceImportWizard and owns only the Canvas contextual dialog boundary.',
    0
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST',
    'consumer',
    'CanvasShell source import dialog composition.',
    0
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST',
    'governance_ref',
    'docs/architecture/components/web/frontend-component-inventory.md#SourceImportDialog',
    0
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST',
    'governance_ref',
    'docs/architecture/command-query-rail-governance.md',
    1
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST',
    'fowler_signal',
    'boundary_drift',
    0
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

insert into architecture.component (
  component_id,
  name,
  kind,
  layer,
  owner,
  repo_path,
  public_contract,
  runtime,
  criticality,
  status,
  parent_component_id
)
values (
  'SYS-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST',
  'Canvas source import dialog host',
  'ui-view',
  'ui',
  'CanvasSourceImportDialogHost',
  'apps/web/src/app/views/canvas/CanvasSourceImportDialogHost.tsx',
  'Contextual Canvas source import dialog host that delegates warehouse browsing and import semantics to SourceImportWizard.',
  'browser',
  'medium',
  'implemented',
  'SYS-WEB-CANVAS-ADD-SOURCE-DIALOG'
)
on conflict (component_id) do update set
  name = excluded.name,
  kind = excluded.kind,
  layer = excluded.layer,
  owner = excluded.owner,
  repo_path = excluded.repo_path,
  public_contract = excluded.public_contract,
  runtime = excluded.runtime,
  criticality = excluded.criticality,
  status = excluded.status,
  parent_component_id = excluded.parent_component_id,
  updated_at = now();

insert into architecture.component_responsibility (
  responsibility_id,
  component_id,
  responsibility,
  reason_to_change,
  ddd_owner,
  status
)
values (
  'RESP-SYS-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST',
  'SYS-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST',
  'Host the contextual Canvas source import dialog and carry placement/initial selection into SourceImportWizard completion.',
  'Canvas source-import dialog lifecycle, host boundary, placement propagation, or initial-selection behavior changes.',
  'CanvasSourceImportDialogHost',
  'proposed'
)
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

insert into architecture.component_relation (
  relation_id,
  source_component_id,
  target_component_id,
  relation_type,
  direction,
  sync_async,
  contract_id,
  failure_mode,
  authorization_scope,
  source_refs,
  status
)
values (
  'REL-WEB-CANVAS-ADD-SOURCE-DIALOG-CONTAINS-SOURCE-IMPORT-DIALOG-HOST',
  'SYS-WEB-CANVAS-ADD-SOURCE-DIALOG',
  'SYS-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST',
  'contains',
  'outbound',
  'sync',
  null,
  'not_applicable',
  'internal-ui-component-ownership',
  jsonb_build_array(
    'tools/planning-db/migrations/278_reconcile_canvas_source_import_dialog_host_ownership.sql'
  ),
  'implemented'
)
on conflict (relation_id) do update set
  source_component_id = excluded.source_component_id,
  target_component_id = excluded.target_component_id,
  relation_type = excluded.relation_type,
  direction = excluded.direction,
  sync_async = excluded.sync_async,
  contract_id = excluded.contract_id,
  failure_mode = excluded.failure_mode,
  authorization_scope = excluded.authorization_scope,
  source_refs = excluded.source_refs,
  status = excluded.status,
  updated_at = now();

insert into architecture.component_test (
  test_id,
  component_id,
  test_path,
  test_kind,
  coverage_level,
  required,
  validation_command
)
values (
  'TEST-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST',
  'SYS-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST',
  'apps/web/src/app/views/canvas/CanvasShell.sourceImportLifecycle.test.tsx',
  'unit',
  'behavior',
  true,
  'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/CanvasShell.sourceImportLifecycle.test.tsx src/app/views/canvas/CanvasShell.sourceImportAvailability.test.tsx'
)
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

refresh materialized view planning_query_store.component_engineering_file_ownership_projection;
refresh materialized view planning_query_store.component_engineering_rule_evaluation_projection;
