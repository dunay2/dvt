-- Split web architecture documentation into physical responsibility leaves.
-- The web architecture parent remains the aggregate catalog; concrete files
-- resolve to root records or subdirectory leaves for graph, shell, runs, and
-- specialized web architecture families.

drop table if exists pg_temp.docs_web_architecture_leaf_map;

create temporary table docs_web_architecture_leaf_map (
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

insert into docs_web_architecture_leaf_map (
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
    'SYS-DOCS-ARCHITECTURE-WEB-ROOT-RECORDS',
    'Web architecture root records',
    'docs/architecture/components/web',
    'WebArchitectureRootReadModel',
    'ReadWebArchitectureRootRecords',
    'web architecture indexes, DDD, functional, sequence, root inventory, route, UX, shell navigation, frontend boundary, and cross-surface rule documents',
    'Web architecture root, inventory, route shell, frontend boundary, UX canon, test governance, or cross-surface rule changes.',
    'Web architecture root documentation boundary.',
    'published_language',
    array['docs/architecture/components/web/*']::text[],
    'scripts/docs-canonical-check.cjs',
    'pnpm docs:canonical:check && pnpm docs:quality:check',
    78,
    'high'
  ),
  (
    'SYS-DOCS-ARCHITECTURE-WEB-GRAPH',
    'Web graph and canvas architecture docs',
    'docs/architecture/components/web/graph',
    'WebGraphArchitectureReadModel',
    'ReadWebGraphArchitectureDocs',
    'graph, canvas, route, runtime model, lifecycle, command/query catalog, token, and graph state-machine architecture docs',
    'Canvas graph architecture, graph route bootstrap, canvas lifecycle, graph command/query, token, or state-machine documentation changes.',
    'Web graph and canvas architecture documentation boundary.',
    'presentation_boundary',
    array['docs/architecture/components/web/graph/**']::text[],
    'scripts/docs-canonical-check.cjs',
    'pnpm docs:canonical:check && pnpm docs:quality:check',
    82,
    'high'
  ),
  (
    'SYS-DOCS-ARCHITECTURE-WEB-APP-SHELL',
    'Web app shell architecture docs',
    'docs/architecture/components/web/appshell',
    'WebAppShellArchitectureReadModel',
    'ReadWebAppShellArchitectureDocs',
    'app shell, protected route, workspace context, onboarding, screen composition, and data-source service boundary architecture docs',
    'App shell, protected route gate, workspace context, onboarding, screen composition, or shell data-source boundary changes.',
    'Web app shell architecture documentation boundary.',
    'application_boundary',
    array['docs/architecture/components/web/appshell/**']::text[],
    'scripts/docs-canonical-check.cjs',
    'pnpm docs:canonical:check && pnpm docs:quality:check',
    78,
    'high'
  ),
  (
    'SYS-DOCS-ARCHITECTURE-WEB-RUNS',
    'Web runs architecture docs',
    'docs/architecture/components/web/runs',
    'WebRunsArchitectureReadModel',
    'ReadWebRunsArchitectureDocs',
    'runs route, run event timeline, dense run tables, frontend runtime contract, start-run identity, and user-story architecture docs',
    'Runs frontend architecture, run timeline, dense table, runtime contract, start-run client identity, or runs user-story changes.',
    'Web runs architecture documentation boundary.',
    'read_model_projection',
    array['docs/architecture/components/web/runs/**']::text[],
    'scripts/docs-canonical-check.cjs',
    'pnpm docs:canonical:check && pnpm docs:quality:check',
    76,
    'high'
  ),
  (
    'SYS-DOCS-ARCHITECTURE-WEB-WORKSPACE',
    'Web workspace architecture docs',
    'docs/architecture/components/web/workspace',
    'WebWorkspaceArchitectureReadModel',
    'ReadWebWorkspaceArchitectureDocs',
    'workspace domain, session, API authority, mock runtime hardcut, and workspace port decomposition architecture docs',
    'Workspace domain, session, API authority, mock runtime, or workspace port decomposition documentation changes.',
    'Web workspace architecture documentation boundary.',
    'application_boundary',
    array['docs/architecture/components/web/workspace/**']::text[],
    'scripts/docs-canonical-check.cjs',
    'pnpm docs:canonical:check && pnpm docs:quality:check',
    76,
    'high'
  ),
  (
    'SYS-DOCS-ARCHITECTURE-WEB-MONACO',
    'Web Monaco architecture docs',
    'docs/architecture/components/web/monaco',
    'WebMonacoArchitectureReadModel',
    'ReadWebMonacoArchitectureDocs',
    'Monaco bundle isolation and visual token architecture docs',
    'Monaco bundle isolation, visual token, editor architecture, or Monaco user-story changes.',
    'Web Monaco architecture documentation boundary.',
    'presentation_boundary',
    array['docs/architecture/components/web/monaco/**']::text[],
    'scripts/docs-canonical-check.cjs',
    'pnpm docs:canonical:check && pnpm docs:quality:check',
    70,
    'medium'
  ),
  (
    'SYS-DOCS-ARCHITECTURE-WEB-TEMPLATES',
    'Web templates architecture docs',
    'docs/architecture/components/web/templates',
    'WebTemplateArchitectureReadModel',
    'ReadWebTemplateArchitectureDocs',
    'execution template source generation and template Monaco preview architecture docs',
    'Execution template source generation, template Monaco preview, or template user-story changes.',
    'Web templates architecture documentation boundary.',
    'template_boundary',
    array['docs/architecture/components/web/templates/**']::text[],
    'scripts/docs-canonical-check.cjs',
    'pnpm docs:canonical:check && pnpm docs:quality:check',
    70,
    'medium'
  ),
  (
    'SYS-DOCS-ARCHITECTURE-WEB-PLUGINS',
    'Web plugin architecture docs',
    'docs/architecture/components/web/plugins',
    'WebPluginArchitectureReadModel',
    'ReadWebPluginArchitectureDocs',
    'plugin capability table, plugin UX integration contract, and plugin architecture navigation docs',
    'Plugin capability table, plugin UX integration, plugin contract, or plugin architecture navigation changes.',
    'Web plugin architecture documentation boundary.',
    'plugin_boundary',
    array['docs/architecture/components/web/plugins/**']::text[],
    'scripts/docs-canonical-check.cjs',
    'pnpm docs:canonical:check && pnpm docs:quality:check',
    72,
    'medium'
  ),
  (
    'SYS-DOCS-ARCHITECTURE-WEB-PUBLIC-DATA',
    'Web public data architecture docs',
    'docs/architecture/components/web/public-data',
    'WebPublicDataArchitectureReadModel',
    'ReadWebPublicDataArchitectureDocs',
    'public data visual system and Marquez architecture docs',
    'Public data visual system, Marquez architecture, or public data user-story changes.',
    'Web public data architecture documentation boundary.',
    'public_data_boundary',
    array['docs/architecture/components/web/public-data/**']::text[],
    'scripts/docs-canonical-check.cjs',
    'pnpm docs:canonical:check && pnpm docs:quality:check',
    68,
    'medium'
  ),
  (
    'SYS-DOCS-ARCHITECTURE-WEB-DIFF',
    'Web diff architecture docs',
    'docs/architecture/components/web/diff',
    'WebDiffArchitectureReadModel',
    'ReadWebDiffArchitectureDocs',
    'diff Monaco review surface and workspace diff backend rail architecture docs',
    'Diff review surface, workspace diff backend rail, or diff user-story changes.',
    'Web diff architecture documentation boundary.',
    'read_model_projection',
    array['docs/architecture/components/web/diff/**']::text[],
    'scripts/docs-canonical-check.cjs',
    'pnpm docs:canonical:check && pnpm docs:quality:check',
    68,
    'medium'
  ),
  (
    'SYS-DOCS-ARCHITECTURE-WEB-LINEAGE',
    'Web lineage architecture docs',
    'docs/architecture/components/web/lineage',
    'WebLineageArchitectureReadModel',
    'ReadWebLineageArchitectureDocs',
    'frontend lineage and lineage panel token architecture docs',
    'Lineage panel architecture, frontend lineage docs, or lineage token user-story changes.',
    'Web lineage architecture documentation boundary.',
    'projection_boundary',
    array['docs/architecture/components/web/lineage/**']::text[],
    'scripts/docs-canonical-check.cjs',
    'pnpm docs:canonical:check && pnpm docs:quality:check',
    68,
    'medium'
  ),
  (
    'SYS-DOCS-ARCHITECTURE-WEB-ARTIFACTS',
    'Web artifacts architecture docs',
    'docs/architecture/components/web/artifacts',
    'WebArtifactsArchitectureReadModel',
    'ReadWebArtifactsArchitectureDocs',
    'artifacts view and artifacts Monaco readonly viewer architecture docs',
    'Artifacts frontend architecture, artifacts Monaco readonly viewer, or artifacts user-story changes.',
    'Web artifacts architecture documentation boundary.',
    'artifact_boundary',
    array['docs/architecture/components/web/artifacts/**']::text[],
    'scripts/docs-canonical-check.cjs',
    'pnpm docs:canonical:check && pnpm docs:quality:check',
    68,
    'medium'
  ),
  (
    'SYS-DOCS-ARCHITECTURE-WEB-GIT',
    'Web git architecture docs',
    'docs/architecture/components/web/git',
    'WebGitArchitectureReadModel',
    'ReadWebGitArchitectureDocs',
    'git mode and git file history review architecture docs',
    'Git mode architecture, git file history review, or git user-story changes.',
    'Web git architecture documentation boundary.',
    'adapter_boundary',
    array['docs/architecture/components/web/git/**']::text[],
    'scripts/docs-canonical-check.cjs',
    'pnpm docs:canonical:check && pnpm docs:quality:check',
    66,
    'medium'
  ),
  (
    'SYS-DOCS-ARCHITECTURE-WEB-CANVAS',
    'Web canvas policy architecture docs',
    'docs/architecture/components/web/canvas',
    'WebCanvasPolicyArchitectureReadModel',
    'ReadWebCanvasPolicyArchitectureDocs',
    'canvas node identity, naming policy, and implementation-plan architecture docs',
    'Canvas node identity, naming policy, or canvas policy implementation plan changes.',
    'Web canvas policy architecture documentation boundary.',
    'identity_policy',
    array['docs/architecture/components/web/canvas/**']::text[],
    'scripts/docs-canonical-check.cjs',
    'pnpm docs:canonical:check && pnpm docs:quality:check',
    66,
    'medium'
  ),
  (
    'SYS-DOCS-ARCHITECTURE-WEB-INSPECTOR',
    'Web inspector architecture docs',
    'docs/architecture/components/web/inspector',
    'WebInspectorArchitectureReadModel',
    'ReadWebInspectorArchitectureDocs',
    'inspector frontend architecture docs',
    'Inspector frontend architecture or inspector documentation placement changes.',
    'Web inspector architecture documentation boundary.',
    'presentation_boundary',
    array['docs/architecture/components/web/inspector/**']::text[],
    'scripts/docs-canonical-check.cjs',
    'pnpm docs:canonical:check && pnpm docs:quality:check',
    64,
    'medium'
  ),
  (
    'SYS-DOCS-ARCHITECTURE-WEB-OBSERVABILITY',
    'Web observability architecture docs',
    'docs/architecture/components/web/observability',
    'WebObservabilityArchitectureReadModel',
    'ReadWebObservabilityArchitectureDocs',
    'frontend observability architecture docs',
    'Frontend observability architecture, telemetry, or observability documentation placement changes.',
    'Web observability architecture documentation boundary.',
    'observability_boundary',
    array['docs/architecture/components/web/observability/**']::text[],
    'scripts/docs-canonical-check.cjs',
    'pnpm docs:canonical:check && pnpm docs:quality:check',
    64,
    'medium'
  ),
  (
    'SYS-DOCS-ARCHITECTURE-WEB-PLANNING',
    'Web planning capability architecture docs',
    'docs/architecture/components/web/planning',
    'WebPlanningCapabilityArchitectureReadModel',
    'ReadWebPlanningCapabilityArchitectureDocs',
    'frontend planning capability architecture docs',
    'Frontend planning capability architecture or planning documentation placement changes.',
    'Web planning capability architecture documentation boundary.',
    'planning_boundary',
    array['docs/architecture/components/web/planning/**']::text[],
    'scripts/docs-canonical-check.cjs',
    'pnpm docs:canonical:check && pnpm docs:quality:check',
    64,
    'medium'
  ),
  (
    'SYS-DOCS-ARCHITECTURE-WEB-VIEWS',
    'Web workflow view architecture docs',
    'docs/architecture/components/web/views',
    'WebWorkflowViewArchitectureReadModel',
    'ReadWebWorkflowViewArchitectureDocs',
    'workflow view architecture docs',
    'Workflow view architecture or view documentation placement changes.',
    'Web workflow view architecture documentation boundary.',
    'presentation_boundary',
    array['docs/architecture/components/web/views/**']::text[],
    'scripts/docs-canonical-check.cjs',
    'pnpm docs:canonical:check && pnpm docs:quality:check',
    64,
    'medium'
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
  'PLANNING-DB-DOCS-WEB-ARCHITECTURE-LEAF-MAPPING-20260618',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Web architecture documentation leaf component mapping',
  'Architecture / Planning DB / Docs',
  'review',
  'SYS-DOCS-ARCHITECTURE-COMPONENTS-WEB directly owned every tracked file under docs/architecture/components/web. This split creates physical child components for root web architecture docs and the graph, app shell, runs, workspace, Monaco, template, plugin, public-data, diff, lineage, artifacts, git, canvas, inspector, observability, planning, and view documentation directories so component-profile can answer files, docs, tests, contracts, ports, relations, and Fowler/DDD basis without a side inventory.',
  'responsibility_overload',
  'ReadComponentProfile;ValidateComponentIntegrity;ReadWebArchitectureRootRecords;ReadWebGraphArchitectureDocs;ReadWebAppShellArchitectureDocs',
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
  'PLANNING-DB-DOCS-WEB-ARCHITECTURE-LEAF-MAPPING-20260618',
  scope.subject_kind,
  scope.subject_id,
  scope.scope_kind,
  true
from (
  select 'component'::text, 'SYS-DOCS-ARCHITECTURE-COMPONENTS-WEB'::text, 'may_update'::text
  union all
  select 'path', 'docs/architecture/components/web/**', 'may_update'
  union all
  select 'component', component_id, 'may_create' from docs_web_architecture_leaf_map
  union all
  select 'path', pattern, 'may_update'
  from docs_web_architecture_leaf_map
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
  'tools/planning-db/migrations/192_docs_web_architecture_leaf_components.sql',
  md5(component_id || ':192') || md5(repo_path || rail_name || ':docs-web-architecture-leaf'),
  0,
  name,
  'component',
  'SYS-DOCS-ARCHITECTURE-COMPONENTS-WEB',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  false,
  owned_concern,
  ddd_owner,
  rail_name,
  'codex'
from docs_web_architecture_leaf_map
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
from docs_web_architecture_leaf_map
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
  from docs_web_architecture_leaf_map
  union all
  select component_id, 'reason_to_change', reason_to_change, 0
  from docs_web_architecture_leaf_map
  union all
  select component_id, 'invariant', 'Tracked web architecture files matching this leaf must resolve here rather than to SYS-DOCS-ARCHITECTURE-COMPONENTS-WEB.', 0
  from docs_web_architecture_leaf_map
  union all
  select component_id, 'transition', 'review -> implemented once component-quality shows SYS-DOCS-ARCHITECTURE-COMPONENTS-WEB owns no direct web architecture files.', 0
  from docs_web_architecture_leaf_map
  union all
  select component_id, 'consumer', 'Planning DB component-profile, architecture-drift, source-drift, and filesystem-coverage readers.', 0
  from docs_web_architecture_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/planning/status/governance-document-rule-inventory.md', 0
  from docs_web_architecture_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/architecture/command-query-rail-governance.md', 1
  from docs_web_architecture_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/architecture/fowler-opportunity-planning-governance.md', 2
  from docs_web_architecture_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md', 3
  from docs_web_architecture_leaf_map
  union all
  select component_id, 'fowler_signal', fowler_signal, 0
  from docs_web_architecture_leaf_map
  union all
  select component_id, 'public_api', rail_name, 0
  from docs_web_architecture_leaf_map
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
  'SYS-DOCS-ARCHITECTURE-COMPONENTS-WEB'
from docs_web_architecture_leaf_map
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
from docs_web_architecture_leaf_map
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
from docs_web_architecture_leaf_map
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
  'REL-DOCS-WEB-ARCHITECTURE-CONTAINS-' || replace(component_id, 'SYS-DOCS-ARCHITECTURE-WEB-', ''),
  'SYS-DOCS-ARCHITECTURE-COMPONENTS-WEB',
  component_id,
  'contains',
  'outbound',
  'build_time',
  null,
  'Component profile becomes incomplete if this web architecture leaf is removed or remapped without a governed Planning DB component update.',
  'repo-local documentation governance',
  jsonb_build_array(
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    repo_path
  ),
  'implemented'
from docs_web_architecture_leaf_map
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
    'missing web architecture ownership',
    'misclassified web architecture subdirectory',
    'component-profile web architecture documentation gap'
  ]::text[],
  'implemented'
from docs_web_architecture_leaf_map
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
from docs_web_architecture_leaf_map
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
  'Web architecture documentation component has no runtime observability requirement.',
  'log',
  true,
  'not_applicable'
from docs_web_architecture_leaf_map
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;

drop table if exists pg_temp.docs_web_architecture_leaf_map;
