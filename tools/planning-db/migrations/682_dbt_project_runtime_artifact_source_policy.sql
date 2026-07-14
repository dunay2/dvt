-- Reconcile review feedback by making the dbt source/runtime path partition a
-- shared policy. Runtime artifacts remain visible to compatibility inventory,
-- but they cannot influence the source revision or source byte budget.

insert into architecture.design_scope (
  design_id, subject_kind, subject_id, scope_kind, required
)
values
  ('DBT-PROJECT-IMPORT-PHASE3-20260714', 'component', 'SYS-API-INFRA-DBT-PROJECT-SOURCE-PATH-POLICY', 'may_create', true),
  ('DBT-PROJECT-IMPORT-PHASE3-20260714', 'query', 'ValidateDbtProjectImport', 'may_update', true),
  ('DBT-PROJECT-IMPORT-PHASE3-20260714', 'query', 'ProjectDbtGraphFromFiles', 'may_update', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

insert into planning_query_store.governance_component_local_definitions (
  component_id, source_path, source_content_sha256, revision, name, level,
  parent_id, root_unit, domain_unit, status, children_required, owned_concern,
  ddd_owner, cq_rails, created_by
)
values (
  'SYS-API-INFRA-DBT-PROJECT-SOURCE-PATH-POLICY',
  'tools/planning-db/migrations/682_dbt_project_runtime_artifact_source_policy.sql',
  repeat(md5('SYS-API-INFRA-DBT-PROJECT-SOURCE-PATH-POLICY:682'), 2),
  0,
  'dbt project source path policy',
  'component',
  'SYS-API-INFRASTRUCTURE',
  'SYS-DVT',
  'SYS-API-ROOT',
  'canonical',
  false,
  'Partition project source paths from contained dbt runtime-artifact directories without hiding source content.',
  'DbtProjectSourcePathPolicy',
  'ProjectDbtGraphFromFiles;ValidateDbtProjectImport',
  'codex'
)
on conflict (component_id) do update set
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  name = excluded.name,
  level = excluded.level,
  parent_id = excluded.parent_id,
  root_unit = excluded.root_unit,
  domain_unit = excluded.domain_unit,
  status = excluded.status,
  children_required = excluded.children_required,
  owned_concern = excluded.owned_concern,
  ddd_owner = excluded.ddd_owner,
  cq_rails = excluded.cq_rails,
  revision = planning_query_store.governance_component_local_definitions.revision + 1;

delete from planning_query_store.governance_component_local_ownership_patterns
where component_id = 'SYS-API-INFRA-DBT-PROJECT-ANALYZER'
  and pattern in (
    'apps/api/src/infrastructure/dbt/dbtProjectPathPolicy.ts',
    'apps/api/test/infrastructure/dbt/dbtProjectPathPolicy.test.ts'
  );

delete from planning_query_store.governance_component_local_ownership_patterns
where component_id = 'SYS-API-INFRA-DBT-PROJECT-SOURCE-PATH-POLICY';

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id, pattern_kind, pattern, pattern_order
)
values
  ('SYS-API-INFRA-DBT-PROJECT-SOURCE-PATH-POLICY', 'owns', 'apps/api/src/infrastructure/dbt/dbtProjectPathPolicy.ts', 0),
  ('SYS-API-INFRA-DBT-PROJECT-SOURCE-PATH-POLICY', 'owns', 'apps/api/test/infrastructure/dbt/dbtProjectPathPolicy.test.ts', 1)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into architecture.component (
  component_id, name, kind, layer, owner, repo_path, public_contract, runtime,
  criticality, status, parent_component_id
)
values (
  'SYS-API-INFRA-DBT-PROJECT-SOURCE-PATH-POLICY',
  'dbt project source path policy',
  'module',
  'infra',
  'dbt Project Analysis and Import',
  'apps/api/src/infrastructure/dbt/dbtProjectPathPolicy.ts',
  'DbtProjectSourcePathPolicy',
  'node',
  'critical',
  'implemented',
  'SYS-API-INFRASTRUCTURE'
)
on conflict (component_id) do update set
  name = excluded.name,
  kind = excluded.kind,
  layer = excluded.layer,
  owner = excluded.owner,
  repo_path = excluded.repo_path,
  public_contract = excluded.public_contract,
  runtime = excluded.runtime,
  criticality = excluded.criticality,
  status = excluded.status,
  parent_component_id = excluded.parent_component_id,
  updated_at = now();

