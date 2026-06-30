-- Restore the active Canvas node workbench panel authority after merging the
-- historical retirement branch with the branch that reintroduced real panel
-- files. Some local DBs have migrations 240/241 recorded before the retirement
-- guard 239 was added, so the active manifest must be reasserted append-only.

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
  'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-ACTIVE-MERGE-RECONCILIATION-20260619',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Restore active Canvas node workbench panel after retirement merge',
  'Architecture / Planning DB / Frontend',
  'implemented',
  'The merge brings tracked CanvasNodeWorkbenchPanel source and test files from main, while the retirement slice can still leave SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL deprecated and its DB-local feature manifest deleted in local databases. The final authority is the implemented Canvas-owned panel, with the historical retirement records retained only as superseded drift evidence.',
  'responsibility_overload',
  'InspectCanvasNodeProperties;ConfigureCanvasDbtNode;ConfigureCanvasDvtNode',
  'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-FEATURE-MANIFEST-RETIREMENT-20260619',
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
    'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-ACTIVE-MERGE-RECONCILIATION-20260619',
    'component',
    'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-ACTIVE-MERGE-RECONCILIATION-20260619',
    'query',
    'local#WEB-CANVAS-NODE-WORKBENCH-PANEL-20260619#query#inspectcanvasnodeproperties',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-ACTIVE-MERGE-RECONCILIATION-20260619',
    'path',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
    'may_reference',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-ACTIVE-MERGE-RECONCILIATION-20260619',
    'path',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx',
    'may_reference',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update architecture.design
set
  status = 'superseded',
  rationale = 'Superseded by PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-ACTIVE-MERGE-RECONCILIATION-20260619 because tracked CanvasNodeWorkbenchPanel source and test files now exist.',
  updated_at = now()
where design_id in (
  'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-FEATURE-MANIFEST-RETIREMENT-20260619',
  'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-FINAL-RETIREMENT-GUARD-20260619',
  'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-PARALLEL-REACTIVATION-NEUTRALIZATION-20260619',
  'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-REASSERTION-NEUTRALIZATION-20260619',
  'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-UNTRACKED-REACTIVATION-HARDENING-20260619',
  'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-UNTRACKED-REACTIVATION-REVERSAL-20260619'
);

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
  'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
  coalesce(
    (
      select file_ref.content_hash
      from planning_query_store.governance_files file_ref
      where file_ref.path = 'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx'
    ),
    repeat('0', 64)
  ),
  42,
  'Canvas node workbench panel',
  'component',
  'SYS-WEB-CANVAS-NODE-WORKBENCH',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  false,
  'Owns the Canvas contextual node workbench panel that renders node properties, columns, inputs/outputs, tests, code, and DBT/DVT authoring from Canvas read models and command rails.',
  'CanvasNodeWorkbenchPanel',
  'InspectCanvasNodeProperties;ConfigureCanvasDbtNode;ConfigureCanvasDvtNode',
  'codex'
)
on conflict (component_id) do update set
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  revision = greatest(planning_query_store.governance_component_local_definitions.revision, excluded.revision) + 1,
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
where component_id = 'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL';

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
    'Canvas node workbench panel presentation, tab grouping, metadata display, authoring composition, or plugin-panel handoff changes.',
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
    'fowler_signal',
    'component_ownership_drift',
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
  'CanvasNodeWorkbenchPanelProps',
  'browser',
  'high',
  'implemented',
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

