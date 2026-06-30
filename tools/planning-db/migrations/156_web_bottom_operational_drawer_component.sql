-- Canonicalize the shell bottom surface as an operational drawer. The old
-- BottomConsoleDrawer vocabulary is retired so Canvas-first diagnostics stay
-- aligned with the bottom Log / Problems / Runs / Preview work surface.

alter table planning_query_store.frontend_components
  drop constraint if exists frontend_components_kind_check;

alter table planning_query_store.frontend_components
  add constraint frontend_components_kind_check
  check (component_kind in (
    'shell-frame',
    'shell-bar',
    'navigation',
    'health-banner',
    'console-drawer',
    'operational-drawer',
    'route-workbench',
    'route-toolbar',
    'state-view',
    'canvas-viewport',
    'canvas-explorer',
    'canvas-inspector',
    'modal',
    'form',
    'query-view',
    'table',
    'tab-strip',
    'primary-surface',
    'context-panel',
    'icon-wrapper'
  ));

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
  'WEB-BOTTOM-OPERATIONAL-DRAWER-20260618',
  'UXDB-BOTTOM-OPERATIONAL-DRAWER-P0-1',
  'Web bottom operational drawer vocabulary',
  'Frontend / Architecture / Planning DB',
  'review',
  'The Canvas-first specification moves logs, problems, runs, and execution preview into a bottom operational drawer. BottomConsoleDrawer duplicated outdated console vocabulary and hid the multi-panel product boundary behind a single-purpose implementation name.',
  'published_language',
  'GetRunEvents;BuildBottomOperationalDrawerLogModel;ResolveOperationalDrawerContribution',
  null
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  updated_at = now();

insert into planning_query_store.frontend_components (
  component_id,
  component_name,
  component_kind,
  component_status,
  reuse_decision,
  frontend_owner,
  responsibility,
  package_name,
  route_scope,
  plugin_scope,
  capability_gaps,
  evidence_refs,
  source_path,
  source_content_sha256,
  raw_component
)
select
  'web.component.shell.BottomOperationalDrawer',
  'BottomOperationalDrawer',
  'operational-drawer',
  'current',
  'harden',
  'Authenticated shell root',
  'Render the bottom operational drawer that hosts Log, Problems, Runs, and Preview without owning route navigation.',
  '@dvt/web',
  '/',
  'monitoring',
  '[]'::jsonb,
  jsonb_build_array(
    'pnpm --filter @dvt/web test:presentation:run -- src/app/components/shell/BottomOperationalDrawer.test.tsx src/app/components/shell/OperationalDrawerPanels.test.tsx',
    'pnpm --filter @dvt/web test:architecture:run -- src/app/components/shell/OperationalDrawerPanels.architecture.test.ts'
  ),
  'tools/planning-db/migrations/156_web_bottom_operational_drawer_component.sql',
  coalesce(
    (
      select file_ref.content_hash
      from planning_query_store.governance_files file_ref
      where file_ref.path = 'apps/web/src/app/components/shell/BottomOperationalDrawer.tsx'
    ),
    repeat('0', 64)
  ),
  jsonb_build_object(
    'deprecatedComponentId', 'web.component.shell.BottomConsoleDrawer',
    'canonicalBoundary', 'BottomOperationalDrawer',
    'tabs', jsonb_build_array('log', 'problems', 'runs', 'preview')
  )
on conflict (component_id) do update set
  component_name = excluded.component_name,
  component_kind = excluded.component_kind,
  component_status = excluded.component_status,
  reuse_decision = excluded.reuse_decision,
  frontend_owner = excluded.frontend_owner,
  responsibility = excluded.responsibility,
  route_scope = excluded.route_scope,
  plugin_scope = excluded.plugin_scope,
  capability_gaps = excluded.capability_gaps,
  evidence_refs = excluded.evidence_refs,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  raw_component = excluded.raw_component,
  imported_at = now();

