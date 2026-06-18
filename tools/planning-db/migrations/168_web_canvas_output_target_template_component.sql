-- Map the remaining Canvas residual source into a semantic component. This
-- catalog is functional code: it exposes governed SQL output target templates
-- and builds Canvas authoring seeds for the dvt:sink node kind.

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
  'SYS-WEB-CANVAS-OUTPUT-TARGET-TEMPLATES',
  'planning_query_store.governance_component_local_definitions',
  md5('SYS-WEB-CANVAS-OUTPUT-TARGET-TEMPLATES:168')
    || md5('Canvas output target templates:168'),
  0,
  'Canvas output target templates',
  'component',
  'SYS-WEB-CANVAS-NODE-EDGE-AUTHORING',
  'SYS-DVT',
  'SYS-DVT',
  'canonical',
  false,
  'Owns governed SQL output target templates and sink-node seeds for Canvas insertion.',
  'CanvasOutputTargetTemplateCatalog',
  'ListCanvasOutputTargetTemplates',
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

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values (
  'SYS-WEB-CANVAS-OUTPUT-TARGET-TEMPLATES',
  'owns',
  'apps/web/src/app/views/canvas/canvasOutputTargetTemplateCatalog*',
  0
)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

update planning_query_store.governance_component_local_semantic_items semantic_item
set
  item_value = 'published_language',
  item_order = 0
