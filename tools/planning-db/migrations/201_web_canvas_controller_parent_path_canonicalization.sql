-- Canonicalize the Canvas controller aggregate repo_path after creating the
-- orchestration child. The file useCanvasController.ts belongs to the child;
-- the parent aggregate is anchored to the controller directory boundary.

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
  'PLANNING-DB-WEB-CANVAS-CONTROLLER-PARENT-PATH-20260619',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Web Canvas controller aggregate path canonicalization',
  'Architecture / Planning DB / Frontend',
  'review',
  'After the Canvas controller orchestration child was introduced, SYS-WEB-CANVAS-CONTROLLER-INTERACTION and SYS-WEB-CANVAS-CONTROLLER-ORCHESTRATION both referenced useCanvasController.ts as repo_path. The child owns the concrete file; the parent aggregate must reference the controller directory boundary to avoid duplicate_repo_path drift.',
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
    'PLANNING-DB-WEB-CANVAS-CONTROLLER-PARENT-PATH-20260619',
    'component',
    'SYS-WEB-CANVAS-CONTROLLER-INTERACTION',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-CONTROLLER-PARENT-PATH-20260619',
    'component',
    'SYS-WEB-CANVAS-CONTROLLER-ORCHESTRATION',
    'may_reference',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-CONTROLLER-PARENT-PATH-20260619',
    'path',
    'apps/web/src/app/views/canvas',
    'may_reference',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-CONTROLLER-PARENT-PATH-20260619',
    'path',
    'apps/web/src/app/views/canvas/useCanvasController.ts',
    'may_reference',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update architecture.component
set
  repo_path = 'apps/web/src/app/views/canvas',
  public_contract = 'Canvas controller aggregate boundary. Concrete files resolve to read-model, mutation, command, presentation-policy, orchestration, or environment child components.',
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-CONTROLLER-INTERACTION';

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values (
  'SYS-WEB-CANVAS-CONTROLLER-INTERACTION',
  'transition',
  'Aggregate repo_path is the Canvas controller directory; useCanvasController.ts is owned by SYS-WEB-CANVAS-CONTROLLER-ORCHESTRATION to avoid duplicate_repo_path drift.',
  1
)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;
