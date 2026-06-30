-- Deprecate the historical DiffViewHarness path that remains in the Planning
-- DB ownership snapshot even though the file is no longer present on disk.
-- Do not recreate the file; keep the old reference as legacy evidence.

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
  'PLANNING-DB-WEB-VIEWS-LEGACY-DIFF-HARNESS-DEPRECATION-20260618',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Web views legacy DiffView harness deprecation',
  'Architecture / Planning DB / Web',
  'review',
  'apps/web/src/app/views/test/DiffViewHarness.tsx is still present in the Planning DB ownership snapshot but is absent from the repository filesystem. The correct action is to deprecate the historical harness reference, not recreate a stub or leave SYS-WEB-ROOT owning it.',
  'boundary_drift',
  'CreateGovernanceComponent;RecordArchitectureComponent;RecordArchitectureRelation;RecordArchitectureTestEvidence;DetectGovernedSourceDrift',
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
values (
  'SYS-WEB-VIEWS-LEGACY-DIFF-HARNESS',
  'planning_query_store.governance_component_local_definitions',
  '1401401401401401401401401401401401401401401401401401401401401401',
  0,
  'Legacy DiffView test harness reference',
  'component',
  'SYS-WEB-APP-VIEWS',
  'SYS-DVT',
  'SYS-DVT',
  'legacy',
  false,
  'Owns the removed DiffViewHarness path as deprecated evidence so the Web root does not claim stale test support.',
  'DiffViewLegacyHarnessArchive',
  'DetectGovernedSourceDrift;ReadComponentProfile',
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
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values (
  'SYS-WEB-VIEWS-LEGACY-DIFF-HARNESS',
  'owns',
  'apps/web/src/app/views/test/DiffViewHarness.tsx',
  0
)
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
    'SYS-WEB-VIEWS-LEGACY-DIFF-HARNESS',
    'responsibility',
    'Represent the removed DiffViewHarness test-support path as deprecated Planning DB evidence.',
    0
  ),
  (
    'SYS-WEB-VIEWS-LEGACY-DIFF-HARNESS',
    'reason_to_change',
    'Historical DiffView harness references, component ownership snapshots, or Web view test support cleanup changes.',
    0
  ),
  (
    'SYS-WEB-VIEWS-LEGACY-DIFF-HARNESS',
    'invariant',
    'deprecated: apps/web/src/app/views/test/DiffViewHarness.tsx must not be recreated as a stub; active DiffView tests live under tracked DiffView test files.',
    0
  ),
  (
    'SYS-WEB-VIEWS-LEGACY-DIFF-HARNESS',
    'transition',
    'legacy -> superseded after the Planning DB source snapshot no longer emits the removed harness path.',
    0
  ),
  (
    'SYS-WEB-VIEWS-LEGACY-DIFF-HARNESS',
    'consumer',
    'Planning DB component-quality and Web route view QA queries',
    0
  ),
  (
    'SYS-WEB-VIEWS-LEGACY-DIFF-HARNESS',
    'governance_ref',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    0
  ),
  (
    'SYS-WEB-VIEWS-LEGACY-DIFF-HARNESS',
    'fowler_signal',
    'boundary_drift',
    0
  ),
  (
    'SYS-WEB-VIEWS-LEGACY-DIFF-HARNESS',
    'public_api',
    'apps/web/src/app/views/test/DiffViewHarness.tsx',
    0
  )
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
  'SYS-WEB-VIEWS-LEGACY-DIFF-HARNESS',
  'Legacy DiffView test harness reference',
  'module',
  'ui',
  'DiffViewLegacyHarnessArchive',
  'apps/web/src/app/views/test/DiffViewHarness.tsx',
  'Deprecated historical DiffView test harness reference; active behavior is covered by current DiffView tests.',
  'browser',
  'low',
  'deprecated',
  'SYS-WEB-APP-VIEWS'
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
values (
  'REL-WEB-APP-VIEWS-CONTAINS-LEGACY-DIFF-HARNESS',
  'SYS-WEB-APP-VIEWS',
  'SYS-WEB-VIEWS-LEGACY-DIFF-HARNESS',
  'contains',
  'outbound',
  'build_time',
  null,
  'Component profile becomes incomplete if the historical harness reference falls back to SYS-WEB-ROOT.',
  'repo-local Web view test support governance',
  jsonb_build_array(
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    'apps/web/src/app/views/DiffView.states.test.tsx'
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

insert into architecture.component_test (
  test_id,
  component_id,
  test_path,
  test_kind,
  coverage_level,
  required,
  validation_command
)
values (
  'TEST-SYS-WEB-VIEWS-LEGACY-DIFF-HARNESS',
  'SYS-WEB-VIEWS-LEGACY-DIFF-HARNESS',
  'scripts/planning-db-query.test.cjs',
  'architecture',
  'boundary',
  true,
  'pnpm planning:db:query component-profile --component SYS-WEB-VIEWS-LEGACY-DIFF-HARNESS --no-refresh --limit 80 && pnpm planning:db:query component-drift --component SYS-WEB-ROOT --no-refresh --limit 80'
)
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;
