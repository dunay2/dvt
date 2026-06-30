-- Split the broad Web Canvas shell chrome bucket into responsibility leaves.
-- These files are active shell and route presentation assets; old or
-- nonfunctional files require explicit deprecation evidence before they can be
-- marked deprecated.

drop table if exists pg_temp.web_canvas_shell_chrome_leaf_map;
drop table if exists pg_temp.web_canvas_shell_chrome_dependency_map;

create temporary table web_canvas_shell_chrome_leaf_map (
  component_id text primary key,
  name text not null,
  ddd_owner text not null,
  cq_rails text not null,
  owned_concern text not null,
  responsibility text not null,
  reason_to_change text not null,
  invariant text not null,
  repo_path text not null,
  public_contract text not null,
  fowler_signal text not null,
  public_api text[] not null,
  owns text[] not null,
  test_paths text[] not null,
  test_kind text not null,
  coverage_level text not null,
  validation_command text not null,
  port_name text not null,
  port_kind text not null,
  negative_tests text[] not null,
  maturity_score numeric not null,
  criticality text not null,
  relation_suffix text not null
);

create temporary table web_canvas_shell_chrome_dependency_map (
  source_component_id text not null,
  target_component_id text not null,
  relation_id text primary key,
  contract_id text,
  failure_mode text not null
);