insert into planning_query_store.frontend_mechanical_truth_surfaces (
  surface_id,
  surface_kind,
  route_path,
  screen_state,
  frontend_owner,
  registered_plugins,
  consumed_endpoints,
  zustand_stores,
  tanstack_queries,
  visible_no_backend_affordances,
  capability_gaps,
  evidence_refs,
  source_path,
  source_content_sha256,
  raw_surface
)
select
  'web.shell.root',
  'route',
  '/',
  'operational-product',
  'Authenticated shell root',
  jsonb_build_array('dbt', 'dvt-warehouse-source', 'dvt', 'monitoring', 'cost'),
  jsonb_build_array(
    '/session',
    '/workspace/context',
    '/capabilities',
    '/healthz',
    '/readyz',
    '/version',
    '/db/ready'
  ),
  jsonb_build_array(
    'useSessionStore',
    'useAuthorizationStore',
    'usePlatformConnectionStore',
    'useUiLayoutStore'
  ),
  jsonb_build_array(
    'useCapabilitiesQuery',
    'useRuntimeCapabilitiesQuery',
    'usePlatformHealthSnapshotQuery'
  ),
  jsonb_build_array('workspace menu', 'view menu', 'shell health banner'),
  '[]'::jsonb,
  jsonb_build_array('docs/architecture/components/web/frontend-mechanical-truth-inventory.md'),
  'docs/architecture/components/web/frontend-mechanical-truth-inventory.md',
  coalesce(
    (
      select file_ref.content_hash
      from planning_query_store.governance_files file_ref
      where file_ref.path = 'docs/architecture/components/web/frontend-mechanical-truth-inventory.md'
    ),
    repeat('0', 64)
  ),
  jsonb_build_object('ensuredBy', '156_web_bottom_operational_drawer_component')
on conflict (surface_id) do update set
  surface_kind = excluded.surface_kind,
  route_path = excluded.route_path,
  screen_state = excluded.screen_state,
  frontend_owner = excluded.frontend_owner,
  registered_plugins = excluded.registered_plugins,
  consumed_endpoints = excluded.consumed_endpoints,
  zustand_stores = excluded.zustand_stores,
  tanstack_queries = excluded.tanstack_queries,
  visible_no_backend_affordances = excluded.visible_no_backend_affordances,
  capability_gaps = excluded.capability_gaps,
  evidence_refs = excluded.evidence_refs,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  raw_surface = planning_query_store.frontend_mechanical_truth_surfaces.raw_surface || excluded.raw_surface,
  imported_at = now();

insert into planning_query_store.frontend_surface_component_links (
  component_id,
  surface_id,
  route_path,
  placement_kind,
  placement_order,
  raw_link
)
values (
  'web.component.shell.BottomOperationalDrawer',
  'web.shell.root',
  '/',
  'bottom-drawer',
  90,
  jsonb_build_object('replaces', 'web.component.shell.BottomConsoleDrawer')
)
on conflict (component_id, surface_id, placement_kind) do update set
  route_path = excluded.route_path,
  placement_order = excluded.placement_order,
  raw_link = excluded.raw_link;

