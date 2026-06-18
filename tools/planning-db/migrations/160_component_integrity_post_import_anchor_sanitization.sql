-- Keep architecture.component repo_path anchors unique and filesystem-backed
-- after a full governance import. These are component metadata repairs only:
-- no validation rule is relaxed and no source file is recreated.

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
  'PLANNING-DB-COMPONENT-INTEGRITY-POST-IMPORT-ANCHOR-SANITIZATION-20260618',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Planning DB component post-import anchor sanitization',
  'Architecture / Planning DB',
  'review',
  'A recovered Planning DB can retain imported architecture rows while schema_migrations reports the historical sanitization migrations as applied. The integrity rail requires unique repo_path anchors and real filesystem-backed component paths, so this migration reapplies the governed canonical anchors after imports without deleting history or weakening the checks.',
  'hidden_authority',
  'RecordArchitectureComponent;CheckPlanningDbComponentIntegrity',
  now()
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
  'PLANNING-DB-COMPONENT-INTEGRITY-POST-IMPORT-ANCHOR-SANITIZATION-20260618',
  'component',
  component_id,
  'may_update',
  true
from (
  values
    ('SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS'),
    ('SYS-CONTRACTS-PACKAGE-TESTS'),
    ('SYS-REPO-METADATA-FOWLER-INBOX'),
    ('SYS-REPO-METADATA-INFRA-DB-MIGRATIONS'),
    ('SYS-CI-GOVERNANCE-ROOT'),
    ('SYS-CI-GOVERNANCE-SCRIPTS'),
    ('SYS-CONTRACTS-ROOT'),
    ('SYS-OBSERVABILITY-ROOT'),
    ('SYS-PLANNER-ROOT'),
    ('SYS-PLANSTORE-API-COMPOSITION'),
    ('SYS-PLANSTORE-ARTIFACTS-PACKAGE-SHELL'),
    ('SYS-PLANSTORE-CONTRACTS'),
    ('SYS-PLANSTORE-ENGINE-FETCH'),
    ('SYS-PLANSTORE-POSTGRES'),
    ('SYS-PLANSTORE-TEMPORAL-COMPOSITION'),
    ('SYS-REPO-METADATA-ROOT'),
    ('SYS-TRACEABILITY-ROOT'),
    ('SYS-WORKERS-ROOT')
) scoped_components(component_id)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update architecture.component
set
  repo_path = case component_id
    when 'SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS'
      then 'tools/planning-db/migrations/001_content_read_model.sql'
    when 'SYS-CONTRACTS-PACKAGE-TESTS'
      then 'packages/@dvt/contracts/test/plan-version.contract.test.ts'
    when 'SYS-REPO-METADATA-FOWLER-INBOX'
      then 'buzon/pretest-inventory-db.md'
    when 'SYS-REPO-METADATA-INFRA-DB-MIGRATIONS'
      then 'infra/db/migrations/2026-03-04_g3_start_run_intent.sql'
    when 'SYS-CI-GOVERNANCE-ROOT'
      then '.github'
    when 'SYS-CI-GOVERNANCE-SCRIPTS'
      then 'scripts'
    when 'SYS-CONTRACTS-ROOT'
      then 'packages/@dvt/contracts'
    when 'SYS-OBSERVABILITY-ROOT'
      then 'packages/@dvt/observability/src'
    when 'SYS-PLANNER-ROOT'
      then 'packages/@dvt/planner/src'
    when 'SYS-PLANSTORE-API-COMPOSITION'
      then 'apps/api/src/application/services'
    when 'SYS-PLANSTORE-ARTIFACTS-PACKAGE-SHELL'
      then 'packages/@dvt/artifacts/src'
    when 'SYS-PLANSTORE-CONTRACTS'
      then 'packages/@dvt/artifacts/src/ports'
    when 'SYS-PLANSTORE-ENGINE-FETCH'
      then 'packages/@dvt/engine/src/security'
    when 'SYS-PLANSTORE-POSTGRES'
      then 'packages/@dvt/adapter-postgres/src'
    when 'SYS-PLANSTORE-TEMPORAL-COMPOSITION'
      then 'packages/@dvt/adapter-temporal/src'
    when 'SYS-REPO-METADATA-ROOT'
      then '.'
    when 'SYS-TRACEABILITY-ROOT'
      then 'packages/@dvt/traceability-service/src'
    when 'SYS-WORKERS-ROOT'
      then 'apps/outbox-worker'
    else repo_path
  end,
  updated_at = now()
where component_id in (
  'SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS',
  'SYS-CONTRACTS-PACKAGE-TESTS',
  'SYS-REPO-METADATA-FOWLER-INBOX',
  'SYS-REPO-METADATA-INFRA-DB-MIGRATIONS',
  'SYS-CI-GOVERNANCE-ROOT',
  'SYS-CI-GOVERNANCE-SCRIPTS',
  'SYS-CONTRACTS-ROOT',
  'SYS-OBSERVABILITY-ROOT',
  'SYS-PLANNER-ROOT',
  'SYS-PLANSTORE-API-COMPOSITION',
  'SYS-PLANSTORE-ARTIFACTS-PACKAGE-SHELL',
  'SYS-PLANSTORE-CONTRACTS',
  'SYS-PLANSTORE-ENGINE-FETCH',
  'SYS-PLANSTORE-POSTGRES',
  'SYS-PLANSTORE-TEMPORAL-COMPOSITION',
  'SYS-REPO-METADATA-ROOT',
  'SYS-TRACEABILITY-ROOT',
  'SYS-WORKERS-ROOT'
);