insert into web_canvas_shell_chrome_leaf_map (
  component_id,
  name,
  ddd_owner,
  cq_rails,
  owned_concern,
  responsibility,
  reason_to_change,
  invariant,
  repo_path,
  public_contract,
  fowler_signal,
  public_api,
  owns,
  test_paths,
  test_kind,
  coverage_level,
  validation_command,
  port_name,
  port_kind,
  negative_tests,
  maturity_score,
  criticality,
  relation_suffix
)
values
  (
    'SYS-WEB-CANVAS-SHELL-CENTER-SURFACE',
    'Canvas shell center surface',
    'CanvasShellCenterSurface',
    'ReadCanvasShellCenterSurface;RenderCanvasWorkbenchSurface',
    'Owns the Canvas center-surface rendering adapter, transport fallback surface, workbench surface selection, and center-surface types.',
    'Render the correct Canvas center surface from route state and workbench state without owning graph authority, draft persistence, or route shell composition.',
    'Center-surface transport, startup, graph workbench, host-cycle workbench, or surface type changes.',
    'Center surface code must remain a presentation adapter over route state and graph/workbench inputs; it must not define controller, draft, or graph command semantics.',
    'apps/web/src/app/views/canvas/CanvasCenterSurface.tsx',
    'Canvas shell center-surface presentation contract.',
    'presentation_model',
    array['renderCanvasCenterSurface', 'renderCanvasDraftTransportSurface', 'renderCanvasWorkbenchSurface']::text[],
    array[
      'apps/web/src/app/views/canvas/CanvasCenterSurface.architecture.test.ts',
      'apps/web/src/app/views/canvas/canvasCenterSurfaceTransport.tsx',
      'apps/web/src/app/views/canvas/CanvasCenterSurface.tsx',
      'apps/web/src/app/views/canvas/canvasCenterSurface.types.ts',
      'apps/web/src/app/views/canvas/canvasCenterSurfaceWorkbench.tsx'
    ]::text[],
    array['apps/web/src/app/views/canvas/CanvasCenterSurface.architecture.test.ts']::text[],
    'architecture',
    'boundary',
    'pnpm --filter @dvt/web test:architecture:run -- src/app/views/canvas/CanvasCenterSurface.architecture.test.ts',
    'ReadCanvasShellCenterSurface',
    'query',
    array['transport posture hidden', 'workbench state bypass', 'center surface owns graph commands']::text[],
    82,
    'high',
    'CENTER-SURFACE'
  ),
  (
    'SYS-WEB-CANVAS-SHELL-ROUTE-STATE',
    'Canvas shell route state',
    'CanvasShellRouteStateReadModel',
    'ReadCanvasRouteViewState;ReadCanvasRouteInteractionState;SyncCanvasRoutePresentation',
    'Owns Canvas route interaction state, route view state, posture priority, state view rendering, and route presentation sync.',
    'Derive route-safe presentation and interaction posture from controller, access, and runtime facts without coupling shell chrome to controller internals.',
    'Route view state, route interaction state, route posture priority, CanvasStateViews, or route presentation sync changes.',
    'Route state remains a read-model boundary and must not start runs, mutate drafts, register menu items, or bypass controller permissions.',
    'apps/web/src/app/views/canvas/canvasRouteViewState.ts',
    'Canvas route view and interaction state read-model contract.',
    'published_language',
    array['deriveCanvasRouteViewState', 'deriveCanvasRouteInteractionState', 'useCanvasRoutePresentationSync', 'CanvasStateViews']::text[],
    array[
      'apps/web/src/app/views/canvas/canvasRouteInteractionState.test.ts',
      'apps/web/src/app/views/canvas/canvasRouteInteractionState.ts',
      'apps/web/src/app/views/canvas/canvasRoutePosturePriority.architecture.test.ts',
      'apps/web/src/app/views/canvas/canvasRouteViewState.architecture.test.ts',
      'apps/web/src/app/views/canvas/canvasRouteViewState.test.ts',
      'apps/web/src/app/views/canvas/canvasRouteViewState.ts',
      'apps/web/src/app/views/canvas/CanvasStateViews.test.tsx',
      'apps/web/src/app/views/canvas/CanvasStateViews.tsx',
      'apps/web/src/app/views/canvas/useCanvasRoutePresentationSync.ts'
    ]::text[],
    array[
      'apps/web/src/app/views/canvas/canvasRouteInteractionState.test.ts',
      'apps/web/src/app/views/canvas/canvasRoutePosturePriority.architecture.test.ts',
      'apps/web/src/app/views/canvas/canvasRouteViewState.architecture.test.ts',
      'apps/web/src/app/views/canvas/canvasRouteViewState.test.ts',
      'apps/web/src/app/views/canvas/CanvasStateViews.test.tsx'
    ]::text[],
    'unit',
    'behavior',
    'pnpm --filter @dvt/web test:canvas-unit:run -- src/app/views/canvas/canvasRouteViewState.test.ts src/app/views/canvas/canvasRouteInteractionState.test.ts && pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/CanvasStateViews.test.tsx',
    'ReadCanvasRouteViewState',
    'query',
    array['permission posture ignored', 'startup block hidden', 'route sync mutates draft state']::text[],
    84,
    'critical',
    'ROUTE-STATE'
  ),
  (
    'SYS-WEB-CANVAS-SHELL-COMPOSITION-BUILDERS',
    'Canvas shell composition builders',
    'CanvasShellCompositionBuilder',
    'ComposeCanvasShellChrome;BuildCanvasShellProps;ReadCanvasShellContract',
    'Owns the Canvas shell component, main panel, grouped shell contracts, route-owned props builder, layout/panels builders, and shell chrome tokens.',
    'Compose the grouped Canvas shell contract from route state, center surface, graph surface, menu contributions, and operational surfaces.',
    'Shell contract, shell props, layout builder, panels builder, main panel composition, chrome token, or shell architecture changes.',
    'Composition builders may assemble shell props and layout only; domain behavior remains in controller, draft, graph, menu, and execution components.',
    'apps/web/src/app/views/canvas/CanvasShell.tsx',
    'Canvas shell grouped composition contract.',
    'application_service',
    array['CanvasShell', 'CanvasShellMainPanel', 'buildCanvasShellProps', 'buildCanvasShellLayout', 'buildCanvasShellPanels']::text[],
    array[
      'apps/web/src/app/views/canvas/canvasChromeTokens.ts',
      'apps/web/src/app/views/canvas/CanvasShell.architecture.test.tsx',
      'apps/web/src/app/views/canvas/canvasShellBuilder.types.architecture.test.ts',
      'apps/web/src/app/views/canvas/canvasShellBuilder.types.ts',
      'apps/web/src/app/views/canvas/canvasShellLayoutBuilder.tsx',
      'apps/web/src/app/views/canvas/CanvasShellMainPanel.tsx',
      'apps/web/src/app/views/canvas/canvasShellPanelsBuilder.test.ts',
      'apps/web/src/app/views/canvas/canvasShellPanelsBuilder.ts',
      'apps/web/src/app/views/canvas/canvasShellPropsBuilder.architecture.test.ts',
      'apps/web/src/app/views/canvas/canvasShellPropsBuilder.tsx',
      'apps/web/src/app/views/canvas/CanvasShell.tsx',
      'apps/web/src/app/views/canvas/canvasShell.types.architecture.test.ts',
      'apps/web/src/app/views/canvas/canvasShell.types.ts'
    ]::text[],
    array[
      'apps/web/src/app/views/canvas/CanvasShell.architecture.test.tsx',
      'apps/web/src/app/views/canvas/canvasShellBuilder.types.architecture.test.ts',
      'apps/web/src/app/views/canvas/canvasShellPanelsBuilder.test.ts',
      'apps/web/src/app/views/canvas/canvasShellPropsBuilder.architecture.test.ts',
      'apps/web/src/app/views/canvas/canvasShell.types.architecture.test.ts'
    ]::text[],
    'architecture',
    'boundary',
    'pnpm --filter @dvt/web test:architecture:run -- src/app/views/canvas/CanvasShell.architecture.test.tsx src/app/views/canvas/canvasShellBuilder.types.architecture.test.ts src/app/views/canvas/canvasShellPropsBuilder.architecture.test.ts src/app/views/canvas/canvasShell.types.architecture.test.ts && pnpm --filter @dvt/web test:canvas-unit:run -- src/app/views/canvas/canvasShellPanelsBuilder.test.ts',
    'ComposeCanvasShellChrome',
    'command',
    array['ungrouped shell contract', 'route view bypass', 'builder owns domain commands']::text[],
    86,
    'critical',
    'COMPOSITION-BUILDERS'
  ),
  (
    'SYS-WEB-CANVAS-SHELL-GRAPH-COMMANDS',
    'Canvas shell graph command adapters',
    'CanvasShellGraphCommandAdapter',
    'ResolveCanvasShellGraphSurface;BuildCanvasShellGraphCommands;BuildCanvasShellChromeCommands',
    'Owns shell graph/chrome state and command builder adapters plus the graph surface shell integration proof.',
    'Adapt controller command and graph surface facts into the grouped shell graph and chrome command contracts without creating new graph or controller authority.',
    'Shell graph builder, graph command builder, chrome state builder, chrome command builder, or graph-surface shell integration changes.',
    'Graph/chrome builders must delegate graph behavior to graph-surface and controller command components; they must not create parallel graph mutation rails.',
    'apps/web/src/app/views/canvas/canvasShellGraphBuilder.ts',
    'Canvas shell graph and chrome command adapter contract.',
    'anti_corruption_layer',
    array['buildCanvasShellGraph', 'buildCanvasShellGraphCommands', 'buildCanvasShellChromeState', 'buildCanvasShellChromeCommands']::text[],
    array[
      'apps/web/src/app/views/canvas/canvasShellChromeCommandsBuilder.ts',
      'apps/web/src/app/views/canvas/canvasShellChromeStateBuilder.ts',
      'apps/web/src/app/views/canvas/canvasShellGraphBuilder.ts',
      'apps/web/src/app/views/canvas/canvasShellGraphCommandsBuilder.ts',
      'apps/web/src/app/views/canvas/CanvasShell.graphSurface.test.tsx'
    ]::text[],
    array['apps/web/src/app/views/canvas/CanvasShell.graphSurface.test.tsx']::text[],
    'unit',
    'behavior',
    'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/CanvasShell.graphSurface.test.tsx',
    'ResolveCanvasShellGraphSurface',
    'query',
    array['graph command bypass', 'source import command duplicated', 'chrome state owns runtime policy']::text[],
    82,
    'high',
    'GRAPH-COMMANDS'
  ),
  (
    'SYS-WEB-CANVAS-SHELL-MENU-CONTRIBUTIONS',
    'Canvas shell menu and drawer contributions',
    'CanvasShellMenuContributionAdapter',
    'RegisterCanvasViewMenuContribution;RegisterCanvasWorkspaceMenuContribution;ResolveOperationalDrawerContribution',
    'Owns Canvas view/workspace menu contribution stores and controls plus shell context menu and operational drawer integration tests.',
    'Register Canvas-specific menu and operational drawer contributions through shell-owned contribution surfaces without duplicating context menu or drawer rendering semantics.',
    'View menu controls, workspace menu controls, contribution store, context menu integration, or operational drawer registration changes.',
    'Menu and drawer contribution code must register contributions only; context menu semantics and shared drawer rendering remain owned by their existing components.',
    'apps/web/src/app/views/canvas/CanvasWorkspaceMenuControls.tsx',
    'Canvas shell menu and operational contribution adapter contract.',
    'boundary_drift',
    array['CanvasViewMenuContributionRegistrar', 'CanvasWorkspaceMenuContributionRegistrar', 'CanvasWorkspaceMenuControls', 'CanvasViewMenuControls']::text[],
    array[
      'apps/web/src/app/views/canvas/CanvasShell.contextMenuIntegration.test.tsx',
      'apps/web/src/app/views/canvas/CanvasShell.operationalDrawer.test.tsx',
      'apps/web/src/app/views/canvas/canvasViewMenuContributionStore.ts',
      'apps/web/src/app/views/canvas/CanvasViewMenuControls.tsx',
      'apps/web/src/app/views/canvas/canvasWorkspaceMenuContributionStore.ts',
      'apps/web/src/app/views/canvas/CanvasWorkspaceMenuControls.test.tsx',
      'apps/web/src/app/views/canvas/CanvasWorkspaceMenuControls.tsx'
    ]::text[],
    array[
      'apps/web/src/app/views/canvas/CanvasShell.contextMenuIntegration.test.tsx',
      'apps/web/src/app/views/canvas/CanvasShell.operationalDrawer.test.tsx',
      'apps/web/src/app/views/canvas/CanvasWorkspaceMenuControls.test.tsx'
    ]::text[],
    'unit',
    'negative',
    'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/CanvasShell.contextMenuIntegration.test.tsx src/app/views/canvas/CanvasShell.operationalDrawer.test.tsx src/app/views/canvas/CanvasWorkspaceMenuControls.test.tsx',
    'RegisterCanvasShellMenuContribution',
    'command',
    array['context menu rail duplicated', 'drawer rendering owned by route', 'workspace switch command without scope']::text[],
    82,
    'high',
    'MENU-CONTRIBUTIONS'
  );

