-- DB-first authority for the Canvas context-menu shell layer. This keeps the
-- menu host as a named presentation component instead of rendering the menu
-- directly from CanvasShell.

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
  'CANVAS-CONTEXT-MENU-SHELL-LAYER-20260625',
  'DVT-CANVAS-P0-PRO-FLOW-1',
  'Canvas context menu shell layer',
  'Frontend / Canvas',
  'implemented',
  'CanvasShell owned the context-menu presenter and rendered the context-menu view directly as a loose sibling in the shell group. The professional canvas surface needs a named layer component so menu hosting, pointer-event policy, and shell integration are separated from shell orchestration.',
  'responsibility_overload',
  'ResolveCanvasContextMenu;RenderCanvasContextMenu',
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
  ('CANVAS-CONTEXT-MENU-SHELL-LAYER-20260625', 'component', 'web.component.canvas.CanvasContextMenu', 'may_update', true),
  ('CANVAS-CONTEXT-MENU-SHELL-LAYER-20260625', 'path', 'apps/web/src/app/views/canvas/CanvasContextMenuLayer.tsx', 'may_create', true),
  ('CANVAS-CONTEXT-MENU-SHELL-LAYER-20260625', 'path', 'apps/web/src/app/views/canvas/CanvasContextMenuPrimitives.tsx', 'may_update', true),
  ('CANVAS-CONTEXT-MENU-SHELL-LAYER-20260625', 'path', 'apps/web/src/app/views/canvas/CanvasShell.tsx', 'may_update', true),
  ('CANVAS-CONTEXT-MENU-SHELL-LAYER-20260625', 'path', 'apps/web/src/app/views/canvas/CanvasShell.architecture.test.tsx', 'may_update', true),
  ('CANVAS-CONTEXT-MENU-SHELL-LAYER-20260625', 'path', 'apps/web/src/app/views/canvas/CanvasShell.contextMenuIntegration.test.tsx', 'may_update', true),
  ('CANVAS-CONTEXT-MENU-SHELL-LAYER-20260625', 'path', 'scripts/planning-db-migrate.test.cjs', 'may_update', true),
  ('CANVAS-CONTEXT-MENU-SHELL-LAYER-20260625', 'path', 'tools/planning-db/migrations/288_register_canvas_context_menu_layer.sql', 'may_create', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

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
    'apps/web/src/app/views/canvas/CanvasContextMenuLayer.tsx',
    'component',
    'CanvasContextMenuLayer',
    jsonb_build_object(
      'role', 'shell-owned context menu layer host',
      'rail', 'ResolveCanvasContextMenu',
      'pointerPolicy', 'outer layer does not intercept canvas clicks; menu surface receives menu clicks'
    ),
    'tools/planning-db/migrations/288_register_canvas_context_menu_layer.sql',
    md5('CanvasContextMenuLayer.tsx:288')
  ),
  (
    'web.component.canvas.CanvasContextMenu',
    'apps/web/src/app/views/canvas/CanvasContextMenuPrimitives.tsx',
    'component',
    'CanvasContextMenuSurface',
    jsonb_build_object(
      'role', 'context menu surface primitive',
      'rail', 'RenderCanvasContextMenu',
      'pointerPolicy', 'surface remains pointer-interactive inside the shell layer'
    ),
    'tools/planning-db/migrations/288_register_canvas_context_menu_layer.sql',
    md5('CanvasContextMenuPrimitives.tsx:288')
  ),
  (
    'web.component.canvas.CanvasContextMenu',
    'apps/web/src/app/views/canvas/CanvasShell.tsx',
    'integration',
    'CanvasShell',
    jsonb_build_object(
      'role', 'context menu presenter owner and layer host consumer',
      'rail', 'ResolveCanvasContextMenu'
    ),
    'tools/planning-db/migrations/288_register_canvas_context_menu_layer.sql',
    md5('CanvasShell.tsx:288')
  ),
  (
    'web.component.canvas.CanvasContextMenu',
    'apps/web/src/app/views/canvas/CanvasShell.contextMenuIntegration.test.tsx',
    'test',
    null,
    jsonb_build_object(
      'coverage', 'shell-owned context menu layer remains mounted through browser pointer echo'
    ),
    'tools/planning-db/migrations/288_register_canvas_context_menu_layer.sql',
    md5('CanvasShell.contextMenuIntegration.test.tsx:288')
  ),
  (
    'web.component.canvas.CanvasContextMenu',
    'apps/web/src/app/views/canvas/CanvasShell.architecture.test.tsx',
    'test',
    null,
    jsonb_build_object(
      'coverage', 'CanvasShell delegates context-menu hosting to CanvasContextMenuLayer'
    ),
    'tools/planning-db/migrations/288_register_canvas_context_menu_layer.sql',
    md5('CanvasShell.architecture.test.tsx:288')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_local_cq_rails (
  component_id,
  rail_name,
  rail_kind,
  rail_status,
  raw_rail,
  source_path,
  source_content_sha256
)
values
  (
    'web.component.canvas.CanvasContextMenu',
    'ResolveCanvasContextMenu',
    'local-query',
    'implemented-local',
    jsonb_build_object(
      'purpose', 'Resolve and host the Canvas pane/edge context-menu layer from the shell-owned presenter.',
      'owner', 'CanvasContextMenuLayer',
      'negativeTests', jsonb_build_array(
        'CanvasShell.contextMenuIntegration.test.tsx requires the shell-owned layer to stay visible through the browser pointer echo',
        'CanvasShell.architecture.test.tsx rejects direct CanvasContextMenuView rendering from CanvasShell'
      )
    ),
    'tools/planning-db/migrations/288_register_canvas_context_menu_layer.sql',
    md5('CanvasContextMenu:ResolveCanvasContextMenu:288')
  ),
  (
    'web.component.canvas.CanvasContextMenu',
    'RenderCanvasContextMenu',
    'local-query',
    'implemented-local',
    jsonb_build_object(
      'purpose', 'Render the accessible context-menu surface inside the shell layer without blocking the canvas outside the menu.',
      'owner', 'CanvasContextMenuLayer'
    ),
    'tools/planning-db/migrations/288_register_canvas_context_menu_layer.sql',
    md5('CanvasContextMenu:RenderCanvasContextMenu:288')
  )
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = excluded.raw_rail,
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
    'EV-WEB-CANVAS-CONTEXT-MENU-SHELL-LAYER-PRESENTATION',
    'web.component.canvas.CanvasContextMenu',
    'test',
    'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/CanvasShell.contextMenuIntegration.test.tsx',
    'passing',
    jsonb_build_object('scope', 'shell-owned context menu layer and browser pointer echo'),
    'tools/planning-db/migrations/288_register_canvas_context_menu_layer.sql',
    md5('EV-WEB-CANVAS-CONTEXT-MENU-SHELL-LAYER-PRESENTATION:288')
  ),
  (
    'EV-WEB-CANVAS-CONTEXT-MENU-SHELL-LAYER-ARCHITECTURE',
    'web.component.canvas.CanvasContextMenu',
    'test',
    'pnpm --filter @dvt/web test:canvas-architecture:run -- src/app/views/canvas/CanvasShell.architecture.test.tsx',
    'passing',
    jsonb_build_object('scope', 'CanvasShell context-menu layer component boundary'),
    'tools/planning-db/migrations/288_register_canvas_context_menu_layer.sql',
    md5('EV-WEB-CANVAS-CONTEXT-MENU-SHELL-LAYER-ARCHITECTURE:288')
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
  'local#CANVAS-CONTEXT-MENU-SHELL-LAYER-20260625#query#resolvecanvascontextmenu',
  'CANVAS-CONTEXT-MENU-SHELL-LAYER-20260625',
  'implemented',
  'ResolveCanvasContextMenu',
  'resolvecanvascontextmenu',
  'query',
  'CanvasContextMenuLayer',
  'implemented',
  jsonb_build_array(
    'apps/web/src/app/views/canvas/CanvasContextMenuLayer.tsx#CanvasContextMenuLayer',
    'apps/web/src/app/views/canvas/CanvasShell.tsx#CanvasShell',
    'apps/web/src/app/views/canvas/CanvasContextMenuPrimitives.tsx#CanvasContextMenuSurface'
  ),
  jsonb_build_array(
    'apps/web/src/app/views/canvas/CanvasContextMenuLayer.tsx',
    'apps/web/src/app/views/canvas/CanvasContextMenuPrimitives.tsx',
    'apps/web/src/app/views/canvas/CanvasShell.tsx',
    'apps/web/src/app/views/canvas/CanvasShell.contextMenuIntegration.test.tsx',
    'apps/web/src/app/views/canvas/CanvasShell.architecture.test.tsx',
    'scripts/planning-db-migrate.test.cjs',
    'tools/planning-db/migrations/288_register_canvas_context_menu_layer.sql'
  ),
  jsonb_build_array(
    'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md#ResolveCanvasContextMenu'
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
    'apps/web/src/app/views/canvas/CanvasContextMenuLayer.tsx',
    'apps/web/src/app/views/canvas/CanvasContextMenuPrimitives.tsx',
    'apps/web/src/app/views/canvas/CanvasShell.tsx',
    'apps/web/src/app/views/canvas/CanvasShell.contextMenuIntegration.test.tsx',
    'apps/web/src/app/views/canvas/CanvasShell.architecture.test.tsx',
    'scripts/planning-db-migrate.test.cjs',
    'tools/planning-db/migrations/288_register_canvas_context_menu_layer.sql'
  ),
  jsonb_build_array(
    'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/CanvasShell.contextMenuIntegration.test.tsx',
    'pnpm --filter @dvt/web test:canvas-architecture:run -- src/app/views/canvas/CanvasShell.architecture.test.tsx',
    'node --test --test-name-pattern "tracked migrations register Canvas context menu shell layer authority" scripts/planning-db-migrate.test.cjs',
    'pnpm docs:feature-mechanization:implementation'
  ),
  jsonb_build_array(
    'pnpm planning:db:migrate',
    'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/CanvasShell.contextMenuIntegration.test.tsx',
    'pnpm --filter @dvt/web test:canvas-architecture:run -- src/app/views/canvas/CanvasShell.architecture.test.tsx',
    'node --test --test-name-pattern "tracked migrations register Canvas context menu shell layer authority" scripts/planning-db-migrate.test.cjs',
    'pnpm docs:feature-mechanization:implementation',
    'pnpm verify:prepush'
  ),
  'tools/planning-db/migrations/288_register_canvas_context_menu_layer.sql',
  md5('CANVAS-CONTEXT-MENU-SHELL-LAYER-20260625:ResolveCanvasContextMenu:288')
    || md5('CanvasContextMenuLayer:CanvasShell:CanvasContextMenuSurface'),
  jsonb_build_object(
    'name', 'ResolveCanvasContextMenu',
    'type', 'query',
    'dddOwner', 'CanvasContextMenuLayer',
    'status', 'implemented'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'CANVAS-CONTEXT-MENU-SHELL-LAYER-20260625',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan',
    'Host the shell-owned Canvas context-menu model through a named CanvasContextMenuLayer so CanvasShell orchestrates state while presentation and pointer policy remain encapsulated.',
    'componentGuides', jsonb_build_array(
      'web.component.canvas.CanvasContextMenu'
    ),
    'userStories', jsonb_build_array(
      jsonb_build_object(
        'role', 'Canvas author',
        'need', 'Open the Canvas context menu from the graph without the menu closing during the browser pointer echo.',
        'acceptance', 'Right-clicking the canvas opens a shell-hosted menu layer that remains visible until an explicit outside click or action closes it.'
      ),
      jsonb_build_object(
        'role', 'Frontend maintainer',
        'need', 'Keep CanvasShell orchestration separate from context-menu presentation and pointer-event policy.',
        'acceptance', 'CanvasShell consumes CanvasContextMenuLayer instead of directly rendering CanvasContextMenuView.'
      )
    ),
    'cypressFlows', jsonb_build_array(
      'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts'
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'canvas-context-menu-shell-layer-presentation',
        'redTest',
        'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/CanvasShell.contextMenuIntegration.test.tsx',
        'expectedFailure',
        'CanvasShell.contextMenuIntegration.test.tsx expected data-slot="canvas-context-menu-layer" and failed before CanvasContextMenuLayer existed.',
        'patchSurfaces', jsonb_build_array(
          'apps/web/src/app/views/canvas/CanvasContextMenuLayer.tsx',
          'apps/web/src/app/views/canvas/CanvasShell.tsx',
          'apps/web/src/app/views/canvas/CanvasShell.contextMenuIntegration.test.tsx'
        ),
        'greenTest',
        'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/CanvasShell.contextMenuIntegration.test.tsx'
      ),
      jsonb_build_object(
        'id', 'canvas-context-menu-shell-layer-boundary',
        'redTest',
        'pnpm --filter @dvt/web test:canvas-architecture:run -- src/app/views/canvas/CanvasShell.architecture.test.tsx',
        'expectedFailure',
        'CanvasShell.architecture.test.tsx rejected direct CanvasContextMenuView rendering from CanvasShell before the layer extraction.',
        'patchSurfaces', jsonb_build_array(
          'apps/web/src/app/views/canvas/CanvasContextMenuLayer.tsx',
          'apps/web/src/app/views/canvas/CanvasShell.tsx',
          'apps/web/src/app/views/canvas/CanvasShell.architecture.test.tsx'
        ),
        'greenTest',
        'pnpm --filter @dvt/web test:canvas-architecture:run -- src/app/views/canvas/CanvasShell.architecture.test.tsx'
      ),
      jsonb_build_object(
        'id', 'canvas-context-menu-dbfirst-authority',
        'redTest',
        'node --test --test-name-pattern "tracked migrations register Canvas context menu shell layer authority" scripts/planning-db-migrate.test.cjs',
        'expectedFailure',
        'planning-db-migrate.test.cjs required a DB-first migration for the context-menu layer and failed while migration 288 was absent.',
        'patchSurfaces', jsonb_build_array(
          'scripts/planning-db-migrate.test.cjs',
          'tools/planning-db/migrations/288_register_canvas_context_menu_layer.sql'
        ),
        'greenTest',
        'node --test --test-name-pattern "tracked migrations register Canvas context menu shell layer authority" scripts/planning-db-migrate.test.cjs'
      )
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
      'apps/web/src/app/views/canvas/CanvasContextMenuLayer.tsx',
      'apps/web/src/app/views/canvas/CanvasContextMenuPrimitives.tsx',
      'apps/web/src/app/views/canvas/CanvasShell.tsx',
      'apps/web/src/app/views/canvas/CanvasShell.contextMenuIntegration.test.tsx',
      'apps/web/src/app/views/canvas/CanvasShell.architecture.test.tsx',
      'scripts/planning-db-migrate.test.cjs',
      'tools/planning-db/migrations/288_register_canvas_context_menu_layer.sql'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'apps/web/cypress/e2e/**#fake_contextmenu_success',
      'packages/@dvt/contracts/**',
      'packages/@dvt/planner/**'
    ),
    'domainObjects', jsonb_build_array(
      'CanvasContextMenuLayer',
      'CanvasContextMenuSurface',
      'CanvasShell'
    ),
      'fowlerSignals', jsonb_build_array(
        'responsibility_overload',
        'hidden_authority',
        'boundary_drift'
      ),
    'architectureGuards', jsonb_build_array(
      'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/CanvasShell.contextMenuIntegration.test.tsx',
      'pnpm --filter @dvt/web test:canvas-architecture:run -- src/app/views/canvas/CanvasShell.architecture.test.tsx',
      'node --test --test-name-pattern "tracked migrations register Canvas context menu shell layer authority" scripts/planning-db-migrate.test.cjs',
      'pnpm docs:feature-mechanization:implementation'
    ),
    'completionGate', jsonb_build_array(
      'pnpm planning:db:migrate',
      'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/CanvasShell.contextMenuIntegration.test.tsx',
      'pnpm --filter @dvt/web test:canvas-architecture:run -- src/app/views/canvas/CanvasShell.architecture.test.tsx',
      'node --test --test-name-pattern "tracked migrations register Canvas context menu shell layer authority" scripts/planning-db-migrate.test.cjs',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', 'ResolveCanvasContextMenu',
        'type', 'query',
        'dddOwner', 'CanvasContextMenuLayer',
        'status', 'implemented'
      ),
      jsonb_build_object(
        'name', 'RenderCanvasContextMenu',
        'type', 'query',
        'dddOwner', 'CanvasContextMenuLayer',
        'status', 'implemented'
      )
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object(
        'name', 'CanvasContextMenuLayer',
        'path', 'apps/web/src/app/views/canvas/CanvasContextMenuLayer.tsx',
        'dddOwner', 'CanvasContextMenuLayer',
        'cqRails', jsonb_build_array('ResolveCanvasContextMenu', 'RenderCanvasContextMenu'),
        'fowlerSignals', jsonb_build_array('responsibility_overload', 'hidden_authority'),
        'architectureGuard', 'apps/web/src/app/views/canvas/CanvasShell.architecture.test.tsx',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts',
        'unitTests', jsonb_build_array(
          'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/CanvasShell.contextMenuIntegration.test.tsx'
        )
      ),
      jsonb_build_object(
        'name', 'CanvasShell',
        'path', 'apps/web/src/app/views/canvas/CanvasShell.tsx',
        'dddOwner', 'CanvasContextMenuLayer',
        'cqRails', jsonb_build_array('ResolveCanvasContextMenu'),
        'fowlerSignals', jsonb_build_array('responsibility_overload', 'boundary_drift'),
        'architectureGuard', 'apps/web/src/app/views/canvas/CanvasShell.architecture.test.tsx',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts',
        'unitTests', jsonb_build_array(
          'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/CanvasShell.contextMenuIntegration.test.tsx'
        )
      ),
      jsonb_build_object(
        'name', 'CanvasContextMenuSurface',
        'path', 'apps/web/src/app/views/canvas/CanvasContextMenuPrimitives.tsx',
        'dddOwner', 'CanvasContextMenuLayer',
        'cqRails', jsonb_build_array('RenderCanvasContextMenu'),
        'fowlerSignals', jsonb_build_array('hidden_authority', 'boundary_drift'),
        'architectureGuard', 'apps/web/src/app/views/canvas/CanvasShell.architecture.test.tsx',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts',
        'unitTests', jsonb_build_array(
          'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/CanvasShell.contextMenuIntegration.test.tsx'
        )
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
