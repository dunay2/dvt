-- Reconcile symbols added while hardening the live Source Import proof.
-- This is a DB-first manifest delta: no product code changes live here.

with symbol_patch(symbol_ref, symbol) as (
  values
    (
      'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts#waitForPersistedWarehousePaymentsConfig',
      jsonb_build_object(
        'name', 'waitForPersistedWarehousePaymentsConfig',
        'path', 'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts',
        'dddOwner', 'CanvasWorkflowLiveProof',
        'cqRails', jsonb_build_array('AttachWarehouseSourceFromCanvasContext'),
        'fowlerSignals', jsonb_build_array('test_only_confidence', 'protected_runtime_polling'),
        'architectureGuard', 'apps/web/src/app/views/canvas/CanvasSourceImportLiveProof.architecture.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasSourceImportLiveProof.architecture.test.ts')
      )
    ),
    (
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts#DragPoint',
      jsonb_build_object(
        'name', 'DragPoint',
        'path', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'dddOwner', 'CanvasGraphBrowserProof',
        'cqRails', jsonb_build_array('AttachWarehouseSourceFromCanvasContext'),
        'fowlerSignals', jsonb_build_array('pointer_interaction_contract'),
        'architectureGuard', 'apps/web/src/app/views/canvas/CanvasSourceImportLiveProof.architecture.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasSourceImportLiveProof.architecture.test.ts')
      )
    ),
    (
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts#buildMouseDragEvent',
      jsonb_build_object(
        'name', 'buildMouseDragEvent',
        'path', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'dddOwner', 'CanvasGraphBrowserProof',
        'cqRails', jsonb_build_array('AttachWarehouseSourceFromCanvasContext'),
        'fowlerSignals', jsonb_build_array('pointer_interaction_contract'),
        'architectureGuard', 'apps/web/src/app/views/canvas/CanvasSourceImportLiveProof.architecture.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasSourceImportLiveProof.architecture.test.ts')
      )
    ),
    (
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts#connectCanvasNodes',
      jsonb_build_object(
        'name', 'connectCanvasNodes',
        'path', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'dddOwner', 'CanvasGraphBrowserProof',
        'cqRails', jsonb_build_array('AttachWarehouseSourceFromCanvasContext'),
        'fowlerSignals', jsonb_build_array('graph_edge_authoring_contract'),
        'architectureGuard', 'apps/web/src/app/views/canvas/CanvasSourceImportLiveProof.architecture.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/useCanvasGraphHandlers.edgeAuthoring.test.tsx')
      )
    ),
    (
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts#dispatchMouseDragEvent',
      jsonb_build_object(
        'name', 'dispatchMouseDragEvent',
        'path', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'dddOwner', 'CanvasGraphBrowserProof',
        'cqRails', jsonb_build_array('AttachWarehouseSourceFromCanvasContext'),
        'fowlerSignals', jsonb_build_array('pointer_interaction_contract'),
        'architectureGuard', 'apps/web/src/app/views/canvas/CanvasSourceImportLiveProof.architecture.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasSourceImportLiveProof.architecture.test.ts')
      )
    ),
    (
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts#findNodePort',
      jsonb_build_object(
        'name', 'findNodePort',
        'path', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'dddOwner', 'CanvasGraphBrowserProof',
        'cqRails', jsonb_build_array('AttachWarehouseSourceFromCanvasContext'),
        'fowlerSignals', jsonb_build_array('graph_port_contract'),
        'architectureGuard', 'apps/web/src/app/views/canvas/CanvasSourceImportLiveProof.architecture.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/useCanvasGraphHandlers.edgeAuthoring.test.tsx')
      )
    ),
    (
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts#getVisibleCanvasNodeByCardTitle',
      jsonb_build_object(
        'name', 'getVisibleCanvasNodeByCardTitle',
        'path', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'dddOwner', 'CanvasGraphBrowserProof',
        'cqRails', jsonb_build_array('AttachWarehouseSourceFromCanvasContext'),
        'fowlerSignals', jsonb_build_array('visible_dom_contract'),
        'architectureGuard', 'apps/web/src/app/views/canvas/CanvasSourceImportLiveProof.architecture.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasSourceImportLiveProof.architecture.test.ts')
      )
    ),
    (
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts#importLocalPostgresSource',
      jsonb_build_object(
        'name', 'importLocalPostgresSource',
        'path', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'dddOwner', 'CanvasSourceImportDialog',
        'cqRails', jsonb_build_array('AttachWarehouseSourceFromCanvasContext', 'ImportWarehouseSources'),
        'fowlerSignals', jsonb_build_array('browser_proof_workflow', 'no_fake_draft_seed'),
        'architectureGuard', 'apps/web/src/app/views/canvas/CanvasSourceImportLiveProof.architecture.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/useCanvasController.sourceImport.test.tsx')
      )
    ),
    (
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts#readHandleCenter',
      jsonb_build_object(
        'name', 'readHandleCenter',
        'path', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'dddOwner', 'CanvasGraphBrowserProof',
        'cqRails', jsonb_build_array('AttachWarehouseSourceFromCanvasContext'),
        'fowlerSignals', jsonb_build_array('graph_port_contract'),
        'architectureGuard', 'apps/web/src/app/views/canvas/CanvasSourceImportLiveProof.architecture.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/useCanvasGraphHandlers.edgeAuthoring.test.tsx')
      )
    ),
    (
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts#waitForLiveDraftEdgeSaved',
      jsonb_build_object(
        'name', 'waitForLiveDraftEdgeSaved',
        'path', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'dddOwner', 'CanvasGraphDraft',
        'cqRails', jsonb_build_array('AttachWarehouseSourceFromCanvasContext'),
        'fowlerSignals', jsonb_build_array('protected_runtime_polling', 'graph_edge_authoring_contract'),
        'architectureGuard', 'apps/web/src/app/views/canvas/CanvasSourceImportLiveProof.architecture.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/useCanvasGraphHandlers.edgeAuthoring.test.tsx')
      )
    )
),
target_rail as (
  select *
  from planning_query_store.feature_mechanization_local_rails
  where rail_id = 'local#E-CANVAS-ADD-SOURCE-LIVE-FLOW-1#command#attachwarehousesourcefromcanvascontext'
),
merged as (
  select
    rail.rail_id,
    (
      select jsonb_agg(distinct value order by value)
      from jsonb_array_elements_text(
        coalesce(rail.symbol_refs, '[]'::jsonb)
        || (select jsonb_agg(symbol_ref) from symbol_patch)
      ) as item(value)
    ) as symbol_refs,
    (
      select coalesce(jsonb_agg(existing.symbol order by existing.ordinal), '[]'::jsonb)
      from jsonb_array_elements(coalesce(rail.raw_manifest->'symbols', '[]'::jsonb))
        with ordinality as existing(symbol, ordinal)
      where not exists (
        select 1
        from symbol_patch patch
        where patch.symbol->>'name' = existing.symbol->>'name'
          and patch.symbol->>'path' = existing.symbol->>'path'
      )
    ) || (select jsonb_agg(symbol) from symbol_patch) as symbols,
    (
      select jsonb_agg(distinct value order by value)
      from jsonb_array_elements_text(
        coalesce(rail.allowed_implementation_surfaces, '[]'::jsonb)
        || jsonb_build_array('tools/planning-db/migrations/524_source_import_live_proof_symbol_reconcile.sql')
      ) as item(value)
    ) as allowed_surfaces
  from target_rail rail
)
update planning_query_store.feature_mechanization_local_rails rail
set
  symbol_refs = merged.symbol_refs,
  allowed_implementation_surfaces = merged.allowed_surfaces,
  raw_manifest = jsonb_set(
    jsonb_set(
      coalesce(rail.raw_manifest, '{}'::jsonb),
      '{symbols}',
      merged.symbols,
      true
    ),
    '{allowedImplementationSurfaces}',
    merged.allowed_surfaces,
    true
  ),
  source_path = 'tools/planning-db/migrations/524_source_import_live_proof_symbol_reconcile.sql',
  source_content_sha256 = md5('E-CANVAS-ADD-SOURCE-LIVE-FLOW-1:source-import-live-proof-symbol-reconcile:524'),
  revision = greatest(rail.revision, 1) + 1,
  updated_at = now()
