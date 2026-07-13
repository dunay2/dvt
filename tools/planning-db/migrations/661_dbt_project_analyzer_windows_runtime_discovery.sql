-- Keep the server-owned dbt analyzer executable discoverable on Windows
-- without widening the sanitized process environment to credentials.

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values (
  'SYS-API-INFRA-DBT-PROJECT-ANALYZER',
  'invariant',
  'The analyzer may inherit non-secret runtime discovery paths required by its server-owned executable, but never provider credentials or workspace profile authority.',
  2
)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

with target_rail as (
  select *
  from planning_query_store.feature_mechanization_local_rails
  where rail_id = 'local#E-DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713#query#projectdbtgraphfromfiles'
), declared_symbol(path, name, ddd_owner, unit_test) as (
  values
    ('scripts/run-selected-closure-live-proof.cjs', 'LIVE_PROOF_DBT_PROFILE', 'SelectedClosureLiveProof', 'scripts/run-selected-closure-live-proof.test.cjs'),
    ('scripts/run-selected-closure-live-proof.cjs', 'resolveLiveProofDbtAnalyzerProfilesDirectory', 'SelectedClosureLiveProof', 'scripts/run-selected-closure-live-proof.test.cjs'),
    ('scripts/run-selected-closure-live-proof.cjs', 'prepareLiveProofDbtAnalyzerProfile', 'SelectedClosureLiveProof', 'scripts/run-selected-closure-live-proof.test.cjs'),
    ('apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts', 'requestDbtProjectGraph', 'DbtProjectFileCanvas', 'apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts')
), declared_manifest as (
  select jsonb_agg(
    jsonb_build_object(
      'name', name,
      'path', path,
      'dddOwner', ddd_owner,
      'cqRails', jsonb_build_array('ProjectDbtGraphFromFiles'),
      'fowlerSignals', jsonb_build_array('Boundary drift'),
      'architectureGuard', 'node --test scripts/run-selected-closure-live-proof.test.cjs',
      'cypressCoverage', 'apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts',
      'unitTests', jsonb_build_array(unit_test)
    ) order by path, name
  ) as symbols
  from declared_symbol
), reconciled_symbol_refs as (
  select jsonb_agg(to_jsonb(ref) order by ref) as refs
  from (
    select value as ref
    from target_rail,
      lateral jsonb_array_elements_text(coalesce(symbol_refs, '[]'::jsonb)) item(value)
    union
    select path || '#' || name from declared_symbol
  ) all_ref
), reconciled_surfaces as (
  select jsonb_agg(to_jsonb(surface) order by surface) as surfaces
  from (
    select value as surface
    from target_rail,
      lateral jsonb_array_elements_text(
        coalesce(allowed_implementation_surfaces, '[]'::jsonb)
      ) item(value)
    union
    values
      ('apps/api/src/infrastructure/dbt/dbtAnalyzerProcess.ts'),
      ('apps/api/test/infrastructure/dbt/dbtAnalyzerProcess.test.ts'),
      ('apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts'),
      ('scripts/run-selected-closure-live-proof.cjs'),
      ('scripts/run-selected-closure-live-proof.test.cjs'),
      ('tools/planning-db/migrations/661_dbt_project_analyzer_windows_runtime_discovery.sql')
  ) all_surface
), reconciled_refs as (
  select jsonb_agg(to_jsonb(ref) order by ref) as refs
  from (
    select value as ref
    from target_rail,
      lateral jsonb_array_elements_text(coalesce(implementation_refs, '[]'::jsonb)) item(value)
    union
    values
      ('apps/api/src/infrastructure/dbt/dbtAnalyzerProcess.ts'),
      ('apps/api/test/infrastructure/dbt/dbtAnalyzerProcess.test.ts'),
      ('apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts'),
      ('scripts/run-selected-closure-live-proof.cjs'),
      ('scripts/run-selected-closure-live-proof.test.cjs'),
      ('tools/planning-db/migrations/661_dbt_project_analyzer_windows_runtime_discovery.sql')
  ) all_ref
)
update planning_query_store.feature_mechanization_local_rails rail
set
  symbol_refs = reconciled_symbol_refs.refs,
  implementation_refs = reconciled_refs.refs,
  allowed_implementation_surfaces = reconciled_surfaces.surfaces,
  raw_manifest = jsonb_set(
    jsonb_set(
      coalesce(rail.raw_manifest, '{}'::jsonb),
      '{symbols}',
      coalesce(rail.raw_manifest -> 'symbols', '[]'::jsonb) || declared_manifest.symbols,
      true
    ),
    '{allowedImplementationSurfaces}',
    reconciled_surfaces.surfaces,
    true
  ),
  source_path = 'tools/planning-db/migrations/661_dbt_project_analyzer_windows_runtime_discovery.sql',
  source_content_sha256 = repeat(md5('ProjectDbtGraphFromFiles:windows-runtime-discovery:661'), 2),
  revision = rail.revision + 1,
  updated_at = now()
from declared_manifest,
  reconciled_symbol_refs,
  reconciled_surfaces,
  reconciled_refs
where rail.rail_id = 'local#E-DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713#query#projectdbtgraphfromfiles';

