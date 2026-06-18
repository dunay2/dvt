-- Split the flat Canvas residual route bucket into semantic filesystem-backed
-- components. The DB-first component create rail was used for the live
-- operations; this migration makes the same component map reproducible for
-- reset, import, CI, and reviewer queries.

drop table if exists pg_temp.web_canvas_residual_component_split;

create temporary table web_canvas_residual_component_split (
  component_id text primary key,
  name text not null,
  parent_id text not null,
  relation_id text not null,
  architecture_kind text not null,
  architecture_layer text not null,
  architecture_owner text not null,
  repo_path text not null,
  public_contract text not null,
  runtime text not null,
  criticality text not null,
  ddd_owner text not null,
  cq_rails text not null,
  owned_concern text not null,
  responsibility text not null,
  reason_to_change text not null,
  fowler_signal text not null,
  public_api text[] not null,
  owns text[] not null,
  test_id text not null,
  test_path text not null,
  test_kind text not null,
  coverage_level text not null,
  validation_command text not null
);

insert into web_canvas_residual_component_split (
  component_id,
  name,
  parent_id,
  relation_id,
  architecture_kind,
  architecture_layer,
  architecture_owner,
  repo_path,
  public_contract,
  runtime,
  criticality,
  ddd_owner,
  cq_rails,
  owned_concern,
  responsibility,
  reason_to_change,
  fowler_signal,
  public_api,
  owns,
  test_id,
  test_path,
  test_kind,
  coverage_level,
  validation_command
)
values
  (
    'SYS-WEB-CANVAS-DRAFT-LIFECYCLE',
    'Canvas draft lifecycle',
    'SYS-WEB-VIEW-CANVAS',
    'REL-WEB-CANVAS-VIEW-CONTAINS-DRAFT-LIFECYCLE',
    'ui-view',
    'ui',
    'Frontend / Canvas',
    'apps/web/src/app/views/canvas/canvasDraftSession.ts',
    'Canvas draft session, persistence, recovery, autosave, and local draft read models',
    'browser',
    'high',
    'CanvasDraftLifecycle',
    'LoadCanvasDraft;PersistCanvasDraft;RecoverCanvasDraft',
    'Owns Canvas draft session, persistence, recovery, autosave, and local draft read models.',
    'Keep Canvas draft lifecycle state, persistence, autosave, recovery, and draft read models cohesive.',
    'Canvas draft session semantics, persistence policy, recovery posture, or autosave scheduling changes.',
    'aggregate_lifecycle',
    array['LoadCanvasDraft', 'PersistCanvasDraft', 'RecoverCanvasDraft']::text[],
    array[
      'apps/web/src/app/views/canvas/canvasDraft*',
      'apps/web/src/app/views/canvas/CanvasDraft*',
      'apps/web/src/app/views/canvas/useCanvasDraft*',
      'apps/web/src/app/views/canvas/canvasStartupAndDraftRecovery*',
      'apps/web/src/app/views/canvas/canvasStartupBootstrapPublication*'
    ]::text[],
    'TEST-WEB-CANVAS-DRAFT-LIFECYCLE',
    'apps/web/src/app/views/canvas/canvasDraftSession.test.ts',
    'unit',
    'behavior',
    'pnpm --filter @dvt/web test:unit:run -- src/app/views/canvas/canvasDraftSession.test.ts'
  ),
  (
    'SYS-WEB-CANVAS-SHELL-CHROME',
    'Canvas shell chrome',
    'SYS-WEB-CANVAS-SHELL-MAIN-PANEL',
    'REL-WEB-CANVAS-SHELL-MAIN-PANEL-CONTAINS-SHELL-CHROME',
    'ui-view',
    'ui',
    'Frontend / Canvas',
    'apps/web/src/app/views/canvas/CanvasShell.tsx',
    'Canvas shell composition, center surface, route state, menus, and chrome builders',
    'browser',
    'high',
    'CanvasShellChrome',
    'RenderCanvasShell;UpdateCanvasShellChrome;SelectCanvasWorkspaceMenu',
    'Owns Canvas shell composition, center surface, route state, view menu, workspace menu, and shell chrome builders.',
    'Render and coordinate Canvas shell chrome, panels, route state, menus, and center-surface composition.',
    'Canvas shell layout, route interaction, menu contribution, center surface, or chrome builder changes.',
    'application_shell',
    array['RenderCanvasShell', 'UpdateCanvasShellChrome']::text[],
    array[
      'apps/web/src/app/views/canvas/canvasShell*',
      'apps/web/src/app/views/canvas/CanvasShell*',
      'apps/web/src/app/views/canvas/canvasCenterSurface*',
      'apps/web/src/app/views/canvas/CanvasCenterSurface*',
      'apps/web/src/app/views/canvas/canvasChrome*',
      'apps/web/src/app/views/canvas/canvasRoute*',
      'apps/web/src/app/views/canvas/CanvasStateViews*',
      'apps/web/src/app/views/canvas/canvasViewMenu*',
      'apps/web/src/app/views/canvas/CanvasViewMenu*',
      'apps/web/src/app/views/canvas/canvasWorkspaceMenu*',
      'apps/web/src/app/views/canvas/CanvasWorkspaceMenu*',
      'apps/web/src/app/views/canvas/useCanvasRoutePresentationSync*'
    ]::text[],
    'TEST-WEB-CANVAS-SHELL-CHROME',
    'apps/web/src/app/views/canvas/CanvasShell.architecture.test.tsx',
    'architecture',
    'boundary',
    'pnpm --filter @dvt/web test:architecture:run -- src/app/views/canvas/CanvasShell.architecture.test.tsx'
  ),
  (
    'SYS-WEB-CANVAS-AUTHORING-DOCUMENT',
    'Canvas authoring document commands',
    'SYS-WEB-VIEW-CANVAS',
    'REL-WEB-CANVAS-VIEW-CONTAINS-AUTHORING-DOCUMENT',
    'module',
    'application',
    'Frontend / Canvas',
    'apps/web/src/app/views/canvas/canvasCreateCanvasDocumentCommand.ts',
    'Canvas authoring document creation, first-node policy, authoring runtime projection, and create-document command policy',
    'browser',
    'high',
    'CanvasAuthoringDocument',
    'CreateCanvasDocument;CreateCanvasAuthoringNode;RestoreFirstAuthoringNode',
    'Owns Canvas authoring document creation, first-node policy, authoring runtime projection, and create-document command policy.',
    'Keep Canvas authoring document creation and first authoring flows cohesive.',
    'Canvas authoring state, create-document policy, first authoring proof, or runtime projection changes.',
    'command_model',
    array['CreateCanvasDocument', 'CreateCanvasAuthoringNode']::text[],
    array[
      'apps/web/src/app/views/canvas/canvasAuthoring*',
      'apps/web/src/app/views/canvas/useCanvasAuthoring*',
      'apps/web/src/app/views/canvas/canvasCreateCanvasDocument*',
      'apps/web/src/app/views/canvas/canvasFirstAuthoring*',
      'apps/web/src/app/views/canvas/CanvasEmptyAuthoringEntrypoint*'
    ]::text[],
    'TEST-WEB-CANVAS-AUTHORING-DOCUMENT',
    'apps/web/src/app/views/canvas/canvasCreateCanvasDocumentCommand.test.ts',
    'unit',
    'behavior',
    'pnpm --filter @dvt/web test:unit:run -- src/app/views/canvas/canvasCreateCanvasDocumentCommand.test.ts'
  ),
  (
    'SYS-WEB-CANVAS-EXECUTION-RUNS',
    'Canvas execution and runs',
    'SYS-WEB-VIEW-CANVAS',
    'REL-WEB-CANVAS-VIEW-CONTAINS-EXECUTION-RUNS',
    'module',
    'application',
    'Frontend / Canvas',
    'apps/web/src/app/views/canvas/useCanvasExecutionActions.ts',
    'Canvas execution actions, run selection/start state, runtime policy, and operational drawer contribution registration',
    'browser',
    'high',
    'CanvasExecutionRuns',
    'PreviewExecutionPlan;StartCanvasRun;RevealStartedRunOperations',
    'Owns Canvas execution actions, run selection/start state, runtime policy, and operational drawer contribution registration.',
    'Coordinate execution preview, run start, run selection, and operational drawer feedback for Canvas.',
    'Execution preview, run-start policy, runtime policy, or operational drawer contribution changes.',
    'application_service',
    array['PreviewExecutionPlan', 'StartCanvasRun', 'RevealStartedRunOperations']::text[],
    array[
      'apps/web/src/app/views/canvas/canvasExecution*',
      'apps/web/src/app/views/canvas/useCanvasExecution*',
      'apps/web/src/app/views/canvas/canvasRun*',
      'apps/web/src/app/views/canvas/useCanvasRun*',
      'apps/web/src/app/views/canvas/CanvasOperationalDrawer*',
      'apps/web/src/app/views/canvas/PlanRunReadiness*',
      'apps/web/src/app/views/canvas/canvasRuntimePolicy*',
      'apps/web/src/app/views/canvas/canvasPlanRunReadiness*'
    ]::text[],
    'TEST-WEB-CANVAS-EXECUTION-RUNS',
    'apps/web/src/app/views/canvas/useCanvasExecutionActions.runStartSuccess.test.tsx',
    'unit',
    'behavior',
    'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/useCanvasExecutionActions.runStartSuccess.test.tsx'
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-PREVIEW-TRANSFORMATION',
    'Canvas source preview transformation',
    'SYS-WEB-VIEW-CANVAS',
    'REL-WEB-CANVAS-VIEW-CONTAINS-SOURCE-PREVIEW-TRANSFORMATION',
    'module',
    'application',
    'Frontend / Canvas',
    'apps/web/src/app/views/canvas/transformationGraphValidation.ts',
    'DBT/DVT authoring model projections, source-import handlers, preview graph sources, and transformation validation rules',
    'browser',
    'high',
    'CanvasSourcePreviewTransformation',
    'ImportWarehouseSources;PreviewExecutionPlan;ValidateTransformationGraph',
    'Owns DBT/DVT authoring model projections, source-import handlers, preview graph sources, and transformation validation rules.',
    'Connect source import and authoring models to preview graph and transformation validation read models.',
    'DBT/DVT source model, preview graph, transformation validation, or source import handler changes.',
    'anti_corruption_layer',
    array['ImportWarehouseSources', 'ValidateTransformationGraph']::text[],
    array[
      'apps/web/src/app/views/canvas/canvasDbt*',
      'apps/web/src/app/views/canvas/canvasDvt*',
      'apps/web/src/app/views/canvas/canvasTransformation*',
      'apps/web/src/app/views/canvas/transformation*',
      'apps/web/src/app/views/canvas/preview*',
      'apps/web/src/app/views/canvas/useCanvasSourceImport*'
    ]::text[],
    'TEST-WEB-CANVAS-SOURCE-PREVIEW-TRANSFORMATION',
    'apps/web/src/app/views/canvas/transformationGraphValidation.test.ts',
    'unit',
    'behavior',
    'pnpm --filter @dvt/web test:unit:run -- src/app/views/canvas/transformationGraphValidation.test.ts'
  ),
  (
    'SYS-WEB-CANVAS-INSPECTOR-AUTHORING',
    'Canvas inspector authoring',
    'SYS-WEB-CANVAS-NODE-WORKBENCH',
    'REL-WEB-CANVAS-NODE-WORKBENCH-CONTAINS-INSPECTOR-AUTHORING',
    'ui-view',
    'ui',
    'Frontend / Canvas',
    'apps/web/src/app/views/canvas/CanvasInspectorPanel.tsx',
    'Canvas inspector authoring commands, error codes, model, section presentation, and panel-level authoring tests',
    'browser',
    'high',
    'CanvasInspectorAuthoring',
    'InspectCanvasNodeProperties;UpdateCanvasInspectorAuthoring',
    'Owns Canvas inspector authoring commands, error codes, model, section presentation, and panel-level authoring tests.',
    'Keep inspector authoring command and presentation state aligned with node workbench behavior.',
    'Inspector authoring command, panel model, authoring section, or node property presentation changes.',
    'form_backing_model',
    array['InspectCanvasNodeProperties', 'UpdateCanvasInspectorAuthoring']::text[],
    array[
      'apps/web/src/app/views/canvas/canvasInspector*',
      'apps/web/src/app/views/canvas/CanvasInspector*',
      'apps/web/src/app/views/canvas/useCanvasInspectorCommands*'
    ]::text[],
    'TEST-WEB-CANVAS-INSPECTOR-AUTHORING',
    'apps/web/src/app/views/canvas/CanvasInspectorPanel.authoring.test.tsx',
    'unit',
    'behavior',
    'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/CanvasInspectorPanel.authoring.test.tsx'
  ),
  (
    'SYS-WEB-CANVAS-GRAPH-LIFECYCLE',
    'Canvas graph lifecycle',
    'SYS-WEB-CANVAS-GRAPH-SURFACE',
    'REL-WEB-CANVAS-GRAPH-SURFACE-CONTAINS-GRAPH-LIFECYCLE',
    'module',
    'application',
    'Frontend / Canvas',
    'apps/web/src/app/views/canvas/canvasGraphLifecycle.ts',
    'Canvas graph lifecycle handlers, graph status overlay, active graph strategy, and graph utility contracts',
    'browser',
    'high',
    'CanvasGraphLifecycle',
    'RenderCanvasGraph;ApplyCanvasGraphChange;ValidateCanvasGraphLifecycle',
    'Owns Canvas graph lifecycle handlers, graph status overlay, active graph strategy, and graph utility contracts.',
    'Maintain graph lifecycle transitions, graph change runtime, status overlay, and graph handler contracts.',
    'Graph lifecycle, graph handler contract, active strategy, or graph status presentation changes.',
    'domain_event_lifecycle',
    array['RenderCanvasGraph', 'ApplyCanvasGraphChange']::text[],
    array[
      'apps/web/src/app/views/canvas/canvasGraph*',
      'apps/web/src/app/views/canvas/CanvasGraph*',
      'apps/web/src/app/views/canvas/canvasActiveGraphStrategy*',
      'apps/web/src/app/views/canvas/useCanvasGraph*',
      'apps/web/src/app/views/canvas/canvasHandlerContracts*'
    ]::text[],
    'TEST-WEB-CANVAS-GRAPH-LIFECYCLE',
    'apps/web/src/app/views/canvas/canvasGraphLifecycle.test.ts',
    'unit',
    'behavior',
    'pnpm --filter @dvt/web test:unit:run -- src/app/views/canvas/canvasGraphLifecycle.test.ts'
  ),
  (
    'SYS-WEB-CANVAS-COPY-LOCALIZATION',
    'Canvas copy localization',
    'SYS-WEB-VIEW-CANVAS',
    'REL-WEB-CANVAS-VIEW-CONTAINS-COPY-LOCALIZATION',
    'module',
    'ui',
    'Frontend / Canvas',
    'apps/web/src/app/views/canvas/canvasCopyCatalog.ts',
    'Canvas route, toolbar, authoring, and execution copy catalogs including Spanish variants and formatting helpers',
    'browser',
    'medium',
    'CanvasCopyLocalization',
    'ReadCanvasCopyCatalog',
    'Owns Canvas route, toolbar, authoring, and execution copy catalogs including Spanish variants and formatting helpers.',
    'Provide localized Canvas copy catalogs and formatting helpers for route, toolbar, execution, and authoring surfaces.',
    'Canvas copy, visible text, localization, or formatting policy changes.',
    'published_language',
    array['ReadCanvasCopyCatalog']::text[],
    array[
      'apps/web/src/app/views/canvas/canvasCopy*',
      'apps/web/src/app/views/canvas/copy.ts',
      'apps/web/src/app/views/canvas/copy.test.ts'
    ]::text[],
    'TEST-WEB-CANVAS-COPY-LOCALIZATION',
    'apps/web/src/app/views/canvas/copy.test.ts',
    'unit',
    'behavior',
    'pnpm --filter @dvt/web test:unit:run -- src/app/views/canvas/copy.test.ts'
  ),
  (
    'SYS-WEB-CANVAS-NODE-EDGE-AUTHORING',
    'Canvas node and edge authoring',
    'SYS-WEB-CANVAS-NODE-WORKBENCH',
    'REL-WEB-CANVAS-NODE-WORKBENCH-CONTAINS-NODE-EDGE-AUTHORING',
    'module',
    'application',
    'Frontend / Canvas',
    'apps/web/src/app/views/canvas/canvasNodeAdmissionTransaction.ts',
    'Canvas node admission/drop/duplicate flows, edge admission, node mapper, palette, and node/edge handler hooks',
    'browser',
    'high',
    'CanvasNodeEdgeAuthoring',
    'CreateCanvasNode;UpdateCanvasNode;UpdateCanvasEdge;DuplicateCanvasNode',
    'Owns Canvas node admission/drop/duplicate flows, edge admission, node mapper, palette, and node/edge handler hooks.',
    'Keep node and edge authoring commands, admission transactions, drop aggregates, and duplicate/removal handlers cohesive.',
    'Canvas node or edge authoring, admission, drop, duplicate, removal, or palette changes.',
    'aggregate_boundary',
    array['CreateCanvasNode', 'UpdateCanvasEdge', 'DuplicateCanvasNode']::text[],
    array[
      'apps/web/src/app/views/canvas/canvasNode*',
      'apps/web/src/app/views/canvas/useCanvasNode*',
      'apps/web/src/app/views/canvas/canvasEdge*',
      'apps/web/src/app/views/canvas/useCanvasEdge*',
      'apps/web/src/app/views/canvas/CanvasAddNodePalette*',
      'apps/web/src/app/views/canvas/canvasDuplicateNodeCommand*'
    ]::text[],
    'TEST-WEB-CANVAS-NODE-EDGE-AUTHORING',
    'apps/web/src/app/views/canvas/canvasNodeAdmissionTransaction.test.ts',
    'unit',
    'behavior',
    'pnpm --filter @dvt/web test:unit:run -- src/app/views/canvas/canvasNodeAdmissionTransaction.test.ts'
  ),
  (
    'SYS-WEB-CANVAS-PROJECT-SNAPSHOT',
    'Canvas project snapshot',
    'SYS-WEB-VIEW-CANVAS',
    'REL-WEB-CANVAS-VIEW-CONTAINS-PROJECT-SNAPSHOT',
    'module',
    'application',
    'Frontend / Canvas',
    'apps/web/src/app/views/canvas/canvasProjectSnapshot.ts',
    'Canvas project lifecycle, snapshot import/read model, and project explorer dialog',
    'browser',
    'medium',
    'CanvasProjectSnapshot',
    'ImportCanvasProjectSnapshot;ReadCanvasProjectSnapshot;OpenCanvasProjectExplorer',
    'Owns Canvas project lifecycle, snapshot import/read model, and project explorer dialog.',
    'Keep project canvas lifecycle and snapshot import/export read models cohesive.',
    'Project snapshot, project explorer, or canvas project lifecycle changes.',
    'repository',
    array['ImportCanvasProjectSnapshot', 'ReadCanvasProjectSnapshot']::text[],
    array[
      'apps/web/src/app/views/canvas/canvasProject*',
      'apps/web/src/app/views/canvas/CanvasProject*'
    ]::text[],
    'TEST-WEB-CANVAS-PROJECT-SNAPSHOT',
    'apps/web/src/app/views/canvas/canvasProjectSnapshot.test.ts',
    'unit',
    'behavior',
    'pnpm --filter @dvt/web test:unit:run -- src/app/views/canvas/canvasProjectSnapshot.test.ts'
  ),
  (
    'SYS-WEB-CANVAS-DIALOGS-RECOVERY-PLAYGROUND',
    'Canvas dialogs recovery playground',
    'SYS-WEB-CANVAS-CONTEXTUAL-WORKBENCH',
    'REL-WEB-CANVAS-CONTEXTUAL-WORKBENCH-CONTAINS-DIALOGS-RECOVERY-PLAYGROUND',
    'ui-view',
    'ui',
    'Frontend / Canvas',
    'apps/web/src/app/views/canvas/CanvasModalHost.tsx',
    'Canvas modal host, settings dialog, recovery banner, playground tabs, and workbench log surfaces',
    'browser',
    'medium',
    'CanvasDialogsRecoveryPlayground',
    'RenderCanvasModalHost;RecoverCanvasDraft;RenderCanvasPlayground',
    'Owns Canvas modal host, settings dialog, recovery banner, playground tabs, and workbench log surfaces.',
    'Coordinate contextual dialogs, recovery UI, playground tab state, and workbench log presentation.',
    'Modal host, settings, recovery banner, playground, or workbench log changes.',
    'application_shell',
    array['RenderCanvasModalHost', 'RecoverCanvasDraft', 'RenderCanvasPlayground']::text[],
    array[
      'apps/web/src/app/views/canvas/CanvasModal*',
      'apps/web/src/app/views/canvas/canvasModal*',
      'apps/web/src/app/views/canvas/CanvasSettings*',
      'apps/web/src/app/views/canvas/CanvasRecovery*',
      'apps/web/src/app/views/canvas/canvasRecovery*',
      'apps/web/src/app/views/canvas/CanvasPlayground*',
      'apps/web/src/app/views/canvas/canvasPlayground*',
      'apps/web/src/app/views/canvas/canvasWorkbench*',
      'apps/web/src/app/views/canvas/CanvasWorkbench*',
      'apps/web/src/app/views/canvas/useCanvasPlaygroundTabStripPresenter*'
    ]::text[],
    'TEST-WEB-CANVAS-DIALOGS-RECOVERY-PLAYGROUND',
    'apps/web/src/app/views/canvas/CanvasModalHost.architecture.test.tsx',
    'architecture',
    'boundary',
    'pnpm --filter @dvt/web test:architecture:run -- src/app/views/canvas/CanvasModalHost.architecture.test.tsx'
  ),
  (
    'SYS-WEB-CANVAS-CONTEXT-MENU-CORE',
    'Canvas context menu core',
    'SYS-WEB-CANVAS-CANVAS-CONTEXT-MENU',
    'REL-WEB-CANVAS-CONTEXT-MENU-CONTAINS-CORE',
    'ui-view',
    'ui',
    'Frontend / Canvas',
    'apps/web/src/app/views/canvas/CanvasContextMenuView.tsx',
    'Canvas context menu primitives, view, presenter hook, and lifecycle/action tests',
    'browser',
    'medium',
    'CanvasContextMenuCore',
    'RenderCanvasContextMenu;PresentCanvasContextMenuActions',
    'Owns Canvas context menu primitives, view, presenter hook, and lifecycle/action tests.',
    'Keep context menu presentation and presenter actions together under the contextual workbench.',
    'Context menu primitive, presenter, action, lifecycle, or menu view changes.',
    'presentation_model',
    array['RenderCanvasContextMenu', 'PresentCanvasContextMenuActions']::text[],
    array[
      'apps/web/src/app/views/canvas/CanvasContextMenu*',
      'apps/web/src/app/views/canvas/useCanvasContextMenu*'
    ]::text[],
    'TEST-WEB-CANVAS-CONTEXT-MENU-CORE',
    'apps/web/src/app/views/canvas/CanvasContextMenuView.test.tsx',
    'unit',
    'behavior',
    'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/CanvasContextMenuView.test.tsx'
  ),
  (
    'SYS-WEB-CANVAS-CONTROLLER-INTERACTION',
    'Canvas controller interaction',
    'SYS-WEB-VIEW-CANVAS',
    'REL-WEB-CANVAS-VIEW-CONTAINS-CONTROLLER-INTERACTION',
    'module',
    'application',
    'Frontend / Canvas',
    'apps/web/src/app/views/canvas/useCanvasController.ts',
    'Canvas controller read model, route interaction, mutation handlers, layout/selection handlers, overlay model, and controller test harness',
    'browser',
    'high',
    'CanvasControllerInteraction',
    'ReadCanvasController;ApplyCanvasMutation;SelectCanvasInteraction',
    'Owns Canvas controller read model, route interaction, mutation handlers, layout/selection handlers, overlay model, and controller test harness.',
    'Coordinate controller state, interaction commands, mutations, layout, navigation, selection, overlay, and plan action handling.',
    'Canvas controller wiring, mutation handling, layout persistence, selection sync, overlay, or navigation action changes.',
    'application_controller',
    array['ReadCanvasController', 'ApplyCanvasMutation', 'SelectCanvasInteraction']::text[],
    array[
      'apps/web/src/app/views/canvas/canvasController*',
      'apps/web/src/app/views/canvas/useCanvasController*',
      'apps/web/src/app/views/canvas/useCanvasStoreFacade*',
      'apps/web/src/app/views/canvas/canvasBackendPosture*',
      'apps/web/src/app/views/canvas/canvasCanonicalSnapshot*',
      'apps/web/src/app/views/canvas/canvasConnectionAggregate*',
      'apps/web/src/app/views/canvas/canvasHostCycleState*',
      'apps/web/src/app/views/canvas/canvasImpactOverlay*',
      'apps/web/src/app/views/canvas/canvasInteractionCommandSurface*',
      'apps/web/src/app/views/canvas/canvasKindRegistration*',
      'apps/web/src/app/views/canvas/canvasMutation*',
      'apps/web/src/app/views/canvas/useCanvasMutation*',
      'apps/web/src/app/views/canvas/canvasLayout*',
      'apps/web/src/app/views/canvas/useCanvasLayout*',
      'apps/web/src/app/views/canvas/useCanvasNavigation*',
      'apps/web/src/app/views/canvas/useCanvasSelection*',
      'apps/web/src/app/views/canvas/useCanvasOverlayModel*',
      'apps/web/src/app/views/canvas/canvasOverlayContext*',
      'apps/web/src/app/views/canvas/useCanvasPlanActionHandler*',
      'apps/web/src/app/views/canvas/canvasPlanAction*',
      'apps/web/src/app/views/canvas/canvasPlanReadiness*',
      'apps/web/src/app/views/canvas/canvasPalette*',
      'apps/web/src/app/views/canvas/canvasTemplatePresentation*',
      'apps/web/src/app/views/canvas/canvasGitProvenance*',
      'apps/web/src/app/views/canvas/canvasPreviewProvenance*',
      'apps/web/src/app/views/canvas/useCanvasCurrentDraftPayload*'
    ]::text[],
    'TEST-WEB-CANVAS-CONTROLLER-INTERACTION',
    'apps/web/src/app/views/canvas/useCanvasController.core.test.tsx',
    'unit',
    'behavior',
    'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/useCanvasController.core.test.tsx'
  );

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
  'PLANNING-DB-WEB-CANVAS-RESIDUAL-SPLIT-20260618',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Web Canvas residual component split',
  'Architecture / Planning DB / Frontend',
  'review',
  'SYS-WEB-VIEW-CANVAS-RESIDUAL-SURFACES retained most flat Canvas route files. This design creates semantic filesystem-backed Canvas child components so component-profile can answer files, tests, rails, DDD/Fowler basis, and relationships without a side inventory.',
  'responsibility_overload',
  'CreateGovernanceComponent;RecordArchitectureComponent;RecordArchitectureRelation;RecordArchitectureTestEvidence;CheckPlanningDbComponentIntegrity',
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
select
  'PLANNING-DB-WEB-CANVAS-RESIDUAL-SPLIT-20260618',
  scope.subject_kind,
  scope.subject_id,
  scope.scope_kind,
  true
