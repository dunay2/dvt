-- Split runtime CLI validation into active package and legacy loose-path
-- leaves. The old packages/cli path remains queryable as deprecated evidence
-- until a removal slice proves there are no active consumers.

drop table if exists pg_temp.runtime_cli_validation_leaf_map;

create temporary table runtime_cli_validation_leaf_map (
  component_id text primary key,
  name text not null,
  local_status text not null,
  architecture_status text not null,
  ddd_owner text not null,
  cq_rails text not null,
  owned_concern text not null,
  responsibility text not null,
  reason_to_change text not null,
  invariant text not null,
  transition text not null,
  consumer text not null,
  repo_path text not null,
  kind text not null,
  layer text not null,
  criticality text not null,
  maturity_score numeric not null,
  public_contract text not null,
  runtime text not null,
  fowler_signal text not null,
  public_api text[] not null,
  non_goals text[] not null,
  owns text[] not null
);

insert into runtime_cli_validation_leaf_map (
  component_id,
  name,
  local_status,
  architecture_status,
  ddd_owner,
  cq_rails,
  owned_concern,
  responsibility,
  reason_to_change,
  invariant,
  transition,
  consumer,
  repo_path,
  kind,
  layer,
  criticality,
  maturity_score,
  public_contract,
  runtime,
  fowler_signal,
  public_api,
  non_goals,
  owns
)
values
  (
    'SYS-RUNTIME-CLI-VALIDATION-DVT-CLI-PACKAGE',
    '@dvt CLI validation package',
    'review',
    'review',
    'RuntimeCliValidationPackage',
    'RunRuntimeCliValidation;RunRuntimeGoldenPathValidation;ReadRuntimeCliPackageMetadata',
    'Owns the active @dvt/cli workspace package, script dispatch metadata, contract validation command, and golden-path validation command.',
    'Own the supported runtime CLI validation package and its package-owned commands.',
    'CLI package manifest, validation script, golden-path runner, script metadata, or package smoke test changes.',
    'Runtime CLI validation commands must resolve to packages/@dvt/cli and must not add new behavior under the loose packages/cli path.',
    'aggregate direct ownership -> active @dvt/cli package leaf while legacy packages/cli remains explicitly deprecated.',
    'contributors, CI, release checks, contract validation, and golden-path validation flows',
    'packages/@dvt/cli/package.json',
    'package',
    'adapter',
    'medium',
    62,
    'Active @dvt/cli script surface for validate-contracts and run-golden-paths; not yet a mature user-facing CLI.',
    'node',
    'bounded_context_boundary',
    array[
      'packages/@dvt/cli/package.json',
      'packages/@dvt/cli/src/index.ts',
      'packages/@dvt/cli/validate-contracts.cjs',
      'packages/@dvt/cli/run-golden-paths.cjs'
    ]::text[],
    array[
      'Do not add new command implementations under packages/cli.',
      'Do not describe @dvt/cli as a mature user-facing CLI until src/index.ts exports a real executable command surface.'
    ]::text[],
    array['packages/@dvt/cli/**']::text[]
  ),
  (
    'SYS-RUNTIME-CLI-VALIDATION-LEGACY-LOOSE-PACKAGE',
    'Legacy loose runtime CLI validation path',
    'legacy',
    'deprecated',
    'RuntimeCliValidationLegacyPath',
    'RunRuntimeCliValidation;ReadComponentProfile;DetectCodeSymbolDuplicates',
    'Owns deprecated evidence for packages/cli/validate-contracts.cjs, the non-workspace duplicate of the active @dvt/cli validator.',
    'Keep the loose packages/cli validator visible as deprecated duplicate evidence until a deletion or compatibility-wrapper slice proves consumers.',
    'Historical reference discovery, compatibility-wrapper proof, or physical deletion of packages/cli/validate-contracts.cjs.',
    'The legacy loose path must not receive new behavior; active validation behavior belongs to packages/@dvt/cli.',
    'active duplicate path -> deprecated legacy component, pending consumer proof before physical removal.',
    'Planning DB component-profile, code-symbol duplicate queries, and future CLI physical-layout cleanup',
    'packages/cli/validate-contracts.cjs',
    'module',
    'adapter',
    'low',
    18,
    'Deprecated loose validator path outside the @dvt workspace package; retained only as explicit duplicate evidence.',
    'node',
    'duplicate_semantics',
    array['packages/cli/validate-contracts.cjs']::text[],
    array[
      'Do not add new references to packages/cli/validate-contracts.cjs.',
      'Do not treat packages/cli as a workspace package unless it gains a governed package manifest in a future approved slice.'
    ]::text[],
    array['packages/cli/validate-contracts.cjs']::text[]
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
  'PLANNING-DB-RUNTIME-CLI-VALIDATION-LEAF-MAPPING-20260618',
  'WEB-PHYSICAL-MODULE-DECOMPOSITION-DEBT-20260508',
  'Planning DB runtime CLI validation leaf mapping',
  'Architecture / Runtime / Planning DB',
  'review',
  'SYS-RUNTIME-CLI-VALIDATION directly mixed the active @dvt/cli workspace package with the loose legacy packages/cli validator. The active workspace package owns supported commands; the loose path is a deprecated duplicate that must remain visible until consumer-proof cleanup removes or wraps it.',
  'boundary_drift',
  'RunRuntimeCliValidation;RunRuntimeGoldenPathValidation;ReadComponentProfile;DetectCodeSymbolDuplicates',
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
  'PLANNING-DB-RUNTIME-CLI-VALIDATION-LEAF-MAPPING-20260618',
  scope.subject_kind,
  scope.subject_id,
  scope.scope_kind,
  true
from (
  values
    ('component', 'SYS-RUNTIME-CLI-VALIDATION', 'may_update'),
    ('component', 'SYS-RUNTIME-CLI-VALIDATION-DVT-CLI-PACKAGE', 'may_create'),
    ('component', 'SYS-RUNTIME-CLI-VALIDATION-LEGACY-LOOSE-PACKAGE', 'may_create'),
    ('component', 'SYS-CONTRACTS-VALIDATION-RUNTIME', 'may_reference'),
    ('component', 'SYS-CONTRACTS-ENGINE-RUNTIME-CONTRACTS', 'may_reference'),
    ('path', 'packages/@dvt/cli/**', 'may_reference'),
    ('path', 'packages/cli/validate-contracts.cjs', 'may_reference'),
    ('path', 'docs/architecture/shared/cli.md', 'may_reference'),
    (
      'path',
      'docs/planning/proposals/mandatory/frontend-and-ux/web-physical-module-decomposition-debt-plan-20260508.md',
      'may_reference'
    ),
    ('relation', 'REL-RUNTIME-CLI-VALIDATION-CONTAINS-DVT-CLI-PACKAGE', 'may_create'),
    ('relation', 'REL-RUNTIME-CLI-VALIDATION-CONTAINS-LEGACY-LOOSE-PACKAGE', 'may_create'),
    (
      'relation',
      'REL-RUNTIME-CLI-VALIDATION-DVT-CLI-CALLS-CONTRACTS-VALIDATION-RUNTIME',
      'may_create'
    )
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
values (
  'SYS-RUNTIME-CLI-VALIDATION',
  'tools/planning-db/migrations/177_runtime_cli_validation_leaf_components.sql',
  md5('SYS-RUNTIME-CLI-VALIDATION:177')
    || md5('runtime cli validation aggregate leaf split:177'),
  0,
  'Runtime CLI validation surfaces',
  'component',
  'SYS-RUNTIME-ROOT',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  true,
  'Composite runtime CLI validation boundary; concrete active and legacy files are delegated to leaf components.',
  'RuntimeCliValidationBoundary',
  'RunRuntimeCliValidation;RunRuntimeGoldenPathValidation;ReadComponentProfile;DetectCodeSymbolDuplicates',
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
  'tools/planning-db/migrations/177_runtime_cli_validation_leaf_components.sql',
  md5(component_id || ':177')
    || md5(name || ':runtime-cli-validation-leaf:177'),
  0,
  name,
  'component',
  'SYS-RUNTIME-CLI-VALIDATION',
  'SYS-DVT',
  'SYS-DVT',
  local_status,
  false,
  owned_concern,
  ddd_owner,
  cq_rails,
  'codex'
from runtime_cli_validation_leaf_map
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
from runtime_cli_validation_leaf_map
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
  from runtime_cli_validation_leaf_map
  union all
  select component_id, 'reason_to_change', reason_to_change, 0
  from runtime_cli_validation_leaf_map
  union all
  select component_id, 'invariant', invariant, 0
  from runtime_cli_validation_leaf_map
  union all
  select component_id, 'transition', transition, 0
  from runtime_cli_validation_leaf_map
  union all
  select component_id, 'consumer', consumer, 0
  from runtime_cli_validation_leaf_map
  union all
  select
    component_id,
    'governance_ref',
    'docs/architecture/shared/cli.md',
    0
  from runtime_cli_validation_leaf_map
  union all
  select
    component_id,
    'governance_ref',
    'docs/planning/proposals/mandatory/frontend-and-ux/web-physical-module-decomposition-debt-plan-20260508.md',
    1
  from runtime_cli_validation_leaf_map
  union all
  select
    component_id,
    'governance_ref',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    2
  from runtime_cli_validation_leaf_map
  union all
  select component_id, 'fowler_signal', fowler_signal, 0
  from runtime_cli_validation_leaf_map
  union all
  select component_id, 'public_api', api.value, api.item_order - 1
  from runtime_cli_validation_leaf_map
  cross join lateral unnest(public_api) with ordinality as api(value, item_order)
  union all
  select component_id, 'non_goal', non_goal.value, non_goal.item_order - 1
  from runtime_cli_validation_leaf_map
  cross join lateral unnest(non_goals) with ordinality as non_goal(value, item_order)
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
values (
  'SYS-RUNTIME-CLI-VALIDATION',
  'Runtime CLI validation surfaces',
  'api',
  'adapter',
  'RuntimeCliValidationBoundary',
  'packages/@dvt/cli',
  'Composite runtime CLI validation boundary with active @dvt/cli and deprecated packages/cli leaves.',
  'node',
  'medium',
  'review',
  48,
  'SYS-RUNTIME-ROOT'
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
  kind,
  layer,
  ddd_owner,
  repo_path,
  public_contract,
  runtime,
  criticality,
  architecture_status,
  maturity_score,
  'SYS-RUNTIME-CLI-VALIDATION'
from runtime_cli_validation_leaf_map
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
from runtime_cli_validation_leaf_map
union all
select
  'RESP-SYS-RUNTIME-CLI-VALIDATION',
  'SYS-RUNTIME-CLI-VALIDATION',
  'Own the composite runtime CLI validation boundary and delegate concrete active and legacy files to leaves.',
  'Runtime CLI validation topology, package ownership, command/query rail mapping, or legacy path cleanup changes.',
  'RuntimeCliValidationBoundary',
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
values
  (
    'CONTRACT-SYS-RUNTIME-CLI-VALIDATION-DVT-CLI-PACKAGE-CONTRACT-FIXTURES',
    'type',
    'SYS-RUNTIME-CLI-VALIDATION-DVT-CLI-PACKAGE',
    '@dvt/contracts parser surface plus packages/@dvt/engine/test/contracts fixture corpus consumed by validate-contracts.cjs',
    'internal',
    'implemented',
    'pnpm --filter @dvt/cli validate-contracts'
  ),
  (
    'CONTRACT-SYS-RUNTIME-CLI-VALIDATION-LEGACY-LOOSE-PACKAGE-PATH',
    'type',
    'SYS-RUNTIME-CLI-VALIDATION-LEGACY-LOOSE-PACKAGE',
    'packages/cli/validate-contracts.cjs deprecated loose validator path',
    'internal',
    'deprecated',
    'rg -n "packages/cli|validate-contracts.cjs|@dvt/cli"'
  )
on conflict (contract_id) do update set
  contract_kind = excluded.contract_kind,
  owner_component_id = excluded.owner_component_id,
  contract_ref = excluded.contract_ref,
  compatibility = excluded.compatibility,
  status = excluded.status,
  validation_command = excluded.validation_command,
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
values
  (
    'REL-RUNTIME-CLI-VALIDATION-CONTAINS-DVT-CLI-PACKAGE',
    'SYS-RUNTIME-CLI-VALIDATION',
    'SYS-RUNTIME-CLI-VALIDATION-DVT-CLI-PACKAGE',
    'contains',
    'outbound',
    'sync',
    'CONTRACT-SYS-RUNTIME-CLI-VALIDATION-DVT-CLI-PACKAGE-CONTRACT-FIXTURES',
    'component profile becomes incomplete if active CLI files fall through to the aggregate or legacy path',
    'repo-local runtime validation command ownership',
    jsonb_build_array(
      'docs/architecture/shared/cli.md',
      'docs/planning/proposals/mandatory/frontend-and-ux/web-physical-module-decomposition-debt-plan-20260508.md',
      'packages/@dvt/cli/package.json'
    ),
    'implemented'
  ),
  (
    'REL-RUNTIME-CLI-VALIDATION-CONTAINS-LEGACY-LOOSE-PACKAGE',
    'SYS-RUNTIME-CLI-VALIDATION',
    'SYS-RUNTIME-CLI-VALIDATION-LEGACY-LOOSE-PACKAGE',
    'contains',
    'outbound',
    'sync',
    'CONTRACT-SYS-RUNTIME-CLI-VALIDATION-LEGACY-LOOSE-PACKAGE-PATH',
    'legacy duplicate becomes hidden if packages/cli is neither deprecated nor removed by a governed cleanup slice',
    'repo-local deprecated path evidence',
    jsonb_build_array(
      'docs/planning/proposals/mandatory/frontend-and-ux/web-physical-module-decomposition-debt-plan-20260508.md',
      'packages/cli/validate-contracts.cjs'
    ),
    'implemented'
  ),
  (
    'REL-RUNTIME-CLI-VALIDATION-DVT-CLI-CALLS-CONTRACTS-VALIDATION-RUNTIME',
    'SYS-RUNTIME-CLI-VALIDATION-DVT-CLI-PACKAGE',
    'SYS-CONTRACTS-VALIDATION-RUNTIME',
    'calls',
    'outbound',
    'sync',
    'CONTRACT-SYS-CONTRACTS-VALIDATION-RUNTIME',
    'validate-contracts.cjs fails if @dvt/contracts parser exports drift from the fixture corpus',
    'repo-local contract validation command',
    jsonb_build_array(
      'packages/@dvt/cli/validate-contracts.cjs',
      'packages/@dvt/contracts/src/validation.ts',
      'docs/architecture/shared/cli.md'
    ),
    'implemented'
  ),
  (
    'REL-RUNTIME-CLI-VALIDATION-DVT-CLI-READS-ENGINE-RUNTIME-CONTRACTS',
    'SYS-RUNTIME-CLI-VALIDATION-DVT-CLI-PACKAGE',
    'SYS-CONTRACTS-ENGINE-RUNTIME-CONTRACTS',
    'reads',
    'outbound',
    'sync',
    'CONTRACT-SYS-CONTRACTS-ENGINE-RUNTIME-CONTRACTS',
    'golden and contract validation lose coverage if engine runtime contract fixtures are remapped without this relation',
    'repo-local contract fixture reads',
    jsonb_build_array(
      'packages/@dvt/cli/validate-contracts.cjs',
      'packages/@dvt/engine/test/contracts/plans'
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
values
  (
    'PORT-SYS-RUNTIME-CLI-VALIDATION-DVT-CLI-PACKAGE-RUN-RUNTIME-CLI-VALIDATION',
    'SYS-RUNTIME-CLI-VALIDATION-DVT-CLI-PACKAGE',
    'RunRuntimeCliValidation',
    'command',
    'inbound',
    'CONTRACT-SYS-RUNTIME-CLI-VALIDATION-DVT-CLI-PACKAGE-CONTRACT-FIXTURES',
    null,
    array[
      'pnpm --filter @dvt/cli validate-contracts',
      'pnpm --filter @dvt/cli test'
    ]::text[],
    'implemented'
  ),
  (
    'PORT-SYS-RUNTIME-CLI-VALIDATION-DVT-CLI-PACKAGE-RUN-RUNTIME-GOLDEN-PATH-VALIDATION',
    'SYS-RUNTIME-CLI-VALIDATION-DVT-CLI-PACKAGE',
    'RunRuntimeGoldenPathValidation',
    'command',
    'inbound',
    'CONTRACT-SYS-CONTRACTS-ENGINE-RUNTIME-CONTRACTS',
    null,
    array['pnpm --filter @dvt/cli run-golden-paths']::text[],
    'implemented'
  ),
  (
    'PORT-SYS-RUNTIME-CLI-VALIDATION-DVT-CLI-PACKAGE-READ-RUNTIME-CLI-PACKAGE-METADATA',
    'SYS-RUNTIME-CLI-VALIDATION-DVT-CLI-PACKAGE',
    'ReadRuntimeCliPackageMetadata',
    'query',
    'inbound',
    null,
    null,
    array['pnpm --filter @dvt/cli test']::text[],
    'implemented'
  ),
  (
    'PORT-SYS-RUNTIME-CLI-VALIDATION-LEGACY-LOOSE-PACKAGE-RUN-RUNTIME-CLI-VALIDATION-LEGACY',
    'SYS-RUNTIME-CLI-VALIDATION-LEGACY-LOOSE-PACKAGE',
    'RunRuntimeCliValidation',
    'command',
    'inbound',
    'CONTRACT-SYS-RUNTIME-CLI-VALIDATION-LEGACY-LOOSE-PACKAGE-PATH',
    null,
    array['rg -n "packages/cli|validate-contracts.cjs|@dvt/cli"']::text[],
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

insert into architecture.component_storage_io (
  storage_io_id,
  component_id,
  storage_object,
  direction,
  access_pattern,
  contract_id
)
values
  (
    'STORAGE-SYS-RUNTIME-CLI-VALIDATION-DVT-CLI-PACKAGE-CONTRACT-PARSER-READ',
    'SYS-RUNTIME-CLI-VALIDATION-DVT-CLI-PACKAGE',
    'packages/@dvt/contracts/dist/index.js',
    'reads',
    'read_only',
    'CONTRACT-SYS-CONTRACTS-VALIDATION-RUNTIME'
  ),
  (
    'STORAGE-SYS-RUNTIME-CLI-VALIDATION-DVT-CLI-PACKAGE-PLAN-FIXTURE-READ',
    'SYS-RUNTIME-CLI-VALIDATION-DVT-CLI-PACKAGE',
    'packages/@dvt/engine/test/contracts/plans/*.json',
    'reads',
    'read_only',
    'CONTRACT-SYS-CONTRACTS-ENGINE-RUNTIME-CONTRACTS'
  ),
  (
    'STORAGE-SYS-RUNTIME-CLI-VALIDATION-DVT-CLI-PACKAGE-GOLDEN-HASH-READ',
    'SYS-RUNTIME-CLI-VALIDATION-DVT-CLI-PACKAGE',
    '.golden/hashes.json',
    'reads',
    'read_only',
    'CONTRACT-SYS-RUNTIME-CLI-VALIDATION-DVT-CLI-PACKAGE-CONTRACT-FIXTURES'
  ),
  (
    'STORAGE-SYS-RUNTIME-CLI-VALIDATION-DVT-CLI-PACKAGE-GOLDEN-RESULT-WRITE',
    'SYS-RUNTIME-CLI-VALIDATION-DVT-CLI-PACKAGE',
    'packages/@dvt/engine/test/contracts/results/golden-paths-run.json',
    'writes',
    'bulk',
    'CONTRACT-SYS-RUNTIME-CLI-VALIDATION-DVT-CLI-PACKAGE-CONTRACT-FIXTURES'
  ),
  (
    'STORAGE-SYS-RUNTIME-CLI-VALIDATION-LEGACY-LOOSE-PACKAGE-OLD-PLAN-FIXTURE-READ',
    'SYS-RUNTIME-CLI-VALIDATION-LEGACY-LOOSE-PACKAGE',
    'packages/engine/test/contracts/plans/*.json',
    'reads',
    'read_only',
    'CONTRACT-SYS-RUNTIME-CLI-VALIDATION-LEGACY-LOOSE-PACKAGE-PATH'
  )
on conflict (storage_io_id) do update set
  component_id = excluded.component_id,
  storage_object = excluded.storage_object,
  direction = excluded.direction,
  access_pattern = excluded.access_pattern,
  contract_id = excluded.contract_id;

insert into architecture.component_test (
  test_id,
  component_id,
  test_path,
  test_kind,
  coverage_level,
  required,
  validation_command
)
values
  (
    'TEST-SYS-RUNTIME-CLI-VALIDATION-DVT-CLI-PACKAGE-SMOKE',
    'SYS-RUNTIME-CLI-VALIDATION-DVT-CLI-PACKAGE',
    'packages/@dvt/cli/test/smoke.test.ts',
    'unit',
    'behavior',
    true,
    'pnpm --filter @dvt/cli test'
  ),
  (
    'TEST-SYS-RUNTIME-CLI-VALIDATION-DVT-CLI-PACKAGE-CONTRACTS',
    'SYS-RUNTIME-CLI-VALIDATION-DVT-CLI-PACKAGE',
    'packages/@dvt/cli/validate-contracts.cjs',
    'contract',
    'behavior',
    true,
    'pnpm --filter @dvt/cli validate-contracts'
  ),
  (
    'TEST-SYS-RUNTIME-CLI-VALIDATION-LEGACY-LOOSE-PACKAGE-REFERENCE-SCAN',
    'SYS-RUNTIME-CLI-VALIDATION-LEGACY-LOOSE-PACKAGE',
    'docs/planning/proposals/mandatory/frontend-and-ux/web-physical-module-decomposition-debt-plan-20260508.md',
    'architecture',
    'boundary',
    false,
    'rg -n "packages/cli|validate-contracts.cjs|@dvt/cli"'
  )
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

drop table if exists pg_temp.runtime_cli_validation_leaf_map;
