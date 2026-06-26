-- DB-first registration for Canvas NodeWorkbench section strategy wiring.
-- This slice keeps DBT/DVT surface strategy as the authority for contextual
-- workbench tab posture instead of hardcoding primary sections in presentation.

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
  'CANVAS-NODE-WORKBENCH-STRATEGY-SECTIONS-20260626',
  'E-CANVAS-SURFACE-STRATEGY-DBT-DVT-1',
  'Canvas node workbench strategy sections',
  'Frontend / Canvas',
  'implemented',
  'CanvasSurfaceStrategy already declared DBT and DVT node workbench sections, but NodePropertiesTabs still chose primary tabs through a component-local constant. The slice introduces a pure strategy-to-read-model translator so DBT/DVT surface policies choose workbench sections without embedding domain decisions in JSX presentation.',
  'boundary_drift',
  'ResolveCanvasSurfaceStrategy;InspectCanvasNodeProperties',
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
    'CANVAS-NODE-WORKBENCH-STRATEGY-SECTIONS-20260626',
    'component',
    'web.component.canvas.CanvasSurfaceStrategy',
    'may_update',
    true
  ),
  (
    'CANVAS-NODE-WORKBENCH-STRATEGY-SECTIONS-20260626',
    'component',
    'web.component.canvas.CanvasNodeWorkbenchPanel',
    'may_update',
    true
  ),
  (
    'CANVAS-NODE-WORKBENCH-STRATEGY-SECTIONS-20260626',
    'component',
    'web.component.canvas.NodeWorkbench',
    'may_update',
    true
  ),
  (
    'CANVAS-NODE-WORKBENCH-STRATEGY-SECTIONS-20260626',
    'query',
    'ResolveCanvasSurfaceStrategy',
    'may_update',
    true
  ),
  (
    'CANVAS-NODE-WORKBENCH-STRATEGY-SECTIONS-20260626',
    'query',
    'InspectCanvasNodeProperties',
    'may_update',
    true
  ),
  (
    'CANVAS-NODE-WORKBENCH-STRATEGY-SECTIONS-20260626',
    'path',
    'apps/web/src/app/views/canvas/canvasNodeWorkbenchSectionStrategy.ts',
    'may_create',
    true
  ),
  (
    'CANVAS-NODE-WORKBENCH-STRATEGY-SECTIONS-20260626',
    'path',
    'apps/web/src/app/views/canvas/canvasNodeWorkbenchSectionStrategy.test.ts',
    'may_create',
    true
  ),
  (
    'CANVAS-NODE-WORKBENCH-STRATEGY-SECTIONS-20260626',
    'path',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.tsx',
    'may_update',
    true
  ),
  (
    'CANVAS-NODE-WORKBENCH-STRATEGY-SECTIONS-20260626',
    'path',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
    'may_update',
    true
  ),
  (
    'CANVAS-NODE-WORKBENCH-STRATEGY-SECTIONS-20260626',
    'path',
    'apps/web/src/app/components/inspector/NodePropertiesTabs.tsx',
    'may_update',
    true
  ),
  (
    'CANVAS-NODE-WORKBENCH-STRATEGY-SECTIONS-20260626',
    'path',
    'apps/web/src/app/components/inspector/NodePropertiesTabs.primarySections.test.tsx',
    'may_update',
    true
  ),
  (
    'CANVAS-NODE-WORKBENCH-STRATEGY-SECTIONS-20260626',
    'path',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx',
    'may_update',
    true
  ),
  (
    'CANVAS-NODE-WORKBENCH-STRATEGY-SECTIONS-20260626',
    'path',
    'scripts/planning-db-migrate.test.cjs',
    'may_update',
    true
  ),
  (
    'CANVAS-NODE-WORKBENCH-STRATEGY-SECTIONS-20260626',
    'path',
    'tools/planning-db/migrations/298_canvas_node_workbench_strategy_sections.sql',
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
    'web.component.canvas.CanvasSurfaceStrategy',
    'apps/web/src/app/views/canvas/canvasNodeWorkbenchSectionStrategy.ts',
    'model',
    'resolveNodeWorkbenchPrimarySectionIds',
    jsonb_build_object(
      'role', 'Canvas surface strategy to node properties read-model translator',
      'responsibility', 'maps DBT/DVT workbench section vocabulary to NodePropertiesReadModel section identifiers',
      'rail', 'ResolveCanvasSurfaceStrategy',
      'forbiddenResponsibilities', jsonb_build_array(
        'rendering JSX',
        'reading React state',
        'choosing plugin-specific tabs inside NodePropertiesTabs'
      )
    ),
    'tools/planning-db/migrations/298_canvas_node_workbench_strategy_sections.sql',
    md5('canvasNodeWorkbenchSectionStrategy#resolveNodeWorkbenchPrimarySectionIds:298')
  ),
  (
    'web.component.canvas.CanvasSurfaceStrategy',
    'apps/web/src/app/views/canvas/canvasNodeWorkbenchSectionStrategy.test.ts',
    'test',
    null,
    jsonb_build_object(
      'coverage', 'DBT and DVT surface sections map deterministically into node property workbench sections'
    ),
    'tools/planning-db/migrations/298_canvas_node_workbench_strategy_sections.sql',
    md5('canvasNodeWorkbenchSectionStrategy.test.ts:298')
  ),
  (
    'web.component.canvas.CanvasNodeWorkbenchPanel',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.tsx',
    'component',
    'CanvasNodeWorkbenchOverlay',
    jsonb_build_object(
      'role', 'contextual NodeWorkbench overlay gate',
      'responsibility', 'passes the active CanvasSurfaceStrategy node workbench sections to the panel without translating them in JSX',
      'rail', 'ResolveCanvasSurfaceStrategy'
    ),
    'tools/planning-db/migrations/298_canvas_node_workbench_strategy_sections.sql',
    md5('CanvasNodeWorkbenchOverlay#CanvasNodeWorkbenchOverlay:298')
  ),
  (
    'web.component.canvas.CanvasNodeWorkbenchPanel',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
    'component',
    'CanvasNodeWorkbenchPanel',
    jsonb_build_object(
      'role', 'contextual NodeWorkbench panel',
      'responsibility', 'adapts active surface strategy sections through the pure translator and renders passive node properties tabs',
      'rails', jsonb_build_array('ResolveCanvasSurfaceStrategy', 'InspectCanvasNodeProperties')
    ),
    'tools/planning-db/migrations/298_canvas_node_workbench_strategy_sections.sql',
    md5('CanvasNodeWorkbenchPanel#CanvasNodeWorkbenchPanel:298')
  ),
  (
    'web.component.canvas.NodeWorkbench',
    'apps/web/src/app/components/inspector/NodePropertiesTabs.tsx',
    'component',
    'NodePropertiesTabs',
    jsonb_build_object(
      'role', 'passive node properties tabs presentation',
      'responsibility', 'renders caller-provided primary read-model sections before More overflow and does not select DBT/DVT strategy itself',
      'rail', 'InspectCanvasNodeProperties'
    ),
    'tools/planning-db/migrations/298_canvas_node_workbench_strategy_sections.sql',
    md5('NodePropertiesTabs#primarySectionIds:298')
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
    'web.component.canvas.CanvasSurfaceStrategy',
    'ResolveCanvasSurfaceStrategy',
    'query',
    'implemented-local',
    jsonb_build_object(
      'purpose', 'Resolve DBT/DVT contextual canvas surface policies, including node workbench section vocabulary.',
      'owner', 'CanvasSurfaceStrategy',
      'negativeTests', jsonb_build_array(
        'canvasNodeWorkbenchSectionStrategy.test.ts rejects presentation-local tab policy by mapping strategy sections outside JSX',
        'CanvasNodeWorkbenchOverlay.test.ts proves the active surface strategy reaches the workbench panel'
      )
    ),
    'tools/planning-db/migrations/298_canvas_node_workbench_strategy_sections.sql',
    md5('CanvasSurfaceStrategy:ResolveCanvasSurfaceStrategy:298')
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
    'EV-WEB-CANVAS-NODE-WORKBENCH-STRATEGY-SECTIONS-PRESENTATION',
    'web.component.canvas.CanvasNodeWorkbenchPanel',
    'test',
    'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/components/inspector/NodePropertiesTabs.primarySections.test.tsx src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx',
    'passing',
    jsonb_build_object('scope', 'strategy-owned primary section flow from overlay to passive tabs'),
    'tools/planning-db/migrations/298_canvas_node_workbench_strategy_sections.sql',
    md5('EV-WEB-CANVAS-NODE-WORKBENCH-STRATEGY-SECTIONS-PRESENTATION:298')
  ),
  (
    'EV-WEB-CANVAS-NODE-WORKBENCH-STRATEGY-SECTIONS-UNIT',
    'web.component.canvas.CanvasSurfaceStrategy',
    'test',
    'pnpm --filter @dvt/web test:canvas-unit:run -- src/app/views/canvas/canvasNodeWorkbenchSectionStrategy.test.ts',
    'passing',
    jsonb_build_object('scope', 'pure DBT/DVT surface-section to read-model-section translation'),
    'tools/planning-db/migrations/298_canvas_node_workbench_strategy_sections.sql',
    md5('EV-WEB-CANVAS-NODE-WORKBENCH-STRATEGY-SECTIONS-UNIT:298')
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
  'local#E-CANVAS-SURFACE-STRATEGY-DBT-DVT-1#' || rail_type || '#' || normalized_rail_name as rail_id,
  'E-CANVAS-SURFACE-STRATEGY-DBT-DVT-1' as feature_id,
  'implemented' as mechanization_status,
  rail_name,
  normalized_rail_name,
  rail_type,
  ddd_owner,
  'implemented' as rail_status,
  symbol_refs,
  jsonb_build_array(
    'apps/web/src/app/views/canvas/canvasNodeWorkbenchSectionStrategy.ts',
    'apps/web/src/app/views/canvas/canvasNodeWorkbenchSectionStrategy.test.ts',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.tsx',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
    'apps/web/src/app/components/inspector/NodePropertiesTabs.tsx',
    'apps/web/src/app/components/inspector/NodePropertiesTabs.primarySections.test.tsx',
    'scripts/planning-db-migrate.test.cjs',
    'tools/planning-db/migrations/298_canvas_node_workbench_strategy_sections.sql'
  ) as implementation_refs,
  jsonb_build_array(
      'planning-db:component/web.component.canvas.CanvasSurfaceStrategy',
      'planning-db:component/web.component.canvas.CanvasNodeWorkbenchPanel',
      'planning-db:component/web.component.canvas.NodeWorkbench',
    'planning-db:task/E-CANVAS-SURFACE-STRATEGY-DBT-DVT-1'
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
    'apps/web/src/app/views/canvas/canvasNodeWorkbenchSectionStrategy.ts',
    'apps/web/src/app/views/canvas/canvasNodeWorkbenchSectionStrategy.test.ts',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.tsx',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
    'apps/web/src/app/components/inspector/NodePropertiesTabs.tsx',
    'apps/web/src/app/components/inspector/NodePropertiesTabs.primarySections.test.tsx',
    'scripts/planning-db-migrate.test.cjs',
    'tools/planning-db/migrations/298_canvas_node_workbench_strategy_sections.sql'
  ) as allowed_implementation_surfaces,
  jsonb_build_array(
    'NodePropertiesTabs.primarySections.test.tsx',
    'CanvasNodeWorkbenchOverlay.test.tsx',
    'canvasNodeWorkbenchSectionStrategy.test.ts'
  ) as architecture_guards,
  jsonb_build_object(
    'tests', jsonb_build_array(
      'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/components/inspector/NodePropertiesTabs.primarySections.test.tsx src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx',
      'pnpm --filter @dvt/web test:canvas-unit:run -- src/app/views/canvas/canvasNodeWorkbenchSectionStrategy.test.ts',
      'node --test --test-name-pattern "Canvas node workbench strategy sections" scripts/planning-db-migrate.test.cjs'
    ),
    'dbQueries', jsonb_build_array(
      'pnpm planning:db:query frontend-component-files --limit 260',
      'pnpm planning:db:query frontend-component-rails --limit 260'
    ),
    'noHumanDecisionsRemaining', true
  ) as completion_gate,
  'tools/planning-db/migrations/298_canvas_node_workbench_strategy_sections.sql' as source_path,
  md5('E-CANVAS-SURFACE-STRATEGY-DBT-DVT-1:' || rail_name || ':298') as source_content_sha256,
  jsonb_build_object(
    'purpose', purpose,
    'owner', ddd_owner,
    'componentId', component_id
  ) as raw_rail,
  jsonb_build_object(
    'version', 1,
    'featureId', 'E-CANVAS-SURFACE-STRATEGY-DBT-DVT-1',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan', 'Move node workbench primary tab selection behind CanvasSurfaceStrategy by translating DBT/DVT surface sections into NodePropertiesReadModel section ids outside JSX presentation.',
    'componentGuides', jsonb_build_array(
      'planning-db:component/web.component.canvas.CanvasSurfaceStrategy',
      'planning-db:component/web.component.canvas.NodeWorkbench'
    ),
    'userStories', jsonb_build_array(
      'As a DBT canvas user, the Node Workbench presents DBT-relevant sections selected by DBT surface strategy.',
      'As a DVT canvas user, the Node Workbench presents DVT-relevant sections selected by DVT surface strategy.',
      'As a frontend maintainer, I can change strategy vocabulary without editing passive tab JSX.'
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
        'name', 'ResolveCanvasSurfaceStrategy',
        'type', 'query',
        'dddOwner', 'web.component.canvas.CanvasSurfaceStrategy'
      ),
      jsonb_build_object(
        'name', 'InspectCanvasNodeProperties',
        'type', 'query',
        'dddOwner', 'web.component.canvas.NodeWorkbench'
      )
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'CWS-STRATEGY-TABS-001',
        'redTest', 'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/components/inspector/NodePropertiesTabs.primarySections.test.tsx src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx',
        'expectedFailure', 'NodePropertiesTabs ignored caller-provided primary sections and CanvasNodeWorkbenchOverlay did not pass surfaceStrategy.nodeWorkbench.sections to the panel.',
        'patchSurfaces', jsonb_build_array(
          'apps/web/src/app/components/inspector/NodePropertiesTabs.tsx',
          'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.tsx',
          'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
          'apps/web/src/app/views/canvas/canvasNodeWorkbenchSectionStrategy.ts'
        ),
        'greenTest', 'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/components/inspector/NodePropertiesTabs.primarySections.test.tsx src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx'
      )
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object(
        'name', 'resolveNodeWorkbenchPrimarySectionIds',
        'path', 'apps/web/src/app/views/canvas/canvasNodeWorkbenchSectionStrategy.ts',
        'dddOwner', 'web.component.canvas.CanvasSurfaceStrategy',
        'cqRails', jsonb_build_array('ResolveCanvasSurfaceStrategy'),
        'fowlerSignals', jsonb_build_array('strategy_pattern', 'anti_corruption_layer'),
        'architectureGuard', 'canvasNodeWorkbenchSectionStrategy.test.ts',
        'cypressCoverage', 'not-required: pure strategy translator with component-level behavior coverage',
        'unitTests', jsonb_build_array('canvasNodeWorkbenchSectionStrategy.test.ts')
      ),
      jsonb_build_object(
        'name', 'STRATEGY_SECTION_TO_NODE_PROPERTY_SECTION',
        'path', 'apps/web/src/app/views/canvas/canvasNodeWorkbenchSectionStrategy.ts',
        'dddOwner', 'web.component.canvas.CanvasSurfaceStrategy',
        'cqRails', jsonb_build_array('ResolveCanvasSurfaceStrategy'),
        'fowlerSignals', jsonb_build_array('published_language'),
        'architectureGuard', 'canvasNodeWorkbenchSectionStrategy.test.ts',
        'cypressCoverage', 'not-required: constant read model is covered by translator unit test',
        'unitTests', jsonb_build_array('canvasNodeWorkbenchSectionStrategy.test.ts')
      ),
      jsonb_build_object(
        'name', 'NodePropertiesTabs',
        'path', 'apps/web/src/app/components/inspector/NodePropertiesTabs.tsx',
        'dddOwner', 'web.component.canvas.NodeWorkbench',
        'cqRails', jsonb_build_array('InspectCanvasNodeProperties'),
        'fowlerSignals', jsonb_build_array('passive_view'),
        'architectureGuard', 'NodePropertiesTabs.primarySections.test.tsx',
        'cypressCoverage', 'not-required: passive tab ordering covered by component tests',
        'unitTests', jsonb_build_array('NodePropertiesTabs.primarySections.test.tsx')
      ),
      jsonb_build_object(
        'name', 'resolvePrimarySections',
        'path', 'apps/web/src/app/components/inspector/NodePropertiesTabs.tsx',
        'dddOwner', 'web.component.canvas.NodeWorkbench',
        'cqRails', jsonb_build_array('InspectCanvasNodeProperties'),
        'fowlerSignals', jsonb_build_array('presentation_projection'),
        'architectureGuard', 'NodePropertiesTabs.primarySections.test.tsx',
        'cypressCoverage', 'not-required: helper is covered by primary section component test',
        'unitTests', jsonb_build_array('NodePropertiesTabs.primarySections.test.tsx')
      ),
      jsonb_build_object(
        'name', 'CanvasNodeWorkbenchPanel',
        'path', 'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
        'dddOwner', 'web.component.canvas.CanvasNodeWorkbenchPanel',
        'cqRails', jsonb_build_array('ResolveCanvasSurfaceStrategy', 'InspectCanvasNodeProperties'),
        'fowlerSignals', jsonb_build_array('orchestrator'),
        'architectureGuard', 'CanvasNodeWorkbenchPanel.test.tsx',
        'cypressCoverage', 'not-required: strategy handoff covered through overlay and panel component tests',
        'unitTests', jsonb_build_array('CanvasNodeWorkbenchPanel.test.tsx')
      ),
      jsonb_build_object(
        'name', 'CanvasNodeWorkbenchOverlay',
        'path', 'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.tsx',
        'dddOwner', 'web.component.canvas.CanvasNodeWorkbenchPanel',
        'cqRails', jsonb_build_array('ResolveCanvasSurfaceStrategy'),
        'fowlerSignals', jsonb_build_array('strategy_dispatch'),
        'architectureGuard', 'CanvasNodeWorkbenchOverlay.test.tsx',
        'cypressCoverage', 'not-required: overlay gating and strategy handoff covered by component test',
        'unitTests', jsonb_build_array('CanvasNodeWorkbenchOverlay.test.tsx')
      )
    ),
    'domainObjects', jsonb_build_array(
      'CanvasSurfaceStrategy',
      'CanvasNodeWorkbenchSectionStrategy',
      'CanvasNodeWorkbenchPanel',
      'NodeWorkbench',
      'NodePropertiesTabs'
    ),
    'fowlerSignals', jsonb_build_array('strategy_pattern', 'presentation_logic_mixing'),
    'allowedImplementationSurfaces', jsonb_build_array(
      'apps/web/src/app/views/canvas/canvasNodeWorkbenchSectionStrategy.ts',
      'apps/web/src/app/views/canvas/canvasNodeWorkbenchSectionStrategy.test.ts',
      'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.tsx',
      'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx',
      'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
      'apps/web/src/app/components/inspector/NodePropertiesTabs.tsx',
      'apps/web/src/app/components/inspector/NodePropertiesTabs.primarySections.test.tsx',
      'scripts/planning-db-migrate.test.cjs',
      'tools/planning-db/migrations/298_canvas_node_workbench_strategy_sections.sql'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'apps/web/src/app/views/canvas/CanvasShellMainPanel.tsx',
      'apps/web/src/app/views/canvas/DbtAuthoringFields.tsx',
      'apps/web/src/app/views/canvas/DvtAuthoringFields.tsx',
      'apps/web/cypress/e2e/canvas/**'
    ),
    'architectureGuards', jsonb_build_array(
      'NodePropertiesTabs.primarySections.test.tsx',
      'CanvasNodeWorkbenchOverlay.test.tsx',
      'canvasNodeWorkbenchSectionStrategy.test.ts'
    ),
    'cypressFlows', jsonb_build_array(
      'not-required: this slice changes component strategy dispatch, not the end-to-end DBT/DVT flow'
    ),
    'completionGate', jsonb_build_array(
      'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/components/inspector/NodePropertiesTabs.primarySections.test.tsx src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx',
      'pnpm --filter @dvt/web test:canvas-unit:run -- src/app/views/canvas/canvasNodeWorkbenchSectionStrategy.test.ts',
      'node --test --test-name-pattern "Canvas node workbench strategy sections" scripts/planning-db-migrate.test.cjs',
      'pnpm --filter @dvt/web typecheck',
      'pnpm --filter @dvt/web lint',
      'pnpm verify:prepush'
    ),
    'patchSurfaces', jsonb_build_array(
      'Canvas surface strategy section translator',
      'NodePropertiesTabs primary-section presentation contract',
      'CanvasNodeWorkbenchOverlay strategy handoff',
      'CanvasNodeWorkbenchPanel translator composition'
    )
  ) as raw_manifest,
  1 as revision,
  'codex' as created_by
from (
  values
    (
      'web.component.canvas.CanvasSurfaceStrategy',
      'ResolveCanvasSurfaceStrategy',
      'resolvecanvassurfacestrategy',
      'query',
      'CanvasSurfaceStrategy',
      'Resolve DBT/DVT surface strategy sections into a workbench presentation contract.',
      jsonb_build_array(
        'apps/web/src/app/views/canvas/canvasNodeWorkbenchSectionStrategy.ts#resolveNodeWorkbenchPrimarySectionIds',
        'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.tsx#CanvasNodeWorkbenchOverlay'
      )
    )
) as rails(component_id, rail_name, normalized_rail_name, rail_type, ddd_owner, purpose, symbol_refs)
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
