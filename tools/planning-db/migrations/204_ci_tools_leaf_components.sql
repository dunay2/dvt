-- Split the active tools/ci component into responsibility-owned leaves. The
-- files are live CI governance tooling; no file is deprecated in this slice.

drop table if exists pg_temp.ci_tools_leaf_map;

create temporary table ci_tools_leaf_map (
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
  validation_command text not null,
  port_name text not null,
  negative_tests text[] not null,
  maturity_score numeric not null,
  criticality text not null,
  relation_suffix text not null
);

insert into ci_tools_leaf_map (
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
  validation_command,
  port_name,
  negative_tests,
  maturity_score,
  criticality,
  relation_suffix
)
values
  (
    'SYS-CI-GOVERNANCE-TOOLS-CI-SCOPE-MATRIX',
    'CI scope and matrix tooling',
    'RepositoryChangeScopeReadModel',
    'ClassifyRepositoryChangeScope;EmitCiScope;EmitPackageTestMatrix;EmitWorkspaceMatrix;ResolvePrepushTypecheckScope',
    'Owns CI scope detection, affected workspace/test matrix emission, workflow-scope policy, and prepush typecheck scope routing.',
    'Classify changed repository files into CI scopes and emit the matrices consumed by local and GitHub verification gates.',
    'Changed-scope classification, workflow-scope policy, package matrix, workspace matrix, or prepush typecheck routing changes.',
    'tools/ci/repository-change-scope.mjs',
    'CI scope detection and matrix emission boundary.',
    'responsibility_overload',
    array['repository-change-scope', 'emit-scope', 'emit-test-matrix', 'emit-workspace-matrix', 'prepush-typecheck-scope']::text[],
    array[
      'tools/ci/emit-scope.mjs',
      'tools/ci/emit-scope.test.mjs',
      'tools/ci/emit-test-matrix.mjs',
      'tools/ci/emit-test-matrix.test.mjs',
      'tools/ci/emit-workspace-matrix.mjs',
      'tools/ci/emit-workspace-matrix.test.mjs',
      'tools/ci/package-json-scope-classification.test.mjs',
      'tools/ci/policy/workflow-scope.json',
      'tools/ci/prepush-typecheck-scope.mjs',
      'tools/ci/prepush-typecheck-scope.test.mjs',
      'tools/ci/repository-change-scope.mjs',
      'tools/ci/repository-change-scope.test.mjs',
      'tools/ci/scope-config-git.test.mjs',
      'tools/ci/scope-config.mjs',
      'tools/ci/skip-pretest-if-ci-contract.test.mjs',
      'tools/ci/tsconfig-baseurl-policy.test.mjs',
      'tools/ci/turbo-workspace-task-contract.test.mjs',
      'tools/ci/workflow-scope-classification.test.mjs',
      'tools/ci/workspace-typecheck-contract.test.mjs'
    ]::text[],
    'TEST-SYS-CI-GOVERNANCE-TOOLS-CI-SCOPE-MATRIX',
    'tools/ci/repository-change-scope.test.mjs',
    'unit',
    'behavior',
    'node --test tools/ci/repository-change-scope.test.mjs tools/ci/emit-scope.test.mjs tools/ci/emit-test-matrix.test.mjs tools/ci/emit-workspace-matrix.test.mjs tools/ci/prepush-typecheck-scope.test.mjs',
    'ReadCiScopeMatrix',
    array['unknown changed path', 'workspace scope drift', 'typecheck scope mismatch']::text[],
    82,
    'high',
    'SCOPE-MATRIX'
  ),
  (
    'SYS-CI-GOVERNANCE-TOOLS-CI-PR-QUALITY',
    'CI PR quality and ARC tooling',
    'PrQualityGatePolicy',
    'ValidatePrMetadata;RunPrQualityGate;CheckRunConclusion;ValidateArcEvidenceScope',
    'Owns PR description/size checks, PR triage, check-run guardrails, GitHub collaboration policy, ARC scope checks, hooks policy, and formatting quality checks.',
    'Validate pull request metadata and ARC posture before repository changes enter merge gates.',
    'PR body/title/size, ARC evidence scope, check-run triage, local hook quality, or GitHub collaboration policy changes.',
    'tools/ci/pr-check-triage.mjs',
    'PR quality, ARC scope, and repository collaboration gate boundary.',
    'hidden_authority',
    array['pr-check-triage', 'check-pr-description', 'check-pr-size', 'arc-check', 'check-run-guard']::text[],
    array[
      'tools/ci/arc-check.mjs',
      'tools/ci/arc-policy-state-store.test.mjs',
      'tools/ci/check-pr-description.mjs',
      'tools/ci/check-pr-size.mjs',
      'tools/ci/check-run-guard.mjs',
      'tools/ci/check-run-guard.test.mjs',
      'tools/ci/github-collaboration-governance.test.mjs',
      'tools/ci/pr-check-triage.mjs',
      'tools/ci/pr-check-triage.test.mjs',
      'tools/ci/precommit-hook-wiring.test.mjs',
      'tools/ci/quality-format-config.test.mjs'
    ]::text[],
    'TEST-SYS-CI-GOVERNANCE-TOOLS-CI-PR-QUALITY',
    'tools/ci/pr-check-triage.test.mjs',
    'unit',
    'boundary',
    'node --test tools/ci/pr-check-triage.test.mjs tools/ci/check-run-guard.test.mjs tools/ci/github-collaboration-governance.test.mjs tools/ci/precommit-hook-wiring.test.mjs',
    'ValidatePrQualityGate',
    array['empty PR body', 'oversized PR', 'missing ARC evidence', 'failed required check']::text[],
    82,
    'high',
    'PR-QUALITY'
  ),
  (
    'SYS-CI-GOVERNANCE-TOOLS-CI-ARCHITECTURE-BOUNDARIES',
    'CI architecture and package boundary guards',
    'ArchitectureBoundaryGuard',
    'CheckArchitectureDependencies;ValidatePackageGovernance;RunDeterminismPrecommitGuard;ValidateWorkflowPatternParity',
    'Owns dependency-cruiser policy, architecture dependency checks, package governance checks, determinism guard tests, adapter policy, and workflow parity tests.',
    'Guard architecture, package, adapter, and deterministic-execution boundaries in CI.',
    'Architecture dependency, package governance, adapter policy, deterministic guard, or workflow parity changes.',
    'tools/ci/check-architecture-dependencies.mjs',
    'Architecture, package, adapter, and determinism boundary guard.',
    'boundary_drift',
    array['check-architecture-dependencies', 'dependency-cruiser', 'contracts-package-governance', 'planner-package-governance']::text[],
    array[
      '.dependency-cruiser.cjs',
      'tools/ci/adapter-postgres-import-alias-regression.test.mjs',
      'tools/ci/architecture-dependency-guard.test.mjs',
      'tools/ci/check-architecture-dependencies.mjs',
      'tools/ci/check-determinism.mjs',
      'tools/ci/contracts-compat-schema-parity.test.mjs',
      'tools/ci/contracts-package-governance.test.mjs',
      'tools/ci/planner-package-governance.test.mjs',
      'tools/ci/policy/adapter-postgres-relevance.json',
      'tools/ci/root-test-runner-config.test.mjs',
      'tools/ci/run-determinism-precommit.test.mjs',
      'tools/ci/static-analysis-followup-branch-architecture.test.mjs',
      'tools/ci/test/adapter-postgres-policy.test.mjs',
      'tools/ci/test/path-matcher.test.mjs',
      'tools/ci/validate-policy.js',
      'tools/ci/workflow-pattern-parity.test.mjs'
    ]::text[],
    'TEST-SYS-CI-GOVERNANCE-TOOLS-CI-ARCHITECTURE-BOUNDARIES',
    'tools/ci/architecture-dependency-guard.test.mjs',
    'architecture',
    'boundary',
    'node --test tools/ci/architecture-dependency-guard.test.mjs tools/ci/contracts-package-governance.test.mjs tools/ci/planner-package-governance.test.mjs tools/ci/test/path-matcher.test.mjs',
    'ValidateArchitectureBoundaryGuards',
    array['forbidden dependency edge', 'missing package governance rule', 'adapter policy mismatch']::text[],
    84,
    'critical',
    'ARCHITECTURE-BOUNDARIES'
  ),
  (
    'SYS-CI-GOVERNANCE-TOOLS-CI-DOCS-CANON',
    'CI documentation canon guards',
    'DocsCanonPolicy',
    'ValidateDocsCanon;ValidateGovernanceReviewCanon;ValidateGeneratedDocsPolicy;ValidateStartupCardCanon',
    'Owns documentation, governance review, generated-doc, startup-card, planning truth, and UX canon checks under tools/ci.',
    'Validate canonical documentation posture and governance review consistency in CI.',
    'Documentation canon, generated docs policy, governance review, planning truth, startup-card, or UX canon check changes.',
    'tools/ci/canonization-guard.mjs',
    'Documentation and governance canon validation boundary.',
    'published_language',
    array['canonization-guard', 'doc-check', 'docs-manifest-contract', 'startup-card-canon']::text[],
    array[
      'tools/ci/architecture-doc-reconciliation-canon.test.mjs',
      'tools/ci/architecture-governance-review-canon.test.mjs',
      'tools/ci/autogenerated-pages-canon.test.mjs',
      'tools/ci/canonization-guard.mjs',
      'tools/ci/canonization-guard.test.mjs',
      'tools/ci/canvas-fowler-canon.test.mjs',
      'tools/ci/ci-delivery-governance-canon.test.mjs',
      'tools/ci/ci-retention-review-canon.test.mjs',
      'tools/ci/doc-check.mjs',
      'tools/ci/docs-changed-governance-policy.test.mjs',
      'tools/ci/docs-disposition-canon.test.mjs',
      'tools/ci/docs-frontmatter-bom.test.mjs',
      'tools/ci/docs-manifest-contract.test.mjs',
      'tools/ci/docs-markdown-component-architecture.test.mjs',
      'tools/ci/documentation-usability-canon.test.mjs',
      'tools/ci/generated-docs-single-writer-policy.test.mjs',
      'tools/ci/planning-review-canon.test.mjs',
      'tools/ci/planning-truth-sync.test.mjs',
      'tools/ci/runtime-review-canon.test.mjs',
      'tools/ci/startup-card-canon.test.mjs',
      'tools/ci/sync-docs-status-policy.test.mjs',
      'tools/ci/web-bootstrap-docs.test.mjs',
      'tools/ci/workbench-ux-canon.test.mjs'
    ]::text[],
    'TEST-SYS-CI-GOVERNANCE-TOOLS-CI-DOCS-CANON',
    'tools/ci/canonization-guard.test.mjs',
    'architecture',
    'boundary',
    'node --test tools/ci/canonization-guard.test.mjs tools/ci/docs-manifest-contract.test.mjs tools/ci/planning-truth-sync.test.mjs tools/ci/startup-card-canon.test.mjs',
    'ValidateDocsCanonGuard',
    array['generated doc edited directly', 'missing startup rule', 'stale docs manifest']::text[],
    80,
    'high',
    'DOCS-CANON'
  ),
  (
    'SYS-CI-GOVERNANCE-TOOLS-CI-COMMAND-CATALOG',
    'CI repository command catalog tooling',
    'RepositoryCommandCatalogReadModel',
    'DocumentRepositoryCommandTaxonomy;ReadRepositoryCommandCatalog',
    'Owns the repository command catalog scanner and test.',
    'Extract and validate repository command taxonomy as CI evidence.',
    'Repository command catalog extraction, taxonomy, or command inventory test changes.',
    'tools/ci/repository-command-catalog.mjs',
    'Repository command catalog extraction boundary.',
    'published_language',
    array['repository-command-catalog']::text[],
    array[
      'tools/ci/repository-command-catalog.mjs',
      'tools/ci/repository-command-catalog.test.mjs'
    ]::text[],
    'TEST-SYS-CI-GOVERNANCE-TOOLS-CI-COMMAND-CATALOG',
    'tools/ci/repository-command-catalog.test.mjs',
    'unit',
    'behavior',
    'node --test tools/ci/repository-command-catalog.test.mjs',
    'ReadRepositoryCommandCatalog',
    array['missing package script', 'uncataloged repository command']::text[],
    78,
    'medium',
    'COMMAND-CATALOG'
  ),
  (
    'SYS-CI-GOVERNANCE-TOOLS-CI-HARNESS',
    'CI tool harness and diff utilities',
    'CiToolHarness',
    'RunCiToolTestSuite;InspectGitDiffFiles;ConfigureVitestCiHarness',
    'Owns the CI tool test-suite runner, git diff helper, tools/ci TypeScript config, and root Vitest CI config.',
    'Run tools/ci tests, inspect changed files, and configure CI test execution.',
    'CI tool harness, git diff file inspection, tools/ci JS config, or root Vitest CI configuration changes.',
    'tools/ci/ci-tool-test-suite.mjs',
    'CI tool harness and diff utility boundary.',
    'evolutionary_architecture',
    array['ci-tool-test-suite', 'git-diff-files', 'vitest.config.ts']::text[],
    array[
      'tools/ci/ci-tool-test-suite.mjs',
      'tools/ci/ci-tool-test-suite.test.mjs',
      'tools/ci/git-diff-files.mjs',
      'tools/ci/git-diff-files.test.mjs',
      'tools/ci/jsconfig.json',
      'vitest.config.ts'
    ]::text[],
    'TEST-SYS-CI-GOVERNANCE-TOOLS-CI-HARNESS',
    'tools/ci/ci-tool-test-suite.test.mjs',
    'unit',
    'behavior',
    'node --test tools/ci/ci-tool-test-suite.test.mjs tools/ci/git-diff-files.test.mjs',
    'RunCiToolHarness',
    array['missing test file', 'git diff command failure', 'invalid CI test config']::text[],
    78,
    'medium',
    'HARNESS'
  ),
  (
    'SYS-CI-GOVERNANCE-TOOLS-CI-WEB-HARNESS',
    'CI web native Cypress harness',
    'WebNativeCypressHarness',
    'RunWebCypressNative',
    'Owns the native Cypress web runner wrapper and its test.',
    'Run native Cypress web validation from CI or local verification without mixing it into generic CI tooling.',
    'Native Cypress runner, web harness argument, or web validation process changes.',
    'tools/ci/run-web-cypress-native.mjs',
    'Native Cypress web runner boundary.',
    'boundary_drift',
    array['run-web-cypress-native']::text[],
    array[
      'tools/ci/run-web-cypress-native.mjs',
      'tools/ci/run-web-cypress-native.test.mjs'
    ]::text[],
    'TEST-SYS-CI-GOVERNANCE-TOOLS-CI-WEB-HARNESS',
    'tools/ci/run-web-cypress-native.test.mjs',
    'unit',
    'behavior',
    'node --test tools/ci/run-web-cypress-native.test.mjs',
    'RunWebCypressNative',
    array['missing browser target', 'Cypress process failure']::text[],
    74,
    'medium',
    'WEB-HARNESS'
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
  'PLANNING-DB-CI-TOOLS-LEAF-COMPONENTS-20260619',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'CI tools leaf component mapping',
  'Architecture / Planning DB / CI',
  'review',
  'SYS-CI-GOVERNANCE-TOOLS-CI still owns 79 live tools/ci files directly. The files represent distinct CI responsibilities: scope and matrix routing, PR quality, architecture boundary guards, documentation canon checks, repository command cataloging, CI harness utilities, and native web harness execution. This migration turns the existing component into an aggregate and creates responsibility-owned leaves so Planning DB component profiles can answer files, commands, queries, ports, adapters, contracts, tests, docs, relations, Fowler/DDD basis, and maturity without a side inventory. No tools/ci file is deprecated in this slice because every mapped file is active CI governance tooling.',
  'responsibility_overload',
  'ReadComponentProfile;ValidateComponentIntegrity;ClassifyRepositoryChangeScope;ValidatePrMetadata;CheckArchitectureDependencies;ValidateDocsCanon;ReadRepositoryCommandCatalog;RunCiToolTestSuite;RunWebCypressNative',
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
  'PLANNING-DB-CI-TOOLS-LEAF-COMPONENTS-20260619',
  scope.subject_kind,
  scope.subject_id,
  scope.scope_kind,
  true
from (
  select 'component'::text, 'SYS-CI-GOVERNANCE-TOOLS-CI'::text, 'may_update'::text
  union all
  select 'path', 'tools/ci/**', 'may_update'
  union all
  select 'path', '.dependency-cruiser.cjs', 'may_update'
  union all
  select 'path', 'vitest.config.ts', 'may_update'
  union all
  select 'component', component_id, 'may_create' from ci_tools_leaf_map
  union all
  select 'path', pattern, 'may_update'
  from ci_tools_leaf_map
  cross join lateral unnest(owns) as owned(pattern)
  union all
  select 'test', test_id, 'may_create' from ci_tools_leaf_map
) scope(subject_kind, subject_id, scope_kind)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update planning_query_store.governance_component_local_definitions
set
  source_path = 'tools/planning-db/migrations/204_ci_tools_leaf_components.sql',
  source_content_sha256 = md5('SYS-CI-GOVERNANCE-TOOLS-CI:204')
    || md5('ci-tools-leaf-components-parent:204'),
  children_required = true,
  owned_concern = 'Owns the aggregate CI tools boundary; concrete tools/ci files resolve to responsibility-owned child components.',
  ddd_owner = 'CiToolingGovernance',
  cq_rails = 'ReadCiToolComponentCatalog;ReadComponentProfile;ValidateComponentIntegrity'
where component_id = 'SYS-CI-GOVERNANCE-TOOLS-CI';

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
  'tools/planning-db/migrations/204_ci_tools_leaf_components.sql',
  md5(component_id || ':204') || md5(repo_path || cq_rails || ':ci-tools-leaf'),
  0,
  name,
  'component',
  'SYS-CI-GOVERNANCE-TOOLS-CI',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  false,
  owned_concern,
  ddd_owner,
  cq_rails,
  'codex'
from ci_tools_leaf_map
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
from ci_tools_leaf_map
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
    'SYS-CI-GOVERNANCE-TOOLS-CI',
    'responsibility',
    'Own the aggregate CI tools boundary and delegate concrete tools/ci file ownership to responsibility-owned child components.',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-TOOLS-CI',
    'reason_to_change',
    'CI tooling taxonomy, tools/ci ownership, CI policy grouping, or CI component hierarchy changes.',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-TOOLS-CI',
    'invariant',
    'The aggregate must own no concrete tools/ci files directly once CI tool leaves are applied.',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-TOOLS-CI',
    'non_goal',
    'Do not deprecate active tools/ci files merely to reduce direct-file count; nonfunctional files require explicit deprecation evidence.',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-TOOLS-CI',
    'governance_ref',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
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
  from ci_tools_leaf_map
  union all
  select component_id, 'reason_to_change', reason_to_change, 0
  from ci_tools_leaf_map
  union all
  select
    component_id,
    'invariant',
    'Tracked files claimed by this CI tools leaf must resolve here rather than to SYS-CI-GOVERNANCE-TOOLS-CI.',
    0
  from ci_tools_leaf_map
  union all
  select
    component_id,
    'transition',
    'review -> implemented after component-quality shows SYS-CI-GOVERNANCE-TOOLS-CI owns no direct files and the leaf validation command passes.',
    0
  from ci_tools_leaf_map
  union all
  select component_id, 'consumer', 'CI workflows, local validation, component-profile, component-integrity, and governance coverage readers', 0
  from ci_tools_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md', 0
  from ci_tools_leaf_map
  union all
  select component_id, 'fowler_signal', fowler_signal, 0
  from ci_tools_leaf_map
  union all
  select component_id, 'public_api', api.value, api.item_order - 1
  from ci_tools_leaf_map
  cross join lateral unnest(public_api) with ordinality as api(value, item_order)
) item
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update architecture.component
set
  repo_path = 'tools/ci',
  public_contract = 'Aggregate CI tools boundary; concrete tools/ci files resolve to responsibility-owned child components.',
  maturity_score = greatest(coalesce(maturity_score, 0), 82),
  parent_component_id = 'SYS-CI-GOVERNANCE-ROOT',
  updated_at = now()
