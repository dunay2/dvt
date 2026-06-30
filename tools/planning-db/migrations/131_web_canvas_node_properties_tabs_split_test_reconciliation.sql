-- Reconcile NodePropertiesTabs test ownership after the monolithic test was
-- split by parallel Web work. The component stays canonical; removed or
-- nonfunctional paths are deprecated as DB evidence instead of recreated.

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
  'PLANNING-DB-WEB-CANVAS-NODE-PROPERTIES-TABS-SPLIT-TESTS-20260618',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Web Canvas node properties tabs split test reconciliation',
  'Architecture / Planning DB / Frontend',
  'implemented',
  'Parallel Web work replaced the monolithic NodePropertiesTabs.test.tsx evidence with focused overflow, primary-section, and section-content tests. This design keeps SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-TESTS as the canonical test component, maps the real tracked files, and records the removed monolithic path as deprecated ownership evidence.',
  'hidden_authority',
  'RecordArchitectureComponent;RecordArchitectureRelation;RecordArchitectureTestEvidence;DetectGovernedSourceDrift;CheckPlanningDbComponentIntegrity',
  now()
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  approved_at = coalesce(architecture.design.approved_at, excluded.approved_at),
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
    'PLANNING-DB-WEB-CANVAS-NODE-PROPERTIES-TABS-SPLIT-TESTS-20260618',
    'component',
    'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-TESTS',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-NODE-PROPERTIES-TABS-SPLIT-TESTS-20260618',
    'component',
    'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-PRESENTER',
    'may_reference',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-NODE-PROPERTIES-TABS-SPLIT-TESTS-20260618',
    'path',
    'apps/web/src/app/components/inspector/NodePropertiesTabs.overflow.test.tsx',
    'may_reference',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-NODE-PROPERTIES-TABS-SPLIT-TESTS-20260618',
    'path',
    'apps/web/src/app/components/inspector/NodePropertiesTabs.primarySections.test.tsx',
    'may_reference',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-NODE-PROPERTIES-TABS-SPLIT-TESTS-20260618',
    'path',
    'apps/web/src/app/components/inspector/NodePropertiesTabs.sectionContent.test.tsx',
    'may_reference',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-NODE-PROPERTIES-TABS-SPLIT-TESTS-20260618',
    'path',
    'apps/web/src/app/components/inspector/NodePropertiesTabs.test.tsx',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-NODE-PROPERTIES-TABS-SPLIT-TESTS-20260618',
    'test',
    'TEST-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-FOCUSED',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-NODE-PROPERTIES-TABS-SPLIT-TESTS-20260618',
    'test',
    'TEST-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-PRESENTER',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-NODE-PROPERTIES-TABS-SPLIT-TESTS-20260618',
    'test',
    'TEST-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-OVERFLOW',
    'may_create',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-NODE-PROPERTIES-TABS-SPLIT-TESTS-20260618',
    'test',
    'TEST-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-PRIMARY-SECTIONS',
    'may_create',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-NODE-PROPERTIES-TABS-SPLIT-TESTS-20260618',
    'test',
    'TEST-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-SECTION-CONTENT',
    'may_create',
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
  created_by,
  created_at
)
values (
  'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-TESTS',
  'planning_query_store.governance_component_local_definitions',
  'b8646908e017a67f06087559d771c19aca9a2d4337db917b985d8eed74ff5ee1',
  2,
  'Canvas inspector node properties tabs tests',
  'component',
  'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  false,
  'Owns the split overflow, primary-section, and section-content tests for NodePropertiesTabs presentation behavior.',
  'CanvasInspectorTabsPresentationTests',
  'RenderNodePropertiesTabs',
  'codex',
  now()
)
on conflict (component_id) do update set
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  revision = excluded.revision,
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

