-- Harden the already-applied Canvas bottom drawer feature manifest so the
-- Planning DB effective rail contains the required implementation gates and
-- the new local symbols declared by the actionable read-model slice.

with manifest_patch as (
  select
    jsonb_build_array(
      'apps/web/src/app/views/canvas/canvasOperationalDrawerContribution.ts#BuildCanvasOperationalDrawerContributionArgs',
      'apps/web/src/app/views/canvas/canvasOperationalDrawerContribution.ts#tabLabels',
      'apps/web/src/app/views/canvas/canvasOperationalDrawerContribution.ts#buildReadinessProblems',
      'apps/web/src/app/views/canvas/canvasOperationalDrawerContribution.ts#buildCanvasOperationalDrawerContribution',
      'apps/web/src/app/components/shell/OperationalDrawerPanelPrimitives.tsx#OperationalDrawerRunStatusSummary',
      'apps/web/src/app/components/shell/OperationalDrawerPanelPrimitives.tsx#OperationalDrawerSecondaryAction'
    ) as new_symbol_refs,
    jsonb_build_array(
      'apps/web/src/app/views/canvas/canvasOperationalDrawerContribution.ts',
      'apps/web/src/app/views/canvas/canvasOperationalDrawerContribution.test.tsx',
      'apps/web/src/app/views/canvas/CanvasOperationalDrawerContributionRegistrar.tsx',
      'apps/web/src/app/components/shell/operationalDrawerContributionStore.ts',
      'apps/web/src/app/components/shell/OperationalDrawerPanels.tsx',
      'apps/web/src/app/components/shell/OperationalDrawerPanelPrimitives.tsx',
      'apps/web/src/app/components/shell/OperationalDrawerPanels.actions.test.tsx',
      'apps/web/src/app/components/shell/OperationalDrawerPanels.test.tsx',
      'scripts/planning-db-migrate.test.cjs',
      'tools/planning-db/migrations/332_canvas_bottom_drawer_actionable_read_model.sql',
      'tools/planning-db/migrations/333_canvas_bottom_drawer_feature_manifest_hardening.sql'
    ) as allowed_surfaces,
    jsonb_build_array(
      'not_applicable:bottom_drawer_actionable_read_model_extends_existing_component_only'
    ) as forbidden_surfaces,
    jsonb_build_array(
      'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/shell/OperationalDrawerPanels.actions.test.tsx src/app/components/shell/OperationalDrawerPanels.test.tsx',
      'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-presentation.config.ts src/app/views/canvas/canvasOperationalDrawerContribution.test.tsx src/app/views/canvas/CanvasShell.operationalDrawer.test.tsx',
      'node --test --test-name-pattern "tracked migrations register Canvas bottom drawer actionable read model" scripts/planning-db-migrate.test.cjs'
    ) as architecture_guards,
    jsonb_build_array(
      'not_applicable:read_model_and_component_slice_no_browser_route_delta'
    ) as cypress_flows,
    jsonb_build_array(
      'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/shell/OperationalDrawerPanels.actions.test.tsx src/app/components/shell/OperationalDrawerPanels.test.tsx',
      'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-presentation.config.ts src/app/views/canvas/canvasOperationalDrawerContribution.test.tsx src/app/views/canvas/CanvasShell.operationalDrawer.test.tsx',
      'pnpm --filter @dvt/web typecheck',
      'pnpm --filter @dvt/web lint',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ) as completion_gate,
    jsonb_build_array(
      jsonb_build_object(
        'id', 'bottom-drawer-problem-action',
        'redTest', 'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/shell/OperationalDrawerPanels.actions.test.tsx',
        'expectedFailure', 'BottomOperationalProblemsPanel renders no Preview execution plan action for readiness blockers.',
        'patchSurfaces', jsonb_build_array(
          'apps/web/src/app/components/shell/operationalDrawerContributionStore.ts',
          'apps/web/src/app/components/shell/OperationalDrawerPanelPrimitives.tsx',
          'apps/web/src/app/components/shell/OperationalDrawerPanels.tsx'
        ),
        'greenTest', 'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/shell/OperationalDrawerPanels.actions.test.tsx src/app/components/shell/OperationalDrawerPanels.test.tsx'
      ),
      jsonb_build_object(
        'id', 'canvas-drawer-presenter',
        'redTest', 'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-presentation.config.ts src/app/views/canvas/canvasOperationalDrawerContribution.test.tsx',
        'expectedFailure', 'Canvas readiness posture is still built inline by the registrar instead of a presenter read model.',
        'patchSurfaces', jsonb_build_array(
          'apps/web/src/app/views/canvas/canvasOperationalDrawerContribution.ts',
          'apps/web/src/app/views/canvas/CanvasOperationalDrawerContributionRegistrar.tsx'
        ),
        'greenTest', 'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-presentation.config.ts src/app/views/canvas/canvasOperationalDrawerContribution.test.tsx src/app/views/canvas/CanvasShell.operationalDrawer.test.tsx'
      )
    ) as red_green_cycles,
    jsonb_build_array(
      jsonb_build_object(
        'name', 'BuildCanvasOperationalDrawerContributionArgs',
        'path', 'apps/web/src/app/views/canvas/canvasOperationalDrawerContribution.ts',
        'dddOwner', 'web.component.shell.BottomOperationalDrawer',
        'cqRails', jsonb_build_array('RenderBottomOperationalDrawer'),
        'fowlerSignals', jsonb_build_array('explicit_read_model'),
        'architectureGuard', 'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-presentation.config.ts src/app/views/canvas/canvasOperationalDrawerContribution.test.tsx',
        'cypressCoverage', 'not_applicable:presenter_contract',
        'unitTests', jsonb_build_array('pnpm --filter @dvt/web exec vitest run --config vitest.canvas-presentation.config.ts src/app/views/canvas/canvasOperationalDrawerContribution.test.tsx')
      ),
      jsonb_build_object(
        'name', 'tabLabels',
        'path', 'apps/web/src/app/views/canvas/canvasOperationalDrawerContribution.ts',
        'dddOwner', 'web.component.shell.BottomOperationalDrawer',
        'cqRails', jsonb_build_array('RenderBottomOperationalDrawer'),
        'fowlerSignals', jsonb_build_array('published_language'),
        'architectureGuard', 'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-presentation.config.ts src/app/views/canvas/canvasOperationalDrawerContribution.test.tsx',
        'cypressCoverage', 'not_applicable:presenter_contract',
        'unitTests', jsonb_build_array('pnpm --filter @dvt/web exec vitest run --config vitest.canvas-presentation.config.ts src/app/views/canvas/canvasOperationalDrawerContribution.test.tsx')
      ),
      jsonb_build_object(
        'name', 'buildReadinessProblems',
        'path', 'apps/web/src/app/views/canvas/canvasOperationalDrawerContribution.ts',
        'dddOwner', 'web.component.shell.BottomOperationalDrawer',
        'cqRails', jsonb_build_array('RenderBottomOperationalDrawer'),
        'fowlerSignals', jsonb_build_array('explicit_read_model'),
        'architectureGuard', 'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-presentation.config.ts src/app/views/canvas/canvasOperationalDrawerContribution.test.tsx',
        'cypressCoverage', 'not_applicable:presenter_contract',
        'unitTests', jsonb_build_array('pnpm --filter @dvt/web exec vitest run --config vitest.canvas-presentation.config.ts src/app/views/canvas/canvasOperationalDrawerContribution.test.tsx')
      ),
      jsonb_build_object(
        'name', 'buildCanvasOperationalDrawerContribution',
        'path', 'apps/web/src/app/views/canvas/canvasOperationalDrawerContribution.ts',
        'dddOwner', 'web.component.shell.BottomOperationalDrawer',
        'cqRails', jsonb_build_array('RenderBottomOperationalDrawer'),
        'fowlerSignals', jsonb_build_array('explicit_read_model'),
        'architectureGuard', 'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-presentation.config.ts src/app/views/canvas/canvasOperationalDrawerContribution.test.tsx',
        'cypressCoverage', 'not_applicable:presenter_contract',
        'unitTests', jsonb_build_array('pnpm --filter @dvt/web exec vitest run --config vitest.canvas-presentation.config.ts src/app/views/canvas/canvasOperationalDrawerContribution.test.tsx')
      ),
      jsonb_build_object(
        'name', 'OperationalDrawerRunStatusSummary',
        'path', 'apps/web/src/app/components/shell/OperationalDrawerPanelPrimitives.tsx',
        'dddOwner', 'web.component.shell.BottomOperationalDrawer',
        'cqRails', jsonb_build_array('RenderBottomOperationalDrawer'),
        'fowlerSignals', jsonb_build_array('presentation_logic_separation'),
        'architectureGuard', 'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/shell/OperationalDrawerPanels.actions.test.tsx',
        'cypressCoverage', 'not_applicable:presentation_primitive',
        'unitTests', jsonb_build_array('pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/shell/OperationalDrawerPanels.actions.test.tsx')
      ),
      jsonb_build_object(
        'name', 'OperationalDrawerSecondaryAction',
        'path', 'apps/web/src/app/components/shell/OperationalDrawerPanelPrimitives.tsx',
        'dddOwner', 'web.component.shell.BottomOperationalDrawer',
        'cqRails', jsonb_build_array('RenderBottomOperationalDrawer'),
        'fowlerSignals', jsonb_build_array('presentation_logic_separation'),
        'architectureGuard', 'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/shell/OperationalDrawerPanels.actions.test.tsx',
        'cypressCoverage', 'not_applicable:presentation_primitive',
        'unitTests', jsonb_build_array('pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/shell/OperationalDrawerPanels.actions.test.tsx')
      )
    ) as symbols
)
update planning_query_store.feature_mechanization_local_rails rail
set
  symbol_refs = (
    select jsonb_agg(distinct symbol_ref order by symbol_ref)
    from jsonb_array_elements_text(coalesce(rail.symbol_refs, '[]'::jsonb) || patch.new_symbol_refs)
      as symbol_refs(symbol_ref)
  ),
  implementation_refs = (
    select jsonb_agg(distinct surface order by surface)
    from jsonb_array_elements_text(coalesce(rail.implementation_refs, '[]'::jsonb) || patch.allowed_surfaces)
      as surfaces(surface)
  ),
  allowed_implementation_surfaces = patch.allowed_surfaces,
  architecture_guards = patch.architecture_guards,
  completion_gate = patch.completion_gate,
  source_path = 'tools/planning-db/migrations/333_canvas_bottom_drawer_feature_manifest_hardening.sql',
  source_content_sha256 = md5('UXDB-BOTTOM-OPERATIONAL-DRAWER-P0-1:333'),
  raw_manifest =
    coalesce(rail.raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'allowedImplementationSurfaces', patch.allowed_surfaces,
      'forbiddenImplementationSurfaces', patch.forbidden_surfaces,
      'architectureGuards', patch.architecture_guards,
      'cypressFlows', patch.cypress_flows,
      'completionGate', patch.completion_gate,
      'redGreenCycles', patch.red_green_cycles,
      'symbols', patch.symbols
    ),
  revision = revision + 1,
  updated_at = now()
from manifest_patch patch
where
  rail.feature_id = 'UXDB-BOTTOM-OPERATIONAL-DRAWER-P0-1'
  and rail.normalized_rail_name = 'renderbottomoperationaldrawer';
