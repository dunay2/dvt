-- Remove the transient duplicate role introduced while moving DVT transform
-- column projection into the NodeWorkbench read-model boundary.

delete from planning_query_store.frontend_component_local_files
where component_id = 'web.component.canvas.NodeWorkbench'
  and file_path = 'apps/web/src/app/components/inspector/nodePropertiesReadModel.ts'
  and file_role = 'model';
