-- Keep Canvas context menu as the aggregate component, but stop pointing its
-- architecture authority at the AddNodePalette child file. The palette remains
-- a real subcomponent; the parent authority uses the context menu view surface.

update architecture.component
set
  repo_path = 'apps/web/src/app/views/canvas/CanvasContextMenuView.tsx',
  public_contract = 'Canvas context menu aggregate boundary. It contains the add-node palette and context-menu presenter surfaces without claiming their child ownership as its own file path.',
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-CANVAS-CONTEXT-MENU'
  and repo_path = 'apps/web/src/app/views/canvas/CanvasAddNodePalette.tsx';

update architecture.component_relation
set
  source_refs = jsonb_build_array(
    'apps/web/src/app/views/canvas/CanvasContextMenuView.tsx',
    'apps/web/src/app/views/canvas/CanvasAddNodePalette.tsx'
  ),
  updated_at = now()
where relation_id = 'REL-LOCAL-CONTAINS-5837EAC3819C358C'
  and source_component_id = 'SYS-WEB-CANVAS-CANVAS-CONTEXT-MENU'
  and target_component_id = 'SYS-WEB-CANVAS-ADD-NODE-PALETTE';