insert into planning_query_store.frontend_component_files (
  component_id,
  file_path,
  file_role,
  exported_symbol,
  raw_file
)
values
  (
    'web.component.shell.BottomOperationalDrawer',
    'apps/web/src/app/components/shell/BottomOperationalDrawer.tsx',
    'component',
    'BottomOperationalDrawer',
    jsonb_build_object('replaces', 'apps/web/src/app/components/Console.tsx')
  ),
  (
    'web.component.shell.BottomOperationalDrawer',
    'apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.ts',
    'model',
    'buildBottomOperationalDrawerLogModel',
    jsonb_build_object('replaces', 'apps/web/src/app/components/shell/bottomConsoleDrawerModel.ts')
  ),
  (
    'web.component.shell.BottomOperationalDrawer',
    'apps/web/src/app/components/shell/OperationalDrawerPanels.tsx',
    'component',
    'BottomOperationalDrawerBody',
    jsonb_build_object('panelBoundary', 'Log/Problems/Runs/Preview')
  ),
  (
    'web.component.shell.BottomOperationalDrawer',
    'apps/web/src/app/components/shell/BottomOperationalDrawer.test.tsx',
    'test',
    null,
    jsonb_build_object('coverage', 'component behavior')
  ),
  (
    'web.component.shell.BottomOperationalDrawer',
    'apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.test.ts',
    'test',
    null,
    jsonb_build_object('coverage', 'model states')
  ),
  (
    'web.component.shell.BottomOperationalDrawer',
    'apps/web/src/app/components/shell/OperationalDrawerPanels.test.tsx',
    'test',
    null,
    jsonb_build_object('coverage', 'panel presentation')
  ),
  (
    'web.component.shell.BottomOperationalDrawer',
    'apps/web/src/app/components/shell/OperationalDrawerPanels.architecture.test.ts',
    'architecture-test',
    null,
    jsonb_build_object('coverage', 'canonical vocabulary and primitive composition')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file;

insert into planning_query_store.frontend_component_cq_rails (
  component_id,
  rail_name,
  rail_kind,
  rail_status,
  raw_rail
)
values
  (
    'web.component.shell.BottomOperationalDrawer',
    'GetRunEvents',
    'query',
    'implemented-api',
    jsonb_build_object('purpose', 'Observe live run event lines for the Log tab')
  ),
  (
    'web.component.shell.BottomOperationalDrawer',
    'BuildBottomOperationalDrawerLogModel',
    'local-query',
    'implemented-local',
    jsonb_build_object('symbol', 'buildBottomOperationalDrawerLogModel')
  ),
  (
    'web.component.shell.BottomOperationalDrawer',
    'ResolveOperationalDrawerContribution',
    'local-query',
    'implemented-local',
    jsonb_build_object('symbol', 'useOperationalDrawerContributionStore')
  )
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = excluded.raw_rail;

insert into planning_query_store.frontend_component_evidence (
  evidence_id,
  component_id,
  evidence_kind,
  evidence_ref,
  evidence_status,
  raw_evidence
)
values
  (
    'EV-WEB-BOTTOM-OPERATIONAL-DRAWER-PRESENTATION',
    'web.component.shell.BottomOperationalDrawer',
    'test',
    'pnpm --filter @dvt/web test:presentation:run -- src/app/components/shell/BottomOperationalDrawer.test.tsx src/app/components/shell/OperationalDrawerPanels.test.tsx src/app/components/shell/AppShellFrame.test.tsx src/app/Root.shellChrome.test.tsx src/app/views/canvas/useCanvasExecutionActions.runStartSuccess.test.tsx',
    'passing',
    '{}'::jsonb
  ),
  (
    'EV-WEB-BOTTOM-OPERATIONAL-DRAWER-ARCHITECTURE',
    'web.component.shell.BottomOperationalDrawer',
    'test',
    'pnpm --filter @dvt/web test:architecture:run -- src/app/components/shell/OperationalDrawerPanels.architecture.test.ts src/app/views/runs/runsDomainBoundary.architecture.test.ts',
    'passing',
    '{}'::jsonb
  )
on conflict (evidence_id) do update set
  component_id = excluded.component_id,
  evidence_kind = excluded.evidence_kind,
  evidence_ref = excluded.evidence_ref,
  evidence_status = excluded.evidence_status,
  raw_evidence = excluded.raw_evidence;

update planning_query_store.frontend_components
set
  component_status = 'retire',
  reuse_decision = 'retire',
  raw_component = raw_component || jsonb_build_object(
    'replacedBy',
    'web.component.shell.BottomOperationalDrawer',
    'retiredBy',
    '156_web_bottom_operational_drawer_component'
  ),
  imported_at = now()
where component_id = 'web.component.shell.BottomConsoleDrawer';

delete from planning_query_store.frontend_components
where component_id = 'web.component.shell.BottomConsoleDrawer';

update architecture.component
set
  name = 'Web bottom operational drawer components',
  repo_path = 'apps/web/src/app/components/shell/BottomOperationalDrawer.tsx',
  public_contract = 'Bottom operational drawer for Log, Problems, Runs, and Preview. Xterm live-log rendering remains an internal implementation detail of the Log tab.',
  status = 'implemented',
  updated_at = now()
where component_id = 'SYS-WEB-APP-COMPONENTS-CONSOLE';

insert into architecture.component_test (
  test_id,
  component_id,
  test_path,
  test_kind,
  coverage_level,
  required,
  validation_command
)
values (
  'TEST-SYS-WEB-APP-COMPONENTS-OPERATIONAL-DRAWER',
  'SYS-WEB-APP-COMPONENTS-CONSOLE',
  'apps/web/src/app/components/shell/OperationalDrawerPanels.architecture.test.ts',
  'architecture',
  'boundary',
  true,
  'pnpm --filter @dvt/web test:architecture:run -- src/app/components/shell/OperationalDrawerPanels.architecture.test.ts'
)
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

with drawer_feature_common as (
  select
    jsonb_build_array(
      'docs/architecture/components/web/frontend-component-inventory.md',
      'docs/architecture/components/web/frontend-mechanical-truth-inventory.md'
    ) as component_guides,
    jsonb_build_array(
      'docs/architecture/components/web/frontend-mechanical-truth-inventory.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md'
    ) as governing_sources,
    jsonb_build_array(
      'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
      'apps/web/cypress/e2e/shell/shell-layout-contract.cy.ts',
      'apps/web/src/app/Root.shellChrome.test.tsx',
      'apps/web/src/app/Root.test.support.tsx',
      'apps/web/src/app/Root.tsx',
      'apps/web/src/app/components/Console.test.tsx',
      'apps/web/src/app/components/Console.tsx',
      'apps/web/src/app/components/TopAppBar.tsx',
      'apps/web/src/app/components/shell/AppShellFrame.test.tsx',
      'apps/web/src/app/components/shell/AppShellFrame.tsx',
      'apps/web/src/app/components/shell/BottomOperationalDrawer.test.tsx',
      'apps/web/src/app/components/shell/BottomOperationalDrawer.tsx',
      'apps/web/src/app/components/shell/OperationalDrawerPanelPrimitives.tsx',
      'apps/web/src/app/components/shell/OperationalDrawerPanels.architecture.test.ts',
      'apps/web/src/app/components/shell/OperationalDrawerPanels.test.tsx',
      'apps/web/src/app/components/shell/ShellMenu.tsx',
      'apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.test.ts',
      'apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.ts',
      'apps/web/src/app/components/shell/chrome.ts',
      'apps/web/src/app/components/shell/copy.ts',
      'apps/web/src/app/components/shell/shellViewControlsModel.test.ts',
      'apps/web/src/app/components/shell/shellViewControlsModel.ts',
      'apps/web/src/app/stores/uiLayoutStore.test.ts',
      'apps/web/src/app/stores/uiLayoutStore.ts',
      'apps/web/src/app/views/canvas/canvasExecutionActions.types.ts',
      'apps/web/src/app/views/canvas/useCanvasController.test.stateFactory.ts',
      'apps/web/src/app/views/canvas/useCanvasController.ts',
      'apps/web/src/app/views/canvas/useCanvasExecutionActions.runStartSuccess.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasExecutionActions.test.support.tsx',
      'apps/web/src/app/views/canvas/useCanvasExecutionActions.ts',
      'apps/web/src/app/views/canvas/useCanvasRunStartHandler.ts',
      'apps/web/src/app/views/canvas/useCanvasStoreFacade.ts',
      'apps/web/src/app/views/runs/runsDomainBoundary.architecture.test.ts',
      'docs/architecture/components/web/appshell/app-shell.md',
      'docs/architecture/components/web/frontend-component-inventory.md',
      'docs/architecture/components/web/main-workspace-views-and-ux.md',
      'docs/architecture/components/web/runs/dvt-runs-frontend-architecture.md',
      'docs/architecture/components/web/runs/frontend-runtime-contract-technical-manual.md',
      'docs/architecture/components/web/runs/run-event-timeline-component.md',
      'docs/architecture/components/web/screen-layout-and-cross-surface-behavior-rules.md',
      'docs/architecture/components/web/web-store-domain-ownership-component.md',
      'docs/architecture/components/web/workbench-ui-contract-and-component-inventory.md',
      'scripts/planning-db-integrity-check.cjs',
      'scripts/planning-db-integrity-check.test.cjs',
      'scripts/planning-db-frontend-component-inventory.test.cjs',
      'scripts/planning-db/frontend-component-inventory.cjs',
      'tools/planning-db/migrations/156_web_bottom_operational_drawer_component.sql',
      'buzon/TAREA.TXT'
    ) as allowed_surfaces,
    jsonb_build_array(
      'apps/web/src/app/components/shell/bottomConsoleDrawerModel.ts'
    ) as forbidden_surfaces,
    jsonb_build_array(
      'published_language',
      'duplicate_semantics',
      'test_harness_overload'
    ) as fowler_signals,
    jsonb_build_array(
      'pnpm --filter @dvt/web test:architecture:run -- src/app/components/shell/OperationalDrawerPanels.architecture.test.ts',
      'pnpm docs:feature-mechanization:implementation'
    ) as architecture_guards,
    jsonb_build_array(
      'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
      'apps/web/cypress/e2e/shell/shell-layout-contract.cy.ts'
    ) as cypress_flows,
    jsonb_build_array(
      'pnpm --filter @dvt/web test:unit:run -- src/app/components/shell/bottomOperationalDrawerLogModel.test.ts src/app/stores/uiLayoutStore.test.ts',
      'pnpm --filter @dvt/web test:presentation:run -- src/app/components/shell/BottomOperationalDrawer.test.tsx src/app/components/shell/OperationalDrawerPanels.test.tsx src/app/components/shell/AppShellFrame.test.tsx src/app/Root.shellChrome.test.tsx src/app/views/canvas/useCanvasExecutionActions.runStartSuccess.test.tsx',
      'pnpm --filter @dvt/web test:architecture:run -- src/app/components/shell/OperationalDrawerPanels.architecture.test.ts src/app/views/runs/runsDomainBoundary.architecture.test.ts',
      'node --test scripts/planning-db-frontend-component-inventory.test.cjs',
      'pnpm --filter @dvt/web typecheck',
      'pnpm --filter @dvt/web lint',
      'pnpm governance:refresh',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ) as completion_gate
),
drawer_feature_rails as (
  select
    'local#UXDB-BOTTOM-OPERATIONAL-DRAWER-P0-1#query#renderbottomoperationaldrawer' as rail_id,
    'UXDB-BOTTOM-OPERATIONAL-DRAWER-P0-1' as feature_id,
    'implemented' as mechanization_status,
    'RenderBottomOperationalDrawer' as rail_name,
    'renderbottomoperationaldrawer' as normalized_rail_name,
    'query' as rail_type,
    'web.shell.BottomOperationalDrawer' as ddd_owner,
    'implemented' as rail_status,
    jsonb_build_array(
      'apps/web/src/app/components/shell/BottomOperationalDrawer.tsx#BottomOperationalDrawer',
      'apps/web/src/app/components/shell/BottomOperationalDrawer.tsx#BottomOperationalLogBody',
      'apps/web/src/app/components/shell/BottomOperationalDrawer.tsx#XtermConsole',
      'apps/web/src/app/components/shell/chrome.ts#bottomOperationalDrawerClasses'
    ) as symbol_refs,
    jsonb_build_array(
      'apps/web/src/app/components/shell/BottomOperationalDrawer.tsx#BottomOperationalDrawer',
      'apps/web/src/app/components/shell/BottomOperationalDrawer.tsx#BottomOperationalLogBody',
      'apps/web/src/app/components/shell/BottomOperationalDrawer.tsx#XtermConsole',
      'apps/web/src/app/components/shell/chrome.ts#bottomOperationalDrawerClasses'
    ) as implementation_refs,
    jsonb_build_array('docs/architecture/components/web/frontend-component-inventory.md') as documentation_refs,
    common.governing_sources,
    common.allowed_surfaces,
    common.architecture_guards,
    common.completion_gate,
    'apps/web/src/app/components/shell/BottomOperationalDrawer.tsx' as source_path,
    '5c33793cff0c5f9db700d84f21fb4ec76c8d18819185e6371b3b2de0c98bc0f1' as source_content_sha256,
    jsonb_build_object(
      'name', 'RenderBottomOperationalDrawer',
      'type', 'query',
      'dddOwner', 'web.shell.BottomOperationalDrawer',
      'status', 'implemented'
    ) as raw_rail,
    jsonb_build_object(
      'version', 1,
      'featureId', 'UXDB-BOTTOM-OPERATIONAL-DRAWER-P0-1',
      'mechanizationStatus', 'implemented',
      'noHumanDecisionsRemaining', true,
      'implementationPlan', 'DB-first shell drawer canonicalization replaces legacy console vocabulary with the bottom operational drawer component boundary.',
      'componentGuides', common.component_guides,
      'userStories', jsonb_build_array('Bottom operational drawer'),
      'governingSources', common.governing_sources,
      'allowedImplementationSurfaces', common.allowed_surfaces,
      'forbiddenImplementationSurfaces', common.forbidden_surfaces,
      'domainObjects', jsonb_build_array('BottomOperationalDrawer'),
      'fowlerSignals', common.fowler_signals,
      'architectureGuards', common.architecture_guards,
      'cypressFlows', common.cypress_flows,
      'completionGate', common.completion_gate,
      'commandQueryRails', jsonb_build_array(jsonb_build_object(
        'name', 'RenderBottomOperationalDrawer',
        'type', 'query',
        'dddOwner', 'web.shell.BottomOperationalDrawer',
        'status', 'implemented'
      )),
      'redGreenCycles', jsonb_build_array(jsonb_build_object(
        'id', 'renderbottomoperationaldrawer-record',
        'redTest', 'pnpm docs:feature-mechanization:implementation',
        'expectedFailure', 'Undeclared BottomOperationalDrawer presentation symbols are rejected.',
        'patchSurfaces', jsonb_build_array(
          'apps/web/src/app/components/shell/BottomOperationalDrawer.tsx',
          'apps/web/src/app/components/shell/OperationalDrawerPanelPrimitives.tsx',
          'tools/planning-db/migrations/156_web_bottom_operational_drawer_component.sql'
        ),
        'greenTest', 'pnpm docs:feature-mechanization:implementation'
      )),
      'symbols', jsonb_build_array(
        jsonb_build_object(
          'name', 'BottomOperationalDrawer',
          'path', 'apps/web/src/app/components/shell/BottomOperationalDrawer.tsx',
          'dddOwner', 'web.shell.BottomOperationalDrawer',
          'cqRails', jsonb_build_array('RenderBottomOperationalDrawer'),
          'fowlerSignals', jsonb_build_array('published_language'),
          'architectureGuard', 'pnpm --filter @dvt/web test:architecture:run -- src/app/components/shell/OperationalDrawerPanels.architecture.test.ts',
          'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
          'unitTests', jsonb_build_array('pnpm --filter @dvt/web test:presentation:run -- src/app/components/shell/BottomOperationalDrawer.test.tsx')
        ),
        jsonb_build_object(
          'name', 'BottomOperationalLogBody',
          'path', 'apps/web/src/app/components/shell/BottomOperationalDrawer.tsx',
          'dddOwner', 'web.shell.BottomOperationalDrawer',
          'cqRails', jsonb_build_array('RenderBottomOperationalDrawer'),
          'fowlerSignals', jsonb_build_array('published_language'),
          'architectureGuard', 'pnpm --filter @dvt/web test:architecture:run -- src/app/components/shell/OperationalDrawerPanels.architecture.test.ts',
          'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
          'unitTests', jsonb_build_array('pnpm --filter @dvt/web test:presentation:run -- src/app/components/shell/BottomOperationalDrawer.test.tsx')
        ),
        jsonb_build_object(
          'name', 'XtermConsole',
          'path', 'apps/web/src/app/components/shell/BottomOperationalDrawer.tsx',
          'dddOwner', 'web.shell.BottomOperationalDrawer',
          'cqRails', jsonb_build_array('RenderBottomOperationalDrawer'),
          'fowlerSignals', jsonb_build_array('published_language'),
          'architectureGuard', 'pnpm --filter @dvt/web test:architecture:run -- src/app/components/shell/OperationalDrawerPanels.architecture.test.ts',
          'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
          'unitTests', jsonb_build_array('pnpm --filter @dvt/web test:presentation:run -- src/app/components/shell/BottomOperationalDrawer.test.tsx')
        ),
        jsonb_build_object(
          'name', 'bottomOperationalDrawerClasses',
          'path', 'apps/web/src/app/components/shell/chrome.ts',
          'dddOwner', 'web.shell.BottomOperationalDrawer',
          'cqRails', jsonb_build_array('RenderBottomOperationalDrawer'),
          'fowlerSignals', jsonb_build_array('published_language'),
          'architectureGuard', 'pnpm --filter @dvt/web test:architecture:run -- src/app/components/shell/OperationalDrawerPanels.architecture.test.ts',
          'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
          'unitTests', jsonb_build_array('pnpm --filter @dvt/web test:presentation:run -- src/app/components/shell/BottomOperationalDrawer.test.tsx')
        )
      )
    ) as raw_manifest,
    0 as revision,
    'codex' as created_by
  from drawer_feature_common common

  union all

  select
    'local#UXDB-BOTTOM-OPERATIONAL-DRAWER-P0-1#query#buildbottomoperationaldrawerlogmodel',
    'UXDB-BOTTOM-OPERATIONAL-DRAWER-P0-1',
    'implemented',
    'BuildBottomOperationalDrawerLogModel',
    'buildbottomoperationaldrawerlogmodel',
    'query',
    'web.shell.BottomOperationalDrawer',
    'implemented',
    jsonb_build_array(
      'apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.ts#BottomOperationalDrawerLogModel',
      'apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.ts#BottomOperationalDrawerLogModelBase',
      'apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.ts#BuildBottomOperationalDrawerLogModelInput',
      'apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.ts#buildBottomOperationalDrawerLogModel'
    ),
    jsonb_build_array(
      'apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.ts#BottomOperationalDrawerLogModel',
      'apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.ts#BottomOperationalDrawerLogModelBase',
      'apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.ts#BuildBottomOperationalDrawerLogModelInput',
      'apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.ts#buildBottomOperationalDrawerLogModel'
    ),
    jsonb_build_array('docs/architecture/components/web/frontend-component-inventory.md'),
    common.governing_sources,
    common.allowed_surfaces,
    common.architecture_guards,
    common.completion_gate,
    'apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.ts',
    '9ca3fecf251a9b38e73c1e808b9c88d6037c21c3d252e2a2658fb1599c9d40bd',
    jsonb_build_object(
      'name', 'BuildBottomOperationalDrawerLogModel',
      'type', 'query',
      'dddOwner', 'web.shell.BottomOperationalDrawer',
      'status', 'implemented'
    ),
    jsonb_build_object(
      'version', 1,
      'featureId', 'UXDB-BOTTOM-OPERATIONAL-DRAWER-P0-1',
      'mechanizationStatus', 'implemented',
      'noHumanDecisionsRemaining', true,
      'implementationPlan', 'DB-first shell drawer canonicalization exposes the log tab as a named read model instead of console-specific UI state.',
      'componentGuides', common.component_guides,
      'userStories', jsonb_build_array('Bottom operational drawer log'),
      'governingSources', common.governing_sources,
      'allowedImplementationSurfaces', common.allowed_surfaces,
      'forbiddenImplementationSurfaces', common.forbidden_surfaces,
      'domainObjects', jsonb_build_array('BottomOperationalDrawerLogModel'),
      'fowlerSignals', common.fowler_signals,
      'architectureGuards', common.architecture_guards,
      'cypressFlows', common.cypress_flows,
      'completionGate', common.completion_gate,
      'commandQueryRails', jsonb_build_array(jsonb_build_object(
        'name', 'BuildBottomOperationalDrawerLogModel',
        'type', 'query',
        'dddOwner', 'web.shell.BottomOperationalDrawer',
        'status', 'implemented'
      )),
      'redGreenCycles', jsonb_build_array(jsonb_build_object(
        'id', 'buildbottomoperationaldrawerlogmodel-record',
        'redTest', 'pnpm docs:feature-mechanization:implementation',
        'expectedFailure', 'Undeclared bottom operational drawer log model symbols are rejected.',
        'patchSurfaces', jsonb_build_array(
          'apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.ts',
          'tools/planning-db/migrations/156_web_bottom_operational_drawer_component.sql'
        ),
        'greenTest', 'pnpm docs:feature-mechanization:implementation'
      )),
      'symbols', jsonb_build_array(
        jsonb_build_object(
          'name', 'BottomOperationalDrawerLogModel',
          'path', 'apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.ts',
          'dddOwner', 'web.shell.BottomOperationalDrawer',
          'cqRails', jsonb_build_array('BuildBottomOperationalDrawerLogModel'),
          'fowlerSignals', jsonb_build_array('published_language'),
          'architectureGuard', 'pnpm --filter @dvt/web test:architecture:run -- src/app/components/shell/OperationalDrawerPanels.architecture.test.ts',
          'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
          'unitTests', jsonb_build_array('pnpm --filter @dvt/web test:unit:run -- src/app/components/shell/bottomOperationalDrawerLogModel.test.ts')
        ),
        jsonb_build_object(
          'name', 'BottomOperationalDrawerLogModelBase',
          'path', 'apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.ts',
          'dddOwner', 'web.shell.BottomOperationalDrawer',
          'cqRails', jsonb_build_array('BuildBottomOperationalDrawerLogModel'),
          'fowlerSignals', jsonb_build_array('published_language'),
          'architectureGuard', 'pnpm --filter @dvt/web test:architecture:run -- src/app/components/shell/OperationalDrawerPanels.architecture.test.ts',
          'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
          'unitTests', jsonb_build_array('pnpm --filter @dvt/web test:unit:run -- src/app/components/shell/bottomOperationalDrawerLogModel.test.ts')
        ),
        jsonb_build_object(
          'name', 'BuildBottomOperationalDrawerLogModelInput',
          'path', 'apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.ts',
          'dddOwner', 'web.shell.BottomOperationalDrawer',
          'cqRails', jsonb_build_array('BuildBottomOperationalDrawerLogModel'),
          'fowlerSignals', jsonb_build_array('published_language'),
          'architectureGuard', 'pnpm --filter @dvt/web test:architecture:run -- src/app/components/shell/OperationalDrawerPanels.architecture.test.ts',
          'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
          'unitTests', jsonb_build_array('pnpm --filter @dvt/web test:unit:run -- src/app/components/shell/bottomOperationalDrawerLogModel.test.ts')
        ),
        jsonb_build_object(
          'name', 'buildBottomOperationalDrawerLogModel',
          'path', 'apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.ts',
          'dddOwner', 'web.shell.BottomOperationalDrawer',
          'cqRails', jsonb_build_array('BuildBottomOperationalDrawerLogModel'),
          'fowlerSignals', jsonb_build_array('published_language'),
          'architectureGuard', 'pnpm --filter @dvt/web test:architecture:run -- src/app/components/shell/OperationalDrawerPanels.architecture.test.ts',
          'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
          'unitTests', jsonb_build_array('pnpm --filter @dvt/web test:unit:run -- src/app/components/shell/bottomOperationalDrawerLogModel.test.ts')
        )
      )
    ),
    0,
    'codex'
  from drawer_feature_common common

  union all

  select
    'local#UXDB-BOTTOM-OPERATIONAL-DRAWER-P0-1#command#revealstartedrunoperations',
    'UXDB-BOTTOM-OPERATIONAL-DRAWER-P0-1',
    'implemented',
    'RevealStartedRunOperations',
    'revealstartedrunoperations',
    'command',
    'web.canvas.execution',
    'implemented',
    jsonb_build_array(
      'apps/web/src/app/views/canvas/useCanvasRunStartHandler.ts#revealStartedRunOperations',
      'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts#closeRunOperationsIfOpen',
      'apps/web/src/app/Root.test.support.tsx#setRootShellBottomDrawer'
    ),
    jsonb_build_array(
      'apps/web/src/app/views/canvas/useCanvasRunStartHandler.ts#revealStartedRunOperations',
      'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts#closeRunOperationsIfOpen',
      'apps/web/src/app/Root.test.support.tsx#setRootShellBottomDrawer'
    ),
    jsonb_build_array('docs/architecture/components/web/frontend-component-inventory.md'),
    common.governing_sources,
    common.allowed_surfaces,
    common.architecture_guards,
    common.completion_gate,
    'apps/web/src/app/views/canvas/useCanvasRunStartHandler.ts',
    '56d8efa815eb31295c92808c824e0da3e844e60adc5f098ac0fc9f41e4106596',
    jsonb_build_object(
      'name', 'RevealStartedRunOperations',
      'type', 'command',
      'dddOwner', 'web.canvas.execution',
      'status', 'implemented'
    ),
    jsonb_build_object(
      'version', 1,
      'featureId', 'UXDB-BOTTOM-OPERATIONAL-DRAWER-P0-1',
      'mechanizationStatus', 'implemented',
      'noHumanDecisionsRemaining', true,
      'implementationPlan', 'DB-first shell drawer canonicalization routes started-run feedback into the bottom operational drawer.',
      'componentGuides', common.component_guides,
      'userStories', jsonb_build_array('Run operations drawer'),
      'governingSources', common.governing_sources,
      'allowedImplementationSurfaces', common.allowed_surfaces,
      'forbiddenImplementationSurfaces', common.forbidden_surfaces,
      'domainObjects', jsonb_build_array('CanvasRunStartOperations'),
      'fowlerSignals', common.fowler_signals,
      'architectureGuards', common.architecture_guards,
      'cypressFlows', common.cypress_flows,
      'completionGate', common.completion_gate,
      'commandQueryRails', jsonb_build_array(jsonb_build_object(
        'name', 'RevealStartedRunOperations',
        'type', 'command',
        'dddOwner', 'web.canvas.execution',
        'status', 'implemented'
      )),
      'redGreenCycles', jsonb_build_array(jsonb_build_object(
        'id', 'revealstartedrunoperations-record',
        'redTest', 'pnpm docs:feature-mechanization:implementation',
        'expectedFailure', 'Undeclared run operations drawer action symbols are rejected.',
        'patchSurfaces', jsonb_build_array(
          'apps/web/src/app/views/canvas/useCanvasRunStartHandler.ts',
          'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
          'apps/web/src/app/Root.test.support.tsx',
          'tools/planning-db/migrations/156_web_bottom_operational_drawer_component.sql'
        ),
        'greenTest', 'pnpm docs:feature-mechanization:implementation'
      )),
      'symbols', jsonb_build_array(
        jsonb_build_object(
          'name', 'revealStartedRunOperations',
          'path', 'apps/web/src/app/views/canvas/useCanvasRunStartHandler.ts',
          'dddOwner', 'web.canvas.execution',
          'cqRails', jsonb_build_array('RevealStartedRunOperations'),
          'fowlerSignals', jsonb_build_array('published_language'),
          'architectureGuard', 'pnpm --filter @dvt/web test:architecture:run -- src/app/components/shell/OperationalDrawerPanels.architecture.test.ts',
          'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
          'unitTests', jsonb_build_array('pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/useCanvasExecutionActions.runStartSuccess.test.tsx')
        ),
        jsonb_build_object(
          'name', 'closeRunOperationsIfOpen',
          'path', 'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
          'dddOwner', 'web.canvas.execution',
          'cqRails', jsonb_build_array('RevealStartedRunOperations'),
          'fowlerSignals', jsonb_build_array('published_language'),
          'architectureGuard', 'pnpm --filter @dvt/web test:architecture:run -- src/app/components/shell/OperationalDrawerPanels.architecture.test.ts',
          'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
          'unitTests', jsonb_build_array('pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/useCanvasExecutionActions.runStartSuccess.test.tsx')
        ),
        jsonb_build_object(
          'name', 'setRootShellBottomDrawer',
          'path', 'apps/web/src/app/Root.test.support.tsx',
          'dddOwner', 'web.canvas.execution',
          'cqRails', jsonb_build_array('RevealStartedRunOperations'),
          'fowlerSignals', jsonb_build_array('published_language'),
          'architectureGuard', 'pnpm --filter @dvt/web test:architecture:run -- src/app/components/shell/OperationalDrawerPanels.architecture.test.ts',
          'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
          'unitTests', jsonb_build_array('pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/useCanvasExecutionActions.runStartSuccess.test.tsx')
        )
      )
    ),
    0,
    'codex'
  from drawer_feature_common common
)
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
select
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
  allowed_surfaces,
  architecture_guards,
  completion_gate,
  source_path,
  source_content_sha256,
  raw_rail,
  raw_manifest,
  revision,
  created_by
from drawer_feature_rails
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
