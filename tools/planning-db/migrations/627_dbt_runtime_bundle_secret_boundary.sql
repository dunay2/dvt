-- Govern the F-03 containment slice through the existing StartRun rail.
-- Credential target ownership remains an explicit open risk after profiles.yml
-- is removed from runtime project bundles.

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
  'DBT-RUNTIME-BUNDLE-SECRET-BOUNDARY-20260712',
  'E-DBT-PROJECT-ROUNDTRIP-1',
  'Exclude credential material from dbt runtime project bundles',
  'API / Runtime safety and admission / dbt integration',
  'approved',
  'DbtRunExecutionContextBindingUseCase is an internal StartRun policy. Runtime project bundles may carry executable project sources but must exclude profiles.yml at every depth and must never transport resolved credentials or secret bytes.',
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

insert into architecture.risk (
  risk_id,
  component_id,
  severity,
  probability,
  status,
  source_ref
)
values (
  'R-20260712-DBT-RUNTIME-BUNDLE-SECRETS',
  'SYS-API-APPLICATION-SERVICES-START-RUN-ADMISSION',
  'critical',
  'medium',
  'open',
  'docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md#f-03--profilesyml-bundle-leakage'
)
on conflict (risk_id) do update set
  component_id = excluded.component_id,
  severity = excluded.severity,
  probability = excluded.probability,
  status = excluded.status,
  source_ref = excluded.source_ref;

insert into architecture.design_scope (
  design_id,
  subject_kind,
  subject_id,
  scope_kind,
  required
)
values
  (
    'DBT-RUNTIME-BUNDLE-SECRET-BOUNDARY-20260712',
    'decision',
    'ADR-0060',
    'must_prove',
    true
  ),
  (
    'DBT-RUNTIME-BUNDLE-SECRET-BOUNDARY-20260712',
    'component',
    'SYS-API-APPLICATION-SERVICES-START-RUN-ADMISSION',
    'may_update',
    true
  ),
  (
    'DBT-RUNTIME-BUNDLE-SECRET-BOUNDARY-20260712',
    'risk',
    'R-20260712-DBT-RUNTIME-BUNDLE-SECRETS',
    'must_prove',
    true
  ),
  (
    'DBT-RUNTIME-BUNDLE-SECRET-BOUNDARY-20260712',
    'path',
    'apps/api/src/application/services/DbtRunExecutionContextBindingUseCase.ts',
    'may_update',
    true
  ),
  (
    'DBT-RUNTIME-BUNDLE-SECRET-BOUNDARY-20260712',
    'path',
    'apps/api/src/application/ports/protectedRuntimeRailVocabulary.ts',
    'may_update',
    true
  ),
  (
    'DBT-RUNTIME-BUNDLE-SECRET-BOUNDARY-20260712',
    'path',
    'apps/api/src/application/ports/protectedRuntimePlanCommandQueryRails.ts',
    'may_update',
    true
  ),
  (
    'DBT-RUNTIME-BUNDLE-SECRET-BOUNDARY-20260712',
    'test',
    'TEST-SYS-API-APPLICATION-SERVICES-START-RUN-ADMISSION',
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
    'StartRun dbt project bundles exclude profiles.yml at every path depth and contain no credential or resolved-secret bytes.',
    0
  ),
  (
    'SYS-API-APPLICATION-SERVICES-START-RUN-ADMISSION',
    'non_goal',
    'Do not create a separate BindDbtRunExecutionContext product rail; execution-context binding is an internal StartRun policy.',
    0
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;
