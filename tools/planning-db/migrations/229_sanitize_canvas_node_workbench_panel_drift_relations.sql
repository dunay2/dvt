-- Complete the phantom panel retirement without leaving architecture drift
-- rows. The schema has no retired relation state, so legacy relation ids are
-- retained as implemented aliases to the real current components.

update architecture.contract
set
  status = 'implemented',
  compatibility = 'internal',
  contract_ref = 'planning_query_store.governance_component_local_definitions#SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
  validation_command = 'pnpm planning:db:query component-profile --component SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL --no-refresh --limit 80',
  updated_at = now()
where owner_component_id = 'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL';

update architecture.component_relation
set
  target_component_id = 'SYS-WEB-CANVAS-INSPECTOR-PANEL',
  relation_type = 'contains',
  direction = 'outbound',
  sync_async = 'build_time',
  contract_id = null,
  status = 'implemented',
  failure_mode = 'Legacy relation id retained as an alias to the real InspectorPanel component after the phantom panel reactivation was retired.',
  authorization_scope = 'repo-local Canvas node workbench presentation',
  source_refs = jsonb_build_array(
    'apps/web/src/app/components/InspectorPanel.tsx',
    'tools/planning-db/migrations/229_sanitize_canvas_node_workbench_panel_drift_relations.sql'
  ),
  updated_at = now()
where relation_id = 'REL-WEB-CANVAS-NODE-WORKBENCH-CONTAINS-PANEL';

update architecture.component_relation
set
  target_component_id = 'SYS-WEB-CANVAS-INSPECTOR-PANEL',
  relation_type = 'depends_on',
  direction = 'outbound',
  sync_async = 'sync',
  contract_id = null,
  status = 'implemented',
  failure_mode = 'Overlay handoff depends on the real InspectorPanel component; the phantom panel relation id is retained only as compatibility evidence.',
  authorization_scope = 'browser-local Canvas node workbench presentation',
  source_refs = jsonb_build_array(
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.tsx',
    'apps/web/src/app/components/InspectorPanel.tsx',
    'tools/planning-db/migrations/229_sanitize_canvas_node_workbench_panel_drift_relations.sql'
  ),
  updated_at = now()
where relation_id = 'REL-WEB-CANVAS-NODE-WORKBENCH-OVERLAY-DEPENDS-ON-PANEL';

update architecture.component_relation
set
  status = 'implemented',
  failure_mode = 'Canonical overlay to InspectorPanel dependency kept after phantom panel retirement.',
  updated_at = now()
where relation_id = 'REL-WEB-CANVAS-NODE-WORKBENCH-OVERLAY-DEPENDS-ON-INSPECTOR-PANEL';