from merged
where rail.rail_id = merged.rail_id;

with symbol_patch(symbol_ref, symbol) as (
  values
    (
      'apps/web/src/app/views/canvas/CanvasContextMenuView.tsx#CANVAS_CONTEXT_MENU_MIN_VISIBLE_HEIGHT_PX',
      jsonb_build_object(
        'name', 'CANVAS_CONTEXT_MENU_MIN_VISIBLE_HEIGHT_PX',
        'path', 'apps/web/src/app/views/canvas/CanvasContextMenuView.tsx',
        'dddOwner', 'web.component.canvas.CanvasContextMenu',
        'cqRails', jsonb_build_array('ResolveCanvasContextMenu'),
        'fowlerSignals', jsonb_build_array('presentation_bounds_token'),
        'architectureGuard', 'apps/web/src/app/views/canvas/CanvasContextMenuView.test.tsx',
        'cypressCoverage', 'not_applicable:presentation_viewport_guard',
        'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasContextMenuView.test.tsx')
      )
    ),
    (
      'apps/web/src/app/views/canvas/CanvasContextMenuView.tsx#CANVAS_CONTEXT_MENU_SURFACE_WIDTH_PX',
      jsonb_build_object(
        'name', 'CANVAS_CONTEXT_MENU_SURFACE_WIDTH_PX',
        'path', 'apps/web/src/app/views/canvas/CanvasContextMenuView.tsx',
        'dddOwner', 'web.component.canvas.CanvasContextMenu',
        'cqRails', jsonb_build_array('ResolveCanvasContextMenu'),
        'fowlerSignals', jsonb_build_array('presentation_bounds_token'),
        'architectureGuard', 'apps/web/src/app/views/canvas/CanvasContextMenuView.test.tsx',
        'cypressCoverage', 'not_applicable:presentation_viewport_guard',
        'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasContextMenuView.test.tsx')
      )
    ),
    (
      'apps/web/src/app/views/canvas/CanvasContextMenuView.tsx#CANVAS_CONTEXT_MENU_VIEWPORT_GUTTER_PX',
      jsonb_build_object(
        'name', 'CANVAS_CONTEXT_MENU_VIEWPORT_GUTTER_PX',
        'path', 'apps/web/src/app/views/canvas/CanvasContextMenuView.tsx',
        'dddOwner', 'web.component.canvas.CanvasContextMenu',
        'cqRails', jsonb_build_array('ResolveCanvasContextMenu'),
        'fowlerSignals', jsonb_build_array('presentation_bounds_token'),
        'architectureGuard', 'apps/web/src/app/views/canvas/CanvasContextMenuView.test.tsx',
        'cypressCoverage', 'not_applicable:presentation_viewport_guard',
        'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasContextMenuView.test.tsx')
      )
    ),
    (
      'apps/web/src/app/views/canvas/CanvasContextMenuView.tsx#CanvasContextMenuViewport',
      jsonb_build_object(
        'name', 'CanvasContextMenuViewport',
        'path', 'apps/web/src/app/views/canvas/CanvasContextMenuView.tsx',
        'dddOwner', 'web.component.canvas.CanvasContextMenu',
        'cqRails', jsonb_build_array('ResolveCanvasContextMenu'),
        'fowlerSignals', jsonb_build_array('presentation_shell_extraction'),
        'architectureGuard', 'apps/web/src/app/views/canvas/CanvasContextMenuView.test.tsx',
        'cypressCoverage', 'not_applicable:presentation_viewport_guard',
        'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasContextMenuView.test.tsx')
      )
    ),
    (
      'apps/web/src/app/views/canvas/CanvasContextMenuView.tsx#resolveBrowserViewport',
      jsonb_build_object(
        'name', 'resolveBrowserViewport',
        'path', 'apps/web/src/app/views/canvas/CanvasContextMenuView.tsx',
        'dddOwner', 'web.component.canvas.CanvasContextMenu',
        'cqRails', jsonb_build_array('ResolveCanvasContextMenu'),
        'fowlerSignals', jsonb_build_array('viewport_query_boundary'),
        'architectureGuard', 'apps/web/src/app/views/canvas/CanvasContextMenuView.test.tsx',
        'cypressCoverage', 'not_applicable:presentation_viewport_guard',
        'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasContextMenuView.test.tsx')
      )
    ),
    (
      'apps/web/src/app/views/canvas/CanvasContextMenuView.tsx#resolveCanvasContextMenuSurfaceStyle',
      jsonb_build_object(
        'name', 'resolveCanvasContextMenuSurfaceStyle',
        'path', 'apps/web/src/app/views/canvas/CanvasContextMenuView.tsx',
        'dddOwner', 'web.component.canvas.CanvasContextMenu',
        'cqRails', jsonb_build_array('ResolveCanvasContextMenu'),
        'fowlerSignals', jsonb_build_array('viewport_query_boundary', 'presentation_bounds_policy'),
        'architectureGuard', 'apps/web/src/app/views/canvas/CanvasContextMenuView.test.tsx',
        'cypressCoverage', 'not_applicable:presentation_viewport_guard',
        'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasContextMenuView.test.tsx')
      )
    )
),
target_rail as (
  select *
  from planning_query_store.feature_mechanization_local_rails
  where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
    and normalized_rail_name = 'resolvecanvascontextmenu'
  order by updated_at desc
  limit 1
),
merged as (
  select
    rail.rail_id,
    (
      select jsonb_agg(distinct value order by value)
      from jsonb_array_elements_text(
        coalesce(rail.symbol_refs, '[]'::jsonb)
        || (select jsonb_agg(symbol_ref) from symbol_patch)
      ) as item(value)
    ) as symbol_refs,
    (
      select coalesce(jsonb_agg(existing.symbol order by existing.ordinal), '[]'::jsonb)
      from jsonb_array_elements(coalesce(rail.raw_manifest->'symbols', '[]'::jsonb))
        with ordinality as existing(symbol, ordinal)
      where not exists (
        select 1
        from symbol_patch patch
        where patch.symbol->>'name' = existing.symbol->>'name'
          and patch.symbol->>'path' = existing.symbol->>'path'
      )
    ) || (select jsonb_agg(symbol) from symbol_patch) as symbols,
    (
      select jsonb_agg(distinct value order by value)
      from jsonb_array_elements_text(
        coalesce(rail.allowed_implementation_surfaces, '[]'::jsonb)
        || jsonb_build_array('tools/planning-db/migrations/524_source_import_live_proof_symbol_reconcile.sql')
      ) as item(value)
    ) as allowed_surfaces
  from target_rail rail
)
update planning_query_store.feature_mechanization_local_rails rail
set
  symbol_refs = merged.symbol_refs,
  allowed_implementation_surfaces = merged.allowed_surfaces,
  raw_manifest = jsonb_set(
    jsonb_set(coalesce(rail.raw_manifest, '{}'::jsonb), '{symbols}', merged.symbols, true),
    '{allowedImplementationSurfaces}',
    merged.allowed_surfaces,
    true
  ),
  source_path = 'tools/planning-db/migrations/524_source_import_live_proof_symbol_reconcile.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:context-menu-viewport-symbol-reconcile:524'),
  revision = greatest(rail.revision, 1) + 1,
  updated_at = now()
