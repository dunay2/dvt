-- Move the API application-services aggregate to an existing, unique
-- application-layer anchor. Migration 206 removed the duplicate physical
-- services path, but the integrity baseline requires component repo_path
-- anchors to exist in the tracked filesystem unless explicitly retired.

update architecture.component
set
  repo_path = 'apps/api/src/application',
  public_contract = 'Aggregate API application-services boundary; concrete service files resolve to responsibility-owned child components and API application ports remain sibling-owned.',
  updated_at = now()
where component_id = 'SYS-API-APPLICATION-SERVICES';

insert into architecture.design (
  design_id,
  work_item_id,
  title,
  owner,
  status,
  rationale,
  fowler_signal,
  rail_ref,
  approved_at
)
values (
  'PLANNING-DB-API-APPLICATION-SERVICES-PARENT-EXISTING-PATH-20260619',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'API application service aggregate existing-path anchor',
  'Architecture / Planning DB / API',
  'review',
  'The API application-services aggregate needs a real filesystem anchor for component-integrity while avoiding the duplicate apps/api/src/application/services repo_path shared with SYS-PLANSTORE-API-COMPOSITION. apps/api/src/application is the owning application-layer directory; concrete service and port files remain owned by child or sibling components.',
  'boundary_drift',
  'ReadComponentProfile;ValidateComponentIntegrity',
  null
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  updated_at = now();

insert into architecture.design_scope (
  design_id,
  subject_kind,
  subject_id,
  scope_kind,
  required
)
values
  (
    'PLANNING-DB-API-APPLICATION-SERVICES-PARENT-EXISTING-PATH-20260619',
    'component',
    'SYS-API-APPLICATION-SERVICES',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-API-APPLICATION-SERVICES-PARENT-EXISTING-PATH-20260619',
    'component',
    'SYS-API-APPLICATION-PORTS',
    'may_reference',
    true
  ),
  (
    'PLANNING-DB-API-APPLICATION-SERVICES-PARENT-EXISTING-PATH-20260619',
    'component',
    'SYS-PLANSTORE-API-COMPOSITION',
    'may_reference',
    true
  ),
  (
    'PLANNING-DB-API-APPLICATION-SERVICES-PARENT-EXISTING-PATH-20260619',
    'path',
    'apps/api/src/application',
    'may_reference',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;
