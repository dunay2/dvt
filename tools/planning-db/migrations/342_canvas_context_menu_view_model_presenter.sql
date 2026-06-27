-- Register the Canvas context-menu view-model presenter before closing the
-- component presentation-system slice. The presenter keeps action grouping out
-- of CanvasContextMenuView while reusing the existing ResolveCanvasContextMenu
-- query rail.

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
  'WEB-CANVAS-CONTEXT-MENU-VIEW-MODEL-20260627',
  'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1',
  'Canvas context menu view-model presenter',
  'Frontend / Canvas',
  'implemented',
  'CanvasContextMenuView still owned grouping decisions for Add, Canvas, and edge sections. The presenter extraction keeps the React template passive, makes section grouping directly testable, and preserves the existing ResolveCanvasContextMenu rail instead of creating a parallel menu command.',
  'responsibility_overload',
  'ResolveCanvasContextMenu',
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
    'WEB-CANVAS-CONTEXT-MENU-VIEW-MODEL-20260627',
    'component',
    'web.component.canvas.CanvasContextMenu',
    'may_update',
    true
  ),
  (
    'WEB-CANVAS-CONTEXT-MENU-VIEW-MODEL-20260627',
    'query',
    'ResolveCanvasContextMenu',
    'may_update',
    true
  ),
  (
    'WEB-CANVAS-CONTEXT-MENU-VIEW-MODEL-20260627',
    'path',
    'apps/web/src/app/views/canvas/CanvasContextMenuView.tsx',
    'may_update',
    true
  ),
  (
    'WEB-CANVAS-CONTEXT-MENU-VIEW-MODEL-20260627',
    'path',
    'apps/web/src/app/views/canvas/canvasContextMenuViewModel.ts',
    'may_create',
    true
  ),
  (
    'WEB-CANVAS-CONTEXT-MENU-VIEW-MODEL-20260627',
    'path',
    'apps/web/src/app/views/canvas/canvasContextMenuViewModel.test.ts',
    'may_create',
    true
  ),
  (
    'WEB-CANVAS-CONTEXT-MENU-VIEW-MODEL-20260627',
    'path',
    'tools/planning-db/migrations/342_canvas_context_menu_view_model_presenter.sql',
    'may_create',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update planning_query_store.frontend_component_local_components
set
  reuse_decision = 'extract',
  responsibility = 'Owns the Canvas context-menu view, primitives, presenter and command-surface model for pane and edge contextual actions.',
  evidence_refs = (
    select coalesce(jsonb_agg(distinct evidence_ref), '[]'::jsonb)
    from jsonb_array_elements_text(
      coalesce(evidence_refs, '[]'::jsonb)
      || jsonb_build_array('EV-WEB-CANVAS-CONTEXT-MENU-VIEW-MODEL')
    ) as refs(evidence_ref)
  ),
  source_path = 'tools/planning-db/migrations/342_canvas_context_menu_view_model_presenter.sql',
  source_content_sha256 = md5('web.component.canvas.CanvasContextMenu:342'),
  raw_component = coalesce(raw_component, '{}'::jsonb)
    || jsonb_build_object(
      'dbFirst', true,
      'fowlerSignal', 'presentation_logic_mixing',
      'presenter', 'canvasContextMenuViewModel',
      'rail', 'ResolveCanvasContextMenu'
    ),
  updated_at = now()
where component_id = 'web.component.canvas.CanvasContextMenu';

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
    'web.component.canvas.CanvasContextMenu',
    'apps/web/src/app/views/canvas/CanvasContextMenuView.tsx',
    'component',
    'CanvasContextMenuView',
    jsonb_build_object(
      'role', 'passive Canvas context-menu template consuming view-model sections',
      'rail', 'ResolveCanvasContextMenu',
      'presenter', 'buildCanvasContextMenuSections'
    ),
    'tools/planning-db/migrations/342_canvas_context_menu_view_model_presenter.sql',
    md5('CanvasContextMenuView.tsx:342')
  ),
  (
    'web.component.canvas.CanvasContextMenu',
    'apps/web/src/app/views/canvas/canvasContextMenuViewModel.ts',
    'presenter',
    'buildCanvasContextMenuSections',
    jsonb_build_object(
      'role', 'pure Canvas context-menu section presenter',
      'rail', 'ResolveCanvasContextMenu',
      'exports', jsonb_build_array(
        'CanvasContextMenuViewItem',
        'CanvasContextMenuViewSection',
        'buildCanvasContextMenuSections'
      )
    ),
    'tools/planning-db/migrations/342_canvas_context_menu_view_model_presenter.sql',
    md5('canvasContextMenuViewModel.ts:342')
  ),
  (
    'web.component.canvas.CanvasContextMenu',
    'apps/web/src/app/views/canvas/canvasContextMenuViewModel.test.ts',
    'test',
    null,
    jsonb_build_object(
      'coverage', 'Canvas context-menu grouping stays deterministic and outside the React view',
      'rail', 'ResolveCanvasContextMenu'
    ),
    'tools/planning-db/migrations/342_canvas_context_menu_view_model_presenter.sql',
    md5('canvasContextMenuViewModel.test.ts:342')
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
values (
  'EV-WEB-CANVAS-CONTEXT-MENU-VIEW-MODEL',
  'web.component.canvas.CanvasContextMenu',
  'test',
  'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/canvasContextMenuViewModel.test.ts src/app/views/canvas/CanvasContextMenuView.test.tsx',
  'passing',
  jsonb_build_object(
    'scope', 'Canvas context-menu presentation grouping is tested as a pure presenter and the view still routes selections to the owning callbacks.',
    'redGreenCycle', 'expected failure: canvasContextMenuViewModel.ts was absent'
  ),
  'tools/planning-db/migrations/342_canvas_context_menu_view_model_presenter.sql',
  md5('EV-WEB-CANVAS-CONTEXT-MENU-VIEW-MODEL:342')
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
  'local#E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1#query#resolvecanvascontextmenu#viewmodel',
  'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1',
  'implemented',
  'ResolveCanvasContextMenu',
  'resolvecanvascontextmenu',
  'query',
  'web.component.canvas.CanvasContextMenu',
  'implemented',
  jsonb_build_array(
    'apps/web/src/app/views/canvas/CanvasContextMenuView.tsx#selectCanvasContextMenuItem',
    'apps/web/src/app/views/canvas/canvasContextMenuViewModel.ts#CanvasContextMenuViewItem',
    'apps/web/src/app/views/canvas/canvasContextMenuViewModel.ts#CanvasContextMenuViewSection',
    'apps/web/src/app/views/canvas/canvasContextMenuViewModel.ts#buildCanvasContextMenuSections',
    'apps/web/src/app/views/canvas/canvasContextMenuViewModel.ts#canvasActionItem',
    'apps/web/src/app/views/canvas/canvasContextMenuViewModel.ts#createNodeActionItem',
    'apps/web/src/app/views/canvas/canvasContextMenuViewModel.ts#edgeActionItem'
  ),
  jsonb_build_array(
    'apps/web/src/app/views/canvas/CanvasContextMenuView.tsx',
    'apps/web/src/app/views/canvas/canvasContextMenuViewModel.ts',
    'apps/web/src/app/views/canvas/canvasContextMenuViewModel.test.ts',
    'tools/planning-db/migrations/342_canvas_context_menu_view_model_presenter.sql'
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
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md',
    'buzon/TAREA.TXT'
  ),
  jsonb_build_array(
    'apps/web/src/app/views/canvas/CanvasContextMenuView.tsx',
    'apps/web/src/app/views/canvas/canvasContextMenuViewModel.ts',
    'apps/web/src/app/views/canvas/canvasContextMenuViewModel.test.ts',
    'tools/planning-db/migrations/342_canvas_context_menu_view_model_presenter.sql',
    'docs/planning/status/generated-code-state.md'
  ),
  jsonb_build_array(
    'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/canvasContextMenuViewModel.test.ts src/app/views/canvas/CanvasContextMenuView.test.tsx',
    'pnpm docs:feature-mechanization:implementation'
  ),
  jsonb_build_array(
    'pnpm planning:db:migrate',
    'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/canvasContextMenuViewModel.test.ts src/app/views/canvas/CanvasContextMenuView.test.tsx',
    'pnpm docs:feature-mechanization:implementation',
    'pnpm verify:prepush'
  ),
  'tools/planning-db/migrations/342_canvas_context_menu_view_model_presenter.sql',
  md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:ResolveCanvasContextMenu:viewmodel:342'),
  jsonb_build_object(
    'name', 'ResolveCanvasContextMenu',
    'type', 'query',
    'dddOwner', 'web.component.canvas.CanvasContextMenu',
    'status', 'implemented'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan', 'Extract Canvas context-menu section grouping into a pure view-model presenter so React templates stay passive and component tests can verify behavior without string-scanning source files.',
    'componentGuides', jsonb_build_array('planning-db:component/web.component.canvas.CanvasContextMenu'),
    'userStories', jsonb_build_array(
      'As a Canvas maintainer, I can alter context-menu grouping without editing callback routing or primitive markup.',
      'As a reviewer, I can verify context-menu section semantics through a focused presenter test instead of only brittle source-text checks.'
    ),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/guides/ai-work-protocol.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md',
      'buzon/TAREA.TXT'
    ),
    'allowedImplementationSurfaces', jsonb_build_array(
      'apps/web/src/app/views/canvas/CanvasContextMenuView.tsx',
      'apps/web/src/app/views/canvas/canvasContextMenuViewModel.ts',
      'apps/web/src/app/views/canvas/canvasContextMenuViewModel.test.ts',
      'tools/planning-db/migrations/342_canvas_context_menu_view_model_presenter.sql',
      'docs/planning/status/generated-code-state.md'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'buzon/**#primary-specification',
      'apps/web/cypress/e2e/canvas/**#cy.intercept_workspace_graph_draft',
      'apps/web/cypress/e2e/canvas/**#direct_put_workspace_graph_draft'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', 'ResolveCanvasContextMenu',
        'type', 'query',
        'dddOwner', 'web.component.canvas.CanvasContextMenu',
        'status', 'implemented'
      )
    ),
    'domainObjects', jsonb_build_array(
      'CanvasContextMenuModel',
      'CanvasContextMenuViewSection',
      'CanvasContextMenuViewItem'
    ),
    'fowlerSignals', jsonb_build_array(
      'presentation_logic_mixing',
      'extract_function',
      'separate_presentation_from_policy'
    ),
    'architectureGuards', jsonb_build_array(
      'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/canvasContextMenuViewModel.test.ts src/app/views/canvas/CanvasContextMenuView.test.tsx',
      'pnpm docs:feature-mechanization:implementation'
    ),
    'cypressFlows', jsonb_build_array('not_applicable:presentation_view_model_slice'),
    'completionGate', jsonb_build_array(
      'pnpm planning:db:migrate',
      'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/canvasContextMenuViewModel.test.ts src/app/views/canvas/CanvasContextMenuView.test.tsx',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'canvas-context-menu-view-model-presenter',
        'redTest', 'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/canvasContextMenuViewModel.test.ts',
        'expectedFailure', 'Failed to resolve import ./canvasContextMenuViewModel because the presenter did not exist.',
        'patchSurfaces', jsonb_build_array(
          'apps/web/src/app/views/canvas/canvasContextMenuViewModel.ts',
          'apps/web/src/app/views/canvas/CanvasContextMenuView.tsx',
          'tools/planning-db/migrations/342_canvas_context_menu_view_model_presenter.sql'
        ),
        'greenTest', 'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/canvasContextMenuViewModel.test.ts'
      )
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object(
        'name', 'selectCanvasContextMenuItem',
        'path', 'apps/web/src/app/views/canvas/CanvasContextMenuView.tsx',
        'dddOwner', 'web.component.canvas.CanvasContextMenu',
        'cqRails', jsonb_build_array('ResolveCanvasContextMenu'),
        'fowlerSignals', jsonb_build_array('separate_presentation_from_policy'),
        'architectureGuard', 'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/CanvasContextMenuView.test.tsx',
        'unitTests', jsonb_build_array('pnpm --filter @dvt/web exec vitest run src/app/views/canvas/CanvasContextMenuView.test.tsx')
      ),
      jsonb_build_object(
        'name', 'CanvasContextMenuViewItem',
        'path', 'apps/web/src/app/views/canvas/canvasContextMenuViewModel.ts',
        'dddOwner', 'web.component.canvas.CanvasContextMenu',
        'cqRails', jsonb_build_array('ResolveCanvasContextMenu'),
        'fowlerSignals', jsonb_build_array('extract_function'),
        'architectureGuard', 'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/canvasContextMenuViewModel.test.ts',
        'unitTests', jsonb_build_array('pnpm --filter @dvt/web exec vitest run src/app/views/canvas/canvasContextMenuViewModel.test.ts')
      ),
      jsonb_build_object(
        'name', 'CanvasContextMenuViewSection',
        'path', 'apps/web/src/app/views/canvas/canvasContextMenuViewModel.ts',
        'dddOwner', 'web.component.canvas.CanvasContextMenu',
        'cqRails', jsonb_build_array('ResolveCanvasContextMenu'),
        'fowlerSignals', jsonb_build_array('extract_function'),
        'architectureGuard', 'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/canvasContextMenuViewModel.test.ts',
        'unitTests', jsonb_build_array('pnpm --filter @dvt/web exec vitest run src/app/views/canvas/canvasContextMenuViewModel.test.ts')
      ),
      jsonb_build_object(
        'name', 'buildCanvasContextMenuSections',
        'path', 'apps/web/src/app/views/canvas/canvasContextMenuViewModel.ts',
        'dddOwner', 'web.component.canvas.CanvasContextMenu',
        'cqRails', jsonb_build_array('ResolveCanvasContextMenu'),
        'fowlerSignals', jsonb_build_array('extract_function'),
        'architectureGuard', 'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/canvasContextMenuViewModel.test.ts',
        'unitTests', jsonb_build_array('pnpm --filter @dvt/web exec vitest run src/app/views/canvas/canvasContextMenuViewModel.test.ts')
      ),
      jsonb_build_object(
        'name', 'canvasActionItem',
        'path', 'apps/web/src/app/views/canvas/canvasContextMenuViewModel.ts',
        'dddOwner', 'web.component.canvas.CanvasContextMenu',
        'cqRails', jsonb_build_array('ResolveCanvasContextMenu'),
        'fowlerSignals', jsonb_build_array('extract_function'),
        'architectureGuard', 'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/canvasContextMenuViewModel.test.ts',
        'unitTests', jsonb_build_array('pnpm --filter @dvt/web exec vitest run src/app/views/canvas/canvasContextMenuViewModel.test.ts')
      ),
      jsonb_build_object(
        'name', 'createNodeActionItem',
        'path', 'apps/web/src/app/views/canvas/canvasContextMenuViewModel.ts',
        'dddOwner', 'web.component.canvas.CanvasContextMenu',
        'cqRails', jsonb_build_array('ResolveCanvasContextMenu'),
        'fowlerSignals', jsonb_build_array('extract_function'),
        'architectureGuard', 'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/canvasContextMenuViewModel.test.ts',
        'unitTests', jsonb_build_array('pnpm --filter @dvt/web exec vitest run src/app/views/canvas/canvasContextMenuViewModel.test.ts')
      ),
      jsonb_build_object(
        'name', 'edgeActionItem',
        'path', 'apps/web/src/app/views/canvas/canvasContextMenuViewModel.ts',
        'dddOwner', 'web.component.canvas.CanvasContextMenu',
        'cqRails', jsonb_build_array('ResolveCanvasContextMenu'),
        'fowlerSignals', jsonb_build_array('extract_function'),
        'architectureGuard', 'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/canvasContextMenuViewModel.test.ts',
        'unitTests', jsonb_build_array('pnpm --filter @dvt/web exec vitest run src/app/views/canvas/canvasContextMenuViewModel.test.ts')
      )
    )
  ),
  1,
  'codex'
)
on conflict (rail_id) do update set
  mechanization_status = excluded.mechanization_status,
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
  revision = excluded.revision,
  updated_at = now();
