-- Split SYS-PLANNER-ROOT into active planner domain/application leaves and
-- explicit legacy/deprecated leaves for historical or transitional files.

drop table if exists pg_temp.planner_root_leaf_map;

create temporary table planner_root_leaf_map (
  component_id text primary key,
  name text not null,
  kind text not null,
  layer text not null,
  local_status text not null,
  architecture_status text not null,
  ddd_owner text not null,
  cq_rails text not null,
  owned_concern text not null,
  responsibility text not null,
  reason_to_change text not null,
  repo_path text not null,
  public_contract text not null,
  fowler_signal text not null,
  port_name text not null,
  port_kind text not null,
  port_direction text not null,
  negative_tests text[] not null,
  public_api text[] not null,
  owns text[] not null,
  test_id text not null,
  test_path text not null,
  validation_command text not null
);

insert into planner_root_leaf_map (
  component_id,
  name,
  kind,
  layer,
  local_status,
  architecture_status,
  ddd_owner,
  cq_rails,
  owned_concern,
  responsibility,
  reason_to_change,
  repo_path,
  public_contract,
  fowler_signal,
  port_name,
  port_kind,
  port_direction,
  negative_tests,
  public_api,
  owns,
  test_id,
  test_path,
  validation_command
)
values
  (
    'SYS-PLANNER-PACKAGE-SHELL',
    'Planner package shell and public exports',
    'package',
    'application',
    'review',
    'review',
    'PlannerPackageShell',
    'RunPlannerPackageBuild;ReadPlannerPublicApi',
    'Owns planner package metadata, root exports, local TS/vitest config, and cross-runtime public API smoke tests.',
    'Expose the planner public package boundary without owning domain planning internals.',
    'Planner package exports, package metadata, test harness config, or public package smoke tests change.',
    'packages/@dvt/planner/src/index.ts',
    'Planner public package export boundary',
    'boundary_drift',
    'RunPlannerPackageBuild',
    'command',
    'inbound',
    array['packages/@dvt/planner/test/cross-runtime.sh']::text[],
    array['packages/@dvt/planner/src/index.ts']::text[],
    array[
      'packages/@dvt/planner/package.json',
      'packages/@dvt/planner/src/index.ts',
      'packages/@dvt/planner/test/cross-runtime-print-planid.ts',
      'packages/@dvt/planner/test/cross-runtime.sh',
      'packages/@dvt/planner/tsconfig.json',
      'packages/@dvt/planner/vitest.config.ts'
    ]::text[],
    'TEST-SYS-PLANNER-PACKAGE-SHELL',
    'packages/@dvt/planner/test/cross-runtime.sh',
    'pnpm --filter @dvt/planner test:cross-runtime'
  ),
  (
    'SYS-PLANNER-APPLICATION-FACADE',
    'Planner application facade and envelope mapper',
    'service',
    'application',
    'review',
    'review',
    'PlannerFacade',
    'CompilePlannerEnvelope;ReadPlannerFacadeResult',
    'Owns the application facade that maps contract envelopes into domain planner execution and response shapes.',
    'Coordinate contract-facing planner requests without leaking domain internals to API or UI callers.',
    'Planner facade orchestration, envelope mapping, application API result, or facade tests change.',
    'packages/@dvt/planner/src/application/PlannerFacade.ts',
    'Planner application facade command boundary',
    'hidden_authority',
    'CompilePlannerEnvelope',
    'command',
    'inbound',
    array['packages/@dvt/planner/test/unit/planner-facade.test.ts']::text[],
    array[
      'packages/@dvt/planner/src/application/PlannerFacade.ts',
      'packages/@dvt/planner/src/application/PlannerEnvelopeMapper.ts'
    ]::text[],
    array[
      'packages/@dvt/planner/src/application/PlannerFacade.ts',
      'packages/@dvt/planner/src/application/PlannerEnvelopeMapper.ts',
      'packages/@dvt/planner/test/unit/planner-facade.test.ts'
    ]::text[],
    'TEST-SYS-PLANNER-APPLICATION-FACADE',
    'packages/@dvt/planner/test/unit/planner-facade.test.ts',
    'pnpm --filter @dvt/planner test -- test/unit/planner-facade.test.ts'
  ),
  (
    'SYS-PLANNER-EXECUTABLE-SUBGRAPH',
    'Planner executable subgraph derivation',
    'module',
    'application',
    'review',
    'review',
    'ExecutableSubgraphDeriver',
    'DeriveExecutableSubgraph;DerivePlannerGraphSourceFromManifest',
    'Owns executable subgraph derivation and manifest-backed graph-source projection for runtime planning flows.',
    'Derive execution-ready graph projections from workspace drafts and manifests while preserving visibility diagnostics.',
    'Subgraph selection, diagnostics, manifest graph-source projection, or executable-subgraph tests change.',
    'packages/@dvt/planner/src/application/ExecutableSubgraphDeriver.ts',
    'Executable subgraph query boundary',
    'evolutionary_architecture',
    'DeriveExecutableSubgraph',
    'query',
    'inbound',
    array[
      'packages/@dvt/planner/test/unit/executable-subgraph-deriver.test.ts',
      'packages/@dvt/planner/test/unit/executable-subgraph-deriver.architecture.test.ts'
    ]::text[],
    array[
      'packages/@dvt/planner/src/application/ExecutableSubgraphDeriver.ts',
      'packages/@dvt/planner/src/application/derivePlannerGraphSourceFromManifest.ts'
    ]::text[],
    array[
      'packages/@dvt/planner/src/application/ExecutableSubgraphDeriver.ts',
      'packages/@dvt/planner/src/application/derivePlannerGraphSourceFromManifest.ts',
      'packages/@dvt/planner/test/unit/executable-subgraph-deriver.architecture.test.ts',
      'packages/@dvt/planner/test/unit/executable-subgraph-deriver.test.ts',
      'packages/@dvt/planner/test/unit/manifest-graph-source.test.ts'
    ]::text[],
    'TEST-SYS-PLANNER-EXECUTABLE-SUBGRAPH',
    'packages/@dvt/planner/test/unit/executable-subgraph-deriver.test.ts',
    'pnpm --filter @dvt/planner test -- test/unit/executable-subgraph-deriver.test.ts test/unit/executable-subgraph-deriver.architecture.test.ts test/unit/manifest-graph-source.test.ts'
  ),
  (
    'SYS-PLANNER-DOMAIN-GRAPH',
    'Planner domain graph and selection model',
    'module',
    'domain',
    'review',
    'review',
    'PlannerGraph',
    'BuildPlannerGraph;SelectPlannerNodes;SortPlannerGraph',
    'Owns graph construction, topological depth/sort, node selection, sorting, and planner error vocabulary.',
    'Build deterministic planner graph structures and node selections before plan assembly.',
    'Graph node validation, dependency sorting, node selection, error vocabulary, or graph tests change.',
    'packages/@dvt/planner/src/domain/graph/GraphBuilder.ts',
    'Planner graph domain boundary',
    'published_language',
    'BuildPlannerGraph',
    'query',
    'inbound',
    array['packages/@dvt/planner/test/unit/graph.test.ts']::text[],
    array[
      'packages/@dvt/planner/src/domain/graph/GraphBuilder.ts',
      'packages/@dvt/planner/src/domain/NodeSelector.ts'
    ]::text[],
    array[
      'packages/@dvt/planner/src/domain/errors.ts',
      'packages/@dvt/planner/src/domain/graph/**',
      'packages/@dvt/planner/src/domain/NodeSelector.ts',
      'packages/@dvt/planner/src/domain/sorting.ts',
      'packages/@dvt/planner/test/unit/graph.test.ts'
    ]::text[],
    'TEST-SYS-PLANNER-DOMAIN-GRAPH',
    'packages/@dvt/planner/test/unit/graph.test.ts',
    'pnpm --filter @dvt/planner test -- test/unit/graph.test.ts'
  ),
  (
    'SYS-PLANNER-DOMAIN-MANIFEST-INPUT',
    'Planner manifest input and envelope validation',
    'module',
    'domain',
    'review',
    'review',
    'PlannerManifestInput',
    'DeriveNodesFromManifest;ValidatePlannerInputEnvelope;ResolvePlannerLimits',
    'Owns dbt manifest node derivation, input envelope validation, planner limits, and manifest fixtures.',
    'Normalize external graph and manifest inputs into deterministic planner domain inputs.',
    'Manifest parsing, input envelope shape, limits, fixtures, or manifest/input tests change.',
    'packages/@dvt/planner/src/domain/manifest.ts',
    'Planner manifest and input validation boundary',
    'published_language',
    'ValidatePlannerInputEnvelope',
    'query',
    'inbound',
    array[
      'packages/@dvt/planner/test/unit/input-envelope-validator.test.ts',
      'packages/@dvt/planner/test/unit/limits.test.ts',
      'packages/@dvt/planner/test/unit/manifest-mvp.test.ts'
    ]::text[],
    array[
      'packages/@dvt/planner/src/domain/manifest.ts',
      'packages/@dvt/planner/src/domain/InputEnvelopeValidator.ts'
    ]::text[],
    array[
      'packages/@dvt/planner/src/domain/InputEnvelopeValidator.ts',
      'packages/@dvt/planner/src/domain/limits.ts',
      'packages/@dvt/planner/src/domain/manifest.ts',
      'packages/@dvt/planner/test/fixtures/dbt-manifest.fixtures.ts',
      'packages/@dvt/planner/test/unit/input-envelope-validator.test.ts',
      'packages/@dvt/planner/test/unit/limits.test.ts',
      'packages/@dvt/planner/test/unit/manifest-mvp.test.ts'
    ]::text[],
    'TEST-SYS-PLANNER-DOMAIN-MANIFEST-INPUT',
    'packages/@dvt/planner/test/unit/input-envelope-validator.test.ts',
    'pnpm --filter @dvt/planner test -- test/unit/input-envelope-validator.test.ts test/unit/limits.test.ts test/unit/manifest-mvp.test.ts'
  ),
  (
    'SYS-PLANNER-DOMAIN-PLAN-ASSEMBLY',
    'Planner domain plan assembly and determinism',
    'service',
    'domain',
    'review',
    'review',
    'PlannerDomainService',
    'BuildExecutionPlan;AssembleExecutionPlan;ResolvePlannerPolicies',
    'Owns the planner domain service, plan assembler, hashing, policies, metrics, types, deterministic time, vectors, and load/determinism tests.',
    'Assemble deterministic execution plans and policy-resolved plan IDs from normalized planner inputs.',
    'Plan assembly, deterministic hashing, policy resolution, planner domain service, metrics, runtime time, or determinism tests change.',
    'packages/@dvt/planner/src/domain/Planner.ts',
    'Planner domain build-plan command boundary',
    'responsibility_overload',
    'BuildExecutionPlan',
    'command',
    'inbound',
    array[
      'packages/@dvt/planner/test/unit/determinism.test.ts',
      'packages/@dvt/planner/test/unit/policies.test.ts',
      'packages/@dvt/planner/test/unit/planner-private-ownership.architecture.test.ts'
    ]::text[],
    array[
      'packages/@dvt/planner/src/domain/Planner.ts',
      'packages/@dvt/planner/src/domain/PlanAssembler.ts'
    ]::text[],
    array[
      'packages/@dvt/planner/src/domain/hashing.ts',
      'packages/@dvt/planner/src/domain/metrics.ts',
      'packages/@dvt/planner/src/domain/PlanAssembler.ts',
      'packages/@dvt/planner/src/domain/Planner.ts',
      'packages/@dvt/planner/src/domain/policies.ts',
      'packages/@dvt/planner/src/domain/types.ts',
      'packages/@dvt/planner/src/runtime/time.ts',
      'packages/@dvt/planner/test/slow/load.test.ts',
      'packages/@dvt/planner/test/unit/determinism.test.ts',
      'packages/@dvt/planner/test/unit/planner-private-ownership.architecture.test.ts',
      'packages/@dvt/planner/test/unit/policies.test.ts',
      'packages/@dvt/planner/test/vectors/**'
    ]::text[],
    'TEST-SYS-PLANNER-DOMAIN-PLAN-ASSEMBLY',
    'packages/@dvt/planner/test/unit/determinism.test.ts',
    'pnpm --filter @dvt/planner test -- test/unit/determinism.test.ts test/unit/policies.test.ts test/unit/planner-private-ownership.architecture.test.ts'
  ),
  (
    'SYS-PLANNER-STEP-FACTORY',
    'Planner step factory and registry integration',
    'module',
    'domain',
    'review',
    'review',
    'PlannerStepFactory',
    'CreatePlannerExecutionStep;ValidatePlannerStepRegistryBinding',
    'Owns step factory interfaces, DBT step factory implementation, and step registry integration evidence.',
    'Translate planner graph nodes and resolved policy classes into execution steps through explicit step factories.',
    'Step factory contract, DBT step shape, policy-to-step mapping, or step registry integration tests change.',
    'packages/@dvt/planner/src/domain/stepFactory/dbtStepFactory.ts',
    'Planner step factory boundary',
    'published_language',
    'CreatePlannerExecutionStep',
    'query',
    'inbound',
    array[
      'packages/@dvt/planner/test/unit/dbt-step-factory.test.ts',
      'packages/@dvt/planner/test/unit/step-registry-integration.test.ts'
    ]::text[],
    array[
      'packages/@dvt/planner/src/domain/stepFactory/StepFactory.ts',
      'packages/@dvt/planner/src/domain/stepFactory/dbtStepFactory.ts'
    ]::text[],
    array[
      'packages/@dvt/planner/src/domain/stepFactory/**',
      'packages/@dvt/planner/test/unit/dbt-step-factory.test.ts',
      'packages/@dvt/planner/test/unit/step-registry-integration.test.ts'
    ]::text[],
    'TEST-SYS-PLANNER-STEP-FACTORY',
    'packages/@dvt/planner/test/unit/dbt-step-factory.test.ts',
    'pnpm --filter @dvt/planner test -- test/unit/dbt-step-factory.test.ts test/unit/step-registry-integration.test.ts'
  ),
  (
    'SYS-PLANNER-CONTRACT-PORTS',
    'Planner contract port interfaces',
    'port',
    'contracts',
    'review',
    'review',
    'PlannerContractPorts',
    'VerifyExecutionBinding;ValidatePlanExecutability;ReadCustomPolicyNamespaces',
    'Owns planner contract-side ports for plan executability, execution binding verification, and custom policy namespaces.',
    'Keep planner adapter contracts explicit without mixing them into domain planning or API route semantics.',
    'Plan executability port, execution binding verifier, custom policy namespace registry, or contract-facing tests change.',
    'packages/@dvt/planner/src/contracts/PlanExecutabilityValidation.ts',
    'Planner contract port boundary',
    'published_language',
    'ValidatePlanExecutability',
    'query',
    'inbound',
    array['packages/@dvt/planner/test/unit/planner-facade.test.ts']::text[],
    array[
      'packages/@dvt/planner/src/contracts/PlanExecutabilityValidation.ts',
      'packages/@dvt/planner/src/contracts/ExecutionBindingVerification.ts',
      'packages/@dvt/planner/src/contracts/CustomPolicyNamespaceRegistry.ts'
    ]::text[],
    array[
      'packages/@dvt/planner/src/contracts/**'
    ]::text[],
    'TEST-SYS-PLANNER-CONTRACT-PORTS',
    'packages/@dvt/planner/test/unit/planner-facade.test.ts',
    'pnpm --filter @dvt/planner test -- test/unit/planner-facade.test.ts'
  ),
  (
    'SYS-PLANNER-ARTIFACT-COMPAT-BRIDGE',
    'Planner artifact compatibility bridge',
    'adapter',
    'adapter',
    'legacy',
    'deprecated',
    'PlannerArtifactCompatibilityBridge',
    'ReadPlannerCompiledCodeStorageCompat;AttachCompiledCodeRefsCompat',
    'Owns transitional planner re-exports to @dvt/artifacts and compatibility tests for compiled-code storage behavior.',
    'Preserve old planner import paths while canonical compiled-code artifact ownership lives in @dvt/artifacts.',
    'Remaining compatibility import, compiled-code bridge test, or removal/deprecation of planner artifact re-exports changes.',
    'packages/@dvt/planner/src/ports/ICompiledCodeStorage.ts',
    'Deprecated planner artifact compatibility bridge',
    'boundary_drift',
    'ReadPlannerCompiledCodeStorageCompat',
    'storage',
    'outbound',
    array[
      'packages/@dvt/planner/test/compiledCode/attachCompiledCodeRefs.test.ts',
      'packages/@dvt/planner/test/compiledCode/FileSystemCompiledCodeStorage.test.ts',
      'packages/@dvt/planner/test/compiledCode/InMemoryCompiledCodeStorage.test.ts'
    ]::text[],
    array['packages/@dvt/planner/src/ports/ICompiledCodeStorage.ts']::text[],
    array[
      'packages/@dvt/planner/src/ports/ICompiledCodeStorage.ts',
      'packages/@dvt/planner/test/compiledCode/**'
    ]::text[],
    'TEST-SYS-PLANNER-ARTIFACT-COMPAT-BRIDGE',
    'packages/@dvt/planner/test/compiledCode/attachCompiledCodeRefs.test.ts',
    'pnpm --filter @dvt/planner test -- test/compiledCode/attachCompiledCodeRefs.test.ts test/compiledCode/FileSystemCompiledCodeStorage.test.ts test/compiledCode/InMemoryCompiledCodeStorage.test.ts'
  ),
  (
    'SYS-PLANNER-DOCS-EXAMPLES',
    'Planner documentation and examples',
    'module',
    'infra',
    'review',
    'review',
    'PlannerDocsExamples',
    'ReadPlannerDocumentation;ReadPlannerExamples',
    'Owns active planner package docs, canonicalization notes, and examples that demonstrate planner usage.',
    'Keep planner documentation and executable examples mapped without treating them as domain implementation files.',
    'Planner docs, canonicalization notes, grimorio, or examples change.',
    'packages/@dvt/planner/docs/README.md',
    'Planner docs and examples boundary',
    'none',
    'ReadPlannerDocumentation',
    'query',
    'inbound',
    array['scripts/planning-db-query.test.cjs']::text[],
    array[
      'packages/@dvt/planner/docs/README.md',
      'packages/@dvt/planner/examples/dbt-workflow.ts'
    ]::text[],
    array[
      'packages/@dvt/planner/docs/README.md',
      'packages/@dvt/planner/docs/grimorio.md',
      'packages/@dvt/planner/docs/planning/**',
      'packages/@dvt/planner/examples/**'
    ]::text[],
    'TEST-SYS-PLANNER-DOCS-EXAMPLES',
    'scripts/planning-db-query.test.cjs',
    'pnpm planning:db:query component-profile --component SYS-PLANNER-DOCS-EXAMPLES --no-refresh --limit 80'
  ),
  (
    'SYS-PLANNER-LEGACY-AUDIT-ARTIFACT',
    'Planner legacy commented audit artifact',
    'module',
    'infra',
    'legacy',
    'deprecated',
    'PlannerLegacyAuditArtifact',
    'ReadPlannerLegacyAuditArtifact',
    'Owns the non-executable commented-code planner audit artifact retained for historical reference.',
    'Keep historical planner audit context visible while preventing it from being mistaken for functional planner source.',
    'Deprecation, archival, or removal of the historical planner audit artifact changes.',
    'packages/@dvt/planner/docs/audit/planner_v2_3_2_audit.commented.ts',
    'Deprecated historical planner audit artifact',
    'none',
    'ReadPlannerLegacyAuditArtifact',
    'query',
    'inbound',
    array['scripts/planning-db-query.test.cjs']::text[],
    array['packages/@dvt/planner/docs/audit/planner_v2_3_2_audit.commented.ts']::text[],
    array['packages/@dvt/planner/docs/audit/planner_v2_3_2_audit.commented.ts']::text[],
    'TEST-SYS-PLANNER-LEGACY-AUDIT-ARTIFACT',
    'scripts/planning-db-query.test.cjs',
    'pnpm planning:db:query component-profile --component SYS-PLANNER-LEGACY-AUDIT-ARTIFACT --no-refresh --limit 40'
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
  'PLANNING-DB-PLANNER-ROOT-LEAF-MAPPING-20260618',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Planner root leaf component mapping',
  'Architecture / Planning DB / Planner',
  'review',
  'SYS-PLANNER-ROOT directly owned active planner domain/application/contract files plus transitional and historical files. This design maps active responsibilities to explicit leaves and marks historical or compatibility bridge files as deprecated leaves.',
  'responsibility_overload',
  'CreateGovernanceComponent;RecordArchitectureComponent;RecordArchitectureRelation;RecordArchitecturePort;RecordArchitectureTestEvidence;ValidateComponentIntegrity',
  null
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
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
select
  component_id,
  'planning_query_store.governance_component_local_definitions',
  '1441441441441441441441441441441441441441441441441441441441441441',
  0,
  name,
  'component',
  'SYS-PLANNER-ROOT',
  'SYS-DVT',
  'SYS-DVT',
  local_status,
  false,
  owned_concern,
  ddd_owner,
  cq_rails,
  'codex'
from planner_root_leaf_map
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
from planner_root_leaf_map
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
  select component_id, 'responsibility' as item_kind, responsibility as item_value, 0 as item_order
  from planner_root_leaf_map
  union all
  select component_id, 'reason_to_change', reason_to_change, 0
  from planner_root_leaf_map
  union all
  select
    component_id,
    'invariant',
    'Planner files claimed by this leaf must not fall through to SYS-PLANNER-ROOT.',
    0
  from planner_root_leaf_map
  union all
  select
    component_id,
    'transition',
    case
      when local_status = 'legacy' then 'legacy/deprecated -> retired after callers no longer depend on this historical or compatibility surface.'
      else 'review -> implemented after component-quality shows no direct files owned by SYS-PLANNER-ROOT and planner tests remain green.'
    end,
    0
  from planner_root_leaf_map
  union all
  select
    component_id,
    'consumer',
    'Planner package consumers, API plan routes, engine plan compilation, and package tests',
    0
  from planner_root_leaf_map
  union all
  select
    component_id,
    'governance_ref',
    'docs/architecture/command-query-rail-governance.md',
    0
  from planner_root_leaf_map
  union all
  select
    component_id,
    'governance_ref',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    1
  from planner_root_leaf_map
  union all
  select component_id, 'fowler_signal', fowler_signal, 0
  from planner_root_leaf_map
  union all
  select component_id, 'public_api', api.value, api.item_order - 1
  from planner_root_leaf_map
  cross join lateral unnest(public_api) with ordinality as api(value, item_order)
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
  parent_component_id
)
values (
  'SYS-PLANNER-ROOT',
  'Planner root component',
  'service',
  'application',
  'Architecture / Planner',
  'packages/@dvt/planner/src/domain/Planner.ts',
  'Composite planner package, application facade, domain planner, contracts, docs, examples, and compatibility boundary.',
  'node',
  'high',
  'review',
  null
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
select
  component_id,
  name,
  kind,
  layer,
  ddd_owner,
  repo_path,
  public_contract,
  'node',
  case when layer in ('domain', 'application', 'contracts') then 'high' else 'medium' end,
  architecture_status,
  'SYS-PLANNER-ROOT'
from planner_root_leaf_map
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

insert into architecture.component_port (
  port_id,
  component_id,
  port_name,
  port_kind,
  direction,
  negative_tests,
  status
)
select
  'PORT-' || component_id || '-' || upper(port_kind),
  component_id,
  port_name,
  port_kind,
  port_direction,
  negative_tests,
  case when architecture_status = 'deprecated' then 'implemented' else 'implemented' end
from planner_root_leaf_map
on conflict (port_id) do update set
  component_id = excluded.component_id,
  port_name = excluded.port_name,
  port_kind = excluded.port_kind,
  direction = excluded.direction,
  negative_tests = excluded.negative_tests,
  status = excluded.status;

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
  responsibility,
  reason_to_change,
  ddd_owner,
  case when architecture_status = 'deprecated' then 'implemented' else 'implemented' end
from planner_root_leaf_map
union all
select
  'RESP-SYS-PLANNER-ROOT',
  'SYS-PLANNER-ROOT',
  'Own the composite planner package boundary and delegate application, domain, contract, docs, examples, compatibility, and audit files to child components.',
  'Planner package topology, domain ownership, contract port ownership, or Planning DB component-map changes.',
  'PlannerRoot',
  'implemented'
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
select
  'REL-PLANNER-ROOT-CONTAINS-' || replace(component_id, 'SYS-PLANNER-', ''),
  'SYS-PLANNER-ROOT',
  component_id,
  'contains',
  'outbound',
  'build_time',
  null,
  'Component profile becomes incomplete if this planner leaf is remapped without a governed Planning DB component update.',
  'repo-local planner governance',
  jsonb_build_array(
    'docs/architecture/command-query-rail-governance.md',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    repo_path
  ),
  'implemented'
from planner_root_leaf_map
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
select
  test_id,
  component_id,
  test_path,
  case when local_status = 'legacy' then 'architecture' else 'unit' end,
  case when local_status = 'legacy' then 'boundary' else 'behavior' end,
  true,
  validation_command
from planner_root_leaf_map
union all
select
  'TEST-SYS-PLANNER-ROOT-COMPONENT-PROFILE',
  'SYS-PLANNER-ROOT',
  'scripts/planning-db-query.test.cjs',
  'architecture',
  'boundary',
  true,
  'pnpm planning:db:query component-profile --component SYS-PLANNER-ROOT --no-refresh --limit 120 && pnpm planning:db:query component-drift --component SYS-PLANNER-ROOT --no-refresh --limit 80'
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

drop table if exists pg_temp.planner_root_leaf_map;
