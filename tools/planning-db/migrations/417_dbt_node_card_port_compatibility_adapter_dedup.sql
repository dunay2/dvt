-- Avoid adding a third local-file role for DbtNodeComponent. The existing
-- adapter row is the right place to record the GraphNodeCard port-compatibility
-- handoff.

delete from planning_query_store.frontend_component_local_files
where component_id = 'web.component.canvas.DbtNodeCard'
  and file_path = 'apps/web/src/app/components/canvas/DbtNodeComponent.tsx'
  and file_role = 'integration-adapter';

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb) || jsonb_build_object(
    'portCompatibilityHandoff',
    jsonb_build_object(
      'targetComponent', 'web.component.canvas.GraphNodeCard',
      'targetRail', 'RenderCanvasNodePortHandle',
      'responsibility', 'Pass caller-owned port compatibility view data from DbtNodeData into CanvasNodeShell.'
    )
  ),
  source_path = 'tools/planning-db/migrations/417_dbt_node_card_port_compatibility_adapter_dedup.sql',
  source_content_sha256 = md5('file:DbtNodeComponent:port-compatibility-adapter-dedup:417'),
  updated_at = now()
where component_id = 'web.component.canvas.DbtNodeCard'
  and file_path = 'apps/web/src/app/components/canvas/DbtNodeComponent.tsx'
  and file_role = 'adapter';
