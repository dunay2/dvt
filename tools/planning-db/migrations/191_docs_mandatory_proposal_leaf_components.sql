-- Split mandatory planning proposals into physical responsibility leaves.
-- The parent keeps the mandatory proposal boundary; concrete proposal files
-- resolve to frontend/UX, runtime/contracts, or governance/docs leaves.

drop table if exists pg_temp.docs_mandatory_proposal_leaf_map;

create temporary table docs_mandatory_proposal_leaf_map (
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

insert into docs_mandatory_proposal_leaf_map (
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
    'SYS-DOCS-PLANNING-PROPOSALS-MANDATORY-FRONTEND-UX',
    'Mandatory frontend and UX proposals',
    'docs/planning/proposals/mandatory/frontend-and-ux',
    'FrontendUxMandatoryProposalReadModel',
    'ReadFrontendUxMandatoryProposals',
    'mandatory frontend, UX, canvas, workbench, plugin, template, source-import, and web proposal records',
    'Frontend proposal placement, UX evidence, canvas planning, plugin UX, template surface, source-import, or web route plan changes.',
    'Mandatory frontend and UX proposal boundary.',
    'presentation_boundary',
    array['docs/planning/proposals/mandatory/frontend-and-ux/**']::text[],
    'scripts/check-feature-mechanization.cjs',
    'pnpm docs:feature-mechanization:implementation && pnpm docs:quality:check',
    78,
    'high'
  ),
  (
    'SYS-DOCS-PLANNING-PROPOSALS-MANDATORY-RUNTIME-CONTRACTS',
    'Mandatory runtime and contracts proposals',
    'docs/planning/proposals/mandatory/runtime-and-contracts',
    'RuntimeContractMandatoryProposalReadModel',
    'ReadRuntimeContractMandatoryProposals',
    'mandatory runtime, API, engine, planner, state-store, adapter, Temporal, retention, and contract proposal records',
    'Runtime proposal placement, contract governance, adapter semantics, planner boundary, state-store lifecycle, API runtime, Temporal worker, or retention plan changes.',
    'Mandatory runtime and contracts proposal boundary.',
    'bounded_context_boundary',
    array['docs/planning/proposals/mandatory/runtime-and-contracts/**']::text[],
    'scripts/check-feature-mechanization.cjs',
    'pnpm docs:feature-mechanization:implementation && pnpm docs:canonical:check',
    80,
    'high'
  ),
  (
    'SYS-DOCS-PLANNING-PROPOSALS-MANDATORY-GOVERNANCE-DOCS',
    'Mandatory governance and docs proposals',
    'docs/planning/proposals/mandatory/governance-and-docs',
    'GovernanceDocMandatoryProposalReadModel',
    'ReadGovernanceDocMandatoryProposals',
    'mandatory governance, documentation, CI, Planning DB, command/query rail, architecture-authority, and process proposal records',
    'Governance proposal placement, CI policy, docs authority, Planning DB rail, command/query vocabulary, architecture-authority, or process plan changes.',
    'Mandatory governance and docs proposal boundary.',
    'governance_boundary',
    array['docs/planning/proposals/mandatory/governance-and-docs/**']::text[],
    'scripts/check-feature-mechanization.cjs',
    'pnpm docs:feature-mechanization:implementation && pnpm planning:db:integrity:check',
    82,
    'high'
  );

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
  'PLANNING-DB-DOCS-MANDATORY-PROPOSAL-LEAF-MAPPING-20260618',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Mandatory proposal documentation leaf component mapping',
  'Architecture / Planning DB / Docs',
  'review',
  'SYS-DOCS-PLANNING-PROPOSALS-MANDATORY directly owned every tracked mandatory proposal file. This split creates physical child components for frontend/UX proposals, runtime/contracts proposals, and governance/docs proposals so component-profile can answer files, docs, tests, contracts, ports, relations, and Fowler/DDD basis without a side inventory. Old, superseded, or nonfunctional proposal files remain governed through lifecycle/deprecation semantics instead of active rail duplication.',
  'responsibility_overload',
  'ReadComponentProfile;ValidateComponentIntegrity;ReadFrontendUxMandatoryProposals;ReadRuntimeContractMandatoryProposals;ReadGovernanceDocMandatoryProposals',
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
  'PLANNING-DB-DOCS-MANDATORY-PROPOSAL-LEAF-MAPPING-20260618',
  scope.subject_kind,
  scope.subject_id,
  scope.scope_kind,
  true
from (
  select 'component'::text, 'SYS-DOCS-PLANNING-PROPOSALS-MANDATORY'::text, 'may_update'::text
  union all
  select 'path', 'docs/planning/proposals/mandatory/**', 'may_update'
  union all
  select 'component', component_id, 'may_create' from docs_mandatory_proposal_leaf_map
  union all
  select 'path', pattern, 'may_update'
  from docs_mandatory_proposal_leaf_map
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
  'tools/planning-db/migrations/191_docs_mandatory_proposal_leaf_components.sql',
  md5(component_id || ':191') || md5(repo_path || rail_name || ':docs-mandatory-proposal-leaf'),
  0,
  name,
  'component',
  'SYS-DOCS-PLANNING-PROPOSALS-MANDATORY',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  false,
  owned_concern,
  ddd_owner,
  rail_name,
  'codex'
from docs_mandatory_proposal_leaf_map
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
from docs_mandatory_proposal_leaf_map
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
  from docs_mandatory_proposal_leaf_map
  union all
  select component_id, 'reason_to_change', reason_to_change, 0
  from docs_mandatory_proposal_leaf_map
  union all
  select component_id, 'invariant', 'Tracked mandatory proposal files matching this leaf must resolve here rather than to SYS-DOCS-PLANNING-PROPOSALS-MANDATORY.', 0
  from docs_mandatory_proposal_leaf_map
  union all
  select component_id, 'non_goal', 'Old, superseded, or nonfunctional proposal records must be classified through documentation lifecycle and deprecation semantics before they are removed from active proposal meaning.', 0
  from docs_mandatory_proposal_leaf_map
  union all
  select component_id, 'transition', 'review -> implemented once component-quality shows SYS-DOCS-PLANNING-PROPOSALS-MANDATORY owns no direct mandatory proposal files.', 0
  from docs_mandatory_proposal_leaf_map
  union all
  select component_id, 'consumer', 'Planning DB component-profile, documentation-lifecycle, architecture-drift, source-drift, and filesystem-coverage readers.', 0
  from docs_mandatory_proposal_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/planning/status/governance-document-rule-inventory.md', 0
  from docs_mandatory_proposal_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/architecture/command-query-rail-governance.md', 1
  from docs_mandatory_proposal_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/architecture/fowler-opportunity-planning-governance.md', 2
  from docs_mandatory_proposal_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md', 3
  from docs_mandatory_proposal_leaf_map
  union all
  select component_id, 'fowler_signal', fowler_signal, 0
  from docs_mandatory_proposal_leaf_map
  union all
  select component_id, 'public_api', rail_name, 0
  from docs_mandatory_proposal_leaf_map
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
  'SYS-DOCS-PLANNING-PROPOSALS-MANDATORY'
from docs_mandatory_proposal_leaf_map
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
from docs_mandatory_proposal_leaf_map
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
from docs_mandatory_proposal_leaf_map
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
  'REL-DOCS-MANDATORY-PROPOSALS-CONTAINS-' || replace(component_id, 'SYS-DOCS-PLANNING-PROPOSALS-MANDATORY-', ''),
  'SYS-DOCS-PLANNING-PROPOSALS-MANDATORY',
  component_id,
  'contains',
  'outbound',
  'build_time',
  null,
  'Component profile becomes incomplete if this mandatory proposal leaf is removed or remapped without a governed Planning DB component update.',
  'repo-local documentation governance',
  jsonb_build_array(
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    repo_path
  ),
  'implemented'
from docs_mandatory_proposal_leaf_map
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
    'missing mandatory proposal ownership',
    'old, superseded, or nonfunctional proposal file not classified by lifecycle',
    'component-profile mandatory proposal gap'
  ]::text[],
  'implemented'
from docs_mandatory_proposal_leaf_map
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
from docs_mandatory_proposal_leaf_map
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
  'Mandatory proposal documentation component has no runtime observability requirement.',
  'log',
  true,
  'not_applicable'
from docs_mandatory_proposal_leaf_map
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;

drop table if exists pg_temp.docs_mandatory_proposal_leaf_map;
