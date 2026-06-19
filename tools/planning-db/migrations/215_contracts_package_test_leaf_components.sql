-- Split the broad contracts package test evidence component into focused test
-- leaves. These files are active contract evidence; old or nonfunctional tests
-- require explicit deprecation evidence before they can be marked deprecated.

drop table if exists pg_temp.contracts_package_test_leaf_map;
drop table if exists pg_temp.contracts_package_test_guard_map;

create temporary table contracts_package_test_leaf_map (
  component_id text primary key,
  name text not null,
  ddd_owner text not null,
  cq_rails text not null,
  owned_concern text not null,
  responsibility text not null,
  reason_to_change text not null,
  invariant text not null,
  repo_path text not null,
  public_contract text not null,
  fowler_signal text not null,
  public_api text[] not null,
  owns text[] not null,
  test_paths text[] not null,
  test_kind text not null,
  coverage_level text not null,
  validation_command text not null,
  port_name text not null,
  port_kind text not null,
  negative_tests text[] not null,
  maturity_score numeric not null,
  criticality text not null,
  relation_suffix text not null
);

create temporary table contracts_package_test_guard_map (
  source_component_id text not null,
  target_component_id text not null,
  relation_id text primary key,
  failure_mode text not null
);

insert into contracts_package_test_leaf_map (
  component_id,
  name,
  ddd_owner,
  cq_rails,
  owned_concern,
  responsibility,
  reason_to_change,
  invariant,
  repo_path,
  public_contract,
  fowler_signal,
  public_api,
  owns,
  test_paths,
  test_kind,
  coverage_level,
  validation_command,
  port_name,
  port_kind,
  negative_tests,
  maturity_score,
  criticality,
  relation_suffix
)
values
  (
    'SYS-CONTRACTS-TESTS-COMPILED-CODE-SCHEMA',
    'Contracts compiled-code and schema evidence',
    'ContractsCompiledCodeSchemaEvidence',
    'ValidateCompiledCodeRefContract;ValidateContractSchemaSync',
    'Owns compiled-code reference contract evidence, run-event compiled-code fixtures, schema sync, and SHA-256 helper tests.',
    'Validate compiled-code refs and schema synchronization without owning planner, runtime, or adapter behavior.',
    'Compiled-code ref shape, run-event compiled-code fixture, schema sync, or SHA-256 helper changes.',
    'Compiled-code and schema evidence must validate contract shape only; production runtime resolution belongs to runtime/adapters.',
    'packages/@dvt/contracts/test/compiled-code-ref.contract.test.ts',
    'Compiled-code reference and schema synchronization contract evidence boundary.',
    'published_language',
    array['compiled-code-ref.contract', 'schema-sync', 'sha256HexUtf8']::text[],
    array[
      'packages/@dvt/contracts/test/compiled-code-ref.contract.test.ts',
      'packages/@dvt/contracts/test/fixtures/run-event-compiled-code-ref.fixtures.ts',
      'packages/@dvt/contracts/test/schema-sync.test.ts',
      'packages/@dvt/contracts/test/sha256HexUtf8.test.ts'
    ]::text[],
    array[
      'packages/@dvt/contracts/test/compiled-code-ref.contract.test.ts',
      'packages/@dvt/contracts/test/schema-sync.test.ts',
      'packages/@dvt/contracts/test/sha256HexUtf8.test.ts'
    ]::text[],
    'contract',
    'behavior',
    'pnpm --filter @dvt/contracts test -- compiled-code-ref.contract.test.ts schema-sync.test.ts sha256HexUtf8.test.ts',
    'ValidateCompiledCodeRefContract',
    'query',
    array['missing compiled code ref', 'schema drift', 'non-hex digest']::text[],
    84,
    'high',
    'COMPILED-CODE-SCHEMA'
  ),
  (
    'SYS-CONTRACTS-TESTS-PLAN-ADMISSION',
    'Contracts plan admission evidence',
    'ContractsPlanAdmissionEvidence',
    'ValidatePlanAdmissionMatrix;ValidateExecutionSelectionContract',
    'Owns plan admission, execution selection, and step-registry contract/architecture tests.',
    'Validate admission and execution-selection compatibility while keeping planner and runtime implementation out of contracts tests.',
    'Plan admission matrix, execution selection contract, step registry, or admission architecture tests change.',
    'Plan admission evidence must reject incompatible selection states and must not implement planner scheduling.',
    'packages/@dvt/contracts/test/plan-admission-matrix.contract.test.ts',
    'Plan admission matrix, execution selection, and step-registry test evidence boundary.',
    'policy_object',
    array['plan-admission-matrix', 'execution-selection', 'step-registry']::text[],
    array[
      'packages/@dvt/contracts/test/execution-selection.architecture.test.ts',
      'packages/@dvt/contracts/test/execution-selection.contract.test.ts',
      'packages/@dvt/contracts/test/plan-admission-matrix.architecture.test.ts',
      'packages/@dvt/contracts/test/plan-admission-matrix.contract.test.ts',
      'packages/@dvt/contracts/test/step-registry.test.ts'
    ]::text[],
    array[
      'packages/@dvt/contracts/test/execution-selection.contract.test.ts',
      'packages/@dvt/contracts/test/plan-admission-matrix.contract.test.ts',
      'packages/@dvt/contracts/test/step-registry.test.ts'
    ]::text[],
    'contract',
    'negative',
    'pnpm --filter @dvt/contracts test -- execution-selection.contract.test.ts plan-admission-matrix.contract.test.ts step-registry.test.ts',
    'ValidatePlanAdmissionMatrix',
    'query',
    array['unsupported execution selection', 'unknown step kind', 'invalid admission state']::text[],
    86,
    'critical',
    'PLAN-ADMISSION'
  ),
  (
    'SYS-CONTRACTS-TESTS-PLANNER',
    'Contracts planner evidence',
    'ContractsPlannerEvidence',
    'ValidatePlannerContract;ValidatePlannerPolicyVocabulary',
    'Owns planner contract tests, planner contract fixtures, planner policy vocabulary checks, and planner-private ownership architecture evidence.',
    'Validate planner contract compatibility and vocabulary without leaking private planner ownership into shared contracts.',
    'Planner contract, planner fixture, planner policy vocabulary, or planner-private ownership architecture changes.',
    'Planner evidence must keep private planner implementation outside shared contracts and fixtures.',
    'packages/@dvt/contracts/test/planner.contract.test.ts',
    'Planner contract and policy vocabulary test evidence boundary.',
    'bounded_context_contract',
    array['planner.contract', 'planner-policy-vocabulary', 'planner-contract.fixtures']::text[],
    array[
      'packages/@dvt/contracts/test/fixtures/planner-contract.fixtures.ts',
      'packages/@dvt/contracts/test/planner.contract.test.ts',
      'packages/@dvt/contracts/test/planner-policy-vocabulary.test.ts',
      'packages/@dvt/contracts/test/planner-private-ownership.architecture.test.ts'
    ]::text[],
    array[
      'packages/@dvt/contracts/test/planner.contract.test.ts',
      'packages/@dvt/contracts/test/planner-policy-vocabulary.test.ts',
      'packages/@dvt/contracts/test/planner-private-ownership.architecture.test.ts'
    ]::text[],
    'contract',
    'boundary',
    'pnpm --filter @dvt/contracts test -- planner.contract.test.ts planner-policy-vocabulary.test.ts planner-private-ownership.architecture.test.ts',
    'ValidatePlannerContract',
    'query',
    array['private planner type leak', 'unknown planner policy vocabulary', 'fixture contract drift']::text[],
    86,
    'critical',
    'PLANNER'
  ),
  (
    'SYS-CONTRACTS-TESTS-PLANSTORE-VERSION',
    'Contracts plan-store and version evidence',
    'ContractsPlanStoreVersionEvidence',
    'ValidatePlanStoreRecordShape;ValidatePlanVersionContract',
    'Owns plan-store record architecture, shape sync, and plan-version contract evidence.',
    'Validate plan-store and plan-version contract stability while storage adapters remain behind their own ports.',
    'Plan-store record shape, plan-store architecture, or plan-version contract changes.',
    'Plan-store test evidence must not define storage adapter behavior or migration policy.',
    'packages/@dvt/contracts/test/plan-store-records-shape-sync.test.ts',
    'Plan-store records and plan-version contract test evidence boundary.',
    'published_language',
    array['plan-store-records', 'plan-version']::text[],
    array[
      'packages/@dvt/contracts/test/plan-store-records.architecture.test.ts',
      'packages/@dvt/contracts/test/plan-store-records-shape-sync.test.ts',
      'packages/@dvt/contracts/test/plan-version.contract.test.ts'
    ]::text[],
    array[
      'packages/@dvt/contracts/test/plan-store-records-shape-sync.test.ts',
      'packages/@dvt/contracts/test/plan-version.contract.test.ts'
    ]::text[],
    'contract',
    'behavior',
    'pnpm --filter @dvt/contracts test -- plan-store-records-shape-sync.test.ts plan-version.contract.test.ts',
    'ValidatePlanStoreRecordShape',
    'query',
    array['plan record shape drift', 'unsupported plan version', 'storage behavior leak']::text[],
    84,
    'high',
    'PLANSTORE-VERSION'
  ),
  (
    'SYS-CONTRACTS-TESTS-PROVIDER-ADAPTER',
    'Contracts provider adapter evidence',
    'ContractsProviderAdapterEvidence',
    'ValidateProviderAdapterContractVocabulary',
    'Owns provider-adapter architecture, provider vocabulary, and run-state store maintenance concurrency evidence.',
    'Validate provider adapter vocabulary and concurrency expectations without coupling contracts tests to one adapter implementation.',
    'Provider adapter architecture, provider vocabulary, or run-state store maintenance concurrency tests change.',
    'Provider adapter evidence must guard vocabulary and concurrency boundaries without implementing adapters.',
    'packages/@dvt/contracts/test/provider-adapter.architecture.test.ts',
    'Provider adapter vocabulary and concurrency architecture evidence boundary.',
    'anti_corruption_layer',
    array['provider-adapter.architecture', 'provider-vocabulary.architecture', 'run-state-store-maintenance-concurrency']::text[],
    array[
      'packages/@dvt/contracts/test/provider-adapter.architecture.test.ts',
      'packages/@dvt/contracts/test/provider-vocabulary.architecture.test.ts',
      'packages/@dvt/contracts/test/run-state-store-maintenance-concurrency.architecture.test.ts'
    ]::text[],
    array[
      'packages/@dvt/contracts/test/provider-adapter.architecture.test.ts',
      'packages/@dvt/contracts/test/provider-vocabulary.architecture.test.ts',
      'packages/@dvt/contracts/test/run-state-store-maintenance-concurrency.architecture.test.ts'
    ]::text[],
    'architecture',
    'boundary',
    'pnpm --filter @dvt/contracts test -- provider-adapter.architecture.test.ts provider-vocabulary.architecture.test.ts run-state-store-maintenance-concurrency.architecture.test.ts',
    'ValidateProviderAdapterContractVocabulary',
    'query',
    array['provider-owned domain vocabulary', 'maintenance concurrency drift', 'adapter implementation leak']::text[],
    82,
    'high',
    'PROVIDER-ADAPTER'
  ),
  (
    'SYS-CONTRACTS-TESTS-START-RUN-BOUNDARY',
    'Contracts start-run boundary evidence',
    'ContractsStartRunBoundaryEvidence',
    'ValidateStartRunBoundaryContract;ValidateSignalAndErrorSemantics',
    'Owns start-run boundary contract and architecture tests, start-run fixtures, start-run intent ownership, signal semantics, and error contract tests.',
    'Validate start-run, signal, and error contract boundaries while runtime command handling remains outside the contracts package.',
    'Start-run boundary, start-run intent ownership, signal semantics, error contracts, or start-run fixtures change.',
    'Start-run evidence must guard API/runtime boundary semantics without becoming an API route or runtime command handler.',
    'packages/@dvt/contracts/test/start-run-boundary.contract.test.ts',
    'Start-run boundary, signal semantics, and error contract evidence boundary.',
    'application_service_contract',
    array['start-run-boundary', 'signalSemantics', 'errors']::text[],
    array[
      'packages/@dvt/contracts/test/errors.test.ts',
      'packages/@dvt/contracts/test/fixtures/start-run-boundary.fixtures.ts',
      'packages/@dvt/contracts/test/signalSemantics.test.ts',
      'packages/@dvt/contracts/test/start-run-boundary.architecture.test.ts',
      'packages/@dvt/contracts/test/start-run-boundary.contract.test.ts',
      'packages/@dvt/contracts/test/start-run-intent-ownership.architecture.test.ts'
    ]::text[],
    array[
      'packages/@dvt/contracts/test/errors.test.ts',
      'packages/@dvt/contracts/test/signalSemantics.test.ts',
      'packages/@dvt/contracts/test/start-run-boundary.contract.test.ts'
    ]::text[],
    'contract',
    'negative',
    'pnpm --filter @dvt/contracts test -- errors.test.ts signalSemantics.test.ts start-run-boundary.contract.test.ts',
    'ValidateStartRunBoundaryContract',
    'query',
    array['invalid start-run payload', 'unknown signal semantics', 'error contract drift']::text[],
    86,
    'critical',
    'START-RUN-BOUNDARY'
  ),
  (
    'SYS-CONTRACTS-TESTS-VALIDATION-HARNESS',
    'Contracts validation harness',
    'ContractsValidationHarness',
    'ValidateContractsValidationHarness;ReadContractValidationFixture',
    'Owns reusable contract validation helpers for execution context, execution plan, execution selection, plan compile, planner graph, plan records, preview, run lifecycle, signal/error, and workspace graph draft validations.',
    'Validate contract helper behavior and fixture boundaries without making validation helpers production contract owners.',
    'Validation helper, validation harness, fixture reader, schema validation, or contract validation test changes.',
    'Validation harness files must support contract tests only and must not become production adapters or runtime validators.',
    'packages/@dvt/contracts/test/validation.test.ts',
    'Contracts validation helper and fixture evidence boundary.',
    'test_harness',
    array['validation.test', 'validation/execution-plan', 'validation/run-lifecycle']::text[],
    array[
      'packages/@dvt/contracts/test/validation/execution-context.ts',
      'packages/@dvt/contracts/test/validation/execution-plan.ts',
      'packages/@dvt/contracts/test/validation/execution-selection.ts',
      'packages/@dvt/contracts/test/validation/plan-compile.ts',
      'packages/@dvt/contracts/test/validation/planner-graph.ts',
      'packages/@dvt/contracts/test/validation/plan-records.ts',
      'packages/@dvt/contracts/test/validation/preview.ts',
      'packages/@dvt/contracts/test/validation/run-lifecycle.ts',
      'packages/@dvt/contracts/test/validation/signal-and-error.ts',
      'packages/@dvt/contracts/test/validation/workspace-graph-draft.ts',
      'packages/@dvt/contracts/test/validation.test.ts'
    ]::text[],
    array[
      'packages/@dvt/contracts/test/validation.test.ts'
    ]::text[],
    'contract',
    'behavior',
    'pnpm --filter @dvt/contracts test -- validation.test.ts',
    'ValidateContractsValidationHarness',
    'query',
    array['invalid validation fixture', 'production import leak', 'missing schema assertion']::text[],
    84,
    'high',
    'VALIDATION-HARNESS'
  ),
  (
    'SYS-CONTRACTS-TESTS-WORKSPACE-GRAPH-DRAFT',
    'Contracts workspace graph draft evidence',
    'ContractsWorkspaceGraphDraftEvidence',
    'ValidateWorkspaceGraphAuthoringDraftContract',
    'Owns workspace graph authoring draft architecture and contract tests.',
    'Validate workspace graph draft contract shape and authoring boundary without owning Web Canvas implementation.',
    'Workspace graph authoring draft contract or architecture evidence changes.',
    'Workspace graph draft evidence must guard the shared contract while Web Canvas owns UI authoring behavior.',
    'packages/@dvt/contracts/test/workspace-graph-authoring-draft.contract.test.ts',
    'Workspace graph authoring draft contract and architecture evidence boundary.',
    'bounded_context_contract',
    array['workspace-graph-authoring-draft']::text[],
    array[
      'packages/@dvt/contracts/test/workspace-graph-authoring-draft.architecture.test.ts',
      'packages/@dvt/contracts/test/workspace-graph-authoring-draft.contract.test.ts'
    ]::text[],
    array[
      'packages/@dvt/contracts/test/workspace-graph-authoring-draft.contract.test.ts',
      'packages/@dvt/contracts/test/workspace-graph-authoring-draft.architecture.test.ts'
    ]::text[],
    'contract',
    'boundary',
    'pnpm --filter @dvt/contracts test -- workspace-graph-authoring-draft.contract.test.ts workspace-graph-authoring-draft.architecture.test.ts',
    'ValidateWorkspaceGraphAuthoringDraftContract',
    'query',
    array['workspace graph draft shape drift', 'authoring implementation leak', 'draft contract compatibility break']::text[],
    84,
    'high',
    'WORKSPACE-GRAPH-DRAFT'
  );

