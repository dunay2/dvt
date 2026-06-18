-- Split SYS-REPO-METADATA-ROOT into explicit leaf components. Old,
-- historical, or nonfunctional tracked files stay queryable as legacy /
-- deprecated components instead of being hidden inside the root bucket.

drop table if exists pg_temp.repo_metadata_root_leaf_map;

create temporary table repo_metadata_root_leaf_map (
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
  local_status text not null,
  architecture_status text not null,
  criticality text not null,
  lifecycle_note text not null,
  test_id text not null,
  validation_command text not null
);

insert into repo_metadata_root_leaf_map (
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
  local_status,
  architecture_status,
  criticality,
  lifecycle_note,
  test_id,
  validation_command
)
values
  (
    'SYS-REPO-METADATA-ARC-POLICY',
    'Repository ARC policy metadata',
    'ArcPolicyGovernance',
    'ValidateArcPolicy;ValidateArcEvidence',
    'Owns the repository ARC policy file that routes contract, adapter, engine, and planner changes to evidence and risk requirements.',
    'Keep the ARC policy file as a first-class governance component instead of an untyped repository root file.',
    'ARC trigger globs, evidence requirements, risk requirements, or PR quality policy change.',
    '.arc-policy.yaml',
    'Repository ARC policy governance boundary',
    'hidden_authority',
    array['.arc-policy.yaml', 'tools/ci/arc-check.mjs']::text[],
    array['.arc-policy.yaml']::text[],
    'review',
    'review',
    'high',
    'active: ARC policy is functional governance and must not be deprecated while CI consumes it.',
    'TEST-SYS-REPO-METADATA-ARC-POLICY',
    'GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs'
  ),
  (
    'SYS-REPO-METADATA-FOWLER-INBOX',
    'Fowler analysis intake inbox',
    'FowlerAnalysisIntakeCatalog',
    'ReadFowlerAnalysisIntake;ValidateComponentIntegrity',
    'Owns buzon analysis documents used as local intake and architecture review source material before canonical promotion.',
    'Keep Fowler and architecture analysis intake visible as a governed source category, distinct from active docs and runtime components.',
    'Fowler review intake, product analysis, component remediation notes, or intake lifecycle changes.',
    'buzon/',
    'Fowler analysis intake boundary',
    'published_language',
    array['buzon/pretest-inventory-db.md']::text[],
    array['buzon/**']::text[],
    'review',
    'review',
    'medium',
    'active: intake is not canonical documentation, but it is still a governed source for analysis and QA traceability.',
    'TEST-SYS-REPO-METADATA-FOWLER-INBOX',
    'pnpm planning:db:query component-profile --component SYS-REPO-METADATA-FOWLER-INBOX --no-refresh --limit 80'
  ),
  (
    'SYS-REPO-METADATA-CANARY-ARTIFACTS',
    'Repository canary artifacts',
    'RepositoryCanaryArtifactCatalog',
    'ReadRepositoryCanaryArtifacts;DetectGovernedSourceDrift',
    'Owns tracked canary artifacts that provide repository-level operational evidence outside package-local ownership.',
    'Separate canary evidence files from root metadata so operational artifacts remain queryable without becoming active runtime code.',
    'Canary artifact shape, retention, source proof, or operational evidence path changes.',
    'artifacts/canary/g5-canary-trigger.sql',
    'Repository canary artifact boundary',
    'published_language',
    array['artifacts/canary/g5-canary-trigger.sql']::text[],
    array['artifacts/canary/**']::text[],
    'review',
    'review',
    'medium',
    'active: canary artifacts are tracked evidence and stay mapped while present in the filesystem.',
    'TEST-SYS-REPO-METADATA-CANARY-ARTIFACTS',
    'pnpm planning:db:query component-profile --component SYS-REPO-METADATA-CANARY-ARTIFACTS --no-refresh --limit 80'
  ),
  (
    'SYS-REPO-METADATA-ROOT-TOOLCHAIN-CONFIG',
    'Repository root toolchain configuration',
    'RepositoryToolchainConfiguration',
    'ValidateRepositoryToolchain;RunChangedSliceVerification;ValidateCommitMessage',
    'Owns root-level package, TypeScript, lint, formatting, workspace, release, and editor configuration files.',
    'Keep repository toolchain configuration distinct from product components and CI workflow implementation.',
    'Workspace scripts, package manager config, linting, formatting, TypeScript, release, editor, or local dev toolchain changes.',
    'package.json',
    'Repository toolchain configuration boundary',
    'hidden_authority',
    array['package.json', 'pnpm-workspace.yaml', 'turbo.json', 'tsconfig.json']::text[],
    array[
      'commitlint.config.cjs',
      'dev.sh',
      '.editorconfig',
      'eslint.config.cjs',
      '.gitattributes',
      '.gitignore',
      '.gitmessage',
      '.markdownlint-cli2.jsonc',
      '.markdownlintignore',
      '.markdownlint.json',
      'nixpacks.toml',
      '.node-version',
      '.npmrc',
      '.nvmrc',
      'package.json',
      'pnpm-lock.yaml',
      'pnpm-workspace.yaml',
      '.prettierignore',
      '.prettierrc.json',
      'tsconfig.eslint.base.json',
      'tsconfig.eslint.json',
      'tsconfig.json',
      'tsconfig.node-runtime.base.json',
      'tsconfig.package-bundler.base.json',
      'tsconfig.test.json',
      'turbo.json',
      '.versionrc.json',
      '.vscode/**',
      'zensical.yml'
    ]::text[],
    'review',
    'review',
    'high',
    'active: toolchain config is functional repository infrastructure and must be leaf-owned.',
    'TEST-SYS-REPO-METADATA-ROOT-TOOLCHAIN-CONFIG',
    'pnpm verify:changed && pnpm verify:prepush'
  ),
  (
    'SYS-REPO-METADATA-AGENT-LOCAL-CONFIG',
    'Agent local configuration archive',
    'AgentLocalConfigurationArchive',
    'ReadRepositoryMetadataLifecycle;DetectGovernedSourceDrift',
    'Owns tracked agent-local configuration files that should not be treated as product runtime behavior.',
    'Make agent-local configuration visible as legacy metadata so it can be retired deliberately if it stops serving a governed purpose.',
    'Agent-local settings, local automation compatibility, or repository metadata lifecycle changes.',
    '.claude/settings.local.json',
    'Agent local configuration metadata boundary',
    'boundary_drift',
    array['.claude/settings.local.json']::text[],
    array['.claude/**']::text[],
    'legacy',
    'deprecated',
    'low',
    'deprecated: tracked local agent settings are not product functionality; keep only as explicit legacy metadata until removed by a governed cleanup.',
    'TEST-SYS-REPO-METADATA-AGENT-LOCAL-CONFIG',
    'pnpm planning:db:query component-profile --component SYS-REPO-METADATA-AGENT-LOCAL-CONFIG --no-refresh --limit 80'
  ),
  (
    'SYS-REPO-METADATA-GITHUB-COMMENT-ARCHIVE',
    'GitHub comment archive',
    'GitHubCommentArchive',
    'ReadRepositoryMetadataLifecycle;DetectGovernedSourceDrift',
    'Owns historical PR comment snapshots that are tracked for reference but are not active GitHub workflow behavior.',
    'Deprecate historical PR comment notes as archive metadata instead of leaving them as active repository root ownership.',
    'Historical PR comment reference, review evidence migration, or archive cleanup changes.',
    '.gh-comments/',
    'Historical GitHub comment archive boundary',
    'boundary_drift',
    array['.gh-comments/pr-117.md']::text[],
    array['.gh-comments/**']::text[],
    'legacy',
    'deprecated',
    'low',
    'deprecated: PR comment snapshots are historical reference files and must not be mistaken for active CI or GitHub adapter behavior.',
    'TEST-SYS-REPO-METADATA-GITHUB-COMMENT-ARCHIVE',
    'pnpm planning:db:query component-profile --component SYS-REPO-METADATA-GITHUB-COMMENT-ARCHIVE --no-refresh --limit 80'
  ),
  (
    'SYS-REPO-METADATA-GIT-HISTORY-REWRITE-ARCHIVE',
    'Git history rewrite archive',
    'GitHistoryRewriteArchive',
    'ReadRepositoryMetadataLifecycle;DetectGovernedSourceDrift',
    'Owns BFG history rewrite reports retained only as repository history evidence.',
    'Deprecate BFG reports as historical metadata so they do not masquerade as functional repository automation.',
    'Repository history cleanup, sensitive-data remediation evidence, or archive retention changes.',
    '.git.bfg-report/',
    'Git history rewrite evidence archive boundary',
    'boundary_drift',
    array['.git.bfg-report/2026-02-19/14-48-28/cache-stats.txt']::text[],
    array['.git.bfg-report/**']::text[],
    'legacy',
    'deprecated',
    'low',
    'deprecated: BFG reports are retained evidence, not functional system files.',
    'TEST-SYS-REPO-METADATA-GIT-HISTORY-REWRITE-ARCHIVE',
    'pnpm planning:db:query component-profile --component SYS-REPO-METADATA-GIT-HISTORY-REWRITE-ARCHIVE --no-refresh --limit 80'
  ),
  (
    'SYS-REPO-METADATA-GOLDEN-SNAPSHOT-BASELINE',
    'Golden snapshot baseline metadata',
    'GoldenSnapshotBaselineCatalog',
    'ValidateGoldenSnapshotBaseline;DetectGovernedSourceDrift',
    'Owns golden baseline hashes and explanatory metadata used to compare repository-generated state.',
    'Keep golden baseline files as a separate validation component from root toolchain config.',
    'Golden hash, baseline generation, repository snapshot comparison, or deterministic evidence changes.',
    '.golden/hashes.json',
    'Golden snapshot baseline boundary',
    'published_language',
    array['.golden/hashes.json', '.golden/README.md']::text[],
    array['.golden/**']::text[],
    'review',
    'review',
    'medium',
    'active: golden baselines are validation metadata and stay leaf-owned while tracked.',
    'TEST-SYS-REPO-METADATA-GOLDEN-SNAPSHOT-BASELINE',
    'pnpm planning:db:query component-profile --component SYS-REPO-METADATA-GOLDEN-SNAPSHOT-BASELINE --no-refresh --limit 80'
  ),
  (
    'SYS-REPO-METADATA-INFRA-DB-MIGRATIONS',
    'Infrastructure database migration archive',
    'InfrastructureDatabaseMigrationCatalog',
    'ValidateInfrastructureDatabaseMigrations;DetectGovernedSourceDrift',
    'Owns infrastructure SQL migrations outside the canonical Planning DB migration rail.',
    'Separate historical infrastructure database migrations from Planning DB migrations and runtime packages.',
    'Infrastructure DB schema, artifact store SQL, start-run intent SQL, or database bootstrap ownership changes.',
    'infra/db/migrations/',
    'Infrastructure database migration boundary',
    'published_language',
    array['infra/db/migrations/2026-03-04_g3_start_run_intent.sql']::text[],
    array['infra/db/migrations/**']::text[],
    'review',
    'review',
    'medium',
    'active: infra DB migration files are tracked system artifacts and must remain queryable by component.',
    'TEST-SYS-REPO-METADATA-INFRA-DB-MIGRATIONS',
    'pnpm planning:db:query component-profile --component SYS-REPO-METADATA-INFRA-DB-MIGRATIONS --no-refresh --limit 80'
  ),
  (
    'SYS-REPO-METADATA-INFRA-POSTGRES-DOCKER',
    'Postgres and Redpanda infrastructure prototype',
    'PostgresRedpandaInfrastructurePrototype',
    'ReadInfrastructurePrototype;DetectArchitectureDrift',
    'Owns Docker, bootstrap SQL, Redpanda migration, and embedded ADR material for the infra Postgres prototype surface.',
    'Keep infra/docker/postgres grouped as an infrastructure prototype boundary rather than root metadata.',
    'Postgres bootstrap, Redpanda prototype, Docker topology, or embedded infra ADR changes.',
    'infra/docker/postgres/docker-compose.yml',
    'Postgres and Redpanda infrastructure prototype boundary',
    'evolutionary_architecture',
    array['infra/docker/postgres/docker-compose.yml', 'infra/docker/postgres/init/001_bootstrap.sql']::text[],
    array['infra/docker/postgres/**']::text[],
    'review',
    'review',
    'medium',
    'active: infrastructure prototype files are still tracked and must be visible until explicitly retired.',
    'TEST-SYS-REPO-METADATA-INFRA-POSTGRES-DOCKER',
    'pnpm planning:db:query component-profile --component SYS-REPO-METADATA-INFRA-POSTGRES-DOCKER --no-refresh --limit 80'
  ),
  (
    'SYS-REPO-METADATA-PLANNING-DB-INFRA',
    'Planning DB local infrastructure',
    'PlanningDbLocalInfrastructure',
    'RunPlanningDbInfrastructure;ValidateComponentIntegrity',
    'Owns local infrastructure files used to run the Planning DB outside the query and operate rails.',
    'Map Planning DB docker infrastructure separately from Planning DB schema, scripts, and migrations.',
    'Planning DB container topology, local DB service wiring, or Planning DB infrastructure bootstrap changes.',
    'infra/planning-db/docker-compose.yml',
    'Planning DB local infrastructure boundary',
    'hidden_authority',
    array['infra/planning-db/docker-compose.yml']::text[],
    array['infra/planning-db/**']::text[],
    'review',
    'review',
    'high',
    'active: Planning DB infrastructure is functional support for the governed database.',
    'TEST-SYS-REPO-METADATA-PLANNING-DB-INFRA',
    'pnpm planning:db:integrity:check'
  ),
  (
    'SYS-REPO-METADATA-LEGACY-PROTOTYPE-INFRA',
    'Legacy infrastructure API prototype',
    'LegacyInfrastructureApiPrototype',
    'ReadRepositoryMetadataLifecycle;DetectArchitectureDrift',
    'Owns the infra/prototypes API proof-of-concept files as deprecated reference material, not as active product API implementation.',
    'Deprecate the old prototype boundary explicitly so duplicate API/runtime concepts do not appear active in component queries.',
    'Prototype retirement, reference extraction, or migration of still-useful behavior into canonical packages.',
    'infra/prototypes/api/README.md',
    'Legacy infrastructure API prototype boundary',
    'boundary_drift',
    array['infra/prototypes/api/README.md', 'infra/prototypes/api/src/server.ts']::text[],
    array['infra/prototypes/**']::text[],
    'legacy',
    'deprecated',
    'low',
    'deprecated: prototype API files are reference material and must not be treated as active product API rails.',
    'TEST-SYS-REPO-METADATA-LEGACY-PROTOTYPE-INFRA',
    'pnpm planning:db:query component-profile --component SYS-REPO-METADATA-LEGACY-PROTOTYPE-INFRA --no-refresh --limit 80'
  ),
  (
    'SYS-REPO-METADATA-INFRA-ENTRYPOINTS',
    'Infrastructure documentation entrypoints',
    'InfrastructureDocumentationEntrypoint',
    'ReadInfrastructureDocumentation;DetectGovernedSourceDrift',
    'Owns root infrastructure README and infrastructure-level navigation files outside canonical docs.',
    'Keep infra entrypoints mapped while preserving the distinction between canonical docs and local infrastructure notes.',
    'Infrastructure entrypoint, local infra README, or infra documentation placement changes.',
    'infra/README.md',
    'Infrastructure documentation entrypoint boundary',
    'published_language',
    array['infra/README.md']::text[],
    array['infra/README.md']::text[],
    'review',
    'review',
    'medium',
    'active: infra README is local infrastructure documentation and remains mapped to its own component.',
    'TEST-SYS-REPO-METADATA-INFRA-ENTRYPOINTS',
    'pnpm planning:db:query component-profile --component SYS-REPO-METADATA-INFRA-ENTRYPOINTS --no-refresh --limit 80'
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
  'PLANNING-DB-REPO-METADATA-ROOT-LEAF-MAPPING-20260618',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Repository metadata root leaf component mapping',
  'Architecture / Planning DB / Repository Metadata',
  'review',
  'SYS-REPO-METADATA-ROOT directly owned ARC policy, root toolchain config, Fowler intake, infrastructure artifacts, prototypes, and historical archives. This design splits real responsibilities into leaf components and deprecates old or nonfunctional tracked files explicitly.',
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
  'PLANNING-DB-REPO-METADATA-ROOT-LEAF-MAPPING-20260618',
  scope.subject_kind,
  scope.subject_id,
  scope.scope_kind,
  true
from (
  select 'component' as subject_kind, 'SYS-REPO-METADATA-ROOT' as subject_id, 'may_update' as scope_kind
  union all
  select 'component', component_id, 'may_create' from repo_metadata_root_leaf_map
  union all
  select 'relation', 'REL-REPO-METADATA-ROOT-CONTAINS-' ||
    replace(component_id, 'SYS-REPO-METADATA-', ''), 'may_create'
  from repo_metadata_root_leaf_map
  union all
  select 'test', test_id, 'may_create' from repo_metadata_root_leaf_map
  union all
  select 'path', own.pattern, 'may_update'
  from repo_metadata_root_leaf_map
  cross join lateral unnest(owns) as own(pattern)
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
select
  component_id,
  'planning_query_store.governance_component_local_definitions',
  '1381381381381381381381381381381381381381381381381381381381381381',
  0,
  name,
  'component',
  'SYS-REPO-METADATA-ROOT',
  'SYS-DVT',
  'SYS-DVT',
  local_status,
  false,
  owned_concern,
  ddd_owner,
  cq_rails,
  'codex'
from repo_metadata_root_leaf_map
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
from repo_metadata_root_leaf_map
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
  from repo_metadata_root_leaf_map
  union all
  select component_id, 'reason_to_change', reason_to_change, 0
  from repo_metadata_root_leaf_map
  union all
  select
    component_id,
    'invariant',
    'Tracked files claimed by this repository metadata component must not fall through to SYS-REPO-METADATA-ROOT.',
    0
  from repo_metadata_root_leaf_map
  union all
  select
    component_id,
    'transition',
    'review or legacy -> implemented/deprecated after component-quality shows no direct files owned by SYS-REPO-METADATA-ROOT.',
    0
  from repo_metadata_root_leaf_map
  union all
  select
    component_id,
    'consumer',
    'Planning DB component queries, repository governance checks, and architecture QA review',
    0
  from repo_metadata_root_leaf_map
  union all
  select
    component_id,
    'governance_ref',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    0
  from repo_metadata_root_leaf_map
  union all
  select component_id, 'fowler_signal', fowler_signal, 0
  from repo_metadata_root_leaf_map
  union all
  select component_id, 'invariant', lifecycle_note, 1
  from repo_metadata_root_leaf_map
  union all
  select component_id, 'public_api', api.value, api.item_order - 1
  from repo_metadata_root_leaf_map
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
  'SYS-REPO-METADATA-ROOT',
  'Repository metadata root component',
  'module',
  'infra',
  'Architecture / Repository Metadata',
  'package.json',
  'Composite repository metadata boundary with leaf-owned concrete files.',
  'none',
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
  'module',
  'infra',
  ddd_owner,
  repo_path,
  public_contract,
  'none',
  criticality,
  architecture_status,
  'SYS-REPO-METADATA-ROOT'
from repo_metadata_root_leaf_map
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
from repo_metadata_root_leaf_map
union all
select
  'RESP-SYS-REPO-METADATA-ROOT',
  'SYS-REPO-METADATA-ROOT',
  'Own the composite repository metadata boundary and delegate concrete filesystem ownership to repository metadata child components.',
  'Repository metadata topology, deprecation policy, root config, infrastructure metadata, or Planning DB component-map changes.',
  'RepositoryMetadataRoot',
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
  'REL-REPO-METADATA-ROOT-CONTAINS-' ||
    replace(component_id, 'SYS-REPO-METADATA-', ''),
  'SYS-REPO-METADATA-ROOT',
  component_id,
  'contains',
  'outbound',
  'build_time',
  null,
  'Component profile becomes incomplete if this repository metadata child is remapped without a governed Planning DB component update.',
  'repo-local repository metadata governance',
  jsonb_build_array(
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    repo_path
  ),
  'implemented'
from repo_metadata_root_leaf_map
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
  'scripts/planning-db-query.test.cjs',
  'architecture',
  'boundary',
  true,
  validation_command
from repo_metadata_root_leaf_map
union all
select
  'TEST-SYS-REPO-METADATA-ROOT-COMPONENT-PROFILE',
  'SYS-REPO-METADATA-ROOT',
  'scripts/planning-db-query.test.cjs',
  'architecture',
  'boundary',
  true,
  'pnpm planning:db:query component-profile --component SYS-REPO-METADATA-ROOT --no-refresh --limit 120 && pnpm planning:db:query component-drift --component SYS-REPO-METADATA-ROOT --no-refresh --limit 80'
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

drop table if exists pg_temp.repo_metadata_root_leaf_map;