insert into web_canvas_shell_chrome_dependency_map (
  source_component_id,
  target_component_id,
  relation_id,
  contract_id,
  failure_mode
)
values
  (
    'SYS-WEB-CANVAS-SHELL-CENTER-SURFACE',
    'SYS-WEB-CANVAS-SHELL-ROUTE-STATE',
    'REL-WEB-CANVAS-SHELL-CENTER-SURFACE-DEPENDS-ON-ROUTE-STATE',
    'CONTRACT-SYS-WEB-CANVAS-SHELL-ROUTE-STATE-SURFACE',
    'Center surface rendering can hide route posture if it stops depending on route state.'
  ),
  (
    'SYS-WEB-CANVAS-SHELL-CENTER-SURFACE',
    'SYS-WEB-CANVAS-GRAPH-SURFACE',
    'REL-WEB-CANVAS-SHELL-CENTER-SURFACE-DEPENDS-ON-GRAPH-SURFACE',
    null,
    'Center surface can become graph authority if graph surface ownership is not declared.'
  ),
  (
    'SYS-WEB-CANVAS-SHELL-ROUTE-STATE',
    'SYS-WEB-CANVAS-CONTROLLER-HOOK-CORE',
    'REL-WEB-CANVAS-SHELL-ROUTE-STATE-DEPENDS-ON-CONTROLLER-HOOK',
    'CONTRACT-SYS-WEB-CANVAS-CONTROLLER-HOOK-CORE-SURFACE',
    'Route state can duplicate controller semantics if the controller hook relation is missing.'
  ),
  (
    'SYS-WEB-CANVAS-SHELL-ROUTE-STATE',
    'SYS-WEB-CANVAS-DRAFT-ACCESS-POSTURE',
    'REL-WEB-CANVAS-SHELL-ROUTE-STATE-DEPENDS-ON-DRAFT-ACCESS',
    null,
    'Route state can expose editing controls while access posture is denied if the relation is missing.'
  ),
  (
    'SYS-WEB-CANVAS-SHELL-COMPOSITION-BUILDERS',
    'SYS-WEB-CANVAS-SHELL-CENTER-SURFACE',
    'REL-WEB-CANVAS-SHELL-COMPOSITION-DEPENDS-ON-CENTER-SURFACE',
    'CONTRACT-SYS-WEB-CANVAS-SHELL-CENTER-SURFACE-SURFACE',
    'Shell composition can inline center-surface logic if the center-surface relation is missing.'
  ),
  (
    'SYS-WEB-CANVAS-SHELL-COMPOSITION-BUILDERS',
    'SYS-WEB-CANVAS-SHELL-GRAPH-COMMANDS',
    'REL-WEB-CANVAS-SHELL-COMPOSITION-DEPENDS-ON-GRAPH-COMMANDS',
    'CONTRACT-SYS-WEB-CANVAS-SHELL-GRAPH-COMMANDS-SURFACE',
    'Shell composition can duplicate graph command assembly if the graph command adapter relation is missing.'
  ),
  (
    'SYS-WEB-CANVAS-SHELL-COMPOSITION-BUILDERS',
    'SYS-WEB-CANVAS-SHELL-MENU-CONTRIBUTIONS',
    'REL-WEB-CANVAS-SHELL-COMPOSITION-DEPENDS-ON-MENU-CONTRIBUTIONS',
    'CONTRACT-SYS-WEB-CANVAS-SHELL-MENU-CONTRIBUTIONS-SURFACE',
    'Shell composition can own menu registrations directly if the menu contribution relation is missing.'
  ),
  (
    'SYS-WEB-CANVAS-SHELL-GRAPH-COMMANDS',
    'SYS-WEB-CANVAS-CONTROLLER-COMMAND-SURFACE',
    'REL-WEB-CANVAS-SHELL-GRAPH-COMMANDS-DEPENDS-ON-CONTROLLER-COMMAND-SURFACE',
    null,
    'Graph command builders can create parallel command rails if controller command surface ownership is not declared.'
  ),
  (
    'SYS-WEB-CANVAS-SHELL-GRAPH-COMMANDS',
    'SYS-WEB-CANVAS-GRAPH-SURFACE',
    'REL-WEB-CANVAS-SHELL-GRAPH-COMMANDS-DEPENDS-ON-GRAPH-SURFACE',
    null,
    'Graph command builders can drift from graph surface rendering if this relation is missing.'
  ),
  (
    'SYS-WEB-CANVAS-SHELL-MENU-CONTRIBUTIONS',
    'SYS-WEB-CANVAS-CANVAS-CONTEXT-MENU',
    'REL-WEB-CANVAS-SHELL-MENU-CONTRIBUTIONS-DEPENDS-ON-CONTEXT-MENU',
    null,
    'Menu contribution controls can duplicate context menu semantics if this relation is missing.'
  ),
  (
    'SYS-WEB-CANVAS-SHELL-MENU-CONTRIBUTIONS',
    'SYS-WEB-APP-COMPONENTS-CONSOLE',
    'REL-WEB-CANVAS-SHELL-MENU-CONTRIBUTIONS-DEPENDS-ON-SHELL-DRAWER',
    null,
    'Canvas can duplicate shell drawer rendering semantics if drawer ownership is not declared.'
  ),
  (
    'SYS-WEB-CANVAS-SHELL-MENU-CONTRIBUTIONS',
    'SYS-WEB-CANVAS-OPERATIONAL-DRAWER-CONTRIBUTION',
    'REL-WEB-CANVAS-SHELL-MENU-CONTRIBUTIONS-DEPENDS-ON-OPERATIONAL-DRAWER-CONTRIBUTION',
    'CONTRACT-SYS-WEB-CANVAS-OPERATIONAL-DRAWER-CONTRIBUTION-SURFACE',
    'Menu and drawer registrations can drift from Canvas readiness and run contribution facts.'
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
  'PLANNING-DB-WEB-CANVAS-SHELL-CHROME-LEAF-COMPONENTS-20260619',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Web Canvas shell chrome leaf component mapping',
  'Architecture / Planning DB / Web Canvas',
  'review',
  'SYS-WEB-CANVAS-SHELL-CHROME owned 39 active shell files directly across center-surface rendering, route state, grouped shell composition, graph/chrome command adapters, and menu/drawer contribution responsibilities. This migration keeps the existing component as the aggregate shell chrome boundary and maps concrete files to responsibility-owned leaves with component graph relations, ports, contracts, tests, observability, and Fowler/DDD basis.',
  'responsibility_overload',
  'ReadComponentProfile;ValidateComponentIntegrity;ComposeCanvasShellChrome;ReadCanvasRouteViewState;RegisterCanvasShellMenuContribution',
  null
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
select distinct
  'PLANNING-DB-WEB-CANVAS-SHELL-CHROME-LEAF-COMPONENTS-20260619',
  scope.subject_kind,
  scope.subject_id,
  scope.scope_kind,
  true
from (
  select 'component'::text, 'SYS-WEB-CANVAS-SHELL-CHROME'::text, 'may_update'::text
  union all
  select 'component', 'SYS-WEB-CANVAS-SHELL-MAIN-PANEL', 'may_reference'
  union all
  select 'path', 'apps/web/src/app/views/canvas/CanvasShell%', 'may_update'
  union all
  select 'path', 'apps/web/src/app/views/canvas/canvasShell%', 'may_update'
  union all
  select 'component', component_id, 'may_create'
  from web_canvas_shell_chrome_leaf_map
  union all
  select 'component', target_component_id, 'may_reference'
  from web_canvas_shell_chrome_dependency_map
  union all
  select 'path', pattern, 'may_update'
  from web_canvas_shell_chrome_leaf_map
  cross join lateral unnest(owns) as owned(pattern)
) scope(subject_kind, subject_id, scope_kind)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update planning_query_store.governance_components component
set
  children_required = true,
  cq_rails = 'ComposeCanvasShellChrome;ReadCanvasShellCenterSurface;ReadCanvasRouteViewState;ResolveCanvasShellGraphSurface;RegisterCanvasShellMenuContribution',
  fowler_signals = jsonb_build_array('responsibility_overload', 'component_split', 'presentation_model'),
  raw_component = component.raw_component || jsonb_build_object(
    'childrenRequired',
    true,
    'cqRails',
    'ComposeCanvasShellChrome;ReadCanvasShellCenterSurface;ReadCanvasRouteViewState;ResolveCanvasShellGraphSurface;RegisterCanvasShellMenuContribution',
    'reconciledBy',
    '219_web_canvas_shell_chrome_leaf_components',
    'ownedConcern',
    'Owns the aggregate Web Canvas shell chrome boundary; concrete shell files resolve to responsibility-owned child components.'
  )
where component.component_id = 'SYS-WEB-CANVAS-SHELL-CHROME';

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
values (
  'SYS-WEB-CANVAS-SHELL-CHROME',
  'tools/planning-db/migrations/219_web_canvas_shell_chrome_leaf_components.sql',
  md5('SYS-WEB-CANVAS-SHELL-CHROME:219') || md5('web-canvas-shell-chrome-parent:219'),
  0,
  'Canvas shell chrome',
  'component',
  'SYS-WEB-CANVAS-SHELL-MAIN-PANEL',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  true,
  'Owns the aggregate Web Canvas shell chrome boundary; concrete shell files resolve to responsibility-owned child components.',
  'CanvasShellChrome',
  'ComposeCanvasShellChrome;ReadCanvasShellCenterSurface;ReadCanvasRouteViewState;ResolveCanvasShellGraphSurface;RegisterCanvasShellMenuContribution',
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
  'tools/planning-db/migrations/219_web_canvas_shell_chrome_leaf_components.sql',
  md5(component_id || ':219') || md5(repo_path || cq_rails || ':web-canvas-shell-chrome-leaf'),
  0,
  name,
  'component',
  'SYS-WEB-CANVAS-SHELL-CHROME',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  false,
  owned_concern,
  ddd_owner,
  cq_rails,
  'codex'
from web_canvas_shell_chrome_leaf_map
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
from web_canvas_shell_chrome_leaf_map
cross join lateral unnest(owns) with ordinality as own(pattern, pattern_order)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
select
  'SYS-WEB-CANVAS-SHELL-CHROME',
  'excludes',
  child_owns.pattern,
  child_owns.pattern_order - 1
from web_canvas_shell_chrome_leaf_map
cross join lateral unnest(owns) with ordinality as child_owns(pattern, pattern_order)
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
  values
    (
      'SYS-WEB-CANVAS-SHELL-CHROME',
      'responsibility',
      'Own the aggregate Web Canvas shell chrome boundary and delegate concrete shell files to center surface, route state, composition builder, graph command adapter, and menu contribution leaves.',
      0
    ),
    (
      'SYS-WEB-CANVAS-SHELL-CHROME',
      'reason_to_change',
      'Canvas shell chrome taxonomy, child component ownership, shell command/query rail grouping, or component hierarchy changes.',
      0
    ),
    (
      'SYS-WEB-CANVAS-SHELL-CHROME',
      'invariant',
      'The aggregate must own no concrete apps/web/src/app/views/canvas shell chrome files directly once shell chrome leaves are applied.',
      0
    ),
    (
      'SYS-WEB-CANVAS-SHELL-CHROME',
      'non_goal',
      'Do not deprecate active Canvas shell files merely to reduce direct-file count; nonfunctional files require explicit deprecation evidence.',
      0
    ),
    (
      'SYS-WEB-CANVAS-SHELL-CHROME',
      'governance_ref',
      'docs/architecture/components/web/graph/canvas-shell-component.md',
      0
    )
) item(component_id, item_kind, item_value, item_order)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

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
  from web_canvas_shell_chrome_leaf_map
  union all
  select component_id, 'reason_to_change', reason_to_change, 0
  from web_canvas_shell_chrome_leaf_map
  union all
  select component_id, 'invariant', invariant, 0
  from web_canvas_shell_chrome_leaf_map
  union all
  select component_id, 'transition', 'review -> implemented after component-quality shows SYS-WEB-CANVAS-SHELL-CHROME owns no direct shell files and leaf validation commands pass.', 0
  from web_canvas_shell_chrome_leaf_map
  union all
  select component_id, 'consumer', 'Canvas route maintainers, shell reviewers, Planning DB component-profile readers, component-integrity, and changed-slice checks', 0
  from web_canvas_shell_chrome_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md', 0
  from web_canvas_shell_chrome_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/architecture/components/web/graph/canvas-shell-component.md', 1
  from web_canvas_shell_chrome_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/architecture/components/web/graph/canvas-route-presentation-component.md', 2
  from web_canvas_shell_chrome_leaf_map
  union all
  select component_id, 'fowler_signal', fowler_signal, 0
  from web_canvas_shell_chrome_leaf_map
  union all
  select component_id, 'public_api', api.value, api.item_order - 1
  from web_canvas_shell_chrome_leaf_map
  cross join lateral unnest(public_api) with ordinality as api(value, item_order)
) item
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update architecture.component
set
  kind = 'ui-view',
  layer = 'ui',
  owner = 'CanvasShellChrome',
  repo_path = 'docs/architecture/components/web/graph/canvas-shell-component.md',
  public_contract = 'Aggregate Web Canvas shell chrome boundary; concrete shell files are owned by shell chrome responsibility leaves.',
  runtime = 'browser',
  criticality = 'critical',
  status = 'review',
  maturity_score = greatest(coalesce(maturity_score, 0), 86),
  parent_component_id = 'SYS-WEB-CANVAS-SHELL-MAIN-PANEL',
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-SHELL-CHROME';

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
  maturity_score,
  parent_component_id
)
select
  component_id,
  name,
  'module',
  'ui',
  ddd_owner,
  repo_path,
  public_contract,
  'browser',
  criticality,
  'review',
  maturity_score,
  'SYS-WEB-CANVAS-SHELL-CHROME'