from (
  select 'component'::text as subject_kind, component_id as subject_id, 'may_create'::text as scope_kind
  from web_canvas_residual_component_split
  union all
  select 'component', 'SYS-WEB-VIEW-CANVAS-RESIDUAL-SURFACES', 'may_update'
  union all
  select 'path', 'apps/web/src/app/views/canvas/%', 'may_update'
  union all
  select 'relation', relation_id, 'may_create'
  from web_canvas_residual_component_split
  union all
  select 'test', test_id, 'may_create'
  from web_canvas_residual_component_split
) scope
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
select
  component_id,
  'planning_query_store.governance_component_local_definitions',
  md5(component_id || ':166') || md5(name || ':166'),
  0,
  name,
  'component',
  parent_id,
  'SYS-DVT',
  'SYS-DVT',
  'review',
  false,
  owned_concern,
  ddd_owner,
  cq_rails,
  'codex'
from web_canvas_residual_component_split
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
select
  component_id,
  'owns',
  own.pattern,
  own.pattern_order - 1
from web_canvas_residual_component_split
cross join lateral unnest(owns) with ordinality as own(pattern, pattern_order)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
select
  item.component_id,
  item.item_kind,
  item.item_value,
  item.item_order
from (
  select component_id, 'responsibility' as item_kind, responsibility as item_value, 0 as item_order
  from web_canvas_residual_component_split
  union all
  select component_id, 'reason_to_change', reason_to_change, 0
  from web_canvas_residual_component_split
  union all
  select
    component_id,
    'invariant',
    component_id || ' files must not remain owned by SYS-WEB-VIEW-CANVAS-RESIDUAL-SURFACES.',
    0
  from web_canvas_residual_component_split
  union all
  select
    component_id,
    'transition',
    'review -> implemented after component-profile shows matched files and component-integrity remains clean.',
    0
  from web_canvas_residual_component_split
  union all
  select component_id, 'consumer', 'planning:db:query component-profile', 0
  from web_canvas_residual_component_split
  union all
  select
    component_id,
    'governance_ref',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    0
  from web_canvas_residual_component_split
  union all
  select component_id, 'fowler_signal', fowler_signal, 0
  from web_canvas_residual_component_split
  union all
  select component_id, 'public_api', api.value, api.item_order - 1
  from web_canvas_residual_component_split
  cross join lateral unnest(public_api) with ordinality as api(value, item_order)
) item
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
select
  component_id,
  name,
  architecture_kind,
  architecture_layer,
  architecture_owner,
  repo_path,
  public_contract,
  runtime,
  criticality,
  'review',
  parent_id
from web_canvas_residual_component_split
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
select
  'RESP-' || component_id,
  component_id,
  responsibility,
  reason_to_change,
  ddd_owner,
  'proposed'
from web_canvas_residual_component_split
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
select
  relation_id,
  parent_id,
  component_id,
  'contains',
  'outbound',
  'sync',
  null,
  'not_applicable',
  'internal-ui-component-ownership',
  '["docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md"]'::jsonb,
  'implemented'
from web_canvas_residual_component_split
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
select
  test_id,
  component_id,
  test_path,
  test_kind,
  coverage_level,
  true,
  validation_command
from web_canvas_residual_component_split
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

drop table if exists pg_temp.web_canvas_residual_component_split;
