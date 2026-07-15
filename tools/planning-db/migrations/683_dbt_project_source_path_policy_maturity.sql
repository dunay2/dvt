-- Close the maturity evidence discovered by the DB-first integrity query.
-- This pure policy emits no independent runtime signal; its callers own the
-- typed query outcome and boundary telemetry.

insert into architecture.component_observability (
  observability_id, component_id, signal_name, signal_kind, required, status
)
values (
  'OBS-DBT-PROJECT-SOURCE-PATH-POLICY-OUTCOME',
  'SYS-API-INFRA-DBT-PROJECT-SOURCE-PATH-POLICY',
  'The pure policy returns typed validation and path-partition outcomes; the analyzer and import query boundaries own logs and metrics.',
  'log',
  true,
  'not_applicable'
)
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;

insert into architecture.evidence (
  evidence_id, subject_kind, subject_id, evidence_kind, source_ref,
  result_state, source_content_sha256
)
values
  (
    'EVIDENCE-DBT-PROJECT-SOURCE-PATH-POLICY-UNIT',
    'component',
    'SYS-API-INFRA-DBT-PROJECT-SOURCE-PATH-POLICY',
    'test',
    'apps/api/test/infrastructure/dbt/dbtProjectPathPolicy.test.ts',
    'pass',
    repeat(md5('dbt-project-source-path-policy-unit:683'), 2)
  ),
  (
    'EVIDENCE-DBT-PROJECT-SOURCE-PATH-POLICY-DOC',
    'component',
    'SYS-API-INFRA-DBT-PROJECT-SOURCE-PATH-POLICY',
    'doc',
    'docs/architecture/components/web/graph/dbt-project-import-and-source-authority-component.md',
    'pass',
    repeat(md5('dbt-project-source-path-policy-doc:683'), 2)
  )
on conflict (evidence_id) do update set
  subject_kind = excluded.subject_kind,
  subject_id = excluded.subject_id,
  evidence_kind = excluded.evidence_kind,
  source_ref = excluded.source_ref,
  result_state = excluded.result_state,
  source_content_sha256 = excluded.source_content_sha256,
  recorded_at = now();

update planning_query_store.governance_component_local_definitions
set
  source_path = 'tools/planning-db/migrations/683_dbt_project_source_path_policy_maturity.sql',
  source_content_sha256 = repeat(md5('SYS-API-INFRA-DBT-PROJECT-SOURCE-PATH-POLICY:maturity:683'), 2),
  revision = revision + 1
where component_id = 'SYS-API-INFRA-DBT-PROJECT-SOURCE-PATH-POLICY';
