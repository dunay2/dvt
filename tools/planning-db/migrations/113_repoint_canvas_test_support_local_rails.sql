-- Reconcile Canvas test-support local rails with the tracked modularized
-- support files on main. Older local DB projections can drift during branch
-- integration; these rows must point to real support modules, not deprecated
-- or temporary replacement tests.

update planning_query_store.feature_mechanization_local_rails
set
  mechanization_status = 'implemented',
  rail_status = 'implemented',
  source_path = 'apps/web/src/app/views/canvas/CanvasInspectorPanel.test.support.tsx',
  source_content_sha256 = 'f7a3d4cf1320b86ab006ed42160cc9a80436ee1c72ba4d63f8fed2ab01f763e0',
  symbol_refs = jsonb_build_array(
    'apps/web/src/app/views/canvas/CanvasInspectorPanel.test.support.tsx#InspectorProps',
    'apps/web/src/app/views/canvas/CanvasInspectorPanel.test.support.tsx#buildDbtInspectorModelNode',
    'apps/web/src/app/views/canvas/CanvasInspectorPanel.test.support.tsx#buildDvtInspectorNode',
    'apps/web/src/app/views/canvas/CanvasInspectorPanel.test.support.tsx#buildImportedSourceEdges',
    'apps/web/src/app/views/canvas/CanvasInspectorPanel.test.support.tsx#buildImportedWarehouseSourceNode',
    'apps/web/src/app/views/canvas/CanvasInspectorPanel.test.support.tsx#buildInspectorNode',
    'apps/web/src/app/views/canvas/CanvasInspectorPanel.test.support.tsx#renderInspectorPanel',
    'apps/web/src/app/views/canvas/CanvasInspectorPanel.test.support.tsx#selectInspectorMoreItem',
    'apps/web/src/app/views/canvas/CanvasInspectorPanel.test.support.tsx#tabByText',
    'apps/web/src/app/views/canvas/CanvasInspectorPanel.test.support.tsx#wrapInspectorWithRunsProvider'
  ),
  implementation_refs = jsonb_build_array(
    'apps/web/src/app/views/canvas/CanvasInspectorPanel.test.support.tsx#InspectorProps',
    'apps/web/src/app/views/canvas/CanvasInspectorPanel.test.support.tsx#buildDbtInspectorModelNode',
    'apps/web/src/app/views/canvas/CanvasInspectorPanel.test.support.tsx#buildDvtInspectorNode',
    'apps/web/src/app/views/canvas/CanvasInspectorPanel.test.support.tsx#buildImportedSourceEdges',
    'apps/web/src/app/views/canvas/CanvasInspectorPanel.test.support.tsx#buildImportedWarehouseSourceNode',
    'apps/web/src/app/views/canvas/CanvasInspectorPanel.test.support.tsx#buildInspectorNode',
    'apps/web/src/app/views/canvas/CanvasInspectorPanel.test.support.tsx#renderInspectorPanel',
    'apps/web/src/app/views/canvas/CanvasInspectorPanel.test.support.tsx#selectInspectorMoreItem',
    'apps/web/src/app/views/canvas/CanvasInspectorPanel.test.support.tsx#tabByText',
    'apps/web/src/app/views/canvas/CanvasInspectorPanel.test.support.tsx#wrapInspectorWithRunsProvider'
  ),
  documentation_refs = jsonb_build_array(
    'docs/architecture/components/web/frontend-component-inventory.md',
    'docs/architecture/command-query-rail-governance.md'
  ),
  governing_sources = jsonb_build_array(
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md',
    'docs/architecture/components/web/frontend-component-inventory.md'
  ),
  architecture_guards = jsonb_build_array(
    'apps/web/src/app/views/canvas/CanvasShell.architecture.test.tsx',
    'pnpm planning:db:integrity:check'
  ),
  completion_gate = jsonb_build_array(
    'pnpm planning:db:integrity:check',
    'pnpm verify:prepush'
  ),
  raw_rail = jsonb_set(
    jsonb_set(
      coalesce(raw_rail, '{}'::jsonb),
      '{status}',
      '"implemented"'::jsonb,
      true
    ),
    '{sourceRepointReason}',
    to_jsonb(
      'Confirmed against tracked CanvasInspectorPanel.test.support.tsx after integration with the Canvas test modularization slice.'::text
    ),
    true
  ),
  raw_manifest = jsonb_set(
    jsonb_set(
      coalesce(raw_manifest, '{}'::jsonb),
      '{mechanizationStatus}',
      '"implemented"'::jsonb,
      true
    ),
    '{sourceRepointReason}',
    to_jsonb(
      'Confirmed against tracked CanvasInspectorPanel.test.support.tsx after integration with the Canvas test modularization slice.'::text
    ),
    true
  ),
  revision = greatest(revision, 1) + 1,
  updated_at = now()
