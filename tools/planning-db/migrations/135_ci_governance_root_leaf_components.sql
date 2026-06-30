-- Materialize the missing CI governance scripts parent and split the remaining
-- CI root filesystem surfaces into responsibility-owned leaf components.

drop table if exists pg_temp.ci_governance_root_leaf_map;

create temporary table ci_governance_root_leaf_map (
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
  public_api text[] not null,
  owns text[] not null,
  test_id text not null,
  test_path text not null,
  test_kind text not null,
  coverage_level text not null,
  validation_command text not null
);

insert into ci_governance_root_leaf_map (
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
  public_api,
  owns,
  test_id,
  test_path,
  test_kind,
  coverage_level,
  validation_command
)
values
  (
    'SYS-CI-GOVERNANCE-GITHUB',
    'GitHub workflow and repository collaboration governance',
    'GitHubWorkflowGovernance',
    'RunPrQualityGate;RunChangedSliceVerification;ValidatePrMetadata',
    'Owns GitHub workflows, action wrappers, PR templates, issue templates, labels, CODEOWNERS, and repository collaboration policy files.',
    'Map GitHub-hosted CI, PR, issue, and collaboration automation to one CI governance boundary.',
    'GitHub Actions workflows, PR checks, labels, templates, CODEOWNERS, or repository collaboration policy changes.',
    '.github/workflows/ci.yml',
    'GitHub workflow and collaboration governance boundary',
    'hidden_authority',
    array['.github/workflows/ci.yml', '.github/workflows/pr-quality-gate.yml', '.github/CODEOWNERS']::text[],
    array['.github/**']::text[],
    'TEST-SYS-CI-GOVERNANCE-GITHUB',
    'tools/ci/pr-check-triage.test.mjs',
    'architecture',
    'boundary',
    'node --test tools/ci/pr-check-triage.test.mjs tools/ci/github-collaboration-governance.test.mjs'
  ),
  (
    'SYS-CI-GOVERNANCE-HOOKS',
    'Local Git hook governance',
    'LocalGitHookGovernance',
    'RunPreCommitHook;RunPrePushHook;ValidateCommitMessage',
    'Owns local Git hook scripts that enforce commit, pre-commit, and pre-push repository gates.',
    'Map Husky hook wiring to one explicit CI governance component.',
    'Local hook ordering, commit-message validation, pre-commit, or pre-push behavior changes.',
    '.husky/pre-commit',
    'Local Git hook governance boundary',
    'hidden_authority',
    array['.husky/pre-commit', '.husky/pre-push', '.husky/commit-msg']::text[],
    array['.husky/**']::text[],
    'TEST-SYS-CI-GOVERNANCE-HOOKS',
    'tools/ci/precommit-hook-wiring.test.mjs',
    'architecture',
    'boundary',
    'node --test tools/ci/precommit-hook-wiring.test.mjs'
  ),
  (
    'SYS-CI-GOVERNANCE-TOOLS-CI',
    'CI tool scripts and policy checks',
    'CiToolingGovernance',
    'ClassifyRepositoryChangeScope;CheckArchitectureDependencies;ValidatePrQualityGovernance',
    'Owns tools/ci policy checks, scope detection, PR quality helpers, architecture guards, and CI test harnesses.',
    'Map CI support scripts and tests under tools/ci plus the dependency-cruiser configuration to one tooling component.',
    'CI policy script, scope router, dependency guard, PR-quality helper, or CI harness changes.',
    'tools/ci/check-architecture-dependencies.mjs',
    'CI policy and support tooling boundary',
    'evolutionary_architecture',
    array['tools/ci/check-architecture-dependencies.mjs', 'tools/ci/repository-change-scope.mjs']::text[],
    array['.dependency-cruiser.cjs', 'tools/ci/**']::text[],
    'TEST-SYS-CI-GOVERNANCE-TOOLS-CI',
    'tools/ci/architecture-dependency-guard.test.mjs',
    'architecture',
    'boundary',
    'node --test tools/ci/architecture-dependency-guard.test.mjs tools/ci/repository-change-scope.test.mjs tools/ci/prepush-typecheck-scope.test.mjs'
  ),
  (
    'SYS-CI-GOVERNANCE-TOOLS-DOCS',
    'Documentation CI tool scripts',
    'DocsCiToolingGovernance',
    'ValidateAdrCatalog;ValidateDocsFilenames',
    'Owns TypeScript documentation-check tools used by CI and local docs validation.',
    'Map docs-specific CI tooling under tools/docs to a separate docs validation boundary.',
    'ADR catalog, documentation filename, or TypeScript docs-check tool changes.',
    'tools/docs/check-adr-catalog.ts',
    'Documentation CI tooling boundary',
    'published_language',
    array['tools/docs/check-adr-catalog.ts', 'tools/docs/check-filenames.ts']::text[],
    array['tools/docs/**']::text[],
    'TEST-SYS-CI-GOVERNANCE-TOOLS-DOCS',
    'tools/ci/docs-manifest-contract.test.mjs',
    'architecture',
    'smoke',
    'pnpm docs:canonical:check'
  ),
  (
    'SYS-CI-GOVERNANCE-PACKAGE-TESTS',
    'Repository package test matrix governance',
    'RepositoryTestMatrixGovernance',
    'ValidatePackageMatrixAlignment',
    'Owns repository-level package test matrix alignment checks outside a single package workspace.',
    'Keep cross-package test matrix governance distinct from package-local tests.',
    'Repository test matrix, workspace-package alignment, or cross-package CI test policy changes.',
    'packages/test/matrix-alignment.test.ts',
    'Repository package test matrix governance boundary',
    'boundary_drift',
    array['packages/test/matrix-alignment.test.ts']::text[],
    array['packages/test/**']::text[],
    'TEST-SYS-CI-GOVERNANCE-PACKAGE-TESTS',
    'packages/test/matrix-alignment.test.ts',
    'architecture',
    'boundary',
    'pnpm test -- packages/test/matrix-alignment.test.ts'
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
  'PLANNING-DB-CI-GOVERNANCE-ROOT-LEAF-MAPPING-20260618',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'CI governance root leaf component mapping',
  'Architecture / Planning DB / CI',
  'review',
  'SYS-CI-GOVERNANCE-ROOT still owns GitHub workflows, hooks, tools, and repository-level CI test files directly, while existing script leaves point to a missing parent. This design materializes the scripts parent and splits remaining CI root surfaces by responsibility.',
  'responsibility_overload',
  'CreateGovernanceComponent;RecordArchitectureComponent;RecordArchitectureRelation;RecordArchitectureTestEvidence;ValidateComponentIntegrity',
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
  'PLANNING-DB-CI-GOVERNANCE-ROOT-LEAF-MAPPING-20260618',
  scope.subject_kind,
  scope.subject_id,
  scope.scope_kind,
  true
from (
  select 'component' as subject_kind, 'SYS-CI-GOVERNANCE-ROOT' as subject_id, 'may_update' as scope_kind
  union all
  select 'component', 'SYS-CI-GOVERNANCE-SCRIPTS', 'may_create'
  union all
  select 'path', '.github/**', 'may_update'
  union all
  select 'path', '.husky/**', 'may_update'
  union all
  select 'path', 'tools/ci/**', 'may_update'
  union all
  select 'path', 'tools/docs/**', 'may_update'
  union all
  select 'path', 'packages/test/**', 'may_update'
  union all
  select 'component', component_id, 'may_create' from ci_governance_root_leaf_map
  union all
  select
    'relation',
    'REL-CI-GOVERNANCE-ROOT-CONTAINS-' ||
      replace(component_id, 'SYS-CI-GOVERNANCE-', ''),
    'may_create'
  from ci_governance_root_leaf_map
  union all
  select 'test', test_id, 'may_create' from ci_governance_root_leaf_map
) scope
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
  'SYS-CI-GOVERNANCE-SCRIPTS',
  'planning_query_store.governance_component_local_definitions',
  'd75f14f0827e2db4ac68c57b4b68b7d6d3a75c84c00a5d20ba09c64690382d62',
  0,
  'Repository governance automation scripts',
  'component',
  'SYS-CI-GOVERNANCE-ROOT',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  true,
  'Owns the composite repository automation script boundary and delegates concrete script files to script leaf components.',
  'RepositoryAutomationScriptCatalog',
  'RunAgentPreflight;GenerateGovernanceFileComponentIndex;PreparePlanningDbForCiGate;ReadComponentProfile',
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
  'planning_query_store.governance_component_local_definitions',
  'fd2b6f9e4184a0f5a89f7dcad80d2ab28a74f6cb6ed95f93fd2a0ca3161f5d5a',
  0,
  name,
  'component',
  'SYS-CI-GOVERNANCE-ROOT',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  false,
  owned_concern,
  ddd_owner,
  cq_rails,
  'codex'
from ci_governance_root_leaf_map
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
from ci_governance_root_leaf_map
cross join lateral unnest(owns) with ordinality as own(pattern, pattern_order)
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
    'SYS-CI-GOVERNANCE-SCRIPTS',
    'responsibility',
    'Group repository automation script leaves under one materialized parent so script components resolve in the unit tree.',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS',
    'reason_to_change',
    'Repository automation script taxonomy, Planning DB script leaf ownership, or script component hierarchy changes.',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS',
    'public_api',
    'Repository automation script component catalog',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS',
    'invariant',
    'All SYS-CI-GOVERNANCE-SCRIPTS-* children must resolve through this parent and must not be left with unresolved_parent drift.',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS',
    'transition',
    'review -> implemented after component-quality shows no unresolved_parent findings for SYS-CI-GOVERNANCE-SCRIPTS children.',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS',
    'consumer',
    'component-profile, component-quality, and component-integrity CI governance readers',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS',
    'governance_ref',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS',
    'fowler_signal',
    'hidden_authority',
    0
  )
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
  from ci_governance_root_leaf_map
  union all
  select component_id, 'reason_to_change', reason_to_change, 0
  from ci_governance_root_leaf_map
  union all
  select
    component_id,
    'invariant',
    'Tracked files claimed by this CI governance component must resolve to the leaf in component_engineering_file_ownership_query.',
    0
  from ci_governance_root_leaf_map
  union all
  select
    component_id,
    'transition',
    'review -> implemented after component-quality shows no direct files owned by SYS-CI-GOVERNANCE-ROOT for this responsibility.',
    0
  from ci_governance_root_leaf_map
  union all
  select
    component_id,
    'consumer',
    'CI workflows, local validation, component-profile, and component-integrity readers',
    0
  from ci_governance_root_leaf_map
  union all
  select
    component_id,
    'governance_ref',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    0
  from ci_governance_root_leaf_map
  union all
  select component_id, 'fowler_signal', fowler_signal, 0
  from ci_governance_root_leaf_map
  union all
  select component_id, 'public_api', api.value, api.item_order - 1
  from ci_governance_root_leaf_map
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
values
  (
    'SYS-CI-GOVERNANCE-ROOT',
    'CI and automation root component',
    'module',
    'infra',
    'Architecture / CI',
    '.github/workflows/ci.yml',
    'Composite CI governance boundary for workflows, hooks, tools, scripts, and repository automation.',
    'node',
    'high',
    'review',
    null
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS',
    'Repository governance automation scripts',
    'module',
    'infra',
    'RepositoryAutomationScriptCatalog',
    'scripts/governance-refresh.cjs',
    'Composite repository automation script boundary with leaf-owned concrete script responsibilities.',
    'node',
    'high',
    'review',
    'SYS-CI-GOVERNANCE-ROOT'
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
  'module',
  'infra',
  ddd_owner,
  repo_path,
  public_contract,
  'node',
  'medium',
  'review',
  'SYS-CI-GOVERNANCE-ROOT'
from ci_governance_root_leaf_map
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
from ci_governance_root_leaf_map
union all
select
  'RESP-SYS-CI-GOVERNANCE-ROOT',
  'SYS-CI-GOVERNANCE-ROOT',
  'Own the composite CI governance boundary and delegate concrete filesystem ownership to CI governance child components.',
  'CI topology, workflow, hook, tooling, or Planning DB component-map changes.',
  'CiGovernanceRoot',
  'implemented'
union all
select
  'RESP-SYS-CI-GOVERNANCE-SCRIPTS',
  'SYS-CI-GOVERNANCE-SCRIPTS',
  'Own the composite repository automation script boundary and keep script leaf components connected to the unit tree.',
  'Repository automation script taxonomy, Planning DB script leaf ownership, or script component hierarchy changes.',
  'RepositoryAutomationScriptCatalog',
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
  relation_id,
  source_component_id,
  target_component_id,
  'contains',
  'outbound',
  'build_time',
  null,
  'Component profile becomes incomplete if this child is removed or remapped without a governed Planning DB component update.',
  'repo-local CI governance',
  source_refs,
  'implemented'
from (
  select
    'REL-CI-GOVERNANCE-ROOT-CONTAINS-SCRIPTS' as relation_id,
    'SYS-CI-GOVERNANCE-ROOT' as source_component_id,
    'SYS-CI-GOVERNANCE-SCRIPTS' as target_component_id,
    jsonb_build_array(
      'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
      'scripts/governance-refresh.cjs'
    ) as source_refs
  union all
  select
    'REL-CI-GOVERNANCE-ROOT-CONTAINS-' ||
      replace(component_id, 'SYS-CI-GOVERNANCE-', ''),
    'SYS-CI-GOVERNANCE-ROOT',
    component_id,
    jsonb_build_array(
      'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
      repo_path
    )
  from ci_governance_root_leaf_map
) relation
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
  test_kind,
  coverage_level,
  true,
  validation_command
from ci_governance_root_leaf_map
union all
select
  'TEST-SYS-CI-GOVERNANCE-ROOT-COMPONENT-PROFILE',
  'SYS-CI-GOVERNANCE-ROOT',
  'scripts/planning-db-query.test.cjs',
  'architecture',
  'boundary',
  true,
  'pnpm planning:db:query component-profile --component SYS-CI-GOVERNANCE-ROOT --no-refresh --limit 80 && pnpm planning:db:query component-integrity --component SYS-CI-GOVERNANCE-ROOT --no-refresh --limit 80'
union all
select
  'TEST-SYS-CI-GOVERNANCE-SCRIPTS-COMPONENT-PROFILE',
  'SYS-CI-GOVERNANCE-SCRIPTS',
  'scripts/planning-db-query.test.cjs',
  'architecture',
  'boundary',
  true,
  'pnpm planning:db:query component-profile --component SYS-CI-GOVERNANCE-SCRIPTS --no-refresh --limit 80 && pnpm planning:db:query component-drift --component SYS-CI-GOVERNANCE-SCRIPTS-GOVERNANCE-INDEXES --no-refresh --limit 80'
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

drop table if exists pg_temp.ci_governance_root_leaf_map;
