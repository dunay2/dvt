-- Keep the Planning DB query aggregate off the CLI file path.
-- The CLI leaf owns scripts/planning-db-query.cjs; the parent points at the
-- read-model directory to avoid duplicate architecture repo_path findings.

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
  'PLANNING-DB-QUERY-PARENT-REPO-PATH-CANONICALIZATION-20260618',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Planning DB query parent repo path canonicalization',
  'Architecture / Planning DB / CI',
  'review',
  'The Planning DB query aggregate and CLI leaf both used scripts/planning-db-query.cjs as architecture repo_path. The CLI leaf is the canonical owner of that file; the parent aggregate points at scripts/planning-db/queries to avoid duplicate component identity.',
  'boundary_drift',
  'ValidateComponentIntegrity;ReadComponentProfile',
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
values
  (
    'PLANNING-DB-QUERY-PARENT-REPO-PATH-CANONICALIZATION-20260618',
    'component',
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-QUERY-PARENT-REPO-PATH-CANONICALIZATION-20260618',
    'component',
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-CLI',
    'may_reference',
    true
  ),
  (
    'PLANNING-DB-QUERY-PARENT-REPO-PATH-CANONICALIZATION-20260618',
    'path',
    'scripts/planning-db-query.cjs',
    'may_reference',
    true
  ),
  (
    'PLANNING-DB-QUERY-PARENT-REPO-PATH-CANONICALIZATION-20260618',
    'path',
    'scripts/planning-db/queries',
    'may_reference',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update architecture.component
set
  repo_path = 'scripts/planning-db/queries',
  public_contract = 'Composite planning:db:query read-model boundary; concrete files are owned by CLI, test, and read-model leaves.',
  updated_at = now()
where component_id = 'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY';
