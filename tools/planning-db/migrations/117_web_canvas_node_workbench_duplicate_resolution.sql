-- Resolve the duplicate Canvas NodeWorkbench panel split introduced while
-- closing SYS-WEB-VIEW-CANVAS leaf ownership. The canonical InspectorPanel
-- component remains the shell owner; DBT/DVT field editors get their own leaf.

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
  'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-DUPLICATE-RESOLUTION-20260617',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Web Canvas node workbench duplicate component resolution',
  'Architecture / Planning DB / Frontend',
  'implemented',
  'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL duplicated the existing SYS-WEB-CANVAS-INSPECTOR-PANEL responsibility for InspectorPanel.tsx. The fix keeps the inspector shell component, reparents it under NodeWorkbench, creates a separate fields leaf for DBT/DVT editors, and marks the duplicate panel split as retired/deprecated.',
  'responsibility_overload',
  'ReparentGovernanceComponent;CreateGovernanceComponent;RecordArchitectureComponent;RecordArchitectureRelation;RecordArchitectureTestEvidence;CheckPlanningDbComponentIntegrity',
  now()
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  approved_at = coalesce(architecture.design.approved_at, excluded.approved_at),
  updated_at = now();

update planning_query_store.governance_component_local_definitions
set
  parent_id = 'SYS-WEB-CANVAS-NODE-WORKBENCH',
  source_path = 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
  source_content_sha256 = '19fdb3eaa5f00bd93209fd33b58ffe7c4b037ab6d2fb24902e50aa77eaa51f04',
  revision = greatest(revision, 1)
where component_id = 'SYS-WEB-CANVAS-INSPECTOR-PANEL';

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
  'SYS-WEB-CANVAS-NODE-WORKBENCH-FIELDS',
  'planning_query_store.governance_component_local_definitions',
  '5d3724e9cdda9a1009ce5fc48c788ec6bff0085901a2e7516aceff983ec59c32',
  0,
  'Canvas node workbench fields',
  'component',
  'SYS-WEB-CANVAS-NODE-WORKBENCH',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  false,
  'Owns DBT and DVT field editor presentation components inside the Canvas node workbench.',
  'CanvasNodeWorkbenchFields',
  'ConfigureCanvasDbtNode;ConfigureCanvasDvtNode',
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

update planning_query_store.governance_component_local_definitions
set
  status = 'superseded',
  owned_concern = 'Superseded duplicate split. InspectorPanel.tsx is owned by SYS-WEB-CANVAS-INSPECTOR-PANEL; DBT/DVT field editors are owned by SYS-WEB-CANVAS-NODE-WORKBENCH-FIELDS.',
  ddd_owner = 'CanvasNodeWorkbenchDuplicateResolution',
  cq_rails = 'none - superseded duplicate component split',
  source_path = 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
  source_content_sha256 = '19fdb3eaa5f00bd93209fd33b58ffe7c4b037ab6d2fb24902e50aa77eaa51f04',
  revision = greatest(revision, 1)
where component_id = 'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL';

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-FIELDS', 'owns', 'apps/web/src/app/views/canvas/DbtAuthoringFields.tsx', 0),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-FIELDS', 'owns', 'apps/web/src/app/views/canvas/DvtAuthoringFields.tsx', 1)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-FIELDS', 'responsibility', 'Render DBT and DVT authoring field editors inside the node workbench.', 0),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-FIELDS', 'reason_to_change', 'DBT or DVT field presentation changes.', 0),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-FIELDS', 'public_api', 'DbtAuthoringFields', 0),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-FIELDS', 'public_api', 'DvtAuthoringFields', 1),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-FIELDS', 'invariant', 'Field editor presentation is owned separately from the Inspector shell and field behavior tests.', 0),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-FIELDS', 'transition', 'review -> implemented after component-quality shows no files owned by SYS-WEB-CANVAS-NODE-WORKBENCH.', 0),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-FIELDS', 'consumer', 'Canvas node workbench Inspector shell.', 0),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-FIELDS', 'governance_ref', 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md', 0),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-FIELDS', 'fowler_signal', 'responsibility_overload', 0),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL', 'fowler_signal', 'duplicate_semantics', 1),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL', 'governance_ref', 'Superseded by SYS-WEB-CANVAS-INSPECTOR-PANEL and SYS-WEB-CANVAS-NODE-WORKBENCH-FIELDS.', 1)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update architecture.component
set
  repo_path = 'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.ts',
  public_contract = 'useCanvasViewportGraphModel and CanvasViewport presentation contract',
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-GRAPH-VIEWPORT-PRESENTATION';

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
  'SYS-WEB-CANVAS-INSPECTOR-PANEL',
  'Web Canvas inspector panel',
  'ui-view',
  'ui',
  'Frontend / Canvas',
  'apps/web/src/app/components/InspectorPanel.tsx',
  'Inspector shell renders selected node core details and plugin-owned read-only panels.',
  'browser',
  'medium',
  'implemented',
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
  parent_component_id = excluded.parent_component_id,
  updated_at = now();

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
  'SYS-WEB-CANVAS-NODE-WORKBENCH-FIELDS',
  'Canvas node workbench fields',
  'ui-view',
  'ui',
  'Frontend / Canvas',
  'apps/web/src/app/views/canvas/DbtAuthoringFields.tsx',
  'DbtAuthoringFields and DvtAuthoringFields presentation contract',
  'browser',
  'medium',
  'review',
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
  parent_component_id = excluded.parent_component_id,
  updated_at = now();

