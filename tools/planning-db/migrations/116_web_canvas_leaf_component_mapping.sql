-- Persist the governed Canvas leaf component mapping created through
-- planning:db:operate. This keeps fresh CI databases aligned with the local
-- Planning DB component/file authority without introducing a side inventory.

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
values
  (
    'PLANNING-DB-WEB-CANVAS-LEAF-COMPONENTS-20260617',
    'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
    'Web Canvas leaf component ownership mapping',
    'Architecture / Planning DB / Frontend',
    'implemented',
    'SYS-WEB-VIEW-CANVAS still owned concrete Canvas files after its first subdivision. This design records focused leaf components for harnesses, overlay presentation, and authoring field tests so component-profile can answer which files and tests belong to each Canvas subcomponent.',
    'boundary_drift',
    'CreateGovernanceComponent;RecordArchitectureComponent;RecordArchitectureTestEvidence;CheckPlanningDbComponentIntegrity',
    now()
  ),
  (
    'PLANNING-DB-WEB-CANVAS-LEAF-RELATIONS-20260617',
    'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
    'Web Canvas leaf component relation mapping',
    'Architecture / Planning DB / Frontend',
    'implemented',
    'New Canvas leaf components need explicit architecture.component, contains relations, and required test evidence. CanvasNodeWorkbenchOverlay.tsx is now tracked and functional, so the previous deprecated architecture row is reactivated instead of left as a ghost component.',
    'hidden_authority',
    'RecordArchitectureComponent;RecordArchitectureRelation;RecordArchitectureTestEvidence;CheckPlanningDbComponentIntegrity',
    now()
  ),
  (
    'PLANNING-DB-WEB-CANVAS-LEAF-CLOSURE-20260617',
    'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
    'Web Canvas parent leaf closure',
    'Architecture / Planning DB / Frontend',
    'implemented',
    'After adding Canvas harness leaves, graph viewport, node workbench, and shell main panel became composite parents with residual direct file claims. This design closes that drift with presentation, panel, and architecture-test leaves.',
    'responsibility_overload',
    'CreateGovernanceComponent;RecordArchitectureComponent;RecordArchitectureRelation;RecordArchitectureTestEvidence;CheckPlanningDbComponentIntegrity',
    now()
  )
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  approved_at = coalesce(architecture.design.approved_at, excluded.approved_at),
  updated_at = now();

insert into planning_query_store.governance_component_local_definitions (
  component_id,
  source_path,
  source_content_sha256,
  revision,
  name,
  level,
  parent_id,
  root_unit,
  domain_unit,
  status,
  children_required,
  owned_concern,
  ddd_owner,
  cq_rails,
  created_by
)
values
  (
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT-PRESENTATION',
    'planning_query_store.governance_component_local_definitions',
    '62698105186ea2614dc5496fcdfab6b8072df3b9e0253cd8f52eff768bd51ec1',
    0,
    'Canvas graph viewport presentation',
    'component',
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT',
    'SYS-DVT',
    'SYS-DVT',
    'review',
    false,
    'Owns the React Flow CanvasViewport presentation and graph viewport model implementation.',
    'CanvasGraphViewportPresentation',
    'RenderCanvasContextualGraphSurface;ResolveCanvasContextMenu',
    'codex'
  ),
  (
    'SYS-WEB-CANVAS-NODE-WORKBENCH-FIELD-TESTS',
    'planning_query_store.governance_component_local_definitions',
    '60fc1ff6cd3a1c87c9bad5d71abe9dbfd9a81f9d126dcc71f8262176b4ba65a9',
    0,
    'Canvas node workbench authoring field tests',
    'component',
    'SYS-WEB-CANVAS-NODE-WORKBENCH',
    'SYS-DVT',
    'SYS-DVT',
    'review',
    false,
    'Owns focused DBT and DVT authoring field tests for the Canvas node workbench.',
    'CanvasNodeWorkbenchAuthoringFieldTests',
    'ValidateComponentIntegrity;ReadComponentProfile',
    'codex'
  ),
  (
    'SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY',
    'planning_query_store.governance_component_local_definitions',
    '454ba83155cd5db5919006e1ea8a488a33f317b6f66ea498cfccc4270d97862f',
    0,
    'Canvas node workbench overlay',
    'component',
    'SYS-WEB-CANVAS-NODE-WORKBENCH',
    'SYS-DVT',
    'SYS-DVT',
    'review',
    false,
    'Owns the contextual overlay presentation shell for the Canvas node workbench.',
    'CanvasNodeWorkbenchOverlayPresentation',
    'InspectCanvasNodeProperties;RenderCanvasNodeShell',
    'codex'
  ),
  (
    'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
    'planning_query_store.governance_component_local_definitions',
    'f5e2652829ab377254a4f48ec9e4ff97cc6c70286e57efd553fe1eb60db03bde',
    0,
    'Canvas node workbench panel',
    'component',
    'SYS-WEB-CANVAS-NODE-WORKBENCH',
    'SYS-DVT',
    'SYS-DVT',
    'review',
    false,
    'Owns the node workbench panel and DBT/DVT field editor presentation components.',
    'CanvasNodeWorkbenchPanel',
    'InspectCanvasNodeProperties;RenderCanvasNodeShell',
    'codex'
  ),
  (
    'SYS-WEB-CANVAS-SHELL-MAIN-PANEL-ARCHITECTURE-TEST',
    'planning_query_store.governance_component_local_definitions',
    '7790379578940626777784a67c2548f70762ba5703f418b4387f340f9a702788',
    0,
    'Canvas shell main panel architecture test',
    'component',
    'SYS-WEB-CANVAS-SHELL-MAIN-PANEL',
    'SYS-DVT',
    'SYS-DVT',
    'review',
    false,
    'Owns the architecture guard for CanvasShellMainPanel composition.',
    'CanvasShellMainPanelArchitectureGuard',
    'ValidateComponentIntegrity;ReadComponentProfile',
    'codex'
  ),
  (
    'SYS-WEB-CANVAS-SHELL-TEST-HARNESS',
    'planning_query_store.governance_component_local_definitions',
    '5849ede4f897612a0050580c3ec89d8db4cecefaf987a6921efd20000f7c2fe3',
    0,
    'Canvas shell test harness',
    'component',
    'SYS-WEB-CANVAS-SHELL-MAIN-PANEL',
    'SYS-DVT',
    'SYS-DVT',
    'review',
    false,
    'Owns CanvasShell route harness and focused contextual-surface and legacy-guide tests.',
    'CanvasShellTestHarness',
    'ValidateComponentIntegrity;ReadComponentProfile',
    'codex'
  ),
  (
    'SYS-WEB-CANVAS-VIEWPORT-TEST-HARNESS',
    'planning_query_store.governance_component_local_definitions',
    '813bd250987b7a1143730e50a3e65713ed968adf440e502229953703b3fe069c',
    0,
    'Canvas viewport test harness',
    'component',
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT',
    'SYS-DVT',
    'SYS-DVT',
    'review',
    false,
    'Owns the CanvasViewport test harness and focused context-menu tests that validate viewport interaction contracts.',
    'CanvasViewportTestHarness',
    'ValidateComponentIntegrity;ReadComponentProfile',
    'codex'
  )
