-- Split the risk-register documentation catalog into physical leaves.
-- The parent remains the aggregate; concrete files resolve to root, adapter,
-- or quality risk-record leaves.

drop table if exists pg_temp.docs_risk_register_leaf_map;

create temporary table docs_risk_register_leaf_map (
  component_id text primary key,
  name text not null,
  repo_path text not null,
  ddd_owner text not null,
  rail_name text not null,
  owned_concern text not null,
  reason_to_change text not null,
  public_contract text not null,
  fowler_signal text not null,
  owns text[] not null,
  test_path text not null,
  validation_command text not null,
  maturity_score numeric not null,
  criticality text not null
);

insert into docs_risk_register_leaf_map (
  component_id,
  name,
  repo_path,
  ddd_owner,
  rail_name,
  owned_concern,
  reason_to_change,
  public_contract,
  fowler_signal,
  owns,
  test_path,
  validation_command,
  maturity_score,
  criticality
)
values
  (
    'SYS-DOCS-RISK-REGISTER-ROOT-RECORDS',
    'Risk register root records',
    'docs/risk-register/index.md',
    'RiskRegisterRootReadModel',
    'ReadRiskRegisterRootRecords',
    'risk register landing page and root navigation records',
    'Risk register navigation, index, or root documentation placement changes.',
    'Risk register root documentation boundary.',
    'risk_catalog',
    array['docs/risk-register/index.md']::text[],
    'scripts/planning-db-import.test.cjs',
    'node --test scripts/planning-db-import.test.cjs && pnpm docs:quality:check',
    76,
    'high'
  ),
  (
    'SYS-DOCS-RISK-REGISTER-ADAPTERS',
    'Adapter risk register records',
    'docs/risk-register/adapters',
    'AdapterRiskRegisterReadModel',
    'ReadAdapterRiskRegisterRecords',
    'adapter risk records and adapter risk index under docs/risk-register/adapters',
    'Adapter risk entry, adapter mitigation, adapter severity, or adapter risk index changes.',
    'Adapter risk register documentation boundary.',
    'adapter_boundary_risk',
    array['docs/risk-register/adapters/**']::text[],
    'scripts/planning-db-import.test.cjs',
    'node --test scripts/planning-db-import.test.cjs && pnpm docs:quality:check',
    78,
    'high'
  ),
  (
    'SYS-DOCS-RISK-REGISTER-QUALITY',
    'Quality risk register records',
    'docs/risk-register/quality',
    'QualityRiskRegisterReadModel',
    'ReadQualityRiskRegisterRecords',
    'quality, runtime, planner, contracts, CI, web, adapter, and operational risk records under docs/risk-register/quality',
    'Quality risk entry, mitigation status, ARC risk update, severity, probability, or quality risk index changes.',
    'Quality risk register documentation boundary.',
    'quality_risk',
    array['docs/risk-register/quality/**']::text[],
    'scripts/planning-db-import.test.cjs',
    'node --test scripts/planning-db-import.test.cjs && pnpm docs:quality:check',
    82,
    'high'
  );

update architecture.component
set
  repo_path = 'docs/risk-register',
  public_contract = 'Risk register documentation aggregate catalog. Concrete files resolve to risk-register leaf components.',
  updated_at = now()
where
  component_id = 'SYS-DOCS-GOVERNANCE-RISK-REGISTER'
  and repo_path = 'docs/risk-register/index.md';

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
  'PLANNING-DB-DOCS-RISK-REGISTER-LEAF-MAPPING-20260618',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Risk register documentation leaf component mapping',
  'Architecture / Planning DB / Docs',
  'review',
  'SYS-DOCS-GOVERNANCE-RISK-REGISTER directly owned every tracked risk-register file. This split creates physical child components for root risk navigation, adapter risk records, and quality risk records so component-profile can answer files, docs, tests, contracts, ports, relations, and Fowler/DDD basis without a side inventory. Old risk records remain active risk facts until a governed mitigation, acceptance, or retirement decision changes their status.',
  'responsibility_overload',
  'ReadComponentProfile;ValidateComponentIntegrity;ReadRiskRegisterRootRecords;ReadAdapterRiskRegisterRecords;ReadQualityRiskRegisterRecords',
  null
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
select
  'PLANNING-DB-DOCS-RISK-REGISTER-LEAF-MAPPING-20260618',
  scope.subject_kind,
  scope.subject_id,
  scope.scope_kind,
  true
from (
  select 'component'::text, 'SYS-DOCS-GOVERNANCE-RISK-REGISTER'::text, 'may_update'::text
  union all
  select 'path', 'docs/risk-register/**', 'may_update'
  union all
  select 'component', component_id, 'may_create' from docs_risk_register_leaf_map
  union all
  select 'path', pattern, 'may_update'
  from docs_risk_register_leaf_map
  cross join lateral unnest(owns) as owned(pattern)
) scope(subject_kind, subject_id, scope_kind)
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
select
  component_id,
  'tools/planning-db/migrations/195_docs_risk_register_leaf_components.sql',
  md5(component_id || ':195') || md5(repo_path || rail_name || ':docs-risk-register-leaf'),
  0,
  name,
  'component',
  'SYS-DOCS-GOVERNANCE-RISK-REGISTER',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  false,
  owned_concern,
  ddd_owner,
  rail_name,
  'codex'