update planning_query_store.governance_component_local_ownership_patterns pattern
set pattern_kind = 'excludes'
where pattern.component_id = 'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-TESTS'
  and pattern.pattern_kind = 'owns'
  and pattern.pattern = 'apps/web/src/app/components/inspector/NodePropertiesTabs.test.tsx'
  and not exists (
    select 1
    from planning_query_store.governance_component_local_ownership_patterns existing_exclude
    where existing_exclude.component_id = pattern.component_id
      and existing_exclude.pattern_kind = 'excludes'
      and existing_exclude.pattern = pattern.pattern
  );

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values
  (
    'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-TESTS',
    'owns',
    'apps/web/src/app/components/inspector/NodePropertiesTabs.overflow.test.tsx',
    0
  ),
  (
    'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-TESTS',
    'owns',
    'apps/web/src/app/components/inspector/NodePropertiesTabs.primarySections.test.tsx',
    1
  ),
  (
    'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-TESTS',
    'owns',
    'apps/web/src/app/components/inspector/NodePropertiesTabs.sectionContent.test.tsx',
    2
  ),
  (
    'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-TESTS',
    'excludes',
    'apps/web/src/app/components/inspector/NodePropertiesTabs.test.tsx',
    3
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
    'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-TESTS',
    'responsibility',
    'Validate NodePropertiesTabs overflow tab rendering, primary sections, and section-content behavior through split focused tests.',
    0
  ),
  (
    'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-TESTS',
    'reason_to_change',
    'NodePropertiesTabs presentation, overflow, primary section, section-content, or test harness changes.',
    0
  ),
  (
    'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-TESTS',
    'public_api',
    'NodePropertiesTabsTestHarness',
    0
  ),
  (
    'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-TESTS',
    'invariant',
    'NodePropertiesTabs.test.tsx is a deprecated removed test path; split test files are the active evidence for this component.',
    0
  ),
  (
    'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-TESTS',
    'transition',
    'review -> implemented after component-quality and source-drift show no stale Web inspector tabs test paths.',
    0
  ),
  (
    'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-TESTS',
    'consumer',
    'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-PRESENTER',
    0
  ),
  (
    'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-TESTS',
    'governance_ref',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    0
  ),
  (
    'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-TESTS',
    'fowler_signal',
    'documentation_drift',
    0
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update architecture.component
set
  repo_path = 'apps/web/src/app/components/inspector/NodePropertiesTabs.primarySections.test.tsx',
  public_contract = 'NodePropertiesTabs split test evidence: overflow, primary sections, and section-content behavior',
  status = 'review',
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-TESTS';

insert into architecture.component_test (
  test_id,
  component_id,
  test_path,
  test_kind,
  coverage_level,
  required,
  validation_command,
  created_at
)
values
  (
    'TEST-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-FOCUSED',
    'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-TESTS',
    'apps/web/src/app/components/inspector/NodePropertiesTabs.primarySections.test.tsx',
    'unit',
    'behavior',
    true,
    'pnpm --filter @dvt/web test:presentation:run -- src/app/components/inspector/NodePropertiesTabs.overflow.test.tsx src/app/components/inspector/NodePropertiesTabs.primarySections.test.tsx src/app/components/inspector/NodePropertiesTabs.sectionContent.test.tsx',
    now()
  ),
  (
    'TEST-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-PRESENTER',
    'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-PRESENTER',
    'apps/web/src/app/components/inspector/NodePropertiesTabs.primarySections.test.tsx',
    'unit',
    'behavior',
    true,
    'pnpm --filter @dvt/web test:presentation:run -- src/app/components/inspector/NodePropertiesTabs.overflow.test.tsx src/app/components/inspector/NodePropertiesTabs.primarySections.test.tsx src/app/components/inspector/NodePropertiesTabs.sectionContent.test.tsx',
    now()
  ),
  (
    'TEST-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-OVERFLOW',
    'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-TESTS',
    'apps/web/src/app/components/inspector/NodePropertiesTabs.overflow.test.tsx',
    'unit',
    'behavior',
    true,
    'pnpm --filter @dvt/web test:presentation:run -- src/app/components/inspector/NodePropertiesTabs.overflow.test.tsx',
    now()
  ),
  (
    'TEST-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-PRIMARY-SECTIONS',
    'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-TESTS',
    'apps/web/src/app/components/inspector/NodePropertiesTabs.primarySections.test.tsx',
    'unit',
    'behavior',
    true,
    'pnpm --filter @dvt/web test:presentation:run -- src/app/components/inspector/NodePropertiesTabs.primarySections.test.tsx',
    now()
  ),
  (
    'TEST-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-SECTION-CONTENT',
    'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-TESTS',
    'apps/web/src/app/components/inspector/NodePropertiesTabs.sectionContent.test.tsx',
    'unit',
    'behavior',
    true,
    'pnpm --filter @dvt/web test:presentation:run -- src/app/components/inspector/NodePropertiesTabs.sectionContent.test.tsx',
    now()
  )
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;
