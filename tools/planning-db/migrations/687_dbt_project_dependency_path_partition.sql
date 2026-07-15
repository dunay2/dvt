-- Correct the dbt path partition: generated output is disposable, while
-- installed packages are parse-time dependencies. Source budgets and bounded
-- inventory traversal are independent concerns.

insert into architecture.design_scope (
  design_id, subject_kind, subject_id, scope_kind, required
)
values
  ('DBT-PROJECT-IMPORT-PHASE3-20260714', 'component', 'SYS-API-INFRA-DBT-PROJECT-SOURCE-PATH-POLICY', 'may_update', true),
  ('DBT-PROJECT-IMPORT-PHASE3-20260714', 'component', 'SYS-API-INFRA-DBT-PROJECT-ANALYZER', 'may_update', true),
  ('DBT-PROJECT-IMPORT-PHASE3-20260714', 'component', 'SYS-API-INFRA-DBT-PROJECT-IMPORT-INSPECTOR', 'may_update', true),
  ('DBT-PROJECT-IMPORT-PHASE3-20260714', 'query', 'ValidateDbtProjectImport', 'may_update', true),
  ('DBT-PROJECT-IMPORT-PHASE3-20260714', 'query', 'ProjectDbtGraphFromFiles', 'may_update', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update planning_query_store.governance_component_local_definitions
set
  owned_concern = 'Partition project source, generated dbt output, and installed parse dependencies without hiding executable project content.',
  source_path = 'tools/planning-db/migrations/687_dbt_project_dependency_path_partition.sql',
  source_content_sha256 = repeat(md5(component_id || ':dependency-path-partition:687'), 2),
  revision = revision + 1,
  status = 'canonical'
where component_id = 'SYS-API-INFRA-DBT-PROJECT-SOURCE-PATH-POLICY';

update architecture.component_responsibility
set
  responsibility = 'Resolve one safe deterministic partition between project source, generated artifacts, and installed parse dependencies.',
  reason_to_change = 'dbt path configuration or source/dependency selection policy changes.',
  status = 'implemented'
where responsibility_id = 'RESP-DBT-PROJECT-SOURCE-PATH-POLICY';

update architecture.component_responsibility
set
  responsibility = 'Execute isolated dbt analysis over project source plus installed dependencies while excluding generated output.',
  status = 'implemented'
where responsibility_id = 'RESP-DBT-CLI-PROJECT-ANALYZER';

update architecture.component_responsibility
set
  responsibility = 'Inspect one scoped project with independent source and bounded-traversal budgets.',
  status = 'implemented'
where responsibility_id = 'RESP-DBT-PROJECT-IMPORT-INSPECTOR';

update architecture.component_relation
set
  failure_mode = 'Unsafe or source-shadowing paths fail before dbt parse; generated artifacts are excluded while installed dependencies remain executable.',
  updated_at = now()
where relation_id = 'REL-DBT-ANALYZER-DEPENDS-ON-SOURCE-PATH-POLICY';

update architecture.component_relation
set
  failure_mode = 'Unsafe paths are diagnosed; excluded generated artifacts and dependencies do not consume source budgets, while traversal remains bounded.',
  updated_at = now()
where relation_id = 'REL-DBT-IMPORT-INSPECTOR-DEPENDS-ON-SOURCE-PATH-POLICY';

delete from planning_query_store.governance_component_local_semantic_items
where (component_id, item_kind, item_value) in (
  ('SYS-API-INFRA-DBT-PROJECT-SOURCE-PATH-POLICY', 'public_api', 'resolveDbtRuntimeArtifactDirectoryPaths'),
  ('SYS-API-INFRA-DBT-PROJECT-SOURCE-PATH-POLICY', 'transition', 'dbt path configuration -> contained disjoint source/runtime path partition'),
  ('SYS-API-INFRA-DBT-PROJECT-SOURCE-PATH-POLICY', 'invariant', 'The analyzer and import inspector consume the same default and configured runtime-artifact directory set.'),
  ('SYS-API-INFRA-DBT-PROJECT-ANALYZER', 'invariant', 'Runtime artifacts are absent from both the isolated parse snapshot and its content revision.'),
  ('SYS-API-INFRA-DBT-PROJECT-IMPORT-INSPECTOR', 'invariant', 'Runtime artifacts remain explicit inventory entries but do not consume the project source-byte budget.')
);

insert into planning_query_store.governance_component_local_semantic_items (
  component_id, item_kind, item_value, item_order
)
values
  ('SYS-API-INFRA-DBT-PROJECT-SOURCE-PATH-POLICY', 'public_api', 'resolveDbtProjectDirectoryPartition', 1),
  ('SYS-API-INFRA-DBT-PROJECT-SOURCE-PATH-POLICY', 'transition', 'dbt path configuration -> contained source/generated-artifact/installed-dependency partition', 0),
  ('SYS-API-INFRA-DBT-PROJECT-SOURCE-PATH-POLICY', 'invariant', 'Generated artifact paths and installed dependency paths are contained, disjoint from configured source, and semantically distinct.', 1),
  ('SYS-API-INFRA-DBT-PROJECT-ANALYZER', 'invariant', 'The isolated parse snapshot excludes generated output and includes materialized installed dependencies in both parsing and content revision.', 3),
  ('SYS-API-INFRA-DBT-PROJECT-IMPORT-INSPECTOR', 'invariant', 'Generated artifacts and installed dependencies remain explicit inventory entries but do not consume source file or byte budgets.', 1),
  ('SYS-API-INFRA-DBT-PROJECT-IMPORT-INSPECTOR', 'invariant', 'A separate inspected-file budget bounds excluded trees independently of the source file budget.', 2)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

with target_rail as (
  select rail.*
  from planning_query_store.feature_mechanization_local_rails rail
  where rail.rail_id in (
    'local#E-DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713#query#projectdbtgraphfromfiles',
    'local#frontend-gap-rail-reconciliation-20260619#query#validatedbtprojectimport'
  )
), symbol_name(name) as (
  values
    ('DBT_GENERATED_ARTIFACT_DIRECTORY_DEFAULTS'),
    ('DBT_INSTALLED_DEPENDENCY_DIRECTORY_DEFAULTS'),
    ('DbtProjectDirectoryPartition'),
    ('GENERATED_ARTIFACT_PATH_SETTING_DEFAULTS'),
    ('INSTALLED_DEPENDENCY_PATH_SETTING_DEFAULTS'),
    ('SOURCE_PATH_SETTING_DEFAULTS'),
    ('evaluateDbtProjectPathPolicy'),
    ('evaluateDbtProjectSnapshotPathPolicy'),
    ('isRecord'),
    ('isSnapshotContainedRelativePath'),
    ('listDbtProjectFiles'),
    ('nonSourcePathShadowsConfiguredSource'),
    ('normalizeContainedRelativePath'),
    ('parseDbtProjectDocument'),
    ('readConfiguredPaths'),
    ('resolveDbtProjectDirectoryPartition'),
    ('resolveEffectivePathSettings')
), extension as (
  select
    target_rail.rail_id,
    target_rail.rail_name,
    (
      select jsonb_agg(
        jsonb_build_object(
          'name', symbol_name.name,
          'path', 'apps/api/src/infrastructure/dbt/dbtProjectPathPolicy.ts',
          'dddOwner', 'SYS-API-INFRA-DBT-PROJECT-SOURCE-PATH-POLICY',
          'cqRails', jsonb_build_array(target_rail.rail_name),
          'fowlerSignals', jsonb_build_array('Policy', 'Value Object', 'Separated Interface'),
          'architectureGuard', 'pnpm --filter dvt-api test:arch',
          'cypressCoverage', 'not_applicable:server_source_path_policy',
          'unitTests', jsonb_build_array('apps/api/test/infrastructure/dbt/dbtProjectPathPolicy.test.ts')
        ) order by symbol_name.name
      )
      from symbol_name
    ) as symbols,
    (
      select jsonb_agg(item order by item #>> '{}')
      from (
        select distinct item
        from jsonb_array_elements(
          coalesce(target_rail.allowed_implementation_surfaces, '[]'::jsonb)
          || jsonb_build_array(
            'docs/adr/ADR-0060-dbt-project-authoring-authority.md',
            'docs/architecture/components/web/graph/dbt-project-import-and-source-authority-component.md',
            'scripts/planning-db-migrate.test.cjs',
            'tools/planning-db/migrations/687_dbt_project_dependency_path_partition.sql'
          )
        ) surfaces(item)
      ) distinct_surfaces
    ) as surfaces
  from target_rail
), reconciled as (
  select
    extension.*,
    (
      select jsonb_agg(item order by path, name)
      from (
        select distinct on (path, name) item, path, name
        from (
          select
            item,
            item ->> 'path' as path,
            coalesce(item ->> 'name', item ->> 'symbol') as name,
            0 as priority
          from target_rail,
            lateral jsonb_array_elements(coalesce(target_rail.raw_manifest -> 'symbols', '[]'::jsonb)) current_symbol(item)
          where target_rail.rail_id = extension.rail_id
            and item ->> 'path' <> 'apps/api/src/infrastructure/dbt/dbtProjectPathPolicy.ts'
          union all
          select item, item ->> 'path', item ->> 'name', 1
          from jsonb_array_elements(extension.symbols) added_symbol(item)
        ) candidates
        where path is not null and name is not null
        order by path, name, priority desc
      ) distinct_symbols
    ) as all_symbols
  from extension
)
update planning_query_store.feature_mechanization_local_rails rail
set
  symbol_refs = (
    select jsonb_agg(to_jsonb((item ->> 'path') || '#' || (item ->> 'name')) order by item ->> 'path', item ->> 'name')
    from jsonb_array_elements(reconciled.all_symbols) symbol(item)
  ),
  implementation_refs = reconciled.surfaces,
  allowed_implementation_surfaces = reconciled.surfaces,
  raw_rail = jsonb_set(
    rail.raw_rail,
    '{runtimeArtifactSourcePolicy}',
    to_jsonb('generated_artifact_installed_dependency_partition'::text),
    true
  ),
  raw_manifest = jsonb_set(
    jsonb_set(rail.raw_manifest, '{symbols}', reconciled.all_symbols, true),
    '{allowedImplementationSurfaces}',
    reconciled.surfaces,
    true
  ),
  source_path = 'tools/planning-db/migrations/687_dbt_project_dependency_path_partition.sql',
  source_content_sha256 = repeat(md5(rail.rail_name || ':dependency-path-partition:687'), 2),
  revision = rail.revision + 1,
  updated_at = now()
from reconciled
where rail.rail_id = reconciled.rail_id;

do $$
declare
  governed_rail_count integer;
begin
  select count(*) into governed_rail_count
  from planning_query_store.feature_mechanization_local_rails rail
  where rail.rail_id in (
    'local#E-DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713#query#projectdbtgraphfromfiles',
    'local#frontend-gap-rail-reconciliation-20260619#query#validatedbtprojectimport'
  )
    and rail.raw_rail ->> 'runtimeArtifactSourcePolicy' = 'generated_artifact_installed_dependency_partition'
    and exists (
      select 1
      from jsonb_array_elements(coalesce(rail.raw_manifest -> 'symbols', '[]'::jsonb)) symbol(item)
      where item ->> 'path' = 'apps/api/src/infrastructure/dbt/dbtProjectPathPolicy.ts'
        and item ->> 'name' = 'resolveDbtProjectDirectoryPartition'
    )
    and not exists (
      select 1
      from jsonb_array_elements(coalesce(rail.raw_manifest -> 'symbols', '[]'::jsonb)) symbol(item)
      where item ->> 'path' = 'apps/api/src/infrastructure/dbt/dbtProjectPathPolicy.ts'
        and item ->> 'name' = 'resolveDbtRuntimeArtifactDirectoryPaths'
    );

  if governed_rail_count <> 2 then
    raise exception 'dbt dependency path partition requires exactly two reconciled query rails, found %', governed_rail_count;
  end if;
end $$;