from docs_risk_register_leaf_map
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
select
  component_id,
  'owns',
  own.pattern,
  own.pattern_order - 1
from docs_risk_register_leaf_map
cross join lateral unnest(owns) with ordinality as own(pattern, pattern_order)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
select
  item.component_id,
  item.item_kind,
  item.item_value,
  item.item_order
from (
  select component_id, 'responsibility' as item_kind, 'Own ' || owned_concern || '.' as item_value, 0 as item_order
  from docs_risk_register_leaf_map
  union all
  select component_id, 'reason_to_change', reason_to_change, 0
  from docs_risk_register_leaf_map
  union all
  select component_id, 'invariant', 'Tracked risk-register files matching this leaf must resolve here rather than to SYS-DOCS-GOVERNANCE-RISK-REGISTER.', 0
  from docs_risk_register_leaf_map
  union all
  select component_id, 'non_goal', 'Old risk records are not deprecated by age; they remain governed risk facts until a mitigation, acceptance, or retirement decision changes their status.', 0
  from docs_risk_register_leaf_map
  union all
  select component_id, 'transition', 'review -> implemented once component-quality shows SYS-DOCS-GOVERNANCE-RISK-REGISTER owns no direct risk-register files.', 0
  from docs_risk_register_leaf_map
  union all
  select component_id, 'consumer', 'Planning DB component-profile, component-integrity, risk debt import, source-drift, and filesystem-coverage readers.', 0
  from docs_risk_register_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/planning/status/governance-document-rule-inventory.md', 0
  from docs_risk_register_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/architecture/command-query-rail-governance.md', 1
  from docs_risk_register_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/architecture/fowler-opportunity-planning-governance.md', 2
  from docs_risk_register_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md', 3
  from docs_risk_register_leaf_map
  union all
  select component_id, 'fowler_signal', fowler_signal, 0
  from docs_risk_register_leaf_map
  union all
  select component_id, 'public_api', rail_name, 0
  from docs_risk_register_leaf_map
) item
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
select
  component_id,
  name,
  'module',
  'infra',
  ddd_owner,
  repo_path,
  public_contract,
  'none',
  criticality,
  'review',
  maturity_score,
  'SYS-DOCS-GOVERNANCE-RISK-REGISTER'
from docs_risk_register_leaf_map
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
select
  'RESP-' || component_id,
  component_id,
  'Own ' || owned_concern || '.',
  reason_to_change,
  ddd_owner,
  'implemented'
from docs_risk_register_leaf_map
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
select
  'CONTRACT-' || component_id || '-DOCS',
  'type',
  component_id,
  public_contract,
  'internal',
  'implemented',
  validation_command
from docs_risk_register_leaf_map
on conflict (contract_id) do update set
  contract_kind = excluded.contract_kind,
  owner_component_id = excluded.owner_component_id,
  contract_ref = excluded.contract_ref,
  compatibility = excluded.compatibility,
  status = excluded.status,
  validation_command = excluded.validation_command;

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
select
  'REL-DOCS-RISK-REGISTER-CONTAINS-' || replace(component_id, 'SYS-DOCS-RISK-REGISTER-', ''),
  'SYS-DOCS-GOVERNANCE-RISK-REGISTER',
  component_id,
  'contains',
  'outbound',
  'build_time',
  null,
  'Component profile becomes incomplete if this risk-register leaf is removed or remapped without a governed Planning DB component update.',
  'repo-local documentation governance',
  jsonb_build_array(
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    repo_path
  ),
  'implemented'
from docs_risk_register_leaf_map
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
select
  'PORT-' || component_id || '-' || upper(regexp_replace(rail_name, '[^A-Za-z0-9]+', '-', 'g')),
  component_id,
  rail_name,
  'query',
  'inbound',
  'CONTRACT-' || component_id || '-DOCS',
  'CONTRACT-' || component_id || '-DOCS',
  array[
    'missing risk-register ownership',
    'risk entry removed without mitigation or acceptance record',
    'component-profile risk-register gap'
  ]::text[],
  'implemented'
from docs_risk_register_leaf_map
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
select
  'TEST-' || component_id || '-DOCS',
  component_id,
  test_path,
  'architecture',
  'boundary',
  true,
  validation_command
from docs_risk_register_leaf_map
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
select
  'OBS-' || component_id || '-DOCS',
  component_id,
  'Risk-register documentation component has no runtime observability requirement.',
  'log',
  true,
  'not_applicable'
from docs_risk_register_leaf_map
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;

drop table if exists pg_temp.docs_risk_register_leaf_map;