insert into contracts_package_test_guard_map (
  source_component_id,
  target_component_id,
  relation_id,
  failure_mode
)
values
  (
    'SYS-CONTRACTS-TESTS-COMPILED-CODE-SCHEMA',
    'SYS-CONTRACTS-ROOT',
    'REL-CONTRACTS-TESTS-COMPILED-CODE-SCHEMA-GUARDS-CONTRACTS-ROOT',
    'Compiled-code and schema drift can pass unnoticed if this evidence stops guarding the contracts root.'
  ),
  (
    'SYS-CONTRACTS-TESTS-PLAN-ADMISSION',
    'SYS-CONTRACTS-PLANNER-CONTRACTS',
    'REL-CONTRACTS-TESTS-PLAN-ADMISSION-GUARDS-PLANNER-CONTRACTS',
    'Plan admission and execution-selection contract drift can pass unnoticed if these tests stop guarding planner contracts.'
  ),
  (
    'SYS-CONTRACTS-TESTS-PLANNER',
    'SYS-CONTRACTS-PLANNER-CONTRACTS',
    'REL-CONTRACTS-TESTS-PLANNER-GUARDS-PLANNER-CONTRACTS',
    'Planner contract drift or private planner leaks can pass unnoticed if planner evidence is disconnected.'
  ),
  (
    'SYS-CONTRACTS-TESTS-PLANSTORE-VERSION',
    'SYS-RUNTIME-STATE-STORE',
    'REL-CONTRACTS-TESTS-PLANSTORE-VERSION-GUARDS-RUNTIME-STATE-STORE',
    'Plan-store record and version drift can pass unnoticed if plan-store evidence is disconnected from state-store ownership.'
  ),
  (
    'SYS-CONTRACTS-TESTS-PROVIDER-ADAPTER',
    'SYS-ADAPTERS-ROOT',
    'REL-CONTRACTS-TESTS-PROVIDER-ADAPTER-GUARDS-ADAPTERS-ROOT',
    'Provider vocabulary and adapter concurrency drift can pass unnoticed if adapter evidence is disconnected.'
  ),
  (
    'SYS-CONTRACTS-TESTS-START-RUN-BOUNDARY',
    'SYS-RUNTIME-ENGINE-CONTRACTS',
    'REL-CONTRACTS-TESTS-START-RUN-BOUNDARY-GUARDS-RUNTIME-ENGINE-CONTRACTS',
    'Start-run, signal, and error contract drift can pass unnoticed if runtime engine contract evidence is disconnected.'
  ),
  (
    'SYS-CONTRACTS-TESTS-VALIDATION-HARNESS',
    'SYS-CONTRACTS-ROOT',
    'REL-CONTRACTS-TESTS-VALIDATION-HARNESS-GUARDS-CONTRACTS-ROOT',
    'Validation helper drift can invalidate contract tests if the harness is not connected to contracts root ownership.'
  ),
  (
    'SYS-CONTRACTS-TESTS-WORKSPACE-GRAPH-DRAFT',
    'SYS-WEB-CANVAS-DRAFT-LIFECYCLE',
    'REL-CONTRACTS-TESTS-WORKSPACE-GRAPH-DRAFT-GUARDS-WEB-CANVAS-DRAFT',
    'Workspace graph draft contract drift can pass unnoticed if Web Canvas draft ownership is not linked to the contract evidence.'
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
  'PLANNING-DB-CONTRACTS-PACKAGE-TEST-LEAF-COMPONENTS-20260619',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Contracts package test evidence leaf component mapping',
  'Architecture / Planning DB / Contracts',
  'review',
  'SYS-CONTRACTS-PACKAGE-TESTS owned 38 active contracts package test and fixture files directly. This migration keeps the existing component as the aggregate contracts test evidence boundary and maps concrete files into compiled-code/schema, plan admission, planner, plan-store/version, provider-adapter, start-run boundary, validation harness, and workspace graph draft leaves with guarded component relations, query ports, contracts, tests, observability, and Fowler/DDD basis.',
  'responsibility_overload',
  'ReadComponentProfile;ValidateComponentIntegrity;ValidateContractsPackageTests',
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
select distinct
  'PLANNING-DB-CONTRACTS-PACKAGE-TEST-LEAF-COMPONENTS-20260619',
  scope.subject_kind,
  scope.subject_id,
  scope.scope_kind,
  true
from (
  select 'component'::text, 'SYS-CONTRACTS-PACKAGE-TESTS'::text, 'may_update'::text
  union all
  select 'component', 'SYS-CONTRACTS-ROOT', 'may_reference'
  union all
  select 'component', component_id, 'may_create'
  from contracts_package_test_leaf_map
  union all
  select 'component', target_component_id, 'may_reference'
  from contracts_package_test_guard_map
  union all
  select 'path', 'packages/@dvt/contracts/test/**', 'may_update'
  union all
  select 'path', pattern, 'may_update'
  from contracts_package_test_leaf_map
  cross join lateral unnest(owns) as owned(pattern)
) scope(subject_kind, subject_id, scope_kind)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update planning_query_store.governance_components component
set
  children_required = true,
  cq_rails = 'ValidateContractsPackageTests;ValidateCompiledCodeRefContract;ValidatePlanAdmissionMatrix;ValidatePlannerContract;ValidatePlanStoreRecordShape;ValidateProviderAdapterContractVocabulary;ValidateStartRunBoundaryContract;ValidateContractsValidationHarness;ValidateWorkspaceGraphAuthoringDraftContract',
  fowler_signals = jsonb_build_array('responsibility_overload', 'component_split', 'contract_test_evidence'),
  raw_component = component.raw_component || jsonb_build_object(
    'childrenRequired',
    true,
    'cqRails',
    'ValidateContractsPackageTests;ValidateCompiledCodeRefContract;ValidatePlanAdmissionMatrix;ValidatePlannerContract;ValidatePlanStoreRecordShape;ValidateProviderAdapterContractVocabulary;ValidateStartRunBoundaryContract;ValidateContractsValidationHarness;ValidateWorkspaceGraphAuthoringDraftContract',
    'reconciledBy',
    '215_contracts_package_test_leaf_components',
    'ownedConcern',
    'Owns the aggregate contracts package test evidence boundary; concrete tests resolve to family-owned child components.'
  )
where component.component_id = 'SYS-CONTRACTS-PACKAGE-TESTS';

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
  'SYS-CONTRACTS-PACKAGE-TESTS',
  'tools/planning-db/migrations/215_contracts_package_test_leaf_components.sql',
  md5('SYS-CONTRACTS-PACKAGE-TESTS:215') || md5('contracts-package-test-parent:215'),
  0,
  'Contracts package test evidence',
  'component',
  'SYS-CONTRACTS-ROOT',
  'SYS-DVT',
  'SYS-CONTRACTS',
  'review',
  true,
  'Owns the aggregate contracts package test evidence boundary; concrete tests resolve to family-owned child components.',
  'ContractsPackageTestEvidence',
  'ValidateContractsPackageTests;ValidateCompiledCodeRefContract;ValidatePlanAdmissionMatrix;ValidatePlannerContract;ValidatePlanStoreRecordShape;ValidateProviderAdapterContractVocabulary;ValidateStartRunBoundaryContract;ValidateContractsValidationHarness;ValidateWorkspaceGraphAuthoringDraftContract',
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
  'tools/planning-db/migrations/215_contracts_package_test_leaf_components.sql',
  md5(component_id || ':215') || md5(repo_path || cq_rails || ':contracts-package-test-leaf'),
  0,
  name,
  'component',
  'SYS-CONTRACTS-PACKAGE-TESTS',
  'SYS-DVT',
  'SYS-CONTRACTS',
  'review',
  false,
  owned_concern,
  ddd_owner,
  cq_rails,
  'codex'
from contracts_package_test_leaf_map
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
from contracts_package_test_leaf_map
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
  values
    (
      'SYS-CONTRACTS-PACKAGE-TESTS',
      'responsibility',
      'Own the aggregate contracts package test evidence boundary and delegate concrete test and fixture files to family-owned child components.',
      0
    ),
    (
      'SYS-CONTRACTS-PACKAGE-TESTS',
      'reason_to_change',
      'Contracts package test taxonomy, contract evidence ownership, guarded component relation, or component hierarchy changes.',
      0
    ),
    (
      'SYS-CONTRACTS-PACKAGE-TESTS',
      'invariant',
      'The aggregate must own no concrete packages/@dvt/contracts/test files directly once contracts test leaves are applied.',
      0
    ),
    (
      'SYS-CONTRACTS-PACKAGE-TESTS',
      'non_goal',
      'Do not deprecate active contracts tests merely to reduce direct-file count; nonfunctional tests require explicit deprecation evidence.',
      0
    ),
    (
      'SYS-CONTRACTS-PACKAGE-TESTS',
      'governance_ref',
      'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
      0
    )
) item(component_id, item_kind, item_value, item_order)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

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
  from contracts_package_test_leaf_map
  union all
  select component_id, 'reason_to_change', reason_to_change, 0
  from contracts_package_test_leaf_map
  union all
  select component_id, 'invariant', invariant, 0
  from contracts_package_test_leaf_map
  union all
  select component_id, 'transition', 'review -> implemented after component-quality shows SYS-CONTRACTS-PACKAGE-TESTS owns no direct files and leaf validation commands pass.', 0
  from contracts_package_test_leaf_map
  union all
  select component_id, 'consumer', 'Contracts maintainers, planner/runtime/adapter reviewers, Planning DB component-profile readers, component-integrity, and changed-slice checks', 0
  from contracts_package_test_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md', 0
  from contracts_package_test_leaf_map
  union all
  select component_id, 'fowler_signal', fowler_signal, 0
  from contracts_package_test_leaf_map
  union all
  select component_id, 'public_api', api.value, api.item_order - 1
  from contracts_package_test_leaf_map
  cross join lateral unnest(public_api) with ordinality as api(value, item_order)
) item
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update architecture.component
set
  kind = 'module',
  layer = 'contracts',
  owner = 'ContractsPackageTestEvidence',
  repo_path = 'packages/@dvt/contracts/test',
  public_contract = 'Aggregate contracts package test evidence boundary. Concrete tests and fixtures are owned by focused evidence child components.',
  runtime = 'node',
  criticality = 'critical',
  status = 'review',
  maturity_score = greatest(coalesce(maturity_score, 0), 86),
  parent_component_id = 'SYS-CONTRACTS-ROOT',
  updated_at = now()