where semantic_item.component_id = 'SYS-WEB-CANVAS-OUTPUT-TARGET-TEMPLATES'
  and semantic_item.item_kind = 'fowler_signal'
  and semantic_item.item_value = 'catalog'
  and not exists (
    select 1
    from planning_query_store.governance_component_local_semantic_items existing_item
    where existing_item.component_id = semantic_item.component_id
      and existing_item.item_kind = semantic_item.item_kind
      and existing_item.item_value = 'published_language'
  );

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  (
    'SYS-WEB-CANVAS-OUTPUT-TARGET-TEMPLATES',
    'responsibility',
    'Expose selectable SQL output target templates for Canvas sink insertion.',
    0
  ),
  (
    'SYS-WEB-CANVAS-OUTPUT-TARGET-TEMPLATES',
    'reason_to_change',
    'Output target template semantics, sink seed metadata, or destination catalog policy changes.',
    0
  ),
  (
    'SYS-WEB-CANVAS-OUTPUT-TARGET-TEMPLATES',
    'invariant',
    'Return no templates when dvt:sink is not registered and preserve sink identity in every generated seed.',
    0
  ),
  (
    'SYS-WEB-CANVAS-OUTPUT-TARGET-TEMPLATES',
    'transition',
    'Node kind registrations -> governed output target template options -> Canvas authoring node seed metadata.',
    0
  ),
  (
    'SYS-WEB-CANVAS-OUTPUT-TARGET-TEMPLATES',
    'consumer',
    'CanvasAddNodePalette',
    0
  ),
  (
    'SYS-WEB-CANVAS-OUTPUT-TARGET-TEMPLATES',
    'consumer',
    'CanvasStateViews',
    1
  ),
  (
    'SYS-WEB-CANVAS-OUTPUT-TARGET-TEMPLATES',
    'governance_ref',
    'docs/architecture/command-query-rail-governance.md',
    0
  ),
  (
    'SYS-WEB-CANVAS-OUTPUT-TARGET-TEMPLATES',
    'governance_ref',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    1
  ),
  (
    'SYS-WEB-CANVAS-OUTPUT-TARGET-TEMPLATES',
    'fowler_signal',
    'published_language',
    0
  ),
  (
    'SYS-WEB-CANVAS-OUTPUT-TARGET-TEMPLATES',
    'public_api',
    'buildCanvasOutputTargetTemplateCatalog',
    0
  ),
  (
    'SYS-WEB-CANVAS-OUTPUT-TARGET-TEMPLATES',
    'public_api',
    'CanvasOutputTargetTemplate',
    1
  ),
  (
    'SYS-WEB-CANVAS-OUTPUT-TARGET-TEMPLATES',
    'public_api',
    'CanvasOutputTargetTemplateOption',
    2
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

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
  'PLANNING-DB-WEB-CANVAS-OUTPUT-TARGET-TEMPLATES-20260618',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Planning DB Web Canvas Output Target Template Component Map',
  'Frontend / Canvas',
  'review',
  'The Canvas output target template catalog was still owned by the flat residual Canvas bucket. This design records it as a semantic component so component-profile can answer files, tests, rails, DDD/Fowler basis, and relationships.',
  'published_language',
  'CreateGovernanceComponent;RecordArchitectureComponent;RecordArchitectureRelation;RecordArchitectureTestEvidence;CheckPlanningDbComponentIntegrity',
  now()
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
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
    'PLANNING-DB-WEB-CANVAS-OUTPUT-TARGET-TEMPLATES-20260618',
    'component',
    'SYS-WEB-CANVAS-OUTPUT-TARGET-TEMPLATES',
    'may_create',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-OUTPUT-TARGET-TEMPLATES-20260618',
    'path',
    'apps/web/src/app/views/canvas/canvasOutputTargetTemplateCatalog.ts',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-OUTPUT-TARGET-TEMPLATES-20260618',
    'relation',
    'REL-WEB-CANVAS-NODE-EDGE-AUTHORING-CONTAINS-OUTPUT-TARGET-TEMPLATES',
    'may_create',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-OUTPUT-TARGET-TEMPLATES-20260618',
    'test',
    'TEST-WEB-CANVAS-OUTPUT-TARGET-TEMPLATES',
    'may_create',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

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
  'SYS-WEB-CANVAS-OUTPUT-TARGET-TEMPLATES',
  'Canvas output target templates',
  'module',
  'application',
  'Frontend / Canvas',
  'apps/web/src/app/views/canvas/canvasOutputTargetTemplateCatalog.ts',
  'Governed SQL output target template catalog and Canvas authoring sink seed metadata',
  'browser',
  'medium',
  'review',
  'SYS-WEB-CANVAS-NODE-EDGE-AUTHORING'
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
  'RESP-SYS-WEB-CANVAS-OUTPUT-TARGET-TEMPLATES',
  'SYS-WEB-CANVAS-OUTPUT-TARGET-TEMPLATES',
  'Expose selectable SQL output target templates for Canvas sink insertion.',
  'Output target template semantics, sink seed metadata, or destination catalog policy changes.',
  'CanvasOutputTargetTemplateCatalog',
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
  'REL-WEB-CANVAS-NODE-EDGE-AUTHORING-CONTAINS-OUTPUT-TARGET-TEMPLATES',
  'SYS-WEB-CANVAS-NODE-EDGE-AUTHORING',
  'SYS-WEB-CANVAS-OUTPUT-TARGET-TEMPLATES',
  'contains',
  'outbound',
  'sync',
  null,
  'not_applicable',
  'internal-ui-component-ownership',
  '["docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md"]'::jsonb,
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
  'TEST-WEB-CANVAS-OUTPUT-TARGET-TEMPLATES',
  'SYS-WEB-CANVAS-OUTPUT-TARGET-TEMPLATES',
  'apps/web/src/app/views/canvas/CanvasAddNodePalette.test.tsx',
  'unit',
  'behavior',
  true,
  'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/CanvasAddNodePalette.test.tsx'
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
  'OBS-SYS-WEB-CANVAS-OUTPUT-TARGET-TEMPLATES-COMPONENT-TELEMETRY',
  'SYS-WEB-CANVAS-OUTPUT-TARGET-TEMPLATES',
  'Component-level browser telemetry is not applicable; output target template health is validated through add-node palette and graph handler tests.',
  'dashboard',
  true,
  'not_applicable'
)
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;
