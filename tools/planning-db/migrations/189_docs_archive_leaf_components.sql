-- Split the historical documentation archive into physical legacy leaves.
-- Archive files remain tracked and queryable, but the architecture authority
-- marks these leaves as deprecated so old/nonfunctional material is not treated
-- as active governance.

drop table if exists pg_temp.docs_archive_leaf_map;

create temporary table docs_archive_leaf_map (
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

insert into docs_archive_leaf_map (
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
    'SYS-DOCS-ARCHIVE-ROOT-RECORDS',
    'Archived root records',
    'docs/archive',
    'DocumentationArchiveRootReadModel',
    'ReadArchivedRootRecords',
    'archive landing page, root historical assessments, rollback notes, remediation notes, and archived closeout records',
    'Archive landing page, root historical record, closeout retention, or historical assessment changes.',
    'Archived root documentation boundary.',
    'documentation_lifecycle_archive',
    array['docs/archive/*', 'docs/archive/closeouts/**']::text[],
    'scripts/docs-doctor.cjs',
    'pnpm planning:db:query documentation-lifecycle --no-refresh --limit 80 && pnpm planning:db:query source-drift --no-refresh --limit 80',
    62,
    'low'
  ),
  (
    'SYS-DOCS-ARCHIVE-ARCHITECTURE-ROOT',
    'Archived architecture root records',
    'docs/archive/architecture',
    'ArchivedArchitectureRootReadModel',
    'ReadArchivedArchitectureRoot',
    'archived architecture root, archived engine roadmap, and archived frontend or engine navigation records',
    'Archived architecture root, old engine roadmap, or old frontend/engine navigation changes.',
    'Archived architecture root documentation boundary.',
    'documentation_lifecycle_archive',
    array[
      'docs/archive/architecture/*',
      'docs/archive/architecture/engine/**',
      'docs/archive/architecture/frontend/**'
    ]::text[],
    'scripts/docs-doctor.cjs',
    'pnpm planning:db:query documentation-lifecycle --no-refresh --limit 80 && pnpm planning:db:query source-drift --no-refresh --limit 80',
    58,
    'low'
  ),
  (
    'SYS-DOCS-ARCHIVE-ARCHITECTURE-COMPONENTS',
    'Archived architecture component records',
    'docs/archive/architecture/components',
    'ArchivedArchitectureComponentReadModel',
    'ReadArchivedArchitectureComponentDocs',
    'archived component architecture documents for old adapters, contracts, shared modules, planner aggregates, traceability, verifier, and web-app designs',
    'Archived component architecture pack, old component design, or historical architecture component migration changes.',
    'Archived architecture component documentation boundary.',
    'legacy_component_catalog',
    array['docs/archive/architecture/components/**']::text[],
    'scripts/docs-doctor.cjs',
    'pnpm planning:db:query documentation-lifecycle --no-refresh --limit 80 && pnpm planning:db:query source-drift --no-refresh --limit 80',
    60,
    'low'
  ),
  (
    'SYS-DOCS-ARCHIVE-PLANNING-GAPS',
    'Archived planning gap records',
    'docs/archive/planning/gaps',
    'ArchivedPlanningGapReadModel',
    'ReadArchivedPlanningGapRecords',
    'archived planning gap trackers, old G5 outbox packs, and archived repo-ready source snapshots kept for historical reference',
    'Archived planning gap record, old source snapshot, or historical gap-pack retention changes.',
    'Archived planning gap documentation and old source snapshot boundary.',
    'legacy_retirement',
    array['docs/archive/planning/gaps/**']::text[],
    'scripts/docs-doctor.cjs',
    'pnpm planning:db:query documentation-lifecycle --no-refresh --limit 80 && pnpm planning:db:query source-drift --no-refresh --limit 80',
    50,
    'low'
  ),
  (
    'SYS-DOCS-ARCHIVE-PLANNING-PROPOSALS',
    'Archived planning proposal records',
    'docs/archive/planning/proposals',
    'ArchivedPlanningProposalReadModel',
    'ReadArchivedPlanningProposalRecords',
    'archived planning proposals and historical planning proposal navigation',
    'Archived proposal, historical planning decision, or proposal retirement changes.',
    'Archived planning proposal documentation boundary.',
    'documentation_lifecycle_archive',
    array['docs/archive/planning/proposals/**']::text[],
    'scripts/docs-doctor.cjs',
    'pnpm planning:db:query documentation-lifecycle --no-refresh --limit 80 && pnpm planning:db:query source-drift --no-refresh --limit 80',
    56,
    'low'
  ),
  (
    'SYS-DOCS-ARCHIVE-PLANNING-ROOT',
    'Archived planning root record',
    'docs/archive/planning/index.md',
    'ArchivedPlanningRootReadModel',
    'ReadArchivedPlanningRoot',
    'archived planning archive index',
    'Archived planning archive index or historical planning archive navigation changes.',
    'Archived planning root documentation boundary.',
    'documentation_lifecycle_archive',
    array['docs/archive/planning/index.md']::text[],
    'scripts/docs-doctor.cjs',
    'pnpm planning:db:query documentation-lifecycle --no-refresh --limit 80 && pnpm planning:db:query source-drift --no-refresh --limit 80',
    56,
    'low'
  ),
  (
    'SYS-DOCS-ARCHIVE-TRACEABILITY-PACK',
    'Archived traceability pack',
    'docs/archive/dvt-traceability-pack-v2-lite-R6',
    'ArchivedTraceabilityPackReadModel',
    'ReadArchivedTraceabilityPack',
    'archived DVT traceability pack, copied governance templates, old CI tools, and historical guide material',
    'Archived traceability pack retention, historical policy reference, or copied-tool quarantine changes.',
    'Archived traceability pack boundary.',
    'legacy_retirement',
    array['docs/archive/dvt-traceability-pack-v2-lite-R6/**']::text[],
    'scripts/docs-doctor.cjs',
    'pnpm planning:db:query documentation-lifecycle --no-refresh --limit 80 && pnpm planning:db:query source-drift --no-refresh --limit 80',
    48,
    'low'
  ),
  (
    'SYS-DOCS-ARCHIVE-PLANNER',
    'Archived planner records',
    'docs/archive/planner',
    'ArchivedPlannerReadModel',
    'ReadArchivedPlannerRecords',
    'archived planner ADRs, planner contracts, implementation reviews, and old planner proposals',
    'Archived planner decision, contract, review, or old planner proposal changes.',
    'Archived planner documentation and contract boundary.',
    'legacy_retirement',
    array['docs/archive/planner/**']::text[],
    'scripts/docs-doctor.cjs',
    'pnpm planning:db:query documentation-lifecycle --no-refresh --limit 80 && pnpm planning:db:query source-drift --no-refresh --limit 80',
    52,
    'low'
  ),
  (
    'SYS-DOCS-ARCHIVE-ARTIFACT-STORE-PACK',
    'Archived artifact-store spec pack',
    'docs/archive/dvt_artifact_store_spec_pack',
    'ArchivedArtifactStorePackReadModel',
    'ReadArchivedArtifactStorePack',
    'archived artifact-store ADR, architecture spec, schema, and SQL reference pack',
    'Archived artifact-store reference pack or historical artifact-store contract changes.',
    'Archived artifact-store spec pack boundary.',
    'legacy_retirement',
    array['docs/archive/dvt_artifact_store_spec_pack/**']::text[],
    'scripts/docs-doctor.cjs',
    'pnpm planning:db:query documentation-lifecycle --no-refresh --limit 80 && pnpm planning:db:query source-drift --no-refresh --limit 80',
    52,
    'low'
  ),
  (
    'SYS-DOCS-ARCHIVE-WORKING-NOTES',
    'Archived working notes',
    'docs/archive/working-notes',
    'ArchivedWorkingNotesReadModel',
    'ReadArchivedWorkingNotes',
    'archived working notes for old source-tree placeholders and state-store extraction notes',
    'Archived working note retention or historical note classification changes.',
    'Archived working notes boundary.',
    'documentation_lifecycle_archive',
    array['docs/archive/working-notes/**']::text[],
    'scripts/docs-doctor.cjs',
    'pnpm planning:db:query documentation-lifecycle --no-refresh --limit 80 && pnpm planning:db:query source-drift --no-refresh --limit 80',
    50,
    'low'
  ),
  (
    'SYS-DOCS-ARCHIVE-HISTORICAL-BLUEPRINTS',
    'Archived historical blueprints',
    'docs/archive/historical-blueprints',
    'ArchivedHistoricalBlueprintReadModel',
    'ReadArchivedHistoricalBlueprints',
    'archived historical blueprint documents',
    'Archived blueprint retention or historical blueprint classification changes.',
    'Archived historical blueprint boundary.',
    'documentation_lifecycle_archive',
    array['docs/archive/historical-blueprints/**']::text[],
    'scripts/docs-doctor.cjs',
    'pnpm planning:db:query documentation-lifecycle --no-refresh --limit 80 && pnpm planning:db:query source-drift --no-refresh --limit 80',
    50,
    'low'
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
  'PLANNING-DB-DOCS-ARCHIVE-LEAF-MAPPING-20260618',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Historical archive documentation leaf component mapping',
  'Architecture / Planning DB / Docs',
  'review',
  'SYS-DOCS-GOVERNANCE-ARCHIVE directly owned every tracked file under docs/archive. This split creates physical legacy child components for archive root records, old architecture packs, archived planning gaps and proposals, copied traceability packs, planner archive records, artifact-store packs, working notes, and historical blueprints. The architecture authority marks these leaves deprecated so old or nonfunctional material remains queryable but is not active governance.',
  'responsibility_overload',
  'ReadComponentProfile;ValidateComponentIntegrity;ReadDocumentationLifecycle;DetectGovernedSourceDrift',
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
  'PLANNING-DB-DOCS-ARCHIVE-LEAF-MAPPING-20260618',
  scope.subject_kind,
  scope.subject_id,
  scope.scope_kind,
  true
from (
  select 'component'::text, 'SYS-DOCS-GOVERNANCE-ARCHIVE'::text, 'may_update'::text
  union all
  select 'path', 'docs/archive/**', 'may_update'
  union all
  select 'component', component_id, 'may_create' from docs_archive_leaf_map
  union all
  select 'path', pattern, 'may_update'
  from docs_archive_leaf_map
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
  'tools/planning-db/migrations/189_docs_archive_leaf_components.sql',
  md5(component_id || ':189') || md5(repo_path || rail_name || ':docs-archive-leaf'),
  0,
  name,
  'component',
  'SYS-DOCS-GOVERNANCE-ARCHIVE',
  'SYS-DVT',
  'SYS-DVT',
  'legacy',
  false,
  owned_concern,
  ddd_owner,
  rail_name,
  'codex'
from docs_archive_leaf_map
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
from docs_archive_leaf_map
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
  from docs_archive_leaf_map
  union all
  select component_id, 'reason_to_change', reason_to_change, 0
  from docs_archive_leaf_map
  union all
  select component_id, 'non_goal', 'Do not treat archived or copied material as active governance unless an active source cites it explicitly.', 0
  from docs_archive_leaf_map
  union all
  select component_id, 'invariant', 'Tracked archive files matching this leaf must resolve here rather than to active documentation components.', 0
  from docs_archive_leaf_map
  union all
  select component_id, 'transition', 'legacy/deprecated until intentionally promoted by an active governed design; old or nonfunctional files stay classified as archive records.', 0
  from docs_archive_leaf_map
  union all
  select component_id, 'consumer', 'Planning DB component-profile, documentation-lifecycle, source-drift, and filesystem-coverage readers.', 0
  from docs_archive_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/planning/status/governance-document-rule-inventory.md', 0
  from docs_archive_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/architecture/command-query-rail-governance.md', 1
  from docs_archive_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/architecture/fowler-opportunity-planning-governance.md', 2
  from docs_archive_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md', 3
  from docs_archive_leaf_map
  union all
  select component_id, 'fowler_signal', fowler_signal, 0
  from docs_archive_leaf_map
  union all
  select component_id, 'public_api', rail_name, 0
  from docs_archive_leaf_map
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
  public_contract || ' Deprecated archive component: historical reference only, not active governance.',
  'none',
  criticality,
  'deprecated',
  maturity_score,
  'SYS-DOCS-GOVERNANCE-ARCHIVE'
from docs_archive_leaf_map
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
from docs_archive_leaf_map
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
  'deprecated',
  validation_command
from docs_archive_leaf_map
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
  'REL-DOCS-ARCHIVE-CONTAINS-' || replace(component_id, 'SYS-DOCS-ARCHIVE-', ''),
  'SYS-DOCS-GOVERNANCE-ARCHIVE',
  component_id,
  'contains',
  'outbound',
  'build_time',
  null,
  'Component profile becomes incomplete if this archive leaf is removed, reactivated, or remapped without a governed Planning DB component update.',
  'repo-local historical documentation governance',
  jsonb_build_array(
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    repo_path
  ),
  'implemented'
from docs_archive_leaf_map
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
    'archived file treated as active governance',
    'old or nonfunctional archive source remapped to active component',
    'component-profile archive ownership gap'
  ]::text[],
  'implemented'
from docs_archive_leaf_map
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
from docs_archive_leaf_map
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
  'Archived documentation component has no runtime observability requirement.',
  'log',
  true,
  'not_applicable'
from docs_archive_leaf_map
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;

drop table if exists pg_temp.docs_archive_leaf_map;
