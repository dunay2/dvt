-- Complete component-profile observability for the Phase 4 selection recovery
-- pair. These browser components are observed through governed read models,
-- focused tests, exact receipts, and visible refresh failures rather than a
-- new runtime telemetry channel.

insert into architecture.component_observability (
  observability_id, component_id, signal_name, signal_kind, required, status
)
values
  (
    'OBS-WEB-DBT-SELECTION-RECOVERY-COMPONENT-PROFILE',
    'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY',
    'Selection recovery is observable through component-profile, component-integrity, exact command receipts, visible authority-refresh failures, and focused policy/adapter tests.',
    'dashboard',
    true,
    'implemented'
  ),
  (
    'OBS-WEB-DBT-SELECTION-RECOVERY-VIEW-COMPONENT-PROFILE',
    'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW',
    'Selection recovery presentation is observable through component-profile, component-integrity, operational drawer integration evidence, and focused presentation tests.',
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

do $$
declare
  mature_component_count integer;
begin
  select count(*) into mature_component_count
  from architecture.component_maturity_query
  where component_id in (
    'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY',
    'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW'
  )
    and maturity_score >= 85
    and coalesce(array_length(missing_reasons, 1), 0) = 0;

  if mature_component_count <> 2 then
    raise exception 'Selection recovery component pair requires maturity >= 85 with no missing reasons, found %', mature_component_count;
  end if;
end $$;
