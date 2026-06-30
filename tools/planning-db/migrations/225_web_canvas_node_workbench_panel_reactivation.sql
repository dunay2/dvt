-- Reactivate the Canvas node workbench panel as a real Canvas-owned panel.
-- Earlier DB state deprecated SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL because it
-- pointed at InspectorPanel.tsx. This slice creates CanvasNodeWorkbenchPanel.tsx
-- and makes that source the concrete panel leaf without reowning InspectorPanel.

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
  'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-REACTIVATION-20260619',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Reactivate Canvas node workbench panel with a real panel component',
  'Architecture / Planning DB',
  'implemented',
  'NodeWorkbench remained partial because the contextual overlay mounted CanvasInspectorPanel directly. CanvasNodeWorkbenchPanel.tsx now owns the Canvas-specific node workbench presentation while reusing the existing InspectCanvasNodeProperties query read model and ConfigureCanvasDbtNode/ConfigureCanvasDvtNode commands.',
  'responsibility_overload',
  'InspectCanvasNodeProperties;ConfigureCanvasDbtNode;ConfigureCanvasDvtNode',
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
  (
    'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-REACTIVATION-20260619',
    'component',
    'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-REACTIVATION-20260619',
    'component',
    'SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-REACTIVATION-20260619',
    'path',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
    'may_create',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-REACTIVATION-20260619',
    'path',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.tsx',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-REACTIVATION-20260619',
    'query',
    'InspectCanvasNodeProperties',
    'may_reference',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

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
  'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
  'tools/planning-db/migrations/225_web_canvas_node_workbench_panel_reactivation.sql',
  md5('SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL:225') || md5('apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx'),
  0,
  'Canvas node workbench panel',
  'component',
  'SYS-WEB-CANVAS-NODE-WORKBENCH',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  false,
  'Owns the Canvas-specific contextual node workbench panel that renders node properties, columns, IO, tests, code, and DBT/DVT authoring inside the graph overlay.',
  'CanvasNodeWorkbenchPanel',
  'InspectCanvasNodeProperties;ConfigureCanvasDbtNode;ConfigureCanvasDvtNode',
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
  cq_rails = excluded.cq_rails;

delete from planning_query_store.governance_component_local_ownership_patterns
where component_id = 'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL'
  and pattern_kind = 'owns';

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values
  (
    'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
    'owns',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
    0
  ),
  (
    'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
    'owns',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx',
    1
  )
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

delete from planning_query_store.governance_component_local_semantic_items
where component_id = 'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL';

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  (
    'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
    'responsibility',
    'Render Canvas-owned node workbench properties, columns, inputs/outputs, tests, code, and node authoring from governed read models and command contracts.',
    0
  ),
  (
    'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
    'reason_to_change',
    'Canvas node workbench panel presentation, tab vocabulary, column/test metadata display, or DBT/DVT authoring composition changes.',
    0
  ),
  (
    'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
    'public_api',
    'CanvasNodeWorkbenchPanel',
    0
  ),
  (
    'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
    'public_api',
    'CanvasNodeWorkbenchPanelProps',
    1
  ),
  (
    'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
    'invariant',
    'The contextual overlay mounts CanvasNodeWorkbenchPanel, not CanvasInspectorPanel. InspectorPanel remains a separate inspector boundary.',
    0
  ),
  (
    'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
    'governance_ref',
    'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md',
    0
  ),
  (
    'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
    'fowler_signal',
    'responsibility_overload',
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
  maturity_score,
  parent_component_id
)
values (
  'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
  'Canvas node workbench panel',
  'ui-view',
  'ui',
  'CanvasNodeWorkbenchPanel',
  'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
  'Canvas node workbench panel props and read-model presentation contract.',
  'browser',
  'high',
  'review',
  84,
  'SYS-WEB-CANVAS-NODE-WORKBENCH'
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
  maturity_score = excluded.maturity_score,
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
  'RESP-SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
  'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
  'Render Canvas node workbench metadata and authoring surfaces without delegating the overlay to InspectorPanel.',
  'Node workbench panel presentation, tabs, metadata, authoring composition, or plugin panel handoff changes.',
  'CanvasNodeWorkbenchPanel',
  'implemented'
)
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

insert into architecture.contract (
  contract_id,
  contract_kind,
  owner_component_id,
  contract_ref,
  compatibility,
  status,
  validation_command
)
values (
  'CONTRACT-SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL-SURFACE',
  'type',
  'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
  'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx#CanvasNodeWorkbenchPanelProps',
  'internal',
  'implemented',
  'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx'
)
on conflict (contract_id) do update set
  contract_kind = excluded.contract_kind,
  owner_component_id = excluded.owner_component_id,
  contract_ref = excluded.contract_ref,
  compatibility = excluded.compatibility,
  status = excluded.status,
  validation_command = excluded.validation_command,
  updated_at = now();

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
values
  (
    'REL-WEB-CANVAS-NODE-WORKBENCH-CONTAINS-PANEL',
    'SYS-WEB-CANVAS-NODE-WORKBENCH',
    'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
    'contains',
    'outbound',
    'sync',
    'CONTRACT-SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL-SURFACE',
    'Node workbench falls back to the generic inspector if the panel is removed without a governed replacement.',
    'browser-local Canvas node workbench',
    jsonb_build_array(
      'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.tsx',
      'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx'
    ),
    'implemented'
  ),
  (
    'REL-WEB-CANVAS-NODE-WORKBENCH-OVERLAY-DEPENDS-ON-PANEL',
    'SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY',
    'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
    'depends_on',
    'outbound',
    'sync',
    'CONTRACT-SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL-SURFACE',
    'Contextual node overlay cannot render node metadata without the panel component.',
    'browser-local Canvas node workbench',
    jsonb_build_array(
      'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.tsx',
      'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx'
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

insert into architecture.component_port (
  port_id,
  component_id,
  port_name,
  port_kind,
  direction,
  input_contract_id,
  output_contract_id,
  negative_tests,
  status
)
values (
  'PORT-SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL-INSPECTCANVASNODEPROPERTIES',
  'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
  'InspectCanvasNodeProperties',
  'query',
  'inbound',
  'CONTRACT-SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL-SURFACE',
  'CONTRACT-SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL-SURFACE',
  array[
    'missing columns render an explicit empty state',
    'dbt tests without target metadata do not fabricate target rows',
    'overlay must not mount CanvasInspectorPanel'
  ],
  'implemented'
)
on conflict (port_id) do update set
  component_id = excluded.component_id,
  port_name = excluded.port_name,
  port_kind = excluded.port_kind,
  direction = excluded.direction,
  input_contract_id = excluded.input_contract_id,
  output_contract_id = excluded.output_contract_id,
  negative_tests = excluded.negative_tests,
  status = excluded.status;

insert into architecture.component_test (
  test_id,
  component_id,
  test_path,
  test_kind,
  coverage_level,
  required,
  validation_command
)
values
  (
    'TEST-SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL-PRESENTATION',
    'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx',
    'unit',
    'behavior',
    true,
    'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx'
  ),
  (
    'TEST-SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL-OVERLAY-HANDOFF',
    'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx',
    'unit',
    'boundary',
    true,
    'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx'
  ),
  (
    'TEST-SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL-ARCHITECTURE',
    'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
    'apps/web/src/app/views/canvas/CanvasShellMainPanel.architecture.test.ts',
    'architecture',
    'boundary',
    true,
    'pnpm --filter @dvt/web test:architecture:run -- src/app/views/canvas/CanvasShellMainPanel.architecture.test.ts'
  )
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

insert into architecture.component_observability (
  observability_id,
  component_id,
  signal_name,
  signal_kind,
  required,
  status
)
values (
  'OBS-SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL-COMPONENT-PROFILE',
  'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
  'Canvas node workbench panel is observable through component-profile, presentation tests, and overlay handoff tests.',
  'dashboard',
  true,
  'implemented'
)
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;