delete from architecture.component_port
where component_id = 'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL';

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
values
  (
    'PORT-SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL-INSPECTCANVASNODEPROPERTIES',
    'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
    'InspectCanvasNodeProperties',
    'query',
    'inbound',
    'CONTRACT-SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL-SURFACE',
    'CONTRACT-SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL-SURFACE',
    array[
      'missing columns render an explicit empty state',
      'overlay must not mount CanvasInspectorPanel'
    ],
    'implemented'
  ),
  (
    'PORT-SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL-CONFIGURECANVASDBTNODE',
    'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
    'ConfigureCanvasDbtNode',
    'command',
    'outbound',
    'CONTRACT-SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL-SURFACE',
    'CONTRACT-SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL-SURFACE',
    array['invalid dbt node authoring sections stay local and tested'],
    'implemented'
  ),
  (
    'PORT-SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL-CONFIGURECANVASDVTNODE',
    'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
    'ConfigureCanvasDvtNode',
    'command',
    'outbound',
    'CONTRACT-SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL-SURFACE',
    'CONTRACT-SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL-SURFACE',
    array['invalid DVT node authoring sections stay local and tested'],
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

delete from architecture.component_observability
where observability_id = 'OBS-SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL-PHANTOM-RETIREMENT';

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
  'Canvas node workbench panel is observable through component-profile, files query ownership, feature mechanization symbols, presentation tests, and overlay handoff tests.',
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
  'local#WEB-CANVAS-NODE-WORKBENCH-PANEL-20260619#query#inspectcanvasnodeproperties',
  'WEB-CANVAS-NODE-WORKBENCH-PANEL-20260619',
  'implemented',
  'InspectCanvasNodeProperties',
  'inspectcanvasnodeproperties',
  'query',
  'CanvasNodeWorkbenchPanel',
  'implemented',
  jsonb_build_array(
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx#CanvasNodeWorkbenchPanel',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx#CanvasNodeWorkbenchPanelProps',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx#CanvasNodeWorkbenchSection',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx#NodeWorkbenchTabItem',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx#PRIMARY_NODE_WORKBENCH_SECTION_IDS',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx#isPrimarySection',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx#renderCountBadge',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx#renderSectionBody',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx#resolveActiveNodeWorkbenchTab',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx#sectionSlot'
  ),
  jsonb_build_array(
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.tsx',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx',
    'apps/web/src/app/views/canvas/CanvasShellMainPanel.architecture.test.ts',
    'tools/planning-db/migrations/242_restore_canvas_node_workbench_panel_after_retirement_merge.sql'
  ),
  jsonb_build_array(
    'docs/architecture/components/web/graph/canvas-inspector-authoring-component.md',
    'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md',
    'buzon/TAREA.TXT'
  ),
  jsonb_build_array(
    'AGENTS.md',
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/guides/ai-work-protocol.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md',
    'buzon/TAREA.TXT'
  ),
  jsonb_build_array(
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.tsx',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx',
    'apps/web/src/app/views/canvas/CanvasShellMainPanel.architecture.test.ts',
    'tools/planning-db/migrations/242_restore_canvas_node_workbench_panel_after_retirement_merge.sql'
  ),
  jsonb_build_array(
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx',
    'apps/web/src/app/views/canvas/CanvasShellMainPanel.architecture.test.ts',
    'pnpm docs:feature-mechanization:implementation'
  ),
  jsonb_build_array(
    'pnpm docs:feature-mechanization:implementation',
    'pnpm planning:db:query component-profile --component SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL --no-refresh --limit 80',
    'pnpm verify:prepush'
  ),
  'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
  coalesce(
    (
      select file_ref.content_hash
      from planning_query_store.governance_files file_ref
      where file_ref.path = 'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx'
    ),
    repeat('0', 64)
  ),
  jsonb_build_object(
    'name', 'InspectCanvasNodeProperties',
    'type', 'query',
    'status', 'implemented',
    'dddOwner', 'CanvasNodeWorkbenchPanel'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'WEB-CANVAS-NODE-WORKBENCH-PANEL-20260619',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan', 'tools/planning-db/migrations/242_restore_canvas_node_workbench_panel_after_retirement_merge.sql',
    'componentGuides', jsonb_build_array(
      'docs/architecture/components/web/graph/canvas-inspector-authoring-component.md',
      'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md'
    ),
    'userStories', jsonb_build_array(
      'Node workbench is opened contextually from the canvas while graph remains the primary surface.',
      'Node details expose properties, columns, inputs/outputs, tests, and code without delegating to the generic inspector.'
    ),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/guides/ai-work-protocol.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md',
      'buzon/TAREA.TXT'
    ),
    'allowedImplementationSurfaces', jsonb_build_array(
      'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
      'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx',
      'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.tsx',
      'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx',
      'apps/web/src/app/views/canvas/CanvasShellMainPanel.architecture.test.ts',
      'tools/planning-db/migrations/242_restore_canvas_node_workbench_panel_after_retirement_merge.sql'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'apps/web/src/app/components/InspectorPanel.tsx#Canvas node workbench rendering',
      'buzon/**'
    ),
    'domainObjects', jsonb_build_array(
      jsonb_build_object('name', 'CanvasNodeWorkbenchPanel', 'type', 'presentation component', 'owner', 'Canvas workbench'),
      jsonb_build_object('name', 'NodePropertiesReadModel', 'type', 'query read model', 'owner', 'Canvas node properties')
    ),
    'fowlerSignals', jsonb_build_array(
      'presentation_logic_separation',
      'component_ownership_drift',
      'responsibility_overload'
    ),
    'architectureGuards', jsonb_build_array(
      jsonb_build_object(
        'name', 'CanvasShellMainPanel.architecture.test.ts',
        'command', 'pnpm --filter @dvt/web test:architecture:run -- src/app/views/canvas/CanvasShellMainPanel.architecture.test.ts'
      )
    ),
    'cypressFlows', jsonb_build_array(
      jsonb_build_object(
        'name', 'not_applicable:component_boundary',
        'command', 'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx'
      )
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object('name', 'InspectCanvasNodeProperties', 'type', 'query', 'dddOwner', 'CanvasNodeWorkbenchPanel', 'status', 'implemented'),
      jsonb_build_object('name', 'ConfigureCanvasDbtNode', 'type', 'command', 'dddOwner', 'CanvasInspectorAuthoringSection', 'status', 'implemented'),
      jsonb_build_object('name', 'ConfigureCanvasDvtNode', 'type', 'command', 'dddOwner', 'CanvasInspectorAuthoringSection', 'status', 'implemented')
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'canvas-node-workbench-panel-active-merge-reconciliation',
        'redTest', 'pnpm docs:feature-mechanization:implementation',
        'expectedFailure', 'CanvasNodeWorkbenchPanel symbols are present in code but no DB-local feature manifest declares them after the retirement merge.',
        'patchSurfaces', jsonb_build_array(
          'tools/planning-db/migrations/242_restore_canvas_node_workbench_panel_after_retirement_merge.sql'
        ),
        'greenTest', 'pnpm docs:feature-mechanization:implementation'
      )
    ),
    'completionGate', jsonb_build_array(
      'pnpm docs:feature-mechanization:implementation',
      'pnpm planning:db:query component-profile --component SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL --no-refresh --limit 80',
      'pnpm verify:prepush'
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object('name', 'PRIMARY_NODE_WORKBENCH_SECTION_IDS', 'path', 'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx', 'dddOwner', 'CanvasNodeWorkbenchPanel', 'cqRails', jsonb_build_array('InspectCanvasNodeProperties'), 'fowlerSignals', jsonb_build_array('presentation_logic_separation'), 'architectureGuard', 'apps/web/src/app/views/canvas/CanvasShellMainPanel.architecture.test.ts', 'cypressCoverage', 'not_applicable:component_boundary', 'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx')),
      jsonb_build_object('name', 'NodeWorkbenchTabItem', 'path', 'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx', 'dddOwner', 'CanvasNodeWorkbenchPanel', 'cqRails', jsonb_build_array('InspectCanvasNodeProperties'), 'fowlerSignals', jsonb_build_array('presentation_logic_separation'), 'architectureGuard', 'apps/web/src/app/views/canvas/CanvasShellMainPanel.architecture.test.ts', 'cypressCoverage', 'not_applicable:component_boundary', 'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx')),
      jsonb_build_object('name', 'CanvasNodeWorkbenchPanelProps', 'path', 'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx', 'dddOwner', 'CanvasNodeWorkbenchPanel', 'cqRails', jsonb_build_array('InspectCanvasNodeProperties'), 'fowlerSignals', jsonb_build_array('component_ownership_drift'), 'architectureGuard', 'apps/web/src/app/views/canvas/CanvasShellMainPanel.architecture.test.ts', 'cypressCoverage', 'not_applicable:component_boundary', 'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx')),
      jsonb_build_object('name', 'sectionSlot', 'path', 'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx', 'dddOwner', 'CanvasNodeWorkbenchPanel', 'cqRails', jsonb_build_array('InspectCanvasNodeProperties'), 'fowlerSignals', jsonb_build_array('presentation_logic_separation'), 'architectureGuard', 'apps/web/src/app/views/canvas/CanvasShellMainPanel.architecture.test.ts', 'cypressCoverage', 'not_applicable:component_boundary', 'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx')),
      jsonb_build_object('name', 'isPrimarySection', 'path', 'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx', 'dddOwner', 'CanvasNodeWorkbenchPanel', 'cqRails', jsonb_build_array('InspectCanvasNodeProperties'), 'fowlerSignals', jsonb_build_array('presentation_logic_separation'), 'architectureGuard', 'apps/web/src/app/views/canvas/CanvasShellMainPanel.architecture.test.ts', 'cypressCoverage', 'not_applicable:component_boundary', 'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx')),
      jsonb_build_object('name', 'renderCountBadge', 'path', 'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx', 'dddOwner', 'CanvasNodeWorkbenchPanel', 'cqRails', jsonb_build_array('InspectCanvasNodeProperties'), 'fowlerSignals', jsonb_build_array('presentation_logic_separation'), 'architectureGuard', 'apps/web/src/app/views/canvas/CanvasShellMainPanel.architecture.test.ts', 'cypressCoverage', 'not_applicable:component_boundary', 'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx')),
      jsonb_build_object('name', 'renderSectionBody', 'path', 'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx', 'dddOwner', 'CanvasNodeWorkbenchPanel', 'cqRails', jsonb_build_array('InspectCanvasNodeProperties'), 'fowlerSignals', jsonb_build_array('presentation_logic_separation'), 'architectureGuard', 'apps/web/src/app/views/canvas/CanvasShellMainPanel.architecture.test.ts', 'cypressCoverage', 'not_applicable:component_boundary', 'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx')),
      jsonb_build_object('name', 'resolveActiveNodeWorkbenchTab', 'path', 'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx', 'dddOwner', 'CanvasNodeWorkbenchPanel', 'cqRails', jsonb_build_array('InspectCanvasNodeProperties'), 'fowlerSignals', jsonb_build_array('presentation_logic_separation'), 'architectureGuard', 'apps/web/src/app/views/canvas/CanvasShellMainPanel.architecture.test.ts', 'cypressCoverage', 'not_applicable:component_boundary', 'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx')),
      jsonb_build_object('name', 'CanvasNodeWorkbenchSection', 'path', 'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx', 'dddOwner', 'CanvasNodeWorkbenchPanel', 'cqRails', jsonb_build_array('InspectCanvasNodeProperties'), 'fowlerSignals', jsonb_build_array('presentation_logic_separation'), 'architectureGuard', 'apps/web/src/app/views/canvas/CanvasShellMainPanel.architecture.test.ts', 'cypressCoverage', 'not_applicable:component_boundary', 'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx')),
      jsonb_build_object('name', 'CanvasNodeWorkbenchPanel', 'path', 'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx', 'dddOwner', 'CanvasNodeWorkbenchPanel', 'cqRails', jsonb_build_array('InspectCanvasNodeProperties', 'ConfigureCanvasDbtNode', 'ConfigureCanvasDvtNode'), 'fowlerSignals', jsonb_build_array('responsibility_overload', 'component_ownership_drift'), 'architectureGuard', 'apps/web/src/app/views/canvas/CanvasShellMainPanel.architecture.test.ts', 'cypressCoverage', 'not_applicable:component_boundary', 'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx', 'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx'))
    )
  ),
  2,
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
  revision = greatest(planning_query_store.feature_mechanization_local_rails.revision, excluded.revision) + 1,
  updated_at = now();