where rail_id = 'local#CANVAS-TEST-MODULARIZATION-20260617#query#verifycanvasinspectorpaneltestsupport';

update planning_query_store.feature_mechanization_local_rails
set
  mechanization_status = 'implemented',
  rail_status = 'implemented',
  source_path = 'apps/web/src/app/views/canvas/useCanvasGraphHandlers.nodeAuthoring.test.support.ts',
  source_content_sha256 = '1abb4dc54c4ad31b4a3bc487c2ba4ee2a377b077585b63405e7a3eba5f3e80b5',
  symbol_refs = jsonb_build_array(
    'apps/web/src/app/views/canvas/useCanvasGraphHandlers.nodeAuthoring.test.support.ts#buildCanonicalDropEvent',
    'apps/web/src/app/views/canvas/useCanvasGraphHandlers.nodeAuthoring.test.support.ts#requireAuthoringNodeKind'
  ),
  implementation_refs = jsonb_build_array(
    'apps/web/src/app/views/canvas/useCanvasGraphHandlers.nodeAuthoring.test.support.ts#buildCanonicalDropEvent',
    'apps/web/src/app/views/canvas/useCanvasGraphHandlers.nodeAuthoring.test.support.ts#requireAuthoringNodeKind'
  ),
  documentation_refs = jsonb_build_array(
    'docs/architecture/components/web/frontend-component-inventory.md',
    'docs/architecture/command-query-rail-governance.md'
  ),
  governing_sources = jsonb_build_array(
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md',
    'docs/architecture/components/web/frontend-component-inventory.md'
  ),
  architecture_guards = jsonb_build_array(
    'apps/web/src/app/views/canvas/useCanvasGraphHandlers.architecture.test.ts',
    'pnpm planning:db:integrity:check'
  ),
  completion_gate = jsonb_build_array(
    'pnpm planning:db:integrity:check',
    'pnpm verify:prepush'
  ),
  raw_rail = jsonb_set(
    jsonb_set(
      coalesce(raw_rail, '{}'::jsonb),
      '{status}',
      '"implemented"'::jsonb,
      true
    ),
    '{sourceRepointReason}',
    to_jsonb(
      'Confirmed against tracked useCanvasGraphHandlers.nodeAuthoring.test.support.ts after integration with the Canvas test modularization slice.'::text
    ),
    true
  ),
  raw_manifest = jsonb_set(
    jsonb_set(
      coalesce(raw_manifest, '{}'::jsonb),
      '{mechanizationStatus}',
      '"implemented"'::jsonb,
      true
    ),
    '{sourceRepointReason}',
    to_jsonb(
      'Confirmed against tracked useCanvasGraphHandlers.nodeAuthoring.test.support.ts after integration with the Canvas test modularization slice.'::text
    ),
    true
  ),
  revision = greatest(revision, 1) + 1,
  updated_at = now()
where rail_id = 'local#CANVAS-TEST-MODULARIZATION-20260617#query#verifycanvasgraphnodeauthoringtestsupport';
