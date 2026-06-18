-- Keep the deprecated output-target duplicate out of the live node/edge
-- authoring component tree. The retired catalog belongs to the Canvas legacy
-- add-node palette retirement evidence component.

insert into architecture.design_scope (
  design_id,
  subject_kind,
  subject_id,
  scope_kind,
  required
)
values
  (
    'PLANNING-DB-CANVAS-OUTPUT-TARGET-DEPRECATION-20260618',
    'component',
    'SYS-WEB-CANVAS-OUTPUT-TARGET-TEMPLATES',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-CANVAS-OUTPUT-TARGET-DEPRECATION-20260618',
    'component',
    'SYS-WEB-CANVAS-LEGACY-ADD-NODE-PALETTE-RETIREMENT',
    'may_reference',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update planning_query_store.governance_component_local_definitions
set
  parent_id = 'SYS-WEB-CANVAS-LEGACY-ADD-NODE-PALETTE-RETIREMENT',
  revision = revision + 1
where component_id = 'SYS-WEB-CANVAS-OUTPUT-TARGET-TEMPLATES';

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values (
  'SYS-WEB-CANVAS-OUTPUT-TARGET-TEMPLATES',
  'transition',
  'reparented from live node-edge authoring to legacy add-node palette retirement evidence after component-quality detected a composite/direct-file conflict.',
  2
)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;