from web_canvas_shell_chrome_leaf_map
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
  maturity_score = excluded.maturity_score,
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
  'implemented'
from web_canvas_shell_chrome_leaf_map
union all
select
  'RESP-SYS-WEB-CANVAS-SHELL-CHROME',
  'SYS-WEB-CANVAS-SHELL-CHROME',
  'Own the aggregate Web Canvas shell chrome boundary and delegate concrete shell files to responsibility leaves.',
  'Canvas shell chrome taxonomy, child ownership, shell rail grouping, or component hierarchy changes.',
  'CanvasShellChrome',
  'implemented'
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

insert into architecture.contract (
  contract_id,
  contract_kind,
  owner_component_id,
  contract_ref,
  compatibility,
  status,
  validation_command
)
select
  'CONTRACT-' || component_id || '-SURFACE',
  'type',
  component_id,
  public_contract,
  'internal',
  'implemented',
  validation_command
from web_canvas_shell_chrome_leaf_map
on conflict (contract_id) do update set
  contract_kind = excluded.contract_kind,
  owner_component_id = excluded.owner_component_id,
  contract_ref = excluded.contract_ref,
  compatibility = excluded.compatibility,
  status = excluded.status,
  validation_command = excluded.validation_command;

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
  'REL-WEB-CANVAS-SHELL-CHROME-CONTAINS-' || relation_suffix,
  'SYS-WEB-CANVAS-SHELL-CHROME',
  component_id,
  'contains',
  'outbound',
  'build_time',
  null,
  'Component profile becomes incomplete if this Canvas shell chrome leaf is removed or remapped without a governed Planning DB component update.',
  'repo-local Web Canvas governance',
  jsonb_build_array(
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    repo_path
  ),
  'implemented'
