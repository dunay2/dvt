-- Close Web Canvas architecture maturity errors exposed by fresh Planning DB
-- migrations. This records real component responsibilities, contains
-- relations, and executable tests; it does not delete source files or retire
-- stale paths.

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
  'PLANNING-DB-WEB-CANVAS-ARCHITECTURE-MATURITY-20260618',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Web Canvas architecture maturity evidence',
  'Architecture / Planning DB / Frontend',
  'review',
  'Fresh Planning DB migrations exposed Web Canvas architecture components with implemented status but missing responsibilities, contains relations, required tests, or duplicate repo paths. This design records existing tests and parent-child intent without creating a parallel inventory.',
  'hidden_authority',
  'RecordArchitectureComponent;RecordArchitectureRelation;RecordArchitectureTestEvidence;CheckPlanningDbComponentIntegrity',
  now()
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  updated_at = now();

insert into architecture.design_scope (
  design_id,
  subject_kind,
  subject_id,
  scope_kind,
  required
)
values
  ('PLANNING-DB-WEB-CANVAS-ARCHITECTURE-MATURITY-20260618', 'component', 'SYS-WEB-ROOT', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-ARCHITECTURE-MATURITY-20260618', 'component', 'SYS-WEB-APP-COMPONENTS', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-ARCHITECTURE-MATURITY-20260618', 'component', 'SYS-WEB-VIEW-CANVAS', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-ARCHITECTURE-MATURITY-20260618', 'component', 'SYS-WEB-CANVAS-CONTEXTUAL-WORKBENCH', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-ARCHITECTURE-MATURITY-20260618', 'component', 'SYS-WEB-CANVAS-ADD-SOURCE-DIALOG', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-ARCHITECTURE-MATURITY-20260618', 'component', 'SYS-WEB-CANVAS-CANVAS-CONTEXT-MENU', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-ARCHITECTURE-MATURITY-20260618', 'component', 'SYS-WEB-CANVAS-GRAPH-SURFACE', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-ARCHITECTURE-MATURITY-20260618', 'component', 'SYS-WEB-CANVAS-GRAPH-VIEWPORT', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-ARCHITECTURE-MATURITY-20260618', 'component', 'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-ARCHITECTURE-MATURITY-20260618', 'component', 'SYS-WEB-CANVAS-INSPECTOR-PANEL', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-ARCHITECTURE-MATURITY-20260618', 'component', 'SYS-WEB-CANVAS-NODE-WORKBENCH', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-ARCHITECTURE-MATURITY-20260618', 'component', 'SYS-WEB-CANVAS-SHELL-MAIN-PANEL', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-ARCHITECTURE-MATURITY-20260618', 'component', 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-ARCHITECTURE-MATURITY-20260618', 'relation', 'REL-WEB-ROOT-CONTAINS-APP-COMPONENTS', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-ARCHITECTURE-MATURITY-20260618', 'relation', 'REL-WEB-ROOT-CONTAINS-CANVAS-VIEW', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-ARCHITECTURE-MATURITY-20260618', 'relation', 'REL-WEB-APP-COMPONENTS-CONTAINS-INSPECTOR-TABS', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-ARCHITECTURE-MATURITY-20260618', 'relation', 'REL-WEB-CANVAS-VIEW-CONTAINS-CONTEXTUAL-WORKBENCH', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-ARCHITECTURE-MATURITY-20260618', 'relation', 'REL-WEB-CANVAS-VIEW-CONTAINS-SHELL-MAIN-PANEL', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-ARCHITECTURE-MATURITY-20260618', 'relation', 'REL-WEB-CANVAS-CONTEXTUAL-WORKBENCH-CONTAINS-ADD-SOURCE-DIALOG', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-ARCHITECTURE-MATURITY-20260618', 'relation', 'REL-WEB-CANVAS-CONTEXTUAL-WORKBENCH-CONTAINS-CONTEXT-MENU', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-ARCHITECTURE-MATURITY-20260618', 'relation', 'REL-WEB-CANVAS-CONTEXTUAL-WORKBENCH-CONTAINS-GRAPH-SURFACE', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-ARCHITECTURE-MATURITY-20260618', 'relation', 'REL-WEB-CANVAS-CONTEXTUAL-WORKBENCH-CONTAINS-NODE-WORKBENCH', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-ARCHITECTURE-MATURITY-20260618', 'relation', 'REL-WEB-CANVAS-ADD-SOURCE-DIALOG-CONTAINS-SOURCE-IMPORT-WIZARD', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-ARCHITECTURE-MATURITY-20260618', 'relation', 'REL-WEB-CANVAS-GRAPH-SURFACE-CONTAINS-GRAPH-VIEWPORT', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-ARCHITECTURE-MATURITY-20260618', 'relation', 'REL-WEB-CANVAS-NODE-WORKBENCH-CONTAINS-INSPECTOR-PANEL', 'may_create', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

insert into architecture.component (
  component_id,
  name,
  kind,
  layer,
  owner,
  repo_path,
  public_contract,
  runtime,
  criticality,
  status,
  parent_component_id
)
values (
  'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD',
  'Web Canvas Source Import Wizard',
  'ui-view',
  'ui',
  'Frontend / Canvas',
  'apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts',
  'Web Canvas Source Import Wizard workflow boundary in apps/web',
  'browser',
  'medium',
  'implemented',
  'SYS-WEB-CANVAS-ADD-SOURCE-DIALOG'
)
on conflict (component_id) do update set
  repo_path = excluded.repo_path,
  public_contract = excluded.public_contract,
  runtime = excluded.runtime,
  criticality = excluded.criticality,
  status = excluded.status,
  parent_component_id = excluded.parent_component_id,
  updated_at = now();

insert into architecture.component_responsibility (
  responsibility_id,
  component_id,
  responsibility,
  reason_to_change,
  ddd_owner,
  status
)
values
  ('RESP-SYS-WEB-ROOT', 'SYS-WEB-ROOT', 'Own the web application source root and route major app, Canvas, service, shell, and test surfaces to child components.', 'Web application top-level source ownership, root routing, or app-wide governance changes.', 'WebApplicationRoot', 'proposed'),
  ('RESP-SYS-WEB-APP-COMPONENTS', 'SYS-WEB-APP-COMPONENTS', 'Own shared web app component module boundaries that are not specific to one Canvas runtime view.', 'Shared component module composition or cross-view presentation component changes.', 'WebAppComponentsComposite', 'proposed'),
  ('RESP-SYS-WEB-VIEW-CANVAS', 'SYS-WEB-VIEW-CANVAS', 'Own the Canvas route view boundary and compose the shell and contextual workbench children.', 'Canvas route-level state, shell composition, or contextual workbench routing changes.', 'CanvasViewComposite', 'proposed'),
  ('RESP-SYS-WEB-CANVAS-CONTEXTUAL-WORKBENCH', 'SYS-WEB-CANVAS-CONTEXTUAL-WORKBENCH', 'Own Canvas contextual workbench state and route child surfaces for graph, node, context-menu, and source-import workflows.', 'Canvas workbench state model or child workbench composition changes.', 'CanvasContextualWorkbench', 'proposed'),
  ('RESP-SYS-WEB-CANVAS-ADD-SOURCE-DIALOG', 'SYS-WEB-CANVAS-ADD-SOURCE-DIALOG', 'Own the Canvas add-source dialog boundary that opens warehouse source import workflows.', 'Add-source modal host, source import entry policy, or warehouse import launch behavior changes.', 'CanvasAddSourceDialog', 'proposed'),
  ('RESP-SYS-WEB-CANVAS-CANVAS-CONTEXT-MENU', 'SYS-WEB-CANVAS-CANVAS-CONTEXT-MENU', 'Own Canvas context menu presentation and routing to context-menu presenter and view tests.', 'Canvas context menu render, close timing, or action routing changes.', 'CanvasContextMenu', 'proposed'),
  ('RESP-SYS-WEB-CANVAS-GRAPH-SURFACE', 'SYS-WEB-CANVAS-GRAPH-SURFACE', 'Own Canvas graph surface composition and graph viewport child routing.', 'Canvas center graph surface rendering, graph status overlay, or viewport composition changes.', 'CanvasGraphSurface', 'proposed'),
  ('RESP-SYS-WEB-CANVAS-GRAPH-VIEWPORT', 'SYS-WEB-CANVAS-GRAPH-VIEWPORT', 'Own Canvas graph viewport rendering, graph model projection, and viewport test harness boundaries.', 'Canvas viewport rendering, graph model projection, or viewport harness behavior changes.', 'CanvasGraphViewport', 'proposed'),
  ('RESP-SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS', 'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS', 'Own inspector node properties tabs as a composite of presenter and focused tab tests.', 'Inspector tab rendering, overflow, or node property read-model changes.', 'CanvasInspectorNodePropertiesTabs', 'proposed'),
  ('RESP-SYS-WEB-CANVAS-INSPECTOR-PANEL', 'SYS-WEB-CANVAS-INSPECTOR-PANEL', 'Own the shared inspector panel presentation boundary used by Canvas node workbench flows.', 'Inspector panel rendering, plugin tabs, or authoring handoff changes.', 'CanvasInspectorPanel', 'proposed'),
  ('RESP-SYS-WEB-CANVAS-NODE-WORKBENCH', 'SYS-WEB-CANVAS-NODE-WORKBENCH', 'Own Canvas node workbench composition for inspector, fields, panel, overlay, and node authoring children.', 'Node workbench composition, authoring model, or inspector child routing changes.', 'CanvasNodeWorkbench', 'proposed'),
  ('RESP-SYS-WEB-CANVAS-SHELL-MAIN-PANEL', 'SYS-WEB-CANVAS-SHELL-MAIN-PANEL', 'Own Canvas shell main panel composition and shell-specific tests for contextual dialogs and source import.', 'Canvas shell panel composition, source import availability, or contextual dialog routing changes.', 'CanvasShellMainPanel', 'proposed'),
  ('RESP-SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD', 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD', 'Own the source import wizard workflow boundary and route frame and harness children.', 'Source import wizard workflow, data loading, metadata model, or frame composition changes.', 'SourceImportWizard', 'proposed')
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

insert into architecture.component_relation (
  relation_id,
  source_component_id,
  target_component_id,
  relation_type,
  direction,
  sync_async,
  contract_id,
  failure_mode,
  authorization_scope,
  source_refs,
  status
)
values
  ('REL-WEB-ROOT-CONTAINS-APP-COMPONENTS', 'SYS-WEB-ROOT', 'SYS-WEB-APP-COMPONENTS', 'contains', 'outbound', 'sync', null, 'not_applicable', 'internal-ui-component-ownership', '["docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md"]'::jsonb, 'implemented'),
  ('REL-WEB-ROOT-CONTAINS-CANVAS-VIEW', 'SYS-WEB-ROOT', 'SYS-WEB-VIEW-CANVAS', 'contains', 'outbound', 'sync', null, 'not_applicable', 'internal-ui-component-ownership', '["docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md"]'::jsonb, 'implemented'),
  ('REL-WEB-APP-COMPONENTS-CONTAINS-INSPECTOR-TABS', 'SYS-WEB-APP-COMPONENTS', 'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS', 'contains', 'outbound', 'sync', null, 'not_applicable', 'internal-ui-component-ownership', '["docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md"]'::jsonb, 'implemented'),
  ('REL-WEB-CANVAS-VIEW-CONTAINS-CONTEXTUAL-WORKBENCH', 'SYS-WEB-VIEW-CANVAS', 'SYS-WEB-CANVAS-CONTEXTUAL-WORKBENCH', 'contains', 'outbound', 'sync', null, 'not_applicable', 'internal-ui-component-ownership', '["docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md"]'::jsonb, 'implemented'),
  ('REL-WEB-CANVAS-VIEW-CONTAINS-SHELL-MAIN-PANEL', 'SYS-WEB-VIEW-CANVAS', 'SYS-WEB-CANVAS-SHELL-MAIN-PANEL', 'contains', 'outbound', 'sync', null, 'not_applicable', 'internal-ui-component-ownership', '["docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md"]'::jsonb, 'implemented'),
  ('REL-WEB-CANVAS-CONTEXTUAL-WORKBENCH-CONTAINS-ADD-SOURCE-DIALOG', 'SYS-WEB-CANVAS-CONTEXTUAL-WORKBENCH', 'SYS-WEB-CANVAS-ADD-SOURCE-DIALOG', 'contains', 'outbound', 'sync', null, 'not_applicable', 'internal-ui-component-ownership', '["docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md"]'::jsonb, 'implemented'),
  ('REL-WEB-CANVAS-CONTEXTUAL-WORKBENCH-CONTAINS-CONTEXT-MENU', 'SYS-WEB-CANVAS-CONTEXTUAL-WORKBENCH', 'SYS-WEB-CANVAS-CANVAS-CONTEXT-MENU', 'contains', 'outbound', 'sync', null, 'not_applicable', 'internal-ui-component-ownership', '["docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md"]'::jsonb, 'implemented'),
  ('REL-WEB-CANVAS-CONTEXTUAL-WORKBENCH-CONTAINS-GRAPH-SURFACE', 'SYS-WEB-CANVAS-CONTEXTUAL-WORKBENCH', 'SYS-WEB-CANVAS-GRAPH-SURFACE', 'contains', 'outbound', 'sync', null, 'not_applicable', 'internal-ui-component-ownership', '["docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md"]'::jsonb, 'implemented'),
  ('REL-WEB-CANVAS-CONTEXTUAL-WORKBENCH-CONTAINS-NODE-WORKBENCH', 'SYS-WEB-CANVAS-CONTEXTUAL-WORKBENCH', 'SYS-WEB-CANVAS-NODE-WORKBENCH', 'contains', 'outbound', 'sync', null, 'not_applicable', 'internal-ui-component-ownership', '["docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md"]'::jsonb, 'implemented'),
  ('REL-WEB-CANVAS-ADD-SOURCE-DIALOG-CONTAINS-SOURCE-IMPORT-WIZARD', 'SYS-WEB-CANVAS-ADD-SOURCE-DIALOG', 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD', 'contains', 'outbound', 'sync', null, 'not_applicable', 'internal-ui-component-ownership', '["docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md"]'::jsonb, 'implemented'),
  ('REL-WEB-CANVAS-GRAPH-SURFACE-CONTAINS-GRAPH-VIEWPORT', 'SYS-WEB-CANVAS-GRAPH-SURFACE', 'SYS-WEB-CANVAS-GRAPH-VIEWPORT', 'contains', 'outbound', 'sync', null, 'not_applicable', 'internal-ui-component-ownership', '["docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md"]'::jsonb, 'implemented'),
  ('REL-WEB-CANVAS-NODE-WORKBENCH-CONTAINS-INSPECTOR-PANEL', 'SYS-WEB-CANVAS-NODE-WORKBENCH', 'SYS-WEB-CANVAS-INSPECTOR-PANEL', 'contains', 'outbound', 'sync', null, 'not_applicable', 'internal-ui-component-ownership', '["docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md"]'::jsonb, 'implemented')
on conflict (relation_id) do update set
  source_component_id = excluded.source_component_id,
  target_component_id = excluded.target_component_id,
  relation_type = excluded.relation_type,
  direction = excluded.direction,
  sync_async = excluded.sync_async,
  contract_id = excluded.contract_id,
  failure_mode = excluded.failure_mode,
  authorization_scope = excluded.authorization_scope,
  source_refs = excluded.source_refs,
  status = excluded.status,
  updated_at = now();

insert into architecture.component_test (
  test_id,
  component_id,
  test_path,
  test_kind,
  coverage_level,
  required,
  validation_command
)
values
  ('TEST-WEB-ROOT', 'SYS-WEB-ROOT', 'apps/web/src/app/Root.test.tsx', 'unit', 'behavior', true, 'pnpm --filter @dvt/web test:presentation:run -- src/app/Root.test.tsx'),
  ('TEST-WEB-APP-COMPONENTS', 'SYS-WEB-APP-COMPONENTS', 'apps/web/src/app/components/domain/domainComponents.test.tsx', 'unit', 'behavior', true, 'pnpm --filter @dvt/web test:presentation:run -- src/app/components/domain/domainComponents.test.tsx'),
  ('TEST-WEB-VIEW-CANVAS', 'SYS-WEB-VIEW-CANVAS', 'apps/web/src/app/views/Canvas.architecture.test.ts', 'architecture', 'boundary', true, 'pnpm --filter @dvt/web test:architecture:run -- src/app/views/Canvas.architecture.test.ts'),
  ('TEST-WEB-CANVAS-CONTEXTUAL-WORKBENCH', 'SYS-WEB-CANVAS-CONTEXTUAL-WORKBENCH', 'apps/web/src/app/views/canvas/canvasWorkbenchStateModel.test.ts', 'unit', 'behavior', true, 'pnpm --filter @dvt/web test:unit:run -- src/app/views/canvas/canvasWorkbenchStateModel.test.ts'),
  ('TEST-WEB-CANVAS-ADD-SOURCE-DIALOG', 'SYS-WEB-CANVAS-ADD-SOURCE-DIALOG', 'apps/web/src/app/views/canvas/CanvasModalHost.architecture.test.tsx', 'architecture', 'boundary', true, 'pnpm --filter @dvt/web test:architecture:run -- src/app/views/canvas/CanvasModalHost.architecture.test.tsx'),
  ('TEST-WEB-CANVAS-CONTEXT-MENU', 'SYS-WEB-CANVAS-CANVAS-CONTEXT-MENU', 'apps/web/src/app/views/canvas/CanvasContextMenuView.test.tsx', 'unit', 'behavior', true, 'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/CanvasContextMenuView.test.tsx'),
  ('TEST-WEB-CANVAS-GRAPH-SURFACE', 'SYS-WEB-CANVAS-GRAPH-SURFACE', 'apps/web/src/app/views/canvas/CanvasCenterSurface.architecture.test.ts', 'architecture', 'boundary', true, 'pnpm --filter @dvt/web test:architecture:run -- src/app/views/canvas/CanvasCenterSurface.architecture.test.ts'),
  ('TEST-WEB-CANVAS-GRAPH-VIEWPORT', 'SYS-WEB-CANVAS-GRAPH-VIEWPORT', 'apps/web/src/app/views/canvas/CanvasViewport.test.tsx', 'unit', 'behavior', true, 'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/CanvasViewport.test.tsx'),
  ('TEST-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS', 'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS', 'apps/web/src/app/components/inspector/NodePropertiesTabs.test.tsx', 'unit', 'behavior', true, 'pnpm --filter @dvt/web test:presentation:run -- src/app/components/inspector/NodePropertiesTabs.test.tsx'),
  ('TEST-WEB-CANVAS-INSPECTOR-PANEL', 'SYS-WEB-CANVAS-INSPECTOR-PANEL', 'apps/web/src/app/components/InspectorPanel.test.tsx', 'unit', 'behavior', true, 'pnpm --filter @dvt/web test:presentation:run -- src/app/components/InspectorPanel.test.tsx'),
  ('TEST-WEB-CANVAS-NODE-WORKBENCH', 'SYS-WEB-CANVAS-NODE-WORKBENCH', 'apps/web/src/app/views/canvas/CanvasInspectorPanel.authoring.test.tsx', 'unit', 'behavior', true, 'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/CanvasInspectorPanel.authoring.test.tsx'),
  ('TEST-WEB-CANVAS-SHELL-MAIN-PANEL', 'SYS-WEB-CANVAS-SHELL-MAIN-PANEL', 'apps/web/src/app/views/canvas/CanvasShell.test.tsx', 'unit', 'behavior', true, 'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/CanvasShell.test.tsx'),
  ('TEST-WEB-CANVAS-SOURCE-IMPORT-WIZARD', 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD', 'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts', 'unit', 'behavior', true, 'pnpm --filter @dvt/web test:unit:run -- src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts')
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;