where component_id = 'SYS-CI-GOVERNANCE-TOOLS-CI';

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
  'node',
  criticality,
  'review',
  maturity_score,
  'SYS-CI-GOVERNANCE-TOOLS-CI'
from ci_tools_leaf_map
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
from ci_tools_leaf_map
union all
select
  'RESP-SYS-CI-GOVERNANCE-TOOLS-CI',
  'SYS-CI-GOVERNANCE-TOOLS-CI',
  'Own the aggregate CI tools boundary and delegate concrete tools/ci ownership to CI tools leaves.',
  'CI tooling taxonomy, tools/ci ownership, CI policy grouping, or CI component hierarchy changes.',
  'CiToolingGovernance',
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
  'CONTRACT-' || component_id || '-CI-TOOL',
  'type',
  component_id,
  public_contract,
  'internal',
  'implemented',
  validation_command
from ci_tools_leaf_map
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
  'REL-CI-GOVERNANCE-TOOLS-CI-CONTAINS-' || relation_suffix,
  'SYS-CI-GOVERNANCE-TOOLS-CI',
  component_id,
  'contains',
  'outbound',
  'build_time',
  null,
  'Component profile becomes incomplete if this CI tools leaf is removed or remapped without a governed Planning DB component update.',
  'repo-local CI governance',
  jsonb_build_array(
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    repo_path
  ),
  'implemented'
