-- Canonicalize planning docs leaves that do not have unique tracked directory
-- paths. Generated planning index files are not tracked source files; closeout
-- month cohorts remain covered by one physical closeout component.

update planning_query_store.governance_component_local_definitions
set
  status = 'superseded',
  source_path = 'tools/planning-db/migrations/187_docs_planning_closeout_path_canonicalization.sql',
  source_content_sha256 = md5(component_id || ':187') || md5('superseded-planning-doc-leaf:187'),
  owned_concern = owned_concern || ' Superseded by SYS-DOCS-PLANNING-CLOSEOUTS or by the parent planning documentation catalog because the previous leaf did not map to a unique tracked directory.',
  cq_rails = cq_rails || ';ReadPlanningCloseoutRecords'
where component_id in (
  'SYS-DOCS-PLANNING-ENTRYPOINTS',
  'SYS-DOCS-PLANNING-CLOSEOUTS-202603',
  'SYS-DOCS-PLANNING-CLOSEOUTS-202604',
  'SYS-DOCS-PLANNING-CLOSEOUTS-202605',
  'SYS-DOCS-PLANNING-CLOSEOUTS-202606',
  'SYS-DOCS-PLANNING-CLOSEOUTS-LEGACY'
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
  'SYS-DOCS-PLANNING-CLOSEOUTS',
  'tools/planning-db/migrations/187_docs_planning_closeout_path_canonicalization.sql',
  md5('SYS-DOCS-PLANNING-CLOSEOUTS:187') || md5('planning-closeouts-canonical:187'),
  0,
  'Planning closeout records',
  'component',
  'SYS-DOCS-GOVERNANCE-PLANNING',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  false,
  'Owns all tracked planning closeout records under the only physical closeout directory.',
  'PlanningCloseoutRecordReadModel',
  'ReadPlanningCloseoutRecords',
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
  'SYS-DOCS-PLANNING-CLOSEOUTS',
  'owns',
  'docs/planning/closeouts/**',
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
    'SYS-DOCS-PLANNING-CLOSEOUTS',
    'responsibility',
    'Own tracked planning closeout evidence records under docs/planning/closeouts.',
    0
  ),
  (
    'SYS-DOCS-PLANNING-CLOSEOUTS',
    'reason_to_change',
    'Planning closeout evidence, closeout lifecycle, historical retention, or closeout navigation changes.',
    0
  ),
  (
    'SYS-DOCS-PLANNING-CLOSEOUTS',
    'invariant',
    'Closeout cohorts without physical directories remain a single component so architecture repo_path stays unique.',
    0
  ),
  (
    'SYS-DOCS-PLANNING-CLOSEOUTS',
    'transition',
    'review -> implemented once component-integrity reports no duplicate_repo_path for docs/planning/closeouts.',
    0
  ),
  (
    'SYS-DOCS-PLANNING-CLOSEOUTS',
    'consumer',
    'Planning DB component-profile, documentation-lifecycle, source-drift, and filesystem-coverage readers.',
    0
  ),
  (
    'SYS-DOCS-PLANNING-CLOSEOUTS',
    'governance_ref',
    'docs/architecture/command-query-rail-governance.md',
    0
  ),
  (
    'SYS-DOCS-PLANNING-CLOSEOUTS',
    'governance_ref',
    'docs/architecture/fowler-opportunity-planning-governance.md',
    1
  ),
  (
    'SYS-DOCS-PLANNING-CLOSEOUTS',
    'governance_ref',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    2
  ),
  (
    'SYS-DOCS-PLANNING-CLOSEOUTS',
    'fowler_signal',
    'responsibility_overload',
    0
  ),
  (
    'SYS-DOCS-PLANNING-CLOSEOUTS',
    'public_api',
    'ReadPlanningCloseoutRecords',
    0
  ),
  (
    'SYS-DOCS-PLANNING-ENTRYPOINTS',
    'transition',
    'docs/planning/index.md is an ignored generated view, not tracked source ownership; active planning entrypoint behavior remains on SYS-DOCS-GOVERNANCE-PLANNING.',
    0
  ),
  (
    'SYS-DOCS-PLANNING-CLOSEOUTS-202603',
    'transition',
    'Superseded by SYS-DOCS-PLANNING-CLOSEOUTS because monthly cohorts do not have unique tracked directories.',
    0
  ),
  (
    'SYS-DOCS-PLANNING-CLOSEOUTS-202604',
    'transition',
    'Superseded by SYS-DOCS-PLANNING-CLOSEOUTS because monthly cohorts do not have unique tracked directories.',
    0
  ),
  (
    'SYS-DOCS-PLANNING-CLOSEOUTS-202605',
    'transition',
    'Superseded by SYS-DOCS-PLANNING-CLOSEOUTS because monthly cohorts do not have unique tracked directories.',
    0
  ),
  (
    'SYS-DOCS-PLANNING-CLOSEOUTS-202606',
    'transition',
    'Superseded by SYS-DOCS-PLANNING-CLOSEOUTS because monthly cohorts do not have unique tracked directories.',
    0
  ),
  (
    'SYS-DOCS-PLANNING-CLOSEOUTS-LEGACY',
    'transition',
    'Superseded by SYS-DOCS-PLANNING-CLOSEOUTS because legacy closeout filenames share the same tracked directory.',
    0
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update architecture.component
set
  status = 'deprecated',
  public_contract = public_contract || ' Superseded in Planning DB component mapping by the canonical closeout component or parent planning documentation component.',
  updated_at = now()
where component_id in (
  'SYS-DOCS-PLANNING-ENTRYPOINTS',
  'SYS-DOCS-PLANNING-CLOSEOUTS-202603',
  'SYS-DOCS-PLANNING-CLOSEOUTS-202604',
  'SYS-DOCS-PLANNING-CLOSEOUTS-202605',
  'SYS-DOCS-PLANNING-CLOSEOUTS-202606',
  'SYS-DOCS-PLANNING-CLOSEOUTS-LEGACY'
);

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
  'SYS-DOCS-PLANNING-CLOSEOUTS',
  'Planning closeout records',
  'module',
  'infra',
  'PlanningCloseoutRecordReadModel',
  'docs/planning/closeouts',
  'Planning closeout evidence records boundary.',
  'none',
  'medium',
  'review',
  70,
  'SYS-DOCS-GOVERNANCE-PLANNING'
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
  'RESP-SYS-DOCS-PLANNING-CLOSEOUTS',
  'SYS-DOCS-PLANNING-CLOSEOUTS',
  'Own tracked planning closeout evidence records under docs/planning/closeouts.',
  'Planning closeout evidence, closeout lifecycle, historical retention, or closeout navigation changes.',
  'PlanningCloseoutRecordReadModel',
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
  'CONTRACT-SYS-DOCS-PLANNING-CLOSEOUTS-DOCS',
  'type',
  'SYS-DOCS-PLANNING-CLOSEOUTS',
  'Planning closeout evidence records boundary.',
  'internal',
  'implemented',
  'pnpm docs:quality:check && pnpm planning:db:query documentation-lifecycle --no-refresh --limit 80'
)
on conflict (contract_id) do update set
  contract_kind = excluded.contract_kind,
  owner_component_id = excluded.owner_component_id,
  contract_ref = excluded.contract_ref,
  compatibility = excluded.compatibility,
  status = excluded.status,
  validation_command = excluded.validation_command;

