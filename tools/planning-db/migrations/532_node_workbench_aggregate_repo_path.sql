-- Keep the NodeWorkbench aggregate on a unique architecture anchor. Concrete
-- TSX files are owned by leaf components such as CanvasNodeWorkbenchPanel and
-- CanvasNodeWorkbenchOverlay; the aggregate must not claim the whole canvas
-- directory and collide with the Canvas controller aggregate.

update architecture.component
set
  repo_path = 'docs/architecture/components/web/graph/canvas-inspector-authoring-component.md',
  public_contract =
    'Aggregate Canvas node workbench boundary; concrete panel, overlay, property tabs, and authoring files are owned by child components.',
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-NODE-WORKBENCH';

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  (
    'SYS-WEB-CANVAS-NODE-WORKBENCH',
    'invariant',
    'Aggregate repo_path is the Canvas inspector authoring architecture component document; concrete NodeWorkbench TSX files are owned by child components to avoid duplicate_repo_path drift.',
    0
  ),
  (
    'SYS-WEB-CANVAS-NODE-WORKBENCH',
    'governance_ref',
    'docs/architecture/components/web/graph/canvas-inspector-authoring-component.md',
    0
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;
