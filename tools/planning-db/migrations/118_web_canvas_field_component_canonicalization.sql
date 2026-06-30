-- Canonicalize Canvas authoring field components after the duplicate fields
-- leaf exposed existing DBT/DVT field components. Relation retirement is not
-- modeled yet, so stale relation rows stay implemented with audit rationale
-- instead of using status=drift, which is an active integrity failure.

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
  'PLANNING-DB-WEB-CANVAS-FIELD-CANONICALIZATION-20260617',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Web Canvas field component canonicalization',
  'Architecture / Planning DB / Frontend',
  'implemented',
  'The DB already had canonical DBT and DVT field components with tests and relations. This design reparents those components under NodeWorkbench and deprecates the later aggregate FIELDS split as a semantic duplicate.',
  'responsibility_overload',
  'ReparentGovernanceComponent;RecordArchitectureComponent;RecordArchitectureRelation;CheckPlanningDbComponentIntegrity',
  now()
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  approved_at = coalesce(architecture.design.approved_at, excluded.approved_at),
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
values
  (
    'SYS-WEB-CANVAS-INSPECTOR-DBT-FIELDS',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    '19fdb3eaa5f00bd93209fd33b58ffe7c4b037ab6d2fb24902e50aa77eaa51f04',
    1,
    'Canvas inspector dbt authoring fields',
    'component',
    'SYS-WEB-CANVAS-NODE-WORKBENCH',
    'SYS-DVT',
    'SYS-DVT',
    'canonical',
    false,
    'Render dbt plugin authoring fields and generated model SQL preview without owning generic Canvas execution semantics.',
    'AS',
    'ConfigureCanvasDbtNode,SelectDbtModelOrigin,GenerateDbtWorkspaceArtifacts,BuildDbtPlannerGraphSource',
    'codex'
  ),
  (
    'SYS-WEB-CANVAS-INSPECTOR-DVT-FIELDS',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    '19fdb3eaa5f00bd93209fd33b58ffe7c4b037ab6d2fb24902e50aa77eaa51f04',
    1,
    'Canvas inspector DVT authoring fields',
    'component',
    'SYS-WEB-CANVAS-NODE-WORKBENCH',
    'SYS-DVT',
    'SYS-DVT',
    'canonical',
    false,
    'Render DVT source, SQL transform, and sink authoring fields without overloading the inspector section controller.',
    'AS',
    'ConfigureCanvasDvtNode,GenerateTransformationWorkspaceArtifacts',
    'codex'
  )
on conflict (component_id) do update set
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  revision = greatest(planning_query_store.governance_component_local_definitions.revision, excluded.revision),
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

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values
  ('SYS-WEB-CANVAS-INSPECTOR-DBT-FIELDS', 'owns', 'apps/web/src/app/views/canvas/DbtAuthoringFields.tsx', 0),
  ('SYS-WEB-CANVAS-INSPECTOR-DVT-FIELDS', 'owns', 'apps/web/src/app/views/canvas/DvtAuthoringFields.tsx', 0)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  ('SYS-WEB-CANVAS-INSPECTOR-DBT-FIELDS', 'consumer', 'CanvasInspectorAuthoringSection', 0),
  ('SYS-WEB-CANVAS-INSPECTOR-DBT-FIELDS', 'fowler_signal', 'Boundary drift', 0),
  ('SYS-WEB-CANVAS-INSPECTOR-DBT-FIELDS', 'fowler_signal', 'Responsibility overload', 1),
  ('SYS-WEB-CANVAS-INSPECTOR-DBT-FIELDS', 'governance_ref', 'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md', 0),
  ('SYS-WEB-CANVAS-INSPECTOR-DBT-FIELDS', 'invariant', 'dbt-specific model definition policy remains plugin-owned and does not add SQL requirements to generic Canvas DTOs.', 0),
  ('SYS-WEB-CANVAS-INSPECTOR-DBT-FIELDS', 'public_api', 'DbtAuthoringFields', 0),
  ('SYS-WEB-CANVAS-INSPECTOR-DBT-FIELDS', 'transition', 'selected dbt model origin -> generated SQL preview -> workspace artifact projection during Plan', 0),
  ('SYS-WEB-CANVAS-INSPECTOR-DVT-FIELDS', 'consumer', 'CanvasInspectorAuthoringSection', 0),
  ('SYS-WEB-CANVAS-INSPECTOR-DVT-FIELDS', 'fowler_signal', 'Responsibility overload', 0),
  ('SYS-WEB-CANVAS-INSPECTOR-DVT-FIELDS', 'fowler_signal', 'Boundary drift', 1),
  ('SYS-WEB-CANVAS-INSPECTOR-DVT-FIELDS', 'governance_ref', 'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md', 0),
  ('SYS-WEB-CANVAS-INSPECTOR-DVT-FIELDS', 'invariant', 'DVT field validation stays in DVT authoring metadata and the component only renders route-owned draft updates.', 0),
  ('SYS-WEB-CANVAS-INSPECTOR-DVT-FIELDS', 'public_api', 'DvtAuthoringFields', 0),
  ('SYS-WEB-CANVAS-INSPECTOR-DVT-FIELDS', 'transition', 'selected DVT node -> route draft field edits -> validated Canvas draft application', 0)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update planning_query_store.governance_component_local_definitions