where component_id = 'SYS-CONTRACTS-PACKAGE-TESTS';

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
  'contracts',
  ddd_owner,
  repo_path,
  public_contract,
  'node',
  criticality,
  'review',
  maturity_score,
  'SYS-CONTRACTS-PACKAGE-TESTS'
from contracts_package_test_leaf_map
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
  responsibility,
  reason_to_change,
  ddd_owner,
  'implemented'
from contracts_package_test_leaf_map
union all
select
  'RESP-SYS-CONTRACTS-PACKAGE-TESTS',
  'SYS-CONTRACTS-PACKAGE-TESTS',
  'Own the aggregate contracts package test evidence boundary and delegate concrete tests and fixtures to focused evidence leaves.',
  'Contracts test taxonomy, evidence ownership, guarded component relation, or component hierarchy changes.',
  'ContractsPackageTestEvidence',
  'implemented'
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
  'CONTRACT-' || component_id || '-SURFACE',
  'type',
  component_id,
  public_contract,
  'internal',
  'implemented',
  validation_command
from contracts_package_test_leaf_map
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
  'REL-CONTRACTS-PACKAGE-TESTS-CONTAINS-' || relation_suffix,
  'SYS-CONTRACTS-PACKAGE-TESTS',
  component_id,
  'contains',
  'outbound',
  'build_time',
  null,
  'Component profile becomes incomplete if this contracts test evidence leaf is removed or remapped without a governed Planning DB component update.',
  'repo-local contracts governance',
  jsonb_build_array(
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    repo_path
  ),
  'implemented'
