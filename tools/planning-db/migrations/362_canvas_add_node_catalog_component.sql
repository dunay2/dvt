-- Promote CanvasAddNodeCatalog from planned concept to current owned component.
-- The Canvas background root menu stays short; node-type discovery is owned by
-- this searchable, categorized catalog component.

alter table planning_query_store.frontend_component_contexts
  drop constraint if exists frontend_component_contexts_kind_check;

alter table planning_query_store.frontend_component_contexts
  add constraint frontend_component_contexts_kind_check
  check (context_kind in (
    'host',
    'canvas-background',
    'add-node-catalog',
    'edge',
    'node',
    'selection',
    'run-preview'
  ));

update planning_query_store.frontend_component_local_components
set
  component_status = 'current',
  reuse_decision = 'create',
  responsibility = 'Own searchable, categorized node-component selection launched from Add... on the Canvas background context menu.',
  capability_gaps = '[]'::jsonb,
  evidence_refs = '[]'::jsonb,
  raw_component = coalesce(raw_component, '{}'::jsonb) || jsonb_build_object(
    'fileOwnershipModel', 'owned-files',
    'parentComponentId', 'web.component.canvas.CanvasBackgroundContextMenu',
    'launchRail', 'OpenCanvasAddNodeCatalog',
    'selectionRail', 'ResolveCanvasAddNodeCatalog',
    'creationRailAfterSelection', 'CreateCanvasAuthoringNode',
    'contextKind', 'add-node-catalog',
    'setInvariants', jsonb_build_array(
      'RootMenu(T + new_node_type) = RootMenu(T)',
      'AddCatalog(T + new_node_type) = AddCatalog(T) + new_node_type',
      'Filter(Catalog, query) subset Catalog',
      'Filter(Filter(Catalog, query), query) = Filter(Catalog, query)'
    ),
    'gapSourceOfTruth', 'planning_query_store.frontend_component_capability_gap_query',
    'evidenceSourceOfTruth', 'planning_query_store.frontend_component_validation_evidence_query'
  ),
  source_path = 'tools/planning-db/migrations/362_canvas_add_node_catalog_component.sql',
  source_content_sha256 = md5('web.component.canvas.CanvasAddNodeCatalog:current:owned-files:362'),
  updated_at = now()
where component_id = 'web.component.canvas.CanvasAddNodeCatalog';

insert into planning_query_store.frontend_component_contexts (
  component_id,
  context_id,
  context_kind,
  context_status,
  responsibility,
  raw_context,
  source_path,
  source_content_sha256
)
values (
  'web.component.canvas.CanvasAddNodeCatalog',
  'add-node-catalog',
  'add-node-catalog',
  'current',
  'Own categorized and searchable node-type choices after Add... opens from the Canvas background menu.',
  jsonb_build_object(
    'launchedFromComponentId', 'web.component.canvas.CanvasBackgroundContextMenu',
    'validRootAction', false,
    'selectionCreatesNode', true,
    'creationRailAfterSelection', 'CreateCanvasAuthoringNode',
    'categories', jsonb_build_array(
      'source',
      'model',
      'seed',
      'transformation',
      'test',
      'output',
      'macro',
      'node'
    )
  ),
  'tools/planning-db/migrations/362_canvas_add_node_catalog_component.sql',
  md5('context:CanvasAddNodeCatalog:add-node-catalog:362')
)
on conflict (component_id, context_id) do update set
  context_kind = excluded.context_kind,
  context_status = excluded.context_status,
  responsibility = excluded.responsibility,
  raw_context = excluded.raw_context,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_context_actions (
  component_id,
  context_id,
  action_id,
  action_label,
  action_kind,
  action_status,
  rail_name,
  action_order,
  raw_action,
  source_path,
  source_content_sha256
)
values
  (
    'web.component.canvas.CanvasAddNodeCatalog',
    'add-node-catalog',
    'select-node-component',
    'Select node component',
    'authoring',
    'valid',
    'ResolveCanvasAddNodeCatalog',
    10,
    jsonb_build_object(
      'createsThroughRail', 'CreateCanvasAuthoringNode',
      'requiresCategory', true,
      'requiresDescription', true,
      'requiresSearchableText', true
    ),
    'tools/planning-db/migrations/362_canvas_add_node_catalog_component.sql',
    md5('action:CanvasAddNodeCatalog:select-node-component:362')
  ),
  (
    'web.component.canvas.CanvasAddNodeCatalog',
    'add-node-catalog',
    'filter-node-components',
    'Filter node components',
    'authoring',
    'valid',
    'ResolveCanvasAddNodeCatalog',
    20,
    jsonb_build_object(
      'filterSubsetInvariant', true,
      'filterIdempotenceInvariant', true
    ),
    'tools/planning-db/migrations/362_canvas_add_node_catalog_component.sql',
    md5('action:CanvasAddNodeCatalog:filter-node-components:362')
  )
