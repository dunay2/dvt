-- Remove active Canvas context-menu vocabulary that still named the retired
-- fixed add-node palette after the palette was deprecated in migration 147.

update architecture.component
set
  public_contract = 'Canvas context menu aggregate boundary. It owns viewport contextual command presentation and presenter routing; fixed add-node palette evidence is deprecated.',
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-CANVAS-CONTEXT-MENU';

update architecture.component_responsibility
set
  responsibility = 'Coordinate context-menu view, presenter, viewport action routing, and focused component tests.',
  reason_to_change = 'Canvas context menu presentation, close timing, or action routing changes.'
where responsibility_id = 'RESP-SYS-WEB-CANVAS-CANVAS-CONTEXT-MENU';
