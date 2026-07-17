-- Close observability maturity for the DBT round-trip capability projection
-- without inventing runtime telemetry. The query and generator already expose
-- their operational outcomes through stable CLI output and fail-closed errors.

insert into architecture.component_observability (
  observability_id, component_id, signal_name, signal_kind, required, status
)
values
  (
    'OBS-DBT-ROUNDTRIP-CAPABILITY-QUERY-STATE',
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-DBT-ROUNDTRIP',
    'Each projected phase rail exposes a current or named drift state through the Planning DB query CLI.',
    'log',
    true,
    'implemented'
  ),
  (
    'OBS-DBT-ROUNDTRIP-CAPABILITY-GENERATOR-RESULT',
    'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-DBT-ROUNDTRIP',
    'Generation reports updated or current output and fails with the exact DB projection, Git ancestry, or stale-render rejection.',
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

do $$
declare
  incomplete_count integer;
begin
  select count(*) into incomplete_count
  from architecture.component_maturity_query maturity
  where maturity.component_id in (
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-DBT-ROUNDTRIP',
    'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-DBT-ROUNDTRIP'
  )
    and coalesce(array_length(maturity.missing_reasons, 1), 0) > 0;

  if incomplete_count <> 0 then
    raise exception 'DBT round-trip capability maturity closeout left % incomplete components', incomplete_count;
  end if;
end $$;
