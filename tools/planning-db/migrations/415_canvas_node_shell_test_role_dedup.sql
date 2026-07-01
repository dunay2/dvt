-- Keep GraphNodeCard test ownership relationally unique for CanvasNodeShell.
-- The test is a presentation contract; the older generic "test" local-file row
-- is removed to avoid duplicate component-file semantics.

delete from planning_query_store.frontend_component_local_files
where component_id = 'web.component.canvas.GraphNodeCard'
  and file_path = 'apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx'
  and file_role = 'test';
