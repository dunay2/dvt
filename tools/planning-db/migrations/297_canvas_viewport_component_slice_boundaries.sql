-- DB-first registration for the CanvasViewport component boundary split.
-- This slice does not change product behavior; it makes the existing viewport
-- implementation match the DB-owned component architecture before deeper UX work.

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
  'CANVAS-VIEWPORT-COMPONENT-SLICE-20260626',
  'E-CANVAS-UXDB-COMPONENT-SLICES-1',
  'Canvas viewport component slice boundaries',
  'Frontend / Canvas',
  'implemented',
  'CanvasViewport mixed React Flow presentation, CSS token resolution, imperative viewport lifecycle, and context-menu presenter wiring. The component slice separates presentation from UI logic so later TAREA.TXT work can evolve graph templates, palette tokens, and viewport lifecycle without editing the route-facing orchestrator.',
  'responsibility_overload',
  'RenderCanvasContextualGraphSurface;GetCanvasLayout',
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
    'CANVAS-VIEWPORT-COMPONENT-SLICE-20260626',
    'component',
    'web.component.canvas.CanvasViewport',
    'may_update',
    true
  ),
  (
    'CANVAS-VIEWPORT-COMPONENT-SLICE-20260626',
    'query',
    'RenderCanvasContextualGraphSurface',
    'may_update',
    true
  ),
  (
    'CANVAS-VIEWPORT-COMPONENT-SLICE-20260626',
    'query',
    'GetCanvasLayout',
    'may_update',
    true
  ),
  (
    'CANVAS-VIEWPORT-COMPONENT-SLICE-20260626',
    'path',
    'apps/web/src/app/views/canvas/CanvasViewport.tsx',
    'may_update',
    true
  ),
  (
    'CANVAS-VIEWPORT-COMPONENT-SLICE-20260626',
    'path',
    'apps/web/src/app/views/canvas/CanvasViewportSurfaceView.tsx',
    'may_create',
    true
  ),
  (
    'CANVAS-VIEWPORT-COMPONENT-SLICE-20260626',
    'path',
    'apps/web/src/app/views/canvas/canvasViewportStyle.ts',
    'may_create',
    true
  ),
  (
    'CANVAS-VIEWPORT-COMPONENT-SLICE-20260626',
    'path',
    'apps/web/src/app/views/canvas/useCanvasViewportLifecycle.ts',
    'may_create',
    true
  ),
  (
    'CANVAS-VIEWPORT-COMPONENT-SLICE-20260626',
    'path',
    'apps/web/src/app/views/canvas/CanvasViewport.architecture.test.ts',
    'may_create',
    true
  ),
  (
    'CANVAS-VIEWPORT-COMPONENT-SLICE-20260626',
    'path',
    'apps/web/src/app/views/canvas/canvasInteractionCommandSurface.architecture.test.ts',
    'may_update',
    true
  ),
  (
    'CANVAS-VIEWPORT-COMPONENT-SLICE-20260626',
    'path',
    'scripts/planning-db-migrate.test.cjs',
    'may_update',
    true
  ),
  (
    'CANVAS-VIEWPORT-COMPONENT-SLICE-20260626',
    'path',
    'tools/planning-db/migrations/297_canvas_viewport_component_slice_boundaries.sql',
    'may_create',
    true
  )
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
    'web.component.canvas.CanvasViewport',
    'apps/web/src/app/views/canvas/CanvasViewport.tsx',
    'component',
    'CanvasViewport',
    jsonb_build_object(
      'role', 'route-facing viewport orchestrator',
      'responsibility', 'selects local or shell-owned context-menu presenter and passes resolved props to presentation view',
      'rails', jsonb_build_array('RenderCanvasContextualGraphSurface', 'GetCanvasLayout'),
      'fowlerSignal', 'thin controller over extracted presentation and lifecycle collaborators'
    ),
    'tools/planning-db/migrations/297_canvas_viewport_component_slice_boundaries.sql',
    md5('CanvasViewport.tsx:component-slice-boundaries:297')
  ),
  (
    'web.component.canvas.CanvasViewport',
    'apps/web/src/app/views/canvas/CanvasViewportSurfaceView.tsx',
    'component',
    'CanvasViewportSurfaceView',
    jsonb_build_object(
      'role', 'React Flow presentation template for the Canvas viewport',
      'responsibility', 'owns ReactFlow, Background, Controls, MiniMap and CanvasContextMenuView rendering',
      'rail', 'RenderCanvasContextualGraphSurface',
      'forbiddenResponsibilities', jsonb_build_array(
        'building semantic context-menu models',
        'reading or mutating canvas stores',
        'persisting viewport layout'
      )
    ),
    'tools/planning-db/migrations/297_canvas_viewport_component_slice_boundaries.sql',
    md5('CanvasViewportSurfaceView#CanvasViewportSurfaceView:297')
  ),
  (
    'web.component.canvas.CanvasViewport',
    'apps/web/src/app/views/canvas/canvasViewportStyle.ts',
    'model',
    'resolveCanvasViewportStyle',
    jsonb_build_object(
      'role', 'Canvas viewport CSS variable read model',
      'responsibility', 'maps governed canvas palette and grid preferences to CSS custom properties',
      'secondarySymbol', 'canvasViewportStyle#applyCanvasViewportStyle',
      'rail', 'GetCanvasLayout'
    ),
    'tools/planning-db/migrations/297_canvas_viewport_component_slice_boundaries.sql',
    md5('canvasViewportStyle#resolveCanvasViewportStyle:297')
  ),
  (
    'web.component.canvas.CanvasViewport',
    'apps/web/src/app/views/canvas/useCanvasViewportLifecycle.ts',
    'hook',
    'useCanvasViewportLifecycle',
    jsonb_build_object(
      'role', 'imperative React Flow viewport lifecycle hook',
      'responsibility', 'applies CSS variables, restores persisted viewport and focuses imported nodes',
      'rail', 'GetCanvasLayout'
    ),
    'tools/planning-db/migrations/297_canvas_viewport_component_slice_boundaries.sql',
    md5('useCanvasViewportLifecycle#useCanvasViewportLifecycle:297')
  ),
  (
    'web.component.canvas.CanvasViewport',
    'apps/web/src/app/views/canvas/CanvasViewport.architecture.test.ts',
    'architecture-test',
    null,
    jsonb_build_object(
      'coverage', 'CanvasViewport remains an orchestrator and delegates React Flow presentation, styling and lifecycle responsibilities'
    ),
    'tools/planning-db/migrations/297_canvas_viewport_component_slice_boundaries.sql',
    md5('CanvasViewport.architecture.test.ts:297')
  ),
  (
    'web.component.canvas.CanvasViewport',
    'apps/web/src/app/views/canvas/canvasInteractionCommandSurface.architecture.test.ts',
    'architecture-test',
    null,
    jsonb_build_object(
      'coverage', 'context-menu wiring moved from CanvasViewport orchestrator to CanvasViewportSurfaceView without moving semantic menu model creation into the view'
    ),
    'tools/planning-db/migrations/297_canvas_viewport_component_slice_boundaries.sql',
    md5('canvasInteractionCommandSurface.architecture.test.ts:viewport-surface-view:297')
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
    'web.component.canvas.CanvasViewport',
    'RenderCanvasContextualGraphSurface',
    'query',
    'implemented-projection',
    jsonb_build_object(
      'purpose', 'Render the graph-first Canvas surface from an already resolved viewport read model.',
      'owner', 'CanvasViewportSurfaceView',
      'negativeTests', jsonb_build_array(
        'CanvasViewport.architecture.test.ts rejects React Flow presentation primitives inside CanvasViewport.tsx',
        'CanvasViewport.test.tsx preserves React Flow props, minimap color resolution and grid preferences'
      )
    ),
    'tools/planning-db/migrations/297_canvas_viewport_component_slice_boundaries.sql',
    md5('CanvasViewport:RenderCanvasContextualGraphSurface:297')
  ),
  (
    'web.component.canvas.CanvasViewport',
    'GetCanvasLayout',
    'query',
    'implemented-local',
    jsonb_build_object(
      'purpose', 'Resolve local viewport styling and lifecycle effects from persisted layout and palette preferences.',
      'owner', 'canvasViewportStyle;useCanvasViewportLifecycle',
      'negativeTests', jsonb_build_array(
        'CanvasViewport.architecture.test.ts requires viewport styling and lifecycle effects to live outside the React Flow template'
      )
    ),
    'tools/planning-db/migrations/297_canvas_viewport_component_slice_boundaries.sql',
    md5('CanvasViewport:GetCanvasLayout:297')
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
    'EV-WEB-CANVAS-VIEWPORT-COMPONENT-SLICE-ARCHITECTURE',
    'web.component.canvas.CanvasViewport',
    'test',
    'pnpm --filter @dvt/web test:canvas-architecture:run -- src/app/views/canvas/CanvasViewport.architecture.test.ts src/app/views/canvas/canvasInteractionCommandSurface.architecture.test.ts src/app/views/canvas/useCanvasViewportGraphModel.architecture.test.ts',
    'passing',
    jsonb_build_object('scope', 'CanvasViewport component boundary and context-menu presentation wiring'),
    'tools/planning-db/migrations/297_canvas_viewport_component_slice_boundaries.sql',
    md5('EV-WEB-CANVAS-VIEWPORT-COMPONENT-SLICE-ARCHITECTURE:297')
  ),
  (
    'EV-WEB-CANVAS-VIEWPORT-COMPONENT-SLICE-PRESENTATION',
    'web.component.canvas.CanvasViewport',
    'test',
    'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/CanvasViewport.test.tsx src/app/views/canvas/CanvasViewport.contextMenu.test.tsx',
    'passing',
    jsonb_build_object('scope', 'CanvasViewport behavior parity after presentation extraction'),
    'tools/planning-db/migrations/297_canvas_viewport_component_slice_boundaries.sql',
    md5('EV-WEB-CANVAS-VIEWPORT-COMPONENT-SLICE-PRESENTATION:297')
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
select
  'local#E-CANVAS-UXDB-COMPONENT-SLICES-1#' || rail_type || '#' || normalized_rail_name as rail_id,
  'E-CANVAS-UXDB-COMPONENT-SLICES-1' as feature_id,
  'implemented' as mechanization_status,
  rail_name,
  normalized_rail_name,
  rail_type,
  ddd_owner,
  'implemented' as rail_status,
  symbol_refs,
  jsonb_build_array(
    'apps/web/src/app/views/canvas/CanvasViewport.tsx',
    'apps/web/src/app/views/canvas/CanvasViewportSurfaceView.tsx',
    'apps/web/src/app/views/canvas/canvasViewportStyle.ts',
    'apps/web/src/app/views/canvas/useCanvasViewportLifecycle.ts',
    'apps/web/src/app/views/canvas/CanvasViewport.architecture.test.ts',
    'apps/web/src/app/views/canvas/canvasInteractionCommandSurface.architecture.test.ts',
    'scripts/planning-db-migrate.test.cjs',
    'tools/planning-db/migrations/297_canvas_viewport_component_slice_boundaries.sql'
  ) as implementation_refs,
  jsonb_build_array(
    'planning-db:component/web.component.canvas.CanvasViewport',
    'planning-db:task/E-CANVAS-UXDB-COMPONENT-SLICES-1'
  ) as documentation_refs,
  jsonb_build_array(
    'AGENTS.md',
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/guides/ai-work-protocol.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md',
    'buzon/TAREA.TXT'
  ) as governing_sources,
  jsonb_build_array(
    'apps/web/src/app/views/canvas/CanvasViewport.tsx',
    'apps/web/src/app/views/canvas/CanvasViewportSurfaceView.tsx',
    'apps/web/src/app/views/canvas/canvasViewportStyle.ts',
    'apps/web/src/app/views/canvas/useCanvasViewportLifecycle.ts',
    'apps/web/src/app/views/canvas/CanvasViewport.architecture.test.ts',
    'apps/web/src/app/views/canvas/canvasInteractionCommandSurface.architecture.test.ts',
    'scripts/planning-db-migrate.test.cjs',
    'tools/planning-db/migrations/297_canvas_viewport_component_slice_boundaries.sql'
  ) as allowed_implementation_surfaces,
  jsonb_build_array(
    'CanvasViewport.architecture.test.ts',
    'canvasInteractionCommandSurface.architecture.test.ts'
  ) as architecture_guards,
  jsonb_build_object(
    'tests', jsonb_build_array(
      'pnpm --filter @dvt/web test:canvas-architecture:run -- src/app/views/canvas/CanvasViewport.architecture.test.ts src/app/views/canvas/canvasInteractionCommandSurface.architecture.test.ts src/app/views/canvas/useCanvasViewportGraphModel.architecture.test.ts',
      'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/CanvasViewport.test.tsx src/app/views/canvas/CanvasViewport.contextMenu.test.tsx',
      'node --test --test-name-pattern "Canvas viewport component slice boundaries" scripts/planning-db-migrate.test.cjs'
    ),
    'dbQueries', jsonb_build_array(
      'pnpm planning:db:query frontend-component-files --limit 160',
      'pnpm planning:db:query frontend-component-rails --limit 160'
    ),
    'noHumanDecisionsRemaining', true
  ) as completion_gate,
  'tools/planning-db/migrations/297_canvas_viewport_component_slice_boundaries.sql' as source_path,
  md5('E-CANVAS-UXDB-COMPONENT-SLICES-1:' || rail_name || ':297') as source_content_sha256,
  jsonb_build_object(
    'purpose', purpose,
    'owner', ddd_owner,
    'componentId', 'web.component.canvas.CanvasViewport'
  ) as raw_rail,
  jsonb_build_object(
    'version', 1,
    'featureId', 'E-CANVAS-UXDB-COMPONENT-SLICES-1',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan', 'Split CanvasViewport into an orchestrator, React Flow presentation template, CSS-variable style model, and imperative lifecycle hook before implementing deeper TAREA.TXT UX changes.',
    'componentGuides', jsonb_build_array('planning-db:component/web.component.canvas.CanvasViewport'),
    'userStories', jsonb_build_array(
      'As a frontend maintainer, I can change Canvas viewport presentation without editing viewport lifecycle effects.',
      'As a product engineer, I can evolve graph-first Canvas presentation through a named React Flow template instead of route-level JSX.'
    ),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/guides/ai-work-protocol.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md',
      'buzon/TAREA.TXT'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', 'RenderCanvasContextualGraphSurface',
        'type', 'query',
        'dddOwner', 'web.component.canvas.CanvasViewport'
      ),
      jsonb_build_object(
        'name', 'GetCanvasLayout',
        'type', 'query',
        'dddOwner', 'web.component.canvas.CanvasViewport'
      )
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'CV-VIEWPORT-ARCH-001',
        'redTest', 'pnpm --filter @dvt/web test:canvas-architecture:run -- src/app/views/canvas/CanvasViewport.architecture.test.ts',
        'expectedFailure', 'CanvasViewportSurfaceView.tsx did not exist and CanvasViewport still owned React Flow presentation.',
        'patchSurfaces', jsonb_build_array(
          'apps/web/src/app/views/canvas/CanvasViewport.tsx',
          'apps/web/src/app/views/canvas/CanvasViewportSurfaceView.tsx',
          'apps/web/src/app/views/canvas/canvasViewportStyle.ts',
          'apps/web/src/app/views/canvas/useCanvasViewportLifecycle.ts'
        ),
        'greenTest', 'pnpm --filter @dvt/web test:canvas-architecture:run -- src/app/views/canvas/CanvasViewport.architecture.test.ts src/app/views/canvas/canvasInteractionCommandSurface.architecture.test.ts src/app/views/canvas/useCanvasViewportGraphModel.architecture.test.ts'
      ),
      jsonb_build_object(
        'id', 'CV-VIEWPORT-DB-001',
        'redTest', 'node --test --test-name-pattern "Canvas viewport component slice boundaries" scripts/planning-db-migrate.test.cjs',
        'expectedFailure', 'Migration 297 was absent, so DB-owned component files and rails were not registered.',
        'patchSurfaces', jsonb_build_array(
          'scripts/planning-db-migrate.test.cjs',
          'tools/planning-db/migrations/297_canvas_viewport_component_slice_boundaries.sql'
        ),
        'greenTest', 'node --test --test-name-pattern "Canvas viewport component slice boundaries" scripts/planning-db-migrate.test.cjs'
      )
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object(
        'name', 'CanvasViewportSurfaceView',
        'path', 'apps/web/src/app/views/canvas/CanvasViewportSurfaceView.tsx',
        'dddOwner', 'web.component.canvas.CanvasViewport',
        'cqRails', jsonb_build_array('RenderCanvasContextualGraphSurface'),
        'fowlerSignals', jsonb_build_array('presentation_logic_mixing'),
        'architectureGuard', 'CanvasViewport.architecture.test.ts',
        'cypressCoverage', 'not-required: architecture-only extraction with CanvasViewport.contextMenu.test.tsx behavior coverage',
        'unitTests', jsonb_build_array(
          'CanvasViewport.test.tsx',
          'CanvasViewport.contextMenu.test.tsx'
        )
      ),
      jsonb_build_object(
        'name', 'CanvasViewportSurfaceViewProps',
        'path', 'apps/web/src/app/views/canvas/CanvasViewportSurfaceView.tsx',
        'dddOwner', 'web.component.canvas.CanvasViewport',
        'cqRails', jsonb_build_array('RenderCanvasContextualGraphSurface'),
        'fowlerSignals', jsonb_build_array('explicit_interface'),
        'architectureGuard', 'CanvasViewport.architecture.test.ts',
        'cypressCoverage', 'not-required: exported view props are verified through presentation tests',
        'unitTests', jsonb_build_array('CanvasViewport.test.tsx')
      ),
      jsonb_build_object(
        'name', 'CanvasViewportReactFlowSurface',
        'path', 'apps/web/src/app/views/canvas/CanvasViewportSurfaceView.tsx',
        'dddOwner', 'web.component.canvas.CanvasViewport',
        'cqRails', jsonb_build_array('RenderCanvasContextualGraphSurface'),
        'fowlerSignals', jsonb_build_array('template_method'),
        'architectureGuard', 'CanvasViewport.architecture.test.ts',
        'cypressCoverage', 'not-required: no browser behavior changed in this component boundary slice',
        'unitTests', jsonb_build_array('CanvasViewport.test.tsx', 'CanvasViewport.contextMenu.test.tsx')
      ),
      jsonb_build_object(
        'name', 'resolveMiniMapNodeColor',
        'path', 'apps/web/src/app/views/canvas/CanvasViewportSurfaceView.tsx',
        'dddOwner', 'web.component.canvas.CanvasViewport',
        'cqRails', jsonb_build_array('RenderCanvasContextualGraphSurface'),
        'fowlerSignals', jsonb_build_array('presentation_projection'),
        'architectureGuard', 'CanvasViewport.architecture.test.ts',
        'cypressCoverage', 'not-required: minimap color is a deterministic view projection',
        'unitTests', jsonb_build_array('CanvasViewport.test.tsx')
      ),
      jsonb_build_object(
        'name', 'resolveCanvasViewportStyle',
        'path', 'apps/web/src/app/views/canvas/canvasViewportStyle.ts',
        'dddOwner', 'web.component.canvas.CanvasViewport',
        'cqRails', jsonb_build_array('GetCanvasLayout'),
        'fowlerSignals', jsonb_build_array('read_model'),
        'architectureGuard', 'CanvasViewport.architecture.test.ts',
        'cypressCoverage', 'not-required: style model is covered by jsdom style assertions',
        'unitTests', jsonb_build_array('CanvasViewport.test.tsx')
      ),
      jsonb_build_object(
        'name', 'applyCanvasViewportStyle',
        'path', 'apps/web/src/app/views/canvas/canvasViewportStyle.ts',
        'dddOwner', 'web.component.canvas.CanvasViewport',
        'cqRails', jsonb_build_array('GetCanvasLayout'),
        'fowlerSignals', jsonb_build_array('side_effect_boundary'),
        'architectureGuard', 'CanvasViewport.architecture.test.ts',
        'cypressCoverage', 'not-required: style side effect is covered by viewport DOM assertions',
        'unitTests', jsonb_build_array('CanvasViewport.test.tsx')
      ),
      jsonb_build_object(
        'name', 'useCanvasViewportLifecycle',
        'path', 'apps/web/src/app/views/canvas/useCanvasViewportLifecycle.ts',
        'dddOwner', 'web.component.canvas.CanvasViewport',
        'cqRails', jsonb_build_array('GetCanvasLayout'),
        'fowlerSignals', jsonb_build_array('lifecycle_boundary'),
        'architectureGuard', 'CanvasViewport.architecture.test.ts',
        'cypressCoverage', 'not-required: lifecycle effects are covered by persisted viewport and imported-node focus tests',
        'unitTests', jsonb_build_array('CanvasViewport.test.tsx')
      ),
      jsonb_build_object(
        'name', 'CanvasViewportLifecycleArgs',
        'path', 'apps/web/src/app/views/canvas/useCanvasViewportLifecycle.ts',
        'dddOwner', 'web.component.canvas.CanvasViewport',
        'cqRails', jsonb_build_array('GetCanvasLayout'),
        'fowlerSignals', jsonb_build_array('explicit_interface'),
        'architectureGuard', 'CanvasViewport.architecture.test.ts',
        'cypressCoverage', 'not-required: type boundary only',
        'unitTests', jsonb_build_array('CanvasViewport.test.tsx')
      ),
      jsonb_build_object(
        'name', 'CanvasViewportPosition',
        'path', 'apps/web/src/app/views/canvas/useCanvasViewportLifecycle.ts',
        'dddOwner', 'web.component.canvas.CanvasViewport',
        'cqRails', jsonb_build_array('GetCanvasLayout'),
        'fowlerSignals', jsonb_build_array('value_object'),
        'architectureGuard', 'CanvasViewport.architecture.test.ts',
        'cypressCoverage', 'not-required: type boundary only',
        'unitTests', jsonb_build_array('CanvasViewport.test.tsx')
      ),
      jsonb_build_object(
        'name', 'CanvasViewportReactFlowApi',
        'path', 'apps/web/src/app/views/canvas/useCanvasViewportLifecycle.ts',
        'dddOwner', 'web.component.canvas.CanvasViewport',
        'cqRails', jsonb_build_array('GetCanvasLayout'),
        'fowlerSignals', jsonb_build_array('port_interface'),
        'architectureGuard', 'CanvasViewport.architecture.test.ts',
        'cypressCoverage', 'not-required: type boundary only',
        'unitTests', jsonb_build_array('CanvasViewport.test.tsx')
      )
    ),
    'domainObjects', jsonb_build_array(
      'CanvasViewport',
      'CanvasViewportSurfaceView',
      'CanvasViewportStyle',
      'CanvasViewportLifecycle'
    ),
    'fowlerSignals', jsonb_build_array('responsibility_overload', 'presentation_logic_mixing'),
    'allowedImplementationSurfaces', jsonb_build_array(
      'apps/web/src/app/views/canvas/CanvasViewport.tsx',
      'apps/web/src/app/views/canvas/CanvasViewportSurfaceView.tsx',
      'apps/web/src/app/views/canvas/canvasViewportStyle.ts',
      'apps/web/src/app/views/canvas/useCanvasViewportLifecycle.ts',
      'apps/web/src/app/views/canvas/CanvasViewport.architecture.test.ts',
      'apps/web/src/app/views/canvas/canvasInteractionCommandSurface.architecture.test.ts',
      'scripts/planning-db-migrate.test.cjs',
      'tools/planning-db/migrations/297_canvas_viewport_component_slice_boundaries.sql'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'apps/web/src/app/views/canvas/CanvasShellMainPanel.tsx',
      'apps/web/src/app/components/InspectorPanel.tsx',
      'apps/web/src/app/components/sourceImportWizard/**',
      'apps/web/cypress/e2e/canvas/**'
    ),
    'architectureGuards', jsonb_build_array(
      'CanvasViewport.architecture.test.ts',
      'canvasInteractionCommandSurface.architecture.test.ts'
    ),
    'cypressFlows', jsonb_build_array(
      'not-required: this slice preserves existing viewport behavior and does not claim DVT/DBT P0 browser flow completion'
    ),
    'completionGate', jsonb_build_array(
      'pnpm --filter @dvt/web test:canvas-architecture:run -- src/app/views/canvas/CanvasViewport.architecture.test.ts src/app/views/canvas/canvasInteractionCommandSurface.architecture.test.ts src/app/views/canvas/useCanvasViewportGraphModel.architecture.test.ts',
      'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/CanvasViewport.test.tsx src/app/views/canvas/CanvasViewport.contextMenu.test.tsx',
      'node --test --test-name-pattern "Canvas viewport component slice boundaries" scripts/planning-db-migrate.test.cjs',
      'pnpm --filter @dvt/web typecheck',
      'pnpm --filter @dvt/web lint',
      'pnpm verify:prepush'
    ),
    'patchSurfaces', jsonb_build_array(
      'CanvasViewport orchestrator',
      'CanvasViewportSurfaceView template',
      'Canvas viewport style model',
      'Canvas viewport lifecycle hook'
    )
  ) as raw_manifest,
  1 as revision,
  'codex' as created_by
from (
  values
    (
      'RenderCanvasContextualGraphSurface',
      'rendercanvascontextualgraphsurface',
      'query',
      'CanvasViewportSurfaceView',
      'Render the graph-first React Flow surface from a named presentation component.',
      jsonb_build_array('apps/web/src/app/views/canvas/CanvasViewportSurfaceView.tsx#CanvasViewportSurfaceView')
    ),
    (
      'GetCanvasLayout',
      'getcanvaslayout',
      'query',
      'canvasViewportStyle;useCanvasViewportLifecycle',
      'Resolve viewport CSS variables and imperative persisted-layout effects outside the presentation template.',
      jsonb_build_array(
        'apps/web/src/app/views/canvas/canvasViewportStyle.ts#resolveCanvasViewportStyle',
        'apps/web/src/app/views/canvas/useCanvasViewportLifecycle.ts#useCanvasViewportLifecycle'
      )
    )
) as rails(rail_name, normalized_rail_name, rail_type, ddd_owner, purpose, symbol_refs)
on conflict (rail_id) do update set
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
