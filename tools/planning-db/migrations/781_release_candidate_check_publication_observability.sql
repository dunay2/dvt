-- Complete the architecture maturity contract for exact-head check publication.
-- These are existing operational signals, not synthetic telemetry: the service
-- returns a verified lifecycle receipt and the GitHub adapter emits that receipt
-- (or a fail-closed API error) to the trusted workflow job log.

insert into architecture.component_observability (
  observability_id, component_id, signal_name, signal_kind, required, status
)
values
  (
    'OBS-CI-RELEASE-CANDIDATE-CHECK-PUBLICATION-RECEIPT',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-CHECK-PUBLICATION-SERVICE',
    'Verified check lifecycle receipt records check ID, canonical name, exact head SHA, status, and terminal conclusion.',
    'trace',
    true,
    'implemented'
  ),
  (
    'OBS-CI-RELEASE-CANDIDATE-GITHUB-CHECK-ADAPTER-JOB-LOG',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-CHECK-ADAPTER',
    'Trusted publisher job log records the normalized GitHub check receipt or the fail-closed Checks API error.',
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

update planning_query_store.feature_mechanization_local_rails
set
  raw_manifest = jsonb_set(
    raw_manifest,
    '{allowedImplementationSurfaces}',
    coalesce(raw_manifest -> 'allowedImplementationSurfaces', '[]'::jsonb)
      || jsonb_build_array(
        'tools/planning-db/migrations/781_release_candidate_check_publication_observability.sql'
      )
  ),
  allowed_implementation_surfaces = coalesce(allowed_implementation_surfaces, '[]'::jsonb)
    || jsonb_build_array(
      'tools/planning-db/migrations/781_release_candidate_check_publication_observability.sql'
    )
where feature_id = 'C-RELEASE-CANDIDATE-INTEGRITY-1'
  and not (
    coalesce(raw_manifest -> 'allowedImplementationSurfaces', '[]'::jsonb)
      ? 'tools/planning-db/migrations/781_release_candidate_check_publication_observability.sql'
  );

do $$
declare
  maturity_gap_count integer;
begin
  select count(*) into maturity_gap_count
  from architecture.component_maturity_query
  where component_id in (
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-CHECK-PUBLICATION-SERVICE',
    'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY-GITHUB-CHECK-ADAPTER'
  )
    and coalesce(array_length(missing_reasons, 1), 0) > 0;

  if maturity_gap_count <> 0 then
    raise exception 'Release candidate check publication components retain architecture maturity gaps';
  end if;
end $$;
