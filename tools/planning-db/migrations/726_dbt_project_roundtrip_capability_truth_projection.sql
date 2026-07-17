-- Project current DBT round-trip capability truth from normalized phase evidence
-- and the canonical command/query catalog. Git commit ancestry remains a
-- repository check performed by the read adapter, not a PostgreSQL concern.

create table if not exists planning_query_store.dbt_project_roundtrip_phases (
  phase_id text primary key,
  phase_order integer not null unique,
  phase_name text not null,
  expected_rail_count integer not null,
  source_path text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dbt_project_roundtrip_phase_order_check check (phase_order > 0),
  constraint dbt_project_roundtrip_phase_rail_count_check check (expected_rail_count > 0)
);

create table if not exists planning_query_store.dbt_project_roundtrip_phase_rail_evidence (
  evidence_id text primary key,
  phase_id text not null references planning_query_store.dbt_project_roundtrip_phases(phase_id) on delete restrict,
  rail_name text not null,
  expected_rail_type text not null,
  expected_rail_status text not null,
  expected_mechanization_status text not null,
  expected_is_gap boolean not null,
  expected_implemented boolean not null,
  reviewed_pr_url text not null,
  reviewed_commit_sha text not null,
  evidence_summary text not null,
  source_path text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dbt_project_roundtrip_phase_rail_unique unique (phase_id, rail_name),
  constraint dbt_project_roundtrip_expected_rail_type_check check (
    expected_rail_type in ('command', 'query')
  ),
  constraint dbt_project_roundtrip_reviewed_pr_check check (
    reviewed_pr_url ~ '^https://github[.]com/dunay2/dvt/pull/[0-9]+$'
  ),
  constraint dbt_project_roundtrip_reviewed_commit_check check (
    reviewed_commit_sha ~ '^[a-f0-9]{40}$'
  )
);

insert into planning_query_store.dbt_project_roundtrip_phases (
  phase_id, phase_order, phase_name, expected_rail_count, source_path
)
values
  ('phase-2', 2, 'dbt analysis and read-only file projection', 1, 'docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md'),
  ('phase-3', 3, 'Import and file-backed Source Import', 2, 'docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md'),
  ('phase-4', 4, 'File-backed Preview and Run', 4, 'docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md'),
  ('phase-6', 6, 'Export', 1, 'docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md')
on conflict (phase_id) do update set
  phase_order = excluded.phase_order,
  phase_name = excluded.phase_name,
  expected_rail_count = excluded.expected_rail_count,
  source_path = excluded.source_path,
  updated_at = now();