on conflict (component_id) do update set
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  name = excluded.name,
  level = excluded.level,
  parent_id = excluded.parent_id,
  root_unit = excluded.root_unit,
  domain_unit = excluded.domain_unit,
  status = excluded.status,
  children_required = excluded.children_required,
  owned_concern = excluded.owned_concern,
  ddd_owner = excluded.ddd_owner,
  cq_rails = excluded.cq_rails;

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values
  ('SYS-WEB-CANVAS-GRAPH-VIEWPORT-PRESENTATION', 'owns', 'apps/web/src/app/views/canvas/CanvasViewport.tsx', 0),
  ('SYS-WEB-CANVAS-GRAPH-VIEWPORT-PRESENTATION', 'owns', 'apps/web/src/app/views/canvas/CanvasViewport.test.tsx', 1),
  ('SYS-WEB-CANVAS-GRAPH-VIEWPORT-PRESENTATION', 'owns', 'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.ts', 2),
  ('SYS-WEB-CANVAS-GRAPH-VIEWPORT-PRESENTATION', 'owns', 'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.tsx', 3),
  ('SYS-WEB-CANVAS-GRAPH-VIEWPORT-PRESENTATION', 'owns', 'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.architecture.test.ts', 4),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-FIELD-TESTS', 'owns', 'apps/web/src/app/views/canvas/DbtAuthoringFields.test.tsx', 0),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-FIELD-TESTS', 'owns', 'apps/web/src/app/views/canvas/DvtAuthoringFields.test.tsx', 1),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY', 'owns', 'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.tsx', 0),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL', 'owns', 'apps/web/src/app/components/InspectorPanel.tsx', 0),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL', 'owns', 'apps/web/src/app/views/canvas/DbtAuthoringFields.tsx', 1),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL', 'owns', 'apps/web/src/app/views/canvas/DvtAuthoringFields.tsx', 2),
  ('SYS-WEB-CANVAS-SHELL-MAIN-PANEL-ARCHITECTURE-TEST', 'owns', 'apps/web/src/app/views/canvas/CanvasShellMainPanel.architecture.test.ts', 0),
  ('SYS-WEB-CANVAS-SHELL-TEST-HARNESS', 'owns', 'apps/web/src/app/views/canvas/CanvasShell.testHarness.tsx', 0),
  ('SYS-WEB-CANVAS-SHELL-TEST-HARNESS', 'owns', 'apps/web/src/app/views/canvas/CanvasShell.contextualSurfaces.test.tsx', 1),
  ('SYS-WEB-CANVAS-SHELL-TEST-HARNESS', 'owns', 'apps/web/src/app/views/canvas/CanvasShell.legacyGuides.test.tsx', 2),
  ('SYS-WEB-CANVAS-VIEWPORT-TEST-HARNESS', 'owns', 'apps/web/src/app/views/canvas/CanvasViewport.testHarness.tsx', 0),
  ('SYS-WEB-CANVAS-VIEWPORT-TEST-HARNESS', 'owns', 'apps/web/src/app/views/canvas/CanvasViewport.contextMenu.test.tsx', 1),
  ('SYS-WEB-CANVAS-VIEWPORT-TEST-HARNESS', 'owns', 'apps/web/src/app/views/canvas/CanvasViewport.edgeContextMenu.test.tsx', 2)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  ('SYS-WEB-CANVAS-GRAPH-VIEWPORT-PRESENTATION', 'responsibility', 'Render and model the graph viewport presentation used by CanvasViewport.', 0),
  ('SYS-WEB-CANVAS-GRAPH-VIEWPORT-PRESENTATION', 'reason_to_change', 'Canvas graph viewport rendering, model, or presentation contract changes.', 0),
  ('SYS-WEB-CANVAS-GRAPH-VIEWPORT-PRESENTATION', 'public_api', 'CanvasViewport', 0),
  ('SYS-WEB-CANVAS-GRAPH-VIEWPORT-PRESENTATION', 'public_api', 'useCanvasViewportGraphModel', 1),
  ('SYS-WEB-CANVAS-GRAPH-VIEWPORT-PRESENTATION', 'invariant', 'Graph viewport rendering and model tests live under the graph viewport presentation leaf.', 0),
  ('SYS-WEB-CANVAS-GRAPH-VIEWPORT-PRESENTATION', 'transition', 'review -> implemented after component-quality shows no files owned by SYS-WEB-CANVAS-GRAPH-VIEWPORT.', 0),
  ('SYS-WEB-CANVAS-GRAPH-VIEWPORT-PRESENTATION', 'consumer', 'Canvas viewport route and contextual graph surface.', 0),
  ('SYS-WEB-CANVAS-GRAPH-VIEWPORT-PRESENTATION', 'governance_ref', 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md', 0),
  ('SYS-WEB-CANVAS-GRAPH-VIEWPORT-PRESENTATION', 'fowler_signal', 'boundary_drift', 0),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-FIELD-TESTS', 'responsibility', 'Validate DBT and DVT field editors used inside the Canvas node workbench.', 0),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-FIELD-TESTS', 'reason_to_change', 'Canvas DBT or DVT authoring field behavior, metadata, or validation changes.', 0),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-FIELD-TESTS', 'public_api', 'DbtAuthoringFieldsHarness', 0),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-FIELD-TESTS', 'public_api', 'DvtAuthoringFieldsHarness', 1),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-FIELD-TESTS', 'invariant', 'DBT and DVT field tests validate node workbench field behavior without becoming the DBT/DVT domain model owner.', 0),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-FIELD-TESTS', 'transition', 'review -> implemented after component-drift shows no SYS-WEB-VIEW-CANVAS ownership for authoring field tests.', 0),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-FIELD-TESTS', 'consumer', 'Canvas node workbench field editor tests.', 0),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-FIELD-TESTS', 'governance_ref', 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md', 0),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-FIELD-TESTS', 'fowler_signal', 'boundary_drift', 0),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY', 'responsibility', 'Render the contextual NodeWorkbench overlay only when the shell placement policy requests the overlay surface.', 0),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY', 'reason_to_change', 'Canvas node workbench overlay placement, presentation, or contextual shell behavior changes.', 0),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY', 'public_api', 'CanvasNodeWorkbenchOverlay', 0),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY', 'public_api', 'CanvasNodeWorkbenchOverlayProps', 1),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY', 'invariant', 'The overlay returns null unless placement is contextual-overlay and the selected graph node is available.', 0),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY', 'transition', 'review -> implemented after component-profile connects overlay source and CanvasShell contextual surface tests.', 0),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY', 'consumer', 'Canvas shell composition and contextual workbench surfaces.', 0),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY', 'governance_ref', 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md', 0),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY', 'fowler_signal', 'boundary_drift', 0),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL', 'responsibility', 'Render node workbench properties and DBT/DVT field editors.', 0),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL', 'reason_to_change', 'Node workbench panel, DBT field, or DVT field presentation changes.', 0),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL', 'public_api', 'InspectorPanel', 0),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL', 'public_api', 'DbtAuthoringFields', 1),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL', 'public_api', 'DvtAuthoringFields', 2),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL', 'invariant', 'Node workbench field presentation is owned by the panel leaf, while focused tests stay in the field-test leaf.', 0),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL', 'transition', 'review -> implemented after component-quality shows no files owned by SYS-WEB-CANVAS-NODE-WORKBENCH.', 0),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL', 'consumer', 'Canvas node workbench and contextual overlay.', 0),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL', 'governance_ref', 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md', 0),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL', 'fowler_signal', 'responsibility_overload', 0),
  ('SYS-WEB-CANVAS-SHELL-MAIN-PANEL-ARCHITECTURE-TEST', 'responsibility', 'Validate the CanvasShellMainPanel composition boundary.', 0),
  ('SYS-WEB-CANVAS-SHELL-MAIN-PANEL-ARCHITECTURE-TEST', 'reason_to_change', 'Shell main panel architecture guard changes.', 0),
  ('SYS-WEB-CANVAS-SHELL-MAIN-PANEL-ARCHITECTURE-TEST', 'public_api', 'CanvasShellMainPanel architecture assertions', 0),
  ('SYS-WEB-CANVAS-SHELL-MAIN-PANEL-ARCHITECTURE-TEST', 'invariant', 'CanvasShellMainPanel architecture tests own boundary assertions and do not own runtime shell presentation.', 0),
  ('SYS-WEB-CANVAS-SHELL-MAIN-PANEL-ARCHITECTURE-TEST', 'transition', 'review -> implemented after component-quality shows no files owned by SYS-WEB-CANVAS-SHELL-MAIN-PANEL.', 0),
  ('SYS-WEB-CANVAS-SHELL-MAIN-PANEL-ARCHITECTURE-TEST', 'consumer', 'Canvas shell main panel component profile.', 0),
  ('SYS-WEB-CANVAS-SHELL-MAIN-PANEL-ARCHITECTURE-TEST', 'governance_ref', 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md', 0),
  ('SYS-WEB-CANVAS-SHELL-MAIN-PANEL-ARCHITECTURE-TEST', 'fowler_signal', 'boundary_drift', 0),
  ('SYS-WEB-CANVAS-SHELL-TEST-HARNESS', 'responsibility', 'Validate CanvasShell contextual surfaces and legacy guide retirement through one harness.', 0),
  ('SYS-WEB-CANVAS-SHELL-TEST-HARNESS', 'reason_to_change', 'Canvas shell harness or contextual surface test behavior changes.', 0),
  ('SYS-WEB-CANVAS-SHELL-TEST-HARNESS', 'public_api', 'createCanvasShellHarness', 0),
  ('SYS-WEB-CANVAS-SHELL-TEST-HARNESS', 'public_api', 'buildCanvasShellProps', 1),
  ('SYS-WEB-CANVAS-SHELL-TEST-HARNESS', 'invariant', 'CanvasShell route tests must reuse one harness instead of defining parallel shell setup semantics.', 0),
  ('SYS-WEB-CANVAS-SHELL-TEST-HARNESS', 'transition', 'review -> implemented after component-drift shows no SYS-WEB-VIEW-CANVAS ownership for shell tests.', 0),
  ('SYS-WEB-CANVAS-SHELL-TEST-HARNESS', 'consumer', 'CanvasShell contextual surface and legacy guide tests.', 0),
  ('SYS-WEB-CANVAS-SHELL-TEST-HARNESS', 'governance_ref', 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md', 0),
  ('SYS-WEB-CANVAS-SHELL-TEST-HARNESS', 'fowler_signal', 'boundary_drift', 0),
  ('SYS-WEB-CANVAS-VIEWPORT-TEST-HARNESS', 'responsibility', 'Validate CanvasViewport context-menu behavior through one harness.', 0),
  ('SYS-WEB-CANVAS-VIEWPORT-TEST-HARNESS', 'reason_to_change', 'Viewport harness or context-menu test behavior changes.', 0),
  ('SYS-WEB-CANVAS-VIEWPORT-TEST-HARNESS', 'public_api', 'createCanvasViewportHarness', 0),
  ('SYS-WEB-CANVAS-VIEWPORT-TEST-HARNESS', 'public_api', 'buildCanvasViewportProps', 1),
  ('SYS-WEB-CANVAS-VIEWPORT-TEST-HARNESS', 'invariant', 'CanvasViewport context-menu tests must reuse one viewport harness instead of duplicating React Flow mocks.', 0),
  ('SYS-WEB-CANVAS-VIEWPORT-TEST-HARNESS', 'transition', 'review -> implemented after component-drift shows no SYS-WEB-VIEW-CANVAS ownership for viewport tests.', 0),
  ('SYS-WEB-CANVAS-VIEWPORT-TEST-HARNESS', 'consumer', 'CanvasViewport context-menu and edge-context-menu tests.', 0),
  ('SYS-WEB-CANVAS-VIEWPORT-TEST-HARNESS', 'governance_ref', 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md', 0),
  ('SYS-WEB-CANVAS-VIEWPORT-TEST-HARNESS', 'fowler_signal', 'boundary_drift', 0)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

-- Fresh databases do not have the imported Canvas parent architecture rows that
-- existed in the live Planning DB when this slice was authored. Persist the real
-- parent chain before inserting leaves so FK checks prove the hierarchy.
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
values
  (
    'SYS-WEB-ROOT',
    'Web application root',
    'package',
    'ui',
    'Frontend / Web',
    'apps/web/src',
    '@dvt/web source root, route shell, and web package entrypoint',
    'none',
    'medium',
    'implemented',
    null
  ),
  (
    'SYS-WEB-VIEW-CANVAS',
    'Web canvas view',
    'ui-view',
    'ui',
    'Frontend / Canvas',
    'apps/web/src/app/views/Canvas.tsx',
    'Web canvas view source boundary in apps/web',
    'none',
    'medium',
    'implemented',
    'SYS-WEB-ROOT'
  ),
  (
    'SYS-WEB-CANVAS-CONTEXTUAL-WORKBENCH',
    'Canvas contextual workbench',
    'ui-view',
    'ui',
    'Frontend / Canvas',
    'apps/web/src/app/views/canvas/canvasWorkbenchStateModel.ts',
    'Canvas contextual workbench source boundary in apps/web',
    'none',
    'medium',
    'implemented',
    'SYS-WEB-VIEW-CANVAS'
  ),
  (
    'SYS-WEB-CANVAS-GRAPH-SURFACE',
    'Canvas graph surface',
    'ui-view',
    'ui',
    'Frontend / Canvas',
    'apps/web/src/app/views/canvas/CanvasCenterSurface.tsx',
    'Canvas graph surface source boundary in apps/web',
    'none',
    'medium',
    'implemented',
    'SYS-WEB-CANVAS-CONTEXTUAL-WORKBENCH'
  ),
  (
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT',
    'Web Canvas Graph Viewport',
    'ui-view',
    'ui',
    'Frontend / Canvas',
    'apps/web/src/app/views/canvas/CanvasViewport.tsx',
    'Web Canvas Graph Viewport source boundary in apps/web',
    'none',
    'medium',
    'implemented',
    'SYS-WEB-CANVAS-GRAPH-SURFACE'
  ),
  (
    'SYS-WEB-CANVAS-NODE-WORKBENCH',
    'Node workbench',
    'ui-view',
    'ui',
    'Frontend / Canvas',
    'apps/web/src/app/views/canvas/CanvasInspectorPanel.tsx',
    'Node workbench source boundary in apps/web',
    'none',
    'medium',
    'implemented',
    'SYS-WEB-CANVAS-CONTEXTUAL-WORKBENCH'
  ),
  (
    'SYS-WEB-CANVAS-SHELL-MAIN-PANEL',
    'Canvas shell main panel',
    'ui-view',
    'ui',
    'Frontend / Canvas',
    'apps/web/src/app/views/canvas/CanvasShell.tsx',
    'Canvas shell main panel source boundary in apps/web',
    'none',
    'medium',
    'implemented',
    'SYS-WEB-VIEW-CANVAS'
  )
on conflict (component_id) do update set
  name = excluded.name,
  kind = excluded.kind,
  layer = excluded.layer,
  owner = excluded.owner,
  repo_path = excluded.repo_path,
  public_contract = excluded.public_contract,
  runtime = excluded.runtime,
  criticality = excluded.criticality,
  status = excluded.status,
  parent_component_id = excluded.parent_component_id,
  updated_at = now();

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
values
  (
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT-PRESENTATION',
    'Canvas graph viewport presentation',
    'ui-view',
    'ui',
    'Frontend / Canvas',
    'apps/web/src/app/views/canvas/CanvasViewport.tsx',
    'CanvasViewport and useCanvasViewportGraphModel presentation contract',
    'browser',
    'medium',
    'review',
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT'
  ),
  (
    'SYS-WEB-CANVAS-NODE-WORKBENCH-FIELD-TESTS',
    'Canvas node workbench authoring field tests',
    'ui-view',
    'ui',
    'Frontend / Canvas',
    'apps/web/src/app/views/canvas/DbtAuthoringFields.test.tsx',
    'DBT and DVT authoring field behavior tests for the Canvas node workbench',
    'browser',
    'medium',
    'review',
    'SYS-WEB-CANVAS-NODE-WORKBENCH'
  ),
  (
    'SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY',
    'Canvas node workbench overlay',
    'ui-view',
    'ui',
    'Frontend / Canvas',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.tsx',
    'CanvasNodeWorkbenchOverlay contextual presentation shell',
    'browser',
    'medium',
    'review',
    'SYS-WEB-CANVAS-NODE-WORKBENCH'
  ),
  (
    'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
    'Canvas node workbench panel',
    'ui-view',
    'ui',
    'Frontend / Canvas',
    'apps/web/src/app/components/InspectorPanel.tsx',
    'InspectorPanel, DbtAuthoringFields, and DvtAuthoringFields presentation contract',
    'browser',
    'medium',
    'review',
    'SYS-WEB-CANVAS-NODE-WORKBENCH'
  ),
  (
    'SYS-WEB-CANVAS-SHELL-MAIN-PANEL-ARCHITECTURE-TEST',
    'Canvas shell main panel architecture test',
    'ui-view',
    'ui',
    'Frontend / Canvas',
    'apps/web/src/app/views/canvas/CanvasShellMainPanel.architecture.test.ts',
    'CanvasShellMainPanel architecture boundary guard',
    'node',
    'medium',
    'review',
    'SYS-WEB-CANVAS-SHELL-MAIN-PANEL'
  ),
  (
    'SYS-WEB-CANVAS-SHELL-TEST-HARNESS',
    'Canvas shell test harness',
    'ui-view',
    'ui',
    'Frontend / Canvas',
    'apps/web/src/app/views/canvas/CanvasShell.testHarness.tsx',
    'CanvasShell route harness and contextual surface test contracts',
    'browser',
    'medium',
    'review',
    'SYS-WEB-CANVAS-SHELL-MAIN-PANEL'
  ),
  (
    'SYS-WEB-CANVAS-VIEWPORT-TEST-HARNESS',
    'Canvas viewport test harness',
    'ui-view',
    'ui',
    'Frontend / Canvas',
    'apps/web/src/app/views/canvas/CanvasViewport.testHarness.tsx',
    'createCanvasViewportHarness and context-menu viewport test contracts',
    'browser',
    'medium',
    'review',
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT'
  )
on conflict (component_id) do update set
  name = excluded.name,
  kind = excluded.kind,
  layer = excluded.layer,
  owner = excluded.owner,
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
  (
    'RESP-SYS-WEB-CANVAS-GRAPH-VIEWPORT-PRESENTATION',
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT-PRESENTATION',
    'Render and model the Canvas graph viewport presentation.',
    'Graph viewport rendering, model, or test contract changes.',
    'CanvasGraphViewportPresentation',
    'proposed'
  ),
  (
    'RESP-SYS-WEB-CANVAS-NODE-WORKBENCH-FIELD-TESTS',
    'SYS-WEB-CANVAS-NODE-WORKBENCH-FIELD-TESTS',
    'Validate DBT and DVT authoring field editors inside the node workbench.',
    'Authoring field behavior or validation changes.',
    'CanvasNodeWorkbenchAuthoringFieldTests',
    'proposed'
  ),
  (
    'RESP-SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY',
    'SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY',
    'Render the contextual node workbench overlay according to placement and selected-node policy.',
    'Node workbench overlay placement or presentation changes.',
    'CanvasNodeWorkbenchOverlayPresentation',
    'proposed'
  ),
  (
    'RESP-SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
    'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
    'Render node properties and DBT/DVT authoring field editors.',
    'Node workbench panel or field presentation changes.',
    'CanvasNodeWorkbenchPanel',
    'proposed'
  ),
  (
    'RESP-SYS-WEB-CANVAS-SHELL-MAIN-PANEL-ARCHITECTURE-TEST',
    'SYS-WEB-CANVAS-SHELL-MAIN-PANEL-ARCHITECTURE-TEST',
    'Validate the CanvasShellMainPanel composition boundary.',
    'Shell main panel architecture guard changes.',
    'CanvasShellMainPanelArchitectureGuard',
    'proposed'
  ),
  (
    'RESP-SYS-WEB-CANVAS-SHELL-TEST-HARNESS',
    'SYS-WEB-CANVAS-SHELL-TEST-HARNESS',
    'Validate CanvasShell contextual surfaces and legacy guide retirement through one harness.',
    'Canvas shell harness or contextual surface test behavior changes.',
    'CanvasShellTestHarness',
    'proposed'
  ),
  (
    'RESP-SYS-WEB-CANVAS-VIEWPORT-TEST-HARNESS',
    'SYS-WEB-CANVAS-VIEWPORT-TEST-HARNESS',
    'Validate CanvasViewport context-menu behavior through one harness.',
    'Viewport harness or context-menu test behavior changes.',
    'CanvasViewportTestHarness',
    'proposed'
  )
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

update architecture.component_responsibility
set
  responsibility = 'Historical overlay responsibility retained for audit after the canonical SYS-prefixed responsibility took ownership.',
  reason_to_change = 'Superseded by RESP-SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY after CanvasNodeWorkbenchOverlay.tsx became a tracked component file.',
  ddd_owner = 'CanvasNodeWorkbenchOverlayPresentation',
  status = 'drift'
where responsibility_id = 'RESP-WEB-CANVAS-NODE-WORKBENCH-OVERLAY';

insert into architecture.component_relation (
  relation_id,
  source_component_id,
  target_component_id,
  relation_type,
  direction,
  sync_async,
  failure_mode,
  authorization_scope,
  source_refs,
  status
)
values
  (
    'REL-WEB-CANVAS-GRAPH-VIEWPORT-CONTAINS-PRESENTATION',
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT',
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT-PRESENTATION',
    'contains',
    'outbound',
    'sync',
    'not_applicable',
    'web_canvas_component_ownership',
    jsonb_build_array('docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md'),
    'implemented'
  ),
  (
    'REL-WEB-CANVAS-GRAPH-VIEWPORT-CONTAINS-VIEWPORT-TEST-HARNESS',
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT',
    'SYS-WEB-CANVAS-VIEWPORT-TEST-HARNESS',
    'contains',
    'outbound',
    'sync',
    'not_applicable',
    'web_canvas_component_ownership',
    jsonb_build_array('docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md'),
    'implemented'
  ),
  (
    'REL-WEB-CANVAS-NODE-WORKBENCH-CONTAINS-FIELD-TESTS',
    'SYS-WEB-CANVAS-NODE-WORKBENCH',
    'SYS-WEB-CANVAS-NODE-WORKBENCH-FIELD-TESTS',
    'contains',
    'outbound',
    'sync',
    'not_applicable',
    'web_canvas_component_ownership',
    jsonb_build_array('docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md'),
    'implemented'
  ),
  (
    'REL-WEB-CANVAS-NODE-WORKBENCH-CONTAINS-OVERLAY',
    'SYS-WEB-CANVAS-NODE-WORKBENCH',
    'SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY',
    'contains',
    'outbound',
    'sync',
    'not_applicable',
    'web_canvas_component_ownership',
    jsonb_build_array('docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md'),
    'implemented'
  ),
  (
    'REL-WEB-CANVAS-NODE-WORKBENCH-CONTAINS-PANEL',
    'SYS-WEB-CANVAS-NODE-WORKBENCH',
    'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
    'contains',
    'outbound',
    'sync',
    'not_applicable',
    'web_canvas_component_ownership',
    jsonb_build_array('docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md'),
    'implemented'
  ),
  (
    'REL-WEB-CANVAS-SHELL-MAIN-PANEL-CONTAINS-ARCHITECTURE-TEST',
    'SYS-WEB-CANVAS-SHELL-MAIN-PANEL',
    'SYS-WEB-CANVAS-SHELL-MAIN-PANEL-ARCHITECTURE-TEST',
    'contains',
    'outbound',
    'sync',
    'not_applicable',
    'web_canvas_component_ownership',
    jsonb_build_array('docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md'),
    'implemented'
  ),
  (
    'REL-WEB-CANVAS-SHELL-MAIN-PANEL-CONTAINS-SHELL-TEST-HARNESS',
    'SYS-WEB-CANVAS-SHELL-MAIN-PANEL',
    'SYS-WEB-CANVAS-SHELL-TEST-HARNESS',
    'contains',
    'outbound',
    'sync',
    'not_applicable',
    'web_canvas_component_ownership',
    jsonb_build_array('docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md'),
    'implemented'
  )
on conflict (relation_id) do update set
  source_component_id = excluded.source_component_id,
  target_component_id = excluded.target_component_id,
  relation_type = excluded.relation_type,
  direction = excluded.direction,
  sync_async = excluded.sync_async,
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
  (
    'TEST-WEB-CANVAS-GRAPH-VIEWPORT-PRESENTATION',
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT-PRESENTATION',
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.tsx',
    'unit',
    'behavior',
    true,
    'pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasViewport.test.tsx src/app/views/canvas/useCanvasViewportGraphModel.test.tsx src/app/views/canvas/useCanvasViewportGraphModel.architecture.test.ts'
  ),
  (
    'TEST-WEB-CANVAS-NODE-WORKBENCH-FIELD-TESTS',
    'SYS-WEB-CANVAS-NODE-WORKBENCH-FIELD-TESTS',
    'apps/web/src/app/views/canvas/DbtAuthoringFields.test.tsx',
    'unit',
    'behavior',
    true,
    'pnpm --filter @dvt/web test -- src/app/views/canvas/DbtAuthoringFields.test.tsx src/app/views/canvas/DvtAuthoringFields.test.tsx'
  ),
  (
    'TEST-WEB-CANVAS-NODE-WORKBENCH-OVERLAY',
    'SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY',
    'apps/web/src/app/views/canvas/CanvasShell.contextualSurfaces.test.tsx',
    'integration',
    'flow',
    true,
    'pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasShell.contextualSurfaces.test.tsx'
  ),
  (
    'TEST-WEB-CANVAS-NODE-WORKBENCH-PANEL',
    'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
    'apps/web/src/app/views/canvas/DbtAuthoringFields.test.tsx',
    'unit',
    'behavior',
    true,
    'pnpm --filter @dvt/web test -- src/app/views/canvas/DbtAuthoringFields.test.tsx src/app/views/canvas/DvtAuthoringFields.test.tsx'
  ),
  (
    'TEST-WEB-CANVAS-SHELL-MAIN-PANEL-ARCHITECTURE',
    'SYS-WEB-CANVAS-SHELL-MAIN-PANEL-ARCHITECTURE-TEST',
    'apps/web/src/app/views/canvas/CanvasShellMainPanel.architecture.test.ts',
    'architecture',
    'boundary',
    true,
    'pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasShellMainPanel.architecture.test.ts'
  ),
  (
    'TEST-WEB-CANVAS-SHELL-TEST-HARNESS',
    'SYS-WEB-CANVAS-SHELL-TEST-HARNESS',
    'apps/web/src/app/views/canvas/CanvasShell.contextualSurfaces.test.tsx',
    'integration',
    'flow',
    true,
    'pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasShell.contextualSurfaces.test.tsx src/app/views/canvas/CanvasShell.legacyGuides.test.tsx'
  ),
  (
    'TEST-WEB-CANVAS-VIEWPORT-TEST-HARNESS',
    'SYS-WEB-CANVAS-VIEWPORT-TEST-HARNESS',
    'apps/web/src/app/views/canvas/CanvasViewport.edgeContextMenu.test.tsx',
    'unit',
    'behavior',
    true,
    'pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasViewport.contextMenu.test.tsx src/app/views/canvas/CanvasViewport.edgeContextMenu.test.tsx'
  )
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

insert into architecture.design_scope (
  design_id,
  subject_kind,
  subject_id,
  scope_kind,
  required
)
values
  ('PLANNING-DB-WEB-CANVAS-LEAF-COMPONENTS-20260617', 'component', 'SYS-WEB-CANVAS-GRAPH-VIEWPORT', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-LEAF-COMPONENTS-20260617', 'component', 'SYS-WEB-CANVAS-NODE-WORKBENCH', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-LEAF-COMPONENTS-20260617', 'component', 'SYS-WEB-CANVAS-NODE-WORKBENCH-FIELD-TESTS', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-LEAF-COMPONENTS-20260617', 'component', 'SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-LEAF-COMPONENTS-20260617', 'component', 'SYS-WEB-CANVAS-SHELL-MAIN-PANEL', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-LEAF-COMPONENTS-20260617', 'component', 'SYS-WEB-CANVAS-SHELL-TEST-HARNESS', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-LEAF-COMPONENTS-20260617', 'component', 'SYS-WEB-CANVAS-VIEWPORT-TEST-HARNESS', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-LEAF-CLOSURE-20260617', 'component', 'SYS-WEB-CANVAS-GRAPH-VIEWPORT', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-LEAF-CLOSURE-20260617', 'component', 'SYS-WEB-CANVAS-GRAPH-VIEWPORT-PRESENTATION', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-LEAF-CLOSURE-20260617', 'component', 'SYS-WEB-CANVAS-NODE-WORKBENCH', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-LEAF-CLOSURE-20260617', 'component', 'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-LEAF-CLOSURE-20260617', 'component', 'SYS-WEB-CANVAS-SHELL-MAIN-PANEL', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-LEAF-CLOSURE-20260617', 'component', 'SYS-WEB-CANVAS-SHELL-MAIN-PANEL-ARCHITECTURE-TEST', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-LEAF-CLOSURE-20260617', 'relation', 'REL-WEB-CANVAS-GRAPH-VIEWPORT-CONTAINS-PRESENTATION', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-LEAF-CLOSURE-20260617', 'relation', 'REL-WEB-CANVAS-NODE-WORKBENCH-CONTAINS-PANEL', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-LEAF-CLOSURE-20260617', 'relation', 'REL-WEB-CANVAS-SHELL-MAIN-PANEL-CONTAINS-ARCHITECTURE-TEST', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-LEAF-CLOSURE-20260617', 'test', 'TEST-WEB-CANVAS-GRAPH-VIEWPORT-PRESENTATION', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-LEAF-CLOSURE-20260617', 'test', 'TEST-WEB-CANVAS-NODE-WORKBENCH-PANEL', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-LEAF-CLOSURE-20260617', 'test', 'TEST-WEB-CANVAS-SHELL-MAIN-PANEL-ARCHITECTURE', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-LEAF-RELATIONS-20260617', 'component', 'SYS-WEB-CANVAS-GRAPH-VIEWPORT', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-LEAF-RELATIONS-20260617', 'component', 'SYS-WEB-CANVAS-NODE-WORKBENCH', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-LEAF-RELATIONS-20260617', 'component', 'SYS-WEB-CANVAS-NODE-WORKBENCH-FIELD-TESTS', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-LEAF-RELATIONS-20260617', 'component', 'SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY', 'may_update', true),
  ('PLANNING-DB-WEB-CANVAS-LEAF-RELATIONS-20260617', 'component', 'SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-LEAF-RELATIONS-20260617', 'component', 'SYS-WEB-CANVAS-SHELL-MAIN-PANEL', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-LEAF-RELATIONS-20260617', 'component', 'SYS-WEB-CANVAS-SHELL-TEST-HARNESS', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-LEAF-RELATIONS-20260617', 'component', 'SYS-WEB-CANVAS-VIEWPORT-TEST-HARNESS', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-LEAF-RELATIONS-20260617', 'relation', 'REL-WEB-CANVAS-GRAPH-VIEWPORT-CONTAINS-VIEWPORT-TEST-HARNESS', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-LEAF-RELATIONS-20260617', 'relation', 'REL-WEB-CANVAS-NODE-WORKBENCH-CONTAINS-FIELD-TESTS', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-LEAF-RELATIONS-20260617', 'relation', 'REL-WEB-CANVAS-NODE-WORKBENCH-CONTAINS-OVERLAY', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-LEAF-RELATIONS-20260617', 'relation', 'REL-WEB-CANVAS-SHELL-MAIN-PANEL-CONTAINS-SHELL-TEST-HARNESS', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-LEAF-RELATIONS-20260617', 'test', 'TEST-WEB-CANVAS-NODE-WORKBENCH-FIELD-TESTS', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-LEAF-RELATIONS-20260617', 'test', 'TEST-WEB-CANVAS-NODE-WORKBENCH-OVERLAY', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-LEAF-RELATIONS-20260617', 'test', 'TEST-WEB-CANVAS-SHELL-TEST-HARNESS', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-LEAF-RELATIONS-20260617', 'test', 'TEST-WEB-CANVAS-VIEWPORT-TEST-HARNESS', 'may_create', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;
