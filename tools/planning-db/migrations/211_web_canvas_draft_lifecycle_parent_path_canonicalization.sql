-- Canonicalize the Canvas draft lifecycle aggregate repo_path after creating
-- responsibility leaves. The parent is an aggregate identity; concrete files
-- remain owned by the leaves created in migration 210.

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
  'PLANNING-DB-WEB-CANVAS-DRAFT-LIFECYCLE-PARENT-PATH-20260619',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Web Canvas draft lifecycle aggregate path canonicalization',
  'Architecture / Planning DB / Frontend',
  'review',
  'Migration 210 kept SYS-WEB-CANVAS-DRAFT-LIFECYCLE as an aggregate but anchored it to apps/web/src/app/views/canvas, which collides with the existing SYS-WEB-CANVAS-CONTROLLER-INTERACTION aggregate identity. The aggregate must use a unique existing implementation anchor while leaf components own concrete draft lifecycle files to avoid duplicate_repo_path drift.',
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
    'PLANNING-DB-WEB-CANVAS-DRAFT-LIFECYCLE-PARENT-PATH-20260619',
    'component',
    'SYS-WEB-CANVAS-DRAFT-LIFECYCLE',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-DRAFT-LIFECYCLE-PARENT-PATH-20260619',
    'component',
    'SYS-WEB-CANVAS-CONTROLLER-INTERACTION',
    'may_reference',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-DRAFT-LIFECYCLE-PARENT-PATH-20260619',
    'path',
    'apps/web/src/app/views/canvas',
    'may_reference',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-DRAFT-LIFECYCLE-PARENT-PATH-20260619',
    'path',
    'apps/web/src/app/views/canvas/useCanvasDraftLifecycle.ts',
    'may_reference',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update architecture.component
set
  repo_path = 'apps/web/src/app/views/canvas/useCanvasDraftLifecycle.ts',
  public_contract = 'Aggregate Web Canvas draft lifecycle boundary. Concrete files are owned by access, authoring, repository, session, read-model, autosave, and recovery child components.',
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-DRAFT-LIFECYCLE';

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values (
  'SYS-WEB-CANVAS-DRAFT-LIFECYCLE',
  'transition',
  'Aggregate repo_path is useCanvasDraftLifecycle.ts as a unique existing anchor; concrete draft lifecycle files are owned by child components to avoid duplicate_repo_path drift with SYS-WEB-CANVAS-CONTROLLER-INTERACTION.',
  1
)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;