insert into planning_query_store.dbt_project_roundtrip_phase_rail_evidence (
  evidence_id,
  phase_id,
  rail_name,
  expected_rail_type,
  expected_rail_status,
  expected_mechanization_status,
  expected_is_gap,
  expected_implemented,
  reviewed_pr_url,
  reviewed_commit_sha,
  evidence_summary,
  source_path
)
values
  (
    'DBT-ROUNDTRIP-PHASE2-PROJECT-FILES',
    'phase-2',
    'ProjectDbtGraphFromFiles',
    'query',
    'implemented',
    'implemented',
    false,
    true,
    'https://github.com/dunay2/dvt/pull/1954',
    '2894552f66ae5405edb0593679e785fa495d2998',
    'PR 1954 completed the protected file projection and its browser read model.',
    'tools/planning-db/migrations/726_dbt_project_roundtrip_capability_truth_projection.sql'
  ),
  (
    'DBT-ROUNDTRIP-PHASE3-VALIDATE-IMPORT',
    'phase-3',
    'ValidateDbtProjectImport',
    'query',
    'implemented',
    'implemented',
    false,
    true,
    'https://github.com/dunay2/dvt/pull/1959',
    '998882623da73fe8abeffa1248a3b31e9ff59ae6',
    'PR 1959 completed protected import validation with typed diagnostics.',
    'tools/planning-db/migrations/726_dbt_project_roundtrip_capability_truth_projection.sql'
  ),
  (
    'DBT-ROUNDTRIP-PHASE3-IMPORT',
    'phase-3',
    'ImportDbtProject',
    'command',
    'implemented',
    'implemented',
    false,
    true,
    'https://github.com/dunay2/dvt/pull/1959',
    '998882623da73fe8abeffa1248a3b31e9ff59ae6',
    'PR 1959 completed durable import authority, recovery, and strict browser proof.',
    'tools/planning-db/migrations/726_dbt_project_roundtrip_capability_truth_projection.sql'
  ),
  (
    'DBT-ROUNDTRIP-PHASE4-BUILD-PLANNER-SOURCE',
    'phase-4',
    'BuildDbtPlannerGraphSource',
    'query',
    'declared',
    'implemented',
    false,
    true,
    'https://github.com/dunay2/dvt/pull/1962',
    'f65d187319db03651c000e7907f4ddb8f3b0ea17',
    'PR 1962 adapted the existing planner-source query to file-authoritative projection.',
    'tools/planning-db/migrations/726_dbt_project_roundtrip_capability_truth_projection.sql'
  ),
  (
    'DBT-ROUNDTRIP-PHASE4-PREVIEW',
    'phase-4',
    'PreviewExecutionPlan',
    'command',
    'implemented',
    'implemented',
    false,
    true,
    'https://github.com/dunay2/dvt/pull/1962',
    'f65d187319db03651c000e7907f4ddb8f3b0ea17',
    'PR 1962 bound Preview to analyzed file revision and authorized target identity.',
    'tools/planning-db/migrations/726_dbt_project_roundtrip_capability_truth_projection.sql'
  ),
  (
    'DBT-ROUNDTRIP-PHASE4-READINESS',
    'phase-4',
    'ObservePlanRunReadiness',
    'query',
    'declared',
    'closed',
    false,
    true,
    'https://github.com/dunay2/dvt/pull/1962',
    'f65d187319db03651c000e7907f4ddb8f3b0ea17',
    'PR 1962 mapped file-projection diagnostics and revision posture into readiness.',
    'tools/planning-db/migrations/726_dbt_project_roundtrip_capability_truth_projection.sql'
  ),
  (
    'DBT-ROUNDTRIP-PHASE4-START-RUN',
    'phase-4',
    'StartRun',
    'command',
    'implemented',
    'documented',
    false,
    true,
    'https://github.com/dunay2/dvt/pull/1962',
    'f65d187319db03651c000e7907f4ddb8f3b0ea17',
    'PR 1962 admitted only revision-matched, secret-free DBT bundles into StartRun.',
    'tools/planning-db/migrations/726_dbt_project_roundtrip_capability_truth_projection.sql'
  ),
  (
    'DBT-ROUNDTRIP-PHASE6-EXPORT-DEFERRED',
    'phase-6',
    'ExportDbtProject',
    'command',
    'retired',
    'closed',
    true,
    false,
    'https://github.com/dunay2/dvt/pull/1818',
    '800be353aee4bf85c03be671e142fe7d5dd11df1',
    'The accepted 0.2.0 plan baseline kept authoritative export deferred and fail-closed.',
    'tools/planning-db/migrations/726_dbt_project_roundtrip_capability_truth_projection.sql'
  )
on conflict (evidence_id) do update set
  phase_id = excluded.phase_id,
  rail_name = excluded.rail_name,
  expected_rail_type = excluded.expected_rail_type,
  expected_rail_status = excluded.expected_rail_status,
  expected_mechanization_status = excluded.expected_mechanization_status,
  expected_is_gap = excluded.expected_is_gap,
  expected_implemented = excluded.expected_implemented,
  reviewed_pr_url = excluded.reviewed_pr_url,
  reviewed_commit_sha = excluded.reviewed_commit_sha,
  evidence_summary = excluded.evidence_summary,
  source_path = excluded.source_path,
  updated_at = now();

create or replace view planning_query_store.dbt_project_roundtrip_capability_status_query as
with phase_counts as (
  select
    phase.phase_id,
    count(evidence.evidence_id)::integer as actual_rail_count
  from planning_query_store.dbt_project_roundtrip_phases phase
  left join planning_query_store.dbt_project_roundtrip_phase_rail_evidence evidence
    on evidence.phase_id = phase.phase_id
  group by phase.phase_id
)
select
  phase.phase_id,
  phase.phase_order,
  phase.phase_name,
  phase.expected_rail_count as phase_expected_rail_count,
  phase_counts.actual_rail_count as phase_actual_rail_count,
  evidence.expected_rail_type as rail_type,
  evidence.rail_name,
  rail.ddd_owner,
  evidence.expected_rail_status,
  rail.rail_status,
  evidence.expected_mechanization_status,
  rail.mechanization_status,
  evidence.expected_is_gap,
  rail.is_gap,
  evidence.expected_implemented,
  rail.implementation_ref_count,
  rail.is_duplicate,
  case
    when phase_counts.actual_rail_count <> phase.expected_rail_count then 'evidence_gap'
    when evidence.evidence_id is null then 'evidence_gap'
    when rail.rail_id is null then 'rail_missing'
    when rail.is_duplicate then 'duplicate_rail'
    when rail.rail_type <> evidence.expected_rail_type then 'rail_type_drift'
    when rail.rail_status <> evidence.expected_rail_status then 'rail_status_drift'
    when rail.mechanization_status <> evidence.expected_mechanization_status
      then 'mechanization_status_drift'
    when rail.is_gap <> evidence.expected_is_gap then 'gap_posture_drift'
    when (rail.implementation_ref_count > 0) <> evidence.expected_implemented
      then 'implementation_evidence_drift'
    else 'current'
  end as projection_state,
  evidence.reviewed_pr_url,
  evidence.reviewed_commit_sha,
  evidence.evidence_summary,
  evidence.source_path
