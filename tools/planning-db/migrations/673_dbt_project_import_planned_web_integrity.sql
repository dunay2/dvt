-- Keep the phase-three Web design explicit without presenting planned files or
-- tests as implemented evidence. Ownership patterns remain as creation intent;
-- concrete repo paths, tests, and implementation refs are attached only when
-- those files exist. The implemented contract receives its missing maturity
-- signal through the canonical architecture observability relation.

update architecture.component
set
  repo_path = '',
  updated_at = now()
where component_id in (
  'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT',
  'SYS-WEB-SERVICES-DBT-PROJECT-IMPORT',
  'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-CONTROLLER',
  'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-PRESENTATION'
)
and status = 'proposed';

delete from architecture.component_test
where test_id in (
  'TEST-WEB-DBT-PROJECT-IMPORT',
  'TEST-DBT-PROJECT-IMPORT-SOURCE-LIVE',
  'TEST-WEB-DBT-PROJECT-IMPORT-GATEWAY',
  'TEST-WEB-DBT-PROJECT-IMPORT-CONTROLLER',
  'TEST-WEB-DBT-PROJECT-IMPORT-PRESENTATION'
);

update architecture.component_relation
set
  source_refs = jsonb_build_array(
    'docs/architecture/components/web/graph/dbt-project-import-and-source-authority-component.md',
    'tools/planning-db/migrations/672_dbt_project_import_phase3_web_design.sql',
    'tools/planning-db/migrations/673_dbt_project_import_planned_web_integrity.sql'
  ),
  updated_at = now()
where relation_id in (
  'REL-WEB-DBT-IMPORT-CONTAINS-GATEWAY',
  'REL-WEB-DBT-IMPORT-CONTAINS-CONTROLLER',
  'REL-WEB-DBT-IMPORT-CONTAINS-PRESENTATION',
  'REL-WEB-DBT-IMPORT-CONTROLLER-CALLS-GATEWAY',
  'REL-WEB-DBT-IMPORT-PRESENTATION-CONSUMES-CONTROLLER',
  'REL-WEB-DBT-IMPORT-GATEWAY-CALLS-API'
)
and status = 'proposed';

insert into architecture.component_observability (
  observability_id,
  component_id,
  signal_name,
  signal_kind,
  required,
  status
)
values (
  'OBS-DBT-PROJECT-IMPORT-CONTRACT-COMPONENT-PROFILE',
  'SYS-CONTRACTS-DBT-PROJECT-IMPORT',
  'Dbt project import contract integrity is observable through component-profile, component-integrity, contract validation, and focused negative contract tests.',
  'dashboard',
  true,
  'implemented'
)
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;
