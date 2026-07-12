-- Fail closed when a DBT workspace still carries profiles.yml but the
-- run-execution context has no server-owned profile or credential reference.
-- This remains an internal StartRun admission policy, not a parallel rail.

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
  'DBT-RUNTIME-PROFILE-ADMISSION-20260712',
  'E-DBT-PROJECT-ROUNDTRIP-1',
  'Reject workspace DBT profiles before runtime binding',
  'API / Runtime safety and admission / dbt integration',
  'approved',
  'Until RunExecutionContext carries a server-owned DBT profile or credential reference, StartRun must reject a DBT workspace containing profiles.yml before bundle materialization or engine dispatch. Silent fallback to a worker-home profile is not an admissible execution posture.',
  'boundary_drift',
  'StartRun',
  now()
)
on conflict (design_id) do update set
  work_item_id = excluded.work_item_id,
  title = excluded.title,
  owner = excluded.owner,
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  approved_at = excluded.approved_at,
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
    'DBT-RUNTIME-PROFILE-ADMISSION-20260712',
    'decision',
    'ADR-0060',
    'must_prove',
    true
  ),
  (
    'DBT-RUNTIME-PROFILE-ADMISSION-20260712',
    'component',
    'SYS-API-APPLICATION-SERVICES-START-RUN-ADMISSION',
    'may_update',
    true
  ),
  (
    'DBT-RUNTIME-PROFILE-ADMISSION-20260712',
    'risk',
    'R-20260712-DBT-RUNTIME-BUNDLE-SECRETS',
    'must_prove',
    true
  ),
  (
    'DBT-RUNTIME-PROFILE-ADMISSION-20260712',
    'path',
    'apps/api/src/application/services/DbtRunExecutionContextBindingUseCase.ts',
    'may_update',
    true
  ),
  (
    'DBT-RUNTIME-PROFILE-ADMISSION-20260712',
    'test',
    'TEST-API-START-RUN-DBT-BUNDLE-SECURITY',
    'must_prove',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  (
    'SYS-API-APPLICATION-SERVICES-START-RUN-ADMISSION',
    'invariant',
    'StartRun rejects a DBT workspace containing profiles.yml before writing bundle artifacts or dispatching the engine while no server-owned profile reference exists.',
    1
  ),
  (
    'SYS-API-APPLICATION-SERVICES-START-RUN-ADMISSION',
    'invariant',
    'A workspace-supplied DBT profile never falls through to an unrelated worker-home profile.',
    2
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;