from planning_query_store.dbt_project_roundtrip_phases phase
join phase_counts using (phase_id)
left join planning_query_store.dbt_project_roundtrip_phase_rail_evidence evidence
  on evidence.phase_id = phase.phase_id
left join planning_query_store.command_query_rail_query rail
  on rail.rail_name = evidence.rail_name;

insert into architecture.design (
  design_id, work_item_id, title, owner, status, rationale, fowler_signal,
  rail_ref, approved_at
)
values (
  'DBT-ROUNDTRIP-CAPABILITY-TRUTH-PROJECTION-20260717',
  'E-DBT-PROJECT-ROUNDTRIP-P4-TRUTH-SYNC',
  'DBT round-trip capability truth projection',
  'Architecture / Planning DB / CI',
  'implemented',
  'Current DBT round-trip capability posture is projected from normalized phase evidence and the canonical command/query catalog. A separate generator adapter verifies reviewed Git ancestry and renders an ignored local reading surface.',
  'hidden_authority',
  'ProjectDbtRoundtripCapabilityStatus',
  now()
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  approved_at = excluded.approved_at,
  updated_at = now();

insert into architecture.design_scope (
  design_id, subject_kind, subject_id, scope_kind, required
)
values
  ('DBT-ROUNDTRIP-CAPABILITY-TRUTH-PROJECTION-20260717', 'component', 'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-DBT-ROUNDTRIP', 'may_create', true),
  ('DBT-ROUNDTRIP-CAPABILITY-TRUTH-PROJECTION-20260717', 'component', 'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-DBT-ROUNDTRIP', 'may_create', true),
  ('DBT-ROUNDTRIP-CAPABILITY-TRUTH-PROJECTION-20260717', 'query', 'ProjectDbtRoundtripCapabilityStatus', 'may_create', true),
  ('DBT-ROUNDTRIP-CAPABILITY-TRUTH-PROJECTION-20260717', 'path', 'scripts/planning-db/queries/dbt-project-roundtrip-capability-status-query.cjs', 'may_create', true),
  ('DBT-ROUNDTRIP-CAPABILITY-TRUTH-PROJECTION-20260717', 'path', 'scripts/generate-dbt-project-roundtrip-capability-status.cjs', 'may_create', true),
  ('DBT-ROUNDTRIP-CAPABILITY-TRUTH-PROJECTION-20260717', 'test', 'TEST-DBT-ROUNDTRIP-CAPABILITY-QUERY', 'must_prove', true),
  ('DBT-ROUNDTRIP-CAPABILITY-TRUTH-PROJECTION-20260717', 'test', 'TEST-DBT-ROUNDTRIP-CAPABILITY-GENERATOR', 'must_prove', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

insert into architecture.component (
  component_id, name, kind, layer, owner, repo_path, public_contract,
  runtime, criticality, status, parent_component_id
)
values
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-DBT-ROUNDTRIP',
    'Planning DB DBT round-trip capability read model',
    'module',
    'infra',
    'DbtProjectRoundtripCapabilityStatus',
    'scripts/planning-db/queries/dbt-project-roundtrip-capability-status-query.cjs',
    'ProjectDbtRoundtripCapabilityStatus',
    'node',
    'high',
    'implemented',
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY'
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-DBT-ROUNDTRIP',
    'Generated DBT round-trip capability status',
    'adapter',
    'infra',
    'DbtProjectRoundtripCapabilityStatusRenderer',
    'scripts/generate-dbt-project-roundtrip-capability-status.cjs',
    'DB-backed status render and reviewed Git ancestry check',
    'node',
    'high',
    'implemented',
    'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION'
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

insert into architecture.component_responsibility (
  responsibility_id, component_id, responsibility, reason_to_change, ddd_owner, status
)
values
  (
    'RESP-DBT-ROUNDTRIP-CAPABILITY-QUERY',
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-DBT-ROUNDTRIP',
    'Project normalized DBT round-trip phase expectations against canonical command/query rail state.',
    'DBT round-trip phase coverage, expected rail posture, or projection classification changes.',
    'DbtProjectRoundtripCapabilityStatus',
    'implemented'
  ),
  (
    'RESP-DBT-ROUNDTRIP-CAPABILITY-GENERATOR',
    'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-DBT-ROUNDTRIP',
    'Verify reviewed Git commit ancestry and render the DB-owned capability projection locally.',
    'Reviewed evidence validation, deterministic Markdown rendering, or generated status policy changes.',
    'DbtProjectRoundtripCapabilityStatusRenderer',
    'implemented'
  )
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

insert into architecture.component_relation (
  relation_id, source_component_id, target_component_id, relation_type,
  direction, sync_async, contract_id, failure_mode, authorization_scope,
  source_refs, status
)
values
  (
    'REL-PLANNING-DB-QUERY-CONTAINS-DBT-ROUNDTRIP',
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY',
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-DBT-ROUNDTRIP',
    'contains', 'outbound', 'sync', null, 'not_applicable',
    'repo-local component ownership',
    jsonb_build_array('scripts/planning-db/queries/dbt-project-roundtrip-capability-status-query.cjs'),
    'implemented'
  ),
  (
    'REL-DOCS-GENERATION-CONTAINS-DBT-ROUNDTRIP',
    'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION',
    'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-DBT-ROUNDTRIP',
    'contains', 'outbound', 'sync', null, 'not_applicable',
    'repo-local component ownership',
    jsonb_build_array('scripts/generate-dbt-project-roundtrip-capability-status.cjs'),
    'implemented'
  ),
  (
    'REL-DBT-ROUNDTRIP-STATUS-GENERATOR-READS-QUERY',
    'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-DBT-ROUNDTRIP',
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-DBT-ROUNDTRIP',
    'reads', 'outbound', 'sync', null,
    'Projection drift or unavailable Planning DB fails status generation.',
    'repo-local governance read',
    jsonb_build_array('ProjectDbtRoundtripCapabilityStatus'),
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
  port_id, component_id, port_name, port_kind, direction,
  input_contract_id, output_contract_id, negative_tests, status
)
values
  (
    'PORT-DBT-ROUNDTRIP-CAPABILITY-QUERY-IN',
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-DBT-ROUNDTRIP',
    'ProjectDbtRoundtripCapabilityStatus',
    'query', 'inbound', null, null,
    array[
      'missing phase/rail evidence',
      'duplicate canonical rail',
      'rail or mechanization posture drift'
    ]::text[],
    'implemented'
  ),
  (
    'PORT-DBT-ROUNDTRIP-CAPABILITY-RENDER-IN',
    'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-DBT-ROUNDTRIP',
    'ProjectDbtRoundtripCapabilityStatus',
    'query', 'inbound', null, null,
    array[
      'missing reviewed commit',
      'non-ancestor reviewed commit',
      'stale local generated render'
    ]::text[],
    'implemented'
  )
on conflict (port_id) do update set
  component_id = excluded.component_id,
  port_name = excluded.port_name,
  port_kind = excluded.port_kind,
  direction = excluded.direction,
  negative_tests = excluded.negative_tests,
  status = excluded.status;

insert into architecture.component_storage_io (
  storage_io_id, component_id, storage_object, direction, access_pattern, contract_id
)
values
  ('STORAGE-DBT-ROUNDTRIP-QUERY-PHASES', 'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-DBT-ROUNDTRIP', 'planning_query_store.dbt_project_roundtrip_phases', 'reads', 'projection', null),
  ('STORAGE-DBT-ROUNDTRIP-QUERY-EVIDENCE', 'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-DBT-ROUNDTRIP', 'planning_query_store.dbt_project_roundtrip_phase_rail_evidence', 'reads', 'projection', null),
  ('STORAGE-DBT-ROUNDTRIP-QUERY-RAILS', 'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-DBT-ROUNDTRIP', 'planning_query_store.command_query_rail_query', 'reads', 'projection', null),
  ('STORAGE-DBT-ROUNDTRIP-GENERATOR-PROJECTION', 'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-DBT-ROUNDTRIP', 'planning_query_store.dbt_project_roundtrip_capability_status_query', 'reads', 'projection', null),
  ('STORAGE-DBT-ROUNDTRIP-GENERATOR-GIT', 'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-DBT-ROUNDTRIP', 'git commit graph', 'reads', 'read_only', null),
  ('STORAGE-DBT-ROUNDTRIP-GENERATOR-OUTPUT', 'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-DBT-ROUNDTRIP', '.generated-docs/planning/status/generated-dbt-project-roundtrip-capability-status.md', 'writes', 'projection', null)
on conflict (storage_io_id) do update set
  component_id = excluded.component_id,
  storage_object = excluded.storage_object,
  direction = excluded.direction,
  access_pattern = excluded.access_pattern,
  contract_id = excluded.contract_id;

insert into architecture.component_test (
  test_id, component_id, test_path, test_kind, coverage_level, required,
  validation_command
)
values
  (
    'TEST-DBT-ROUNDTRIP-CAPABILITY-QUERY',
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-DBT-ROUNDTRIP',
    'scripts/planning-db-query-tests/dbt-roundtrip-capabilities.test.cjs',
    'unit', 'behavior', true,
    'node --test scripts/planning-db-query-tests/dbt-roundtrip-capabilities.test.cjs'
  ),
  (
    'TEST-DBT-ROUNDTRIP-CAPABILITY-GENERATOR',
    'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-DBT-ROUNDTRIP',
    'scripts/generate-dbt-project-roundtrip-capability-status.test.cjs',
    'unit', 'negative', true,
    'node --test scripts/generate-dbt-project-roundtrip-capability-status.test.cjs'
  )
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

insert into planning_query_store.governance_component_local_definitions (
  component_id, source_path, source_content_sha256, revision, name, level,
  parent_id, root_unit, domain_unit, status, children_required, owned_concern,
  ddd_owner, cq_rails, created_by
)
values
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-DBT-ROUNDTRIP',
    'tools/planning-db/migrations/726_dbt_project_roundtrip_capability_truth_projection.sql',
    repeat(md5('SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-DBT-ROUNDTRIP:726'), 2),
    0,
    'Planning DB DBT round-trip capability read model',
    'component',
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY',
    'SYS-DVT',
    'SYS-DVT',
    'canonical',
    false,
    'Own current DBT round-trip phase/rail posture projection from normalized evidence and canonical rail state.',
    'DbtProjectRoundtripCapabilityStatus',
    'ProjectDbtRoundtripCapabilityStatus',
    'codex'
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-DBT-ROUNDTRIP',
    'tools/planning-db/migrations/726_dbt_project_roundtrip_capability_truth_projection.sql',
    repeat(md5('SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-DBT-ROUNDTRIP:726'), 2),
    0,
    'Generated DBT round-trip capability status',
    'component',
    'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION',
    'SYS-DVT',
    'SYS-DVT',
    'canonical',
    false,
    'Own reviewed Git ancestry verification and deterministic local rendering of DB-owned DBT capability truth.',
    'DbtProjectRoundtripCapabilityStatusRenderer',
    'ProjectDbtRoundtripCapabilityStatus',
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

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id, pattern_kind, pattern, pattern_order
)
values
  ('SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-DBT-ROUNDTRIP', 'owns', 'scripts/planning-db/queries/dbt-project-roundtrip-capability-status-query.cjs', 0),
  ('SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-DBT-ROUNDTRIP', 'owns', 'scripts/generate-dbt-project-roundtrip-capability-status.cjs', 0),
  ('SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-DBT-ROUNDTRIP', 'owns', 'scripts/generate-dbt-project-roundtrip-capability-status.test.cjs', 1)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id, item_kind, item_value, item_order
)
values
  ('SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-DBT-ROUNDTRIP', 'responsibility', 'Project DBT phase expectations against canonical rail posture.', 0),
  ('SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-DBT-ROUNDTRIP', 'reason_to_change', 'DBT phase coverage or rail posture comparison changes.', 0),
  ('SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-DBT-ROUNDTRIP', 'invariant', 'Current rail status is read only from planning_query_store.command_query_rail_query.', 0),
  ('SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-DBT-ROUNDTRIP', 'public_api', 'ProjectDbtRoundtripCapabilityStatus', 0),
  ('SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-DBT-ROUNDTRIP', 'transition', 'Normalized phase evidence and canonical rail posture become one current-or-drift row per expected phase rail.', 0),
  ('SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-DBT-ROUNDTRIP', 'consumer', 'Planning DB query CLI;Generated DBT round-trip capability status adapter', 0),
  ('SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-DBT-ROUNDTRIP', 'fowler_signal', 'hidden_authority resolved by a single DB projection', 0),
  ('SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-DBT-ROUNDTRIP', 'responsibility', 'Verify reviewed Git evidence and render DB-owned capability truth locally.', 0),
  ('SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-DBT-ROUNDTRIP', 'reason_to_change', 'Git evidence policy, render shape, or stale-output behavior changes.', 0),
  ('SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-DBT-ROUNDTRIP', 'invariant', 'Generated Markdown is an ignored read surface and never a planning authority.', 0),
  ('SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-DBT-ROUNDTRIP', 'public_api', 'docs:dbt-roundtrip-capabilities:generate;docs:dbt-roundtrip-capabilities:check', 0),
  ('SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-DBT-ROUNDTRIP', 'transition', 'Current DB projection rows and a checked Git ref become one deterministic local report or a fail-closed evidence rejection.', 0),
  ('SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-DBT-ROUNDTRIP', 'consumer', 'Governance refresh;Documentation validation;Repository operators', 0),
  ('SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-DBT-ROUNDTRIP', 'fowler_signal', 'separated_interface between DB projection and Git evidence adapter', 0)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

