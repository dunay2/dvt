-- Reconcile the structured YAML serializer used by the selected-closure
-- server-owned dbt analysis profile.

with target_rail as (
  select *
  from planning_query_store.feature_mechanization_local_rails
  where rail_id = 'local#E-DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713#query#projectdbtgraphfromfiles'
), declared_manifest as (
  select jsonb_build_array(
    jsonb_build_object(
      'name', 'yaml',
      'path', 'scripts/run-selected-closure-live-proof.cjs',
      'dddOwner', 'SelectedClosureLiveProof',
      'cqRails', jsonb_build_array('ProjectDbtGraphFromFiles'),
      'fowlerSignals', jsonb_build_array('Boundary drift'),
      'architectureGuard', 'node --test scripts/run-selected-closure-live-proof.test.cjs',
      'cypressCoverage', 'apps/web/cypress/e2e/dbt/dbt-project-file-projection-live.cy.ts',
      'unitTests', jsonb_build_array('scripts/run-selected-closure-live-proof.test.cjs')
    )
  ) as symbols
), reconciled_symbol_refs as (
  select jsonb_agg(to_jsonb(ref) order by ref) as refs
  from (
    select value as ref
    from target_rail,
      lateral jsonb_array_elements_text(coalesce(symbol_refs, '[]'::jsonb)) item(value)
    union
    values ('scripts/run-selected-closure-live-proof.cjs#yaml')
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
    values ('tools/planning-db/migrations/662_dbt_project_live_proof_yaml_symbol.sql')
  ) all_surface
), reconciled_refs as (
  select jsonb_agg(to_jsonb(ref) order by ref) as refs
  from (
    select value as ref
    from target_rail,
      lateral jsonb_array_elements_text(coalesce(implementation_refs, '[]'::jsonb)) item(value)
    union
    values ('tools/planning-db/migrations/662_dbt_project_live_proof_yaml_symbol.sql')
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
  source_path = 'tools/planning-db/migrations/662_dbt_project_live_proof_yaml_symbol.sql',
  source_content_sha256 = repeat(md5('ProjectDbtGraphFromFiles:live-proof-yaml-symbol:662'), 2),
  revision = rail.revision + 1,
  updated_at = now()
from declared_manifest,
  reconciled_symbol_refs,
  reconciled_surfaces,
  reconciled_refs
where rail.rail_id = 'local#E-DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713#query#projectdbtgraphfromfiles';

