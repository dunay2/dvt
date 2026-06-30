-- Split the evidence documentation catalog into physical responsibility leaves.
-- Active evidence remains queryable by root, critical, context, supporting, and
-- asset leaves; historical archive records are explicitly deprecated.

drop table if exists pg_temp.docs_evidence_leaf_map;

create temporary table docs_evidence_leaf_map (
  component_id text primary key,
  name text not null,
  repo_path text not null,
  component_status text not null,
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

insert into docs_evidence_leaf_map (
  component_id,
  name,
  repo_path,
  component_status,
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
    'SYS-DOCS-EVIDENCE-ROOT-RECORDS',
    'Evidence root records',
    'docs/evidence/index.md',
    'review',
    'EvidenceRootReadModel',
    'ReadEvidenceRootRecords',
    'evidence index and active root evidence documents kept directly under docs/evidence',
    'Evidence index, root ARC proof, validation proof, or evidence placement changes.',
    'Evidence root documentation boundary.',
    'evidence_catalog',
    array['docs/evidence/*.md']::text[],
    'scripts/validate-arc-evidence-frontmatter.cjs',
    'pnpm docs:arc:evidence:check && pnpm docs:quality:check',
    78,
    'high'
  ),
  (
    'SYS-DOCS-EVIDENCE-CRITICAL',
    'Critical evidence records',
    'docs/evidence/critical',
    'review',
    'CriticalEvidenceReadModel',
    'ReadCriticalEvidenceRecords',
    'critical validation evidence and index records under docs/evidence/critical',
    'Critical evidence intake, ARC proof placement, or critical evidence index changes.',
    'Critical evidence documentation boundary.',
    'risk_evidence',
    array['docs/evidence/critical/**']::text[],
    'scripts/validate-arc-evidence-frontmatter.cjs',
    'pnpm docs:arc:evidence:check && pnpm docs:quality:check',
    82,
    'high'
  ),
  (
    'SYS-DOCS-EVIDENCE-CONTEXT',
    'Context evidence records',
    'docs/evidence/context',
    'review',
    'ContextEvidenceReadModel',
    'ReadContextEvidenceRecords',
    'contextual assessment, roadmap, and rationale evidence records under docs/evidence/context',
    'Context evidence, rationale evidence, or contextual evidence index changes.',
    'Context evidence documentation boundary.',
    'context_map',
    array['docs/evidence/context/**']::text[],
    'scripts/validate-arc-evidence-frontmatter.cjs',
    'pnpm docs:arc:evidence:check && pnpm docs:quality:check',
    72,
    'medium'
  ),
  (
    'SYS-DOCS-EVIDENCE-SUPPORTING',
    'Supporting evidence records',
    'docs/evidence/supporting',
    'review',
    'SupportingEvidenceReadModel',
    'ReadSupportingEvidenceRecords',
    'supporting validation evidence and index records under docs/evidence/supporting',
    'Supporting evidence, follow-up evidence, or supporting evidence index changes.',
    'Supporting evidence documentation boundary.',
    'supporting_evidence',
    array['docs/evidence/supporting/**']::text[],
    'scripts/validate-arc-evidence-frontmatter.cjs',
    'pnpm docs:arc:evidence:check && pnpm docs:quality:check',
    70,
    'medium'
  ),
  (
    'SYS-DOCS-EVIDENCE-ASSETS',
    'Evidence binary assets',
    'docs/evidence/assets',
    'review',
    'EvidenceAssetReadModel',
    'ReadEvidenceAssets',
    'evidence screenshots and binary proof assets under docs/evidence/assets',
    'Evidence screenshot, binary proof, or evidence asset placement changes.',
    'Evidence asset documentation boundary.',
    'supporting_artifact',
    array['docs/evidence/assets/**']::text[],
    'scripts/generate-governance-file-component-index.cjs',
    'pnpm docs:governance:coverage-report && pnpm planning:db:query filesystem-coverage --no-refresh --limit 80',
    64,
    'medium'
  ),
  (
    'SYS-DOCS-EVIDENCE-ARCHIVE',
    'Archived evidence records',
    'docs/evidence/archive',
    'deprecated',
    'ArchivedEvidenceReadModel',
    'ReadArchivedEvidenceRecords',
    'historical evidence archive index records retained for reference',
    'Archived evidence retention or historical evidence reference changes.',
    'Archived evidence documentation boundary; deprecated and not active evidence authority.',
    'documentation_lifecycle_archive',
    array['docs/evidence/archive/**']::text[],
    'scripts/docs-doctor.cjs',
    'pnpm planning:db:query documentation-lifecycle --no-refresh --limit 80 && pnpm planning:db:query source-drift --no-refresh --limit 80',
    52,
    'low'
  );

update architecture.component
set
  repo_path = 'docs/evidence',
  public_contract = 'Evidence documentation aggregate catalog. Concrete files resolve to evidence leaf components.',
  updated_at = now()
where
  component_id = 'SYS-DOCS-GOVERNANCE-EVIDENCE'
  and repo_path = 'docs/evidence/index.md';

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
  'PLANNING-DB-DOCS-EVIDENCE-LEAF-MAPPING-20260618',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Evidence documentation leaf component mapping',
  'Architecture / Planning DB / Docs',
  'review',
  'SYS-DOCS-GOVERNANCE-EVIDENCE directly owned every tracked evidence file. This split creates physical child components for root evidence records, critical evidence, context evidence, supporting evidence, evidence assets, and deprecated evidence archive records so component-profile can answer files, docs, tests, contracts, ports, relations, and Fowler/DDD basis without a side inventory. Historical archive files remain queryable but deprecated instead of active evidence authority.',
  'responsibility_overload',
  'ReadComponentProfile;ValidateComponentIntegrity;ReadEvidenceRootRecords;ReadCriticalEvidenceRecords;ReadContextEvidenceRecords;ReadSupportingEvidenceRecords;ReadEvidenceAssets;ReadArchivedEvidenceRecords',
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
  'PLANNING-DB-DOCS-EVIDENCE-LEAF-MAPPING-20260618',
  scope.subject_kind,
  scope.subject_id,
  scope.scope_kind,
  true
from (
  select 'component'::text, 'SYS-DOCS-GOVERNANCE-EVIDENCE'::text, 'may_update'::text
  union all
  select 'path', 'docs/evidence/**', 'may_update'
  union all
  select 'component', component_id, 'may_create' from docs_evidence_leaf_map
  union all
  select 'path', pattern, 'may_update'
  from docs_evidence_leaf_map
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
  'tools/planning-db/migrations/194_docs_evidence_leaf_components.sql',
  md5(component_id || ':194') || md5(repo_path || rail_name || component_status || ':docs-evidence-leaf'),
  0,
  name,
  'component',
  'SYS-DOCS-GOVERNANCE-EVIDENCE',
  'SYS-DVT',
  'SYS-DVT',
  case when component_status = 'deprecated' then 'legacy' else component_status end,
  false,
  owned_concern,
  ddd_owner,
  rail_name,
  'codex'
from docs_evidence_leaf_map
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
from docs_evidence_leaf_map
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
  from docs_evidence_leaf_map
  union all
  select component_id, 'reason_to_change', reason_to_change, 0
  from docs_evidence_leaf_map
  union all
  select component_id, 'invariant', 'Tracked evidence files matching this leaf must resolve here rather than to SYS-DOCS-GOVERNANCE-EVIDENCE.', 0
  from docs_evidence_leaf_map
  union all
  select component_id, 'non_goal', 'Historical evidence archive files are deprecated in place; they must not be treated as active evidence authority without a governed reactivation decision.', 0
  from docs_evidence_leaf_map
  union all
  select component_id, 'transition', 'review -> implemented once component-quality shows SYS-DOCS-GOVERNANCE-EVIDENCE owns no direct evidence files.', 0
  from docs_evidence_leaf_map
  where component_status <> 'deprecated'
  union all
  select component_id, 'transition', 'deprecated -> retired only after documentation lifecycle and source-drift queries prove no active references require the archive record.', 0
  from docs_evidence_leaf_map
  where component_status = 'deprecated'
  union all
  select component_id, 'consumer', 'Planning DB component-profile, component-integrity, documentation-lifecycle, source-drift, and filesystem-coverage readers.', 0
  from docs_evidence_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/planning/status/governance-document-rule-inventory.md', 0
  from docs_evidence_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/architecture/command-query-rail-governance.md', 1
  from docs_evidence_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/architecture/fowler-opportunity-planning-governance.md', 2
  from docs_evidence_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md', 3
  from docs_evidence_leaf_map
  union all
  select component_id, 'fowler_signal', fowler_signal, 0
  from docs_evidence_leaf_map
  union all
  select component_id, 'public_api', rail_name, 0
  from docs_evidence_leaf_map
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
  component_status,
  maturity_score,
  'SYS-DOCS-GOVERNANCE-EVIDENCE'
from docs_evidence_leaf_map
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
from docs_evidence_leaf_map
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
from docs_evidence_leaf_map
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
  'REL-DOCS-EVIDENCE-CONTAINS-' || replace(component_id, 'SYS-DOCS-EVIDENCE-', ''),
  'SYS-DOCS-GOVERNANCE-EVIDENCE',
  component_id,
  'contains',
  'outbound',
  'build_time',
  null,
  'Component profile becomes incomplete if this evidence leaf is removed or remapped without a governed Planning DB component update.',
  'repo-local documentation governance',
  jsonb_build_array(
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    repo_path
  ),
  'implemented'
from docs_evidence_leaf_map
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
    'missing evidence ownership',
    'deprecated evidence archive used as active evidence authority',
    'component-profile evidence gap'
  ]::text[],
  'implemented'
from docs_evidence_leaf_map
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
from docs_evidence_leaf_map
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
  'Evidence documentation component has no runtime observability requirement.',
  'log',
  true,
  'not_applicable'
from docs_evidence_leaf_map
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;

drop table if exists pg_temp.docs_evidence_leaf_map;
