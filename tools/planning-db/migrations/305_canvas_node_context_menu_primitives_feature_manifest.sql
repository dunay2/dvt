-- Rehome Canvas node context-menu presentation primitives into the DB-first
-- feature manifest. CanvasNodeContextMenuView no longer owns Radix markup or
-- class tokens; the new primitive file is the presentation-template boundary.

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
  'WEB-CANVAS-NODE-CONTEXT-MENU-PRIMITIVES-20260626',
  'E-CANVAS-UXDB-COMPONENT-SLICES-1',
  'Canvas node context-menu primitive boundary',
  'Frontend / Canvas',
  'implemented',
  'CanvasNodeContextMenuView was still carrying Radix menu primitives and CSS token constants. This migration keeps the semantic component as web.component.canvas.CanvasNodeContextMenu while moving low-level presentation templates into CanvasNodeContextMenuPrimitives.tsx and removing legacy constant symbols from the DB-first feature manifest.',
  'boundary_drift',
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

insert into planning_query_store.frontend_component_local_files (
  component_id,
  file_path,
  file_role,
  exported_symbol,
  raw_file,
  source_path,
  source_content_sha256
)
values (
  'web.component.canvas.CanvasNodeContextMenu',
  'apps/web/src/app/components/canvas/CanvasNodeContextMenuPrimitives.tsx',
  'component',
  'CanvasNodeContextMenuPrimitives',
  jsonb_build_object(
    'role', 'node context-menu presentation primitives',
    'rail', 'ResolveCanvasContextMenu',
    'ownedPrimitiveBoundary', true,
    'presenterOwner', 'CanvasNodeContextMenuView'
  ),
  'tools/planning-db/migrations/305_canvas_node_context_menu_primitives_feature_manifest.sql',
  md5('CanvasNodeContextMenuPrimitives.tsx:305')
)
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

