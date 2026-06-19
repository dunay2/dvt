-- Canonicalize the Temporal workflow runtime aggregate repo_path after
-- creating responsibility leaves. The parent is an aggregate identity;
-- concrete files remain owned by the leaves created in migration 213.

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
  'PLANNING-DB-TEMPORAL-WORKFLOW-RUNTIME-PARENT-PATH-20260619',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Temporal workflow runtime aggregate path canonicalization',
  'Architecture / Planning DB / Adapters',
  'review',
  'Migration 213 kept SYS-ADAPTERS-TEMPORAL-WORKFLOW-RUNTIME as an aggregate but anchored it to packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts, which is the canonical repo_path for the entrypoint leaf. The aggregate must use the workflow runtime directory as a unique existing anchor while leaf components own concrete files to avoid duplicate_repo_path drift.',
  'boundary_drift',
  'ValidateComponentIntegrity;ReadComponentProfile',
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
    'PLANNING-DB-TEMPORAL-WORKFLOW-RUNTIME-PARENT-PATH-20260619',
    'component',
    'SYS-ADAPTERS-TEMPORAL-WORKFLOW-RUNTIME',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-TEMPORAL-WORKFLOW-RUNTIME-PARENT-PATH-20260619',
    'component',
    'SYS-ADAPTERS-TEMPORAL-WORKFLOW-ENTRYPOINT',
    'may_reference',
    true
  ),
  (
    'PLANNING-DB-TEMPORAL-WORKFLOW-RUNTIME-PARENT-PATH-20260619',
    'path',
    'packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts',
    'may_reference',
    true
  ),
  (
    'PLANNING-DB-TEMPORAL-WORKFLOW-RUNTIME-PARENT-PATH-20260619',
    'path',
    'packages/@dvt/adapter-temporal/src/workflows',
    'may_update',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update architecture.component
set
  repo_path = 'packages/@dvt/adapter-temporal/src/workflows',
  public_contract = 'Aggregate Temporal run-plan workflow runtime boundary. Concrete workflow files are owned by run mapping, entrypoint, lifecycle control, cursor state, layer execution, segment resolution, and integration harness child components.',
  updated_at = now()
where component_id = 'SYS-ADAPTERS-TEMPORAL-WORKFLOW-RUNTIME';

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values (
  'SYS-ADAPTERS-TEMPORAL-WORKFLOW-RUNTIME',
  'transition',
  'Aggregate repo_path is packages/@dvt/adapter-temporal/src/workflows as a unique existing anchor; concrete Temporal workflow runtime files are owned by child components to avoid duplicate_repo_path drift with SYS-ADAPTERS-TEMPORAL-WORKFLOW-ENTRYPOINT.',
  1
)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;
