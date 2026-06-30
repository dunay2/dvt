-- Split SYS-CONTRACTS-ROOT into bounded contract leaf components. The root
-- remains a composite contract boundary; concrete files move to contract,
-- schema, validation, test, or package leaves.

drop table if exists pg_temp.contracts_root_leaf_map;

create temporary table contracts_root_leaf_map (
  component_id text primary key,
  name text not null,
  ddd_owner text not null,
  cq_rails text not null,
  owned_concern text not null,
  responsibility text not null,
  reason_to_change text not null,
  repo_path text not null,
  public_contract text not null,
  fowler_signal text not null,
  contract_kind text not null,
  public_api text[] not null,
  owns text[] not null,
  test_id text not null,
  test_path text not null,
  validation_command text not null
);

insert into contracts_root_leaf_map (
  component_id,
  name,
  ddd_owner,
  cq_rails,
  owned_concern,
  responsibility,
  reason_to_change,
  repo_path,
  public_contract,
  fowler_signal,
  contract_kind,
  public_api,
  owns,
  test_id,
  test_path,
  validation_command
)
values
  (
    'SYS-CONTRACTS-COMPAT-MATRIX',
    'Plan compatibility matrix contract',
    'PlanCompatibilityMatrix',
    'ReadPlanCompatibilityMatrix;ValidatePlanCompatibilityMatrix',
    'Owns repository and package-local plan compatibility matrix schemas.',
    'Keep compatibility schema and data files mapped to one explicit contract component.',
    'Plan compatibility shape, supported plan versions, admission compatibility, or schema validation changes.',
    'contracts/compat/plan-compat.schema.json',
    'Plan compatibility matrix schema boundary',
    'published_language',
    'type',
    array['contracts/compat/plan-compat.json', 'contracts/compat/plan-compat.schema.json']::text[],
    array['contracts/compat/**', 'packages/@dvt/contracts/compat/**']::text[],
    'TEST-SYS-CONTRACTS-COMPAT-MATRIX',
    'packages/@dvt/contracts/test/plan-version.contract.test.ts',
    'pnpm --filter @dvt/contracts test -- plan-version.contract.test.ts'
  ),
  (
    'SYS-CONTRACTS-PACKAGE-ENTRYPOINTS',
    'Contracts package entrypoints',
    'ContractsPackageEntrypoint',
    'ImportContractsPackage;ValidateContractsPackageExports',
    'Owns package metadata, top-level entrypoints, generated entry shims, and exported workflow/schema surfaces.',
    'Separate package export authority from individual engine, planner, schema, and validation contract families.',
    'Package exports, entrypoint compatibility, declaration shims, package config, or public barrel changes.',
    'packages/@dvt/contracts/index.ts',
    '@dvt/contracts package entrypoint boundary',
    'hidden_authority',
    'api',
    array['packages/@dvt/contracts/index.ts', 'packages/@dvt/contracts/src/index.ts']::text[],
    array[
      'packages/@dvt/contracts/index.d.ts',
      'packages/@dvt/contracts/index.js',
      'packages/@dvt/contracts/index.ts',
      'packages/@dvt/contracts/package.json',
      'packages/@dvt/contracts/src/index.ts',
      'packages/@dvt/contracts/src/schemas.ts',
      'packages/@dvt/contracts/src/workflows.ts',
      'packages/@dvt/contracts/tsconfig.json',
      'packages/@dvt/contracts/vitest.config.ts'
    ]::text[],
    'TEST-SYS-CONTRACTS-PACKAGE-ENTRYPOINTS',
    'packages/@dvt/contracts/test/schema-sync.test.ts',
    'pnpm --filter @dvt/contracts test -- schema-sync.test.ts'
  ),
  (
    'SYS-CONTRACTS-ENGINE-RUNTIME-CONTRACTS',
    'Engine runtime contract family',
    'EngineRuntimeContractFamily',
    'ValidateEngineRuntimeContracts;ReadRunSnapshotStaleness',
    'Owns engine runtime interfaces, run events, signal semantics, execution policy, state vocabulary, and runtime query contracts.',
    'Map engine contract files by runtime bounded context instead of leaving them as root contract files.',
    'Engine event, workflow, signal, outbox, execution policy, run-state, or runtime query contract changes.',
    'packages/@dvt/contracts/src/contracts/engine/IWorkflowEngine.v1.ts',
    'Engine runtime contract family boundary',
    'published_language',
    'port',
    array[
      'packages/@dvt/contracts/src/contracts/engine/IWorkflowEngine.v1.ts',
      'packages/@dvt/contracts/src/contracts/engine/RunEvents.v1.ts'
    ]::text[],
    array['packages/@dvt/contracts/src/contracts/engine/**', 'packages/@dvt/contracts/src/engine/**']::text[],
    'TEST-SYS-CONTRACTS-ENGINE-RUNTIME-CONTRACTS',
    'packages/@dvt/contracts/test/start-run-boundary.contract.test.ts',
    'pnpm --filter @dvt/contracts test -- start-run-boundary.contract.test.ts signalSemantics.test.ts'
  ),
  (
    'SYS-CONTRACTS-PLANNER-CONTRACTS',
    'Planner contract family',
    'PlannerContractFamily',
    'ValidatePlannerContracts;CompileExecutionPlan',
    'Owns planner execution plan, admission, policy vocabulary, workspace graph, transformation flow, and plan-record contracts.',
    'Map planner contract files to the planner bounded context and keep plan-authoring contracts queryable.',
    'Planner input, plan admission, execution plan, policy vocabulary, workspace graph, transformation flow, or plan record contract changes.',
    'packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v1.ts',
    'Planner contract family boundary',
    'published_language',
    'port',
    array[
      'packages/@dvt/contracts/src/contracts/planner/IExecutionPlanner.v1.ts',
      'packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v1.ts'
    ]::text[],
    array['packages/@dvt/contracts/src/contracts/planner/**']::text[],
    'TEST-SYS-CONTRACTS-PLANNER-CONTRACTS',
    'packages/@dvt/contracts/test/planner.contract.test.ts',
    'pnpm --filter @dvt/contracts test -- planner.contract.test.ts plan-admission-matrix.contract.test.ts'
  ),
  (
    'SYS-CONTRACTS-SCHEMA-PACKS',
    'Runtime schema pack contract family',
    'RuntimeSchemaPackCatalog',
    'ValidateSchemaPacks;ValidateRuntimePayload',
    'Owns runtime schema packs for execution plans, planner context, plan records, previews, run events, start-run, and workspace graph drafts.',
    'Keep schema pack ownership separate from TypeScript contract declarations and package entrypoints.',
    'Schema pack generation, runtime validation shape, fixture compatibility, or payload schema changes.',
    'packages/@dvt/contracts/src/schema-packs/execution-plan.ts',
    'Runtime schema pack boundary',
    'published_language',
    'type',
    array[
      'packages/@dvt/contracts/src/schema-packs/execution-plan.ts',
      'packages/@dvt/contracts/src/schema-packs/run-events.ts'
    ]::text[],
    array['packages/@dvt/contracts/src/schema-packs/**']::text[],
    'TEST-SYS-CONTRACTS-SCHEMA-PACKS',
    'packages/@dvt/contracts/test/validation.test.ts',
    'pnpm --filter @dvt/contracts test -- validation.test.ts schema-sync.test.ts'
  ),
  (
    'SYS-CONTRACTS-STEP-REGISTRY',
    'Step type registry contract family',
    'StepTypeRegistryContractFamily',
    'ValidateStepTypeRegistry;ReadBuiltInStepTypeEntries',
    'Owns built-in step type entries, DBT step config, and step registry contract utilities.',
    'Map step-kind and step-type registry behavior to a separate contract component.',
    'Step kind, DBT step config, built-in registry, or step type validation contract changes.',
    'packages/@dvt/contracts/src/step-registry/StepTypeRegistry.ts',
    'Step type registry contract boundary',
    'published_language',
    'type',
    array[
      'packages/@dvt/contracts/src/step-registry/StepTypeRegistry.ts',
      'packages/@dvt/contracts/src/step-registry/BuiltInStepTypeEntries.ts'
    ]::text[],
    array['packages/@dvt/contracts/src/step-registry/**']::text[],
    'TEST-SYS-CONTRACTS-STEP-REGISTRY',
    'packages/@dvt/contracts/test/step-registry.test.ts',
    'pnpm --filter @dvt/contracts test -- step-registry.test.ts'
  ),
  (
    'SYS-CONTRACTS-SHARED-TYPES-UTILS',
    'Shared contract types and primitives',
    'SharedContractPrimitiveCatalog',
    'ValidateContractPrimitives;ReadCanonicalContractErrors',
    'Owns shared error contracts, shared type definitions, artifact types, canonicalization, and hashing utilities used by contract families.',
    'Keep shared primitives explicit so duplicate utility semantics do not appear in multiple contract families.',
    'Error contract, shared type, artifact type, canonicalization, hashing, or primitive utility changes.',
    'packages/@dvt/contracts/src/utils/contractPrimitives.ts',
    'Shared contract primitive boundary',
    'primitive_obsession',
    'type',
    array[
      'packages/@dvt/contracts/src/errorContract.ts',
      'packages/@dvt/contracts/src/types/contracts.ts',
      'packages/@dvt/contracts/src/utils/contractPrimitives.ts'
    ]::text[],
    array[
      'packages/@dvt/contracts/src/errorContract.ts',
      'packages/@dvt/contracts/src/errors.ts',
      'packages/@dvt/contracts/src/types/**',
      'packages/@dvt/contracts/src/utils/**'
    ]::text[],
    'TEST-SYS-CONTRACTS-SHARED-TYPES-UTILS',
    'packages/@dvt/contracts/test/sha256HexUtf8.test.ts',
    'pnpm --filter @dvt/contracts test -- errors.test.ts sha256HexUtf8.test.ts'
  ),
  (
    'SYS-CONTRACTS-VALIDATION-RUNTIME',
    'Contract runtime validation functions',
    'ContractRuntimeValidation',
    'ValidateRuntimePayload;ValidatePlannerPayload;ValidateRunEventPayload',
    'Owns runtime validation entrypoints for core, event, planner, and runtime payloads.',
    'Map validation functions separately from schema packs and contract declarations.',
    'Validation behavior, negative tests, payload parsing, or runtime schema enforcement changes.',
    'packages/@dvt/contracts/src/validation.ts',
    'Contract runtime validation boundary',
    'hidden_authority',
    'api',
    array['packages/@dvt/contracts/src/validation.ts', 'packages/@dvt/contracts/src/validation/core.ts']::text[],
    array['packages/@dvt/contracts/src/validation.ts', 'packages/@dvt/contracts/src/validation/**']::text[],
    'TEST-SYS-CONTRACTS-VALIDATION-RUNTIME',
    'packages/@dvt/contracts/test/validation.test.ts',
    'pnpm --filter @dvt/contracts test -- validation.test.ts'
  ),
  (
    'SYS-CONTRACTS-PACKAGE-TESTS',
    'Contracts package test evidence',
    'ContractsPackageTestEvidence',
    'ValidateContractsPackageTests;ValidateArchitectureContractTests',
    'Owns package-local contract, architecture, validation, fixture, and schema-sync tests.',
    'Keep tests connected as evidence for contract components instead of leaving tests owned by the root.',
    'Contract test, fixture, architecture test, schema sync, or validation coverage changes.',
    'packages/@dvt/contracts/test/',
    'Contracts package test evidence boundary',
    'hidden_authority',
    'type',
    array['packages/@dvt/contracts/test/planner.contract.test.ts']::text[],
    array['packages/@dvt/contracts/test/**']::text[],
    'TEST-SYS-CONTRACTS-PACKAGE-TESTS',
    'packages/@dvt/contracts/test/schema-sync.test.ts',
    'pnpm --filter @dvt/contracts test'
  ),
  (
    'SYS-PLANNER-CONTRACTS-PACKAGE',
    'Planner contracts compatibility package',
    'PlannerContractsCompatibilityPackage',
    'ImportPlannerContractsCompatibilityPackage;ValidatePlannerContractsPackage',
    'Owns the planner-contracts compatibility package that re-exports planner contract surfaces for package consumers.',
    'Keep the compatibility package explicit so it does not duplicate the canonical planner contract family silently.',
    'Planner-contracts package exports, package metadata, or compatibility shim changes.',
    'packages/@dvt/planner-contracts/index.ts',
    '@dvt/planner-contracts compatibility package boundary',
    'boundary_drift',
    'api',
    array['packages/@dvt/planner-contracts/index.ts']::text[],
    array['packages/@dvt/planner-contracts/**']::text[],
    'TEST-SYS-PLANNER-CONTRACTS-PACKAGE',
    'packages/@dvt/contracts/test/planner.contract.test.ts',
    'pnpm --filter @dvt/contracts test -- planner.contract.test.ts'
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
  'PLANNING-DB-CONTRACTS-ROOT-LEAF-MAPPING-20260618',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Contracts root leaf component mapping',
  'Architecture / Planning DB / Contracts',
  'review',
  'SYS-CONTRACTS-ROOT directly owned compatibility schemas, contract declarations, schema packs, validation code, tests, and planner-contract compatibility files. This design maps each responsibility to an explicit bounded contract leaf.',
  'responsibility_overload',
  'CreateGovernanceComponent;RecordArchitectureComponent;RecordArchitectureContract;RecordArchitectureRelation;RecordArchitectureTestEvidence;ValidateComponentIntegrity',
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
  '1391391391391391391391391391391391391391391391391391391391391391',
  0,
  name,
  'component',
  'SYS-CONTRACTS-ROOT',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  false,
  owned_concern,
  ddd_owner,
  cq_rails,
  'codex'
from contracts_root_leaf_map
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
from contracts_root_leaf_map
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
  from contracts_root_leaf_map
  union all
  select component_id, 'reason_to_change', reason_to_change, 0
  from contracts_root_leaf_map
  union all
  select
    component_id,
    'invariant',
    'Contract files claimed by this leaf must not fall through to SYS-CONTRACTS-ROOT.',
    0
  from contracts_root_leaf_map
  union all
  select
    component_id,
    'transition',
    'review -> implemented after component-quality shows no direct files owned by SYS-CONTRACTS-ROOT and contract tests remain green.',
    0
  from contracts_root_leaf_map
  union all
  select
    component_id,
    'consumer',
    'Engine, planner, adapters, web, validation, and package consumers of @dvt/contracts',
    0
  from contracts_root_leaf_map
  union all
  select
    component_id,
    'governance_ref',
    'docs/architecture/command-query-rail-governance.md',
    0
  from contracts_root_leaf_map
  union all
  select
    component_id,
    'governance_ref',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    1
  from contracts_root_leaf_map
  union all
  select component_id, 'fowler_signal', fowler_signal, 0
  from contracts_root_leaf_map
  union all
  select component_id, 'public_api', api.value, api.item_order - 1
  from contracts_root_leaf_map
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
  'SYS-CONTRACTS-ROOT',
  'Contracts root component',
  'package',
  'contracts',
  'Architecture / Contracts',
  'packages/@dvt/contracts/index.ts',
  'Composite contracts boundary with leaf-owned contract families.',
  'node',
  'critical',
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
  case
    when contract_kind = 'api' then 'api'
    when contract_kind = 'port' then 'port'
    else 'module'
  end,
  'contracts',
  ddd_owner,
  repo_path,
  public_contract,
  'node',
  'high',
  'review',
  'SYS-CONTRACTS-ROOT'
from contracts_root_leaf_map
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
  'CONTRACT-' || component_id,
  contract_kind,
  component_id,
  repo_path,
  'internal',
  'implemented',
  validation_command
from contracts_root_leaf_map
on conflict (contract_id) do update set
  contract_kind = excluded.contract_kind,
  owner_component_id = excluded.owner_component_id,
  contract_ref = excluded.contract_ref,
  compatibility = excluded.compatibility,
  status = excluded.status,
  validation_command = excluded.validation_command,
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
  responsibility,
  reason_to_change,
  ddd_owner,
  'implemented'
from contracts_root_leaf_map
union all
select
  'RESP-SYS-CONTRACTS-ROOT',
  'SYS-CONTRACTS-ROOT',
  'Own the composite contracts package boundary and delegate concrete contract files to bounded contract child components.',
  'Contract topology, package exports, contract family ownership, or Planning DB component-map changes.',
  'ContractsRoot',
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
  'REL-CONTRACTS-ROOT-CONTAINS-' ||
    replace(
      replace(component_id, 'SYS-CONTRACTS-', ''),
      'SYS-PLANNER-CONTRACTS-',
      'PLANNER-CONTRACTS-'
    ),
  'SYS-CONTRACTS-ROOT',
  component_id,
  'contains',
  'outbound',
  'build_time',
  'CONTRACT-' || component_id,
  'Component profile becomes incomplete if this contract child is remapped without a governed Planning DB component update.',
  'repo-local contract governance',
  jsonb_build_array(
    'docs/contracts/index.md',
    'docs/architecture/command-query-rail-governance.md',
    repo_path
  ),
  'implemented'
from contracts_root_leaf_map
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
  'contract',
  'behavior',
  true,
  validation_command
from contracts_root_leaf_map
union all
select
  'TEST-SYS-CONTRACTS-ROOT-COMPONENT-PROFILE',
  'SYS-CONTRACTS-ROOT',
  'scripts/planning-db-query.test.cjs',
  'architecture',
  'boundary',
  true,
  'pnpm planning:db:query component-profile --component SYS-CONTRACTS-ROOT --no-refresh --limit 120 && pnpm planning:db:query component-drift --component SYS-CONTRACTS-ROOT --no-refresh --limit 80'
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

drop table if exists pg_temp.contracts_root_leaf_map;
