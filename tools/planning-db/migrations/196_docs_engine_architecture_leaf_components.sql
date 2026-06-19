-- Split the engine architecture documentation catalog into physical leaves.
-- The parent remains the aggregate; concrete files resolve to root, adapter,
-- architecture, contract, developer, operations, review, roadmap, schema, or
-- security documentation leaves.

drop table if exists pg_temp.docs_engine_architecture_leaf_map;

create temporary table docs_engine_architecture_leaf_map (
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

insert into docs_engine_architecture_leaf_map (
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
    'SYS-DOCS-ARCHITECTURE-ENGINE-ROOT-RECORDS',
    'Engine architecture root records',
    'docs/architecture/components/engine/index.md',
    'EngineArchitectureRootReadModel',
    'ReadEngineArchitectureRootDocs',
    'engine architecture landing page and root navigation records',
    'Engine architecture index, root navigation, or placement changes.',
    'Engine architecture root documentation boundary.',
    'architecture_catalog',
    array['docs/architecture/components/engine/index.md']::text[],
    'scripts/docs-canonical-check.cjs',
    'pnpm docs:canonical:check && pnpm docs:quality:check',
    78,
    'high'
  ),
  (
    'SYS-DOCS-ARCHITECTURE-ENGINE-ADAPTERS',
    'Engine adapter architecture docs',
    'docs/architecture/components/engine/adapters',
    'EngineAdapterArchitectureReadModel',
    'ReadEngineAdapterArchitectureDocs',
    'engine adapter architecture docs under docs/architecture/components/engine/adapters',
    'Temporal, state-store, Postgres, Snowflake, adapter profile, routing, capacity, or policy documentation changes.',
    'Engine adapter architecture documentation boundary.',
    'adapter_boundary',
    array['docs/architecture/components/engine/adapters/**']::text[],
    'scripts/docs-canonical-check.cjs',
    'pnpm docs:canonical:check && pnpm docs:quality:check',
    82,
    'high'
  ),
  (
    'SYS-DOCS-ARCHITECTURE-ENGINE-ARCHITECTURE',
    'Engine core architecture docs',
    'docs/architecture/components/engine/architecture',
    'EngineCoreArchitectureReadModel',
    'ReadEngineCoreArchitectureDocs',
    'engine core architecture, workflow boundary, start-run, admission, decomposition, and target architecture docs',
    'Engine core boundary, workflow, admission, decomposition, target architecture, or public API architecture changes.',
    'Engine core architecture documentation boundary.',
    'bounded_context_architecture',
    array['docs/architecture/components/engine/architecture/**']::text[],
    'scripts/docs-canonical-check.cjs',
    'pnpm docs:canonical:check && pnpm docs:quality:check',
    84,
    'high'
  ),
  (
    'SYS-DOCS-ARCHITECTURE-ENGINE-CONTRACTS',
    'Engine contract architecture docs',
    'docs/architecture/components/engine/contracts',
    'EngineContractArchitectureReadModel',
    'ReadEngineContractArchitectureDocs',
    'engine contract docs, schemas, versioning, capabilities, security contracts, state-store contracts, extension contracts, and event contract docs',
    'Engine contract, versioning, schema, event, capability, security, extension, or state-store contract documentation changes.',
    'Engine contract architecture documentation boundary.',
    'contract_boundary',
    array['docs/architecture/components/engine/contracts/**']::text[],
    'scripts/docs-canonical-check.cjs',
    'pnpm docs:canonical:check && pnpm docs:quality:check',
    86,
    'high'
  ),
  (
    'SYS-DOCS-ARCHITECTURE-ENGINE-DEV',
    'Engine developer architecture docs',
    'docs/architecture/components/engine/dev',
    'EngineDeveloperArchitectureReadModel',
    'ReadEngineDeveloperArchitectureDocs',
    'engine developer tooling and determinism documentation under docs/architecture/components/engine/dev',
    'Engine developer tooling, contract tooling, or determinism tooling documentation changes.',
    'Engine developer architecture documentation boundary.',
    'developer_tooling',
    array['docs/architecture/components/engine/dev/**']::text[],
    'scripts/docs-canonical-check.cjs',
    'pnpm docs:canonical:check && pnpm docs:quality:check',
    76,
    'medium'
  ),
  (
    'SYS-DOCS-ARCHITECTURE-ENGINE-OPS',
    'Engine operations architecture docs',
    'docs/architecture/components/engine/ops',
    'EngineOperationsArchitectureReadModel',
    'ReadEngineOperationsArchitectureDocs',
    'engine operations, metrics, SLO, observability, evidence gate, SLA, and runbook docs',
    'Engine operations, observability, metrics, SLO, incident response, SLA, or immutable evidence documentation changes.',
    'Engine operations architecture documentation boundary.',
    'operational_boundary',
    array['docs/architecture/components/engine/ops/**']::text[],
    'scripts/docs-canonical-check.cjs',
    'pnpm docs:canonical:check && pnpm docs:quality:check',
    82,
    'high'
  ),
  (
    'SYS-DOCS-ARCHITECTURE-ENGINE-REVIEWS',
    'Engine architecture review docs',
    'docs/architecture/components/engine/reviews',
    'EngineReviewArchitectureReadModel',
    'ReadEngineArchitectureReviewDocs',
    'engine architecture reviews, audits, and refactor assessment docs',
    'Engine architecture review, audit, gap, or refactor assessment documentation changes.',
    'Engine architecture review documentation boundary.',
    'design_review',
    array['docs/architecture/components/engine/reviews/**']::text[],
    'scripts/docs-canonical-check.cjs',
    'pnpm docs:canonical:check && pnpm docs:quality:check',
    74,
    'medium'
  ),
  (
    'SYS-DOCS-ARCHITECTURE-ENGINE-ROADMAP',
    'Engine roadmap architecture docs',
    'docs/architecture/components/engine/roadmap',
    'EngineRoadmapArchitectureReadModel',
    'ReadEngineRoadmapArchitectureDocs',
    'engine architecture roadmap and phase documentation',
    'Engine roadmap, phase, or sequencing documentation changes.',
    'Engine roadmap architecture documentation boundary.',
    'roadmap_catalog',
    array['docs/architecture/components/engine/roadmap/**']::text[],
    'scripts/docs-canonical-check.cjs',
    'pnpm docs:canonical:check && pnpm docs:quality:check',
    74,
    'medium'
  ),
  (
    'SYS-DOCS-ARCHITECTURE-ENGINE-SCHEMAS',
    'Engine signal schema architecture docs',
    'docs/architecture/components/engine/schemas',
    'EngineSignalSchemaArchitectureReadModel',
    'ReadEngineSignalSchemaDocs',
    'engine signal schema documentation and JSON schema records under docs/architecture/components/engine/schemas',
    'Engine signal schema documentation or JSON schema record changes.',
    'Engine signal schema architecture documentation boundary.',
    'schema_contract',
    array['docs/architecture/components/engine/schemas/**']::text[],
    'scripts/docs-canonical-check.cjs',
    'pnpm docs:canonical:check && pnpm docs:quality:check',
    80,
    'high'
  ),
  (
    'SYS-DOCS-ARCHITECTURE-ENGINE-SECURITY',
    'Engine security architecture docs',
    'docs/architecture/components/engine/security',
    'EngineSecurityArchitectureReadModel',
    'ReadEngineSecurityArchitectureDocs',
    'engine security invariants, tenant isolation, threat model, plugin provenance, and security test docs',
    'Engine security invariant, tenant isolation, threat model, plugin provenance, or security test documentation changes.',
    'Engine security architecture documentation boundary.',
    'security_boundary',
    array['docs/architecture/components/engine/security/**']::text[],
    'scripts/docs-canonical-check.cjs',
    'pnpm docs:canonical:check && pnpm docs:quality:check',
    84,
    'high'
  );

update architecture.component
set
  public_contract = 'Engine architecture documentation aggregate catalog. Concrete files resolve to engine architecture leaf components.',
  updated_at = now()
where
  component_id = 'SYS-DOCS-ARCHITECTURE-COMPONENTS-ENGINE';

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
  'PLANNING-DB-DOCS-ENGINE-ARCHITECTURE-LEAF-MAPPING-20260619',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Engine architecture documentation leaf component mapping',
  'Architecture / Planning DB / Docs',
  'review',
  'SYS-DOCS-ARCHITECTURE-COMPONENTS-ENGINE directly owned every tracked engine architecture file. This split creates physical child components for root, adapter, architecture, contract, developer, operations, review, roadmap, schema, and security documentation so component-profile can answer files, docs, tests, contracts, ports, relations, and Fowler/DDD basis without a side inventory. No engine architecture docs are deprecated in this slice because no non-functional or superseded file has a governed retirement decision.',
  'responsibility_overload',
  'ReadComponentProfile;ValidateComponentIntegrity;ReadEngineArchitectureRootDocs;ReadEngineAdapterArchitectureDocs;ReadEngineCoreArchitectureDocs;ReadEngineContractArchitectureDocs;ReadEngineDeveloperArchitectureDocs;ReadEngineOperationsArchitectureDocs;ReadEngineArchitectureReviewDocs;ReadEngineRoadmapArchitectureDocs;ReadEngineSignalSchemaDocs;ReadEngineSecurityArchitectureDocs',
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
  'PLANNING-DB-DOCS-ENGINE-ARCHITECTURE-LEAF-MAPPING-20260619',
  scope.subject_kind,
  scope.subject_id,
  scope.scope_kind,
  true
from (
  select 'component'::text, 'SYS-DOCS-ARCHITECTURE-COMPONENTS-ENGINE'::text, 'may_update'::text
  union all
  select 'path', 'docs/architecture/components/engine/**', 'may_update'
  union all
  select 'component', component_id, 'may_create' from docs_engine_architecture_leaf_map
  union all
  select 'path', pattern, 'may_update'
  from docs_engine_architecture_leaf_map
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
  'tools/planning-db/migrations/196_docs_engine_architecture_leaf_components.sql',
  md5(component_id || ':196') || md5(repo_path || rail_name || ':docs-engine-architecture-leaf'),
  0,
  name,
  'component',
  'SYS-DOCS-ARCHITECTURE-COMPONENTS-ENGINE',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  false,
  owned_concern,
  ddd_owner,
  rail_name,
  'codex'
from docs_engine_architecture_leaf_map
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
from docs_engine_architecture_leaf_map
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
  from docs_engine_architecture_leaf_map
  union all
  select component_id, 'reason_to_change', reason_to_change, 0
  from docs_engine_architecture_leaf_map
  union all
  select component_id, 'invariant', 'Tracked engine architecture files matching this leaf must resolve here rather than to SYS-DOCS-ARCHITECTURE-COMPONENTS-ENGINE.', 0
  from docs_engine_architecture_leaf_map
  union all
  select component_id, 'non_goal', 'No engine architecture docs are deprecated in this slice without a governed retirement or non-functional file decision.', 0
  from docs_engine_architecture_leaf_map
  union all
  select component_id, 'transition', 'review -> implemented once component-quality shows SYS-DOCS-ARCHITECTURE-COMPONENTS-ENGINE owns no direct engine architecture files.', 0
  from docs_engine_architecture_leaf_map
  union all
  select component_id, 'consumer', 'Planning DB component-profile, component-integrity, source-drift, and filesystem-coverage readers.', 0
  from docs_engine_architecture_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/planning/status/governance-document-rule-inventory.md', 0
  from docs_engine_architecture_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/architecture/command-query-rail-governance.md', 1
  from docs_engine_architecture_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/architecture/fowler-opportunity-planning-governance.md', 2
  from docs_engine_architecture_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md', 3
  from docs_engine_architecture_leaf_map
  union all
  select component_id, 'fowler_signal', fowler_signal, 0
  from docs_engine_architecture_leaf_map
  union all
  select component_id, 'public_api', rail_name, 0
  from docs_engine_architecture_leaf_map
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
  'SYS-DOCS-ARCHITECTURE-COMPONENTS-ENGINE'
from docs_engine_architecture_leaf_map
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
from docs_engine_architecture_leaf_map
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
from docs_engine_architecture_leaf_map
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
  'REL-DOCS-ENGINE-ARCHITECTURE-CONTAINS-' || replace(component_id, 'SYS-DOCS-ARCHITECTURE-ENGINE-', ''),
  'SYS-DOCS-ARCHITECTURE-COMPONENTS-ENGINE',
  component_id,
  'contains',
  'outbound',
  'build_time',
  null,
  'Component profile becomes incomplete if this engine architecture leaf is removed or remapped without a governed Planning DB component update.',
  'repo-local documentation governance',
  jsonb_build_array(
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    repo_path
  ),
  'implemented'
from docs_engine_architecture_leaf_map
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
    'missing engine architecture ownership',
    'engine architecture doc removed without retirement decision',
    'component-profile engine architecture gap'
  ]::text[],
  'implemented'
from docs_engine_architecture_leaf_map
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
from docs_engine_architecture_leaf_map
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
  'Engine architecture documentation component has no runtime observability requirement.',
  'log',
  true,
  'not_applicable'
from docs_engine_architecture_leaf_map
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;

drop table if exists pg_temp.docs_engine_architecture_leaf_map;