with primitive_symbols(symbol_name, symbol_ref, fowler_signal) as (
  values
    (
      'CanvasNodeContextMenuActionPrimitive',
      'apps/web/src/app/components/canvas/CanvasNodeContextMenuPrimitives.tsx#CanvasNodeContextMenuActionPrimitive',
      'presentation_logic_separation'
    ),
    (
      'CanvasNodeContextMenuGroupFrame',
      'apps/web/src/app/components/canvas/CanvasNodeContextMenuPrimitives.tsx#CanvasNodeContextMenuGroupFrame',
      'presentation_logic_separation'
    ),
    (
      'CanvasNodeContextMenuGroupLabel',
      'apps/web/src/app/components/canvas/CanvasNodeContextMenuPrimitives.tsx#CanvasNodeContextMenuGroupLabel',
      'presentation_logic_separation'
    ),
    (
      'CanvasNodeContextMenuSurface',
      'apps/web/src/app/components/canvas/CanvasNodeContextMenuPrimitives.tsx#CanvasNodeContextMenuSurface',
      'presentation_logic_separation'
    ),
    (
      'CanvasNodeContextMenuTitle',
      'apps/web/src/app/components/canvas/CanvasNodeContextMenuPrimitives.tsx#CanvasNodeContextMenuTitle',
      'presentation_logic_separation'
    ),
    (
      'canvasNodeContextMenuClassNames',
      'apps/web/src/app/components/canvas/CanvasNodeContextMenuPrimitives.tsx#canvasNodeContextMenuClassNames',
      'presentation_template_tokens'
    )
),
legacy_view_symbols(symbol_name, symbol_ref) as (
  values
    (
      'NODE_CONTEXT_MENU_CONTENT_CLASS_NAME',
      'apps/web/src/app/components/canvas/CanvasNodeContextMenuView.tsx#NODE_CONTEXT_MENU_CONTENT_CLASS_NAME'
    ),
    (
      'NODE_CONTEXT_MENU_TITLE_CLASS_NAME',
      'apps/web/src/app/components/canvas/CanvasNodeContextMenuView.tsx#NODE_CONTEXT_MENU_TITLE_CLASS_NAME'
    ),
    (
      'NODE_CONTEXT_MENU_GROUP_LABEL_CLASS_NAME',
      'apps/web/src/app/components/canvas/CanvasNodeContextMenuView.tsx#NODE_CONTEXT_MENU_GROUP_LABEL_CLASS_NAME'
    )
),
surface_additions(value) as (
  values
    ('apps/web/src/app/components/canvas/CanvasNodeContextMenuPrimitives.tsx'),
    ('tools/planning-db/migrations/305_canvas_node_context_menu_primitives_feature_manifest.sql')
),
guard_additions(value) as (
  values
    ('pnpm --filter @dvt/web test:canvas-architecture:run -- src/app/components/canvas/DbtNodeComponent.architecture.test.ts'),
    ('pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/components/canvas/CanvasNodeContextMenuView.test.tsx'),
    ('pnpm docs:feature-mechanization:implementation')
)
update planning_query_store.feature_mechanization_local_rails
set
  symbol_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(symbol_refs, '[]'::jsonb)) current_refs(value)
      where value not in (select symbol_ref from legacy_view_symbols)
      union all
      select symbol_ref from primitive_symbols
    ) next_refs
  ),
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(implementation_refs, '[]'::jsonb)) current_refs(value)
      union all
      select value from surface_additions
    ) next_refs
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(allowed_implementation_surfaces, '[]'::jsonb)) current_refs(value)
      union all
      select value from surface_additions
    ) next_refs
  ),
  architecture_guards = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(architecture_guards, '[]'::jsonb)) current_refs(value)
      union all
      select value from guard_additions
    ) next_refs
  ),
  completion_gate = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(completion_gate, '[]'::jsonb)) current_refs(value)
      union all
      select value from guard_additions
    ) next_refs
  ),
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'version', 2,
      'presentationPrimitiveBoundary', 'CanvasNodeContextMenuPrimitives',
      'legacyViewSymbolsRetired', (
        select jsonb_agg(symbol_name order by symbol_name)
        from legacy_view_symbols
      ),
      'allowedImplementationSurfaces', (
        select jsonb_agg(distinct value order by value)
        from (
          select value
          from jsonb_array_elements_text(coalesce(raw_manifest->'allowedImplementationSurfaces', '[]'::jsonb)) current_refs(value)
          union all
          select value from surface_additions
        ) next_refs
      ),
      'architectureGuards', (
        select jsonb_agg(distinct value order by value)
        from (
          select value
          from jsonb_array_elements_text(coalesce(raw_manifest->'architectureGuards', '[]'::jsonb)) current_refs(value)
          union all
          select value from guard_additions
        ) next_refs
      ),
      'completionGate', (
        select jsonb_agg(distinct value order by value)
        from (
          select value
          from jsonb_array_elements_text(coalesce(raw_manifest->'completionGate', '[]'::jsonb)) current_refs(value)
          union all
          select value from guard_additions
        ) next_refs
      ),
      'symbols', (
        select jsonb_agg(symbol order by symbol->>'path', symbol->>'name')
        from (
          select symbol
          from jsonb_array_elements(coalesce(raw_manifest->'symbols', '[]'::jsonb)) existing(symbol)
          where symbol->>'name' not in (select symbol_name from legacy_view_symbols)
            and symbol->>'path' <> 'apps/web/src/app/components/canvas/CanvasNodeContextMenuPrimitives.tsx'
          union all
          select jsonb_build_object(
            'name', symbol_name,
            'path', 'apps/web/src/app/components/canvas/CanvasNodeContextMenuPrimitives.tsx',
            'dddOwner', 'CanvasNodeContextMenuView',
            'cqRails', jsonb_build_array('ResolveCanvasContextMenu'),
            'fowlerSignals', jsonb_build_array(fowler_signal),
            'architectureGuard', 'apps/web/src/app/components/canvas/DbtNodeComponent.architecture.test.ts',
            'cypressCoverage', 'not_applicable:component_boundary',
            'unitTests', jsonb_build_array(
              'apps/web/src/app/components/canvas/CanvasNodeContextMenuView.test.tsx',
              'apps/web/src/app/components/canvas/DbtNodeComponent.architecture.test.ts'
            )
          )
          from primitive_symbols
        ) next_symbols(symbol)
      ),
      'redGreenCycles', coalesce(raw_manifest->'redGreenCycles', '[]'::jsonb)
        || jsonb_build_array(
          jsonb_build_object(
            'id', 'canvas-node-context-menu-primitives-feature-manifest',
            'redTest', 'pnpm docs:feature-mechanization:implementation',
            'expectedFailure', 'CanvasNodeContextMenuPrimitives symbols were present in code but missing from DB-first feature mechanization.',
            'patchSurfaces', jsonb_build_array(
              'tools/planning-db/migrations/305_canvas_node_context_menu_primitives_feature_manifest.sql',
              'apps/web/src/app/components/canvas/CanvasNodeContextMenuPrimitives.tsx',
              'apps/web/src/app/components/canvas/CanvasNodeContextMenuView.tsx',
              'apps/web/src/app/components/canvas/DbtNodeComponent.architecture.test.ts'
            ),
            'greenTest', 'pnpm docs:feature-mechanization:implementation'
          )
        )
    ),
  source_path = 'tools/planning-db/migrations/305_canvas_node_context_menu_primitives_feature_manifest.sql',
  source_content_sha256 = md5('DVT-CANVAS-NODE-CONTEXT-MENU-VIEW-20260619:primitives:305'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'DVT-CANVAS-NODE-CONTEXT-MENU-VIEW-20260619'
  and rail_name = 'ResolveCanvasContextMenu';
