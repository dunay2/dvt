-- Split the broad CI docs generation script bucket into semantic leaves and
-- move the active snapshot backfill script to the runtime state-store map.
-- Old or nonfunctional paths must be deprecated explicitly; this slice found
-- rebuild-snapshots.js active through package.json, so it is remapped instead
-- of deprecated.

drop table if exists pg_temp.ci_docs_generation_leaf_map;

create temporary table ci_docs_generation_leaf_map (
  component_id text primary key,
  parent_id text not null,
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
  ports text[] not null,
  storage_reads text[] not null,
  storage_writes text[] not null,
  owns text[] not null,
  test_id text not null,
  test_path text not null,
  test_kind text not null,
  coverage_level text not null,
  validation_command text not null
);

insert into ci_docs_generation_leaf_map (
  component_id,
  parent_id,
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
  ports,
  storage_reads,
  storage_writes,
  owns,
  test_id,
  test_path,
  test_kind,
  coverage_level,
  validation_command
)
values
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-STATUS-REPORTS',
    'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION',
    'CI generated status and capability reports',
    'review',
    'review',
    'GeneratedStatusReportPolicy',
    'ExtractGeneratedDocsSurface;ValidateGeneratedDocsArtifact',
    'Owns generated code status and capability coverage report builders.',
    'Render repository code-status and capability-coverage documentation from tracked source facts.',
    'Code status, generated status doc policy, capability coverage, or report shape changes.',
    'Status report generators must write through generated-doc policy and must not own Planning DB query semantics.',
    'review -> implemented after report helper duplication is either extracted or explicitly accepted with tests.',
    'docs:status:generate, docs:capability:generate, ci:docs, verify:prepush',
    'scripts/generate-code-status.cjs',
    'module',
    'infra',
    'medium',
    54,
    'Generated status and capability report CLI surfaces.',
    'node',
    'responsibility_overload',
    array['docs:status:generate', 'docs:capability:generate']::text[],
    array['ExtractGeneratedDocsSurface', 'ValidateGeneratedDocsArtifact']::text[],
    array[
      'apps/**',
      'packages/**',
      'docs/generated-docs-policy.json'
    ]::text[],
    array[
      'docs/planning/status/generated-code-state.md',
      'docs/planning/status/generated-capability-coverage.md'
    ]::text[],
    array[
      'scripts/generate-code-status.cjs',
      'scripts/generate-code-status.test.cjs',
      'scripts/generate-capability-coverage.cjs'
    ]::text[],
    'TEST-SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-STATUS-REPORTS',
    'scripts/generate-code-status.test.cjs',
    'unit',
    'behavior',
    'node --test scripts/generate-code-status.test.cjs && pnpm docs:capability:check'
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-DB-SURFACE',
    'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION',
    'CI generated DB surface inventory',
    'review',
    'review',
    'DbGovernanceSurfaceInventory',
    'GenerateDbSurfaceInventory;ReadDbGovernanceSurface',
    'Owns the generated DB surface inventory renderer and check adapter.',
    'Render Planning DB surface inventory documentation from DB-owned surface rows.',
    'DB surface schema, operate/query rail inventory, generated DB surface output, or check behavior changes.',
    'The generated DB surface inventory must read Planning DB rows and must not become a side inventory.',
    'review -> implemented after db-surface inventory checks and component profile validation pass.',
    'docs:db-surface-inventory:generate, docs:db-surface-inventory:check, ci:docs',
    'scripts/generate-db-surface-inventory.cjs',
    'module',
    'infra',
    'medium',
    64,
    'DB surface inventory generation and check command.',
    'node',
    'hidden_authority',
    array['docs:db-surface-inventory:generate', 'docs:db-surface-inventory:check']::text[],
    array['GenerateDbSurfaceInventory', 'ReadDbGovernanceSurface']::text[],
    array[
      'planning_query_store.db_governance_surface_query',
      'docs/generated-docs-policy.json'
    ]::text[],
    array['docs/planning/status/generated-db-surface-inventory.md']::text[],
    array[
      'scripts/generate-db-surface-inventory.cjs',
      'scripts/generate-db-surface-inventory.test.cjs'
    ]::text[],
    'TEST-SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-DB-SURFACE',
    'scripts/generate-db-surface-inventory.test.cjs',
    'unit',
    'behavior',
    'node --test scripts/generate-db-surface-inventory.test.cjs && pnpm docs:db-surface-inventory:check'
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-SPEC-TRACEABILITY',
    'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION',
    'CI generated spec traceability report',
    'review',
    'review',
    'SpecTraceabilityReportReadModel',
    'ApplyAdr0TraceabilityGate;CheckAdr0TraceabilityRegression',
    'Owns the generated spec traceability report renderer.',
    'Render ADR/spec traceability documentation from repository source references.',
    'ADR-0000 traceability report, source-reference extraction, Markdown link parsing, or generated traceability output changes.',
    'Traceability report generation must remain ADR-0000 governed and must not silently accept missing source links.',
    'review -> implemented after ADR0 report generation gains focused test evidence or explicit architecture validation.',
    'ADR-0000 traceability checks, generated-docs policy, ci:docs',
    'scripts/generate-spec-traceability-report.cjs',
    'module',
    'infra',
    'medium',
    46,
    'Spec traceability report generator for ADR/source reference evidence.',
    'node',
    'documentation_drift',
    array['node scripts/generate-spec-traceability-report.cjs']::text[],
    array['ApplyAdr0TraceabilityGate', 'CheckAdr0TraceabilityRegression']::text[],
    array[
      'docs/**',
      'specs/**',
      'docs/generated-docs-policy.json'
    ]::text[],
    array['docs/planning/status/spec-traceability-report.md']::text[],
    array['scripts/generate-spec-traceability-report.cjs']::text[],
    'TEST-SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-SPEC-TRACEABILITY',
    'scripts/planning-db-query.test.cjs',
    'architecture',
    'boundary',
    'pnpm planning:db:query component-profile --component SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-SPEC-TRACEABILITY --no-refresh --limit 80'
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-CONTRACT-INDEX',
    'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION',
    'CI generated contract index',
    'review',
    'review',
    'ContractIndexGenerationPolicy',
    'ApplyContractsWorkflowCredentialPosture;CheckContractsWorkflowCredentialPosture',
    'Owns the contract index generator for specs/contracts README output.',
    'Render the contract index from governed contract source files.',
    'Contract catalog shape, contract source discovery, specs/contracts README generation, or contract index check changes.',
    'Contract index generation must follow contract governance and must not become an alternate contract registry.',
    'review -> implemented after contract-index generator gains focused test evidence or contract CI validates it.',
    'contracts:index:generate, contracts:index:check, validate:contracts',
    'scripts/generate-contract-index.cjs',
    'module',
    'infra',
    'medium',
    48,
    'Contract index generation command for specs/contracts README.',
    'node',
    'documentation_drift',
    array['contracts:index:generate', 'contracts:index:check']::text[],
    array['ApplyContractsWorkflowCredentialPosture', 'CheckContractsWorkflowCredentialPosture']::text[],
    array['packages/@dvt/contracts/**', 'docs/contracts/**', 'specs/contracts/**']::text[],
    array['specs/contracts/README.md']::text[],
    array['scripts/generate-contract-index.cjs']::text[],
    'TEST-SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-CONTRACT-INDEX',
    'scripts/planning-db-query.test.cjs',
    'architecture',
    'boundary',
    'pnpm planning:db:query component-profile --component SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-CONTRACT-INDEX --no-refresh --limit 80'
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-PLANNING-VIEWS',
    'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION',
    'CI generated planning views',
    'review',
    'review',
    'PlanningViewProjection',
    'AcceptPlanningLaneRealityReconciliation;ExportPlanningStateSnapshot;ReviewPlanningLaneRealityState;ValidatePlanningStateDrift',
    'Owns planning lane, workboard, and changed-lane workboard drift generation surfaces.',
    'Render DB/YAML planning views and enforce workboard drift checks from governed planning state.',
    'Planning lane rendering, workboard rendering, changed-lane check, generated planning output, or Planning DB export compatibility changes.',
    'Planning views must be generated from governed planning state and must not be edited manually.',
    'review -> implemented after planning view generation and changed-workboard checks pass with component profile validation.',
    'docs:sync, docs:planning:lanes:generate, docs:workboard:generate, docs-workboard-check-changed',
    'scripts/generate-workboard.cjs',
    'module',
    'infra',
    'high',
    68,
    'Generated planning lane and workboard view commands.',
    'node',
    'hidden_authority',
    array[
      'docs:planning:lanes:generate',
      'docs:workboard:generate',
      'docs:workboard:check'
    ]::text[],
    array[
      'AcceptPlanningLaneRealityReconciliation',
      'ExportPlanningStateSnapshot',
      'ReviewPlanningLaneRealityState',
      'ValidatePlanningStateDrift'
    ]::text[],
    array[
      'docs/planning/state/agent-lane-*.yaml',
      'planning_query_store.planning_task_query',
      'docs/generated-docs-policy.json'
    ]::text[],
    array[
      'docs/planning/state/agent-lane-*.md',
      'docs/planning/state/execution-workboard.md',
      '.generated-docs/planning/state/**'
    ]::text[],
    array[
      'scripts/docs-workboard-check-changed.cjs',
      'scripts/generate-planning-lanes.cjs',
      'scripts/generate-planning-lanes.test.cjs',
      'scripts/generate-workboard.cjs',
      'scripts/generate-workboard.test.cjs'
    ]::text[],
    'TEST-SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-PLANNING-VIEWS',
    'scripts/generate-workboard.test.cjs',
    'unit',
    'behavior',
    'node --test scripts/generate-workboard.test.cjs scripts/generate-planning-lanes.test.cjs && node scripts/docs-workboard-check-changed.cjs'
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-DOCS-SYNC',
    'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION',
    'CI docs navigation sync and frontmatter backfill',
    'review',
    'review',
    'DocsNavigationSyncPolicy',
    'GenerateDocsGovernanceManifest;ExtractGeneratedDocsSurface;ValidateGeneratedDocsArtifact',
    'Owns docs navigation/index synchronization and planning last-reviewed frontmatter backfill surfaces.',
    'Synchronize docs indexes and backfill planning document review metadata from governed docs.',
    'Docs index generation, planning frontmatter backfill, generated navigation, or docs sync policy changes.',
    'Docs sync must operate on canonical docs structure and must not make planning YAML the daily write surface.',
    'review -> implemented after docs:sync and generated-doc policy validation pass with component profile validation.',
    'docs:sync, docs:planning:last-reviewed:backfill, ci:docs',
    'scripts/sync-docs.cjs',
    'module',
    'infra',
    'high',
    58,
    'Docs index synchronization and review-date backfill commands.',
    'node',
    'documentation_drift',
    array['docs:sync', 'docs:planning:last-reviewed:backfill']::text[],
    array[
      'GenerateDocsGovernanceManifest',
      'ExtractGeneratedDocsSurface',
      'ValidateGeneratedDocsArtifact'
    ]::text[],
    array['docs/**', 'docs/generated-docs-policy.json']::text[],
    array['docs/**/index.md', 'docs/planning/**/*.md']::text[],
    array[
      'scripts/sync-docs.cjs',
      'scripts/backfill-planning-last-reviewed.cjs'
    ]::text[],
    'TEST-SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-DOCS-SYNC',
    'scripts/planning-db-query.test.cjs',
    'architecture',
    'boundary',
    'pnpm docs:sync && pnpm planning:db:query component-profile --component SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-DOCS-SYNC --no-refresh --limit 80'
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-KNOWLEDGE-INTAKE',
    'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION',
    'CI generated knowledge intake literature',
    'review',
    'review',
    'KnowledgeIntakeGeneratedLiterature',
    'CheckBuzonIntakeRetirement;ExtractGeneratedDocsSurface;ValidateGeneratedDocsArtifact',
    'Owns generated knowledge-intake literature report output.',
    'Render literature and retirement evidence for knowledge-intake documents.',
    'Knowledge intake generated literature, retirement evidence, source reference mapping, or check behavior changes.',
    'Knowledge intake literature generation must read governed sources and must not reintroduce buzon as a parallel source of truth.',
    'review -> implemented after knowledge-intake generator tests and check pass.',
    'docs:knowledge-intake:generate, docs:knowledge-intake:check, planning:db:knowledge-intake:retirement:check',
    'scripts/generate-knowledge-intake-literature.cjs',
    'module',
    'infra',
    'medium',
    66,
    'Knowledge intake generated literature report command.',
    'node',
    'documentation_drift',
    array['docs:knowledge-intake:generate', 'docs:knowledge-intake:check']::text[],
    array[
      'CheckBuzonIntakeRetirement',
      'ExtractGeneratedDocsSurface',
      'ValidateGeneratedDocsArtifact'
    ]::text[],
    array[
      'planning_query_store.knowledge_intake_retirement_query',
      'docs/generated-docs-policy.json'
    ]::text[],
    array['docs/planning/status/generated-knowledge-intake-literature.md']::text[],
    array[
      'scripts/generate-knowledge-intake-literature.cjs',
      'scripts/generate-knowledge-intake-literature.test.cjs'
    ]::text[],
    'TEST-SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-KNOWLEDGE-INTAKE',
    'scripts/generate-knowledge-intake-literature.test.cjs',
    'unit',
    'behavior',
    'node --test scripts/generate-knowledge-intake-literature.test.cjs && pnpm docs:knowledge-intake:check'
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-MARKDOWN-TABLES',
    'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION',
    'CI Markdown table alignment utility',
    'review',
    'review',
    'MarkdownTableAlignmentPolicy',
    'ValidateGeneratedDocsArtifact;ValidateDocumentationUsefulness',
    'Owns the Markdown table alignment utility used during docs maintenance.',
    'Normalize Markdown table formatting without changing document semantics.',
    'Markdown table formatting, generated docs readability, or docs maintenance utility changes.',
    'Markdown table alignment must be formatting-only and must not alter canonical doc content semantics.',
    'review -> implemented after a focused table alignment test is added or the utility is retired.',
    'manual docs maintenance and generated docs artifact validation',
    'scripts/align-markdown-tables.cjs',
    'module',
    'infra',
    'low',
    32,
    'Markdown table alignment maintenance utility.',
    'node',
    'duplicated_function',
    array['node scripts/align-markdown-tables.cjs <file...>']::text[],
    array['ValidateGeneratedDocsArtifact', 'ValidateDocumentationUsefulness']::text[],
    array['docs/**/*.md']::text[],
    array['docs/**/*.md']::text[],
    array['scripts/align-markdown-tables.cjs']::text[],
    'TEST-SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-MARKDOWN-TABLES',
    'scripts/planning-db-query.test.cjs',
    'architecture',
    'boundary',
    'pnpm planning:db:query component-profile --component SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-MARKDOWN-TABLES --no-refresh --limit 80'
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-DATE-POLICY',
    'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION',
    'CI generated-doc date policy helper',
    'review',
    'review',
    'GeneratedDocDatePolicy',
    'ExtractGeneratedDocsSurface;ValidateGeneratedDocsArtifact',
    'Owns the generated document date resolution helper shared by report generators.',
    'Preserve stable generated-doc last_reviewed dates unless rendered content changes.',
    'Generated doc date policy, last_reviewed preservation, or report date drift changes.',
    'Generated-doc date policy must be deterministic for unchanged output and must not invent independent freshness semantics.',
    'review -> implemented after date policy gains focused test evidence or is absorbed by a shared generator library.',
    'generated docs report builders and generated-doc policy checks',
    'scripts/generated-doc-date.cjs',
    'module',
    'infra',
    'medium',
    42,
    'Shared generated document date policy helper.',
    'node',
    'data_clump',
    array['resolveGeneratedDate', 'currentUtcDate']::text[],
    array['ExtractGeneratedDocsSurface', 'ValidateGeneratedDocsArtifact']::text[],
    array['generated output path last_reviewed frontmatter']::text[],
    array['generated output path last_reviewed frontmatter']::text[],
    array['scripts/generated-doc-date.cjs']::text[],
    'TEST-SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-DATE-POLICY',
    'scripts/generate-code-status.test.cjs',
    'unit',
    'behavior',
    'node --test scripts/generate-code-status.test.cjs scripts/generate-workboard.test.cjs'
  ),
  (
    'SYS-RUNTIME-STATE-STORE-SNAPSHOT-BACKFILL-CLI',
    'SYS-RUNTIME-STATE-STORE',
    'Runtime state-store snapshot backfill CLI',
    'review',
    'review',
    'StateStoreSnapshotBackfillCliAdapter',
    'StateStoreSnapshotRebuildMaintenanceCommand;ReadComponentProfile;DetectCodeSymbolDuplicates',
    'Owns the active repository CLI script that rebuilds run_snapshots from authoritative run_events for operational backfill.',
    'Provide an operator backfill adapter for rebuilding materialized snapshots from canonical event history.',
    'Snapshot rebuild CLI, run_events replay mapping, run_snapshots upsert behavior, or state-store operational maintenance changes.',
    'The script is active through package.json and must remain mapped to state-store maintenance, not docs generation.',
    'review -> implemented after consumer-proof hardening adds a focused CLI dry-run test or replaces the loose script with a package-owned command.',
    'operators, state-store maintainers, Postgres adapter maintainers, and component duplicate queries',
    'scripts/rebuild-snapshots.js',
    'module',
    'adapter',
    'medium',
    36,
    'Active state-store snapshot backfill CLI adapter for StateStoreSnapshotRebuildMaintenanceCommand.',
    'node',
    'boundary_drift',
    array['rebuild:snapshots', 'scripts/rebuild-snapshots.js']::text[],
    array['StateStoreSnapshotRebuildMaintenanceCommand']::text[],
    array['run_events', 'DATABASE_URL']::text[],
    array['run_snapshots']::text[],
    array['scripts/rebuild-snapshots.js']::text[],
    'TEST-SYS-RUNTIME-STATE-STORE-SNAPSHOT-BACKFILL-CLI',
    'packages/@dvt/adapter-postgres/test/PostgresRunSnapshotStore.test.ts',
    'integration',
    'behavior',
    'pnpm --filter @dvt/adapter-postgres test -- PostgresRunSnapshotStore.test.ts'
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
  'PLANNING-DB-CI-DOCS-GENERATION-LEAF-MAPPING-20260618',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Planning DB CI docs generation leaf component mapping',
  'Architecture / Planning DB / CI',
  'review',
  'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION still mixed status reports, DB surface inventory, spec traceability, contract indexing, planning views, docs sync, knowledge-intake literature, Markdown utilities, date policy helpers, and an unrelated runtime snapshot backfill script. Splitting these into leaves lets component-profile answer files, rails, ports, storage, tests, and Fowler/DDD basis without a side inventory.',
  'responsibility_overload',
  'CreateGovernanceComponent;RecordArchitectureComponent;RecordArchitectureRelation;ReadComponentProfile;DetectCodeSymbolDuplicates',
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
  'PLANNING-DB-CI-DOCS-GENERATION-LEAF-MAPPING-20260618',
  scope.subject_kind,
  scope.subject_id,
  scope.scope_kind,
  true
from (
  values
    ('component', 'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION', 'may_update'),
    ('component', 'SYS-RUNTIME-STATE-STORE', 'may_update'),
    ('component', 'SYS-ADAPTERS-POSTGRES-RUN-STATE-STORE', 'may_reference'),
    ('component', 'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-QUALITY', 'may_reference'),
    ('path', 'scripts/generate-code-status.cjs', 'may_update'),
    ('path', 'scripts/generate-capability-coverage.cjs', 'may_update'),
    ('path', 'scripts/generate-db-surface-inventory.cjs', 'may_update'),
    ('path', 'scripts/generate-spec-traceability-report.cjs', 'may_update'),
    ('path', 'scripts/generate-contract-index.cjs', 'may_update'),
    ('path', 'scripts/generate-planning-lanes.cjs', 'may_update'),
    ('path', 'scripts/generate-workboard.cjs', 'may_update'),
    ('path', 'scripts/sync-docs.cjs', 'may_update'),
    ('path', 'scripts/backfill-planning-last-reviewed.cjs', 'may_update'),
    ('path', 'scripts/generate-knowledge-intake-literature.cjs', 'may_update'),
    ('path', 'scripts/align-markdown-tables.cjs', 'may_update'),
    ('path', 'scripts/generated-doc-date.cjs', 'may_update'),
    ('path', 'scripts/rebuild-snapshots.js', 'may_update'),
    ('path', 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md', 'may_reference'),
    ('path', 'docs/planning/proposals/mandatory/runtime-and-contracts/ar-a6-snapshot-rebuild-concurrency-contract-plan-20260513.md', 'may_reference'),
    ('path', 'docs/architecture/components/engine/contracts/state-store/snapshot-rebuild-concurrency-component.md', 'may_reference')
) scope(subject_kind, subject_id, scope_kind)
union all
select
  'PLANNING-DB-CI-DOCS-GENERATION-LEAF-MAPPING-20260618',
  'component',
  component_id,
  'may_create',
  true
from ci_docs_generation_leaf_map
union all
select
  'PLANNING-DB-CI-DOCS-GENERATION-LEAF-MAPPING-20260618',
  'test',
  test_id,
  'may_create',
  true
from ci_docs_generation_leaf_map
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
  'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION',
  'tools/planning-db/migrations/180_ci_docs_generation_leaf_components.sql',
  md5('SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION:180') ||
    md5('ci docs generation aggregate leaf split:180'),
  0,
  'CI governance docs generation scripts',
  'component',
  'SYS-CI-GOVERNANCE-SCRIPTS',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  true,
  'Composite generated documentation script boundary; concrete report, planning view, sync, intake, utility, and misplaced runtime backfill files are delegated to leaves.',
  'DocsGenerationPolicy',
  'GenerateDocsGovernanceManifest;ExtractGeneratedDocsSurface;ValidateGeneratedDocsArtifact;ReadComponentProfile;DetectCodeSymbolDuplicates',
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
  'tools/planning-db/migrations/180_ci_docs_generation_leaf_components.sql',
  md5(component_id || ':180') || md5(name || ':ci-docs-generation-leaf:180'),
  0,
  name,
  'component',
  parent_id,
  'SYS-DVT',
  'SYS-DVT',
  local_status,
  false,
  owned_concern,
  ddd_owner,
  cq_rails,
  'codex'
from ci_docs_generation_leaf_map
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
from ci_docs_generation_leaf_map
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
  from ci_docs_generation_leaf_map
  union all
  select component_id, 'reason_to_change', reason_to_change, 0
  from ci_docs_generation_leaf_map
  union all
  select component_id, 'invariant', invariant, 0
  from ci_docs_generation_leaf_map
  union all
  select component_id, 'transition', transition, 0
  from ci_docs_generation_leaf_map
  union all
  select component_id, 'consumer', consumer, 0
  from ci_docs_generation_leaf_map
  union all
  select
    component_id,
    'governance_ref',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    0
  from ci_docs_generation_leaf_map
  union all
  select
    component_id,
    'governance_ref',
    'docs/architecture/command-query-rail-governance.md',
    1
  from ci_docs_generation_leaf_map
  union all
  select
    component_id,
    'governance_ref',
    'docs/architecture/fowler-opportunity-planning-governance.md',
    2
  from ci_docs_generation_leaf_map
  union all
  select
    'SYS-RUNTIME-STATE-STORE-SNAPSHOT-BACKFILL-CLI',
    'governance_ref',
    'docs/planning/proposals/mandatory/runtime-and-contracts/ar-a6-snapshot-rebuild-concurrency-contract-plan-20260513.md',
    3
  union all
  select
    'SYS-RUNTIME-STATE-STORE-SNAPSHOT-BACKFILL-CLI',
    'governance_ref',
    'docs/architecture/components/engine/contracts/state-store/snapshot-rebuild-concurrency-component.md',
    4
  union all
  select component_id, 'fowler_signal', fowler_signal, 0
  from ci_docs_generation_leaf_map
  union all
  select component_id, 'public_api', api.value, api.item_order - 1
  from ci_docs_generation_leaf_map
  cross join lateral unnest(public_api) with ordinality as api(value, item_order)
  union all
  select
    component_id,
    'non_goal',
    'Function-level duplicates remain queryable in code-symbol-duplicates; this migration narrows ownership and does not hide active helper duplication.',
    0
  from ci_docs_generation_leaf_map
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
  'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION',
  'CI governance docs generation scripts',
  'module',
  'infra',
  'DocsGenerationPolicy',
  'scripts/generate-workboard.cjs',
  'Composite generated documentation boundary with report, planning view, sync, intake, utility, and date-policy leaves.',
  'node',
  'medium',
  'review',
  52,
  'SYS-CI-GOVERNANCE-SCRIPTS'
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
  parent_id
from ci_docs_generation_leaf_map
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
from ci_docs_generation_leaf_map
union all
select
  'RESP-SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION',
  'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION',
  'Own the composite generated documentation script boundary while concrete files resolve to semantic leaves.',
  'Docs-generation topology, generated-doc rail mapping, helper duplicate treatment, or misplaced script ownership changes.',
  'DocsGenerationPolicy',
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
  case
    when component_id = 'SYS-RUNTIME-STATE-STORE-SNAPSHOT-BACKFILL-CLI' then 'port'
    else 'workflow'
  end,
  component_id,
  public_contract,
  'internal',
  'implemented',
  validation_command
from ci_docs_generation_leaf_map
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
select
  'REL-CI-DOCS-GENERATION-CONTAINS-' ||
    replace(component_id, 'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-', ''),
  parent_id,
  component_id,
  'contains',
  'outbound',
  'build_time',
  'CONTRACT-' || component_id || '-SURFACE',
  'component-profile becomes incomplete if this leaf falls back to the broad docs-generation aggregate',
  'repo-local generated documentation component ownership',
  jsonb_build_array(
    'tools/planning-db/migrations/180_ci_docs_generation_leaf_components.sql',
    repo_path
  ),
  'implemented'
from ci_docs_generation_leaf_map
where parent_id = 'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION'
union all
select
  'REL-RUNTIME-STATE-STORE-CONTAINS-SNAPSHOT-BACKFILL-CLI',
  'SYS-RUNTIME-STATE-STORE',
  'SYS-RUNTIME-STATE-STORE-SNAPSHOT-BACKFILL-CLI',
  'contains',
  'outbound',
  'build_time',
  'CONTRACT-SYS-RUNTIME-STATE-STORE-SNAPSHOT-BACKFILL-CLI-SURFACE',
  'snapshot backfill becomes hidden if the loose script is classified as docs generation or runtime proof instead of state-store maintenance',
  'repo-local state-store maintenance command ownership',
  jsonb_build_array(
    'scripts/rebuild-snapshots.js',
    'package.json',
    'docs/planning/proposals/mandatory/runtime-and-contracts/ar-a6-snapshot-rebuild-concurrency-contract-plan-20260513.md'
  ),
  'implemented'
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
values
  (
    'REL-CI-DOCS-STATUS-REPORTS-CALLS-DATE-POLICY',
    'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-STATUS-REPORTS',
    'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-DATE-POLICY',
    'calls',
    'outbound',
    'sync',
    'CONTRACT-SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-DATE-POLICY-SURFACE',
    'generated status dates churn if report renderers bypass the shared date policy',
    'repo-local generated docs helper',
    jsonb_build_array('scripts/generate-code-status.cjs', 'scripts/generate-capability-coverage.cjs', 'scripts/generated-doc-date.cjs'),
    'implemented'
  ),
  (
    'REL-CI-DOCS-SPEC-TRACEABILITY-CALLS-DATE-POLICY',
    'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-SPEC-TRACEABILITY',
    'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-DATE-POLICY',
    'calls',
    'outbound',
    'sync',
    'CONTRACT-SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-DATE-POLICY-SURFACE',
    'generated traceability report dates churn if the renderer bypasses the shared date policy',
    'repo-local generated docs helper',
    jsonb_build_array('scripts/generate-spec-traceability-report.cjs', 'scripts/generated-doc-date.cjs'),
    'implemented'
  ),
  (
    'REL-CI-DOCS-PLANNING-VIEWS-CALLS-DATE-POLICY',
    'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-PLANNING-VIEWS',
    'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-DATE-POLICY',
    'calls',
    'outbound',
    'sync',
    'CONTRACT-SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-DATE-POLICY-SURFACE',
    'generated workboard dates churn if planning view renderers bypass the shared date policy',
    'repo-local generated docs helper',
    jsonb_build_array('scripts/generate-workboard.cjs', 'scripts/generated-doc-date.cjs'),
    'implemented'
  ),
  (
    'REL-SNAPSHOT-BACKFILL-CLI-CALLS-POSTGRES-RUN-STATE-STORE',
    'SYS-RUNTIME-STATE-STORE-SNAPSHOT-BACKFILL-CLI',
    'SYS-ADAPTERS-POSTGRES-RUN-STATE-STORE',
    'writes',
    'outbound',
    'batch',
    'CONTRACT-SYS-RUNTIME-STATE-STORE-SNAPSHOT-BACKFILL-CLI-SURFACE',
    'run_snapshots can diverge if the backfill script bypasses canonical run_events ordering or tenant-scoped state-store maintenance semantics',
    'operator-provided DATABASE_URL maintenance scope',
    jsonb_build_array(
      'scripts/rebuild-snapshots.js',
      'packages/@dvt/adapter-postgres/src/PostgresRunSnapshotStore.ts',
      'docs/architecture/components/engine/contracts/state-store/snapshot-rebuild-concurrency-component.md'
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
select
  'PORT-' || component_id || '-' || regexp_replace(upper(port.value), '[^A-Z0-9]+', '-', 'g'),
  component_id,
  port.value,
  case
    when port.value like 'Read%' or port.value like 'Review%' or port.value like 'Validate%' then 'query'
    else 'command'
  end,
  'inbound',
  'CONTRACT-' || component_id || '-SURFACE',
  null,
  array[validation_command]::text[],
  'implemented'
from ci_docs_generation_leaf_map
cross join lateral unnest(ports) with ordinality as port(value, item_order)
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
select
  'STORAGE-' || component_id || '-READ-' || storage.item_order,
  component_id,
  storage.value,
  'reads',
  case
    when component_id = 'SYS-RUNTIME-STATE-STORE-SNAPSHOT-BACKFILL-CLI' then 'read_only'
    else 'projection'
  end,
  'CONTRACT-' || component_id || '-SURFACE'
from ci_docs_generation_leaf_map
cross join lateral unnest(storage_reads) with ordinality as storage(value, item_order)
union all
select
  'STORAGE-' || component_id || '-WRITE-' || storage.item_order,
  component_id,
  storage.value,
  'writes',
  case
    when component_id = 'SYS-RUNTIME-STATE-STORE-SNAPSHOT-BACKFILL-CLI' then 'bulk'
    else 'projection'
  end,
  'CONTRACT-' || component_id || '-SURFACE'
from ci_docs_generation_leaf_map
cross join lateral unnest(storage_writes) with ordinality as storage(value, item_order)
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
select
  test_id,
  component_id,
  test_path,
  test_kind,
  coverage_level,
  true,
  validation_command
from ci_docs_generation_leaf_map
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

drop table if exists pg_temp.ci_docs_generation_leaf_map;
