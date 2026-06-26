-- DB-first registration for section-scoped Node Workbench authoring.
-- The existing InspectCanvasNodeProperties query remains the owner. This slice
-- moves DVT transform column selection to Columns and SQL editing to Code
-- without creating a parallel command/query rail.

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
  'CANVAS-NODE-WORKBENCH-SECTION-AUTHORING-20260626',
  'E-CANVAS-NODE-WORKBENCH-1',
  'Canvas node workbench section-scoped authoring',
  'Frontend / Canvas Node Workbench',
  'implemented',
  'The Node Workbench already projected columns and SQL through InspectCanvasNodeProperties, but editable DVT transform controls were rendered as one general authoring block. This slice scopes authoring controls to the section that owns the user intent: selected input columns in Columns and transform SQL in Code.',
  'responsibility_overload',
  'InspectCanvasNodeProperties',
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
    'CANVAS-NODE-WORKBENCH-SECTION-AUTHORING-20260626',
    'component',
    'web.component.canvas.CanvasNodeWorkbenchPanel',
    'may_update',
    true
  ),
  (
    'CANVAS-NODE-WORKBENCH-SECTION-AUTHORING-20260626',
    'component',
    'web.component.canvas.NodeWorkbench',
    'may_update',
    true
  ),
  (
    'CANVAS-NODE-WORKBENCH-SECTION-AUTHORING-20260626',
    'component',
    'web.component.canvas.DvtAuthoringFields',
    'may_update',
    true
  ),
  (
    'CANVAS-NODE-WORKBENCH-SECTION-AUTHORING-20260626',
    'query',
    'InspectCanvasNodeProperties',
    'may_update',
    true
  ),
  (
    'CANVAS-NODE-WORKBENCH-SECTION-AUTHORING-20260626',
    'path',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
    'may_update',
    true
  ),
  (
    'CANVAS-NODE-WORKBENCH-SECTION-AUTHORING-20260626',
    'path',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx',
    'may_update',
    true
  ),
  (
    'CANVAS-NODE-WORKBENCH-SECTION-AUTHORING-20260626',
    'path',
    'apps/web/src/app/components/inspector/NodePropertiesTabs.tsx',
    'may_update',
    true
  ),
  (
    'CANVAS-NODE-WORKBENCH-SECTION-AUTHORING-20260626',
    'path',
    'apps/web/src/app/views/canvas/CanvasInspectorAuthoringSection.tsx',
    'may_update',
    true
  ),
  (
    'CANVAS-NODE-WORKBENCH-SECTION-AUTHORING-20260626',
    'path',
    'apps/web/src/app/views/canvas/DvtAuthoringFields.tsx',
    'may_update',
    true
  ),
  (
    'CANVAS-NODE-WORKBENCH-SECTION-AUTHORING-20260626',
    'path',
    'apps/web/src/app/views/canvas/DvtSqlTransformAuthoringSection.tsx',
    'may_update',
    true
  ),
  (
    'CANVAS-NODE-WORKBENCH-SECTION-AUTHORING-20260626',
    'path',
    'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts',
    'may_update',
    true
  ),
  (
    'CANVAS-NODE-WORKBENCH-SECTION-AUTHORING-20260626',
    'path',
    'apps/web/src/app/views/canvas/CanvasViewport.contextMenu.test.tsx',
    'may_update',
    true
  ),
  (
    'CANVAS-NODE-WORKBENCH-SECTION-AUTHORING-20260626',
    'path',
    'scripts/planning-db-migrate.test.cjs',
    'may_update',
    true
  ),
  (
    'CANVAS-NODE-WORKBENCH-SECTION-AUTHORING-20260626',
    'path',
    'tools/planning-db/migrations/334_canvas_node_workbench_section_authoring.sql',
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
    'web.component.canvas.CanvasNodeWorkbenchPanel',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
    'component',
    'CanvasNodeWorkbenchPanel',
    jsonb_build_object(
      'role', 'contextual Node Workbench panel',
      'responsibility', 'injects section-scoped authoring controls into passive node property sections',
      'rail', 'InspectCanvasNodeProperties',
      'sectionSlots', jsonb_build_array('general', 'columns', 'code')
    ),
    'tools/planning-db/migrations/334_canvas_node_workbench_section_authoring.sql',
    md5('CanvasNodeWorkbenchPanel#sectionChildren:334')
  ),
  (
    'web.component.canvas.NodeWorkbench',
    'apps/web/src/app/components/inspector/NodePropertiesTabs.tsx',
    'component',
    'NodePropertiesTabs',
    jsonb_build_object(
      'role', 'passive node property tab renderer',
      'responsibility', 'renders caller-owned section children without choosing DVT or DBT authoring policy',
      'rail', 'InspectCanvasNodeProperties',
      'newProp', 'sectionChildren'
    ),
    'tools/planning-db/migrations/334_canvas_node_workbench_section_authoring.sql',
    md5('NodePropertiesTabs#sectionChildren:334')
  ),
  (
    'web.component.canvas.CanvasNodeWorkbenchPanel',
    'apps/web/src/app/views/canvas/CanvasInspectorAuthoringSection.tsx',
    'component',
    'CanvasInspectorAuthoringSection',
    jsonb_build_object(
      'role', 'route-owned node authoring orchestrator',
      'responsibility', 'renders general, columns, or code authoring intent while preserving the route-owned draft contract',
      'rail', 'InspectCanvasNodeProperties'
    ),
    'tools/planning-db/migrations/334_canvas_node_workbench_section_authoring.sql',
    md5('CanvasInspectorAuthoringSection#section:334')
  ),
  (
    'web.component.canvas.DvtAuthoringFields',
    'apps/web/src/app/views/canvas/DvtAuthoringFields.tsx',
    'component',
    'DvtAuthoringFields',
    jsonb_build_object(
      'role', 'DVT node authoring strategy dispatcher',
      'responsibility', 'routes DVT source, transform, and sink controls to the owning workbench section',
      'rail', 'InspectCanvasNodeProperties'
    ),
    'tools/planning-db/migrations/334_canvas_node_workbench_section_authoring.sql',
    md5('DvtAuthoringFields#section:334')
  ),
  (
    'web.component.canvas.DvtAuthoringFields',
    'apps/web/src/app/views/canvas/DvtSqlTransformAuthoringSection.tsx',
    'component',
    'DvtSqlTransformAuthoringSection',
    jsonb_build_object(
      'role', 'DVT SQL transform authoring section',
      'responsibility', 'renders transform SQL editing and input-column selection independently for Code and Columns tabs',
      'rail', 'InspectCanvasNodeProperties'
    ),
    'tools/planning-db/migrations/334_canvas_node_workbench_section_authoring.sql',
    md5('DvtSqlTransformAuthoringSection#section:334')
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
    'EV-WEB-CANVAS-NODE-WORKBENCH-SECTION-AUTHORING',
    'web.component.canvas.CanvasNodeWorkbenchPanel',
    'test',
    'pnpm --dir apps/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx',
    'passing',
    jsonb_build_object(
      'scope', 'DVT transform input-column selection appears in Columns and transform SQL appears in Code',
      'task', 'E-CANVAS-NODE-WORKBENCH-1'
    ),
    'tools/planning-db/migrations/334_canvas_node_workbench_section_authoring.sql',
    md5('EV-WEB-CANVAS-NODE-WORKBENCH-SECTION-AUTHORING:334')
  ),
  (
    'EV-WEB-CANVAS-CONTEXT-MENU-ECHO-SEQUENCE',
    'web.component.canvas.CanvasViewport',
    'test',
    'pnpm --dir apps/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/CanvasViewport.contextMenu.test.tsx',
    'passing',
    jsonb_build_object(
      'scope', 'Canvas Add source remains clickable after the browser context-menu echo sequence',
      'task', 'E-CANVAS-CONTEXT-MENU-GRAMMAR-1'
    ),
    'tools/planning-db/migrations/334_canvas_node_workbench_section_authoring.sql',
    md5('EV-WEB-CANVAS-CONTEXT-MENU-ECHO-SEQUENCE:334')
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

with patch as (
  select
    jsonb_build_array(
      'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
      'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx',
      'apps/web/src/app/components/inspector/NodePropertiesTabs.tsx',
      'apps/web/src/app/views/canvas/CanvasInspectorAuthoringSection.tsx',
      'apps/web/src/app/views/canvas/DvtAuthoringFields.tsx',
      'apps/web/src/app/views/canvas/DvtSqlTransformAuthoringSection.tsx',
      'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts',
      'apps/web/src/app/views/canvas/CanvasViewport.contextMenu.test.tsx',
      'scripts/planning-db-migrate.test.cjs',
      'tools/planning-db/migrations/334_canvas_node_workbench_section_authoring.sql'
    ) as allowed_surfaces,
    jsonb_build_array(
      'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx#CanvasNodeWorkbenchPanel',
      'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx#renderAuthoringSection',
      'apps/web/src/app/components/inspector/NodePropertiesTabs.tsx#NodePropertiesTabs',
      'apps/web/src/app/views/canvas/CanvasInspectorAuthoringSection.tsx#CanvasInspectorAuthoringSection',
      'apps/web/src/app/views/canvas/DvtAuthoringFields.tsx#DvtAuthoringFields',
      'apps/web/src/app/views/canvas/DvtSqlTransformAuthoringSection.tsx#DvtSqlTransformAuthoringSection',
      'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts#useCanvasContextMenuPresenter'
    ) as symbol_refs,
    jsonb_build_array(
      'pnpm --dir apps/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx',
      'pnpm --dir apps/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/CanvasViewport.contextMenu.test.tsx',
      'node --test --test-name-pattern "Canvas node workbench section authoring" scripts/planning-db-migrate.test.cjs',
      'pnpm docs:feature-mechanization:implementation'
    ) as guards,
    jsonb_build_array(
      jsonb_build_object(
        'id', 'node-workbench-section-authoring',
        'redTest', 'pnpm --dir apps/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx',
        'expectedFailure', 'DVT transform input-column selection is absent from Columns and SQL editing is absent from Code.',
        'patchSurfaces', jsonb_build_array(
          'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
          'apps/web/src/app/components/inspector/NodePropertiesTabs.tsx',
          'apps/web/src/app/views/canvas/CanvasInspectorAuthoringSection.tsx',
          'apps/web/src/app/views/canvas/DvtAuthoringFields.tsx',
          'apps/web/src/app/views/canvas/DvtSqlTransformAuthoringSection.tsx'
        ),
        'greenTest', 'pnpm --dir apps/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx'
      ),
      jsonb_build_object(
        'id', 'canvas-context-menu-echo-clickable-source',
        'redTest', 'pnpm --dir apps/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/CanvasViewport.contextMenu.test.tsx',
        'expectedFailure', 'The document pointerdown echo closes the Canvas menu before Add source can be clicked.',
        'patchSurfaces', jsonb_build_array(
          'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts',
          'apps/web/src/app/views/canvas/CanvasViewport.contextMenu.test.tsx'
        ),
        'greenTest', 'pnpm --dir apps/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/CanvasViewport.contextMenu.test.tsx'
      )
    ) as cycles,
    jsonb_build_array(
      jsonb_build_object(
        'name', 'CanvasNodeWorkbenchPanel',
        'path', 'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
        'dddOwner', 'web.component.canvas.CanvasNodeWorkbenchPanel',
        'cqRails', jsonb_build_array('InspectCanvasNodeProperties'),
        'fowlerSignals', jsonb_build_array('orchestrator', 'sectioned_presentation'),
        'architectureGuard', 'CanvasNodeWorkbenchPanel.test.tsx',
        'cypressCoverage', 'not_required:component-level section dispatch',
        'unitTests', jsonb_build_array('CanvasNodeWorkbenchPanel.test.tsx')
      ),
      jsonb_build_object(
        'name', 'NodePropertiesTabs',
        'path', 'apps/web/src/app/components/inspector/NodePropertiesTabs.tsx',
        'dddOwner', 'web.component.canvas.NodeWorkbench',
        'cqRails', jsonb_build_array('InspectCanvasNodeProperties'),
        'fowlerSignals', jsonb_build_array('passive_view'),
        'architectureGuard', 'CanvasNodeWorkbenchPanel.test.tsx',
        'cypressCoverage', 'not_required:passive section slot',
        'unitTests', jsonb_build_array('CanvasNodeWorkbenchPanel.test.tsx')
      ),
      jsonb_build_object(
        'name', 'CanvasInspectorAuthoringSection',
        'path', 'apps/web/src/app/views/canvas/CanvasInspectorAuthoringSection.tsx',
        'dddOwner', 'web.component.canvas.CanvasNodeWorkbenchPanel',
        'cqRails', jsonb_build_array('InspectCanvasNodeProperties'),
        'fowlerSignals', jsonb_build_array('application_state_boundary'),
        'architectureGuard', 'CanvasNodeWorkbenchPanel.test.tsx',
        'cypressCoverage', 'not_required:component-level authoring placement',
        'unitTests', jsonb_build_array('CanvasNodeWorkbenchPanel.test.tsx')
      ),
      jsonb_build_object(
        'name', 'DvtAuthoringFields',
        'path', 'apps/web/src/app/views/canvas/DvtAuthoringFields.tsx',
        'dddOwner', 'web.component.canvas.DvtAuthoringFields',
        'cqRails', jsonb_build_array('InspectCanvasNodeProperties'),
        'fowlerSignals', jsonb_build_array('strategy_dispatch'),
        'architectureGuard', 'CanvasNodeWorkbenchPanel.test.tsx',
        'cypressCoverage', 'not_required:component-level authoring placement',
        'unitTests', jsonb_build_array('CanvasNodeWorkbenchPanel.test.tsx', 'DvtAuthoringFields.test.tsx')
      ),
      jsonb_build_object(
        'name', 'DvtSqlTransformAuthoringSection',
        'path', 'apps/web/src/app/views/canvas/DvtSqlTransformAuthoringSection.tsx',
        'dddOwner', 'web.component.canvas.DvtAuthoringFields',
        'cqRails', jsonb_build_array('InspectCanvasNodeProperties'),
        'fowlerSignals', jsonb_build_array('extract_component', 'sectioned_presentation'),
        'architectureGuard', 'CanvasNodeWorkbenchPanel.test.tsx',
        'cypressCoverage', 'not_required:component-level authoring placement',
        'unitTests', jsonb_build_array('CanvasNodeWorkbenchPanel.test.tsx', 'DvtAuthoringFields.test.tsx')
      ),
      jsonb_build_object(
        'name', 'useCanvasContextMenuPresenter',
        'path', 'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts',
        'dddOwner', 'web.component.canvas.CanvasViewport',
        'cqRails', jsonb_build_array('ResolveCanvasContextMenu'),
        'fowlerSignals', jsonb_build_array('interaction_presenter'),
        'architectureGuard', 'CanvasViewport.contextMenu.test.tsx',
        'cypressCoverage', 'not_required:presenter echo policy covered by component test',
        'unitTests', jsonb_build_array('CanvasViewport.contextMenu.test.tsx')
      )
    ) as symbols
),
target_rails as (
  select rail.*
  from planning_query_store.feature_mechanization_local_rails rail
  where rail.feature_id = 'CANVAS-NODE-CONTEXT-PROPERTIES-PANEL-20260604'
    and rail.normalized_rail_name = 'inspectcanvasnodeproperties'
),
merged_allowed_surfaces as (
  select
    target_rails.rail_id,
    coalesce(jsonb_agg(value order by value), '[]'::jsonb) as value
  from target_rails
  cross join patch
  cross join lateral (
    select value
    from jsonb_array_elements_text(coalesce(target_rails.allowed_implementation_surfaces, '[]'::jsonb))
    union
    select value
    from jsonb_array_elements_text(coalesce(target_rails.raw_manifest->'allowedImplementationSurfaces', '[]'::jsonb))
    union
    select value
    from jsonb_array_elements_text(patch.allowed_surfaces)
  ) refs
  group by target_rails.rail_id
),
merged_symbol_refs as (
  select
    target_rails.rail_id,
    coalesce(jsonb_agg(value order by value), '[]'::jsonb) as value
  from target_rails
  cross join patch
  cross join lateral (
    select value
    from jsonb_array_elements_text(coalesce(target_rails.symbol_refs, '[]'::jsonb))
    union
    select value
    from jsonb_array_elements_text(patch.symbol_refs)
  ) refs
  group by target_rails.rail_id
),
merged_implementation_refs as (
  select
    target_rails.rail_id,
    coalesce(jsonb_agg(value order by value), '[]'::jsonb) as value
  from target_rails
  cross join patch
  cross join lateral (
    select value
    from jsonb_array_elements_text(coalesce(target_rails.implementation_refs, '[]'::jsonb))
    union
    select value
    from jsonb_array_elements_text(patch.symbol_refs)
    union
    select value
    from jsonb_array_elements_text(patch.allowed_surfaces)
  ) refs
  group by target_rails.rail_id
),
merged_guards as (
  select
    target_rails.rail_id,
    coalesce(jsonb_agg(value order by value), '[]'::jsonb) as value
  from target_rails
  cross join patch
  cross join lateral (
    select value
    from jsonb_array_elements_text(coalesce(target_rails.architecture_guards, '[]'::jsonb))
    union
    select value
    from jsonb_array_elements_text(coalesce(target_rails.raw_manifest->'architectureGuards', '[]'::jsonb))
    union
    select value
    from jsonb_array_elements_text(patch.guards)
  ) refs
  group by target_rails.rail_id
),
merged_completion_gate as (
  select
    target_rails.rail_id,
    coalesce(jsonb_agg(value order by value), '[]'::jsonb) as value
  from target_rails
  cross join patch
  cross join lateral (
    select value
    from jsonb_array_elements_text(coalesce(target_rails.completion_gate, '[]'::jsonb))
    union
    select value
    from jsonb_array_elements_text(coalesce(target_rails.raw_manifest->'completionGate', '[]'::jsonb))
    union
    select value
    from jsonb_array_elements_text(patch.guards)
  ) refs
  group by target_rails.rail_id
),
merged_cycles as (
  select
    target_rails.rail_id,
    coalesce(jsonb_agg(cycle order by cycle->>'id'), '[]'::jsonb) as value
  from target_rails
  cross join patch
  cross join lateral (
    select distinct on (cycle->>'id') cycle
    from (
      select cycle
      from jsonb_array_elements(coalesce(target_rails.raw_manifest->'redGreenCycles', '[]'::jsonb)) cycles(cycle)
      union all
      select cycle
      from jsonb_array_elements(patch.cycles) cycles(cycle)
    ) all_cycles
    order by cycle->>'id'
  ) cycles
  group by target_rails.rail_id
),
merged_symbols as (
  select
    target_rails.rail_id,
    coalesce(jsonb_agg(symbol order by symbol->>'path', symbol->>'name'), '[]'::jsonb) as value
  from target_rails
  cross join patch
  cross join lateral (
    select distinct on (symbol->>'path', symbol->>'name') symbol
    from (
      select symbol
      from jsonb_array_elements(coalesce(target_rails.raw_manifest->'symbols', '[]'::jsonb)) symbols(symbol)
      union all
      select symbol
      from jsonb_array_elements(patch.symbols) symbols(symbol)
    ) all_symbols
    order by symbol->>'path', symbol->>'name'
  ) symbols
  group by target_rails.rail_id
)
update planning_query_store.feature_mechanization_local_rails rail
set
  rail_status = 'implemented',
  symbol_refs = merged_symbol_refs.value,
  implementation_refs = merged_implementation_refs.value,
  allowed_implementation_surfaces = merged_allowed_surfaces.value,
  architecture_guards = merged_guards.value,
  completion_gate = merged_completion_gate.value,
  raw_manifest = jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            coalesce(rail.raw_manifest, '{}'::jsonb),
            '{allowedImplementationSurfaces}',
            merged_allowed_surfaces.value,
            true
          ),
          '{architectureGuards}',
          merged_guards.value,
          true
        ),
        '{completionGate}',
        merged_completion_gate.value,
        true
      ),
      '{redGreenCycles}',
      merged_cycles.value,
      true
    ),
    '{symbols}',
    merged_symbols.value,
    true
  ),
  source_path = 'tools/planning-db/migrations/334_canvas_node_workbench_section_authoring.sql',
  source_content_sha256 = md5('CANVAS-NODE-WORKBENCH-SECTION-AUTHORING-20260626:334'),
  revision = rail.revision + 1,
  updated_at = now()
from merged_allowed_surfaces
join merged_symbol_refs on merged_symbol_refs.rail_id = merged_allowed_surfaces.rail_id
join merged_implementation_refs on merged_implementation_refs.rail_id = merged_allowed_surfaces.rail_id
join merged_guards on merged_guards.rail_id = merged_allowed_surfaces.rail_id
join merged_completion_gate on merged_completion_gate.rail_id = merged_allowed_surfaces.rail_id
join merged_cycles on merged_cycles.rail_id = merged_allowed_surfaces.rail_id
join merged_symbols on merged_symbols.rail_id = merged_allowed_surfaces.rail_id
where rail.rail_id = merged_allowed_surfaces.rail_id;
