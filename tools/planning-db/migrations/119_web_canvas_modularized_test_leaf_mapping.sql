-- Persist the governed Web Canvas test leaf mapping created through
-- planning:db:operate. Old or nonfunctional surfaces stay eligible for
-- deprecation; these rows map functional files and tests to concrete
-- components without creating a parallel inventory.

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
    'PLANNING-DB-WEB-APP-COMPONENT-TEST-LEAFS-20260617',
    'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
    'Web app component test leaf ownership',
    'Architecture / Planning DB / Frontend',
    'review',
    'SYS-WEB-APP-COMPONENTS still directly owned SourceImportWizard and NodePropertiesTabs test files after runtime components had been split. This design records test and harness leaf ownership under the existing functional components instead of creating duplicate runtime responsibilities.',
    'responsibility_overload',
    'CreateArchitectureDesign;CreateGovernanceComponent;RecordArchitectureComponent;RecordArchitectureRelation;RecordArchitectureTestEvidence;CheckPlanningDbComponentIntegrity',
    now()
  ),
  (
    'PLANNING-DB-WEB-APP-COMPONENT-TEST-LEAF-RELATIONS-20260617',
    'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
    'Web app component test leaf relation evidence',
    'Architecture / Planning DB / Frontend',
    'review',
    'The Web app component test leaf ownership design created the leaf components. This companion design records their contains relations and required test evidence through DB-first rails.',
    'evolutionary_architecture',
    'RecordArchitectureRelation;RecordArchitectureTestEvidence;CheckPlanningDbComponentIntegrity',
    now()
  ),
  (
    'PLANNING-DB-WEB-APP-COMPONENT-TEST-LEAF-CONTAINS-20260617',
    'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
    'Web app component test leaf contains relations',
    'Architecture / Planning DB / Frontend',
    'review',
    'Record contains relations between existing functional components and their new test leaf components with explicit endpoint scope.',
    'evolutionary_architecture',
    'RecordArchitectureRelation;CheckPlanningDbComponentIntegrity',
    now()
  ),
  (
    'PLANNING-DB-WEB-APP-COMPONENT-TEST-LEAF-RELATION-PROMOTION-20260617',
    'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
    'Web app component test leaf relation promotion',
    'Architecture / Planning DB / Frontend',
    'review',
    'The NodePropertiesTabs and SourceImportWizard test leaf contains relations point to real files and pass component quality, so the relations are promoted from proposed to implemented.',
    'evolutionary_architecture',
    'RecordArchitectureRelation;ReadComponentProfile;CheckPlanningDbComponentIntegrity',
    now()
  ),
  (
    'PLANNING-DB-WEB-CANVAS-MODULARIZED-TEST-LEAFS-20260617',
    'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
    'Web Canvas modularized test leaf ownership mapping',
    'Architecture / Planning DB / Frontend',
    'review',
    'Recent Canvas modularization added functional tests and split inspector tabs into runtime plus tests. This design records leaf ownership for those real files, keeps old or nonfunctional surfaces eligible for deprecation, and avoids runtime/test duplicate components.',
    'boundary_drift',
    'CreateGovernanceComponent;RecordArchitectureComponent;RecordArchitectureRelation;RecordArchitectureTestEvidence;CheckPlanningDbComponentIntegrity',
    now()
  ),
  (
    'PLANNING-DB-WEB-CANVAS-MODULARIZED-TEST-EVIDENCE-20260617',
    'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
    'Web Canvas modularized test evidence mapping',
    'Architecture / Planning DB / Frontend',
    'review',
    'The modularized Canvas leaves must be queryable with concrete test evidence. This design attaches executable tests to the newly created ownership leaves without changing their component authority.',
    'hidden_authority',
    'RecordArchitectureTestEvidence;ReadComponentProfile;CheckPlanningDbComponentIntegrity',
    now()
  ),
  (
    'PLANNING-DB-WEB-CANVAS-MODULARIZED-TEST-EVIDENCE-B-20260617',
    'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
    'Web Canvas modularized test evidence leaf collision closure',
    'Architecture / Planning DB / Frontend',
    'review',
    'Some historical test identifiers are already reserved outside the architecture-evidence read model. This design records collision-free leaf-specific test evidence for the remaining Canvas modularization components.',
    'hidden_authority',
    'RecordArchitectureTestEvidence;ReadComponentProfile;CheckPlanningDbComponentIntegrity',
    now()
  ),
  (
    'PLANNING-DB-WEB-CANVAS-TEST-EVIDENCE-COMMAND-CANONICALIZATION-20260617',
    'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
    'Web Canvas test evidence command canonicalization',
    'Architecture / Planning DB / Frontend',
    'review',
    'Component profiles exposed test evidence commands that used @dvt/web test, which runs unrelated suites before path filtering. This design authorizes updating the existing TEST-* rows to the focused presentation test rail that was actually validated.',
    'hidden_authority',
    'RecordArchitectureTestEvidence;ReadComponentProfile;CheckPlanningDbComponentIntegrity',
    now()
  ),
  (
    'PLANNING-DB-WEB-CANVAS-TABS-PARENT-CANONICALIZATION-20260617',
    'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
    'Web Canvas inspector tabs parent canonicalization',
    'Architecture / Planning DB / Frontend',
    'review',
    'After creating a NodePropertiesTabs presenter leaf, the parent inspector tabs component must stop sharing the same architecture repo_path. The parent is now the composite feature area and the presenter owns the concrete TSX file.',
    'responsibility_overload',
    'RecordArchitectureComponent;ReadComponentProfile;CheckPlanningDbComponentIntegrity',
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
  ('PLANNING-DB-WEB-APP-COMPONENT-TEST-LEAFS-20260617', 'component', 'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-TESTS', 'may_create', true),
  ('PLANNING-DB-WEB-APP-COMPONENT-TEST-LEAFS-20260617', 'component', 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-TEST-HARNESS', 'may_create', true),
  ('PLANNING-DB-WEB-APP-COMPONENT-TEST-LEAFS-20260617', 'path', 'apps/web/src/app/components/inspector/NodePropertiesTabs.test.tsx', 'may_update', true),
  ('PLANNING-DB-WEB-APP-COMPONENT-TEST-LEAFS-20260617', 'path', 'apps/web/src/app/components/SourceImportWizard.testHarness.tsx', 'may_update', true),
  ('PLANNING-DB-WEB-APP-COMPONENT-TEST-LEAFS-20260617', 'path', 'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx', 'may_update', true),
  ('PLANNING-DB-WEB-APP-COMPONENT-TEST-LEAFS-20260617', 'path', 'apps/web/src/app/components/SourceImportWizard.pluginOptions.test.tsx', 'may_update', true),
  ('PLANNING-DB-WEB-APP-COMPONENT-TEST-LEAF-CONTAINS-20260617', 'component', 'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS', 'may_reference', true),
  ('PLANNING-DB-WEB-APP-COMPONENT-TEST-LEAF-CONTAINS-20260617', 'component', 'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-TESTS', 'may_reference', true),
  ('PLANNING-DB-WEB-APP-COMPONENT-TEST-LEAF-CONTAINS-20260617', 'component', 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD', 'may_reference', true),
  ('PLANNING-DB-WEB-APP-COMPONENT-TEST-LEAF-CONTAINS-20260617', 'component', 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-TEST-HARNESS', 'may_reference', true),
  ('PLANNING-DB-WEB-APP-COMPONENT-TEST-LEAF-CONTAINS-20260617', 'relation', 'REL-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-CONTAINS-TESTS', 'may_create', true),
  ('PLANNING-DB-WEB-APP-COMPONENT-TEST-LEAF-CONTAINS-20260617', 'relation', 'REL-WEB-CANVAS-SOURCE-IMPORT-WIZARD-CONTAINS-TEST-HARNESS', 'may_create', true),
  ('PLANNING-DB-WEB-APP-COMPONENT-TEST-LEAF-RELATIONS-20260617', 'component', 'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-TESTS', 'may_reference', true),
  ('PLANNING-DB-WEB-APP-COMPONENT-TEST-LEAF-RELATIONS-20260617', 'component', 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-TEST-HARNESS', 'may_reference', true),
  ('PLANNING-DB-WEB-APP-COMPONENT-TEST-LEAF-RELATIONS-20260617', 'relation', 'REL-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-CONTAINS-TESTS', 'may_create', true),
  ('PLANNING-DB-WEB-APP-COMPONENT-TEST-LEAF-RELATIONS-20260617', 'relation', 'REL-WEB-CANVAS-SOURCE-IMPORT-WIZARD-CONTAINS-TEST-HARNESS', 'may_create', true),
  ('PLANNING-DB-WEB-APP-COMPONENT-TEST-LEAF-RELATIONS-20260617', 'test', 'TEST-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-FOCUSED', 'may_create', true),
  ('PLANNING-DB-WEB-APP-COMPONENT-TEST-LEAF-RELATIONS-20260617', 'test', 'TEST-WEB-CANVAS-SOURCE-IMPORT-WIZARD-TEST-HARNESS', 'may_create', true),
  ('PLANNING-DB-WEB-APP-COMPONENT-TEST-LEAF-RELATION-PROMOTION-20260617', 'component', 'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS', 'may_reference', true),
  ('PLANNING-DB-WEB-APP-COMPONENT-TEST-LEAF-RELATION-PROMOTION-20260617', 'component', 'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-TESTS', 'may_reference', true),
  ('PLANNING-DB-WEB-APP-COMPONENT-TEST-LEAF-RELATION-PROMOTION-20260617', 'component', 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD', 'may_reference', true),
  ('PLANNING-DB-WEB-APP-COMPONENT-TEST-LEAF-RELATION-PROMOTION-20260617', 'component', 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-TEST-HARNESS', 'may_reference', true),
  ('PLANNING-DB-WEB-APP-COMPONENT-TEST-LEAF-RELATION-PROMOTION-20260617', 'relation', 'REL-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-CONTAINS-TESTS', 'may_update', true),
  ('PLANNING-DB-WEB-APP-COMPONENT-TEST-LEAF-RELATION-PROMOTION-20260617', 'relation', 'REL-WEB-CANVAS-SOURCE-IMPORT-WIZARD-CONTAINS-TEST-HARNESS', 'may_update', true),
  ('PLANNING-DB-WEB-CANVAS-MODULARIZED-TEST-LEAFS-20260617', 'component', 'SYS-WEB-CANVAS-CANVAS-CONTEXT-MENU', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-MODULARIZED-TEST-LEAFS-20260617', 'component', 'SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER-TESTS', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-MODULARIZED-TEST-LEAFS-20260617', 'component', 'SYS-WEB-CANVAS-GRAPH-SURFACE', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-MODULARIZED-TEST-LEAFS-20260617', 'component', 'SYS-WEB-CANVAS-GRAPH-STATUS-OVERLAY-TESTS', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-MODULARIZED-TEST-LEAFS-20260617', 'component', 'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-MODULARIZED-TEST-LEAFS-20260617', 'component', 'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-PRESENTER', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-MODULARIZED-TEST-LEAFS-20260617', 'component', 'SYS-WEB-CANVAS-NODE-WORKBENCH', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-MODULARIZED-TEST-LEAFS-20260617', 'component', 'SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY-TESTS', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-MODULARIZED-TEST-LEAFS-20260617', 'component', 'SYS-WEB-CANVAS-SHELL-CONTEXTUAL-DIALOG-TESTS', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-MODULARIZED-TEST-LEAFS-20260617', 'component', 'SYS-WEB-CANVAS-SHELL-MAIN-PANEL', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-MODULARIZED-TEST-LEAFS-20260617', 'component', 'SYS-WEB-CANVAS-SHELL-SOURCE-IMPORT-TESTS', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-MODULARIZED-TEST-LEAFS-20260617', 'path', 'apps/web/src/app/components/inspector/NodePropertiesTabs.tsx', 'may_update', true),
  ('PLANNING-DB-WEB-CANVAS-MODULARIZED-TEST-LEAFS-20260617', 'path', 'apps/web/src/app/views/canvas/CanvasGraphStatusOverlay.test.tsx', 'may_update', true),
  ('PLANNING-DB-WEB-CANVAS-MODULARIZED-TEST-LEAFS-20260617', 'path', 'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx', 'may_update', true),
  ('PLANNING-DB-WEB-CANVAS-MODULARIZED-TEST-LEAFS-20260617', 'path', 'apps/web/src/app/views/canvas/CanvasShell.contextualDialogs.test.tsx', 'may_update', true),
  ('PLANNING-DB-WEB-CANVAS-MODULARIZED-TEST-LEAFS-20260617', 'path', 'apps/web/src/app/views/canvas/CanvasShell.sourceImportAvailability.test.tsx', 'may_update', true),
  ('PLANNING-DB-WEB-CANVAS-MODULARIZED-TEST-LEAFS-20260617', 'path', 'apps/web/src/app/views/canvas/CanvasShell.sourceImportLifecycle.test.tsx', 'may_update', true),
  ('PLANNING-DB-WEB-CANVAS-MODULARIZED-TEST-LEAFS-20260617', 'path', 'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.test.tsx', 'may_update', true),
  ('PLANNING-DB-WEB-CANVAS-MODULARIZED-TEST-LEAFS-20260617', 'relation', 'REL-WEB-CANVAS-CANVAS-CONTEXT-MENU-CONTAINS-PRESENTER-TESTS', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-MODULARIZED-TEST-LEAFS-20260617', 'relation', 'REL-WEB-CANVAS-GRAPH-SURFACE-CONTAINS-STATUS-OVERLAY-TESTS', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-MODULARIZED-TEST-LEAFS-20260617', 'relation', 'REL-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-CONTAINS-PRESENTER', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-MODULARIZED-TEST-LEAFS-20260617', 'relation', 'REL-WEB-CANVAS-NODE-WORKBENCH-CONTAINS-OVERLAY-TESTS', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-MODULARIZED-TEST-LEAFS-20260617', 'relation', 'REL-WEB-CANVAS-SHELL-MAIN-PANEL-CONTAINS-CONTEXTUAL-DIALOG-TESTS', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-MODULARIZED-TEST-LEAFS-20260617', 'relation', 'REL-WEB-CANVAS-SHELL-MAIN-PANEL-CONTAINS-SOURCE-IMPORT-TESTS', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-MODULARIZED-TEST-EVIDENCE-20260617', 'component', 'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-PRESENTER', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-MODULARIZED-TEST-EVIDENCE-20260617', 'component', 'SYS-WEB-CANVAS-SHELL-CONTEXTUAL-DIALOG-TESTS', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-MODULARIZED-TEST-EVIDENCE-20260617', 'component', 'SYS-WEB-CANVAS-SHELL-SOURCE-IMPORT-TESTS', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-MODULARIZED-TEST-EVIDENCE-20260617', 'test', 'TEST-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-PRESENTER', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-MODULARIZED-TEST-EVIDENCE-20260617', 'test', 'TEST-WEB-CANVAS-SHELL-CONTEXTUAL-DIALOGS', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-MODULARIZED-TEST-EVIDENCE-20260617', 'test', 'TEST-WEB-CANVAS-SHELL-SOURCE-IMPORT', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-MODULARIZED-TEST-EVIDENCE-B-20260617', 'component', 'SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER-TESTS', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-MODULARIZED-TEST-EVIDENCE-B-20260617', 'component', 'SYS-WEB-CANVAS-GRAPH-STATUS-OVERLAY-TESTS', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-MODULARIZED-TEST-EVIDENCE-B-20260617', 'component', 'SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY-TESTS', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-MODULARIZED-TEST-EVIDENCE-B-20260617', 'test', 'TEST-WEB-CANVAS-CONTEXT-MENU-PRESENTER-TESTS-LEAF', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-MODULARIZED-TEST-EVIDENCE-B-20260617', 'test', 'TEST-WEB-CANVAS-GRAPH-STATUS-OVERLAY-TESTS-LEAF', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-MODULARIZED-TEST-EVIDENCE-B-20260617', 'test', 'TEST-WEB-CANVAS-NODE-WORKBENCH-OVERLAY-TESTS-LEAF', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-TEST-EVIDENCE-COMMAND-CANONICALIZATION-20260617', 'test', 'TEST-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-FOCUSED', 'may_update', true),
  ('PLANNING-DB-WEB-CANVAS-TEST-EVIDENCE-COMMAND-CANONICALIZATION-20260617', 'test', 'TEST-WEB-CANVAS-SOURCE-IMPORT-WIZARD-TEST-HARNESS', 'may_update', true),
  ('PLANNING-DB-WEB-CANVAS-TEST-EVIDENCE-COMMAND-CANONICALIZATION-20260617', 'test', 'TEST-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-PRESENTER', 'may_update', true),
  ('PLANNING-DB-WEB-CANVAS-TEST-EVIDENCE-COMMAND-CANONICALIZATION-20260617', 'test', 'TEST-WEB-CANVAS-SHELL-CONTEXTUAL-DIALOGS', 'may_update', true),
  ('PLANNING-DB-WEB-CANVAS-TEST-EVIDENCE-COMMAND-CANONICALIZATION-20260617', 'test', 'TEST-WEB-CANVAS-SHELL-SOURCE-IMPORT', 'may_update', true),
  ('PLANNING-DB-WEB-CANVAS-TEST-EVIDENCE-COMMAND-CANONICALIZATION-20260617', 'test', 'TEST-WEB-CANVAS-NODE-WORKBENCH-OVERLAY-TESTS-LEAF', 'may_update', true),
  ('PLANNING-DB-WEB-CANVAS-TEST-EVIDENCE-COMMAND-CANONICALIZATION-20260617', 'test', 'TEST-WEB-CANVAS-GRAPH-STATUS-OVERLAY-TESTS-LEAF', 'may_update', true),
  ('PLANNING-DB-WEB-CANVAS-TEST-EVIDENCE-COMMAND-CANONICALIZATION-20260617', 'test', 'TEST-WEB-CANVAS-CONTEXT-MENU-PRESENTER-TESTS-LEAF', 'may_update', true),
  ('PLANNING-DB-WEB-CANVAS-TEST-EVIDENCE-COMMAND-CANONICALIZATION-20260617', 'component', 'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-TESTS', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-TEST-EVIDENCE-COMMAND-CANONICALIZATION-20260617', 'component', 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-TEST-HARNESS', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-TEST-EVIDENCE-COMMAND-CANONICALIZATION-20260617', 'component', 'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-PRESENTER', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-TEST-EVIDENCE-COMMAND-CANONICALIZATION-20260617', 'component', 'SYS-WEB-CANVAS-SHELL-CONTEXTUAL-DIALOG-TESTS', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-TEST-EVIDENCE-COMMAND-CANONICALIZATION-20260617', 'component', 'SYS-WEB-CANVAS-SHELL-SOURCE-IMPORT-TESTS', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-TEST-EVIDENCE-COMMAND-CANONICALIZATION-20260617', 'component', 'SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY-TESTS', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-TEST-EVIDENCE-COMMAND-CANONICALIZATION-20260617', 'component', 'SYS-WEB-CANVAS-GRAPH-STATUS-OVERLAY-TESTS', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-TEST-EVIDENCE-COMMAND-CANONICALIZATION-20260617', 'component', 'SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER-TESTS', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-TABS-PARENT-CANONICALIZATION-20260617', 'component', 'SYS-WEB-APP-COMPONENTS', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-TABS-PARENT-CANONICALIZATION-20260617', 'component', 'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS', 'may_update', true),
  ('PLANNING-DB-WEB-CANVAS-TABS-PARENT-CANONICALIZATION-20260617', 'component', 'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-PRESENTER', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-TABS-PARENT-CANONICALIZATION-20260617', 'path', 'apps/web/src/app/components/inspector/NodePropertiesTabs.tsx', 'may_reference', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

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
  ('SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-TESTS', 'planning_query_store.governance_component_local_definitions', 'a1336c102bd1b8ae7387a29e81a9d751a99ef25c69e8bca6f3b4780e3a578b89', 0, 'Canvas inspector node properties tabs tests', 'component', 'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS', 'SYS-DVT', 'SYS-DVT', 'review', false, 'Owns focused tests for NodePropertiesTabs presentation behavior and overflow tab selection.', 'CanvasInspectorTabsPresentationTests', 'RenderNodePropertiesTabs', 'codex'),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-TEST-HARNESS', 'planning_query_store.governance_component_local_definitions', 'd11a319cfc030181b0f412bda98a6d3d601af3475ffc57c681ecb62d1d27a0b3', 0, 'Canvas source import wizard test harness', 'component', 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD', 'SYS-DVT', 'SYS-DVT', 'review', false, 'Owns SourceImportWizard jsdom harness and focused metadata/plugin option tests.', 'SourceImportWizardTestHarness', 'ListWarehouseConnections;ListWarehouseConnectionTables;ImportWarehouseSources', 'codex'),
  ('SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-PRESENTER', 'planning_query_store.governance_component_local_definitions', 'e483bd77a532c5513208f1f1ff0a16795900d47e6e6bc4e9e898dbfe833437a5', 0, 'Canvas inspector node properties tabs presenter', 'component', 'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS', 'SYS-DVT', 'SYS-DVT', 'review', false, 'Owns the NodePropertiesTabs React presenter and tab overflow rendering for the Canvas inspector node properties read model.', 'CanvasInspectorTabsPresenter', 'RenderNodePropertiesTabs;InspectCanvasNodeProperties', 'codex'),
  ('SYS-WEB-CANVAS-SHELL-CONTEXTUAL-DIALOG-TESTS', 'planning_query_store.governance_component_local_definitions', '489f9aa57d6d5f7dc8ecd7dbf07523eca0cd92524fbe24531d27a94ef3884c2a', 0, 'Canvas shell contextual dialog tests', 'component', 'SYS-WEB-CANVAS-SHELL-MAIN-PANEL', 'SYS-DVT', 'SYS-DVT', 'review', false, 'Owns focused CanvasShell tests for contextual project explorer and canvas settings dialog commands.', 'CanvasShellContextualDialogTests', 'ResolveCanvasContextMenu;ListProjectCanvases;ConfigureCanvasViewportPreferences', 'codex'),
  ('SYS-WEB-CANVAS-SHELL-SOURCE-IMPORT-TESTS', 'planning_query_store.governance_component_local_definitions', '5373cc5cd36017fe08dc93b3e47d3233cdecb6ed0e5415e1f9e289409dbbad7d', 0, 'Canvas shell source import tests', 'component', 'SYS-WEB-CANVAS-SHELL-MAIN-PANEL', 'SYS-DVT', 'SYS-DVT', 'review', false, 'Owns focused CanvasShell tests for source import availability, wizard opening, completion, and permission revocation.', 'CanvasShellSourceImportTests', 'ListWarehouseConnections;ListWarehouseConnectionTables;ImportWarehouseSources', 'codex'),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY-TESTS', 'planning_query_store.governance_component_local_definitions', '63f71b62d52017b0f67ee57812700e31f9c99859d3bc4cfad4b4a62ed5fdc749', 0, 'Canvas node workbench overlay tests', 'component', 'SYS-WEB-CANVAS-NODE-WORKBENCH', 'SYS-DVT', 'SYS-DVT', 'review', false, 'Owns focused tests for CanvasNodeWorkbenchOverlay gating and inspector handoff.', 'CanvasNodeWorkbenchOverlayTests', 'InspectCanvasNodeProperties;RenderCanvasNodeShell', 'codex'),
  ('SYS-WEB-CANVAS-GRAPH-STATUS-OVERLAY-TESTS', 'planning_query_store.governance_component_local_definitions', '5a510f2ebe1a7e9d70435a888f15f53ce6da9c5ef7a576f5d2af913892a1f7d3', 0, 'Canvas graph status overlay tests', 'component', 'SYS-WEB-CANVAS-GRAPH-SURFACE', 'SYS-DVT', 'SYS-DVT', 'review', false, 'Owns focused tests for CanvasGraphStatusOverlay save and recovery status rendering.', 'CanvasGraphStatusOverlayTests', 'GetWorkspaceGraphDraft;ApplyCanvasDraftConflictRecovery', 'codex'),
  ('SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER-TESTS', 'planning_query_store.governance_component_local_definitions', 'd23d03bc0c4e5e40fec44ceea16c1844f97df2e0707261ae1301cca7ddd414a1', 0, 'Canvas context menu presenter tests', 'component', 'SYS-WEB-CANVAS-CANVAS-CONTEXT-MENU', 'SYS-DVT', 'SYS-DVT', 'review', false, 'Owns focused tests for useCanvasContextMenuPresenter open and close timing behavior.', 'CanvasContextMenuPresenterTests', 'ResolveCanvasContextMenu', 'codex')
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
  ('SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-TESTS', 'owns', 'apps/web/src/app/components/inspector/NodePropertiesTabs.test.tsx', 0),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-TEST-HARNESS', 'owns', 'apps/web/src/app/components/SourceImportWizard.testHarness.tsx', 0),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-TEST-HARNESS', 'owns', 'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx', 1),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-TEST-HARNESS', 'owns', 'apps/web/src/app/components/SourceImportWizard.pluginOptions.test.tsx', 2),
  ('SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-PRESENTER', 'owns', 'apps/web/src/app/components/inspector/NodePropertiesTabs.tsx', 0),
  ('SYS-WEB-CANVAS-SHELL-CONTEXTUAL-DIALOG-TESTS', 'owns', 'apps/web/src/app/views/canvas/CanvasShell.contextualDialogs.test.tsx', 0),
  ('SYS-WEB-CANVAS-SHELL-SOURCE-IMPORT-TESTS', 'owns', 'apps/web/src/app/views/canvas/CanvasShell.sourceImportAvailability.test.tsx', 0),
  ('SYS-WEB-CANVAS-SHELL-SOURCE-IMPORT-TESTS', 'owns', 'apps/web/src/app/views/canvas/CanvasShell.sourceImportLifecycle.test.tsx', 1),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY-TESTS', 'owns', 'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx', 0),
  ('SYS-WEB-CANVAS-GRAPH-STATUS-OVERLAY-TESTS', 'owns', 'apps/web/src/app/views/canvas/CanvasGraphStatusOverlay.test.tsx', 0),
  ('SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER-TESTS', 'owns', 'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.test.tsx', 0)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  ('SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-TESTS', 'responsibility', 'Validate passive node property tab rendering, overflow sections, and table-like section behavior.', 0),
  ('SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-TESTS', 'reason_to_change', 'NodePropertiesTabs presentation, overflow, or section rendering test changes.', 0),
  ('SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-TESTS', 'public_api', 'NodePropertiesTabsTestHarness', 0),
  ('SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-TESTS', 'invariant', 'NodePropertiesTabs test ownership stays under the tabs component, not the broad shared components parent.', 0),
  ('SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-TESTS', 'consumer', 'Canvas inspector node properties tabs.', 0),
  ('SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-TESTS', 'governance_ref', 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md', 0),
  ('SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-TESTS', 'fowler_signal', 'responsibility_overload', 0),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-TEST-HARNESS', 'responsibility', 'Validate SourceImportWizard metadata exploration, plugin option rendering, and reusable jsdom harness behavior.', 0),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-TEST-HARNESS', 'reason_to_change', 'Source import wizard metadata, plugin option, or test harness behavior changes.', 0),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-TEST-HARNESS', 'public_api', 'createSourceImportWizardHarness', 0),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-TEST-HARNESS', 'public_api', 'buildWarehouseSourceImportPort', 1),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-TEST-HARNESS', 'invariant', 'Wizard tests use source-import rails and stay under the SourceImportWizard component instead of SYS-WEB-APP-COMPONENTS.', 0),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-TEST-HARNESS', 'consumer', 'Canvas source import wizard tests.', 0),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-TEST-HARNESS', 'governance_ref', 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md', 0),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-TEST-HARNESS', 'fowler_signal', 'responsibility_overload', 0),
  ('SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-PRESENTER', 'responsibility', 'Render passive node property sections, overflow plugin panels, tags, and before-panel content for the inspector tabs.', 0),
  ('SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-PRESENTER', 'reason_to_change', 'Node property tab presentation, overflow item rendering, badge rendering, or plugin panel contribution display changes.', 0),
  ('SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-PRESENTER', 'public_api', 'NodePropertiesTabs', 0),
  ('SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-PRESENTER', 'public_api', 'NodePropertiesTabsProps', 1),
  ('SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-PRESENTER', 'invariant', 'The presenter renders a supplied NodePropertiesReadModel and does not own node mutation semantics.', 0),
  ('SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-PRESENTER', 'consumer', 'CanvasInspectorPanel', 0),
  ('SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-PRESENTER', 'governance_ref', 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md', 0),
  ('SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-PRESENTER', 'fowler_signal', 'boundary_drift', 0),
  ('SYS-WEB-CANVAS-SHELL-CONTEXTUAL-DIALOG-TESTS', 'responsibility', 'Prove CanvasShell opens project explorer and canvas settings dialogs from contextual viewport commands.', 0),
  ('SYS-WEB-CANVAS-SHELL-CONTEXTUAL-DIALOG-TESTS', 'reason_to_change', 'Canvas shell contextual dialog command wiring, project explorer entrypoint, or canvas settings entrypoint changes.', 0),
  ('SYS-WEB-CANVAS-SHELL-CONTEXTUAL-DIALOG-TESTS', 'public_api', 'createCanvasShellHarness', 0),
  ('SYS-WEB-CANVAS-SHELL-CONTEXTUAL-DIALOG-TESTS', 'invariant', 'Contextual dialogs are tested through shell state and real canvas document descriptors, not through a duplicated dialog rail.', 0),
  ('SYS-WEB-CANVAS-SHELL-CONTEXTUAL-DIALOG-TESTS', 'consumer', 'CanvasShellMainPanelComposition', 0),
  ('SYS-WEB-CANVAS-SHELL-CONTEXTUAL-DIALOG-TESTS', 'governance_ref', 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md', 0),
  ('SYS-WEB-CANVAS-SHELL-CONTEXTUAL-DIALOG-TESTS', 'fowler_signal', 'hidden_authority', 0),
  ('SYS-WEB-CANVAS-SHELL-SOURCE-IMPORT-TESTS', 'responsibility', 'Prove CanvasShell exposes source import only when policy and plugin capability allow it and wires completion through graph commands.', 0),
  ('SYS-WEB-CANVAS-SHELL-SOURCE-IMPORT-TESTS', 'reason_to_change', 'Canvas shell source import policy, viewport command, wizard lifecycle, or imported-node focus wiring changes.', 0),
  ('SYS-WEB-CANVAS-SHELL-SOURCE-IMPORT-TESTS', 'public_api', 'createCanvasShellHarness', 0),
  ('SYS-WEB-CANVAS-SHELL-SOURCE-IMPORT-TESTS', 'invariant', 'Source import UI availability follows runtime capability and edit permission policy without inventing a shell-local import rail.', 0),
  ('SYS-WEB-CANVAS-SHELL-SOURCE-IMPORT-TESTS', 'consumer', 'CanvasShellMainPanelComposition', 0),
  ('SYS-WEB-CANVAS-SHELL-SOURCE-IMPORT-TESTS', 'governance_ref', 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md', 0),
  ('SYS-WEB-CANVAS-SHELL-SOURCE-IMPORT-TESTS', 'fowler_signal', 'hidden_authority', 0),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY-TESTS', 'responsibility', 'Prove the contextual node workbench overlay renders only when the selected-node, focus-mode, inspector visibility, and surface-strategy posture is active.', 0),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY-TESTS', 'reason_to_change', 'Node workbench overlay gating, selected-node inspector handoff, or contextual surface strategy changes.', 0),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY-TESTS', 'public_api', 'CanvasNodeWorkbenchOverlay', 0),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY-TESTS', 'invariant', 'Overlay tests validate presentation gating and do not own DBT/DVT field semantics.', 0),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY-TESTS', 'consumer', 'CanvasNodeWorkbenchReadModel', 0),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY-TESTS', 'governance_ref', 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md', 0),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY-TESTS', 'fowler_signal', 'boundary_drift', 0),
  ('SYS-WEB-CANVAS-GRAPH-STATUS-OVERLAY-TESTS', 'responsibility', 'Prove graph status overlay hides neutral saved state, renders pending autosave, and exposes recovery reload action when required.', 0),
  ('SYS-WEB-CANVAS-GRAPH-STATUS-OVERLAY-TESTS', 'reason_to_change', 'Canvas draft save status projection, graph overlay status display, or reload recovery action changes.', 0),
  ('SYS-WEB-CANVAS-GRAPH-STATUS-OVERLAY-TESTS', 'public_api', 'CanvasGraphStatusOverlay', 0),
  ('SYS-WEB-CANVAS-GRAPH-STATUS-OVERLAY-TESTS', 'invariant', 'Graph status overlay tests validate projected status display and do not become the draft persistence authority.', 0),
  ('SYS-WEB-CANVAS-GRAPH-STATUS-OVERLAY-TESTS', 'consumer', 'GraphCanvasSurface', 0),
  ('SYS-WEB-CANVAS-GRAPH-STATUS-OVERLAY-TESTS', 'governance_ref', 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md', 0),
  ('SYS-WEB-CANVAS-GRAPH-STATUS-OVERLAY-TESTS', 'fowler_signal', 'documentation_drift', 0),
  ('SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER-TESTS', 'responsibility', 'Prove right-click browser click echo does not close the Canvas context menu and later intentional background clicks do close it.', 0),
  ('SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER-TESTS', 'reason_to_change', 'Canvas context menu presenter timing, pane-click close policy, or contextual menu read model behavior changes.', 0),
  ('SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER-TESTS', 'public_api', 'useCanvasContextMenuPresenter', 0),
  ('SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER-TESTS', 'invariant', 'Presenter tests validate the contextual menu read model timing and do not own graph mutation commands.', 0),
  ('SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER-TESTS', 'consumer', 'CanvasContextMenuModel', 0),
  ('SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER-TESTS', 'governance_ref', 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md', 0),
  ('SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER-TESTS', 'fowler_signal', 'primitive_obsession', 0)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

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
  ('SYS-WEB-APP-COMPONENTS', 'Web App Components', 'module', 'ui', 'Frontend / Web', 'apps/web/src/app/components/domain/index.ts', 'Web App Components source boundary in apps/web', 'none', 'medium', 'implemented', 'SYS-WEB-ROOT'),
  ('SYS-WEB-CANVAS-ADD-SOURCE-DIALOG', 'Add source dialog', 'ui-view', 'ui', 'Frontend / Canvas', 'apps/web/src/app/views/canvas/CanvasModalHost.tsx', 'Add source dialog source boundary in apps/web', 'none', 'medium', 'implemented', 'SYS-WEB-CANVAS-CONTEXTUAL-WORKBENCH'),
  ('SYS-WEB-CANVAS-CANVAS-CONTEXT-MENU', 'Canvas context menu', 'ui-view', 'ui', 'Frontend / Canvas', 'apps/web/src/app/views/canvas/CanvasContextMenuView.tsx', 'Canvas context menu aggregate boundary. It contains the add-node palette and context-menu presenter surfaces without claiming their child ownership as its own file path.', 'none', 'medium', 'implemented', 'SYS-WEB-CANVAS-CONTEXTUAL-WORKBENCH'),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD', 'Web Canvas Source Import Wizard', 'ui-view', 'ui', 'Frontend / Canvas', 'apps/web/src/app/components/sourceImportWizard', 'Web Canvas Source Import Wizard source boundary in apps/web', 'none', 'medium', 'implemented', 'SYS-WEB-CANVAS-ADD-SOURCE-DIALOG'),
  ('SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS', 'Web Canvas inspector node properties tabs', 'ui-view', 'ui', 'Frontend / Canvas', 'apps/web/src/app/components/inspector', 'Composite inspector tabs directory boundary; runtime TSX is owned by SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-PRESENTER and tests by SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-TESTS.', 'none', 'medium', 'review', 'SYS-WEB-APP-COMPONENTS'),
  ('SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-TESTS', 'Canvas inspector node properties tabs tests', 'module', 'ui', 'Frontend / Canvas', 'apps/web/src/app/components/inspector/NodePropertiesTabs.test.tsx', 'NodePropertiesTabs presentation behavior test boundary', 'browser', 'medium', 'review', 'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS'),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-TEST-HARNESS', 'Canvas source import wizard test harness', 'module', 'ui', 'Frontend / Canvas', 'apps/web/src/app/components/SourceImportWizard.testHarness.tsx', 'SourceImportWizard jsdom harness and focused metadata/plugin option tests', 'browser', 'medium', 'review', 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD'),
  ('SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-PRESENTER', 'Canvas inspector node properties tabs presenter', 'ui-view', 'ui', 'Frontend / Canvas', 'apps/web/src/app/components/inspector/NodePropertiesTabs.tsx', 'NodePropertiesTabs source boundary in apps/web', 'none', 'medium', 'review', 'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS'),
  ('SYS-WEB-CANVAS-SHELL-CONTEXTUAL-DIALOG-TESTS', 'Canvas shell contextual dialog tests', 'ui-view', 'ui', 'Frontend / Canvas', 'apps/web/src/app/views/canvas/CanvasShell.contextualDialogs.test.tsx', 'CanvasShell contextual dialog test boundary in apps/web', 'none', 'medium', 'review', 'SYS-WEB-CANVAS-SHELL-MAIN-PANEL'),
  ('SYS-WEB-CANVAS-SHELL-SOURCE-IMPORT-TESTS', 'Canvas shell source import tests', 'ui-view', 'ui', 'Frontend / Canvas', 'apps/web/src/app/views/canvas/CanvasShell.sourceImportAvailability.test.tsx', 'CanvasShell source import test boundary in apps/web', 'none', 'medium', 'review', 'SYS-WEB-CANVAS-SHELL-MAIN-PANEL'),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY-TESTS', 'Canvas node workbench overlay tests', 'ui-view', 'ui', 'Frontend / Canvas', 'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx', 'Canvas node workbench overlay test boundary in apps/web', 'none', 'medium', 'review', 'SYS-WEB-CANVAS-NODE-WORKBENCH'),
  ('SYS-WEB-CANVAS-GRAPH-STATUS-OVERLAY-TESTS', 'Canvas graph status overlay tests', 'ui-view', 'ui', 'Frontend / Canvas', 'apps/web/src/app/views/canvas/CanvasGraphStatusOverlay.test.tsx', 'Canvas graph status overlay test boundary in apps/web', 'none', 'medium', 'review', 'SYS-WEB-CANVAS-GRAPH-SURFACE'),
  ('SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER-TESTS', 'Canvas context menu presenter tests', 'ui-view', 'ui', 'Frontend / Canvas', 'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.test.tsx', 'Canvas context menu presenter test boundary in apps/web', 'none', 'medium', 'review', 'SYS-WEB-CANVAS-CANVAS-CONTEXT-MENU')
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
  ('RESP-SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS', 'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS', 'Own passive tab rendering for node property sections and plugin panel contributions as a composite feature area.', 'Tab vocabulary, presenter, tests, or read-model boundary changes.', 'CanvasInspectorTabs', 'proposed'),
  ('RESP-SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-TESTS', 'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-TESTS', 'Validate passive node property tab rendering, overflow sections, and table-like section behavior.', 'NodePropertiesTabs presentation, overflow, or section rendering test changes.', 'CanvasInspectorTabsPresentationTests', 'proposed'),
  ('RESP-SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-TEST-HARNESS', 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-TEST-HARNESS', 'Validate SourceImportWizard metadata exploration, plugin option rendering, and reusable jsdom harness behavior.', 'Source import wizard metadata, plugin option, or test harness behavior changes.', 'SourceImportWizardTestHarness', 'proposed'),
  ('RESP-SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-PRESENTER', 'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-PRESENTER', 'Render passive node property tabs from the inspector read model.', 'Node property tab presentation, overflow, badge, or plugin panel rendering changes.', 'CanvasInspectorTabsPresenter', 'proposed'),
  ('RESP-SYS-WEB-CANVAS-SHELL-CONTEXTUAL-DIALOG-TESTS', 'SYS-WEB-CANVAS-SHELL-CONTEXTUAL-DIALOG-TESTS', 'Validate CanvasShell contextual project explorer and settings dialogs.', 'Canvas shell contextual dialog command wiring or shell dialog posture changes.', 'CanvasShellContextualDialogTests', 'proposed'),
  ('RESP-SYS-WEB-CANVAS-SHELL-SOURCE-IMPORT-TESTS', 'SYS-WEB-CANVAS-SHELL-SOURCE-IMPORT-TESTS', 'Validate CanvasShell source import availability, wizard lifecycle, completion, and permission revocation.', 'Canvas shell source import policy, viewport command, wizard lifecycle, or imported-node focus changes.', 'CanvasShellSourceImportTests', 'proposed'),
  ('RESP-SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY-TESTS', 'SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY-TESTS', 'Validate contextual node workbench overlay gating and inspector handoff.', 'Node workbench overlay placement, gating, selected-node handoff, or surface strategy changes.', 'CanvasNodeWorkbenchOverlayTests', 'proposed'),
  ('RESP-SYS-WEB-CANVAS-GRAPH-STATUS-OVERLAY-TESTS', 'SYS-WEB-CANVAS-GRAPH-STATUS-OVERLAY-TESTS', 'Validate graph status overlay visibility and recovery reload action.', 'Draft status projection, graph status display, or reload recovery action changes.', 'CanvasGraphStatusOverlayTests', 'proposed'),
  ('RESP-SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER-TESTS', 'SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER-TESTS', 'Validate context menu presenter open and close timing behavior.', 'Context menu presenter timing, pane-click close policy, or contextual menu read model changes.', 'CanvasContextMenuPresenterTests', 'proposed')
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
  ('REL-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-CONTAINS-TESTS', 'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS', 'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-TESTS', 'contains', 'outbound', 'sync', null, 'not_applicable', 'browser-user', '["docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md"]'::jsonb, 'implemented'),
  ('REL-WEB-CANVAS-SOURCE-IMPORT-WIZARD-CONTAINS-TEST-HARNESS', 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD', 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-TEST-HARNESS', 'contains', 'outbound', 'sync', null, 'not_applicable', 'browser-user', '["docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md"]'::jsonb, 'implemented'),
  ('REL-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-CONTAINS-PRESENTER', 'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS', 'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-PRESENTER', 'contains', 'outbound', 'sync', null, 'not_applicable', 'internal-ui-component-ownership', '["docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md"]'::jsonb, 'implemented'),
  ('REL-WEB-CANVAS-SHELL-MAIN-PANEL-CONTAINS-CONTEXTUAL-DIALOG-TESTS', 'SYS-WEB-CANVAS-SHELL-MAIN-PANEL', 'SYS-WEB-CANVAS-SHELL-CONTEXTUAL-DIALOG-TESTS', 'contains', 'outbound', 'sync', null, 'not_applicable', 'internal-ui-component-ownership', '["docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md"]'::jsonb, 'implemented'),
  ('REL-WEB-CANVAS-SHELL-MAIN-PANEL-CONTAINS-SOURCE-IMPORT-TESTS', 'SYS-WEB-CANVAS-SHELL-MAIN-PANEL', 'SYS-WEB-CANVAS-SHELL-SOURCE-IMPORT-TESTS', 'contains', 'outbound', 'sync', null, 'not_applicable', 'internal-ui-component-ownership', '["docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md"]'::jsonb, 'implemented'),
  ('REL-WEB-CANVAS-NODE-WORKBENCH-CONTAINS-OVERLAY-TESTS', 'SYS-WEB-CANVAS-NODE-WORKBENCH', 'SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY-TESTS', 'contains', 'outbound', 'sync', null, 'not_applicable', 'internal-ui-component-ownership', '["docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md"]'::jsonb, 'implemented'),
  ('REL-WEB-CANVAS-GRAPH-SURFACE-CONTAINS-STATUS-OVERLAY-TESTS', 'SYS-WEB-CANVAS-GRAPH-SURFACE', 'SYS-WEB-CANVAS-GRAPH-STATUS-OVERLAY-TESTS', 'contains', 'outbound', 'sync', null, 'not_applicable', 'internal-ui-component-ownership', '["docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md"]'::jsonb, 'implemented'),
  ('REL-WEB-CANVAS-CANVAS-CONTEXT-MENU-CONTAINS-PRESENTER-TESTS', 'SYS-WEB-CANVAS-CANVAS-CONTEXT-MENU', 'SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER-TESTS', 'contains', 'outbound', 'sync', null, 'not_applicable', 'internal-ui-component-ownership', '["docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md"]'::jsonb, 'implemented')
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
  ('TEST-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-FOCUSED', 'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-TESTS', 'apps/web/src/app/components/inspector/NodePropertiesTabs.test.tsx', 'unit', 'behavior', true, 'pnpm --filter @dvt/web test:presentation:run -- src/app/components/inspector/NodePropertiesTabs.test.tsx'),
  ('TEST-WEB-CANVAS-SOURCE-IMPORT-WIZARD-TEST-HARNESS', 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-TEST-HARNESS', 'apps/web/src/app/components/SourceImportWizard.metadata.test.tsx', 'unit', 'behavior', true, 'pnpm --filter @dvt/web test:presentation:run -- src/app/components/SourceImportWizard.metadata.test.tsx src/app/components/SourceImportWizard.pluginOptions.test.tsx'),
  ('TEST-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-PRESENTER', 'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-PRESENTER', 'apps/web/src/app/components/inspector/NodePropertiesTabs.test.tsx', 'unit', 'behavior', true, 'pnpm --filter @dvt/web test:presentation:run -- src/app/components/inspector/NodePropertiesTabs.test.tsx'),
  ('TEST-WEB-CANVAS-SHELL-CONTEXTUAL-DIALOGS', 'SYS-WEB-CANVAS-SHELL-CONTEXTUAL-DIALOG-TESTS', 'apps/web/src/app/views/canvas/CanvasShell.contextualDialogs.test.tsx', 'integration', 'flow', true, 'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/CanvasShell.contextualDialogs.test.tsx'),
  ('TEST-WEB-CANVAS-SHELL-SOURCE-IMPORT', 'SYS-WEB-CANVAS-SHELL-SOURCE-IMPORT-TESTS', 'apps/web/src/app/views/canvas/CanvasShell.sourceImportAvailability.test.tsx', 'integration', 'flow', true, 'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/CanvasShell.sourceImportAvailability.test.tsx src/app/views/canvas/CanvasShell.sourceImportLifecycle.test.tsx'),
  ('TEST-WEB-CANVAS-NODE-WORKBENCH-OVERLAY-TESTS-LEAF', 'SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY-TESTS', 'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx', 'unit', 'behavior', true, 'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx'),
  ('TEST-WEB-CANVAS-GRAPH-STATUS-OVERLAY-TESTS-LEAF', 'SYS-WEB-CANVAS-GRAPH-STATUS-OVERLAY-TESTS', 'apps/web/src/app/views/canvas/CanvasGraphStatusOverlay.test.tsx', 'unit', 'behavior', true, 'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/CanvasGraphStatusOverlay.test.tsx'),
  ('TEST-WEB-CANVAS-CONTEXT-MENU-PRESENTER-TESTS-LEAF', 'SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER-TESTS', 'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.test.tsx', 'unit', 'behavior', true, 'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/useCanvasContextMenuPresenter.test.tsx')
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;