from ci_tools_leaf_map
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
  'query',
  'inbound',
  'CONTRACT-' || component_id || '-CI-TOOL',
  'CONTRACT-' || component_id || '-CI-TOOL',
  negative_tests,
  'implemented'
from ci_tools_leaf_map
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
  test_id,
  component_id,
  test_path,
  test_kind,
  coverage_level,
  true,
  validation_command
from ci_tools_leaf_map
union all
select
  'TEST-SYS-CI-GOVERNANCE-TOOLS-CI-COMPONENT-PROFILE',
  'SYS-CI-GOVERNANCE-TOOLS-CI',
  'scripts/planning-db-query.test.cjs',
  'architecture',
  'boundary',
  true,
  'pnpm planning:db:query component-quality --component SYS-CI-GOVERNANCE-TOOLS-CI --no-refresh --limit 20 && pnpm planning:db:query files --component SYS-CI-GOVERNANCE-TOOLS-CI --no-refresh --limit 20'
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
  'OBS-' || component_id || '-CI-OUTPUT',
  component_id,
  name || ' health is observable through its focused node --test command and the PR changed-slice verification logs.',
  'log',
  true,
  'implemented'
from ci_tools_leaf_map
union all
select
  'OBS-SYS-CI-GOVERNANCE-TOOLS-CI-COMPONENT-QUALITY',
  'SYS-CI-GOVERNANCE-TOOLS-CI',
  'CI tools aggregate health is observable through component-quality and files query output.',
  'log',
  true,
  'implemented'
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;

drop table if exists pg_temp.ci_tools_leaf_map;
