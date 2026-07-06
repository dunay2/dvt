-- Align architecture.component authority with the contextual NodeWorkbench
-- ownership model. The old fixed inspector files are gone, so architecture
-- paths must not point at deleted TSX files after governance import.

update architecture.component
set
  repo_path = 'apps/web/src/app/views/canvas',
  public_contract =
    'Contextual Canvas node workbench aggregate. Active presentation is composed through CanvasNodeWorkbenchPanel, CanvasNodeWorkbenchOverlay, NodePropertiesTabs, and authoring leaf components.',
  status = 'implemented',
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-NODE-WORKBENCH';

update architecture.component
set
  repo_path = 'planning_query_store.governance_component_local_definitions#SYS-WEB-CANVAS-INSPECTOR-PANEL',
  public_contract =
    'Deprecated audit-only fixed inspector shell. The fixed InspectorPanel.tsx surface was removed; contextual NodeWorkbench presentation owns node properties and plugin tab handoff.',
  status = 'deprecated',
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-INSPECTOR-PANEL';

update architecture.component_responsibility
set
  responsibility = 'Retired fixed inspector panel ownership record retained for audit and migration traceability.',
  reason_to_change = 'Only changes when reviewing historical fixed inspector retirement evidence.',
  ddd_owner = 'DeprecatedInspectorPanelRecord',
  status = 'drift'
where responsibility_id = 'RESP-SYS-WEB-CANVAS-INSPECTOR-PANEL';

update architecture.component_test
set
  test_path = 'apps/web/src/app/views/canvas/CanvasShell.architecture.test.tsx',
  validation_command =
    'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-architecture.config.ts src/app/views/canvas/CanvasShell.architecture.test.tsx'
where test_id = 'TEST-WEB-CANVAS-INSPECTOR-PANEL';

update architecture.component_test
set
  test_path = 'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx',
  validation_command =
    'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-presentation.config.ts src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx'
where test_id = 'TEST-WEB-CANVAS-NODE-WORKBENCH';