on conflict (component_id, context_id, action_id) do update set
  action_label = excluded.action_label,
  action_kind = excluded.action_kind,
  action_status = excluded.action_status,
  rail_name = excluded.rail_name,
  action_order = excluded.action_order,
  raw_action = excluded.raw_action,
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
values (
  'web.component.canvas.CanvasAddNodeCatalog',
  'ResolveCanvasAddNodeCatalog',
  'local-query',
  'implemented-local',
  jsonb_build_object(
    'kind', 'query',
    'context', 'add-node-catalog',
    'dddObject', 'CanvasAddNodeCatalogModel',
    'applicationPort', 'local-presenter-model',
    'adapterSurface', 'CanvasAddNodeCatalogView',
    'negativeTests', jsonb_build_array(
      'reject duplicate semantic node-kind ids',
      'filter result must be subset of catalog',
      'filter operation is idempotent'
    )
  ),
  'tools/planning-db/migrations/362_canvas_add_node_catalog_component.sql',
  md5('rail:CanvasAddNodeCatalog:ResolveCanvasAddNodeCatalog:362')
)
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = excluded.raw_rail,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
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
    'web.component.canvas.CanvasAddNodeCatalog',
    'apps/web/src/app/views/canvas/canvasAddNodeCatalogModel.ts',
    'model',
    'buildCanvasAddNodeCatalogItems',
    jsonb_build_object(
      'responsibility', 'Pure add-node catalog categorization, labels, descriptions, duplicate rejection, and search filtering.',
      'rail', 'ResolveCanvasAddNodeCatalog'
    ),
    'tools/planning-db/migrations/362_canvas_add_node_catalog_component.sql',
    md5('file:canvasAddNodeCatalogModel.ts:362')
  ),
  (
    'web.component.canvas.CanvasAddNodeCatalog',
    'apps/web/src/app/views/canvas/CanvasAddNodeCatalogView.tsx',
    'presentation',
    'CanvasAddNodeCatalogView',
    jsonb_build_object(
      'responsibility', 'Presentation-only searchable catalog with categorized item descriptions.',
      'rail', 'ResolveCanvasAddNodeCatalog'
    ),
    'tools/planning-db/migrations/362_canvas_add_node_catalog_component.sql',
    md5('file:CanvasAddNodeCatalogView.tsx:362')
  ),
  (
    'web.component.canvas.CanvasAddNodeCatalog',
    'apps/web/src/app/views/canvas/canvasAddNodeCatalogModel.test.ts',
    'unit-test',
    null,
    jsonb_build_object(
      'responsibility', 'Proves category mapping, duplicate rejection, filter subset, and filter idempotence invariants.',
      'rail', 'ResolveCanvasAddNodeCatalog'
    ),
    'tools/planning-db/migrations/362_canvas_add_node_catalog_component.sql',
    md5('file:canvasAddNodeCatalogModel.test.ts:362')
  ),
  (
    'web.component.canvas.CanvasAddNodeCatalog',
    'apps/web/src/app/views/canvas/CanvasAddNodeCatalogView.test.tsx',
    'presentation-test',
    null,
    jsonb_build_object(
      'responsibility', 'Proves searchable categorized presentation and semantic item selection.',
      'rail', 'ResolveCanvasAddNodeCatalog'
    ),
    'tools/planning-db/migrations/362_canvas_add_node_catalog_component.sql',
    md5('file:CanvasAddNodeCatalogView.test.tsx:362')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

update planning_query_store.frontend_component_capability_gaps
set
  gap_status = 'closed',
  description = 'CanvasAddNodeCatalog now owns categorized search model, presentation view, and semantic tests.',
  raw_gap = coalesce(raw_gap, '{}'::jsonb) || jsonb_build_object(
    'closedBy', 'tools/planning-db/migrations/362_canvas_add_node_catalog_component.sql',
    'ownedFiles', jsonb_build_array(
      'apps/web/src/app/views/canvas/canvasAddNodeCatalogModel.ts',
      'apps/web/src/app/views/canvas/CanvasAddNodeCatalogView.tsx',
      'apps/web/src/app/views/canvas/canvasAddNodeCatalogModel.test.ts',
      'apps/web/src/app/views/canvas/CanvasAddNodeCatalogView.test.tsx'
    )
  ),
  source_path = 'tools/planning-db/migrations/362_canvas_add_node_catalog_component.sql',
  source_content_sha256 = md5('gap:CanvasAddNodeCatalog:categorized-search:closed:362'),
  updated_at = now()
where component_id = 'web.component.canvas.CanvasAddNodeCatalog'
  and gap_id = 'CANVAS-ADD-NODE-CATALOG-CATEGORIZED-SEARCH';

insert into planning_query_store.frontend_component_validation_evidence (
  component_id,
  evidence_id,
  evidence_kind,
  evidence_status,
  evidence_ref,
  rail_name,
  context_id,
  proves,
  raw_evidence,
  source_path,
  source_content_sha256
)
values
  (
    'web.component.canvas.CanvasAddNodeCatalog',
    'EV-CANVAS-ADD-NODE-CATALOG-MODEL-INVARIANTS',
    'unit-test',
    'current',
    'apps/web/src/app/views/canvas/canvasAddNodeCatalogModel.test.ts',
    'ResolveCanvasAddNodeCatalog',
    'add-node-catalog',
    'Catalog model proves category mapping, no duplicate semantic IDs, filter subset, and filter idempotence.',
    jsonb_build_object(
      'invariants', jsonb_build_array(
        'catalog-monotonicity',
        'filter-subset',
        'filter-idempotence'
      )
    ),
    'tools/planning-db/migrations/362_canvas_add_node_catalog_component.sql',
    md5('evidence:CanvasAddNodeCatalog:model-invariants:362')
  ),
  (
    'web.component.canvas.CanvasAddNodeCatalog',
    'EV-CANVAS-ADD-NODE-CATALOG-VIEW-PRESENTATION',
    'presentation-test',
    'current',
    'apps/web/src/app/views/canvas/CanvasAddNodeCatalogView.test.tsx',
    'ResolveCanvasAddNodeCatalog',
    'add-node-catalog',
    'Catalog view proves searchable categories, descriptions, and semantic selection without owning graph mutation.',
    jsonb_build_object(
      'presentationOnly', true,
      'delegatesCreationTo', 'CreateCanvasAuthoringNode'
    ),
    'tools/planning-db/migrations/362_canvas_add_node_catalog_component.sql',
    md5('evidence:CanvasAddNodeCatalog:view-presentation:362')
  )
on conflict (component_id, evidence_id) do update set
  evidence_kind = excluded.evidence_kind,
  evidence_status = excluded.evidence_status,
  evidence_ref = excluded.evidence_ref,
  rail_name = excluded.rail_name,
  context_id = excluded.context_id,
  proves = excluded.proves,
  raw_evidence = excluded.raw_evidence,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

update planning_query_store.feature_mechanization_local_rails
set
  symbol_refs = (
    select jsonb_agg(value order by value)
    from (
      select distinct value
      from jsonb_array_elements_text(
        symbol_refs || jsonb_build_array(
          'apps/web/src/app/views/canvas/canvasAddNodeCatalogModel.ts#buildCanvasAddNodeCatalogItems',
          'apps/web/src/app/views/canvas/canvasAddNodeCatalogModel.ts#filterCanvasAddNodeCatalogItems',
          'apps/web/src/app/views/canvas/canvasAddNodeCatalogModel.ts#inferCanvasAddNodeCatalogCategory',
          'apps/web/src/app/views/canvas/CanvasAddNodeCatalogView.tsx#CanvasAddNodeCatalogView',
          'apps/web/src/app/views/canvas/CanvasAddNodeCatalogView.tsx#CanvasAddNodeCatalogViewProps',
          'apps/web/src/app/views/canvas/CanvasAddNodeCatalogView.tsx#CATALOG_EMPTY_CLASS_NAME',
          'apps/web/src/app/views/canvas/CanvasAddNodeCatalogView.tsx#CATALOG_HEADER_CLASS_NAME',
          'apps/web/src/app/views/canvas/CanvasAddNodeCatalogView.tsx#CATALOG_ITEM_CATEGORY_CLASS_NAME',
          'apps/web/src/app/views/canvas/CanvasAddNodeCatalogView.tsx#CATALOG_ITEM_DESCRIPTION_CLASS_NAME',
          'apps/web/src/app/views/canvas/CanvasAddNodeCatalogView.tsx#CATALOG_ITEM_META_CLASS_NAME',
          'apps/web/src/app/views/canvas/CanvasAddNodeCatalogView.tsx#CATALOG_SEARCH_CLASS_NAME',
          'apps/web/src/app/views/canvas/CanvasAddNodeCatalogView.tsx#CATALOG_TITLE_CLASS_NAME',
          'apps/web/src/app/views/canvas/canvasAddNodeCatalogModel.ts#BuildCanvasAddNodeCatalogItemsArgs',
          'apps/web/src/app/views/canvas/canvasAddNodeCatalogModel.ts#CATEGORY_ORDER',
          'apps/web/src/app/views/canvas/canvasAddNodeCatalogModel.ts#CanvasAddNodeCatalogCategory',
          'apps/web/src/app/views/canvas/canvasAddNodeCatalogModel.ts#CanvasAddNodeCatalogItem',
          'apps/web/src/app/views/canvas/canvasAddNodeCatalogModel.ts#buildCanvasAddNodeCatalogItems',
          'apps/web/src/app/views/canvas/canvasAddNodeCatalogModel.ts#categoryIndex',
          'apps/web/src/app/views/canvas/canvasAddNodeCatalogModel.ts#filterCanvasAddNodeCatalogItems',
          'apps/web/src/app/views/canvas/canvasAddNodeCatalogModel.ts#inferCanvasAddNodeCatalogCategory',
          'apps/web/src/app/views/canvas/canvasAddNodeCatalogModel.ts#resolveCanvasAddNodeCatalogActionLabel',
          'apps/web/src/app/views/canvas/canvasAddNodeCatalogModel.ts#resolveCanvasAddNodeCatalogCategoryLabel',
          'apps/web/src/app/views/canvas/canvasAddNodeCatalogModel.ts#resolveCanvasAddNodeCatalogDescription'
        )
      ) as refs(value)
    ) as unique_refs
  ),
  implementation_refs = (
    select jsonb_agg(value order by value)
    from (
      select distinct value
      from jsonb_array_elements_text(
        implementation_refs || jsonb_build_array(
          'apps/web/src/app/views/canvas/canvasAddNodeCatalogModel.ts',
          'apps/web/src/app/views/canvas/CanvasAddNodeCatalogView.tsx',
          'apps/web/src/app/views/canvas/canvasAddNodeCatalogModel.test.ts',
          'apps/web/src/app/views/canvas/CanvasAddNodeCatalogView.test.tsx',
          'docs/superpowers/plans/2026-06-28-canvas-context-menu-qa-backlog.md',
          'tools/planning-db/migrations/362_canvas_add_node_catalog_component.sql'
        )
      ) as refs(value)
    ) as unique_refs
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(value order by value)
    from (
      select distinct value
      from jsonb_array_elements_text(
        allowed_implementation_surfaces || jsonb_build_array(
          'apps/web/src/app/views/canvas/canvasAddNodeCatalogModel.ts',
          'apps/web/src/app/views/canvas/CanvasAddNodeCatalogView.tsx',
          'apps/web/src/app/views/canvas/canvasAddNodeCatalogModel.test.ts',
          'apps/web/src/app/views/canvas/CanvasAddNodeCatalogView.test.tsx',
          'docs/superpowers/plans/2026-06-28-canvas-context-menu-qa-backlog.md',
          'tools/planning-db/migrations/362_canvas_add_node_catalog_component.sql'
        )
      ) as refs(value)
    ) as unique_refs
  ),
  raw_manifest = jsonb_set(
    jsonb_set(
      raw_manifest,
      '{allowedImplementationSurfaces}',
      (
        select jsonb_agg(value order by value)
        from (
          select distinct value
          from jsonb_array_elements_text(
            coalesce(raw_manifest->'allowedImplementationSurfaces', '[]'::jsonb)
            || jsonb_build_array(
              'apps/web/src/app/views/canvas/canvasAddNodeCatalogModel.ts',
              'apps/web/src/app/views/canvas/CanvasAddNodeCatalogView.tsx',
              'apps/web/src/app/views/canvas/canvasAddNodeCatalogModel.test.ts',
              'apps/web/src/app/views/canvas/CanvasAddNodeCatalogView.test.tsx',
              'docs/superpowers/plans/2026-06-28-canvas-context-menu-qa-backlog.md',
              'tools/planning-db/migrations/362_canvas_add_node_catalog_component.sql'
            )
          ) as refs(value)
        ) as unique_refs
      ),
      true
    ),
    '{componentGuides}',
    (
      select jsonb_agg(value order by value)
      from (
        select distinct value
        from jsonb_array_elements_text(
          coalesce(raw_manifest->'componentGuides', '[]'::jsonb)
          || jsonb_build_array(
            'planning-db:component/web.component.canvas.CanvasAddNodeCatalog'
          )
        ) as refs(value)
      ) as unique_refs
    ),
    true
  ),
  source_content_sha256 = md5(
    'CANVAS-CONTEXT-MENU-PRESENTER-SRP-SPLIT-20260628:add-node-catalog:362'
  ),
  revision = greatest(revision, 3),
  updated_at = now()
where rail_id = 'local#CANVAS-CONTEXT-MENU-PRESENTER-SRP-SPLIT-20260628#query#resolvecanvascontextmenu';
