-- Canonicalize the API application-services aggregate anchor away from the
-- physical services directory. Concrete service files are owned by the 205
-- child leaves, and SYS-PLANSTORE-API-COMPOSITION already uses the directory
-- path as its aggregate architecture anchor for plan-store service leaves.

update architecture.component
set
  repo_path = 'planning_query_store.governance_component_local_definitions#SYS-API-APPLICATION-SERVICES',
  public_contract = 'Aggregate API application-services boundary; concrete service files resolve to responsibility-owned child components.',
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
  'PLANNING-DB-API-APPLICATION-SERVICES-PARENT-ANCHOR-20260619',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'API application service aggregate repo-path canonicalization',
  'Architecture / Planning DB / API',
  'review',
  'The API application-services aggregate must not share the physical apps/api/src/application/services repo_path with SYS-PLANSTORE-API-COMPOSITION. The aggregate is an architectural grouping; the physical files are owned by responsibility leaves created in migration 205. This migration keeps the aggregate queryable without creating duplicate repo_path integrity findings.',
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
    'PLANNING-DB-API-APPLICATION-SERVICES-PARENT-ANCHOR-20260619',
    'component',
    'SYS-API-APPLICATION-SERVICES',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-API-APPLICATION-SERVICES-PARENT-ANCHOR-20260619',
    'component',
    'SYS-PLANSTORE-API-COMPOSITION',
    'may_reference',
    true
  ),
  (
    'PLANNING-DB-API-APPLICATION-SERVICES-PARENT-ANCHOR-20260619',
    'path',
    'planning_query_store.governance_component_local_definitions#SYS-API-APPLICATION-SERVICES',
    'may_reference',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;
