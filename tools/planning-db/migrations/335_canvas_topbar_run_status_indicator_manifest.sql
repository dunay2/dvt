-- Extend the Canvas bottom drawer read-model feature with its compact shell
-- Run status projection. The product intent remains RenderBottomOperationalDrawer:
-- the top bar only renders the minimum readiness summary while the drawer owns
-- the actionable detail.

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
  'CANVAS-TOPBAR-RUN-STATUS-INDICATOR-20260627',
  'E-CANVAS-EXECUTION-PREVIEW-READINESS-1',
  'Canvas top bar compact run status indicator',
  'Frontend / Canvas',
  'implemented',
  'The top bar renders only the compact run readiness summary from the bottom operational drawer contribution while Problems and Preview retain actionable detail.',
  'responsibility_overload',
  'RenderBottomOperationalDrawer',
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
    'CANVAS-TOPBAR-RUN-STATUS-INDICATOR-20260627',
    'decision',
    'E-CANVAS-EXECUTION-PREVIEW-READINESS-1',
    'may_update',
    true
  ),
  (
    'CANVAS-TOPBAR-RUN-STATUS-INDICATOR-20260627',
    'component',
    'web.component.shell.BottomOperationalDrawer',
    'may_update',
    true
  ),
  (
    'CANVAS-TOPBAR-RUN-STATUS-INDICATOR-20260627',
    'path',
    'apps/web/src/app/components/shell/ShellRunStatusIndicator.tsx',
    'may_create',
    true
  ),
  (
    'CANVAS-TOPBAR-RUN-STATUS-INDICATOR-20260627',
    'path',
    'apps/web/src/app/components/TopAppBar.tsx',
    'may_update',
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
    'web.component.shell.BottomOperationalDrawer',
    'apps/web/src/app/components/shell/ShellRunStatusIndicator.tsx',
    'presentation',
    'ShellRunStatusIndicator',
    jsonb_build_object(
      'rail', 'RenderBottomOperationalDrawer',
      'scope', 'Top bar compact run/readiness summary for Canvas shell',
      'fowlerSignal', 'presentation_logic_separation'
    ),
    'tools/planning-db/migrations/335_canvas_topbar_run_status_indicator_manifest.sql',
    md5('ShellRunStatusIndicator.tsx:335')
  ),
  (
    'web.component.shell.BottomOperationalDrawer',
    'apps/web/src/app/components/TopAppBar.tsx',
    'composition',
    'ShellTopBar',
    jsonb_build_object(
      'rail', 'RenderBottomOperationalDrawer',
      'scope', 'Shell composition point renders compact status only; drawer remains detail owner',
      'fowlerSignal', 'contextual_status_summary'
    ),
    'tools/planning-db/migrations/335_canvas_topbar_run_status_indicator_manifest.sql',
    md5('TopAppBar.tsx:335')
  ),
  (
    'web.component.shell.BottomOperationalDrawer',
    'apps/web/src/app/components/TopAppBar.test.tsx',
    'test',
    null,
    jsonb_build_object(
      'coverage', 'Top bar renders compact readiness/run status from the operational drawer read model'
    ),
    'tools/planning-db/migrations/335_canvas_topbar_run_status_indicator_manifest.sql',
    md5('TopAppBar.test.tsx:335')
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
    'EV-WEB-CANVAS-TOPBAR-RUN-STATUS-INDICATOR',
    'web.component.shell.BottomOperationalDrawer',
    'test',
    'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/TopAppBar.test.tsx',
    'passing',
    jsonb_build_object(
      'scope', 'Top bar renders only the compact run/readiness state while drawer owns actionable detail'
    ),
    'tools/planning-db/migrations/335_canvas_topbar_run_status_indicator_manifest.sql',
    md5('EV-WEB-CANVAS-TOPBAR-RUN-STATUS-INDICATOR:335')
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

with target_rails as (
  select
    rail_id,
    symbol_refs,
    implementation_refs,
    allowed_implementation_surfaces,
    architecture_guards,
    completion_gate,
    raw_manifest
  from planning_query_store.feature_mechanization_local_rails
  where
    feature_id = 'UXDB-BOTTOM-OPERATIONAL-DRAWER-P0-1'
    and normalized_rail_name = 'renderbottomoperationaldrawer'
),
patch as (
  select
    jsonb_build_array(
      'apps/web/src/app/components/shell/ShellRunStatusIndicator.tsx#ShellRunStatusIndicator',
      'apps/web/src/app/components/shell/ShellRunStatusIndicator.tsx#ShellRunStatusIndicatorProps',
      'apps/web/src/app/components/shell/ShellRunStatusIndicator.tsx#resolveRunStatusLabel',
      'apps/web/src/app/components/shell/ShellRunStatusIndicator.tsx#resolveStatusClassName',
      'apps/web/src/app/components/shell/ShellRunStatusIndicator.tsx#shellRunStatusClasses'
    ) as symbol_refs,
    jsonb_build_array(
      'apps/web/src/app/components/shell/ShellRunStatusIndicator.tsx',
      'apps/web/src/app/components/TopAppBar.tsx',
      'apps/web/src/app/components/TopAppBar.test.tsx',
      'apps/web/src/app/components/shell/operationalDrawerContributionStore.ts',
      'apps/web/src/app/views/canvas/CanvasOperationalDrawerContributionRegistrar.tsx',
      'apps/web/src/app/views/canvas/CanvasShell.tsx',
      'apps/web/src/app/views/canvas/CanvasShell.operationalDrawer.test.tsx',
      'apps/web/src/app/views/canvas/canvasOperationalDrawerContribution.ts',
      'apps/web/src/app/views/canvas/canvasOperationalDrawerContribution.test.tsx',
      'apps/web/src/app/components/shell/OperationalDrawerPanels.actions.test.tsx',
      'apps/web/src/app/components/shell/OperationalDrawerPanels.test.tsx',
      'scripts/planning-db-migrate.test.cjs',
      'tools/planning-db/migrations/335_canvas_topbar_run_status_indicator_manifest.sql'
    ) as allowed_surfaces,
    jsonb_build_array(
      'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/TopAppBar.test.tsx',
      'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/shell/OperationalDrawerPanels.actions.test.tsx src/app/components/shell/OperationalDrawerPanels.test.tsx',
      'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-presentation.config.ts src/app/views/canvas/canvasOperationalDrawerContribution.test.tsx src/app/views/canvas/CanvasShell.operationalDrawer.test.tsx',
      'node --test --test-name-pattern "tracked migrations register Canvas bottom drawer actionable read model" scripts/planning-db-migrate.test.cjs'
    ) as guards,
    jsonb_build_array(
      'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/TopAppBar.test.tsx',
      'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/shell/OperationalDrawerPanels.actions.test.tsx src/app/components/shell/OperationalDrawerPanels.test.tsx',
      'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-presentation.config.ts src/app/views/canvas/canvasOperationalDrawerContribution.test.tsx src/app/views/canvas/CanvasShell.operationalDrawer.test.tsx',
      'pnpm --filter @dvt/web typecheck',
      'pnpm --filter @dvt/web lint',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ) as completion_gate,
    jsonb_build_array(
      jsonb_build_object(
        'id', 'topbar-compact-run-status',
        'redTest', 'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/TopAppBar.test.tsx',
        'expectedFailure', 'ShellTopBar does not render a compact run status indicator from the operational drawer contribution.',
        'patchSurfaces', jsonb_build_array(
          'apps/web/src/app/components/shell/ShellRunStatusIndicator.tsx',
          'apps/web/src/app/components/TopAppBar.tsx',
          'apps/web/src/app/components/TopAppBar.test.tsx'
        ),
        'greenTest', 'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/TopAppBar.test.tsx'
      )
    ) as cycles,
    jsonb_build_array(
      jsonb_build_object(
        'name', 'ShellRunStatusIndicator',
        'path', 'apps/web/src/app/components/shell/ShellRunStatusIndicator.tsx',
        'dddOwner', 'web.component.shell.BottomOperationalDrawer',
        'cqRails', jsonb_build_array('RenderBottomOperationalDrawer'),
        'fowlerSignals', jsonb_build_array('presentation_logic_separation', 'contextual_status_summary'),
        'architectureGuard', 'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/TopAppBar.test.tsx',
        'cypressCoverage', 'not_applicable:topbar_compact_status_component',
        'unitTests', jsonb_build_array('pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/TopAppBar.test.tsx')
      ),
      jsonb_build_object(
        'name', 'ShellRunStatusIndicatorProps',
        'path', 'apps/web/src/app/components/shell/ShellRunStatusIndicator.tsx',
        'dddOwner', 'web.component.shell.BottomOperationalDrawer',
        'cqRails', jsonb_build_array('RenderBottomOperationalDrawer'),
        'fowlerSignals', jsonb_build_array('explicit_presentation_contract'),
        'architectureGuard', 'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/TopAppBar.test.tsx',
        'cypressCoverage', 'not_applicable:component_props_type',
        'unitTests', jsonb_build_array('pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/TopAppBar.test.tsx')
      ),
      jsonb_build_object(
        'name', 'resolveRunStatusLabel',
        'path', 'apps/web/src/app/components/shell/ShellRunStatusIndicator.tsx',
        'dddOwner', 'web.component.shell.BottomOperationalDrawer',
        'cqRails', jsonb_build_array('RenderBottomOperationalDrawer'),
        'fowlerSignals', jsonb_build_array('published_language'),
        'architectureGuard', 'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/TopAppBar.test.tsx',
        'cypressCoverage', 'not_applicable:presentation_label_resolver',
        'unitTests', jsonb_build_array('pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/TopAppBar.test.tsx')
      ),
      jsonb_build_object(
        'name', 'resolveStatusClassName',
        'path', 'apps/web/src/app/components/shell/ShellRunStatusIndicator.tsx',
        'dddOwner', 'web.component.shell.BottomOperationalDrawer',
        'cqRails', jsonb_build_array('RenderBottomOperationalDrawer'),
        'fowlerSignals', jsonb_build_array('presentation_logic_separation'),
        'architectureGuard', 'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/TopAppBar.test.tsx',
        'cypressCoverage', 'not_applicable:presentation_class_resolver',
        'unitTests', jsonb_build_array('pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/TopAppBar.test.tsx')
      ),
      jsonb_build_object(
        'name', 'shellRunStatusClasses',
        'path', 'apps/web/src/app/components/shell/ShellRunStatusIndicator.tsx',
        'dddOwner', 'web.component.shell.BottomOperationalDrawer',
        'cqRails', jsonb_build_array('RenderBottomOperationalDrawer'),
        'fowlerSignals', jsonb_build_array('presentation_token_boundary'),
        'architectureGuard', 'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/TopAppBar.test.tsx',
        'cypressCoverage', 'not_applicable:presentation_tokens',
        'unitTests', jsonb_build_array('pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/TopAppBar.test.tsx')
      )
    ) as symbols
),
merged_symbol_refs as (
  select
    target_rails.rail_id,
    coalesce(jsonb_agg(ref order by ref), '[]'::jsonb) as value
  from target_rails
  cross join patch
  cross join lateral (
    select distinct value as ref
    from jsonb_array_elements_text(coalesce(target_rails.symbol_refs, '[]'::jsonb) || patch.symbol_refs)
  ) refs
  group by target_rails.rail_id
),
merged_implementation_refs as (
  select
    target_rails.rail_id,
    coalesce(jsonb_agg(ref order by ref), '[]'::jsonb) as value
  from target_rails
  cross join patch
  cross join lateral (
    select distinct value as ref
    from jsonb_array_elements_text(coalesce(target_rails.implementation_refs, '[]'::jsonb) || patch.allowed_surfaces)
  ) refs
  group by target_rails.rail_id
),
merged_allowed_surfaces as (
  select
    target_rails.rail_id,
    coalesce(jsonb_agg(ref order by ref), '[]'::jsonb) as value
  from target_rails
  cross join patch
  cross join lateral (
    select distinct value as ref
    from jsonb_array_elements_text(
      coalesce(target_rails.allowed_implementation_surfaces, '[]'::jsonb) || patch.allowed_surfaces
    )
  ) refs
  group by target_rails.rail_id
),
merged_guards as (
  select
    target_rails.rail_id,
    coalesce(jsonb_agg(ref order by ref), '[]'::jsonb) as value
  from target_rails
  cross join patch
  cross join lateral (
    select distinct value as ref
    from jsonb_array_elements_text(coalesce(target_rails.architecture_guards, '[]'::jsonb) || patch.guards)
  ) refs
  group by target_rails.rail_id
),
merged_completion_gate as (
  select
    target_rails.rail_id,
    coalesce(jsonb_agg(ref order by ref), '[]'::jsonb) as value
  from target_rails
  cross join patch
  cross join lateral (
    select distinct value as ref
    from jsonb_array_elements_text(coalesce(target_rails.completion_gate, '[]'::jsonb) || patch.completion_gate)
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
  source_path = 'tools/planning-db/migrations/335_canvas_topbar_run_status_indicator_manifest.sql',
  source_content_sha256 = md5('CANVAS-TOPBAR-RUN-STATUS-INDICATOR-20260627:335'),
  revision = rail.revision + 1,
  updated_at = now()
from merged_symbol_refs
join merged_implementation_refs on merged_implementation_refs.rail_id = merged_symbol_refs.rail_id
join merged_allowed_surfaces on merged_allowed_surfaces.rail_id = merged_symbol_refs.rail_id
join merged_guards on merged_guards.rail_id = merged_symbol_refs.rail_id
join merged_completion_gate on merged_completion_gate.rail_id = merged_symbol_refs.rail_id
join merged_cycles on merged_cycles.rail_id = merged_symbol_refs.rail_id
join merged_symbols on merged_symbols.rail_id = merged_symbol_refs.rail_id
where rail.rail_id = merged_symbol_refs.rail_id;
