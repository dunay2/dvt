-- Close the DB-first integrity gaps introduced while the contract and API
-- slice became executable. Keep the Web projection as a design target without
-- claiming files or tests that do not exist yet.

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
    'OBS-CANVAS-AUTHORITY-BINDING-CONTRACT-VALIDATION',
    'SYS-CONTRACTS-CANVAS-AUTHORITY-BINDING',
    'Contract validity and authority exclusivity are observable through focused schema tests; runtime telemetry belongs to implementing adapters.',
    'log',
    true,
    'not_applicable'
  ),
  (
    'OBS-DBT-PROJECT-GRAPH-PROJECTION-RESULT',
    'SYS-API-APPLICATION-DBT-PROJECT-GRAPH',
    'Fresh, invalid, and unavailable projection states with normalized diagnostics are exposed through the protected ProjectDbtGraphFromFiles response.',
    'log',
    true,
    'implemented'
  ),
  (
    'OBS-DBT-PROJECT-ANALYZER-RESULT',
    'SYS-API-INFRA-DBT-PROJECT-ANALYZER',
    'Analyzer completion, rejection, timeout, and unavailable outcomes are normalized into typed analysis states and diagnostics without filesystem leakage.',
    'log',
    true,
    'implemented'
  )
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;

delete from architecture.component_test
where test_id = 'TEST-WEB-DBT-FILE-PROJECTION'
  and component_id = 'SYS-WEB-CANVAS-DBT-FILE-PROJECTION';

delete from architecture.component_observability
where component_id = 'SYS-WEB-CANVAS-DBT-FILE-PROJECTION';

delete from architecture.component_relation
where source_component_id = 'SYS-WEB-CANVAS-DBT-FILE-PROJECTION'
   or target_component_id = 'SYS-WEB-CANVAS-DBT-FILE-PROJECTION';

delete from architecture.component_responsibility
where component_id = 'SYS-WEB-CANVAS-DBT-FILE-PROJECTION';

delete from planning_query_store.governance_component_local_ownership_patterns
where component_id = 'SYS-WEB-CANVAS-DBT-FILE-PROJECTION';

delete from planning_query_store.governance_component_local_semantic_items
where component_id = 'SYS-WEB-CANVAS-DBT-FILE-PROJECTION';

delete from planning_query_store.governance_component_local_definitions
where component_id = 'SYS-WEB-CANVAS-DBT-FILE-PROJECTION';

delete from architecture.component
where component_id = 'SYS-WEB-CANVAS-DBT-FILE-PROJECTION'
  and status = 'proposed';

-- Migration 646 now owns the API integrity closeout. Reserve the following
-- immutable migrations for the Web and live-vertical closeouts.
update planning_query_store.feature_mechanization_local_rails
set
  implementation_refs = coalesce(implementation_refs, '[]'::jsonb)
    || jsonb_build_array('tools/planning-db/migrations/646_dbt_project_file_projection_phase2_integrity.sql'),
  allowed_implementation_surfaces = coalesce(allowed_implementation_surfaces, '[]'::jsonb)
    || jsonb_build_array(
      'tools/planning-db/migrations/647_dbt_project_file_projection_phase2_web_closeout.sql',
      'tools/planning-db/migrations/648_dbt_project_file_projection_phase2_live_closeout.sql'
    ),
  raw_manifest = jsonb_set(
    raw_manifest,
    '{allowedImplementationSurfaces}',
    coalesce(raw_manifest -> 'allowedImplementationSurfaces', '[]'::jsonb)
      || jsonb_build_array(
        'tools/planning-db/migrations/647_dbt_project_file_projection_phase2_web_closeout.sql',
        'tools/planning-db/migrations/648_dbt_project_file_projection_phase2_live_closeout.sql'
      ),
    true
  ),
  revision = revision + 1,
  updated_at = now()
where rail_id = 'local#E-DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713#query#projectdbtgraphfromfiles';

refresh materialized view planning_query_store.component_engineering_file_ownership_projection;