insert into architecture.component_responsibility (
  responsibility_id, component_id, responsibility, reason_to_change,
  ddd_owner, status
)
values (
  'RESP-DBT-PROJECT-SOURCE-PATH-POLICY',
  'SYS-API-INFRA-DBT-PROJECT-SOURCE-PATH-POLICY',
  'Resolve one safe, deterministic partition between dbt project source and runtime-artifact directories.',
  'dbt path configuration or source-selection policy changes.',
  'DbtProjectSourcePathPolicy',
  'implemented'
)
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

insert into architecture.component_relation (
  relation_id, source_component_id, target_component_id, relation_type,
  direction, sync_async, failure_mode, authorization_scope, source_refs, status
)
values
  (
    'REL-DBT-ANALYZER-DEPENDS-ON-SOURCE-PATH-POLICY',
    'SYS-API-INFRA-DBT-PROJECT-ANALYZER',
    'SYS-API-INFRA-DBT-PROJECT-SOURCE-PATH-POLICY',
    'depends_on',
    'outbound',
    'sync',
    'Unsafe or source-shadowing runtime paths fail before dbt parse; runtime artifacts never enter the source snapshot.',
    'authorized workspace scope and contained project root',
    jsonb_build_array(
      'apps/api/src/infrastructure/dbt/DbtCliProjectAnalyzer.ts',
      'apps/api/src/infrastructure/dbt/dbtProjectPathPolicy.ts'
    ),
    'implemented'
  ),
  (
    'REL-DBT-IMPORT-INSPECTOR-DEPENDS-ON-SOURCE-PATH-POLICY',
    'SYS-API-INFRA-DBT-PROJECT-IMPORT-INSPECTOR',
    'SYS-API-INFRA-DBT-PROJECT-SOURCE-PATH-POLICY',
    'depends_on',
    'outbound',
    'sync',
    'Unsafe or source-shadowing runtime paths are diagnosed; excluded runtime bytes do not consume the source budget.',
    'workspace:files:view in tenant/project/environment scope',
    jsonb_build_array(
      'apps/api/src/infrastructure/dbt/LocalDbtProjectImportInspector.ts',
      'apps/api/src/infrastructure/dbt/dbtProjectPathPolicy.ts'
    ),
    'implemented'
  )
on conflict (relation_id) do update set
  source_component_id = excluded.source_component_id,
  target_component_id = excluded.target_component_id,
  relation_type = excluded.relation_type,
  direction = excluded.direction,
  sync_async = excluded.sync_async,
  failure_mode = excluded.failure_mode,
  authorization_scope = excluded.authorization_scope,
  source_refs = excluded.source_refs,
  status = excluded.status,
  updated_at = now();

update architecture.component_test
set
  component_id = 'SYS-API-INFRA-DBT-PROJECT-SOURCE-PATH-POLICY',
  test_kind = 'unit',
  coverage_level = 'boundary',
  required = true,
  validation_command = 'pnpm --filter dvt-api exec vitest run test/infrastructure/dbt/dbtProjectPathPolicy.test.ts test/infrastructure/dbt/DbtCliProjectAnalyzer.test.ts test/infrastructure/dbt/LocalDbtProjectImportInspector.test.ts'
where test_id = 'TEST-DBT-PROJECT-PATH-POLICY';