update architecture.component_relation
set
  status = 'approved',
  failure_mode = 'Superseded by REL-DOCS-PLANNING-CONTAINS-CLOSEOUTS or by parent planning documentation ownership.',
  updated_at = now()
where relation_id in (
  'REL-DOCS-PLANNING-CONTAINS-ENTRYPOINTS',
  'REL-DOCS-PLANNING-CONTAINS-CLOSEOUTS-202603',
  'REL-DOCS-PLANNING-CONTAINS-CLOSEOUTS-202604',
  'REL-DOCS-PLANNING-CONTAINS-CLOSEOUTS-202605',
  'REL-DOCS-PLANNING-CONTAINS-CLOSEOUTS-202606',
  'REL-DOCS-PLANNING-CONTAINS-CLOSEOUTS-LEGACY'
);

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
  'REL-DOCS-PLANNING-CONTAINS-CLOSEOUTS',
  'SYS-DOCS-GOVERNANCE-PLANNING',
  'SYS-DOCS-PLANNING-CLOSEOUTS',
  'contains',
  'outbound',
  'build_time',
  null,
  'Component profile loses closeout evidence if this canonical closeout component is removed or remapped without a governed Planning DB component update.',
  'repo-local documentation governance',
  jsonb_build_array(
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    'docs/planning/closeouts'
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
  'PORT-SYS-DOCS-PLANNING-CLOSEOUTS-READPLANNINGCLOSEOUTRECORDS',
  'SYS-DOCS-PLANNING-CLOSEOUTS',
  'ReadPlanningCloseoutRecords',
  'query',
  'inbound',
  'CONTRACT-SYS-DOCS-PLANNING-CLOSEOUTS-DOCS',
  'CONTRACT-SYS-DOCS-PLANNING-CLOSEOUTS-DOCS',
  array[
    'missing closeout ownership',
    'duplicate closeout repo_path',
    'generated planning index treated as tracked source'
  ]::text[],
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
values (
  'TEST-SYS-DOCS-PLANNING-CLOSEOUTS-DOCS',
  'SYS-DOCS-PLANNING-CLOSEOUTS',
  'scripts/docs-quality-check.cjs',
  'architecture',
  'boundary',
  true,
  'pnpm docs:quality:check && pnpm planning:db:query component-integrity --component SYS-DOCS-GOVERNANCE-PLANNING --no-refresh --limit 80'
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
  'OBS-SYS-DOCS-PLANNING-CLOSEOUTS-DOCS',
  'SYS-DOCS-PLANNING-CLOSEOUTS',
  'Planning closeout documentation component has no runtime observability requirement.',
  'log',
  true,
  'not_applicable'
)
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;
