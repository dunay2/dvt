-- Complete the Canvas UX professional reference catalog from buzon/TAREA.TXT as
-- DB-owned specification records. TAREA.TXT remains intake evidence; this
-- migration owns the queryable vocabulary used by implementation slices.

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
  'CANVAS-UXDB-PROFESSIONAL-REFERENCE-CATALOG',
  'E-CANVAS-UXDB-REFERENCE-CATALOG-1',
  'Canvas UX professional reference catalog',
  'Frontend / Planning DB',
  'review',
  'The current TAREA.TXT specification requires professional UX references, mandatory UX/DB vocabulary, component surfaces, command/query specs, tests and export posture to be queryable in Planning DB before further Canvas UI implementation.',
  'hidden_authority',
  'ListCanvasUxdbProfessionalReferenceCatalog',
  now()
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  updated_at = now();

with professional_catalog_records as (
  select *
  from (
    values
      (
        'UX-001',
        'ux_rule',
        'Graph is the base mode and not a tab',
        'E-CANVAS-TOPBAR-MINIMAL-1',
        'web.canvas.graph',
        'RenderCanvasGraphBase',
        'accepted',
        'mandatory-graph-first-vocabulary',
        'buzon/TAREA.TXT#2.1',
        jsonb_build_object('scope', 'canvas', 'priority', 'P0')
      ),
      (
        'UX-002',
        'ux_rule',
        'Graph Code Log are not peer navigation tabs',
        'E-CANVAS-TOPBAR-MINIMAL-1',
        'web.component.canvas.CanvasShellChrome',
        'RenderCanvasShellChrome',
        'accepted',
        'retire-global-view-tabs',
        'buzon/TAREA.TXT#2.1',
        jsonb_build_object('scope', 'chrome', 'forbidden', jsonb_build_array('Graph tab', 'Code tab', 'Log tab'))
      ),
      (
        'UX-003',
        'ux_rule',
        'Code opens contextually while the graph remains visible',
        'E-CANVAS-SQL-CONTEXT-WORKBENCH-1',
        'web.component.canvas.SqlContextWorkbench',
        'ResolveCanvasWorkbenchContext',
        'accepted',
        'contextual-code-workbench',
        'buzon/TAREA.TXT#2.1',
        jsonb_build_object('scope', 'node-workbench', 'surface', 'graph-plus-sql')
      ),
      (
        'UX-004',
        'ux_rule',
        'Log Problems Runs and Preview live in the bottom drawer',
        'E-CANVAS-BOTTOM-DRAWER-OPS-1',
        'web.component.shell.BottomOperationalDrawer',
        'RenderBottomOperationalDrawer',
        'accepted',
        'operational-drawer-home',
        'buzon/TAREA.TXT#2.1',
        jsonb_build_object('scope', 'operations', 'tabs', jsonb_build_array('Log', 'Problems', 'Runs', 'Preview'))
      ),
      (
        'UX-005',
        'ux_rule',
        'No fixed left resource panel in the base state',
        'E-CANVAS-LEGACY-PALETTE-RETIRE-1',
        'web.component.canvas.SourceImportDialog',
        'OpenCanvasSourceImportDialog',
        'accepted',
        'retire-fixed-source-panel',
        'buzon/TAREA.TXT#2.1',
        jsonb_build_object('replacement', 'AddSourceDialog')
      ),
      (
        'UX-006',
        'ux_rule',
        'No fixed right multipurpose inspector in the base state',
        'E-CANVAS-NODE-WORKBENCH-1',
        'web.component.canvas.NodeWorkbench',
        'InspectCanvasNodeProperties',
        'accepted',
        'retire-fixed-right-inspector',
        'buzon/TAREA.TXT#2.1',
        jsonb_build_object('replacement', 'NodeWorkbench')
      ),
      (
        'UX-007',
        'ux_rule',
        'Insertion actions originate from canvas context',
        'E-CANVAS-SPATIAL-ADD-NODES-1',
        'web.component.canvas.CanvasContextMenu',
        'ResolveCanvasContextMenu',
        'accepted',
        'spatial-insertion-grammar',
        'buzon/TAREA.TXT#2.1',
        jsonb_build_object('scope', 'canvas')
      ),
      (
        'UX-008',
        'ux_rule',
        'Node actions originate from the node context',
        'E-CANVAS-CONTEXT-MENU-HUMAN-PROOF-1',
        'web.component.canvas.CanvasNodeContextMenu',
        'ResolveCanvasContextMenu',
        'accepted',
        'node-action-grammar',
        'buzon/TAREA.TXT#2.1',
        jsonb_build_object('scope', 'node')
      ),
      (
        'UX-009',
        'ux_rule',
        'CanvasContextMenu and NodeContextMenu are different surfaces',
        'E-CANVAS-CONTEXT-MENU-HUMAN-PROOF-1',
        'web.component.canvas.CanvasContextMenu',
        'ResolveCanvasContextMenu',
        'accepted',
        'separate-context-grammars',
        'buzon/TAREA.TXT#2.1',
        jsonb_build_object('mustSeparate', jsonb_build_array('canvas actions', 'node actions'))
      ),
      (
        'UX-010',
        'ux_rule',
        'Execution readiness is not a permanent top banner',
        'E-CANVAS-BOTTOM-DRAWER-OPS-1',
        'web.component.shell.ProblemsPanel',
        'RenderBottomOperationalDrawer',
        'accepted',
        'readiness-details-in-problems',
        'buzon/TAREA.TXT#2.1',
        jsonb_build_object('topbarAllowed', 'summary only')
      ),
      (
        'UX-011',
        'ux_rule',
        'Plan vocabulary becomes Preview execution plan',
        'E-CANVAS-EXECUTION-PREVIEW-READINESS-1',
        'web.component.canvas.ExecutionPreviewPanel',
        'PreviewExecutionPlan',
        'accepted',
        'retire-ambiguous-plan-label',
        'buzon/TAREA.TXT#2.1',
        jsonb_build_object('canonicalLabel', 'Preview execution plan')
      ),
      (
        'UX-012',
        'ux_rule',
        'Origins appear only inside the Add Source flow',
        'E-CANVAS-ADD-SOURCE-LIVE-FLOW-1',
        'web.component.canvas.SourceImportDialog',
        'OpenCanvasSourceImportDialog',
        'accepted',
        'source-flow-only',
        'buzon/TAREA.TXT#2.1',
        jsonb_build_object('forbidden', 'permanent origins button')
      ),
      (
        'UX-013',
        'ux_rule',
        'Insert lives in canvas context or command palette',
        'E-CANVAS-SPATIAL-ADD-NODES-1',
        'web.component.canvas.CanvasContextMenu',
        'CreateCanvasAuthoringNode',
        'accepted',
        'no-fixed-insert-button',
        'buzon/TAREA.TXT#2.1',
        jsonb_build_object('allowedSurfaces', jsonb_build_array('CanvasContextMenu', 'CommandPalette'))
      ),
      (
        'UX-014',
        'ux_rule',
        'Project actions are File or Workspace actions, not a loose button',
        'E-CANVAS-PROJECT-EXPLORER-CONTEXTUAL-1',
        'web.component.canvas.ProjectExplorerDialog',
        'OpenCanvasProjectExplorer',
        'accepted',
        'project-is-contextual',
        'buzon/TAREA.TXT#2.1',
        jsonb_build_object('allowedSurfaces', jsonb_build_array('File menu', 'Workspace menu', 'CanvasContextMenu'))
      ),
      (
        'UX-015',
        'ux_rule',
        'Node Workbench is contextual to the active node',
        'E-CANVAS-NODE-WORKBENCH-1',
        'web.component.canvas.NodeWorkbench',
        'InspectCanvasNodeProperties',
        'accepted',
        'node-workbench-contextual',
        'buzon/TAREA.TXT#2.1',
        jsonb_build_object('scope', 'selected-node')
      ),
      (
        'DB-001',
        'db_rule',
        'Planning DB is the source of truth for product knowledge',
        'E-CANVAS-UXDB-REFERENCE-CATALOG-1',
        'planning.component.canvas.CanvasUxdbSpecificationReadModel',
        'ListCanvasUxdbSpecification',
        'accepted',
        'db-first-authority',
        'buzon/TAREA.TXT#2.2',
        jsonb_build_object('markdownRole', 'export-or-evidence')
      ),
      (
        'DB-004',
        'db_rule',
        'UI components have queryable DB representation',
        'E-CANVAS-COMPONENT-REGISTRY-DRIFT-1',
        'planning.component.canvas.CanvasUxdbSpecificationReadModel',
        'ListCanvasUxdbSpecification',
        'accepted',
        'component-registry-required',
        'buzon/TAREA.TXT#2.2',
        jsonb_build_object('enforcedBy', 'canvas-component-registry-drift')
      ),
      (
        'DB-005',
        'db_rule',
        'Commands and queries are modeled explicitly in DB',
        'E-CANVAS-CQ-RAIL-DRIFT-GUARD-1',
        'planning.component.canvas.CanvasUxdbSpecificationReadModel',
        'ListCanvasUxdbSpecification',
        'accepted',
        'cq-rail-db-authority',
        'buzon/TAREA.TXT#2.2',
        jsonb_build_object('enforcedBy', 'canvas-cq-rail-drift')
      ),
      (
        'DB-006',
        'db_rule',
        'Tests and acceptance criteria are DB records',
        'E-CANVAS-UXDB-ACCEPTANCE-CATALOG-1',
        'planning.component.canvas.CanvasUxdbSpecificationReadModel',
        'ListCanvasUxdbSpecification',
        'accepted',
        'qa-catalog-db-authority',
        'buzon/TAREA.TXT#2.2',
        jsonb_build_object('recordTypes', jsonb_build_array('test_requirement', 'acceptance_criterion'))
      ),
      (
        'DB-007',
        'db_rule',
        'External UX references are traceable DB records',
        'E-CANVAS-UXDB-REFERENCE-CATALOG-1',
        'planning.component.canvas.CanvasUxdbSpecificationReadModel',
        'ListCanvasUxdbProfessionalReferenceCatalog',
        'accepted',
        'reference-catalog-db-authority',
        'buzon/TAREA.TXT#2.2',
        jsonb_build_object('recordType', 'reference')
      ),
      (
        'DB-008',
        'db_rule',
        'Human Markdown documentation is generated export',
        'E-CANVAS-UXDB-EXPORT-1',
        'planning.component.canvas.CanvasUxdbSpecificationReadModel',
        'ExportCanvasUxdbManual',
        'accepted',
        'manual-export-not-source',
        'buzon/TAREA.TXT#2.2',
        jsonb_build_object('exportRecord', 'manual-export.canvas-uxdb')
      ),
      (
        'DB-010',
        'db_rule',
        'No important specification lives only in Markdown',
        'E-CANVAS-UXDB-REFERENCE-CATALOG-1',
        'planning.component.canvas.CanvasUxdbSpecificationReadModel',
        'ListCanvasUxdbProfessionalReferenceCatalog',
        'accepted',
        'no-md-only-specification',
        'buzon/TAREA.TXT#2.2',
        jsonb_build_object('sourceOfTruth', 'planning_query_store.canvas_uxdb_specification_records')
      ),
      (
        'component.edge-context-menu',
        'ui_component',
        'Edge context menu',
        'E-CANVAS-CONTEXT-MENU-HUMAN-PROOF-1',
        'web.component.canvas.EdgeContextMenu',
        'ResolveCanvasContextMenu',
        'proposed',
        'edge-actions-only',
        'buzon/TAREA.TXT#5.4',
        jsonb_build_object('actions', jsonb_build_array('inspect-connection', 'validate-dependency', 'show-contract', 'remove-edge'))
      ),
      (
        'component.port-context-menu',
        'ui_component',
        'Port context menu',
        'E-CANVAS-CONTEXT-MENU-HUMAN-PROOF-1',
        'web.component.canvas.PortContextMenu',
        'ResolveCanvasContextMenu',
        'proposed',
        'port-actions-only',
        'buzon/TAREA.TXT#5.5',
        jsonb_build_object('actions', jsonb_build_array('map-input', 'add-input-source', 'inspect-schema', 'show-column-lineage'))
      ),
      (
        'component.command-palette',
        'ui_component',
        'Command palette',
        'E-CANVAS-COMMAND-PALETTE-1',
        'web.component.canvas.CommandPalette',
        'ResolveCanvasContextMenu',
        'proposed',
        'power-user-entrypoint',
        'buzon/TAREA.TXT#5.11',
        jsonb_build_object('shortcut', 'Ctrl/Cmd+K')
      ),
      (
        'component.global-menu-bar',
        'ui_component',
        'Global menu bar',
        'E-CANVAS-TOPBAR-MINIMAL-1',
        'web.component.canvas.GlobalMenuBar',
        'RenderCanvasShellChrome',
        'proposed',
        'global-actions-only',
        'buzon/TAREA.TXT#6',
        jsonb_build_object('menus', jsonb_build_array('File', 'Workspace', 'Edit', 'View', 'Run', 'Tools', 'Help'))
      ),
      (
        'component.run-status-indicator',
        'ui_component',
        'Run status indicator',
        'E-CANVAS-BOTTOM-DRAWER-OPS-1',
        'web.component.canvas.RunStatusIndicator',
        'PreviewExecutionPlan',
        'proposed',
        'topbar-summary-only',
        'buzon/TAREA.TXT#5.12',
        jsonb_build_object('states', jsonb_build_array('Ready', 'Preview required', 'Run disabled', 'Running', 'Failed', 'Completed'))
      ),
      (
        'command.open-canvas-context-menu',
        'command_spec',
        'Open canvas context menu at a canvas coordinate',
        'E-CANVAS-CONTEXT-MENU-HUMAN-PROOF-1',
        'web.component.canvas.CanvasContextMenu',
        'ResolveCanvasContextMenu',
        'accepted',
        'canvas-command-spec',
        'buzon/TAREA.TXT#10.1',
        jsonb_build_object('payload', jsonb_build_array('canvasId', 'x', 'y'), 'result', 'canvas menu model')
      ),
      (
        'command.open-node-context-menu',
        'command_spec',
        'Open node context menu at a node coordinate',
        'E-CANVAS-CONTEXT-MENU-HUMAN-PROOF-1',
        'web.component.canvas.CanvasNodeContextMenu',
        'ResolveCanvasContextMenu',
        'accepted',
        'node-command-spec',
        'buzon/TAREA.TXT#10.2',
        jsonb_build_object('payload', jsonb_build_array('nodeId', 'x', 'y'), 'result', 'node menu model')
      ),
      (
        'command.add-source-to-canvas',
        'command_spec',
        'Attach selected warehouse sources to the canvas',
        'E-CANVAS-ADD-SOURCE-LIVE-FLOW-1',
        'web.component.canvas.SourceImportDialog',
        'AttachWarehouseSourceFromCanvasContext',
        'accepted',
        'source-import-command-spec',
        'buzon/TAREA.TXT#10.1',
        jsonb_build_object('payload', jsonb_build_array('canvasId', 'sourceIds', 'x', 'y'), 'result', 'source nodes')
      ),
      (
        'command.open-sql-workbench-for-node',
        'command_spec',
        'Open SQL workbench for the selected model or transformation node',
        'E-CANVAS-SQL-CONTEXT-WORKBENCH-1',
        'web.component.canvas.SqlContextWorkbench',
        'ResolveCanvasWorkbenchContext',
        'accepted',
        'sql-workbench-command-spec',
        'buzon/TAREA.TXT#10.2',
        jsonb_build_object('payload', jsonb_build_array('nodeId'), 'result', 'graph plus SQL workbench')
      ),
      (
        'command.preview-execution-plan',
        'command_spec',
        'Preview execution plan for canvas, selected subgraph, or node scope',
        'E-CANVAS-EXECUTION-PREVIEW-READINESS-1',
        'web.component.canvas.ExecutionPreviewPanel',
        'PreviewExecutionPlan',
        'accepted',
        'execution-preview-command-spec',
        'buzon/TAREA.TXT#10.1',
        jsonb_build_object('payload', jsonb_build_array('canvasId', 'scope'), 'result', 'preview drawer state')
      ),
      (
        'query.get-canvas-context-menu-items',
        'query_spec',
        'Get canvas context menu items allowed for the current canvas state',
        'E-CANVAS-CONTEXT-MENU-HUMAN-PROOF-1',
        'web.component.canvas.CanvasContextMenu',
        'ResolveCanvasContextMenu',
        'accepted',
        'canvas-query-spec',
        'buzon/TAREA.TXT#10.4',
        jsonb_build_object('result', 'canvas action model')
      ),
      (
        'query.get-node-context-menu-items',
        'query_spec',
        'Get node context menu items allowed for the selected node',
        'E-CANVAS-CONTEXT-MENU-HUMAN-PROOF-1',
        'web.component.canvas.CanvasNodeContextMenu',
        'ResolveCanvasContextMenu',
        'accepted',
        'node-query-spec',
        'buzon/TAREA.TXT#10.4',
        jsonb_build_object('result', 'node action model')
      ),
      (
        'query.get-node-workbench-tabs',
        'query_spec',
        'Get node workbench sections for the selected node kind',
        'E-CANVAS-NODE-WORKBENCH-1',
        'web.component.canvas.NodeWorkbench',
        'InspectCanvasNodeProperties',
        'accepted',
        'node-workbench-query-spec',
        'buzon/TAREA.TXT#10.4',
        jsonb_build_object('result', 'node workbench sections')
      ),
      (
        'query.get-available-sources',
        'query_spec',
        'Get available warehouse sources for Add Source browsing',
        'E-CANVAS-ADD-SOURCE-LIVE-FLOW-1',
        'web.component.canvas.SourceImportDialog',
        'ListWarehouseSources',
        'accepted',
        'source-browser-query-spec',
        'buzon/TAREA.TXT#10.4',
        jsonb_build_object('result', 'connections, schemas, tables, columns and metadata')
      ),
      (
        'rail.professional-reference-catalog',
        'command_query_rail',
        'List the professional Canvas UX reference catalog',
        'E-CANVAS-UXDB-REFERENCE-CATALOG-1',
        'planning.component.canvas.CanvasUxdbSpecificationReadModel',
        'ListCanvasUxdbProfessionalReferenceCatalog',
        'implemented',
        'db-first-reference-catalog-query',
        'tools/planning-db/migrations/309_canvas_uxdb_professional_reference_catalog.sql',
        jsonb_build_object('type', 'query', 'reads', 'canvas_uxdb_specification_records')
      ),
      (
        'manual-export.canvas-uxdb',
        'export_provenance',
        'Canvas UX manual is generated from Planning DB records',
        'E-CANVAS-UXDB-EXPORT-1',
        'planning.component.canvas.CanvasUxdbSpecificationReadModel',
        'ExportCanvasUxdbManual',
        'accepted',
        'manual-export-not-primary-spec',
        'buzon/TAREA.TXT#14',
        jsonb_build_object('sourceQuery', 'canvas-uxdb-specification', 'notPrimarySource', true)
      ),
      (
        'anti-pattern.fixed-right-multipurpose-panel',
        'anti_pattern',
        'Fixed right multipurpose panel mixes node and global scope',
        'E-CANVAS-NODE-WORKBENCH-1',
        'web.component.canvas.NodeWorkbench',
        'InspectCanvasNodeProperties',
        'accepted',
        'retire-fixed-right-inspector',
        'buzon/TAREA.TXT#13.2',
        jsonb_build_object('replacement', 'NodeWorkbench plus BottomOperationalDrawer')
      ),
      (
        'anti-pattern.global-code-log-tabs',
        'anti_pattern',
        'Code and Log as main tabs break graph-first workflow',
        'E-CANVAS-TOPBAR-MINIMAL-1',
        'web.component.canvas.CanvasShellChrome',
        'RenderCanvasShellChrome',
        'accepted',
        'retire-global-tabs',
        'buzon/TAREA.TXT#13.4',
        jsonb_build_object('replacement', 'SqlContextWorkbench and BottomOperationalDrawer')
      ),
      (
        'anti-pattern.top-readiness-banner',
        'anti_pattern',
        'Execution readiness as a top banner occupies permanent work space',
        'E-CANVAS-BOTTOM-DRAWER-OPS-1',
        'web.component.shell.ProblemsPanel',
        'RenderBottomOperationalDrawer',
        'accepted',
        'readiness-details-in-problems',
        'buzon/TAREA.TXT#13.5',
        jsonb_build_object('replacement', 'RunStatusIndicator plus Problems')
      ),
      (
        'reference.react-flow',
        'reference',
        'React Flow',
        'E-CANVAS-UXDB-REFERENCE-CATALOG-1',
        'web.canvas.graph',
        'RenderCanvasGraphBase',
        'accepted',
        'technical-canvas-reference',
        'buzon/TAREA.TXT#9.1',
        jsonb_build_object('url', 'https://reactflow.dev/', 'copy', 'canvas primitives, minimap, context menu infrastructure', 'avoid', 'assuming library examples define product grammar')
      ),
      (
        'reference.nifi',
        'reference',
        'Apache NiFi',
        'E-CANVAS-UXDB-REFERENCE-CATALOG-1',
        'web.component.canvas.NodeWorkbench',
        'InspectCanvasNodeProperties',
        'accepted',
        'node-configuration-reference',
        'buzon/TAREA.TXT#9.2',
        jsonb_build_object('url', 'https://nifi.apache.org/docs/nifi-docs/html/user-guide.html', 'copy', 'node configuration grammar and dataflow metrics', 'avoid', 'legacy visual density')
      ),
      (
        'reference.comfyui',
        'reference',
        'ComfyUI',
        'E-CANVAS-UXDB-REFERENCE-CATALOG-1',
        'web.component.canvas.CanvasContextMenu',
        'ResolveCanvasContextMenu',
        'accepted',
        'separate-canvas-node-port-menus',
        'buzon/TAREA.TXT#9.3',
        jsonb_build_object('url', 'https://docs.comfy.org/', 'copy', 'separate canvas, node and port menu semantics', 'avoid', 'raw technical editor feel')
      ),
      (
        'reference.unreal-blueprints',
        'reference',
        'Unreal Engine Blueprints',
        'E-CANVAS-UXDB-REFERENCE-CATALOG-1',
        'web.component.canvas.CanvasNodeContextMenu',
        'ResolveCanvasContextMenu',
        'accepted',
        'power-user-node-graph-reference',
        'buzon/TAREA.TXT#9.4',
        jsonb_build_object('url', 'https://dev.epicgames.com/documentation/unreal-engine/blueprint-editor-cheat-sheet-in-unreal-engine', 'copy', 'node-specific context and double-click editing', 'avoid', 'overgeneral visual programming complexity')
      ),
      (
        'reference.blender-geometry-nodes',
        'reference',
        'Blender Geometry Nodes',
        'E-CANVAS-UXDB-REFERENCE-CATALOG-1',
        'web.canvas.graph',
        'RenderCanvasGraphBase',
        'accepted',
        'node-workspace-reference',
        'buzon/TAREA.TXT#9.5',
        jsonb_build_object('url', 'https://docs.blender.org/manual/en/latest/editors/geometry_node.html', 'copy', 'professional node workspace focus', 'avoid', '3D-specific panel complexity')
      ),
      (
        'reference.node-red',
        'reference',
        'Node-RED',
        'E-CANVAS-UXDB-REFERENCE-CATALOG-1',
        'web.component.shell.BottomOperationalDrawer',
        'RenderBottomOperationalDrawer',
        'accepted',
        'debug-surface-reference',
        'buzon/TAREA.TXT#9.6',
        jsonb_build_object('url', 'https://nodered.org/docs/user-guide/editor/workspace/', 'copy', 'debug separation', 'avoid', 'permanent palette/sidebar dominance')
      ),
      (
        'reference.n8n',
        'reference',
        'n8n',
        'E-CANVAS-UXDB-REFERENCE-CATALOG-1',
        'web.canvas.graph',
        'RenderCanvasGraphBase',
        'accepted',
        'workflow-execution-reference',
        'buzon/TAREA.TXT#9.7',
        jsonb_build_object('url', 'https://docs.n8n.io/courses/level-one/chapter-1/', 'copy', 'workflow plus executions separation', 'avoid', 'generic low-code builder semantics')
      ),
      (
        'reference.airflow',
        'reference',
        'Apache Airflow UI',
        'E-CANVAS-UXDB-REFERENCE-CATALOG-1',
        'web.component.shell.RunsPanel',
        'RenderBottomOperationalDrawer',
        'accepted',
        'run-diagnostics-reference',
        'buzon/TAREA.TXT#9.8',
        jsonb_build_object('url', 'https://airflow.apache.org/docs/apache-airflow/stable/ui.html', 'copy', 'run/task diagnostic states', 'avoid', 'treating monitor UI as authoring UI')
      ),
      (
        'reference.dagster',
        'reference',
        'Dagster',
        'E-CANVAS-UXDB-REFERENCE-CATALOG-1',
        'web.canvas.graph',
        'RenderCanvasGraphBase',
        'accepted',
        'asset-graph-reference',
        'buzon/TAREA.TXT#9.9',
        jsonb_build_object('url', 'https://docs.dagster.io/guides/build/assets', 'copy', 'asset graph semantics', 'avoid', 'monitor-only workflow')
      ),
      (
        'reference.prefect',
        'reference',
        'Prefect',
        'E-CANVAS-UXDB-REFERENCE-CATALOG-1',
        'web.component.shell.RunsPanel',
        'RenderBottomOperationalDrawer',
        'accepted',
        'run-state-reference',
        'buzon/TAREA.TXT#9.10',
        jsonb_build_object('url', 'https://docs.prefect.io/v3/get-started', 'copy', 'run state and logs', 'avoid', 'non-authoring-first posture')
      ),
      (
        'reference.kestra',
        'reference',
        'Kestra',
        'E-CANVAS-UXDB-REFERENCE-CATALOG-1',
        'web.component.canvas.SqlContextWorkbench',
        'ResolveCanvasWorkbenchContext',
        'accepted',
        'code-topology-reference',
        'buzon/TAREA.TXT#9.11',
        jsonb_build_object('url', 'https://kestra.io/docs/ui/flows', 'copy', 'code plus topology relationship', 'avoid', 'too many global tabs')
      ),
      (
        'reference.temporal',
        'reference',
        'Temporal UI',
        'E-CANVAS-UXDB-REFERENCE-CATALOG-1',
        'web.component.shell.RunsPanel',
        'RenderBottomOperationalDrawer',
        'accepted',
        'execution-history-reference',
        'buzon/TAREA.TXT#9.12',
        jsonb_build_object('url', 'https://docs.temporal.io/web-ui', 'copy', 'event history distinction', 'avoid', 'calling every event a user log')
      ),
      (
        'reference.dbt-cloud-ide',
        'reference',
        'dbt Cloud IDE',
        'E-CANVAS-UXDB-REFERENCE-CATALOG-1',
        'web.component.canvas.SqlContextWorkbench',
        'ResolveCanvasWorkbenchContext',
        'accepted',
        'model-lineage-code-reference',
        'buzon/TAREA.TXT#9.13',
        jsonb_build_object('url', 'https://docs.getdbt.com/docs/platform/studio-ide/ide-user-interface', 'copy', 'active model and lineage relationship', 'avoid', 'making DVT code-first')
      ),
      (
        'reference.dbt-explorer',
        'reference',
        'dbt Explorer',
        'E-CANVAS-UXDB-REFERENCE-CATALOG-1',
        'web.component.canvas.NodeWorkbench',
        'InspectCanvasNodeProperties',
        'accepted',
        'catalog-lineage-reference',
        'buzon/TAREA.TXT#9.13',
        jsonb_build_object('url', 'https://docs.getdbt.com/blog/dbt-explorer', 'copy', 'column lineage and impact', 'avoid', 'catalog-only workflow')
      ),
      (
        'reference.databricks-workflows',
        'reference',
        'Databricks Workflows',
        'E-CANVAS-UXDB-REFERENCE-CATALOG-1',
        'web.component.shell.RunsPanel',
        'RenderBottomOperationalDrawer',
        'accepted',
        'run-history-metrics-reference',
        'buzon/TAREA.TXT#9.14',
        jsonb_build_object('url', 'https://docs.databricks.com/aws/en/jobs/', 'copy', 'job run history and metrics', 'avoid', 'platform navigation weight')
      ),
      (
        'reference.snowflake-snowsight-tasks',
        'reference',
        'Snowflake Snowsight Tasks',
        'E-CANVAS-UXDB-REFERENCE-CATALOG-1',
        'web.component.canvas.ExecutionPreviewPanel',
        'PreviewExecutionPlan',
        'accepted',
        'task-graph-run-reference',
        'buzon/TAREA.TXT#9.15',
        jsonb_build_object('url', 'https://docs.snowflake.com/en/user-guide/ui-snowsight-tasks', 'copy', 'task graph and run history', 'avoid', 'read-only task graph as authoring model')
      ),
      (
        'reference.bigquery-dataform',
        'reference',
        'BigQuery Dataform',
        'E-CANVAS-UXDB-REFERENCE-CATALOG-1',
        'web.component.canvas.SqlContextWorkbench',
        'ResolveCanvasWorkbenchContext',
        'accepted',
        'sql-workflow-reference',
        'buzon/TAREA.TXT#9.16',
        jsonb_build_object('url', 'https://docs.cloud.google.com/dataform/docs/overview', 'copy', 'SQL workflow compilation and execution', 'avoid', 'repo editor dominance')
      ),
      (
        'reference.datahub',
        'reference',
        'DataHub',
        'E-CANVAS-UXDB-REFERENCE-CATALOG-1',
        'web.component.canvas.ExecutionPreviewPanel',
        'PreviewExecutionPlan',
        'accepted',
        'impact-analysis-reference',
        'buzon/TAREA.TXT#9.17',
        jsonb_build_object('url', 'https://docs.datahub.com/docs/features/feature-guides/lineage', 'copy', 'impact analysis before change', 'avoid', 'catalog replacement')
      ),
      (
        'reference.openmetadata',
        'reference',
        'OpenMetadata',
        'E-CANVAS-UXDB-REFERENCE-CATALOG-1',
        'web.component.canvas.NodeWorkbench',
        'InspectCanvasNodeProperties',
        'accepted',
        'lineage-metadata-reference',
        'buzon/TAREA.TXT#9.18',
        jsonb_build_object('url', 'https://docs.open-metadata.org/v1.11.x/how-to-guides/data-lineage', 'copy', 'upstream downstream and column lineage', 'avoid', 'catalog browsing as primary work')
      ),
      (
        'reference.atlan',
        'reference',
        'Atlan',
        'E-CANVAS-UXDB-REFERENCE-CATALOG-1',
        'web.component.canvas.ExecutionPreviewPanel',
        'PreviewExecutionPlan',
        'accepted',
        'impact-language-reference',
        'buzon/TAREA.TXT#9.19',
        jsonb_build_object('url', 'https://docs.atlan.com/product/capabilities/lineage/concepts/what-is-lineage', 'copy', 'downstream impact language', 'avoid', 'vendor catalog UI')
      ),
      (
        'reference.collibra',
        'reference',
        'Collibra',
        'E-CANVAS-UXDB-REFERENCE-CATALOG-1',
        'web.component.canvas.ExecutionPreviewPanel',
        'PreviewExecutionPlan',
        'accepted',
        'technical-lineage-reference',
        'buzon/TAREA.TXT#9.20',
        jsonb_build_object('url', 'https://productresources.collibra.com/docs/collibra/latest/Content/CollibraDataLineage/co_collibra-data-lineage.htm', 'copy', 'technical lineage and audit posture', 'avoid', 'enterprise governance heaviness')
      ),
      (
        'reference.vscode',
        'reference',
        'VS Code',
        'E-CANVAS-UXDB-REFERENCE-CATALOG-1',
        'web.component.shell.BottomOperationalDrawer',
        'RenderBottomOperationalDrawer',
        'accepted',
        'workbench-drawer-reference',
        'buzon/TAREA.TXT#9.21',
        jsonb_build_object('url', 'https://code.visualstudio.com/docs/getstarted/userinterface', 'copy', 'bottom panel and contextual editors', 'avoid', 'file explorer as product center')
      ),
      (
        'reference.jetbrains',
        'reference',
        'JetBrains IDEs',
        'E-CANVAS-UXDB-REFERENCE-CATALOG-1',
        'web.component.shell.ProblemsPanel',
        'RenderBottomOperationalDrawer',
        'accepted',
        'problems-run-tool-window-reference',
        'buzon/TAREA.TXT#9.22',
        jsonb_build_object('url', 'https://www.jetbrains.com/help/idea/problems-tool-window.html', 'copy', 'Problems and Run tool windows', 'avoid', 'tool-window overload')
      ),
      (
        'reference.github-actions',
        'reference',
        'GitHub Actions',
        'E-CANVAS-UXDB-REFERENCE-CATALOG-1',
        'web.component.shell.RunsPanel',
        'RenderBottomOperationalDrawer',
        'accepted',
        'workflow-run-graph-reference',
        'buzon/TAREA.TXT#9.23',
        jsonb_build_object('url', 'https://docs.github.com/actions/managing-workflow-runs/using-the-visualization-graph', 'copy', 'run graph and logs by step', 'avoid', 'CI UI as authoring UI')
      ),
      (
        'reference.gitlab-web-ide',
        'reference',
        'GitLab Web IDE',
        'E-CANVAS-UXDB-REFERENCE-CATALOG-1',
        'web.component.canvas.ProjectExplorerDialog',
        'OpenCanvasProjectExplorer',
        'accepted',
        'project-explorer-on-demand-reference',
        'buzon/TAREA.TXT#9.24',
        jsonb_build_object('url', 'https://docs.gitlab.com/user/project/web_ide/', 'copy', 'project explorer as contextual drawer', 'avoid', 'file tree dominance')
      ),
      (
        'reference.grafana-explore',
        'reference',
        'Grafana Explore',
        'E-CANVAS-UXDB-REFERENCE-CATALOG-1',
        'web.component.shell.LogPanel',
        'RenderBottomOperationalDrawer',
        'accepted',
        'log-investigation-reference',
        'buzon/TAREA.TXT#9.25',
        jsonb_build_object('url', 'https://grafana.com/docs/grafana/latest/visualizations/explore/', 'copy', 'log investigation filters', 'avoid', 'observability-first product posture')
      ),
      (
        'reference.kibana-discover',
        'reference',
        'Kibana Discover',
        'E-CANVAS-UXDB-REFERENCE-CATALOG-1',
        'web.component.shell.LogPanel',
        'RenderBottomOperationalDrawer',
        'accepted',
        'log-search-reference',
        'buzon/TAREA.TXT#9.25',
        jsonb_build_object('url', 'https://www.elastic.co/docs/explore-analyze/discover', 'copy', 'searchable operational events', 'avoid', 'document exploration as main canvas')
      ),
      (
        'reference.figma',
        'reference',
        'Figma Actions menu',
        'E-CANVAS-UXDB-REFERENCE-CATALOG-1',
        'web.component.canvas.CommandPalette',
        'ResolveCanvasContextMenu',
        'accepted',
        'actions-menu-reference',
        'buzon/TAREA.TXT#9.26',
        jsonb_build_object('url', 'https://help.figma.com/hc/en-us/articles/23570416033943-Use-the-actions-menu-in-Figma-Design', 'copy', 'searchable actions without toolbar overload', 'avoid', 'creative canvas aesthetics over data UX')
      ),
      (
        'reference.raycast',
        'reference',
        'Raycast',
        'E-CANVAS-UXDB-REFERENCE-CATALOG-1',
        'web.component.canvas.CommandPalette',
        'ResolveCanvasContextMenu',
        'accepted',
        'command-palette-reference',
        'buzon/TAREA.TXT#9.26',
        jsonb_build_object('url', 'https://manual.raycast.com/', 'copy', 'fast command launcher for power users', 'avoid', 'hiding essential actions')
      ),
      (
        'reference.linear',
        'reference',
        'Linear',
        'E-CANVAS-UXDB-REFERENCE-CATALOG-1',
        'web.component.canvas.CommandPalette',
        'ResolveCanvasContextMenu',
        'accepted',
        'context-actions-reference',
        'buzon/TAREA.TXT#9.26',
        jsonb_build_object('url', 'https://linear.app/docs/conceptual-model', 'copy', 'context plus shortcut power UX', 'avoid', 'issue workflow concepts as data workflow')
      ),
      (
        'reference.retool-workflows',
        'reference',
        'Retool Workflows',
        'E-CANVAS-UXDB-REFERENCE-CATALOG-1',
        'web.component.shell.RunsPanel',
        'RenderBottomOperationalDrawer',
        'accepted',
        'workflow-run-log-reference',
        'buzon/TAREA.TXT#9',
        jsonb_build_object('url', 'https://docs.retool.com/workflows/quickstart', 'copy', 'workflow run logs', 'avoid', 'low-code app builder patterns')
      ),
      (
        'reference.supabase-studio',
        'reference',
        'Supabase Studio',
        'E-CANVAS-UXDB-REFERENCE-CATALOG-1',
        'web.component.canvas.SqlContextWorkbench',
        'ResolveCanvasWorkbenchContext',
        'accepted',
        'sql-editor-log-reference',
        'buzon/TAREA.TXT#9',
        jsonb_build_object('url', 'https://supabase.com/features/sql-editor', 'copy', 'SQL editor feedback and logs', 'avoid', 'database admin product posture')
      ),
      (
        'reference.miro',
        'reference',
        'Miro',
        'E-CANVAS-UXDB-REFERENCE-CATALOG-1',
        'web.canvas.graph',
        'RenderCanvasGraphBase',
        'accepted',
        'infinite-canvas-reference',
        'buzon/TAREA.TXT#9',
        jsonb_build_object('url', 'https://help.miro.com/hc/en-us/articles/360017730553-Toolbars', 'copy', 'minimal surrounding tools', 'avoid', 'permanent creation toolbars')
      )
  ) as record(
    record_id,
    record_type,
    record_title,
    canonical_task_id,
    component_id,
    rail_name,
    spec_state,
    legacy_posture,
    source_path,
    metadata
  )
)
insert into planning_query_store.canvas_uxdb_specification_records (
  record_id,
  record_type,
  record_title,
  canonical_task_id,
  component_id,
  rail_name,
  spec_state,
  legacy_posture,
  source_path,
  metadata
)
select
  record_id,
  record_type,
  record_title,
  canonical_task_id,
  component_id,
  rail_name,
  spec_state,
  legacy_posture,
  source_path,
  metadata
