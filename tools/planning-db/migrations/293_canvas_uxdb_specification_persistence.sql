-- Persist the Canvas-first UX vocabulary from buzon/TAREA.TXT as DB-owned
-- specification records. The inbox file remains evidence; this view owns the
-- reviewable vocabulary, components, rails, anti-patterns and references.

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
  'CANVAS-UXDB-SPEC-PERSISTENCE-20260626',
  'E-CANVAS-UXDB-SPEC-PERSISTENCE-1',
  'Canvas UX DB-first specification persistence',
  'Frontend / Planning DB',
  'review',
  'The Canvas-first redesign must not proceed from raw Markdown or route-local UI vocabulary. TAREA.TXT is persisted as typed Planning DB records so UI slices can reuse one vocabulary, one component map, and one command/query rail map.',
  'hidden_authority',
  'ListCanvasUxdbSpecification',
  now()
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  updated_at = now();

create or replace view planning_query_store.canvas_uxdb_specification_query as
with records as (
  select *
  from (
    values
      (
        'graph-base',
        'ux_decision',
        'Graph is the permanent base surface',
        'E-CANVAS-TOPBAR-MINIMAL-1',
        'web.canvas.graph',
        'RenderCanvasGraphBase',
        'accepted',
        'replaces-workbench-tab-mode',
        'buzon/TAREA.TXT',
        jsonb_build_object(
          'rule', 'Graph is not a tab.',
          'requiredEvidence', jsonb_build_array('no fixed source panel', 'no fixed inspector', 'contextual surfaces only')
        )
      ),
      (
        'topbar-minimal',
        'ux_decision',
        'Top bar contains global identity and run state only',
        'E-CANVAS-TOPBAR-MINIMAL-1',
        'web.component.canvas.CanvasShellChrome',
        'RenderCanvasShellChrome',
        'accepted',
        'retires-permanent-insert-project-plan-buttons',
        'buzon/TAREA.TXT',
        jsonb_build_object(
          'allowedItems', jsonb_build_array('Raven', 'active canvas', 'environment', 'File', 'Workspace', 'Run'),
          'forbiddenItems', jsonb_build_array('Graph tab', 'Code tab', 'Log tab', 'large readiness card')
        )
      ),
      (
        'contextual-surfaces',
        'ux_decision',
        'Sources, project, code and node detail open contextually',
        'E-CANVAS-UXDB-SPEC-PERSISTENCE-1',
        'web.canvas.graph',
        'ListCanvasUxdbSpecification',
        'accepted',
        'replaces-fixed-side-panels',
        'buzon/TAREA.TXT',
        jsonb_build_object(
          'surfaces', jsonb_build_array('Add Source dialog', 'Project Explorer dialog', 'SQL split workbench', 'Node Workbench')
        )
      ),
      (
        'bottom-drawer-diagnostics',
        'ux_decision',
        'Diagnostics and execution detail live in the bottom drawer',
        'E-CANVAS-BOTTOM-DRAWER-OPS-1',
        'web.component.shell.BottomOperationalDrawer',
        'RenderBottomOperationalDrawer',
        'accepted',
        'replaces-top-readiness-banner',
        'buzon/TAREA.TXT',
        jsonb_build_object(
          'tabs', jsonb_build_array('Log', 'Problems', 'Runs', 'Preview')
        )
      ),
      (
        'component.canvas-context-menu',
        'ui_component',
        'Canvas context menu',
        'E-CANVAS-CONTEXT-MENU-HUMAN-PROOF-1',
        'web.component.canvas.CanvasContextMenu',
        'ResolveCanvasContextMenu',
        'accepted',
        'canonical-canvas-action-grammar',
        'buzon/TAREA.TXT',
        jsonb_build_object(
          'actions', jsonb_build_array('add-source', 'add-model', 'add-transformation', 'add-test', 'add-output', 'explore-project', 'open-project-code', 'validate-graph', 'preview-execution-plan', 'canvas-settings')
        )
      ),
      (
        'component.node-context-menu',
        'ui_component',
        'Node context menu',
        'E-CANVAS-CONTEXT-MENU-HUMAN-PROOF-1',
        'web.component.canvas.CanvasNodeContextMenu',
        'ResolveCanvasContextMenu',
        'accepted',
        'node-actions-only',
        'buzon/TAREA.TXT',
        jsonb_build_object(
          'actions', jsonb_build_array('edit-sql', 'open-node-workbench', 'preview-node', 'run-from-here', 'show-lineage', 'duplicate', 'delete')
        )
      ),
      (
        'component.node-workbench',
        'ui_component',
        'Node workbench',
        'E-CANVAS-NODE-WORKBENCH-1',
        'web.component.canvas.NodeWorkbench',
        'OpenCanvasNodeWorkbench',
        'accepted',
        'replaces-persistent-inspector',
        'buzon/TAREA.TXT',
        jsonb_build_object(
          'sections', jsonb_build_array('properties', 'columns', 'metadata', 'inputs', 'outputs', 'tests', 'preview', 'runs')
        )
      ),
      (
        'component.add-source-dialog',
        'ui_component',
        'Add Source dialog',
        'E-CANVAS-ADD-SOURCE-LIVE-FLOW-1',
        'web.component.canvas.SourceImportDialog',
        'OpenCanvasAddSourceDialog',
        'accepted',
        'replaces-fixed-source-panel',
        'buzon/TAREA.TXT',
        jsonb_build_object(
          'sections', jsonb_build_array('connections', 'browse', 'metadata', 'selected'),
          'mustShow', jsonb_build_array('schemas', 'tables', 'columns', 'row counts', 'bytes when available')
        )
      ),
      (
        'component.sql-context-workbench',
        'ui_component',
        'SQL context workbench',
        'E-CANVAS-SQL-CONTEXT-WORKBENCH-1',
        'web.component.canvas.SqlContextWorkbench',
        'OpenCanvasSqlContextWorkbench',
        'proposed',
        'keeps-graph-visible',
        'buzon/TAREA.TXT',
        jsonb_build_object(
          'layout', 'graph plus SQL split',
          'actions', jsonb_build_array('validate', 'compile', 'preview', 'save', 'close')
        )
      ),
      (
        'component.execution-preview',
        'ui_component',
        'Execution Preview panel',
        'E-CANVAS-EXECUTION-PREVIEW-READINESS-1',
        'web.component.canvas.ExecutionPreviewPanel',
        'PreviewCanvasExecutionPlan',
        'proposed',
        'renames-ambiguous-plan',
        'buzon/TAREA.TXT',
        jsonb_build_object(
          'mustShow', jsonb_build_array('scope', 'order', 'affected nodes', 'skipped nodes', 'blockers', 'estimates')
        )
      ),
      (
        'canvas-menu.add-source',
        'context_action',
        'Add source from canvas coordinate',
        'E-CANVAS-ADD-SOURCE-LIVE-FLOW-1',
        'web.component.canvas.CanvasContextMenu',
        'OpenCanvasAddSourceDialog',
        'proposed',
        'spatial-canvas-action',
        'buzon/TAREA.TXT',
        jsonb_build_object('target', 'canvas', 'opens', 'component.add-source-dialog')
      ),
      (
        'canvas-menu.add-model',
        'context_action',
        'Add model from canvas coordinate',
        'E-CANVAS-SPATIAL-ADD-NODES-1',
        'web.component.canvas.CanvasContextMenu',
        'CreateCanvasAuthoringNode',
        'accepted',
        'spatial-canvas-action',
        'buzon/TAREA.TXT',
        jsonb_build_object('target', 'canvas', 'nodeKind', 'model')
      ),
      (
        'canvas-menu.add-transformation',
        'context_action',
        'Add transformation from canvas coordinate',
        'E-CANVAS-SPATIAL-ADD-NODES-1',
        'web.component.canvas.CanvasContextMenu',
        'CreateCanvasAuthoringNode',
        'accepted',
        'spatial-canvas-action',
        'buzon/TAREA.TXT',
        jsonb_build_object('target', 'canvas', 'nodeKind', 'transformation')
      ),
      (
        'canvas-menu.add-test',
        'context_action',
        'Add test from canvas coordinate',
        'E-CANVAS-SPATIAL-ADD-NODES-1',
        'web.component.canvas.CanvasContextMenu',
        'CreateCanvasAuthoringNode',
        'accepted',
        'spatial-canvas-action',
        'buzon/TAREA.TXT',
        jsonb_build_object('target', 'canvas', 'nodeKind', 'test')
      ),
      (
        'canvas-menu.add-output',
        'context_action',
        'Add output from canvas coordinate',
        'E-CANVAS-SPATIAL-ADD-NODES-1',
        'web.component.canvas.CanvasContextMenu',
        'CreateCanvasAuthoringNode',
        'accepted',
        'spatial-canvas-action',
        'buzon/TAREA.TXT',
        jsonb_build_object('target', 'canvas', 'nodeKind', 'output')
      ),
      (
        'canvas-menu.preview-execution-plan',
        'context_action',
        'Preview execution plan',
        'E-CANVAS-EXECUTION-PREVIEW-READINESS-1',
        'web.component.canvas.CanvasContextMenu',
        'PreviewCanvasExecutionPlan',
        'proposed',
        'replaces-plan-button',
        'buzon/TAREA.TXT',
        jsonb_build_object('target', 'canvas', 'drawerTab', 'Preview')
      ),
      (
        'node-menu.open-workbench',
        'context_action',
        'Open node workbench',
        'E-CANVAS-NODE-WORKBENCH-1',
        'web.component.canvas.NodeWorkbench',
        'OpenCanvasNodeWorkbench',
        'proposed',
        'replaces-direct-properties-inputs-tests-actions',
        'buzon/TAREA.TXT',
        jsonb_build_object('target', 'node', 'opens', 'component.node-workbench')
      ),
      (
        'node-menu.edit-sql',
        'context_action',
        'Edit SQL in split workbench',
        'E-CANVAS-SQL-CONTEXT-WORKBENCH-1',
        'web.component.canvas.SqlContextWorkbench',
        'OpenCanvasSqlContextWorkbench',
        'proposed',
        'node-action',
        'buzon/TAREA.TXT',
        jsonb_build_object('target', 'node', 'requiresNodeKind', jsonb_build_array('model', 'transformation'))
      ),
      (
        'node-workbench.properties',
        'workbench_section',
        'Node workbench properties section',
        'E-CANVAS-NODE-WORKBENCH-1',
        'web.component.canvas.NodeWorkbench',
        'OpenCanvasNodeWorkbench',
        'accepted',
        'section-not-context-menu-action',
        'buzon/TAREA.TXT',
        jsonb_build_object('scope', 'node-local')
      ),
      (
        'node-workbench.columns',
        'workbench_section',
        'Node workbench columns and metadata section',
        'E-CANVAS-COLUMN-METADATA-SELECTION-1',
        'web.component.canvas.NodeWorkbench',
        'OpenCanvasNodeWorkbench',
        'accepted',
        'section-not-context-menu-action',
        'buzon/TAREA.TXT',
        jsonb_build_object('mustShow', jsonb_build_array('column name', 'type', 'required', 'constraints', 'metadata'))
      ),
      (
        'node-workbench.tests',
        'workbench_section',
        'Node workbench test semantics section',
        'E-CANVAS-DBT-TEST-SEMANTICS-WORKBENCH-1',
        'web.component.canvas.NodeWorkbench',
        'OpenCanvasNodeWorkbench',
        'accepted',
        'section-not-context-menu-action',
        'buzon/TAREA.TXT',
        jsonb_build_object('mustShow', jsonb_build_array('target model', 'target column', 'severity', 'assertion meaning'))
      ),
      (
        'rail.resolve-canvas-context-menu',
        'command_query_rail',
        'Resolve canvas or node context menu model',
        'E-CANVAS-CONTEXT-MENU-HUMAN-PROOF-1',
        'web.component.canvas.CanvasContextMenu',
        'ResolveCanvasContextMenu',
        'accepted',
        'reused-existing-rail',
        'buzon/TAREA.TXT',
        jsonb_build_object('type', 'query')
      ),
      (
        'rail.create-canvas-authoring-node',
        'command_query_rail',
        'Create canvas authoring node from spatial context',
        'E-CANVAS-SPATIAL-ADD-NODES-1',
        'web.component.canvas.CanvasContextMenu',
        'CreateCanvasAuthoringNode',
        'accepted',
        'reused-existing-rail',
        'buzon/TAREA.TXT',
        jsonb_build_object('type', 'command')
      ),
      (
        'rail.list-canvas-uxdb-specification',
        'command_query_rail',
        'List Canvas UX DB specification records',
        'E-CANVAS-UXDB-SPEC-PERSISTENCE-1',
        'planning.component.canvas.CanvasUxdbSpecificationReadModel',
        'ListCanvasUxdbSpecification',
        'implemented',
        'db-first-spec-query',
        'buzon/TAREA.TXT',
        jsonb_build_object('type', 'query')
      ),
      (
        'anti-pattern.fixed-left-source-panel',
        'anti_pattern',
        'Fixed left source panel consumes graph workspace',
        'E-CANVAS-LEGACY-PALETTE-RETIRE-1',
        'web.component.canvas.SourceImportDialog',
        'OpenCanvasAddSourceDialog',
        'accepted',
        'retire',
        'buzon/TAREA.TXT',
        jsonb_build_object('replacement', 'component.add-source-dialog')
      ),
      (
        'anti-pattern.node-menu-direct-sections',
        'anti_pattern',
        'Node menu must not duplicate Properties, Inputs or Tests workbench sections',
        'E-CANVAS-CONTEXT-MENU-HUMAN-PROOF-1',
        'web.component.canvas.CanvasNodeContextMenu',
        'OpenCanvasNodeWorkbench',
        'accepted',
        'retire-direct-section-actions',
        'buzon/TAREA.TXT',
        jsonb_build_object('replacement', 'node-menu.open-workbench')
      ),
      (
        'acceptance.dvt-flow-e2e',
        'acceptance_criterion',
        'DVT flow is browser-proven without fake draft intercepts',
        'E-DVT-FLOW-E2E-PROOF-1',
        'web.canvas.graph',
        'VerifyDvtCanvasFlowInBrowser',
        'proposed',
        'requires-real-browser-proof',
        'buzon/TAREA.TXT',
        jsonb_build_object(
          'mustProve', jsonb_build_array('source selection', 'column metadata', 'SQL transform', 'exact sink target', 'execution preview', 'run gating'),
          'forbidden', jsonb_build_array('cy.intercept /workspace/graph/draft success path', 'direct draft seeding')
        )
      ),
      (
        'acceptance.dbt-flow-e2e',
        'acceptance_criterion',
        'DBT flow is browser-proven with source, model, test and output',
        'E-DBT-FLOW-E2E-PROOF-1',
        'web.canvas.graph',
        'VerifyDbtCanvasFlowInBrowser',
        'proposed',
        'requires-real-browser-proof',
        'buzon/TAREA.TXT',
        jsonb_build_object(
          'mustProve', jsonb_build_array('source metadata', 'model SQL', 'test target semantics', 'output target', 'execution preview', 'run gating')
        )
      ),
      (
        'test.context-menu-human-proof',
        'test_requirement',
        'Canvas context menu remains open and exposes only canvas actions',
        'E-CANVAS-CONTEXT-MENU-HUMAN-PROOF-1',
        'web.component.canvas.CanvasContextMenu',
        'ResolveCanvasContextMenu',
        'accepted',
        'browser-proof-required',
        'buzon/TAREA.TXT',
        jsonb_build_object(
          'testLevels', jsonb_build_array('presenter unit', 'component interaction', 'browser right-click flow')
        )
      ),
      (
        'test.node-menu-no-section-duplicates',
        'test_requirement',
        'Node context menu does not duplicate workbench sections',
        'E-CANVAS-CONTEXT-MENU-HUMAN-PROOF-1',
        'web.component.canvas.CanvasNodeContextMenu',
        'OpenCanvasNodeWorkbench',
        'proposed',
        'architecture-guard-required',
        'buzon/TAREA.TXT',
        jsonb_build_object(
          'forbiddenActionIds', jsonb_build_array('node-menu.properties', 'node-menu.inputs', 'node-menu.tests')
        )
      ),
      (
        'evidence.tarea-intake',
        'evidence',
        'TAREA.TXT remains intake evidence, not primary state',
        'E-CANVAS-UXDB-SPEC-PERSISTENCE-1',
        'planning.component.canvas.CanvasUxdbSpecificationReadModel',
        'ListCanvasUxdbSpecification',
        'accepted',
        'raw-intake-evidence-only',
        'buzon/TAREA.TXT',
        jsonb_build_object(
          'sourceRole', 'evidence',
          'dbAuthority', 'planning_query_store.canvas_uxdb_specification_query'
        )
      ),
      (
        'export.db-generated-manual',
        'export_provenance',
        'Human manual must be generated from DB records',
        'E-CANVAS-UXDB-EXPORT-1',
        'planning.component.canvas.CanvasUxdbSpecificationReadModel',
        'ExportCanvasUxdbManual',
        'proposed',
        'manual-not-primary-spec',
        'buzon/TAREA.TXT',
        jsonb_build_object(
          'sourceQuery', 'planning_query_store.canvas_uxdb_specification_query',
          'target', 'user manual with screenshots after browser proof'
        )
      ),
      (
        'reference.react-flow',
        'reference',
        'React Flow',
        'E-CANVAS-UXDB-SPEC-PERSISTENCE-1',
        'web.canvas.graph',
        'RenderCanvasGraphBase',
        'accepted',
        'technical-canvas-reference',
        'buzon/TAREA.TXT',
        jsonb_build_object('url', 'https://reactflow.dev/')
      ),
      (
        'reference.nifi',
        'reference',
        'Apache NiFi',
        'E-CANVAS-UXDB-SPEC-PERSISTENCE-1',
        'web.component.canvas.NodeWorkbench',
        'OpenCanvasNodeWorkbench',
        'accepted',
        'node-configuration-reference',
        'buzon/TAREA.TXT',
        jsonb_build_object('url', 'https://nifi.apache.org/docs/nifi-docs/html/user-guide.html')
      ),
      (
        'reference.vscode',
        'reference',
        'VS Code workbench',
        'E-CANVAS-BOTTOM-DRAWER-OPS-1',
        'web.component.shell.BottomOperationalDrawer',
        'RenderBottomOperationalDrawer',
        'accepted',
        'bottom-drawer-reference',
        'buzon/TAREA.TXT',
        jsonb_build_object('url', 'https://code.visualstudio.com/docs/getstarted/userinterface')
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
from records;

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
  'local#E-CANVAS-UXDB-SPEC-PERSISTENCE-1#query#listcanvasuxdbspecification',
  'E-CANVAS-UXDB-SPEC-PERSISTENCE-1',
  'implemented',
  'ListCanvasUxdbSpecification',
  'listcanvasuxdbspecification',
  'query',
  'CanvasUxdbSpecificationReadModel',
  'implemented',
  jsonb_build_array(
    'tools/planning-db/migrations/293_canvas_uxdb_specification_persistence.sql#canvas_uxdb_specification_query',
    'scripts/planning-db/queries/canvas-uxdb-specification-query.cjs#readCanvasUxdbSpecificationRows',
    'scripts/planning-db/queries/canvas-uxdb-specification-query.cjs#buildCanvasUxdbSpecificationRows'
  ),
  jsonb_build_array(
    'tools/planning-db/migrations/293_canvas_uxdb_specification_persistence.sql',
    'scripts/planning-db/queries/canvas-uxdb-specification-query.cjs',
    'scripts/planning-db-query.cjs',
    'scripts/planning-db-query.test.cjs',
    'scripts/planning-db-migrate.test.cjs'
  ),
  jsonb_build_array('buzon/TAREA.TXT'),
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
    'tools/planning-db/migrations/293_canvas_uxdb_specification_persistence.sql',
    'scripts/planning-db/queries/canvas-uxdb-specification-query.cjs',
    'scripts/planning-db-query.cjs',
    'scripts/planning-db-query.test.cjs',
    'scripts/planning-db-migrate.test.cjs'
  ),
  jsonb_build_array(
    'node --test --test-name-pattern "Canvas UX DB-first specification|readCanvasUxdbSpecificationRows|buildCanvasUxdbSpecificationRows|root help" scripts/planning-db-query.test.cjs',
    'node --test --test-name-pattern "Canvas UX specification records" scripts/planning-db-migrate.test.cjs',
    'pnpm planning:db:query canvas-uxdb-specification --limit 50'
  ),
  jsonb_build_array(
    'pnpm planning:db:migrate',
    'node --test --test-name-pattern "Canvas UX DB-first specification|readCanvasUxdbSpecificationRows|buildCanvasUxdbSpecificationRows|root help" scripts/planning-db-query.test.cjs',
    'node --test --test-name-pattern "Canvas UX specification records" scripts/planning-db-migrate.test.cjs',
    'pnpm planning:db:query canvas-uxdb-specification --limit 50',
    'pnpm docs:feature-mechanization:implementation',
    'pnpm verify:prepush'
  ),
  'tools/planning-db/migrations/293_canvas_uxdb_specification_persistence.sql',
  md5('E-CANVAS-UXDB-SPEC-PERSISTENCE-1:ListCanvasUxdbSpecification:293')
    || md5('canvas-uxdb-specification-persistence'),
  jsonb_build_object(
    'name', 'ListCanvasUxdbSpecification',
    'type', 'query',
    'dddOwner', 'CanvasUxdbSpecificationReadModel',
    'status', 'implemented'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'E-CANVAS-UXDB-SPEC-PERSISTENCE-1',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan', 'Persist Canvas-first UX vocabulary and anti-pattern posture as DB-owned records before UI code changes.',
    'componentGuides', jsonb_build_array(
      'planning-db:query/canvas-uxdb-specification',
      'buzon/TAREA.TXT'
    ),
    'userStories', jsonb_build_array(
      jsonb_build_object(
        'role', 'Canvas implementer',
        'need', 'Inspect the accepted Canvas-first vocabulary, components and rails without reading raw inbox Markdown.',
        'acceptance', 'canvas-uxdb-specification lists typed records for decisions, components, context actions, workbench sections, rails, anti-patterns and references.'
      ),
      jsonb_build_object(
        'role', 'Canvas reviewer',
        'need', 'Verify that node menu section duplicates are retired before UI work continues.',
        'acceptance', 'The DB records expose node-menu.open-workbench and no direct node-menu properties, inputs or tests actions.'
      )
    ),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/guides/ai-work-protocol.md',
      'docs/planning/state/planning-control-tower.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md',
      'buzon/TAREA.TXT'
    ),
    'allowedImplementationSurfaces', jsonb_build_array(
      'tools/planning-db/migrations/293_canvas_uxdb_specification_persistence.sql',
      'scripts/planning-db/queries/canvas-uxdb-specification-query.cjs',
      'scripts/planning-db-query.cjs',
      'scripts/planning-db-query.test.cjs',
      'scripts/planning-db-migrate.test.cjs'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'apps/**',
      'packages/**',
      'buzon/**#primary_spec_authority'
    ),
    'architectureGuards', jsonb_build_array(
      'node --test --test-name-pattern "Canvas UX DB-first specification|readCanvasUxdbSpecificationRows|buildCanvasUxdbSpecificationRows|root help" scripts/planning-db-query.test.cjs',
      'node --test --test-name-pattern "Canvas UX specification records" scripts/planning-db-migrate.test.cjs',
      'pnpm planning:db:query canvas-uxdb-specification --kind context_action --limit 30',
      'pnpm docs:feature-mechanization:implementation'
    ),
    'cypressFlows', jsonb_build_array('not_applicable:planning_db_specification_read_model'),
    'completionGate', jsonb_build_array(
      'pnpm planning:db:migrate',
      'node --test --test-name-pattern "Canvas UX DB-first specification|readCanvasUxdbSpecificationRows|buildCanvasUxdbSpecificationRows|root help" scripts/planning-db-query.test.cjs',
      'node --test --test-name-pattern "Canvas UX specification records" scripts/planning-db-migrate.test.cjs',
      'pnpm planning:db:query canvas-uxdb-specification --kind context_action --limit 30',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', 'ListCanvasUxdbSpecification',
        'type', 'query',
        'dddOwner', 'CanvasUxdbSpecificationReadModel',
        'status', 'implemented'
      )
    ),
    'domainObjects', jsonb_build_array('CanvasUxdbSpecificationReadModel'),
    'fowlerSignals', jsonb_build_array(
      'duplicate_semantics',
      'documentation_drift',
      'hidden_authority'
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'canvas-uxdb-specification-query',
        'redTest', 'node --test --test-name-pattern "Canvas UX DB-first specification|readCanvasUxdbSpecificationRows|buildCanvasUxdbSpecificationRows|root help" scripts/planning-db-query.test.cjs',
        'expectedFailure', 'Planning DB query CLI and read model did not expose canvas-uxdb-specification.',
        'patchSurfaces', jsonb_build_array(
          'scripts/planning-db/queries/canvas-uxdb-specification-query.cjs',
          'scripts/planning-db-query.cjs',
          'scripts/planning-db-query.test.cjs'
        ),
        'greenTest', 'node --test --test-name-pattern "Canvas UX DB-first specification|readCanvasUxdbSpecificationRows|buildCanvasUxdbSpecificationRows|root help" scripts/planning-db-query.test.cjs'
      ),
      jsonb_build_object(
        'id', 'canvas-uxdb-specification-migration',
        'redTest', 'node --test --test-name-pattern "Canvas UX specification records" scripts/planning-db-migrate.test.cjs',
        'expectedFailure', 'Migration 293 and canvas_uxdb_specification_query were absent.',
        'patchSurfaces', jsonb_build_array(
          'tools/planning-db/migrations/293_canvas_uxdb_specification_persistence.sql',
          'scripts/planning-db-migrate.test.cjs'
        ),
        'greenTest', 'node --test --test-name-pattern "Canvas UX specification records" scripts/planning-db-migrate.test.cjs'
      )
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object(
        'name', 'createCanvasUxdbSpecificationReadModelComponent',
        'path', 'scripts/planning-db/queries/canvas-uxdb-specification-query.cjs',
        'dddOwner', 'CanvasUxdbSpecificationReadModel',
        'cqRails', jsonb_build_array('ListCanvasUxdbSpecification'),
        'fowlerSignals', jsonb_build_array('hidden_authority', 'documentation_drift'),
        'architectureGuard', 'scripts/planning-db-query.test.cjs',
        'cypressCoverage', 'not_applicable:planning_db_specification_read_model',
        'unitTests', jsonb_build_array('node --test --test-name-pattern "Canvas UX DB-first specification" scripts/planning-db-query.test.cjs')
      ),
      jsonb_build_object(
        'name', 'readCanvasUxdbSpecificationRows',
        'path', 'scripts/planning-db/queries/canvas-uxdb-specification-query.cjs',
        'dddOwner', 'CanvasUxdbSpecificationReadModel',
        'cqRails', jsonb_build_array('ListCanvasUxdbSpecification'),
        'fowlerSignals', jsonb_build_array('hidden_authority'),
        'architectureGuard', 'scripts/planning-db-query.test.cjs',
        'cypressCoverage', 'not_applicable:planning_db_specification_read_model',
        'unitTests', jsonb_build_array('node --test --test-name-pattern "readCanvasUxdbSpecificationRows" scripts/planning-db-query.test.cjs')
      ),
      jsonb_build_object(
        'name', 'buildCanvasUxdbSpecificationRows',
        'path', 'scripts/planning-db/queries/canvas-uxdb-specification-query.cjs',
        'dddOwner', 'CanvasUxdbSpecificationReadModel',
        'cqRails', jsonb_build_array('ListCanvasUxdbSpecification'),
        'fowlerSignals', jsonb_build_array('hidden_authority'),
        'architectureGuard', 'scripts/planning-db-query.test.cjs',
        'cypressCoverage', 'not_applicable:planning_db_specification_read_model',
        'unitTests', jsonb_build_array('node --test --test-name-pattern "buildCanvasUxdbSpecificationRows" scripts/planning-db-query.test.cjs')
      ),
      jsonb_build_object(
        'name', 'canvas_uxdb_specification_query',
        'path', 'tools/planning-db/migrations/293_canvas_uxdb_specification_persistence.sql',
        'dddOwner', 'CanvasUxdbSpecificationReadModel',
        'cqRails', jsonb_build_array('ListCanvasUxdbSpecification'),
        'fowlerSignals', jsonb_build_array('hidden_authority', 'documentation_drift'),
        'architectureGuard', 'scripts/planning-db-migrate.test.cjs',
        'cypressCoverage', 'not_applicable:planning_db_specification_read_model',
        'unitTests', jsonb_build_array('node --test --test-name-pattern "Canvas UX specification records" scripts/planning-db-migrate.test.cjs')
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