from web_canvas_shell_chrome_leaf_map
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
  source_component_id,
  target_component_id,
  'depends_on',
  'outbound',
  'sync',
  contract_id,
  failure_mode,
  'browser-local Canvas shell chrome',
  jsonb_build_array(
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    'tools/planning-db/migrations/219_web_canvas_shell_chrome_leaf_components.sql'
  ),
  'implemented'
from web_canvas_shell_chrome_dependency_map
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

insert into architecture.component_port (
  port_id,
  component_id,
  port_name,
  port_kind,
  direction,
  input_contract_id,
  output_contract_id,
  negative_tests,
  status
)
select
  'PORT-' || component_id || '-' || upper(regexp_replace(port_name, '[^A-Za-z0-9]+', '-', 'g')),
  component_id,
  port_name,
  port_kind,
  'inbound',
  'CONTRACT-' || component_id || '-SURFACE',
  'CONTRACT-' || component_id || '-SURFACE',
  negative_tests,
  'implemented'
from web_canvas_shell_chrome_leaf_map
on conflict (port_id) do update set
  component_id = excluded.component_id,
  port_name = excluded.port_name,
  port_kind = excluded.port_kind,
  direction = excluded.direction,
  input_contract_id = excluded.input_contract_id,
  output_contract_id = excluded.output_contract_id,
  negative_tests = excluded.negative_tests,
  status = excluded.status;

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
  'TEST-' || component_id || '-' || test_path.test_order,
  component_id,
  test_path.path,
  test_kind,
  coverage_level,
  true,
  validation_command
