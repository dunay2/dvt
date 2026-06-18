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
