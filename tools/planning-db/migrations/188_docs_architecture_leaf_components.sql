-- Split the oversized architecture documentation catalog into physical leaves.
-- Root architecture docs, templates, diagrams, atlas, shared/system docs, and
-- component-family docs become queryable children of the architecture catalog.

drop table if exists pg_temp.docs_architecture_leaf_map;

create temporary table docs_architecture_leaf_map (
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

insert into docs_architecture_leaf_map (
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
    'SYS-DOCS-ARCHITECTURE-ENTRYPOINTS',
    'Architecture documentation entrypoints',
    'docs/architecture',
    'ArchitectureRootDocumentationReadModel',
    'ReadArchitectureRootEntrypoints',
    'architecture root navigation, reference architecture, domain map, component map, rail governance, Fowler governance, and status overview files',
    'Architecture landing page, root reference, domain map, rail governance, Fowler governance, or architecture status changes.',
    'Architecture root documentation boundary.',
    'published_language',
    array['docs/architecture/*']::text[],
    'scripts/docs-canonical-check.cjs',
    'pnpm docs:canonical:check && pnpm docs:quality:check',
    76,
    'high'
  ),
  (
    'SYS-DOCS-ARCHITECTURE-TEMPLATES',
    'Architecture documentation templates',
    'docs/architecture/_templates',
    'ArchitectureTemplateReadModel',
    'ReadArchitectureTemplates',
    'architecture component, contract, adapter, operation, overview, security, and capability templates',
    'Architecture template shape, required section, or reusable documentation pattern changes.',
    'Architecture template documentation boundary.',
    'documentation_template',
    array['docs/architecture/_templates/**']::text[],
    'scripts/docs-canonical-check.cjs',
    'pnpm docs:canonical:check && pnpm docs:quality:check',
    70,
    'medium'
  ),
  (
    'SYS-DOCS-ARCHITECTURE-ATLAS',
    'Architecture atlas documentation',
    'docs/architecture/atlas',
    'ArchitectureAtlasReadModel',
    'ReadArchitectureAtlas',
    'architecture atlas, engineering playbook, and atlas status documentation',
    'Architecture atlas navigation, engineering playbook, or atlas status changes.',
    'Architecture atlas documentation boundary.',
    'published_language',
    array['docs/architecture/atlas/**']::text[],
    'scripts/docs-canonical-check.cjs',
    'pnpm docs:canonical:check && pnpm docs:quality:check',
    68,
    'medium'
  ),
  (
    'SYS-DOCS-ARCHITECTURE-DIAGRAMS',
    'Architecture diagrams',
    'docs/architecture/diagrams',
    'ArchitectureDiagramReadModel',
    'ReadArchitectureDiagrams',
    'architecture diagram documents for implementation, delivery, runtime state, and reconciliation views',
    'Architecture diagram, sequence, state-machine, or reconciliation-view changes.',
    'Architecture diagram documentation boundary.',
    'visual_model',
    array['docs/architecture/diagrams/**']::text[],
    'scripts/docs-canonical-check.cjs',
    'pnpm docs:canonical:check && pnpm docs:quality:check',
    68,
    'medium'
  ),
  (
    'SYS-DOCS-ARCHITECTURE-SHARED',
    'Shared architecture documentation',
    'docs/architecture/shared',
    'SharedArchitectureReadModel',
    'ReadSharedArchitectureDocs',
    'shared CLI, crypto, DSL, plan interpreter, and shared architecture docs',
    'Shared architecture, CLI, crypto, DSL, or plan interpreter documentation changes.',
    'Shared architecture documentation boundary.',
    'shared_kernel',
    array['docs/architecture/shared/**']::text[],
    'scripts/docs-canonical-check.cjs',
    'pnpm docs:canonical:check && pnpm docs:quality:check',
    68,
    'medium'
  ),
  (
    'SYS-DOCS-ARCHITECTURE-SYSTEM',
    'System architecture documentation',
    'docs/architecture/system',
    'SystemArchitectureReadModel',
    'ReadSystemArchitectureDocs',
    'system-level consistency, subsystem, runtime, read, and lifecycle architecture docs',
    'System architecture, subsystem decomposition, consistency model, or runtime subdivision changes.',
    'System architecture documentation boundary.',
    'bounded_context_boundary',
    array['docs/architecture/system/**']::text[],
    'scripts/docs-canonical-check.cjs',
    'pnpm docs:canonical:check && pnpm docs:quality:check',
    72,
    'high'
  ),
  (
    'SYS-DOCS-ARCHITECTURE-INFRA',
    'Infrastructure architecture documentation',
    'docs/architecture/infra',
    'InfrastructureArchitectureReadModel',
    'ReadInfrastructureArchitectureDocs',
    'infrastructure architecture navigation and infrastructure architecture docs',
    'Infrastructure architecture navigation or infrastructure documentation changes.',
    'Infrastructure architecture documentation boundary.',
    'infrastructure_boundary',
    array['docs/architecture/infra/**']::text[],
    'scripts/docs-canonical-check.cjs',
    'pnpm docs:canonical:check && pnpm docs:quality:check',
    64,
    'medium'
  ),
  (
    'SYS-DOCS-ARCHITECTURE-COMPONENTS-ROOT',
    'Architecture component catalog index',
    'docs/architecture/components/index.md',
    'ArchitectureComponentIndexReadModel',
    'ReadArchitectureComponentIndex',
    'architecture component catalog index and component-family navigation',
    'Component catalog index, component family navigation, or component documentation placement changes.',
    'Architecture component catalog index boundary.',
    'component_catalog',
    array['docs/architecture/components/index.md']::text[],
    'scripts/docs-canonical-check.cjs',
    'pnpm docs:canonical:check && pnpm docs:quality:check',
    70,
    'medium'
  ),
  (
    'SYS-DOCS-ARCHITECTURE-COMPONENTS-API',
    'API architecture documentation',
    'docs/architecture/components/api',
    'ApiArchitectureReadModel',
    'ReadApiArchitectureDocs',
    'API component constraints, DDD, functional, sequence, runtime, planner ingress, protected runtime, and cost attribution architecture docs',
    'API component architecture, runtime API, planner ingress, protected runtime, or API user-story documentation changes.',
    'API architecture documentation boundary.',
    'application_boundary',
    array['docs/architecture/components/api/**']::text[],
    'scripts/docs-canonical-check.cjs',
    'pnpm docs:canonical:check && pnpm docs:quality:check',
    74,
    'high'
  ),
  (
    'SYS-DOCS-ARCHITECTURE-COMPONENTS-CI-GOVERNANCE',
    'CI governance architecture documentation',
    'docs/architecture/components/ci-governance',
    'CiGovernanceArchitectureReadModel',
    'ReadCiGovernanceArchitectureDocs',
    'CI governance, generated docs, component engineering, planning review, startup card, and documentation usability architecture docs',
    'CI governance, documentation generation, component engineering, startup, or review-governance architecture changes.',
    'CI governance architecture documentation boundary.',
    'governance_boundary',
    array['docs/architecture/components/ci-governance/**']::text[],
    'scripts/docs-canonical-check.cjs',
    'pnpm docs:canonical:check && pnpm docs:quality:check',
    76,
    'high'
  ),
  (
    'SYS-DOCS-ARCHITECTURE-COMPONENTS-DELIVERY',
    'Delivery architecture documentation',
    'docs/architecture/components/delivery',
    'DeliveryArchitectureReadModel',
    'ReadDeliveryArchitectureDocs',
    'delivery constraints, DDD, functional, sequence, outbox storage, and projector invalidation architecture docs',
    'Delivery architecture, outbox storage, projector invalidation, or delivery sequence changes.',
    'Delivery architecture documentation boundary.',
    'event_delivery_boundary',
    array['docs/architecture/components/delivery/**']::text[],
    'scripts/docs-canonical-check.cjs',
    'pnpm docs:canonical:check && pnpm docs:quality:check',
    72,
    'high'
  ),
  (
    'SYS-DOCS-ARCHITECTURE-COMPONENTS-ENGINE',
    'Engine architecture documentation',
    'docs/architecture/components/engine',
    'EngineArchitectureReadModel',
    'ReadEngineArchitectureDocs',
    'engine architecture, adapters, contracts, schemas, security, operations, reviews, roadmap, and developer architecture docs',
    'Engine boundary, contract, adapter, schema, security, operations, review, roadmap, or developer architecture changes.',
    'Engine architecture documentation boundary.',
    'aggregate_boundary',
    array['docs/architecture/components/engine/**']::text[],
    'scripts/docs-canonical-check.cjs',
    'pnpm docs:canonical:check && pnpm docs:quality:check',
    82,
    'high'
  ),
  (
    'SYS-DOCS-ARCHITECTURE-COMPONENTS-LINEAGE-WORKER',
    'Lineage worker architecture documentation',
    'docs/architecture/components/lineage-worker',
    'LineageWorkerArchitectureReadModel',
    'ReadLineageWorkerArchitectureDocs',
    'lineage worker compiled-code reference extraction architecture docs',
    'Lineage worker, compiled-code reference extraction, or lineage architecture changes.',
    'Lineage worker architecture documentation boundary.',
    'lineage_boundary',
    array['docs/architecture/components/lineage-worker/**']::text[],
    'scripts/docs-canonical-check.cjs',
    'pnpm docs:canonical:check && pnpm docs:quality:check',
    68,
    'medium'
  ),
  (
    'SYS-DOCS-ARCHITECTURE-COMPONENTS-OUTBOX-WORKER',
    'Outbox worker architecture documentation',
    'docs/architecture/components/outbox-worker',
    'OutboxWorkerArchitectureReadModel',
    'ReadOutboxWorkerArchitectureDocs',
    'outbox worker constraints, DDD, functional, sequence, and tenant-aware sharding architecture docs',
    'Outbox worker, tenant-aware sharding, or outbox delivery architecture changes.',
    'Outbox worker architecture documentation boundary.',
    'event_delivery_boundary',
    array['docs/architecture/components/outbox-worker/**']::text[],
    'scripts/docs-canonical-check.cjs',
    'pnpm docs:canonical:check && pnpm docs:quality:check',
    72,
    'high'
  ),
  (
    'SYS-DOCS-ARCHITECTURE-COMPONENTS-PLANNER',
    'Planner architecture documentation',
    'docs/architecture/components/planner',
    'PlannerArchitectureReadModel',
    'ReadPlannerArchitectureDocs',
    'planner constraints, DDD, functional, sequence, policy namespace, executable subgraph, and workspace authoring architecture docs',
    'Planner boundary, policy namespace, executable subgraph, workspace authoring, or planner sequence changes.',
    'Planner architecture documentation boundary.',
    'planning_boundary',
    array['docs/architecture/components/planner/**']::text[],
    'scripts/docs-canonical-check.cjs',
    'pnpm docs:canonical:check && pnpm docs:quality:check',
    76,
    'high'
  ),
  (
    'SYS-DOCS-ARCHITECTURE-COMPONENTS-PROJECTOR-WORKER',
    'Projector worker architecture documentation',
    'docs/architecture/components/projector-worker',
    'ProjectorWorkerArchitectureReadModel',
    'ReadProjectorWorkerArchitectureDocs',
    'projector worker architecture index and navigation docs',
    'Projector worker architecture or projector documentation placement changes.',
    'Projector worker architecture documentation boundary.',
    'projection_boundary',
    array['docs/architecture/components/projector-worker/**']::text[],
    'scripts/docs-canonical-check.cjs',
    'pnpm docs:canonical:check && pnpm docs:quality:check',
    64,
    'medium'
  ),
  (
    'SYS-DOCS-ARCHITECTURE-COMPONENTS-WEB',
    'Web architecture documentation',
    'docs/architecture/components/web',
    'WebArchitectureReadModel',
    'ReadWebArchitectureDocs',
    'web, canvas, app shell, runs, plugins, workspace, templates, monaco, diff, graph, frontend inventory, and UX architecture docs',
    'Web architecture, frontend boundary, canvas, route shell, runs, workspace, plugin, template, or UX documentation changes.',
    'Web architecture documentation boundary.',
    'presentation_boundary',
    array['docs/architecture/components/web/**']::text[],
    'scripts/docs-canonical-check.cjs',
    'pnpm docs:canonical:check && pnpm docs:quality:check',
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
  'PLANNING-DB-DOCS-ARCHITECTURE-LEAF-MAPPING-20260618',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Architecture documentation leaf component mapping',
  'Architecture / Planning DB / Docs',
  'review',
  'SYS-DOCS-GOVERNANCE-ARCHITECTURE directly owned every tracked file under docs/architecture. This split creates physical child components for architecture root docs, templates, atlas, diagrams, system/shared/infra docs, component catalog navigation, and component-family documentation so component-profile can answer files, docs, tests, contracts, ports, relations, and Fowler/DDD basis without a side inventory.',
  'responsibility_overload',
  'ReadComponentProfile;ValidateComponentIntegrity;ReadArchitectureRootEntrypoints',
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
  'PLANNING-DB-DOCS-ARCHITECTURE-LEAF-MAPPING-20260618',
  scope.subject_kind,
  scope.subject_id,
  scope.scope_kind,
  true
from (
  select 'component'::text, 'SYS-DOCS-GOVERNANCE-ARCHITECTURE'::text, 'may_update'::text
  union all
  select 'path', 'docs/architecture/**', 'may_update'
  union all
  select 'component', component_id, 'may_create' from docs_architecture_leaf_map
  union all
  select 'path', pattern, 'may_update'
  from docs_architecture_leaf_map
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
  'tools/planning-db/migrations/188_docs_architecture_leaf_components.sql',
  md5(component_id || ':188') || md5(repo_path || rail_name || ':docs-architecture-leaf'),
  0,
  name,
  'component',
  'SYS-DOCS-GOVERNANCE-ARCHITECTURE',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  false,
  owned_concern,
  ddd_owner,
  rail_name,
  'codex'
from docs_architecture_leaf_map
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
from docs_architecture_leaf_map
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
  from docs_architecture_leaf_map
  union all
  select component_id, 'reason_to_change', reason_to_change, 0
  from docs_architecture_leaf_map
  union all
  select component_id, 'invariant', 'Tracked architecture files matching this leaf must resolve here rather than to SYS-DOCS-GOVERNANCE-ARCHITECTURE.', 0
  from docs_architecture_leaf_map
  union all
  select component_id, 'transition', 'review -> implemented once component-quality shows SYS-DOCS-GOVERNANCE-ARCHITECTURE owns no direct architecture files.', 0
  from docs_architecture_leaf_map
  union all
  select component_id, 'consumer', 'Planning DB component-profile, architecture-drift, source-drift, and filesystem-coverage readers.', 0
  from docs_architecture_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/architecture/command-query-rail-governance.md', 0
  from docs_architecture_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/architecture/fowler-opportunity-planning-governance.md', 1
  from docs_architecture_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md', 2
  from docs_architecture_leaf_map
  union all
  select component_id, 'fowler_signal', fowler_signal, 0
  from docs_architecture_leaf_map
  union all
  select component_id, 'public_api', rail_name, 0
  from docs_architecture_leaf_map
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
  'SYS-DOCS-GOVERNANCE-ARCHITECTURE'
from docs_architecture_leaf_map
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
from docs_architecture_leaf_map
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
from docs_architecture_leaf_map
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
  'REL-DOCS-ARCHITECTURE-CONTAINS-' || replace(component_id, 'SYS-DOCS-ARCHITECTURE-', ''),
  'SYS-DOCS-GOVERNANCE-ARCHITECTURE',
  component_id,
  'contains',
  'outbound',
  'build_time',
  null,
  'Component profile becomes incomplete if this architecture documentation leaf is removed or remapped without a governed Planning DB component update.',
  'repo-local documentation governance',
  jsonb_build_array(
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    repo_path
  ),
  'implemented'
from docs_architecture_leaf_map
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
    'missing architecture documentation ownership',
    'misclassified architecture component family',
    'component-profile architecture documentation gap'
  ]::text[],
  'implemented'
from docs_architecture_leaf_map
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
from docs_architecture_leaf_map
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
  'Architecture documentation component has no runtime observability requirement.',
  'log',
  true,
  'not_applicable'
from docs_architecture_leaf_map
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;

drop table if exists pg_temp.docs_architecture_leaf_map;