insert into planning_query_store.feature_mechanization_local_rails (
  rail_id, feature_id, mechanization_status, rail_name,
  normalized_rail_name, rail_type, ddd_owner, rail_status, symbol_refs,
  implementation_refs, documentation_refs, governing_sources,
  allowed_implementation_surfaces, architecture_guards, completion_gate,
  source_path, source_content_sha256, raw_rail, raw_manifest, revision,
  created_by
)
values (
  'local#E-DBT-PROJECT-ROUNDTRIP-P4-TRUTH-SYNC#query#projectdbtroundtripcapabilitystatus',
  'E-DBT-PROJECT-ROUNDTRIP-P4-TRUTH-SYNC',
  'implemented',
  'ProjectDbtRoundtripCapabilityStatus',
  'projectdbtroundtripcapabilitystatus',
  'query',
  'DbtProjectRoundtripCapabilityStatus',
  'implemented',
  jsonb_build_array(
    'scripts/planning-db/queries/dbt-project-roundtrip-capability-status-query.cjs#readDbtProjectRoundtripCapabilityStatusRows',
    'scripts/generate-dbt-project-roundtrip-capability-status.cjs#validateDbtRoundtripCapabilityRows'
  ),
  jsonb_build_array(
    'scripts/planning-db/queries/dbt-project-roundtrip-capability-status-query.cjs',
    'scripts/planning-db-query.cjs',
    'scripts/planning-db-query-tests/dbt-roundtrip-capabilities.test.cjs',
    'scripts/generate-dbt-project-roundtrip-capability-status.cjs',
    'scripts/generate-dbt-project-roundtrip-capability-status.test.cjs',
    'scripts/planning-db-dbt-roundtrip-capability-status.test.cjs',
    'tools/planning-db/migrations/726_dbt_project_roundtrip_capability_truth_projection.sql'
  ),
  jsonb_build_array(
    'docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md'
  ),
  jsonb_build_array(
    'AGENTS.md',
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md'
  ),
  jsonb_build_array(
    'scripts/planning-db/queries/dbt-project-roundtrip-capability-status-query.cjs',
    'scripts/planning-db-query.cjs',
    'scripts/planning-db-query-tests/dbt-roundtrip-capabilities.test.cjs',
    'scripts/generate-dbt-project-roundtrip-capability-status.cjs',
    'scripts/generate-dbt-project-roundtrip-capability-status.test.cjs',
    'scripts/planning-db-dbt-roundtrip-capability-status.test.cjs',
    'tools/planning-db/migrations/726_dbt_project_roundtrip_capability_truth_projection.sql'
  ),
  jsonb_build_array(
    'node --test scripts/planning-db-query-tests/dbt-roundtrip-capabilities.test.cjs scripts/generate-dbt-project-roundtrip-capability-status.test.cjs scripts/planning-db-dbt-roundtrip-capability-status.test.cjs'
  ),
  jsonb_build_array(
    'pnpm planning:db:migrate',
    'pnpm planning:db:query dbt-roundtrip-capabilities --limit 20',
    'pnpm docs:dbt-roundtrip-capabilities:check',
    'pnpm governance:refresh',
    'pnpm verify:prepush'
  ),
  'tools/planning-db/migrations/726_dbt_project_roundtrip_capability_truth_projection.sql',
  md5('E-DBT-PROJECT-ROUNDTRIP-P4-TRUTH-SYNC:ProjectDbtRoundtripCapabilityStatus:726'),
  jsonb_build_object(
    'name', 'ProjectDbtRoundtripCapabilityStatus',
    'type', 'query',
    'status', 'implemented',
    'dddOwner', 'DbtProjectRoundtripCapabilityStatus'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'E-DBT-PROJECT-ROUNDTRIP-P4-TRUTH-SYNC',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan', 'Project normalized DBT round-trip phase evidence against the canonical command/query catalog, verify reviewed commits against Git ancestry, and render a local generated status surface.',
    'componentGuides', jsonb_build_array(
      'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-DBT-ROUNDTRIP',
      'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-DBT-ROUNDTRIP'
    ),
    'userStories', jsonb_build_array(
      'An operator can query the current Phase 2-4 DBT round-trip rails without interpreting a stale plan table.',
      'A reviewer receives a failing check when rail posture or reviewed Git ancestry drifts.',
      'Deferred export remains visible as an explicit retired gap instead of disappearing from current-state reporting.'
    ),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md'
    ),
    'allowedImplementationSurfaces', jsonb_build_array(
      'scripts/planning-db/queries/dbt-project-roundtrip-capability-status-query.cjs',
      'scripts/planning-db-query.cjs',
      'scripts/planning-db-query-tests/dbt-roundtrip-capabilities.test.cjs',
      'scripts/generate-dbt-project-roundtrip-capability-status.cjs',
      'scripts/generate-dbt-project-roundtrip-capability-status.test.cjs',
      'scripts/planning-db-dbt-roundtrip-capability-status.test.cjs',
      'tools/planning-db/migrations/726_dbt_project_roundtrip_capability_truth_projection.sql'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'docs/**#manual_current_capability_table',
      'scripts/**#parallel_command_query_catalog'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', 'ProjectDbtRoundtripCapabilityStatus',
        'type', 'query',
        'dddOwner', 'DbtProjectRoundtripCapabilityStatus',
        'status', 'implemented'
      )
    ),
    'domainObjects', jsonb_build_array(
      jsonb_build_object(
        'name', 'DbtProjectRoundtripCapabilityStatus',
        'type', 'read-model',
        'owner', 'Architecture / Planning DB'
      ),
      jsonb_build_object(
        'name', 'DbtProjectRoundtripPhaseRailEvidence',
        'type', 'entity',
        'owner', 'Architecture / Planning DB'
      )
    ),
    'fowlerSignals', jsonb_build_array(
      'documentation_drift',
      'single_source_of_truth',
      'separated_interface'
    ),
    'architectureGuards', jsonb_build_array(
      jsonb_build_object(
        'name', 'DBT round-trip capability projection tests',
        'command', 'node --test scripts/planning-db-query-tests/dbt-roundtrip-capabilities.test.cjs scripts/generate-dbt-project-roundtrip-capability-status.test.cjs scripts/planning-db-dbt-roundtrip-capability-status.test.cjs'
      )
    ),
    'cypressFlows', jsonb_build_array(
      jsonb_build_object(
        'name', 'not_applicable:governance_read_model',
        'command', 'pnpm docs:dbt-roundtrip-capabilities:check'
      )
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'dbt-roundtrip-capability-truth',
        'redTest', 'node --test scripts/planning-db-query-tests/dbt-roundtrip-capabilities.test.cjs scripts/generate-dbt-project-roundtrip-capability-status.test.cjs scripts/planning-db-dbt-roundtrip-capability-status.test.cjs',
        'expectedFailure', 'No DB projection, query adapter, Git ancestry checker, or relational component ownership exists.',
        'patchSurfaces', jsonb_build_array(
          'scripts/planning-db/queries/dbt-project-roundtrip-capability-status-query.cjs',
          'scripts/generate-dbt-project-roundtrip-capability-status.cjs',
          'tools/planning-db/migrations/726_dbt_project_roundtrip_capability_truth_projection.sql'
        ),
        'greenTest', 'pnpm docs:dbt-roundtrip-capabilities:check'
      )
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object(
        'name', 'readDbtProjectRoundtripCapabilityStatusRows',
        'path', 'scripts/planning-db/queries/dbt-project-roundtrip-capability-status-query.cjs',
        'dddOwner', 'DbtProjectRoundtripCapabilityStatus',
        'cqRails', jsonb_build_array('ProjectDbtRoundtripCapabilityStatus'),
        'fowlerSignals', jsonb_build_array('query_model'),
        'architectureGuard', 'scripts/planning-db-query-tests/dbt-roundtrip-capabilities.test.cjs',
        'cypressCoverage', 'not_applicable:governance_read_model',
        'unitTests', jsonb_build_array('scripts/planning-db-query-tests/dbt-roundtrip-capabilities.test.cjs')
      ),
      jsonb_build_object(
        'name', 'validateDbtRoundtripCapabilityRows',
        'path', 'scripts/generate-dbt-project-roundtrip-capability-status.cjs',
        'dddOwner', 'DbtProjectRoundtripCapabilityStatusRenderer',
        'cqRails', jsonb_build_array('ProjectDbtRoundtripCapabilityStatus'),
        'fowlerSignals', jsonb_build_array('fail_closed', 'separated_interface'),
        'architectureGuard', 'scripts/generate-dbt-project-roundtrip-capability-status.test.cjs',
        'cypressCoverage', 'not_applicable:governance_read_model',
        'unitTests', jsonb_build_array('scripts/generate-dbt-project-roundtrip-capability-status.test.cjs')
      )
    ),
    'completionGate', jsonb_build_array(
      'pnpm planning:db:migrate',
      'pnpm planning:db:query dbt-roundtrip-capabilities --limit 20',
      'pnpm docs:dbt-roundtrip-capabilities:check',
      'pnpm governance:refresh',
      'pnpm verify:prepush'
    )
  ),
  0,
  'codex'
)
on conflict (rail_id) do update set
  feature_id = excluded.feature_id,
  mechanization_status = excluded.mechanization_status,
  rail_name = excluded.rail_name,
  normalized_rail_name = excluded.normalized_rail_name,
  rail_type = excluded.rail_type,
  ddd_owner = excluded.ddd_owner,
  rail_status = excluded.rail_status,
  symbol_refs = excluded.symbol_refs,
  implementation_refs = excluded.implementation_refs,
  documentation_refs = excluded.documentation_refs,
  governing_sources = excluded.governing_sources,
  allowed_implementation_surfaces = excluded.allowed_implementation_surfaces,
  architecture_guards = excluded.architecture_guards,
  completion_gate = excluded.completion_gate,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  raw_rail = excluded.raw_rail,
  raw_manifest = excluded.raw_manifest,
  revision = planning_query_store.feature_mechanization_local_rails.revision + 1,
  updated_at = now();

