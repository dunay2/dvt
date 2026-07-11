-- Command/query implementation evidence must come from production code. Tests,
-- Cypress specs, fixtures, and Planning DB migrations prove behavior or catalog
-- state; a textual rail-name mention in those files does not implement the rail.

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
  'PLANNING-DB-CQ-IMPLEMENTATION-EVIDENCE-20260711',
  'E-DBT-PROJECT-ROUNDTRIP-1',
  'Typed command/query implementation evidence',
  'Governance / Planning DB',
  'implemented',
  'Repository tests, Cypress specs, fixtures, and catalog migrations are evidence surfaces rather than product implementations. Excluding them prevents a planned or retired rail from becoming implemented through name matching alone.',
  'hidden_authority',
  'ImportCommandQueryRailCatalog',
  now()
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  approved_at = coalesce(architecture.design.approved_at, excluded.approved_at),
  updated_at = now();

insert into architecture.design_scope (
  design_id,
  subject_kind,
  subject_id,
  scope_kind,
  required
)
values
  (
    'PLANNING-DB-CQ-IMPLEMENTATION-EVIDENCE-20260711',
    'component',
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-CATALOGS',
    'must_prove',
    true
  ),
  (
    'PLANNING-DB-CQ-IMPLEMENTATION-EVIDENCE-20260711',
    'path',
    'scripts/planning-db/command-query-rail-reference-index.cjs',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-CQ-IMPLEMENTATION-EVIDENCE-20260711',
    'path',
    'scripts/planning-db/command-query-rail-reference-index.test.cjs',
    'must_prove',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values (
  'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-CATALOGS',
  'owns',
  'scripts/planning-db/command-query-rail-reference-index.test.cjs',
  18
)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

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
  'TEST-PLANNING-DB-CQ-IMPLEMENTATION-EVIDENCE',
  'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-CATALOGS',
  'scripts/planning-db/command-query-rail-reference-index.test.cjs',
  'unit',
  'behavior',
  true,
  'node --test scripts/planning-db/command-query-rail-reference-index.test.cjs'
)
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

insert into architecture.evidence (
  evidence_id,
  subject_kind,
  subject_id,
  evidence_kind,
  source_ref,
  result_state,
  recorded_at
)
values (
  'EV-PLANNING-DB-CQ-IMPLEMENTATION-EVIDENCE',
  'component',
  'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-CATALOGS',
  'test',
  'node --test scripts/planning-db/command-query-rail-reference-index.test.cjs',
  'pass',
  now()
)
on conflict (evidence_id) do update set
  subject_kind = excluded.subject_kind,
  subject_id = excluded.subject_id,
  evidence_kind = excluded.evidence_kind,
  source_ref = excluded.source_ref,
  result_state = excluded.result_state,
  recorded_at = excluded.recorded_at;
