-- Repoint or retire stale Canvas test-support local rails away from removed
-- support files. These rows are historical DB-local mechanization records, not
-- active product rails; keeping them on missing source paths breaks source
-- drift integrity.

update planning_query_store.feature_mechanization_local_rails
set
  mechanization_status = 'closed',
  rail_status = 'retired',
  source_path = 'apps/web/src/app/views/canvas/CanvasInspectorPanel.test.tsx',
  source_content_sha256 = 'c0027554900596f315e5e1145407478af2ee22c43ee385615f374af1a4e40537',
  symbol_refs = jsonb_build_array(
    'apps/web/src/app/views/canvas/CanvasInspectorPanel.test.tsx#CanvasInspectorPanel',
    'apps/web/src/app/views/canvas/CanvasInspectorPanel.modelerActions.test.tsx#CanvasInspectorPanel modeler actions',
    'apps/web/src/app/views/canvas/CanvasInspectorPanel.canvasProperties.test.tsx#CanvasInspectorPanel canvas properties'
  ),
  implementation_refs = jsonb_build_array(
    'apps/web/src/app/views/canvas/CanvasInspectorPanel.test.tsx',
    'apps/web/src/app/views/canvas/CanvasInspectorPanel.modelerActions.test.tsx',
    'apps/web/src/app/views/canvas/CanvasInspectorPanel.canvasProperties.test.tsx'
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
      '"retired"'::jsonb,
      true
    ),
    '{retirementReason}',
    to_jsonb(
      'Retired stale DB-local test-support rail: CanvasInspectorPanel.test.support.tsx no longer exists, and inspector behavior is covered by focused tracked component tests.'::text
    ),
    true
  ),
  raw_manifest = jsonb_set(
    jsonb_set(
      coalesce(raw_manifest, '{}'::jsonb),
      '{mechanizationStatus}',
      '"closed"'::jsonb,
      true
    ),
    '{sourceRepointReason}',
    to_jsonb(
      'Repointed from removed CanvasInspectorPanel.test.support.tsx to tracked CanvasInspectorPanel tests and retired because the support rail is obsolete.'::text
    ),
    true
  ),
  revision = greatest(revision, 1) + 1,
  updated_at = now()
where rail_id = 'local#CANVAS-TEST-MODULARIZATION-20260617#query#verifycanvasinspectorpaneltestsupport'
  and source_path = 'apps/web/src/app/views/canvas/CanvasInspectorPanel.test.support.tsx';

update planning_query_store.feature_mechanization_local_rails
set
  source_path = 'apps/web/src/app/views/canvas/useCanvasGraphHandlers.test.support.tsx',
  source_content_sha256 = 'dde11d717e88655ba80e1640cbad610fa639c5f3d478e44b4a632dcc7ee8064b',
  symbol_refs = jsonb_build_array(
    'apps/web/src/app/views/canvas/useCanvasGraphHandlers.test.support.tsx#buildCanonicalNode',
    'apps/web/src/app/views/canvas/useCanvasGraphHandlers.test.support.tsx#buildDraftSession',
    'apps/web/src/app/views/canvas/useCanvasGraphHandlers.test.support.tsx#renderGraphHandlersHook'
  ),
  implementation_refs = jsonb_build_array(
    'apps/web/src/app/views/canvas/useCanvasGraphHandlers.test.support.tsx',
    'apps/web/src/app/views/canvas/useCanvasGraphHandlers.nodeDrop.test.tsx'
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
  raw_manifest = jsonb_set(
    coalesce(raw_manifest, '{}'::jsonb),
    '{sourceRepointReason}',
    to_jsonb(
      'Repointed from removed useCanvasGraphHandlers.nodeAuthoring.test.support.ts to the tracked shared graph handler test support module.'::text
    ),
    true
  ),
  revision = greatest(revision, 1) + 1,
  updated_at = now()
where rail_id = 'local#CANVAS-TEST-MODULARIZATION-20260617#query#verifycanvasgraphnodeauthoringtestsupport'
  and source_path = 'apps/web/src/app/views/canvas/useCanvasGraphHandlers.nodeAuthoring.test.support.ts';