from professional_catalog_records
on conflict (record_id) do update set
  record_type = excluded.record_type,
  record_title = excluded.record_title,
  canonical_task_id = excluded.canonical_task_id,
  component_id = excluded.component_id,
  rail_name = excluded.rail_name,
  spec_state = excluded.spec_state,
  legacy_posture = excluded.legacy_posture,
  source_path = excluded.source_path,
  metadata = excluded.metadata,
  updated_at = now();

insert into planning_query_store.feature_mechanization_local_rails (
  rail_id,
  feature_id,
  mechanization_status,
  rail_name,
  normalized_rail_name,
  rail_type,
  ddd_owner,
  rail_status,
  symbol_refs,
  implementation_refs,
  documentation_refs,
  governing_sources,
  allowed_implementation_surfaces,
  architecture_guards,
  completion_gate,
  source_path,
  source_content_sha256,
  raw_rail,
  raw_manifest,
  revision,
  created_by
)
values (
  'local#E-CANVAS-UXDB-REFERENCE-CATALOG-1#query#listcanvasuxdbprofessionalreferencecatalog',
  'E-CANVAS-UXDB-REFERENCE-CATALOG-1',
  'implemented',
  'ListCanvasUxdbProfessionalReferenceCatalog',
  'listcanvasuxdbprofessionalreferencecatalog',
  'query',
  'CanvasUxdbSpecificationReadModel',
  'implemented',
  jsonb_build_array(
    'tools/planning-db/migrations/309_canvas_uxdb_professional_reference_catalog.sql#professional_catalog_records',
    'planning_query_store.canvas_uxdb_specification_records#record_type=reference'
  ),
  jsonb_build_array(
    'tools/planning-db/migrations/309_canvas_uxdb_professional_reference_catalog.sql',
    'scripts/planning-db/queries/canvas-uxdb-specification-query.cjs',
    'scripts/planning-db-query.cjs',
    'scripts/planning-db-query.test.cjs',
    'scripts/planning-db-migrate.test.cjs'
  ),
  jsonb_build_array(
    'buzon/TAREA.TXT',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md'
  ),
  jsonb_build_array(
    'AGENTS.md',
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/guides/ai-work-protocol.md',
    'docs/planning/state/planning-control-tower.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md',
    'buzon/TAREA.TXT'
  ),
  jsonb_build_array(
    'tools/planning-db/migrations/309_canvas_uxdb_professional_reference_catalog.sql',
    'scripts/planning-db/queries/canvas-uxdb-specification-query.cjs',
    'scripts/planning-db-query.cjs',
    'scripts/planning-db-query.test.cjs',
    'scripts/planning-db-migrate.test.cjs'
  ),
  jsonb_build_array(
    'node --test scripts/planning-db-migrate.test.cjs --test-name-pattern "professional Canvas UX reference catalog"',
    'pnpm planning:db:query canvas-uxdb-specification --task E-CANVAS-UXDB-REFERENCE-CATALOG-1 --limit 80',
    'pnpm planning:db:query canvas-uxdb-specification --kind reference --limit 80',
    'pnpm planning:db:query canvas-cq-rail-drift --rail ListCanvasUxdbProfessionalReferenceCatalog --limit 20'
  ),
  jsonb_build_array(
    'pnpm planning:db:migrate',
    'node --test scripts/planning-db-migrate.test.cjs --test-name-pattern "professional Canvas UX reference catalog"',
    'pnpm planning:db:query canvas-uxdb-specification --task E-CANVAS-UXDB-REFERENCE-CATALOG-1 --limit 80',
    'pnpm planning:db:query canvas-uxdb-specification --kind reference --limit 80',
    'pnpm planning:db:integrity:check',
    'pnpm docs:feature-mechanization:implementation',
    'pnpm verify:prepush'
  ),
  'tools/planning-db/migrations/309_canvas_uxdb_professional_reference_catalog.sql',
  md5('E-CANVAS-UXDB-REFERENCE-CATALOG-1:ListCanvasUxdbProfessionalReferenceCatalog:309')
    || md5('canvas-uxdb-professional-reference-catalog'),
  jsonb_build_object(
    'name', 'ListCanvasUxdbProfessionalReferenceCatalog',
    'type', 'query',
    'dddOwner', 'CanvasUxdbSpecificationReadModel',
    'status', 'implemented'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'E-CANVAS-UXDB-REFERENCE-CATALOG-1',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan',
    'Persist the professional Canvas UX reference catalog, mandatory UX/DB vocabulary, command/query specs and export posture as Planning DB records before more UI work.',
    'componentGuides',
    jsonb_build_array(
      'planning-db:query/canvas-uxdb-specification',
      'buzon/TAREA.TXT'
    ),
    'userStories',
    jsonb_build_array(
      jsonb_build_object(
        'role',
        'Canvas implementer',
        'need',
        'Query the professional UX references and mandatory vocabulary without reading raw inbox Markdown.',
        'acceptance',
        'canvas-uxdb-specification exposes ux_rule, db_rule, ui_component, command_spec, query_spec, reference, anti_pattern and export_provenance rows for E-CANVAS-UXDB-REFERENCE-CATALOG-1.'
      ),
      jsonb_build_object(
        'role',
        'Canvas reviewer',
        'need',
        'Detect missing vocabulary before further UI implementation.',
        'acceptance',
        'The migration test requires UX-001/UX-015, DB-001/DB-010, edge/port/command palette components, command/query specs and professional references.'
      )
    ),
    'governingSources',
    jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/guides/ai-work-protocol.md',
      'docs/planning/state/planning-control-tower.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md',
      'buzon/TAREA.TXT'
    ),
    'allowedImplementationSurfaces',
    jsonb_build_array(
      'tools/planning-db/migrations/309_canvas_uxdb_professional_reference_catalog.sql',
      'scripts/planning-db/queries/canvas-uxdb-specification-query.cjs',
      'scripts/planning-db-query.cjs',
      'scripts/planning-db-query.test.cjs',
      'scripts/planning-db-migrate.test.cjs'
    ),
    'forbiddenImplementationSurfaces',
    jsonb_build_array(
      'apps/**',
      'packages/**',
      'buzon/**#primary_spec_authority'
    ),
    'architectureGuards',
    jsonb_build_array(
      'node --test scripts/planning-db-migrate.test.cjs --test-name-pattern "professional Canvas UX reference catalog"',
      'pnpm planning:db:query canvas-uxdb-specification --kind reference --limit 80',
      'pnpm docs:feature-mechanization:implementation'
    ),
    'completionGate',
    jsonb_build_array(
      'pnpm planning:db:migrate',
      'node --test scripts/planning-db-migrate.test.cjs --test-name-pattern "professional Canvas UX reference catalog"',
      'pnpm planning:db:integrity:check',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ),
    'commandQueryRails',
    jsonb_build_array(
      jsonb_build_object(
        'name', 'ListCanvasUxdbProfessionalReferenceCatalog',
        'type', 'query',
        'dddOwner', 'CanvasUxdbSpecificationReadModel',
        'status', 'implemented'
      )
    ),
    'domainObjects',
    jsonb_build_array(
      'CanvasUxdbSpecificationReadModel',
      'CanvasProfessionalReferenceCatalog'
    ),
    'fowlerSignals',
    jsonb_build_array(
      'hidden_authority',
      'duplicate_semantics',
      'documentation_drift',
      'legacy_ui_vocabulary'
    ),
    'cypressFlows',
    jsonb_build_array('not_applicable:planning_db_professional_reference_catalog'),
    'redGreenCycles',
    jsonb_build_array(
      jsonb_build_object(
        'id',
        'professional-reference-catalog-migration',
        'redTest',
        'node --test scripts/planning-db-migrate.test.cjs --test-name-pattern "professional Canvas UX reference catalog"',
        'expectedFailure',
        'Migration 309 and the professional reference catalog were absent.',
        'patchSurfaces',
        jsonb_build_array(
          'tools/planning-db/migrations/309_canvas_uxdb_professional_reference_catalog.sql',
          'scripts/planning-db-migrate.test.cjs'
        ),
        'greenTest',
        'node --test scripts/planning-db-migrate.test.cjs --test-name-pattern "professional Canvas UX reference catalog"'
      )
    ),
    'symbols',
    jsonb_build_array(
      jsonb_build_object(
        'name',
        'professional_catalog_records',
        'path',
        'tools/planning-db/migrations/309_canvas_uxdb_professional_reference_catalog.sql',
        'dddOwner',
        'CanvasUxdbSpecificationReadModel',
        'cqRails',
        jsonb_build_array('ListCanvasUxdbProfessionalReferenceCatalog'),
        'architectureGuard',
        'scripts/planning-db-migrate.test.cjs',
        'fowlerSignals',
        jsonb_build_array(
          'hidden_authority',
          'documentation_drift',
          'legacy_ui_vocabulary'
        ),
        'cypressCoverage',
        'not_applicable:planning_db_professional_reference_catalog',
        'unitTests',
        jsonb_build_array(
          'node --test scripts/planning-db-migrate.test.cjs --test-name-pattern "professional Canvas UX reference catalog"'
        )
      )
    )
  ),
  0,
  'codex'
)
on conflict (rail_id) do update set
  feature_id = excluded.feature_id,
  mechanization_status = excluded.mechanization_status,
  rail_name = excluded.rail_name,
  normalized_rail_name = excluded.normalized_rail_name,
  rail_type = excluded.rail_type,
  ddd_owner = excluded.ddd_owner,
  rail_status = excluded.rail_status,
  symbol_refs = excluded.symbol_refs,
  implementation_refs = excluded.implementation_refs,
  documentation_refs = excluded.documentation_refs,
  governing_sources = excluded.governing_sources,
  allowed_implementation_surfaces = excluded.allowed_implementation_surfaces,
  architecture_guards = excluded.architecture_guards,
  completion_gate = excluded.completion_gate,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  raw_rail = excluded.raw_rail,
  raw_manifest = excluded.raw_manifest,
  revision = greatest(planning_query_store.feature_mechanization_local_rails.revision, excluded.revision) + 1,
  updated_at = now();