update architecture.component
set
  status = 'deprecated',
  public_contract = 'Deprecated duplicate split. InspectorPanel.tsx stays with SYS-WEB-CANVAS-INSPECTOR-PANEL; DBT/DVT field editors stay with SYS-WEB-CANVAS-NODE-WORKBENCH-FIELDS.',
  repo_path = 'planning_query_store.governance_component_local_definitions#SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL';

insert into architecture.component_responsibility (
  responsibility_id,
  component_id,
  responsibility,
  reason_to_change,
  ddd_owner,
  status
)
values (
  'RESP-SYS-WEB-CANVAS-NODE-WORKBENCH-FIELDS',
  'SYS-WEB-CANVAS-NODE-WORKBENCH-FIELDS',
  'Render DBT and DVT authoring field editors inside the node workbench.',
  'DBT or DVT field presentation changes.',
  'CanvasNodeWorkbenchFields',
  'proposed'
)
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

update architecture.component_responsibility
set
  responsibility = 'Superseded duplicate split retained for audit.',
  reason_to_change = 'Replaced by SYS-WEB-CANVAS-INSPECTOR-PANEL and SYS-WEB-CANVAS-NODE-WORKBENCH-FIELDS.',
  ddd_owner = 'CanvasNodeWorkbenchDuplicateResolution',
  status = 'drift'
where responsibility_id = 'RESP-SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL';

update architecture.component_relation
set
  status = 'drift',
  failure_mode = 'Superseded by REL-WEB-CANVAS-NODE-WORKBENCH-CONTAINS-INSPECTOR-PANEL.',
  updated_at = now()
where relation_id = 'REL-WEB-APP-COMPONENTS-CONTAINS-CANVAS-INSPECTOR-PANEL';

update architecture.component_relation
set
  status = 'drift',
  failure_mode = 'Superseded by REL-WEB-CANVAS-NODE-WORKBENCH-CONTAINS-FIELDS and the existing InspectorPanel component.',
  updated_at = now()
where relation_id = 'REL-WEB-CANVAS-NODE-WORKBENCH-CONTAINS-PANEL';

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
values
  (
    'REL-WEB-CANVAS-NODE-WORKBENCH-CONTAINS-INSPECTOR-PANEL',
    'SYS-WEB-CANVAS-NODE-WORKBENCH',
    'SYS-WEB-CANVAS-INSPECTOR-PANEL',
    'contains',
    'outbound',
    'sync',
    'not_applicable',
    'web_canvas_component_ownership',
    jsonb_build_array('docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md'),
    'implemented'
  ),
  (
    'REL-WEB-CANVAS-NODE-WORKBENCH-CONTAINS-FIELDS',
    'SYS-WEB-CANVAS-NODE-WORKBENCH',
    'SYS-WEB-CANVAS-NODE-WORKBENCH-FIELDS',
    'contains',
    'outbound',
    'sync',
    'not_applicable',
    'web_canvas_component_ownership',
    jsonb_build_array('docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md'),
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
  'TEST-WEB-CANVAS-NODE-WORKBENCH-FIELDS',
  'SYS-WEB-CANVAS-NODE-WORKBENCH-FIELDS',
  'apps/web/src/app/views/canvas/DbtAuthoringFields.test.tsx',
  'unit',
  'behavior',
  true,
  'pnpm --filter @dvt/web test -- src/app/views/canvas/DbtAuthoringFields.test.tsx src/app/views/canvas/DvtAuthoringFields.test.tsx'
)
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

update architecture.component_test
set required = false
where test_id = 'TEST-WEB-CANVAS-NODE-WORKBENCH-PANEL';

insert into architecture.design_scope (
  design_id,
  subject_kind,
  subject_id,
  scope_kind,
  required
)
values
  ('PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-DUPLICATE-RESOLUTION-20260617', 'component', 'SYS-WEB-CANVAS-INSPECTOR-PANEL', 'may_update', true),
  ('PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-DUPLICATE-RESOLUTION-20260617', 'component', 'SYS-WEB-CANVAS-NODE-WORKBENCH-FIELDS', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-DUPLICATE-RESOLUTION-20260617', 'component', 'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL', 'may_update', true),
  ('PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-DUPLICATE-RESOLUTION-20260617', 'component', 'SYS-WEB-CANVAS-GRAPH-VIEWPORT-PRESENTATION', 'may_update', true),
  ('PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-DUPLICATE-RESOLUTION-20260617', 'relation', 'REL-WEB-CANVAS-NODE-WORKBENCH-CONTAINS-INSPECTOR-PANEL', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-DUPLICATE-RESOLUTION-20260617', 'relation', 'REL-WEB-CANVAS-NODE-WORKBENCH-CONTAINS-FIELDS', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-DUPLICATE-RESOLUTION-20260617', 'relation', 'REL-WEB-APP-COMPONENTS-CONTAINS-CANVAS-INSPECTOR-PANEL', 'may_update', true),
  ('PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-DUPLICATE-RESOLUTION-20260617', 'relation', 'REL-WEB-CANVAS-NODE-WORKBENCH-CONTAINS-PANEL', 'may_update', true),
  ('PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-DUPLICATE-RESOLUTION-20260617', 'test', 'TEST-WEB-CANVAS-NODE-WORKBENCH-FIELDS', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-DUPLICATE-RESOLUTION-20260617', 'test', 'TEST-WEB-CANVAS-NODE-WORKBENCH-PANEL', 'may_update', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;