insert into planning_query_store.governance_component_local_semantic_items (
  component_id, item_kind, item_value, item_order
)
values
  (
    'SYS-API-INFRA-DBT-PROJECT-SOURCE-PATH-POLICY',
    'public_api',
    'evaluateDbtProjectPathPolicy',
    0
  ),
  (
    'SYS-API-INFRA-DBT-PROJECT-SOURCE-PATH-POLICY',
    'public_api',
    'resolveDbtRuntimeArtifactDirectoryPaths',
    1
  ),
  (
    'SYS-API-INFRA-DBT-PROJECT-SOURCE-PATH-POLICY',
    'transition',
    'dbt path configuration -> contained disjoint source/runtime path partition',
    0
  ),
  (
    'SYS-API-INFRA-DBT-PROJECT-SOURCE-PATH-POLICY',
    'consumer',
    'DbtCliProjectAnalyzer',
    0
  ),
  (
    'SYS-API-INFRA-DBT-PROJECT-SOURCE-PATH-POLICY',
    'consumer',
    'LocalDbtProjectImportInspector',
    1
  ),
  (
    'SYS-API-INFRA-DBT-PROJECT-SOURCE-PATH-POLICY',
    'non_goal',
    'Traverse, hash, copy, or parse project files',
    0
  ),
  (
    'SYS-API-INFRA-DBT-PROJECT-SOURCE-PATH-POLICY',
    'reason_to_change',
    'dbt path configuration or source-selection policy changes.',
    0
  ),
  (
    'SYS-API-INFRA-DBT-PROJECT-SOURCE-PATH-POLICY',
    'fowler_signal',
    'Policy',
    0
  ),
  (
    'SYS-API-INFRA-DBT-PROJECT-SOURCE-PATH-POLICY',
    'governance_ref',
    'docs/architecture/components/web/graph/dbt-project-import-and-source-authority-component.md',
    0
  ),
  (
    'SYS-API-INFRA-DBT-PROJECT-SOURCE-PATH-POLICY',
    'invariant',
    'Runtime-artifact paths are project-contained, cannot resolve to the project root, and cannot shadow configured source paths.',
    0
  ),
  (
    'SYS-API-INFRA-DBT-PROJECT-SOURCE-PATH-POLICY',
    'invariant',
    'The analyzer and import inspector consume the same default and configured runtime-artifact directory set.',
    1
  ),
  (
    'SYS-API-INFRA-DBT-PROJECT-ANALYZER',
    'invariant',
    'Runtime artifacts are absent from both the isolated parse snapshot and its content revision.',
    3
  ),
  (
    'SYS-API-INFRA-DBT-PROJECT-IMPORT-INSPECTOR',
    'invariant',
    'Runtime artifacts remain explicit inventory entries but do not consume the project source-byte budget.',
    1
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

with target_rail as (
  select rail.*
  from planning_query_store.feature_mechanization_local_rails rail
  where rail.rail_id in (
    'local#E-DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713#query#projectdbtgraphfromfiles',
    'local#frontend-gap-rail-reconciliation-20260619#query#validatedbtprojectimport'
  )
), extension_symbol(rail_name, path, name, ddd_owner, unit_test) as (
  values
    ('ProjectDbtGraphFromFiles', 'apps/api/src/infrastructure/dbt/dbtProjectPathPolicy.ts', 'DBT_RUNTIME_ARTIFACT_DIRECTORY_DEFAULTS', 'SYS-API-INFRA-DBT-PROJECT-SOURCE-PATH-POLICY', 'apps/api/test/infrastructure/dbt/dbtProjectPathPolicy.test.ts'),
    ('ProjectDbtGraphFromFiles', 'apps/api/src/infrastructure/dbt/dbtProjectPathPolicy.ts', 'RUNTIME_PATH_SETTING_DEFAULTS', 'SYS-API-INFRA-DBT-PROJECT-SOURCE-PATH-POLICY', 'apps/api/test/infrastructure/dbt/dbtProjectPathPolicy.test.ts'),
    ('ProjectDbtGraphFromFiles', 'apps/api/src/infrastructure/dbt/dbtProjectPathPolicy.ts', 'SOURCE_PATH_SETTING_DEFAULTS', 'SYS-API-INFRA-DBT-PROJECT-SOURCE-PATH-POLICY', 'apps/api/test/infrastructure/dbt/dbtProjectPathPolicy.test.ts'),
    ('ProjectDbtGraphFromFiles', 'apps/api/src/infrastructure/dbt/dbtProjectPathPolicy.ts', 'resolveDbtRuntimeArtifactDirectoryPaths', 'SYS-API-INFRA-DBT-PROJECT-SOURCE-PATH-POLICY', 'apps/api/test/infrastructure/dbt/dbtProjectPathPolicy.test.ts'),
    ('ProjectDbtGraphFromFiles', 'apps/api/src/infrastructure/dbt/dbtProjectPathPolicy.ts', 'resolveEffectivePathSettings', 'SYS-API-INFRA-DBT-PROJECT-SOURCE-PATH-POLICY', 'apps/api/test/infrastructure/dbt/dbtProjectPathPolicy.test.ts'),
    ('ProjectDbtGraphFromFiles', 'apps/api/src/infrastructure/dbt/dbtProjectPathPolicy.ts', 'runtimePathShadowsConfiguredSource', 'SYS-API-INFRA-DBT-PROJECT-SOURCE-PATH-POLICY', 'apps/api/test/infrastructure/dbt/dbtProjectPathPolicy.test.ts'),
    ('ProjectDbtGraphFromFiles', 'apps/api/src/infrastructure/dbt/dbtProjectContentRevision.ts', 'ProjectContentSelection', 'SYS-API-INFRA-DBT-PROJECT-ANALYZER', 'apps/api/test/infrastructure/dbt/dbtProjectContentRevision.test.ts'),
    ('ProjectDbtGraphFromFiles', 'apps/api/src/infrastructure/dbt/dbtProjectContentRevision.ts', 'normalizeExcludedDirectoryPaths', 'SYS-API-INFRA-DBT-PROJECT-ANALYZER', 'apps/api/test/infrastructure/dbt/dbtProjectContentRevision.test.ts'),
    ('ValidateDbtProjectImport', 'apps/api/src/infrastructure/dbt/dbtProjectPathPolicy.ts', 'DBT_RUNTIME_ARTIFACT_DIRECTORY_DEFAULTS', 'SYS-API-INFRA-DBT-PROJECT-SOURCE-PATH-POLICY', 'apps/api/test/infrastructure/dbt/dbtProjectPathPolicy.test.ts'),
    ('ValidateDbtProjectImport', 'apps/api/src/infrastructure/dbt/dbtProjectPathPolicy.ts', 'RUNTIME_PATH_SETTING_DEFAULTS', 'SYS-API-INFRA-DBT-PROJECT-SOURCE-PATH-POLICY', 'apps/api/test/infrastructure/dbt/dbtProjectPathPolicy.test.ts'),
    ('ValidateDbtProjectImport', 'apps/api/src/infrastructure/dbt/dbtProjectPathPolicy.ts', 'SOURCE_PATH_SETTING_DEFAULTS', 'SYS-API-INFRA-DBT-PROJECT-SOURCE-PATH-POLICY', 'apps/api/test/infrastructure/dbt/dbtProjectPathPolicy.test.ts'),
    ('ValidateDbtProjectImport', 'apps/api/src/infrastructure/dbt/dbtProjectPathPolicy.ts', 'resolveDbtRuntimeArtifactDirectoryPaths', 'SYS-API-INFRA-DBT-PROJECT-SOURCE-PATH-POLICY', 'apps/api/test/infrastructure/dbt/dbtProjectPathPolicy.test.ts'),
    ('ValidateDbtProjectImport', 'apps/api/src/infrastructure/dbt/dbtProjectPathPolicy.ts', 'resolveEffectivePathSettings', 'SYS-API-INFRA-DBT-PROJECT-SOURCE-PATH-POLICY', 'apps/api/test/infrastructure/dbt/dbtProjectPathPolicy.test.ts'),
    ('ValidateDbtProjectImport', 'apps/api/src/infrastructure/dbt/dbtProjectPathPolicy.ts', 'runtimePathShadowsConfiguredSource', 'SYS-API-INFRA-DBT-PROJECT-SOURCE-PATH-POLICY', 'apps/api/test/infrastructure/dbt/dbtProjectPathPolicy.test.ts')
), extension as (
  select
    target_rail.rail_id,
    target_rail.rail_name,
    (
      select jsonb_agg(item order by item #>> '{}')
      from (
        select distinct item
        from jsonb_array_elements(
          coalesce(target_rail.allowed_implementation_surfaces, '[]'::jsonb)
          || jsonb_build_array(
            'apps/api/src/infrastructure/dbt/dbtProjectPathPolicy.ts',
            'apps/api/test/infrastructure/dbt/dbtProjectPathPolicy.test.ts',
            'docs/architecture/components/web/graph/dbt-project-import-and-source-authority-component.md',
            'tools/planning-db/migrations/682_dbt_project_runtime_artifact_source_policy.sql'
          )
          || case when target_rail.rail_name = 'ProjectDbtGraphFromFiles'
            then jsonb_build_array(
              'apps/api/src/infrastructure/dbt/DbtCliProjectAnalyzer.ts',
              'apps/api/src/infrastructure/dbt/dbtProjectContentRevision.ts',
              'apps/api/test/infrastructure/dbt/DbtCliProjectAnalyzer.test.ts',
              'apps/api/test/infrastructure/dbt/dbtProjectContentRevision.test.ts'
            )
            else jsonb_build_array(
              'apps/api/src/infrastructure/dbt/LocalDbtProjectImportInspector.ts',
              'apps/api/test/infrastructure/dbt/LocalDbtProjectImportInspector.test.ts'
            ) end
        ) surfaces(item)
      ) distinct_surfaces
    ) as surfaces,
    (
      select jsonb_agg(
        jsonb_build_object(
          'name', symbol.name,
          'path', symbol.path,
          'dddOwner', symbol.ddd_owner,
          'cqRails', jsonb_build_array(target_rail.rail_name),
          'fowlerSignals', jsonb_build_array('Policy', 'Separated Interface'),
          'architectureGuard', 'pnpm --filter dvt-api test:arch',
          'cypressCoverage', 'not_applicable:server_source_path_policy',
          'unitTests', jsonb_build_array(symbol.unit_test)
        ) order by symbol.path, symbol.name
      )
      from extension_symbol symbol
      where symbol.rail_name = target_rail.rail_name
    ) as symbols
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
  raw_rail = rail.raw_rail || jsonb_build_object(
    'runtimeArtifactSourcePolicy', 'shared_contained_partition',
    'negativeEvidence', coalesce(rail.raw_rail -> 'negativeEvidence', '[]'::jsonb)
      || case when rail.rail_name = 'ProjectDbtGraphFromFiles'
        then jsonb_build_array(
          'apps/api/test/infrastructure/dbt/DbtCliProjectAnalyzer.test.ts#keeps source hashes stable when excluded runtime artifacts change'
        )
        else jsonb_build_array(
          'apps/api/test/infrastructure/dbt/LocalDbtProjectImportInspector.test.ts#excludes configured runtime artifacts without charging the source byte budget'
        ) end
  ),
  raw_manifest = jsonb_set(
    jsonb_set(rail.raw_manifest, '{symbols}', reconciled.all_symbols, true),
    '{allowedImplementationSurfaces}',
    reconciled.surfaces,
    true
  ),
  source_path = 'tools/planning-db/migrations/682_dbt_project_runtime_artifact_source_policy.sql',
  source_content_sha256 = repeat(md5(rail.rail_name || ':runtime-artifact-source-policy:682'), 2),
  revision = rail.revision + 1,
  updated_at = now()
from reconciled
where rail.rail_id = reconciled.rail_id;

do $$
declare
  governed_rail_count integer;
begin
  select count(*) into governed_rail_count
  from planning_query_store.feature_mechanization_local_rails
  where rail_id in (
    'local#E-DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713#query#projectdbtgraphfromfiles',
    'local#frontend-gap-rail-reconciliation-20260619#query#validatedbtprojectimport'
  )
    and raw_rail ->> 'runtimeArtifactSourcePolicy' = 'shared_contained_partition';

  if governed_rail_count <> 2 then
    raise exception 'dbt runtime artifact source policy requires exactly two governed query rails, found %', governed_rail_count;
  end if;
end $$;

refresh materialized view planning_query_store.component_engineering_file_ownership_projection;
