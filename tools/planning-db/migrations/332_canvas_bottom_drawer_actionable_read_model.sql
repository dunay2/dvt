-- Register the Canvas bottom drawer actionable read-model slice against the
-- existing RenderBottomOperationalDrawer rail. This reinforces the canonical
-- drawer component instead of creating a parallel Canvas operations rail.

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
  'CANVAS-BOTTOM-DRAWER-ACTIONABLE-READ-MODEL-20260626',
  'E-CANVAS-BOTTOM-DRAWER-OPS-1',
  'Canvas bottom drawer actionable read model',
  'Frontend / Canvas',
  'implemented',
  'The bottom operational drawer owns readiness, runs and execution preview diagnostics. Canvas route posture is now projected through a presenter read model, while OperationalDrawerPanels remain presentation-only primitives that render actions and status summaries from the contribution contract.',
  'responsibility_overload',
  'RenderBottomOperationalDrawer',
  now()
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  approved_at = coalesce(architecture.design.approved_at, excluded.approved_at),
  updated_at = now();

insert into architecture.design_scope (
  design_id,
  subject_kind,
  subject_id,
  scope_kind,
  required
)
values
  (
    'CANVAS-BOTTOM-DRAWER-ACTIONABLE-READ-MODEL-20260626',
    'component',
    'web.component.shell.BottomOperationalDrawer',
    'may_update',
    true
  ),
  (
    'CANVAS-BOTTOM-DRAWER-ACTIONABLE-READ-MODEL-20260626',
    'query',
    'RenderBottomOperationalDrawer',
    'may_update',
    true
  ),
  (
    'CANVAS-BOTTOM-DRAWER-ACTIONABLE-READ-MODEL-20260626',
    'path',
    'apps/web/src/app/views/canvas/canvasOperationalDrawerContribution.ts',
    'may_create',
    true
  ),
  (
    'CANVAS-BOTTOM-DRAWER-ACTIONABLE-READ-MODEL-20260626',
    'path',
    'apps/web/src/app/views/canvas/canvasOperationalDrawerContribution.test.tsx',
    'may_create',
    true
  ),
  (
    'CANVAS-BOTTOM-DRAWER-ACTIONABLE-READ-MODEL-20260626',
    'path',
    'apps/web/src/app/components/shell/OperationalDrawerPanels.actions.test.tsx',
    'may_create',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

insert into planning_query_store.frontend_component_local_components (
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
values (
  'web.component.shell.BottomOperationalDrawer',
  'Bottom operational drawer',
  'console-drawer',
  'current',
  'harden',
  'Shell operations',
  'Render route-contributed Log, Problems, Runs and Preview panels from DB-mapped contribution read models without moving readiness diagnostics into Canvas top chrome.',
  '@dvt/web',
  '/canvas',
  'canvas',
  '[]'::jsonb,
  jsonb_build_array(
    'EV-WEB-BOTTOM-DRAWER-ACTION-PANELS',
    'EV-WEB-CANVAS-DRAWER-CONTRIBUTION-PRESENTER'
  ),
  'tools/planning-db/migrations/332_canvas_bottom_drawer_actionable_read_model.sql',
  md5('web.component.shell.BottomOperationalDrawer:332'),
  jsonb_build_object(
    'fowlerSignal', 'responsibility_overload',
    'rail', 'RenderBottomOperationalDrawer',
    'ownedPresenter', 'canvasOperationalDrawerContribution',
    'presentationPrimitiveLayer', 'OperationalDrawerPanelPrimitives'
  )
)
on conflict (component_id) do update set
  component_name = excluded.component_name,
  component_kind = excluded.component_kind,
  component_status = excluded.component_status,
  reuse_decision = excluded.reuse_decision,
  frontend_owner = excluded.frontend_owner,
  responsibility = excluded.responsibility,
  package_name = excluded.package_name,
  route_scope = excluded.route_scope,
  plugin_scope = excluded.plugin_scope,
  capability_gaps = excluded.capability_gaps,
  evidence_refs = excluded.evidence_refs,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  raw_component = excluded.raw_component,
  updated_at = now();

insert into planning_query_store.frontend_component_local_files (
  component_id,
  file_path,
  file_role,
  exported_symbol,
  raw_file,
  source_path,
  source_content_sha256
)
values
  (
    'web.component.shell.BottomOperationalDrawer',
    'apps/web/src/app/views/canvas/canvasOperationalDrawerContribution.ts',
    'presenter',
    'buildCanvasOperationalDrawerContribution',
    jsonb_build_object(
      'role', 'projects Canvas readiness, runs and preview state into OperationalDrawerContribution',
      'rail', 'RenderBottomOperationalDrawer',
      'task', 'E-CANVAS-BOTTOM-DRAWER-OPS-1'
    ),
    'tools/planning-db/migrations/332_canvas_bottom_drawer_actionable_read_model.sql',
    md5('canvasOperationalDrawerContribution.ts:332')
  ),
  (
    'web.component.shell.BottomOperationalDrawer',
    'apps/web/src/app/views/canvas/canvasOperationalDrawerContribution.test.tsx',
    'test',
    null,
    jsonb_build_object(
      'coverage', 'Canvas readiness blockers become actionable Problems and Preview counters',
      'rail', 'RenderBottomOperationalDrawer'
    ),
    'tools/planning-db/migrations/332_canvas_bottom_drawer_actionable_read_model.sql',
    md5('canvasOperationalDrawerContribution.test.tsx:332')
  ),
  (
    'web.component.shell.BottomOperationalDrawer',
    'apps/web/src/app/components/shell/OperationalDrawerPanels.actions.test.tsx',
    'test',
    null,
    jsonb_build_object(
      'coverage', 'Problems render contribution actions and Runs renders blocked/ready summaries',
      'rail', 'RenderBottomOperationalDrawer'
    ),
    'tools/planning-db/migrations/332_canvas_bottom_drawer_actionable_read_model.sql',
    md5('OperationalDrawerPanels.actions.test.tsx:332')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_local_evidence (
  evidence_id,
  component_id,
  evidence_kind,
  evidence_ref,
  evidence_status,
  raw_evidence,
  source_path,
  source_content_sha256
)
values
  (
    'EV-WEB-BOTTOM-DRAWER-ACTION-PANELS',
    'web.component.shell.BottomOperationalDrawer',
    'test',
    'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/shell/OperationalDrawerPanels.actions.test.tsx',
    'passing',
    jsonb_build_object(
      'scope', 'Operational drawer panels render readiness actions and run readiness summaries from component contracts'
    ),
    'tools/planning-db/migrations/332_canvas_bottom_drawer_actionable_read_model.sql',
    md5('EV-WEB-BOTTOM-DRAWER-ACTION-PANELS:332')
  ),
  (
    'EV-WEB-CANVAS-DRAWER-CONTRIBUTION-PRESENTER',
    'web.component.shell.BottomOperationalDrawer',
    'test',
    'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-presentation.config.ts src/app/views/canvas/canvasOperationalDrawerContribution.test.tsx',
    'passing',
    jsonb_build_object(
      'scope', 'Canvas route posture projects to the bottom operational drawer read model through RenderBottomOperationalDrawer'
    ),
    'tools/planning-db/migrations/332_canvas_bottom_drawer_actionable_read_model.sql',
    md5('EV-WEB-CANVAS-DRAWER-CONTRIBUTION-PRESENTER:332')
  )
on conflict (evidence_id) do update set
  component_id = excluded.component_id,
  evidence_kind = excluded.evidence_kind,
  evidence_ref = excluded.evidence_ref,
  evidence_status = excluded.evidence_status,
  raw_evidence = excluded.raw_evidence,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

update planning_query_store.feature_mechanization_local_rails
set
  mechanization_status = 'implemented',
  rail_status = 'implemented',
  ddd_owner = 'web.component.shell.BottomOperationalDrawer',
  symbol_refs = jsonb_build_array(
    'apps/web/src/app/views/canvas/canvasOperationalDrawerContribution.ts#buildCanvasOperationalDrawerContribution',
    'apps/web/src/app/components/shell/OperationalDrawerPanels.tsx#BottomOperationalProblemsPanel',
    'apps/web/src/app/components/shell/OperationalDrawerPanels.tsx#BottomOperationalRunsPanel',
    'apps/web/src/app/components/shell/OperationalDrawerPanelPrimitives.tsx#OperationalDrawerProblemItem',
    'apps/web/src/app/components/shell/OperationalDrawerPanelPrimitives.tsx#OperationalDrawerRunStatusSummary'
  ),
  implementation_refs = jsonb_build_array(
    'apps/web/src/app/views/canvas/canvasOperationalDrawerContribution.ts',
    'apps/web/src/app/views/canvas/canvasOperationalDrawerContribution.test.tsx',
    'apps/web/src/app/views/canvas/CanvasOperationalDrawerContributionRegistrar.tsx',
    'apps/web/src/app/components/shell/operationalDrawerContributionStore.ts',
    'apps/web/src/app/components/shell/OperationalDrawerPanels.tsx',
    'apps/web/src/app/components/shell/OperationalDrawerPanelPrimitives.tsx',
    'apps/web/src/app/components/shell/OperationalDrawerPanels.actions.test.tsx',
    'apps/web/src/app/components/shell/OperationalDrawerPanels.test.tsx',
    'scripts/planning-db-migrate.test.cjs',
    'tools/planning-db/migrations/332_canvas_bottom_drawer_actionable_read_model.sql'
  ),
  allowed_implementation_surfaces = jsonb_build_array(
    'apps/web/src/app/views/canvas/canvasOperationalDrawerContribution.ts',
    'apps/web/src/app/views/canvas/canvasOperationalDrawerContribution.test.tsx',
    'apps/web/src/app/views/canvas/CanvasOperationalDrawerContributionRegistrar.tsx',
    'apps/web/src/app/components/shell/operationalDrawerContributionStore.ts',
    'apps/web/src/app/components/shell/OperationalDrawerPanels.tsx',
    'apps/web/src/app/components/shell/OperationalDrawerPanelPrimitives.tsx',
    'apps/web/src/app/components/shell/OperationalDrawerPanels.actions.test.tsx',
    'apps/web/src/app/components/shell/OperationalDrawerPanels.test.tsx',
    'scripts/planning-db-migrate.test.cjs',
    'tools/planning-db/migrations/332_canvas_bottom_drawer_actionable_read_model.sql',
    'docs/planning/status/generated-code-state.md'
  ),
  architecture_guards = jsonb_build_array(
    'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/shell/OperationalDrawerPanels.actions.test.tsx src/app/components/shell/OperationalDrawerPanels.test.tsx',
    'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-presentation.config.ts src/app/views/canvas/canvasOperationalDrawerContribution.test.tsx src/app/views/canvas/CanvasShell.operationalDrawer.test.tsx',
    'node --test --test-name-pattern "tracked migrations register Canvas bottom drawer actionable read model" scripts/planning-db-migrate.test.cjs'
  ),
  completion_gate = jsonb_build_array(
    'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/shell/OperationalDrawerPanels.actions.test.tsx src/app/components/shell/OperationalDrawerPanels.test.tsx',
    'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-presentation.config.ts src/app/views/canvas/canvasOperationalDrawerContribution.test.tsx src/app/views/canvas/CanvasShell.operationalDrawer.test.tsx',
    'pnpm --filter @dvt/web typecheck',
    'pnpm --filter @dvt/web lint',
    'pnpm docs:feature-mechanization:implementation',
    'pnpm verify:prepush'
  ),
  source_path = 'tools/planning-db/migrations/332_canvas_bottom_drawer_actionable_read_model.sql',
  source_content_sha256 = md5('UXDB-BOTTOM-OPERATIONAL-DRAWER-P0-1:332'),
  raw_rail = jsonb_build_object(
    'name', 'RenderBottomOperationalDrawer',
    'type', 'query',
    'status', 'implemented',
    'dddOwner', 'web.component.shell.BottomOperationalDrawer'
  ),
  raw_manifest = jsonb_build_object(
    'version', 1,
    'featureId', 'UXDB-BOTTOM-OPERATIONAL-DRAWER-P0-1',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan', 'planning-db://task/E-CANVAS-BOTTOM-DRAWER-OPS-1',
    'componentGuides', jsonb_build_array(
      'planning-db:component/web.component.shell.BottomOperationalDrawer',
      'buzon/TAREA.TXT'
    ),
    'userStories', jsonb_build_array(
      'As a Canvas user, readiness blockers appear in Problems with an action to preview execution.',
      'As a Canvas user, Runs explains blocked, ready, and active states without requiring a live run id.',
      'As a maintainer, Canvas route posture is projected through a presenter instead of ad hoc drawer JSX.'
    ),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md',
      'buzon/TAREA.TXT'
    ),
    'allowedImplementationSurfaces', jsonb_build_array(
      'apps/web/src/app/views/canvas/canvasOperationalDrawerContribution.ts',
      'apps/web/src/app/views/canvas/canvasOperationalDrawerContribution.test.tsx',
      'apps/web/src/app/views/canvas/CanvasOperationalDrawerContributionRegistrar.tsx',
      'apps/web/src/app/components/shell/operationalDrawerContributionStore.ts',
      'apps/web/src/app/components/shell/OperationalDrawerPanels.tsx',
      'apps/web/src/app/components/shell/OperationalDrawerPanelPrimitives.tsx',
      'apps/web/src/app/components/shell/OperationalDrawerPanels.actions.test.tsx',
      'apps/web/src/app/components/shell/OperationalDrawerPanels.test.tsx',
      'scripts/planning-db-migrate.test.cjs',
      'tools/planning-db/migrations/332_canvas_bottom_drawer_actionable_read_model.sql'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', 'RenderBottomOperationalDrawer',
        'type', 'query',
        'dddOwner', 'web.component.shell.BottomOperationalDrawer',
        'status', 'implemented'
      )
    ),
    'domainObjects', jsonb_build_array(
      jsonb_build_object(
        'name', 'OperationalDrawerContribution',
        'type', 'route contribution read model',
        'owner', 'Bottom operational drawer'
      ),
      jsonb_build_object(
        'name', 'CanvasOperationalDrawerContribution',
        'type', 'Canvas presenter read model',
        'owner', 'Canvas shell'
      )
    ),
    'fowlerSignals', jsonb_build_array(
      'presentation_logic_separation',
      'explicit_read_model',
      'component_boundary'
    )
  ),
  revision = revision + 1,
  updated_at = now()
where
  feature_id = 'UXDB-BOTTOM-OPERATIONAL-DRAWER-P0-1'
  and normalized_rail_name = 'renderbottomoperationaldrawer';
