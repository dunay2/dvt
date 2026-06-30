-- Canonicalize the Web Canvas execution/runs aggregate repo path after the
-- leaf split. The aggregate is an architectural boundary, so it must not share
-- the canvas directory repo_path with another aggregate component and must not
-- duplicate a concrete child implementation file path.

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
  'PLANNING-DB-WEB-CANVAS-EXECUTION-RUNS-PARENT-PATH-20260619',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Web Canvas execution/runs aggregate repo path canonicalization',
  'Architecture / Planning DB / Web Canvas',
  'review',
  'SYS-WEB-CANVAS-EXECUTION-RUNS is an aggregate over execution action composition, draft flush, selection, run start, runtime policy, readiness, and operational drawer contribution leaves. Its repo_path must be a unique architecture anchor instead of the shared apps/web/src/app/views/canvas directory already used by the Canvas controller aggregate.',
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
    'PLANNING-DB-WEB-CANVAS-EXECUTION-RUNS-PARENT-PATH-20260619',
    'component',
    'SYS-WEB-CANVAS-EXECUTION-RUNS',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-EXECUTION-RUNS-PARENT-PATH-20260619',
    'component',
    'SYS-WEB-CANVAS-CONTROLLER-INTERACTION',
    'may_reference',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-EXECUTION-RUNS-PARENT-PATH-20260619',
    'path',
    'docs/architecture/components/web/graph/canvas-execution-selection-component.md',
    'may_update',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update architecture.component
set
  repo_path = 'docs/architecture/components/web/graph/canvas-execution-selection-component.md',
  public_contract = 'Aggregate Web Canvas execution and runs boundary. Concrete implementation files are owned by execution/runs child components; the aggregate is anchored to the architecture guide that governs preview/run selection and handoff.',
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-EXECUTION-RUNS';

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values (
  'SYS-WEB-CANVAS-EXECUTION-RUNS',
  'invariant',
  'The aggregate architecture component must use a unique architecture-document repo_path and must not duplicate the shared Canvas directory or a child implementation file path.',
  1
)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;
