-- Prevent caller-provided DBT run-execution-context references from bypassing
-- StartRun profile admission until their server-owned provenance is verifiable.

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
  'DBT-RUNTIME-CONTEXT-REF-PROVENANCE-20260712',
  'E-DBT-PROJECT-ROUNDTRIP-1',
  'Reject untrusted DBT run context references',
  'API / Runtime safety and admission / dbt integration',
  'approved',
  'The protected StartRun HTTP surface accepts syntactically valid runExecutionContextRef values, but the current contract carries no server-owned provenance proof. DBT execution must reject an inbound reference before engine dispatch instead of allowing it to bypass workspace profile admission.',
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
    'DBT-RUNTIME-CONTEXT-REF-PROVENANCE-20260712',
    'decision',
    'ADR-0060',
    'must_prove',
    true
  ),
  (
    'DBT-RUNTIME-CONTEXT-REF-PROVENANCE-20260712',
    'component',
    'SYS-API-APPLICATION-SERVICES-START-RUN-ADMISSION',
    'may_update',
    true
  ),
  (
    'DBT-RUNTIME-CONTEXT-REF-PROVENANCE-20260712',
    'risk',
    'R-20260712-DBT-RUNTIME-BUNDLE-SECRETS',
    'must_prove',
    true
  ),
  (
    'DBT-RUNTIME-CONTEXT-REF-PROVENANCE-20260712',
    'path',
    'apps/api/src/application/services/DbtRunExecutionContextBindingUseCase.ts',
    'may_update',
    true
  ),
  (
    'DBT-RUNTIME-CONTEXT-REF-PROVENANCE-20260712',
    'path',
    'apps/api/src/application/ports/protectedRuntimeRailVocabulary.ts',
    'may_update',
    true
  ),
  (
    'DBT-RUNTIME-CONTEXT-REF-PROVENANCE-20260712',
    'path',
    'apps/api/src/application/ports/protectedRuntimePlanCommandQueryRails.ts',
    'may_update',
    true
  ),
  (
    'DBT-RUNTIME-CONTEXT-REF-PROVENANCE-20260712',
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
values (
  'SYS-API-APPLICATION-SERVICES-START-RUN-ADMISSION',
  'invariant',
  'StartRun rejects inbound DBT runExecutionContextRef values until the application can prove server-owned provenance.',
  3
)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;
