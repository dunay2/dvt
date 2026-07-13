-- Harden the existing ProjectDbtGraphFromFiles query rail after review.
-- The HTTP adapter must prove both Canvas visibility and workspace-file read
-- authority; the dbt adapter must reject configured resource paths that can
-- escape the content snapshot used to derive the project revision.

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  (
    'SYS-API-APPLICATION-DBT-PROJECT-GRAPH',
    'invariant',
    'The protected projection requires both Canvas graph visibility and workspace-file read authority for the same tenant, project, and environment scope.',
    2
  ),
  (
    'SYS-API-INFRA-DBT-PROJECT-ANALYZER',
    'invariant',
    'Every dbt path configuration consumed by parse is statically relative and resolves inside the hashed project snapshot.',
    2
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update architecture.component_relation
set
  authorization_scope = 'workspace:graph-draft:view plus workspace:files:view with identical tenant/project/environment scope',
  failure_mode = 'Missing Canvas or file-read authority is denied before analysis; invalid input and escaping dbt path configuration never reach dbt parse.',
  updated_at = now()
where relation_id = 'REL-HTTP-WORKSPACE-ROUTES-CALLS-DBT-PROJECTION';

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values
  (
    'SYS-API-INFRA-DBT-PROJECT-ANALYZER',
    'owns',
    'apps/api/src/infrastructure/dbt/dbtProjectPathPolicy.ts',
    5
  ),
  (
    'SYS-API-INFRA-DBT-PROJECT-ANALYZER',
    'owns',
    'apps/api/test/infrastructure/dbt/dbtProjectPathPolicy.test.ts',
    7
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
values
  (
    'TEST-DBT-PROJECT-PATH-POLICY',
    'SYS-API-INFRA-DBT-PROJECT-ANALYZER',
    'apps/api/test/infrastructure/dbt/dbtProjectPathPolicy.test.ts',
    'unit',
    'negative',
    true,
    'pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/infrastructure/dbt/dbtProjectPathPolicy.test.ts test/infrastructure/dbt/DbtCliProjectAnalyzer.test.ts'
  )
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

with target_rail as (
  select *
  from planning_query_store.feature_mechanization_local_rails
  where rail_id = 'local#E-DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713#query#projectdbtgraphfromfiles'
), reconciled_surfaces as (
  select jsonb_agg(to_jsonb(surface) order by surface) as surfaces
  from (
    select surface
    from target_rail,
      lateral jsonb_array_elements_text(
        coalesce(allowed_implementation_surfaces, '[]'::jsonb)
      ) as item(surface)
    where surface not in (
      'tools/planning-db/migrations/653_dbt_project_file_projection_phase2_web_closeout.sql',
      'tools/planning-db/migrations/654_dbt_project_file_projection_phase2_live_closeout.sql'
    )

    union
    values
      ('apps/api/src/infrastructure/dbt/dbtProjectPathPolicy.ts'),
      ('apps/api/test/infrastructure/dbt/dbtProjectPathPolicy.test.ts'),
      ('tools/planning-db/migrations/653_dbt_project_file_projection_phase2_authority_path_hardening.sql'),
      ('tools/planning-db/migrations/654_dbt_project_file_projection_phase2_web_closeout.sql'),
      ('tools/planning-db/migrations/655_dbt_project_file_projection_phase2_live_closeout.sql')
  ) as all_surfaces(surface)
), negative_tests as (
  select jsonb_agg(to_jsonb(negative_test) order by negative_test) as tests
  from (
    select negative_test
    from target_rail,
      lateral jsonb_array_elements_text(
        coalesce(raw_manifest->'negativeTests', '[]'::jsonb)
      ) as item(negative_test)

    union
    values
      ('deny projection when workspace-file read authority is absent'),
      ('reject absolute, templated, or snapshot-escaping dbt path configuration before parse')
  ) as all_tests(negative_test)
)
update planning_query_store.feature_mechanization_local_rails rail
set
  implementation_refs = coalesce(rail.implementation_refs, '[]'::jsonb)
    || jsonb_build_array(
      'apps/api/src/infrastructure/dbt/dbtProjectPathPolicy.ts',
      'apps/api/test/infrastructure/dbt/dbtProjectPathPolicy.test.ts',
      'tools/planning-db/migrations/653_dbt_project_file_projection_phase2_authority_path_hardening.sql'
    ),
  allowed_implementation_surfaces = reconciled_surfaces.surfaces,
  raw_manifest = jsonb_set(
    jsonb_set(
      jsonb_set(
        rail.raw_manifest,
        '{scopeAndAuthorization}',
        to_jsonb('workspace:graph-draft:view plus workspace:files:view with identical tenant/project/environment scope and contained project root'::text),
        true
      ),
      '{negativeTests}',
      negative_tests.tests,
      true
    ),
    '{allowedImplementationSurfaces}',
    reconciled_surfaces.surfaces,
    true
  ),
  revision = rail.revision + 1,
  updated_at = now()
from reconciled_surfaces, negative_tests
where rail.rail_id = 'local#E-DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713#query#projectdbtgraphfromfiles';

update planning_query_store.governance_component_local_definitions
set
  source_path = 'tools/planning-db/migrations/653_dbt_project_file_projection_phase2_authority_path_hardening.sql',
  source_content_sha256 = repeat(md5(component_id || ':authority-path-hardening:653'), 2),
  revision = revision + 1
where component_id in (
  'SYS-API-APPLICATION-DBT-PROJECT-GRAPH',
  'SYS-API-INFRA-DBT-PROJECT-ANALYZER'
);