from web_canvas_shell_chrome_leaf_map
cross join lateral unnest(test_paths) with ordinality as test_path(path, test_order)
union all
select
  'TEST-SYS-WEB-CANVAS-SHELL-CHROME-COMPONENT-PROFILE',
  'SYS-WEB-CANVAS-SHELL-CHROME',
  'scripts/planning-db-query.test.cjs',
  'architecture',
  'boundary',
  true,
  'pnpm planning:db:query component-quality --component SYS-WEB-CANVAS-SHELL-CHROME --no-refresh --limit 20 && pnpm planning:db:query files --component SYS-WEB-CANVAS-SHELL-CHROME --no-refresh --limit 20'
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

insert into architecture.component_observability (
  observability_id,
  component_id,
  signal_name,
  signal_kind,
  required,
  status
)
select
  'OBS-' || component_id || '-WEB-CANVAS-SHELL-CHROME',
  component_id,
  name || ' is observable through component-profile, component-quality, focused web tests, and Canvas shell route UI states.',
  'dashboard',
  true,
  'implemented'
from web_canvas_shell_chrome_leaf_map
union all
select
  'OBS-SYS-WEB-CANVAS-SHELL-CHROME-COMPONENT-QUALITY',
  'SYS-WEB-CANVAS-SHELL-CHROME',
  'Canvas shell chrome aggregate health is observable through component-quality direct-file count and child coverage.',
  'dashboard',
  true,
  'implemented'
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;

drop table if exists pg_temp.web_canvas_shell_chrome_dependency_map;
drop table if exists pg_temp.web_canvas_shell_chrome_leaf_map;