from merged
where rail.rail_id = merged.rail_id;

with symbol_patch(symbol_ref, symbol) as (
  values
    (
      'apps/web/src/app/views/canvas/canvasDraftSessionMachine.ts#dedupeDraftEdges',
      jsonb_build_object(
        'name', 'dedupeDraftEdges',
        'path', 'apps/web/src/app/views/canvas/canvasDraftSessionMachine.ts',
        'dddOwner', 'CanvasDraftSessionMachine',
        'cqRails', jsonb_build_array('AdoptExternalCanvasDraftRevision'),
        'fowlerSignals', jsonb_build_array('merge_policy', 'graph_edge_identity'),
        'architectureGuard', 'apps/web/src/app/views/canvas/canvasDraftSession.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/canvasDraftSession.test.ts')
      )
    ),
    (
      'apps/web/src/app/views/canvas/canvasDraftSessionMachine.ts#hasDirtyLocalAuthoring',
      jsonb_build_object(
        'name', 'hasDirtyLocalAuthoring',
        'path', 'apps/web/src/app/views/canvas/canvasDraftSessionMachine.ts',
        'dddOwner', 'CanvasDraftSessionMachine',
        'cqRails', jsonb_build_array('AdoptExternalCanvasDraftRevision'),
        'fowlerSignals', jsonb_build_array('merge_policy', 'local_authoring_preservation'),
        'architectureGuard', 'apps/web/src/app/views/canvas/canvasDraftSession.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/canvasDraftSession.test.ts')
      )
    ),
    (
      'apps/web/src/app/views/canvas/canvasDraftSessionMachine.ts#mergeRemoteWorkingSetWithLocalAuthoring',
      jsonb_build_object(
        'name', 'mergeRemoteWorkingSetWithLocalAuthoring',
        'path', 'apps/web/src/app/views/canvas/canvasDraftSessionMachine.ts',
        'dddOwner', 'CanvasDraftSessionMachine',
        'cqRails', jsonb_build_array('AdoptExternalCanvasDraftRevision'),
        'fowlerSignals', jsonb_build_array('merge_policy', 'local_authoring_preservation'),
        'architectureGuard', 'apps/web/src/app/views/canvas/canvasDraftSession.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/canvasDraftSession.test.ts')
      )
    )
),
target_rail as (
  select *
  from planning_query_store.feature_mechanization_local_rails
  where rail_id = 'local#E-CANVAS-WORKFLOW-E2E-USABILITY-20260601#command#adoptexternalcanvasdraftrevision'
),
merged as (
  select
    rail.rail_id,
    (
      select jsonb_agg(distinct value order by value)
      from jsonb_array_elements_text(
        coalesce(rail.symbol_refs, '[]'::jsonb)
        || (select jsonb_agg(symbol_ref) from symbol_patch)
      ) as item(value)
    ) as symbol_refs,
    (
      select coalesce(jsonb_agg(existing.symbol order by existing.ordinal), '[]'::jsonb)
      from jsonb_array_elements(coalesce(rail.raw_manifest->'symbols', '[]'::jsonb))
        with ordinality as existing(symbol, ordinal)
      where not exists (
        select 1
        from symbol_patch patch
        where patch.symbol->>'name' = existing.symbol->>'name'
          and patch.symbol->>'path' = existing.symbol->>'path'
      )
    ) || (select jsonb_agg(symbol) from symbol_patch) as symbols,
    (
      select jsonb_agg(distinct value order by value)
      from jsonb_array_elements_text(
        coalesce(rail.allowed_implementation_surfaces, '[]'::jsonb)
        || jsonb_build_array(
          'apps/web/src/app/views/canvas/canvasDraftLifecycleSnapshot.ts',
          'apps/web/src/app/views/canvas/canvasDraftLifecycleSnapshot.test.ts',
          'tools/planning-db/migrations/524_source_import_live_proof_symbol_reconcile.sql'
        )
      ) as item(value)
    ) as allowed_surfaces
  from target_rail rail
)
update planning_query_store.feature_mechanization_local_rails rail
set
  symbol_refs = merged.symbol_refs,
  allowed_implementation_surfaces = merged.allowed_surfaces,
  raw_manifest = jsonb_set(
    jsonb_set(coalesce(rail.raw_manifest, '{}'::jsonb), '{symbols}', merged.symbols, true),
    '{allowedImplementationSurfaces}',
    merged.allowed_surfaces,
    true
  ),
  source_path = 'tools/planning-db/migrations/524_source_import_live_proof_symbol_reconcile.sql',
  source_content_sha256 = md5('E-CANVAS-WORKFLOW-E2E-USABILITY-20260601:draft-merge-symbol-reconcile:524'),
  revision = greatest(rail.revision, 1) + 1,
  updated_at = now()
