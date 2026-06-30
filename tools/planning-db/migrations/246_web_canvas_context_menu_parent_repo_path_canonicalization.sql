-- After splitting Canvas context-menu implementation leaves, keep aggregate
-- and core architecture rows anchored to governing docs instead of concrete
-- source files now owned by leaves.

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
  'PLANNING-DB-WEB-CANVAS-CONTEXT-MENU-PARENT-PATH-CANONICALIZATION-20260619',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Web Canvas context-menu parent path canonicalization',
  'Architecture / Planning DB / Frontend',
  'implemented',
  'The Canvas context-menu aggregate and core components are composite boundaries. After concrete primitives and view files became leaf-owned, their parent repo_path values must point at governing architecture documents instead of duplicating leaf source files.',
  'responsibility_overload',
  'ResolveCanvasContextMenu;RenderCanvasContextMenu;RecordArchitectureComponent;CheckPlanningDbComponentIntegrity',
  now()
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  approved_at = coalesce(architecture.design.approved_at, excluded.approved_at),
  updated_at = now();

insert into architecture.design_scope (
  design_id,
  subject_kind,
  subject_id,
  scope_kind,
  required
)
values
  ('PLANNING-DB-WEB-CANVAS-CONTEXT-MENU-PARENT-PATH-CANONICALIZATION-20260619', 'component', 'SYS-WEB-CANVAS-CANVAS-CONTEXT-MENU', 'may_update', true),
  ('PLANNING-DB-WEB-CANVAS-CONTEXT-MENU-PARENT-PATH-CANONICALIZATION-20260619', 'component', 'SYS-WEB-CANVAS-CONTEXT-MENU-CORE', 'may_update', true),
  ('PLANNING-DB-WEB-CANVAS-CONTEXT-MENU-PARENT-PATH-CANONICALIZATION-20260619', 'path', 'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-CONTEXT-MENU-PARENT-PATH-CANONICALIZATION-20260619', 'path', 'docs/architecture/components/web/graph/canvas-interaction-command-surface-component.md', 'may_reference', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update architecture.component
set
  repo_path = 'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md',
  public_contract = 'Composite Canvas context-menu boundary. Concrete view, primitives, presenter, and node model files are leaf-owned.',
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-CANVAS-CONTEXT-MENU';

update architecture.component
set
  repo_path = 'docs/architecture/components/web/graph/canvas-interaction-command-surface-component.md',
  public_contract = 'Canvas context-menu core composite. Concrete primitives, view, presenter, and node model files are leaf-owned.',
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-CONTEXT-MENU-CORE';