from contracts_package_test_leaf_map
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
  relation_id,
  source_component_id,
  target_component_id,
  'guards',
  'outbound',
  'build_time',
  null,
  failure_mode,
  'repo-local contract evidence',
  jsonb_build_array(
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    'tools/planning-db/migrations/215_contracts_package_test_leaf_components.sql'
  ),
  'implemented'
from contracts_package_test_guard_map
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
  'PORT-' || component_id || '-' || upper(regexp_replace(port_name, '[^A-Za-z0-9]+', '-', 'g')),
  component_id,
  port_name,
  port_kind,
  'inbound',
  'CONTRACT-' || component_id || '-SURFACE',
  'CONTRACT-' || component_id || '-SURFACE',
  negative_tests,
  'implemented'
from contracts_package_test_leaf_map
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
  'TEST-' || component_id || '-' || test_path.test_order,
  component_id,
  test_path.path,
  test_kind,
  coverage_level,
  true,
  validation_command
from contracts_package_test_leaf_map
cross join lateral unnest(test_paths) with ordinality as test_path(path, test_order)
union all
select
  'TEST-SYS-CONTRACTS-PACKAGE-TESTS-COMPONENT-PROFILE',
  'SYS-CONTRACTS-PACKAGE-TESTS',
  'scripts/planning-db-query.test.cjs',
  'architecture',
  'boundary',
  true,
  'pnpm planning:db:query component-quality --component SYS-CONTRACTS-PACKAGE-TESTS --no-refresh --limit 20 && pnpm planning:db:query files --component SYS-CONTRACTS-PACKAGE-TESTS --no-refresh --limit 20'
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
  'OBS-' || component_id || '-COMPONENT-PROFILE',
  component_id,
  name || ' is observable through component-profile, component-quality, component-integrity, focused contracts package tests, and changed-slice checks.',
  'dashboard',
  true,
  'implemented'
from contracts_package_test_leaf_map
union all
select
  'OBS-SYS-CONTRACTS-PACKAGE-TESTS-COMPONENT-QUALITY',
  'SYS-CONTRACTS-PACKAGE-TESTS',
  'The aggregate contracts package test evidence component is observable through component-quality direct-file count and child coverage.',
  'dashboard',
  true,
  'implemented'
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;
