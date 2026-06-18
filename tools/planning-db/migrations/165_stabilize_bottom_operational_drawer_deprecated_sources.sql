-- Stabilize the BottomOperationalDrawer DB-local rails after full imports.
-- Migration 164 depended on governance_file_query being populated before the
-- import transaction. This pass updates the active rail source paths without
-- requiring the file inventory to be present, and records the planned-but-never
-- tracked files only as deprecated metadata.

with rail_mapping (
  rail_name,
  new_source_path,
  deprecated_source_paths,
  symbol_refs,
  implementation_refs,
  allowed_current_paths,
  completion_gate,
  red_green_cycles,
  replacement_symbols
) as (
  values
    (
      'BuildBottomOperationalDrawerLogModel',
      'apps/web/src/app/components/shell/bottomConsoleDrawerModel.ts',
      array[
        'apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.ts',
        'apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.test.ts',
        'apps/web/src/app/components/shell/BottomOperationalDrawer.tsx',
        'apps/web/src/app/components/shell/BottomOperationalDrawer.test.tsx',
        'tools/planning-db/migrations/156_web_bottom_operational_drawer_component.sql'
      ]::text[],
      jsonb_build_array(
        'apps/web/src/app/components/shell/bottomConsoleDrawerModel.ts#BottomConsoleDrawerModel',
        'apps/web/src/app/components/shell/bottomConsoleDrawerModel.ts#BottomConsoleDrawerModelBase',
        'apps/web/src/app/components/shell/bottomConsoleDrawerModel.ts#BuildBottomConsoleDrawerModelInput',
        'apps/web/src/app/components/shell/bottomConsoleDrawerModel.ts#buildBottomConsoleDrawerModel'
      ),
      jsonb_build_array(
        'apps/web/src/app/components/shell/bottomConsoleDrawerModel.ts#BottomConsoleDrawerModel',
        'apps/web/src/app/components/shell/bottomConsoleDrawerModel.ts#BottomConsoleDrawerModelBase',
        'apps/web/src/app/components/shell/bottomConsoleDrawerModel.ts#BuildBottomConsoleDrawerModelInput',
        'apps/web/src/app/components/shell/bottomConsoleDrawerModel.ts#buildBottomConsoleDrawerModel',
        'apps/web/src/app/components/shell/bottomConsoleDrawerModel.test.ts'
      ),
      jsonb_build_array(
        'apps/web/src/app/components/shell/bottomConsoleDrawerModel.ts',
        'apps/web/src/app/components/shell/bottomConsoleDrawerModel.test.ts'
      ),
      jsonb_build_array(
        'pnpm --filter @dvt/web test:unit:run -- src/app/components/shell/bottomConsoleDrawerModel.test.ts src/app/stores/uiLayoutStore.test.ts',
        'pnpm --filter @dvt/web test:presentation:run -- src/app/components/shell/OperationalDrawerPanels.test.tsx src/app/components/shell/AppShellFrame.test.tsx src/app/Root.shellChrome.test.tsx src/app/views/canvas/useCanvasExecutionActions.runStartSuccess.test.tsx',
        'pnpm --filter @dvt/web test:architecture:run -- src/app/components/shell/OperationalDrawerPanels.architecture.test.ts src/app/views/runs/runsDomainBoundary.architecture.test.ts',
        'node --test scripts/planning-db-frontend-component-inventory.test.cjs',
        'pnpm --filter @dvt/web typecheck',
        'pnpm --filter @dvt/web lint',
        'pnpm governance:refresh',
        'pnpm docs:feature-mechanization:implementation',
        'pnpm verify:prepush'
      ),
      jsonb_build_array(
        jsonb_build_object(
          'id', 'buildbottomoperationaldrawerlogmodel-deprecated-source-repoint',
          'redTest', 'pnpm planning:db:query source-drift --no-refresh --limit 20',
          'greenTest', 'pnpm planning:db:integrity:check',
          'patchSurfaces', jsonb_build_array(
            'apps/web/src/app/components/shell/bottomConsoleDrawerModel.ts',
            'apps/web/src/app/components/shell/bottomConsoleDrawerModel.test.ts',
            'tools/planning-db/migrations/165_stabilize_bottom_operational_drawer_deprecated_sources.sql'
          ),
          'expectedFailure', 'The Planning DB reports the deprecated bottomOperationalDrawerLogModel paths as active governed source drift.'
        )
      ),
      jsonb_build_array(
        jsonb_build_object(
          'name', 'BottomConsoleDrawerModel',
          'path', 'apps/web/src/app/components/shell/bottomConsoleDrawerModel.ts',
          'cqRails', jsonb_build_array('BuildBottomOperationalDrawerLogModel'),
          'dddOwner', 'web.shell.BottomOperationalDrawer',
          'unitTests', jsonb_build_array('pnpm --filter @dvt/web test:unit:run -- src/app/components/shell/bottomConsoleDrawerModel.test.ts'),
          'fowlerSignals', jsonb_build_array('published_language', 'duplicate_semantics'),
          'architectureGuard', 'pnpm --filter @dvt/web test:architecture:run -- src/app/components/shell/OperationalDrawerPanels.architecture.test.ts'
        ),
        jsonb_build_object(
          'name', 'BottomConsoleDrawerModelBase',
          'path', 'apps/web/src/app/components/shell/bottomConsoleDrawerModel.ts',
          'cqRails', jsonb_build_array('BuildBottomOperationalDrawerLogModel'),
          'dddOwner', 'web.shell.BottomOperationalDrawer',
          'unitTests', jsonb_build_array('pnpm --filter @dvt/web test:unit:run -- src/app/components/shell/bottomConsoleDrawerModel.test.ts'),
          'fowlerSignals', jsonb_build_array('published_language', 'duplicate_semantics'),
          'architectureGuard', 'pnpm --filter @dvt/web test:architecture:run -- src/app/components/shell/OperationalDrawerPanels.architecture.test.ts'
        ),
        jsonb_build_object(
          'name', 'BuildBottomConsoleDrawerModelInput',
          'path', 'apps/web/src/app/components/shell/bottomConsoleDrawerModel.ts',
          'cqRails', jsonb_build_array('BuildBottomOperationalDrawerLogModel'),
          'dddOwner', 'web.shell.BottomOperationalDrawer',
          'unitTests', jsonb_build_array('pnpm --filter @dvt/web test:unit:run -- src/app/components/shell/bottomConsoleDrawerModel.test.ts'),
          'fowlerSignals', jsonb_build_array('published_language', 'duplicate_semantics'),
          'architectureGuard', 'pnpm --filter @dvt/web test:architecture:run -- src/app/components/shell/OperationalDrawerPanels.architecture.test.ts'
        ),
        jsonb_build_object(
          'name', 'buildBottomConsoleDrawerModel',
          'path', 'apps/web/src/app/components/shell/bottomConsoleDrawerModel.ts',
          'cqRails', jsonb_build_array('BuildBottomOperationalDrawerLogModel'),
          'dddOwner', 'web.shell.BottomOperationalDrawer',
          'unitTests', jsonb_build_array('pnpm --filter @dvt/web test:unit:run -- src/app/components/shell/bottomConsoleDrawerModel.test.ts'),
          'fowlerSignals', jsonb_build_array('published_language', 'duplicate_semantics'),
          'architectureGuard', 'pnpm --filter @dvt/web test:architecture:run -- src/app/components/shell/OperationalDrawerPanels.architecture.test.ts'
        )
      )
    ),
    (
      'RenderBottomOperationalDrawer',
      'apps/web/src/app/components/shell/OperationalDrawerPanels.tsx',
      array[
        'apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.ts',
        'apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.test.ts',
        'apps/web/src/app/components/shell/BottomOperationalDrawer.tsx',
        'apps/web/src/app/components/shell/BottomOperationalDrawer.test.tsx',
        'tools/planning-db/migrations/156_web_bottom_operational_drawer_component.sql'
      ]::text[],
      jsonb_build_array(
        'apps/web/src/app/components/shell/OperationalDrawerPanels.tsx#BottomOperationalProblemsPanel',
        'apps/web/src/app/components/shell/OperationalDrawerPanels.tsx#BottomOperationalRunsPanel',
        'apps/web/src/app/components/shell/OperationalDrawerPanels.tsx#BottomOperationalPreviewPanel',
        'apps/web/src/app/components/shell/OperationalDrawerPanels.tsx#BottomOperationalDrawerTabs',
        'apps/web/src/app/components/shell/OperationalDrawerPanels.tsx#BottomOperationalDrawerBody'
      ),
      jsonb_build_array(
        'apps/web/src/app/components/shell/OperationalDrawerPanels.tsx#BottomOperationalProblemsPanel',
        'apps/web/src/app/components/shell/OperationalDrawerPanels.tsx#BottomOperationalRunsPanel',
        'apps/web/src/app/components/shell/OperationalDrawerPanels.tsx#BottomOperationalPreviewPanel',
        'apps/web/src/app/components/shell/OperationalDrawerPanels.tsx#BottomOperationalDrawerTabs',
        'apps/web/src/app/components/shell/OperationalDrawerPanels.tsx#BottomOperationalDrawerBody',
        'apps/web/src/app/components/shell/OperationalDrawerPanels.test.tsx'
      ),
      jsonb_build_array(
        'apps/web/src/app/components/shell/OperationalDrawerPanels.tsx',
        'apps/web/src/app/components/shell/OperationalDrawerPanels.test.tsx'
      ),
      jsonb_build_array(
        'pnpm --filter @dvt/web test:unit:run -- src/app/components/shell/bottomConsoleDrawerModel.test.ts src/app/stores/uiLayoutStore.test.ts',
        'pnpm --filter @dvt/web test:presentation:run -- src/app/components/shell/OperationalDrawerPanels.test.tsx src/app/components/shell/AppShellFrame.test.tsx src/app/Root.shellChrome.test.tsx src/app/views/canvas/useCanvasExecutionActions.runStartSuccess.test.tsx',
        'pnpm --filter @dvt/web test:architecture:run -- src/app/components/shell/OperationalDrawerPanels.architecture.test.ts src/app/views/runs/runsDomainBoundary.architecture.test.ts',
        'node --test scripts/planning-db-frontend-component-inventory.test.cjs',
        'pnpm --filter @dvt/web typecheck',
        'pnpm --filter @dvt/web lint',
        'pnpm governance:refresh',
        'pnpm docs:feature-mechanization:implementation',
        'pnpm verify:prepush'
      ),
      jsonb_build_array(
        jsonb_build_object(
          'id', 'renderbottomoperationaldrawer-deprecated-source-repoint',
          'redTest', 'pnpm planning:db:query source-drift --no-refresh --limit 20',
          'greenTest', 'pnpm planning:db:integrity:check',
          'patchSurfaces', jsonb_build_array(
            'apps/web/src/app/components/shell/OperationalDrawerPanels.tsx',
            'apps/web/src/app/components/shell/OperationalDrawerPanels.test.tsx',
            'tools/planning-db/migrations/165_stabilize_bottom_operational_drawer_deprecated_sources.sql'
          ),
          'expectedFailure', 'The Planning DB reports the deprecated BottomOperationalDrawer component path as active governed source drift.'
        )
      ),
      jsonb_build_array(
        jsonb_build_object(
          'name', 'BottomOperationalProblemsPanel',
          'path', 'apps/web/src/app/components/shell/OperationalDrawerPanels.tsx',
          'cqRails', jsonb_build_array('RenderBottomOperationalDrawer'),
          'dddOwner', 'web.shell.BottomOperationalDrawer',
          'unitTests', jsonb_build_array('pnpm --filter @dvt/web test:presentation:run -- src/app/components/shell/OperationalDrawerPanels.test.tsx'),
          'fowlerSignals', jsonb_build_array('published_language'),
          'architectureGuard', 'pnpm --filter @dvt/web test:architecture:run -- src/app/components/shell/OperationalDrawerPanels.architecture.test.ts'
        ),
        jsonb_build_object(
          'name', 'BottomOperationalRunsPanel',
          'path', 'apps/web/src/app/components/shell/OperationalDrawerPanels.tsx',
          'cqRails', jsonb_build_array('RenderBottomOperationalDrawer'),
          'dddOwner', 'web.shell.BottomOperationalDrawer',
          'unitTests', jsonb_build_array('pnpm --filter @dvt/web test:presentation:run -- src/app/components/shell/OperationalDrawerPanels.test.tsx'),
          'fowlerSignals', jsonb_build_array('published_language'),
          'architectureGuard', 'pnpm --filter @dvt/web test:architecture:run -- src/app/components/shell/OperationalDrawerPanels.architecture.test.ts'
        ),
        jsonb_build_object(
          'name', 'BottomOperationalPreviewPanel',
          'path', 'apps/web/src/app/components/shell/OperationalDrawerPanels.tsx',
          'cqRails', jsonb_build_array('RenderBottomOperationalDrawer'),
          'dddOwner', 'web.shell.BottomOperationalDrawer',
          'unitTests', jsonb_build_array('pnpm --filter @dvt/web test:presentation:run -- src/app/components/shell/OperationalDrawerPanels.test.tsx'),
          'fowlerSignals', jsonb_build_array('published_language'),
          'architectureGuard', 'pnpm --filter @dvt/web test:architecture:run -- src/app/components/shell/OperationalDrawerPanels.architecture.test.ts'
        ),
        jsonb_build_object(
          'name', 'BottomOperationalDrawerTabs',
          'path', 'apps/web/src/app/components/shell/OperationalDrawerPanels.tsx',
          'cqRails', jsonb_build_array('RenderBottomOperationalDrawer'),
          'dddOwner', 'web.shell.BottomOperationalDrawer',
          'unitTests', jsonb_build_array('pnpm --filter @dvt/web test:presentation:run -- src/app/components/shell/OperationalDrawerPanels.test.tsx'),
          'fowlerSignals', jsonb_build_array('published_language'),
          'architectureGuard', 'pnpm --filter @dvt/web test:architecture:run -- src/app/components/shell/OperationalDrawerPanels.architecture.test.ts'
        ),
        jsonb_build_object(
          'name', 'BottomOperationalDrawerBody',
          'path', 'apps/web/src/app/components/shell/OperationalDrawerPanels.tsx',
          'cqRails', jsonb_build_array('RenderBottomOperationalDrawer'),
          'dddOwner', 'web.shell.BottomOperationalDrawer',
          'unitTests', jsonb_build_array('pnpm --filter @dvt/web test:presentation:run -- src/app/components/shell/OperationalDrawerPanels.test.tsx'),
          'fowlerSignals', jsonb_build_array('published_language'),
          'architectureGuard', 'pnpm --filter @dvt/web test:architecture:run -- src/app/components/shell/OperationalDrawerPanels.architecture.test.ts'
        )
      )
    )
),
patched_rails as (
  select
    rail.rail_id,
    mapping.rail_name,
    mapping.new_source_path,
    mapping.deprecated_source_paths,
    mapping.symbol_refs,
    mapping.implementation_refs,
    mapping.allowed_current_paths,
    mapping.completion_gate,
    mapping.red_green_cycles,
    mapping.replacement_symbols,
    coalesce(
      (
        select file_ref.content_hash
        from planning_query_store.governance_files file_ref
        where file_ref.path = mapping.new_source_path
      ),
      rail.source_content_sha256
    ) as source_content_sha256,
    (
      select coalesce(jsonb_agg(distinct allowed.path order by allowed.path), '[]'::jsonb)
      from (
        select value as path
        from jsonb_array_elements_text(
          coalesce(rail.raw_manifest->'allowedImplementationSurfaces', '[]'::jsonb)
        ) existing_allowed(value)
        where not (existing_allowed.value = any(mapping.deprecated_source_paths))
        union all
        select value as path
        from jsonb_array_elements_text(mapping.allowed_current_paths) current_allowed(value)
      ) allowed
    ) as allowed_implementation_surfaces,
    (
      select coalesce(jsonb_agg(distinct forbidden.path order by forbidden.path), '[]'::jsonb)
      from (
        select value as path
        from jsonb_array_elements_text(
          coalesce(rail.raw_manifest->'forbiddenImplementationSurfaces', '[]'::jsonb)
        ) existing_forbidden(value)
        where existing_forbidden.value <> mapping.new_source_path
          and not (existing_forbidden.value = any(mapping.deprecated_source_paths))
      ) forbidden
    ) as forbidden_implementation_surfaces
  from planning_query_store.feature_mechanization_local_rails rail
  join rail_mapping mapping
    on mapping.rail_name = rail.rail_name
  where rail.feature_id = 'UXDB-BOTTOM-OPERATIONAL-DRAWER-P0-1'
)
update planning_query_store.feature_mechanization_local_rails rail
set
  source_path = patched.new_source_path,
  source_content_sha256 = patched.source_content_sha256,
  symbol_refs = patched.symbol_refs,
  implementation_refs = patched.implementation_refs,
  raw_rail = coalesce(rail.raw_rail, '{}'::jsonb) || jsonb_build_object(
    'deprecatedSourcePaths', to_jsonb(patched.deprecated_source_paths),
    'currentImplementationSourcePath', patched.new_source_path,
    'sourcePathReconciledBy', '165_stabilize_bottom_operational_drawer_deprecated_sources',
    'deprecationPolicy', 'Planned files that never landed are metadata only and cannot be active governed sources.'
  ),
  raw_manifest = (
    coalesce(rail.raw_manifest, '{}'::jsonb)
    - 'symbols'
    - 'allowedImplementationSurfaces'
    - 'forbiddenImplementationSurfaces'
    - 'completionGate'
    - 'redGreenCycles'
  ) || jsonb_build_object(
    'symbols', patched.replacement_symbols,
    'allowedImplementationSurfaces', patched.allowed_implementation_surfaces,
    'forbiddenImplementationSurfaces', patched.forbidden_implementation_surfaces,
    'completionGate', patched.completion_gate,
    'redGreenCycles', patched.red_green_cycles,
    'deprecatedSourcePaths', to_jsonb(patched.deprecated_source_paths),
    'currentImplementationSourcePath', patched.new_source_path,
    'sourcePathReconciledBy', '165_stabilize_bottom_operational_drawer_deprecated_sources',
    'deprecationPolicy', 'Planned files that never landed are metadata only and cannot be active governed sources.'
  ),
  revision = rail.revision + 1,
  updated_at = now()
from patched_rails patched
where rail.rail_id = patched.rail_id;
