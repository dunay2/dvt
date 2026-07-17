-- Complete the immutable phase-four feature manifest with the mandatory
-- Fowler source and every production symbol detected on its two owned files.

with declared_symbol(path, name) as (
  values
    (
      'scripts/planning-db/queries/dbt-project-roundtrip-capability-status-query.cjs',
      'createDbtProjectRoundtripCapabilityStatusReadModel'
    ),
    (
      'scripts/planning-db/queries/dbt-project-roundtrip-capability-status-query.cjs',
      'readDbtProjectRoundtripCapabilityStatusRows'
    ),
    ('scripts/generate-dbt-project-roundtrip-capability-status.cjs', 'childProcess'),
    ('scripts/generate-dbt-project-roundtrip-capability-status.cjs', 'databaseUrl'),
    ('scripts/generate-dbt-project-roundtrip-capability-status.cjs', 'defaultOutputPath'),
    ('scripts/generate-dbt-project-roundtrip-capability-status.cjs', 'fs'),
    ('scripts/generate-dbt-project-roundtrip-capability-status.cjs', 'main'),
    ('scripts/generate-dbt-project-roundtrip-capability-status.cjs', 'markdownCell'),
    ('scripts/generate-dbt-project-roundtrip-capability-status.cjs', 'markdownTable'),
    (
      'scripts/generate-dbt-project-roundtrip-capability-status.cjs',
      'normalizeDbtRoundtripCapabilityRow'
    ),
    ('scripts/generate-dbt-project-roundtrip-capability-status.cjs', 'parseArgs'),
    ('scripts/generate-dbt-project-roundtrip-capability-status.cjs', 'path'),
    ('scripts/generate-dbt-project-roundtrip-capability-status.cjs', 'relativeOutputPath'),
    (
      'scripts/generate-dbt-project-roundtrip-capability-status.cjs',
      'renderDbtRoundtripCapabilityStatus'
    ),
    ('scripts/generate-dbt-project-roundtrip-capability-status.cjs', 'repoRoot'),
    ('scripts/generate-dbt-project-roundtrip-capability-status.cjs', 'reviewedPrLabel'),
    (
      'scripts/generate-dbt-project-roundtrip-capability-status.cjs',
      'runDbtRoundtripCapabilityStatusGenerator'
    ),
    ('scripts/generate-dbt-project-roundtrip-capability-status.cjs', 'runGit'),
    ('scripts/generate-dbt-project-roundtrip-capability-status.cjs', 'sortRows'),
    ('scripts/generate-dbt-project-roundtrip-capability-status.cjs', 'sourceView'),
    ('scripts/generate-dbt-project-roundtrip-capability-status.cjs', 'toBoolean'),
    ('scripts/generate-dbt-project-roundtrip-capability-status.cjs', 'toNumber'),
    (
      'scripts/generate-dbt-project-roundtrip-capability-status.cjs',
      'validateDbtRoundtripCapabilityRows'
    ),
    (
      'scripts/generate-dbt-project-roundtrip-capability-status.cjs',
      'verifyGitCommitAncestry'
    )
), symbol_manifest as (
  select
    jsonb_agg(
      jsonb_build_object(
        'name', name,
        'path', path,
        'dddOwner', case
          when path like 'scripts/planning-db/queries/%'
            then 'DbtProjectRoundtripCapabilityStatus'
          else 'DbtProjectRoundtripCapabilityStatusRenderer'
        end,
        'cqRails', jsonb_build_array('ProjectDbtRoundtripCapabilityStatus'),
        'fowlerSignals', case
          when path like 'scripts/planning-db/queries/%'
            then jsonb_build_array('query_model', 'single_source_of_truth')
          else jsonb_build_array('fail_closed', 'separated_interface')
        end,
        'architectureGuard', case
          when path like 'scripts/planning-db/queries/%'
            then 'scripts/planning-db-query-tests/dbt-roundtrip-capabilities.test.cjs'
          else 'scripts/generate-dbt-project-roundtrip-capability-status.test.cjs'
        end,
        'cypressCoverage', 'not_applicable:governance_read_model',
        'unitTests', jsonb_build_array(case
          when path like 'scripts/planning-db/queries/%'
            then 'scripts/planning-db-query-tests/dbt-roundtrip-capabilities.test.cjs'
          else 'scripts/generate-dbt-project-roundtrip-capability-status.test.cjs'
        end)
      ) order by path, name
    ) as symbols,
    jsonb_agg(to_jsonb(path || '#' || name) order by path, name) as symbol_refs
  from declared_symbol
)
update planning_query_store.feature_mechanization_local_rails rail
set
  symbol_refs = symbol_manifest.symbol_refs,
  documentation_refs = coalesce(rail.documentation_refs, '[]'::jsonb)
    || jsonb_build_array('docs/architecture/fowler-opportunity-planning-governance.md'),
  governing_sources = coalesce(rail.governing_sources, '[]'::jsonb)
    || jsonb_build_array('docs/architecture/fowler-opportunity-planning-governance.md'),
  implementation_refs = coalesce(rail.implementation_refs, '[]'::jsonb)
    || jsonb_build_array(
      'tools/planning-db/migrations/728_dbt_roundtrip_capability_mechanization_alignment.sql'
    ),
  allowed_implementation_surfaces = coalesce(rail.allowed_implementation_surfaces, '[]'::jsonb)
    || jsonb_build_array(
      'tools/planning-db/migrations/728_dbt_roundtrip_capability_mechanization_alignment.sql'
    ),
  source_path =
    'tools/planning-db/migrations/728_dbt_roundtrip_capability_mechanization_alignment.sql',
  source_content_sha256 = md5(
    'E-DBT-PROJECT-ROUNDTRIP-P4-TRUTH-SYNC:ProjectDbtRoundtripCapabilityStatus:728'
  ),
  raw_manifest = jsonb_set(
    jsonb_set(
      jsonb_set(
        rail.raw_manifest,
        '{symbols}',
        symbol_manifest.symbols,
        true
      ),
      '{governingSources}',
      coalesce(rail.raw_manifest -> 'governingSources', '[]'::jsonb)
        || jsonb_build_array('docs/architecture/fowler-opportunity-planning-governance.md'),
      true
    ),
    '{allowedImplementationSurfaces}',
    coalesce(rail.raw_manifest -> 'allowedImplementationSurfaces', '[]'::jsonb)
      || jsonb_build_array(
        'tools/planning-db/migrations/728_dbt_roundtrip_capability_mechanization_alignment.sql'
      ),
    true
  ),
  revision = rail.revision + 1,
  updated_at = now()
from symbol_manifest
where rail.rail_id =
  'local#E-DBT-PROJECT-ROUNDTRIP-P4-TRUTH-SYNC#query#projectdbtroundtripcapabilitystatus';

do $$
declare
  manifest_record record;
begin
  select
    governing_sources,
    symbol_refs,
    raw_manifest
  into manifest_record
  from planning_query_store.feature_mechanization_local_rails
  where rail_id =
    'local#E-DBT-PROJECT-ROUNDTRIP-P4-TRUTH-SYNC#query#projectdbtroundtripcapabilitystatus';

  if not found then
    raise exception 'DBT round-trip capability status feature rail is missing';
  end if;

  if not manifest_record.governing_sources ?
    'docs/architecture/fowler-opportunity-planning-governance.md'
    or not manifest_record.raw_manifest -> 'governingSources' ?
      'docs/architecture/fowler-opportunity-planning-governance.md'
  then
    raise exception 'DBT round-trip capability status must cite Fowler governance';
  end if;

  if jsonb_array_length(manifest_record.symbol_refs) <> 24
    or jsonb_array_length(manifest_record.raw_manifest -> 'symbols') <> 24
  then
    raise exception 'DBT round-trip capability status must declare 24 implementation symbols';
  end if;
end
$$;