from merged
where rail.rail_id = merged.rail_id;

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
values
(
  'local#TF-E2-M-C#query#readlivefirstauthoringdraftrecord',
  'TF-E2-M-C',
  'implemented',
  'ReadLiveFirstAuthoringDraftRecord',
  'readlivefirstauthoringdraftrecord',
  'query',
  'WorkspaceGraphDraft read boundary',
  'implemented',
  jsonb_build_array(
    'apps/web/cypress/support/canvasFirstAuthoring.ts#pollLiveDraftRecord',
    'apps/web/cypress/support/canvasFirstAuthoring.ts#waitForLiveFirstAuthoringDraftRecord'
  ),
  jsonb_build_array(
    'apps/web/cypress/support/canvasFirstAuthoring.ts',
    'apps/web/cypress/e2e/canvas/canvas-first-authoring-live.cy.ts',
    'tools/planning-db/migrations/524_source_import_live_proof_symbol_reconcile.sql'
  ),
  jsonb_build_array(
    'docs/planning/proposals/mandatory/frontend-and-ux/tf-e2-m-c-first-canvas-first-node-live-proof-implementation-plan-20260501.md',
    'docs/architecture/command-query-rail-governance.md'
  ),
  jsonb_build_array(
    'AGENTS.md',
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/guides/ai-work-protocol.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md'
  ),
  jsonb_build_array(
    'apps/web/cypress/support/canvasFirstAuthoring.ts',
    'apps/web/cypress/e2e/canvas/canvas-first-authoring-live.cy.ts',
    'tools/planning-db/migrations/524_source_import_live_proof_symbol_reconcile.sql'
  ),
  jsonb_build_array(
    'pnpm --filter @dvt/web test:e2e:first-authoring:live',
    'pnpm docs:feature-mechanization:implementation'
  ),
  jsonb_build_array(
    'pnpm planning:db:migrate',
    'pnpm --filter @dvt/web test:e2e:first-authoring:live',
    'pnpm docs:feature-mechanization:implementation',
    'pnpm verify:prepush'
  ),
  'tools/planning-db/migrations/524_source_import_live_proof_symbol_reconcile.sql',
  md5('TF-E2-M-C:ReadLiveFirstAuthoringDraftRecord:524'),
  jsonb_build_object(
    'name', 'ReadLiveFirstAuthoringDraftRecord',
    'type', 'query',
    'dddOwner', 'WorkspaceGraphDraft read boundary',
    'status', 'implemented'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'TF-E2-M-C',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan', 'Keep the first-authoring live proof aligned with the protected draft read boundary while the Source Import flow reuses the same clean workspace bootstrap.',
    'componentGuides', jsonb_build_array('web.component.canvas.CanvasGraphSurface'),
    'userStories', jsonb_build_array('As a reviewer, the live first-authoring proof waits for the protected runtime draft record instead of inferring success from local UI state.'),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/guides/ai-work-protocol.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md'
    ),
    'allowedImplementationSurfaces', jsonb_build_array(
      'apps/web/cypress/support/canvasFirstAuthoring.ts',
      'apps/web/cypress/e2e/canvas/canvas-first-authoring-live.cy.ts',
      'tools/planning-db/migrations/524_source_import_live_proof_symbol_reconcile.sql'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'docs/archive/**',
      'apps/web/cypress/e2e/canvas/**#cy.intercept_workspace_graph_draft',
      'apps/web/cypress/e2e/canvas/**#direct_put_workspace_graph_draft'
    ),
    'domainObjects', jsonb_build_array('WorkspaceGraphDraft', 'CanvasFirstAuthoringLiveProof'),
    'fowlerSignals', jsonb_build_array('test_only_confidence', 'protected_runtime_polling'),
    'architectureGuards', jsonb_build_array('pnpm docs:feature-mechanization:implementation'),
    'cypressFlows', jsonb_build_array('apps/web/cypress/e2e/canvas/canvas-first-authoring-live.cy.ts'),
    'completionGate', jsonb_build_array(
      'pnpm planning:db:migrate',
      'pnpm --filter @dvt/web test:e2e:first-authoring:live',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', 'ReadLiveFirstAuthoringDraftRecord',
        'type', 'query',
        'dddOwner', 'WorkspaceGraphDraft read boundary',
        'status', 'implemented'
      )
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'first-authoring-live-draft-record-symbols',
        'redTest', 'pnpm docs:feature-mechanization:implementation',
        'expectedFailure', 'The protected-runtime draft polling helpers are not declared in feature mechanization symbols.',
        'patchSurfaces', jsonb_build_array(
          'apps/web/cypress/support/canvasFirstAuthoring.ts',
          'tools/planning-db/migrations/524_source_import_live_proof_symbol_reconcile.sql'
        ),
        'greenTest', 'pnpm docs:feature-mechanization:implementation'
      )
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object(
        'name', 'pollLiveDraftRecord',
        'path', 'apps/web/cypress/support/canvasFirstAuthoring.ts',
        'dddOwner', 'WorkspaceGraphDraft read boundary',
        'cqRails', jsonb_build_array('ReadLiveFirstAuthoringDraftRecord'),
        'fowlerSignals', jsonb_build_array('protected_runtime_polling'),
        'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-first-authoring-live.cy.ts',
        'unitTests', jsonb_build_array('pnpm docs:feature-mechanization:implementation')
      ),
      jsonb_build_object(
        'name', 'waitForLiveFirstAuthoringDraftRecord',
        'path', 'apps/web/cypress/support/canvasFirstAuthoring.ts',
        'dddOwner', 'WorkspaceGraphDraft read boundary',
        'cqRails', jsonb_build_array('ReadLiveFirstAuthoringDraftRecord'),
        'fowlerSignals', jsonb_build_array('protected_runtime_polling'),
        'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-first-authoring-live.cy.ts',
        'unitTests', jsonb_build_array('pnpm docs:feature-mechanization:implementation')
      )
    )
  ),
  0,
  'codex'
)
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
  'local#PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612#query#applyplanningdbquerytextsearchfilter',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'implemented',
  'ApplyPlanningDbQueryTextSearchFilter',
  'applyplanningdbquerytextsearchfilter',
  'query',
  'PlanningDbQueryFilterHelper',
  'implemented',
  jsonb_build_array('scripts/planning-db/query-filter.cjs#appendTextSearchFilter'),
  jsonb_build_array(
    'scripts/planning-db/query-filter.cjs',
    'scripts/planning-db-query.cjs',
    'scripts/planning-db-query.test.cjs',
    'scripts/planning-db-frontend-component-inventory.test.cjs',
    'scripts/planning-db/frontend-component-inventory.cjs',
    'scripts/planning-db/queries/command-query-rail-query.cjs',
    'tools/planning-db/migrations/524_source_import_live_proof_symbol_reconcile.sql'
  ),
  jsonb_build_array(
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    'docs/architecture/command-query-rail-governance.md'
  ),
  jsonb_build_array(
    'AGENTS.md',
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/guides/ai-work-protocol.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md'
  ),
  jsonb_build_array(
    'scripts/planning-db/query-filter.cjs',
    'scripts/planning-db-query.cjs',
    'scripts/planning-db-query.test.cjs',
    'scripts/planning-db-frontend-component-inventory.test.cjs',
    'scripts/planning-db/frontend-component-inventory.cjs',
    'scripts/planning-db/queries/command-query-rail-query.cjs',
    'tools/planning-db/migrations/524_source_import_live_proof_symbol_reconcile.sql'
  ),
  jsonb_build_array(
    'node --test scripts/planning-db-query.test.cjs',
    'node --test scripts/planning-db-frontend-component-inventory.test.cjs',
    'pnpm docs:feature-mechanization:implementation'
  ),
  jsonb_build_array(
    'pnpm planning:db:migrate',
    'node --test scripts/planning-db-query.test.cjs',
    'node --test scripts/planning-db-frontend-component-inventory.test.cjs',
    'pnpm docs:feature-mechanization:implementation',
    'pnpm verify:prepush'
  ),
  'tools/planning-db/migrations/524_source_import_live_proof_symbol_reconcile.sql',
  md5('PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612:ApplyPlanningDbQueryTextSearchFilter:524'),
  jsonb_build_object(
    'name', 'ApplyPlanningDbQueryTextSearchFilter',
    'type', 'query',
    'dddOwner', 'PlanningDbQueryFilterHelper',
    'status', 'implemented'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan', 'Share broad text-search predicate construction across Planning DB query readers without ad hoc SQL fragments per query.',
    'componentGuides', jsonb_build_array('PlanningDbQueryFilterHelper'),
    'userStories', jsonb_build_array('As an operator, I can use --filter on component and rail discovery queries without knowing exact IDs.'),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/guides/ai-work-protocol.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md'
    ),
    'allowedImplementationSurfaces', jsonb_build_array(
      'scripts/planning-db/query-filter.cjs',
      'scripts/planning-db-query.cjs',
      'scripts/planning-db-query.test.cjs',
      'scripts/planning-db-frontend-component-inventory.test.cjs',
      'scripts/planning-db/frontend-component-inventory.cjs',
      'scripts/planning-db/queries/command-query-rail-query.cjs',
      'tools/planning-db/migrations/524_source_import_live_proof_symbol_reconcile.sql'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array('docs/archive/**'),
    'domainObjects', jsonb_build_array('PlanningDbQueryFilterHelper', 'PlanningDbReadModelQuery'),
    'fowlerSignals', jsonb_build_array('duplicate_query_logic', 'read_model_helper_extraction'),
    'architectureGuards', jsonb_build_array(
      'node --test scripts/planning-db-query.test.cjs',
      'node --test scripts/planning-db-frontend-component-inventory.test.cjs',
      'pnpm docs:feature-mechanization:implementation'
    ),
    'cypressFlows', jsonb_build_array('not_applicable:planning_db_cli'),
    'completionGate', jsonb_build_array(
      'pnpm planning:db:migrate',
      'node --test scripts/planning-db-query.test.cjs',
      'node --test scripts/planning-db-frontend-component-inventory.test.cjs',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', 'ApplyPlanningDbQueryTextSearchFilter',
        'type', 'query',
        'dddOwner', 'PlanningDbQueryFilterHelper',
        'status', 'implemented'
      )
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'planning-db-query-text-search-filter-helper',
        'redTest', 'node --test scripts/planning-db-query.test.cjs scripts/planning-db-frontend-component-inventory.test.cjs',
        'expectedFailure', 'frontend-components --filter and command-query-rails --filter cannot share broad text-search behavior through a common helper.',
        'patchSurfaces', jsonb_build_array(
          'scripts/planning-db/query-filter.cjs',
          'scripts/planning-db-query.cjs',
          'scripts/planning-db/frontend-component-inventory.cjs',
          'scripts/planning-db/queries/command-query-rail-query.cjs',
          'scripts/planning-db-query.test.cjs',
          'scripts/planning-db-frontend-component-inventory.test.cjs'
        ),
        'greenTest', 'node --test scripts/planning-db-query.test.cjs scripts/planning-db-frontend-component-inventory.test.cjs'
      )
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object(
        'name', 'appendTextSearchFilter',
        'path', 'scripts/planning-db/query-filter.cjs',
        'dddOwner', 'PlanningDbQueryFilterHelper',
        'cqRails', jsonb_build_array('ApplyPlanningDbQueryTextSearchFilter'),
        'fowlerSignals', jsonb_build_array('duplicate_query_logic', 'read_model_helper_extraction'),
        'architectureGuard', 'node --test scripts/planning-db-query.test.cjs',
        'cypressCoverage', 'not_applicable:planning_db_cli',
        'unitTests', jsonb_build_array(
          'node --test scripts/planning-db-query.test.cjs',
          'node --test scripts/planning-db-frontend-component-inventory.test.cjs'
        )
      )
    )
  ),
  0,
  'codex'
)
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