do $$
declare
  phase_count integer;
  evidence_count integer;
  drift_count integer;
  component_count integer;
  relation_count integer;
  rail_count integer;
begin
  select count(*) into phase_count
  from planning_query_store.dbt_project_roundtrip_phases;
  select count(*) into evidence_count
  from planning_query_store.dbt_project_roundtrip_phase_rail_evidence;
  select count(*) into drift_count
  from planning_query_store.dbt_project_roundtrip_capability_status_query
  where projection_state <> 'current';
  select count(*) into component_count
  from architecture.component
  where component_id in (
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-DBT-ROUNDTRIP',
    'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-DBT-ROUNDTRIP'
  );
  select count(*) into relation_count
  from architecture.component_relation
  where relation_id = 'REL-DBT-ROUNDTRIP-STATUS-GENERATOR-READS-QUERY';
  select count(*) into rail_count
  from planning_query_store.command_query_rail_query
  where rail_name = 'ProjectDbtRoundtripCapabilityStatus'
    and rail_type = 'query'
    and rail_status = 'implemented'
    and not is_duplicate
    and not is_gap;

  if phase_count <> 4 or evidence_count <> 8 then
    raise exception 'DBT round-trip truth projection requires 4 phases and 8 relational rail rows, found % phases and % rows', phase_count, evidence_count;
  end if;
  if drift_count <> 0 then
    raise exception 'DBT round-trip truth projection contains % drift rows at migration time', drift_count;
  end if;
  if component_count <> 2 or relation_count <> 1 then
    raise exception 'DBT round-trip truth projection component model is incomplete';
  end if;
  if rail_count <> 1 then
    raise exception 'ProjectDbtRoundtripCapabilityStatus must resolve to one current canonical query rail, found %', rail_count;
  end if;
end
$$;
