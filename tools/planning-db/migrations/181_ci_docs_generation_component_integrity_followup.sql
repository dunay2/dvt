-- Close integrity gaps from the CI docs generation leaf split.
-- The aggregate must not share a repo_path with a concrete leaf, and high
-- criticality generated-doc leaves need explicit CI drift observability.

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
  'PLANNING-DB-CI-DOCS-GENERATION-INTEGRITY-FOLLOWUP-20260618',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Planning DB CI docs generation integrity follow-up',
  'Architecture / Planning DB / CI',
  'review',
  'The docs-generation aggregate is a policy boundary, while planning-view scripts are concrete leaves. Repointing the aggregate to docs/generated-docs-policy.json keeps repo_path ownership unique, and required observability records the real CI drift gates for high-criticality generated docs leaves.',
  'boundary_drift',
  'CheckPlanningDbComponentIntegrity;ReadComponentProfile',
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
    'PLANNING-DB-CI-DOCS-GENERATION-INTEGRITY-FOLLOWUP-20260618',
    'component',
    'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-CI-DOCS-GENERATION-INTEGRITY-FOLLOWUP-20260618',
    'component',
    'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-DOCS-SYNC',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-CI-DOCS-GENERATION-INTEGRITY-FOLLOWUP-20260618',
    'component',
    'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-PLANNING-VIEWS',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-CI-DOCS-GENERATION-INTEGRITY-FOLLOWUP-20260618',
    'path',
    'docs/generated-docs-policy.json',
    'may_reference',
    true
  ),
  (
    'PLANNING-DB-CI-DOCS-GENERATION-INTEGRITY-FOLLOWUP-20260618',
    'path',
    'scripts/generate-workboard.cjs',
    'may_reference',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update architecture.component
set
  repo_path = 'docs/generated-docs-policy.json',
  public_contract = 'Composite generated documentation policy boundary; concrete executable files resolve to semantic leaves.',
  updated_at = now()
where component_id = 'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION';

insert into architecture.component_observability (
  observability_id,
  component_id,
  signal_name,
  signal_kind,
  required,
  status
)
values
  (
    'OBS-SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-DOCS-SYNC-CI-DRIFT',
    'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-DOCS-SYNC',
    'docs:sync and generated-doc policy CI drift gate',
    'alert',
    true,
    'implemented'
  ),
  (
    'OBS-SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-PLANNING-VIEWS-CI-DRIFT',
    'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-PLANNING-VIEWS',
    'docs-workboard-check-changed CI drift gate',
    'alert',
    true,
    'implemented'
  )
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;