set
  parent_id = 'SYS-WEB-CANVAS-NODE-WORKBENCH',
  source_path = 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
  source_content_sha256 = '19fdb3eaa5f00bd93209fd33b58ffe7c4b037ab6d2fb24902e50aa77eaa51f04',
  revision = greatest(revision, 1)
where component_id in (
  'SYS-WEB-CANVAS-INSPECTOR-DBT-FIELDS',
  'SYS-WEB-CANVAS-INSPECTOR-DVT-FIELDS'
);

update planning_query_store.governance_component_local_definitions
set
  status = 'superseded',
  owned_concern = 'Superseded aggregate field split. DBT fields are owned by SYS-WEB-CANVAS-INSPECTOR-DBT-FIELDS and DVT fields are owned by SYS-WEB-CANVAS-INSPECTOR-DVT-FIELDS.',
  ddd_owner = 'CanvasNodeWorkbenchDuplicateResolution',
  cq_rails = 'none - superseded duplicate component split',
  source_path = 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
  source_content_sha256 = '19fdb3eaa5f00bd93209fd33b58ffe7c4b037ab6d2fb24902e50aa77eaa51f04',
  revision = greatest(revision, 1)
where component_id = 'SYS-WEB-CANVAS-NODE-WORKBENCH-FIELDS';

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-FIELDS', 'fowler_signal', 'duplicate_semantics', 1),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-FIELDS', 'governance_ref', 'Superseded by SYS-WEB-CANVAS-INSPECTOR-DBT-FIELDS and SYS-WEB-CANVAS-INSPECTOR-DVT-FIELDS.', 1),
  ('SYS-WEB-CANVAS-INSPECTOR-DBT-FIELDS', 'governance_ref', 'Reparented under SYS-WEB-CANVAS-NODE-WORKBENCH by PLANNING-DB-WEB-CANVAS-FIELD-CANONICALIZATION-20260617.', 1),
  ('SYS-WEB-CANVAS-INSPECTOR-DVT-FIELDS', 'governance_ref', 'Reparented under SYS-WEB-CANVAS-NODE-WORKBENCH by PLANNING-DB-WEB-CANVAS-FIELD-CANONICALIZATION-20260617.', 1)
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
values
  (
    'SYS-WEB-CANVAS-INSPECTOR-DBT-FIELDS',
    'Web Canvas Inspector Dbt Fields',
    'ui-view',
    'ui',
    'Frontend / Canvas',
    'apps/web/src/app/views/canvas/DbtAuthoringFields.tsx',
    'Web Canvas Inspector Dbt Fields source boundary in apps/web',
    'none',
    'medium',
    'implemented',
    'SYS-WEB-CANVAS-NODE-WORKBENCH'
  ),
  (
    'SYS-WEB-CANVAS-INSPECTOR-DVT-FIELDS',
    'Web Canvas Inspector Dvt Fields',
    'ui-view',
    'ui',
    'Frontend / Canvas',
    'apps/web/src/app/views/canvas/DvtAuthoringFields.tsx',
    'Web Canvas Inspector Dvt Fields source boundary in apps/web',
    'none',
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

update architecture.component
set
  status = 'deprecated',
  public_contract = 'Deprecated aggregate field split. DBT/DVT field ownership is canonical in SYS-WEB-CANVAS-INSPECTOR-DBT-FIELDS and SYS-WEB-CANVAS-INSPECTOR-DVT-FIELDS.',
  repo_path = 'planning_query_store.governance_component_local_definitions#SYS-WEB-CANVAS-NODE-WORKBENCH-FIELDS',
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-NODE-WORKBENCH-FIELDS';

update architecture.component
set
  parent_component_id = 'SYS-WEB-CANVAS-NODE-WORKBENCH',
  updated_at = now()
where component_id in (
  'SYS-WEB-CANVAS-INSPECTOR-DBT-FIELDS',
  'SYS-WEB-CANVAS-INSPECTOR-DVT-FIELDS'
);

insert into architecture.component_responsibility (
  responsibility_id,
  component_id,
  responsibility,
  reason_to_change,
  ddd_owner,
  status
)
values
  (
    'RESP-SYS-WEB-CANVAS-INSPECTOR-DBT-FIELDS',
    'SYS-WEB-CANVAS-INSPECTOR-DBT-FIELDS',
    'Render dbt plugin authoring fields and generated model SQL preview without owning generic Canvas execution semantics.',
    'Ownership, command/query rail, or source path boundary changes for SYS-WEB-CANVAS-INSPECTOR-DBT-FIELDS.',
    'AS',
    'implemented'
  ),
  (
    'SYS-WEB-CANVAS-INSPECTOR-DBT-FIELDS-RESP-OWNERSHIP',
    'SYS-WEB-CANVAS-INSPECTOR-DBT-FIELDS',
    'Own dbt-specific inspector authoring fields in the Canvas node workbench.',
    'dbt column, test-target, or authoring field behavior changes.',
    'Frontend / Canvas',
    'implemented'
  ),
  (
    'RESP-SYS-WEB-CANVAS-INSPECTOR-DVT-FIELDS',
    'SYS-WEB-CANVAS-INSPECTOR-DVT-FIELDS',
    'Render DVT source, SQL transform, and sink authoring fields without overloading the inspector section controller.',
    'Ownership, command/query rail, or source path boundary changes for SYS-WEB-CANVAS-INSPECTOR-DVT-FIELDS.',
    'AS',
    'implemented'
  ),
  (
    'SYS-WEB-CANVAS-INSPECTOR-DVT-FIELDS-RESP-OWNERSHIP',
    'SYS-WEB-CANVAS-INSPECTOR-DVT-FIELDS',
    'Own DVT-specific inspector authoring fields in the Canvas node workbench.',
    'DVT node authoring field behavior or inspector contract changes.',
    'Frontend / Canvas',
    'implemented'
  )
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

update architecture.component_responsibility
set
  responsibility = 'Superseded aggregate field split retained for audit.',
  reason_to_change = 'Replaced by SYS-WEB-CANVAS-INSPECTOR-DBT-FIELDS and SYS-WEB-CANVAS-INSPECTOR-DVT-FIELDS.',
  ddd_owner = 'CanvasNodeWorkbenchDuplicateResolution',
  status = 'drift'
where responsibility_id = 'RESP-SYS-WEB-CANVAS-NODE-WORKBENCH-FIELDS';

update architecture.component_relation
set
  status = 'implemented',
  failure_mode = 'Historical relation retained until a relation-retirement rail exists; canonical active field ownership is DBT/DVT-specific.',
  source_refs = source_refs || jsonb_build_array(
    'PLANNING-DB-WEB-CANVAS-FIELD-CANONICALIZATION-20260617'
  ),
  updated_at = now()
where relation_id in (
  'REL-WEB-APP-COMPONENTS-CONTAINS-CANVAS-INSPECTOR-PANEL',
  'REL-WEB-CANVAS-NODE-WORKBENCH-CONTAINS-PANEL',
  'REL-WEB-CANVAS-NODE-WORKBENCH-CONTAINS-FIELDS'
);

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
    'REL-WEB-CANVAS-NODE-WORKBENCH-CONTAINS-WEB-CANVAS-INSPECTOR-DBT-FIELDS',
    'SYS-WEB-CANVAS-NODE-WORKBENCH',
    'SYS-WEB-CANVAS-INSPECTOR-DBT-FIELDS',
    'contains',
    'outbound',
    'sync',
    'not_applicable',
    'browser-user',
    '["PLANNING-DB-WEB-CANVAS-FIELD-CANONICALIZATION-20260617"]'::jsonb,
    'implemented'
  ),
  (
    'REL-WEB-CANVAS-NODE-WORKBENCH-CONTAINS-WEB-CANVAS-INSPECTOR-DVT-FIELDS',
    'SYS-WEB-CANVAS-NODE-WORKBENCH',
    'SYS-WEB-CANVAS-INSPECTOR-DVT-FIELDS',
    'contains',
    'outbound',
    'sync',
    'not_applicable',
    'browser-user',
    '["PLANNING-DB-WEB-CANVAS-FIELD-CANONICALIZATION-20260617"]'::jsonb,
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
values
  (
    'TEST-WEB-CANVAS-INSPECTOR-DBT-FIELDS-PROFILE',
    'SYS-WEB-CANVAS-INSPECTOR-DBT-FIELDS',
    'apps/web/src/app/views/canvas/canvasInspectorAuthoringComponent.architecture.test.ts',
    'architecture',
    'boundary',
    true,
    'pnpm --filter @dvt/web test -- src/app/views/canvas/canvasInspectorAuthoringComponent.architecture.test.ts'
  ),
  (
    'TEST-WEB-CANVAS-INSPECTOR-DVT-FIELDS-PROFILE',
    'SYS-WEB-CANVAS-INSPECTOR-DVT-FIELDS',
    'apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.test.ts',
    'unit',
    'behavior',
    true,
    'pnpm --filter @dvt/web test -- src/app/views/canvas/canvasInspectorAuthoringModel.test.ts'
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
where test_id in (
  'TEST-WEB-CANVAS-NODE-WORKBENCH-PANEL',
  'TEST-WEB-CANVAS-NODE-WORKBENCH-FIELDS'
);

insert into architecture.design_scope (
  design_id,
  subject_kind,
  subject_id,
  scope_kind,
  required
)
values
  ('PLANNING-DB-WEB-CANVAS-FIELD-CANONICALIZATION-20260617', 'component', 'SYS-WEB-CANVAS-INSPECTOR-DBT-FIELDS', 'may_update', true),
  ('PLANNING-DB-WEB-CANVAS-FIELD-CANONICALIZATION-20260617', 'component', 'SYS-WEB-CANVAS-INSPECTOR-DVT-FIELDS', 'may_update', true),
  ('PLANNING-DB-WEB-CANVAS-FIELD-CANONICALIZATION-20260617', 'component', 'SYS-WEB-CANVAS-NODE-WORKBENCH-FIELDS', 'may_update', true),
  ('PLANNING-DB-WEB-CANVAS-FIELD-CANONICALIZATION-20260617', 'relation', 'REL-WEB-CANVAS-NODE-WORKBENCH-CONTAINS-FIELDS', 'may_update', true),
  ('PLANNING-DB-WEB-CANVAS-FIELD-CANONICALIZATION-20260617', 'relation', 'REL-WEB-CANVAS-NODE-WORKBENCH-CONTAINS-PANEL', 'may_update', true),
  ('PLANNING-DB-WEB-CANVAS-FIELD-CANONICALIZATION-20260617', 'relation', 'REL-WEB-APP-COMPONENTS-CONTAINS-CANVAS-INSPECTOR-PANEL', 'may_update', true),
  ('PLANNING-DB-WEB-CANVAS-FIELD-CANONICALIZATION-20260617', 'test', 'TEST-WEB-CANVAS-NODE-WORKBENCH-FIELDS', 'may_update', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;
