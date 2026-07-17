-- Preserve the applied Planning DB migration identities while making numeric
-- ordinals unique for every migration created from this point forward.

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
  'PLANNING-DB-MIGRATION-ORDINAL-UNIQUENESS-20260717',
  'A-PLANNING-MIGRATION-ORDINAL-UNIQUENESS-1',
  'Planning DB migration ordinal uniqueness boundary',
  'Architecture / Planning DB / CI',
  'implemented',
  'Planning DB records applied migrations by complete filename stem, and historical numeric ordinals contain parallel-branch collisions. Renaming those applied files would replay their SQL. The migrator therefore fingerprints the immutable pre-722 filename history and requires unique ordinals at and above 722 before reading SQL or connecting to PostgreSQL.',
  'evolutionary_architecture',
  'PreparePlanningDbForCiGate',
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
  design_id,
  subject_kind,
  subject_id,
  scope_kind,
  required
)
values
  (
    'PLANNING-DB-MIGRATION-ORDINAL-UNIQUENESS-20260717',
    'component',
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-CORE',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-MIGRATION-ORDINAL-UNIQUENESS-20260717',
    'check',
    'PreparePlanningDbForCiGate',
    'may_reference',
    true
  ),
  (
    'PLANNING-DB-MIGRATION-ORDINAL-UNIQUENESS-20260717',
    'path',
    'scripts/planning-db-migrate.cjs',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-MIGRATION-ORDINAL-UNIQUENESS-20260717',
    'test',
    'TEST-SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-CORE',
    'may_update',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

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
  'EV-PLANNING-DB-MIGRATION-ORDINAL-UNIQUENESS',
  'component',
  'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-CORE',
  'test',
  'node --test scripts/planning-db-migrate.test.cjs',
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
