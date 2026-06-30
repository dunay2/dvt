-- Reconcile post-merge component drift.
-- The Canvas output target template catalog was already retired by the
-- Canvas context-menu slice, so the later component record is deprecated
-- instead of kept as a phantom active component. The bottom operational
-- drawer rails now point at the landed implementation files; the old console
-- drawer paths stay explicit deprecated/forbidden surfaces.

insert into architecture.design (
  design_id,
  work_item_id,
  title,
  owner,
  status,
  rationale,
  fowler_signal,
  rail_ref,
  approved_at,
  supersedes_id
)
values (
  'PLANNING-DB-CANVAS-OUTPUT-TARGET-DEPRECATION-20260618',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Planning DB Canvas output target template deprecation',
  'Frontend / Canvas / Planning DB',
  'review',
  'Canvas output target template catalog files were retired by the Canvas context-menu slice before the component map was merged. Keeping SYS-WEB-CANVAS-OUTPUT-TARGET-TEMPLATES active creates a phantom component and duplicates SYS-WEB-CANVAS-LEGACY-ADD-NODE-PALETTE-RETIREMENT.',
  'boundary_drift',
  'RetireCanvasFixedAddNodePalette;ReadComponentProfile;CheckPlanningDbComponentIntegrity;DetectGovernedSourceDrift',
  null,
  'PLANNING-DB-WEB-CANVAS-OUTPUT-TARGET-TEMPLATES-20260618'
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  supersedes_id = excluded.supersedes_id,
  updated_at = now();

update architecture.design
set
  status = 'superseded',
  updated_at = now()
where design_id = 'PLANNING-DB-WEB-CANVAS-OUTPUT-TARGET-TEMPLATES-20260618';

insert into architecture.design_scope (
  design_id,
  subject_kind,
  subject_id,
  scope_kind,
  required
)
values
  (
    'PLANNING-DB-CANVAS-OUTPUT-TARGET-DEPRECATION-20260618',
    'component',
    'SYS-WEB-CANVAS-OUTPUT-TARGET-TEMPLATES',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-CANVAS-OUTPUT-TARGET-DEPRECATION-20260618',
    'component',
    'SYS-WEB-CANVAS-LEGACY-ADD-NODE-PALETTE-RETIREMENT',
    'may_reference',
    true
  ),
  (
    'PLANNING-DB-CANVAS-OUTPUT-TARGET-DEPRECATION-20260618',
    'path',
    'apps/web/src/app/views/canvas/canvasOutputTargetTemplateCatalog.ts',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-CANVAS-OUTPUT-TARGET-DEPRECATION-20260618',
    'path',
    'apps/web/src/app/components/shell/bottomConsoleDrawerModel.ts',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-CANVAS-OUTPUT-TARGET-DEPRECATION-20260618',
    'query',
    'BuildBottomOperationalDrawerLogModel',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-CANVAS-OUTPUT-TARGET-DEPRECATION-20260618',
    'query',
    'RenderBottomOperationalDrawer',
    'may_update',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update planning_query_store.governance_component_local_definitions
set
  source_path = 'tools/planning-db/migrations/170_deprecate_canvas_output_target_and_repoint_drawer_rails.sql',
  source_content_sha256 = md5('SYS-WEB-CANVAS-OUTPUT-TARGET-TEMPLATES:170')
    || md5('deprecated duplicate canvas output target templates:170'),
  revision = revision + 1,
  name = 'Canvas output target templates deprecated duplicate',
  status = 'legacy',
  owned_concern = 'Deprecated duplicate for the removed Canvas output target template catalog. Active node insertion and sink metadata are owned by Canvas context-menu and authoring node rails.',
  ddd_owner = 'CanvasLegacyAddNodePaletteRetirement',
  cq_rails = 'RetireCanvasFixedAddNodePalette;ReadComponentProfile;CheckPlanningDbComponentIntegrity'
where component_id = 'SYS-WEB-CANVAS-OUTPUT-TARGET-TEMPLATES';

update planning_query_store.governance_component_local_ownership_patterns
set
  pattern = 'tools/planning-db/migrations/170_deprecate_canvas_output_target_and_repoint_drawer_rails.sql',
  pattern_order = 0
where component_id = 'SYS-WEB-CANVAS-OUTPUT-TARGET-TEMPLATES'
  and pattern_kind = 'owns'
  and pattern = 'apps/web/src/app/views/canvas/canvasOutputTargetTemplateCatalog*';

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
select
  'SYS-WEB-CANVAS-OUTPUT-TARGET-TEMPLATES',
  'owns',
  'tools/planning-db/migrations/170_deprecate_canvas_output_target_and_repoint_drawer_rails.sql',
  0
where not exists (
  select 1
  from planning_query_store.governance_component_local_ownership_patterns existing_pattern
  where existing_pattern.component_id = 'SYS-WEB-CANVAS-OUTPUT-TARGET-TEMPLATES'
    and existing_pattern.pattern_kind = 'owns'
    and existing_pattern.pattern = 'tools/planning-db/migrations/170_deprecate_canvas_output_target_and_repoint_drawer_rails.sql'
);

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  (
    'SYS-WEB-CANVAS-OUTPUT-TARGET-TEMPLATES',
    'non_goal',
    'Do not recreate retired catalog path apps/web/src/app/views/canvas/canvasOutputTargetTemplateCatalog.ts.',
    0
  ),
  (
    'SYS-WEB-CANVAS-OUTPUT-TARGET-TEMPLATES',
    'transition',
    'output-target-template-catalog component -> SYS-WEB-CANVAS-LEGACY-ADD-NODE-PALETTE-RETIREMENT after Canvas context-menu retirement.',
    1
  ),
  (
    'SYS-WEB-CANVAS-OUTPUT-TARGET-TEMPLATES',
    'governance_ref',
    'tools/planning-db/migrations/147_web_canvas_legacy_add_node_palette_retirement.sql',
    2
  ),
  (
    'SYS-WEB-CANVAS-OUTPUT-TARGET-TEMPLATES',
    'governance_ref',
    'tools/planning-db/migrations/149_web_canvas_legacy_palette_deprecated_paths.sql',
    3
  ),
  (
    'SYS-WEB-CANVAS-OUTPUT-TARGET-TEMPLATES',
    'fowler_signal',
    'duplicate_semantics',
    1
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update architecture.component
set
  name = 'Canvas output target templates deprecated duplicate',
  public_contract = 'Deprecated duplicate of the removed Canvas output target template catalog; active sink authoring metadata is governed by Canvas authoring node creation and the legacy palette retirement evidence component.',
  status = 'deprecated',
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-OUTPUT-TARGET-TEMPLATES';

update architecture.component_responsibility
set
  responsibility = 'Keep the retired Canvas output target template catalog visible as deprecated duplicate evidence.',
  reason_to_change = 'Only changes when the legacy Canvas palette retirement record or output-target deprecation evidence changes.',
  ddd_owner = 'CanvasLegacyAddNodePaletteRetirement',
  status = 'implemented'
where responsibility_id = 'RESP-SYS-WEB-CANVAS-OUTPUT-TARGET-TEMPLATES';

update architecture.component_test
set
  test_path = 'apps/web/src/app/views/canvas/useCanvasGraphHandlers.catalogCreate.test.tsx',
  test_kind = 'unit',
  coverage_level = 'behavior',
  required = false,
  validation_command = 'pnpm --filter @dvt/web test:unit:run -- src/app/views/canvas/useCanvasGraphHandlers.catalogCreate.test.tsx src/app/views/canvas/canvasAuthoringNodeCommand.test.ts'
where test_id = 'TEST-WEB-CANVAS-OUTPUT-TARGET-TEMPLATES';

update architecture.component_observability
set
  signal_name = 'Deprecated duplicate component; no component-level browser telemetry is required after Canvas output target template catalog retirement.',
  required = false,
  status = 'not_applicable'
where observability_id = 'OBS-SYS-WEB-CANVAS-OUTPUT-TARGET-TEMPLATES-COMPONENT-TELEMETRY';

with rail_mapping (
  rail_name,
  new_source_path,
  deprecated_source_paths,
  symbol_refs,
  implementation_refs,
  allowed_current_paths,
  forbidden_paths,
  completion_gate,
  red_green_cycles,
  replacement_symbols
) as (
  values
    (
      'BuildBottomOperationalDrawerLogModel',
      'apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.ts',
      array[
        'apps/web/src/app/components/shell/bottomConsoleDrawerModel.ts',
        'apps/web/src/app/components/shell/bottomConsoleDrawerModel.test.ts',
        'apps/web/src/app/components/Console.tsx',
        'apps/web/src/app/components/Console.test.tsx'
      ]::text[],
      jsonb_build_array(
        'apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.ts#BottomOperationalDrawerLogModel',
        'apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.ts#BottomOperationalDrawerLogModelBase',
        'apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.ts#BuildBottomOperationalDrawerLogModelInput',
        'apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.ts#buildBottomOperationalDrawerLogModel'
      ),
      jsonb_build_array(
        'apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.ts#BottomOperationalDrawerLogModel',
        'apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.ts#BottomOperationalDrawerLogModelBase',
        'apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.ts#BuildBottomOperationalDrawerLogModelInput',
        'apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.ts#buildBottomOperationalDrawerLogModel',
        'apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.test.ts'
      ),
      jsonb_build_array(
        'apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.ts',
        'apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.test.ts'
      ),
      jsonb_build_array(
        'apps/web/src/app/components/shell/bottomConsoleDrawerModel.ts',
        'apps/web/src/app/components/shell/bottomConsoleDrawerModel.test.ts',
        'apps/web/src/app/components/Console.tsx',
        'apps/web/src/app/components/Console.test.tsx'
      ),
      jsonb_build_array(
        'pnpm --filter @dvt/web test:unit:run -- src/app/components/shell/bottomOperationalDrawerLogModel.test.ts src/app/stores/uiLayoutStore.test.ts',
        'pnpm --filter @dvt/web test:presentation:run -- src/app/components/shell/BottomOperationalDrawer.test.tsx src/app/components/shell/OperationalDrawerPanels.test.tsx src/app/components/shell/AppShellFrame.test.tsx src/app/Root.shellChrome.test.tsx src/app/views/canvas/useCanvasExecutionActions.runStartSuccess.test.tsx',
        'pnpm --filter @dvt/web test:architecture:run -- src/app/components/shell/OperationalDrawerPanels.architecture.test.ts src/app/views/runs/runsDomainBoundary.architecture.test.ts',
        'pnpm governance:refresh',
        'pnpm docs:feature-mechanization:implementation',
        'pnpm verify:prepush'
      ),
      jsonb_build_array(
        jsonb_build_object(
          'id', 'buildbottomoperationaldrawerlogmodel-current-source-repoint',
          'redTest', 'pnpm planning:db:query source-drift --no-refresh --limit 20',
          'greenTest', 'pnpm planning:db:integrity:check',
          'patchSurfaces', jsonb_build_array(
            'apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.ts',
            'apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.test.ts',
            'tools/planning-db/migrations/170_deprecate_canvas_output_target_and_repoint_drawer_rails.sql'
          ),
          'expectedFailure', 'The Planning DB reports bottomConsoleDrawerModel.ts as an active source after the file was retired.'
        )
      ),
      jsonb_build_array(
        jsonb_build_object(
          'name', 'BottomOperationalDrawerLogModel',
          'path', 'apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.ts',
          'cqRails', jsonb_build_array('BuildBottomOperationalDrawerLogModel'),
          'dddOwner', 'web.shell.BottomOperationalDrawer',
          'unitTests', jsonb_build_array('pnpm --filter @dvt/web test:unit:run -- src/app/components/shell/bottomOperationalDrawerLogModel.test.ts'),
          'fowlerSignals', jsonb_build_array('published_language'),
          'architectureGuard', 'pnpm --filter @dvt/web test:architecture:run -- src/app/components/shell/OperationalDrawerPanels.architecture.test.ts',
          'cypressCoverage', 'N/A - drawer log model is covered by unit and architecture tests.'
        ),
        jsonb_build_object(
          'name', 'BottomOperationalDrawerLogModelBase',
          'path', 'apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.ts',
          'cqRails', jsonb_build_array('BuildBottomOperationalDrawerLogModel'),
          'dddOwner', 'web.shell.BottomOperationalDrawer',
          'unitTests', jsonb_build_array('pnpm --filter @dvt/web test:unit:run -- src/app/components/shell/bottomOperationalDrawerLogModel.test.ts'),
          'fowlerSignals', jsonb_build_array('published_language'),
          'architectureGuard', 'pnpm --filter @dvt/web test:architecture:run -- src/app/components/shell/OperationalDrawerPanels.architecture.test.ts',
          'cypressCoverage', 'N/A - drawer log model type is covered by unit and architecture tests.'
        ),
        jsonb_build_object(
          'name', 'BuildBottomOperationalDrawerLogModelInput',
          'path', 'apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.ts',
          'cqRails', jsonb_build_array('BuildBottomOperationalDrawerLogModel'),
          'dddOwner', 'web.shell.BottomOperationalDrawer',
          'unitTests', jsonb_build_array('pnpm --filter @dvt/web test:unit:run -- src/app/components/shell/bottomOperationalDrawerLogModel.test.ts'),
          'fowlerSignals', jsonb_build_array('published_language'),
          'architectureGuard', 'pnpm --filter @dvt/web test:architecture:run -- src/app/components/shell/OperationalDrawerPanels.architecture.test.ts',
          'cypressCoverage', 'N/A - drawer log model input is covered by unit and architecture tests.'
        ),
        jsonb_build_object(
          'name', 'buildBottomOperationalDrawerLogModel',
          'path', 'apps/web/src/app/components/shell/bottomOperationalDrawerLogModel.ts',
          'cqRails', jsonb_build_array('BuildBottomOperationalDrawerLogModel'),
          'dddOwner', 'web.shell.BottomOperationalDrawer',
          'unitTests', jsonb_build_array('pnpm --filter @dvt/web test:unit:run -- src/app/components/shell/bottomOperationalDrawerLogModel.test.ts'),
          'fowlerSignals', jsonb_build_array('published_language'),
          'architectureGuard', 'pnpm --filter @dvt/web test:architecture:run -- src/app/components/shell/OperationalDrawerPanels.architecture.test.ts',
          'cypressCoverage', 'N/A - drawer log model builder is covered by unit and architecture tests.'
        )
      )
    ),
    (
      'RenderBottomOperationalDrawer',
      'apps/web/src/app/components/shell/BottomOperationalDrawer.tsx',
      array[
        'apps/web/src/app/components/shell/bottomConsoleDrawerModel.ts',
        'apps/web/src/app/components/shell/bottomConsoleDrawerModel.test.ts',
        'apps/web/src/app/components/Console.tsx',
        'apps/web/src/app/components/Console.test.tsx'
      ]::text[],
      jsonb_build_array(
        'apps/web/src/app/components/shell/BottomOperationalDrawer.tsx#BottomOperationalDrawer',
        'apps/web/src/app/components/shell/BottomOperationalDrawer.tsx#BottomOperationalLogBody',
        'apps/web/src/app/components/shell/OperationalDrawerPanels.tsx#BottomOperationalProblemsPanel',
        'apps/web/src/app/components/shell/OperationalDrawerPanels.tsx#BottomOperationalRunsPanel',
        'apps/web/src/app/components/shell/OperationalDrawerPanels.tsx#BottomOperationalPreviewPanel',
        'apps/web/src/app/components/shell/OperationalDrawerPanels.tsx#BottomOperationalDrawerTabs',
        'apps/web/src/app/components/shell/OperationalDrawerPanels.tsx#BottomOperationalDrawerBody'
      ),
      jsonb_build_array(
        'apps/web/src/app/components/shell/BottomOperationalDrawer.tsx#BottomOperationalDrawer',
        'apps/web/src/app/components/shell/BottomOperationalDrawer.test.tsx',
        'apps/web/src/app/components/shell/OperationalDrawerPanels.tsx#BottomOperationalProblemsPanel',
        'apps/web/src/app/components/shell/OperationalDrawerPanels.tsx#BottomOperationalRunsPanel',
        'apps/web/src/app/components/shell/OperationalDrawerPanels.tsx#BottomOperationalPreviewPanel',
        'apps/web/src/app/components/shell/OperationalDrawerPanels.tsx#BottomOperationalDrawerTabs',
        'apps/web/src/app/components/shell/OperationalDrawerPanels.tsx#BottomOperationalDrawerBody',
        'apps/web/src/app/components/shell/OperationalDrawerPanels.test.tsx'
      ),
      jsonb_build_array(
        'apps/web/src/app/components/shell/BottomOperationalDrawer.tsx',
        'apps/web/src/app/components/shell/BottomOperationalDrawer.test.tsx',
        'apps/web/src/app/components/shell/OperationalDrawerPanels.tsx',
        'apps/web/src/app/components/shell/OperationalDrawerPanels.test.tsx'
      ),
      jsonb_build_array(
        'apps/web/src/app/components/shell/bottomConsoleDrawerModel.ts',
        'apps/web/src/app/components/shell/bottomConsoleDrawerModel.test.ts',
        'apps/web/src/app/components/Console.tsx',
        'apps/web/src/app/components/Console.test.tsx'
      ),
      jsonb_build_array(
        'pnpm --filter @dvt/web test:presentation:run -- src/app/components/shell/BottomOperationalDrawer.test.tsx src/app/components/shell/OperationalDrawerPanels.test.tsx src/app/components/shell/AppShellFrame.test.tsx src/app/Root.shellChrome.test.tsx src/app/views/canvas/useCanvasExecutionActions.runStartSuccess.test.tsx',
        'pnpm --filter @dvt/web test:architecture:run -- src/app/components/shell/OperationalDrawerPanels.architecture.test.ts src/app/views/runs/runsDomainBoundary.architecture.test.ts',
        'pnpm governance:refresh',
        'pnpm docs:feature-mechanization:implementation',
        'pnpm verify:prepush'
      ),
      jsonb_build_array(
        jsonb_build_object(
          'id', 'renderbottomoperationaldrawer-current-source-repoint',
          'redTest', 'pnpm planning:db:query source-drift --no-refresh --limit 20',
          'greenTest', 'pnpm planning:db:integrity:check',
          'patchSurfaces', jsonb_build_array(
            'apps/web/src/app/components/shell/BottomOperationalDrawer.tsx',
            'apps/web/src/app/components/shell/BottomOperationalDrawer.test.tsx',
            'apps/web/src/app/components/shell/OperationalDrawerPanels.tsx',
            'apps/web/src/app/components/shell/OperationalDrawerPanels.test.tsx',
            'tools/planning-db/migrations/170_deprecate_canvas_output_target_and_repoint_drawer_rails.sql'
          ),
          'expectedFailure', 'The Planning DB points RenderBottomOperationalDrawer at panel internals instead of the landed drawer component.'
        )
      ),
      jsonb_build_array(
        jsonb_build_object(
          'name', 'BottomOperationalDrawer',
          'path', 'apps/web/src/app/components/shell/BottomOperationalDrawer.tsx',
          'cqRails', jsonb_build_array('RenderBottomOperationalDrawer'),
          'dddOwner', 'web.shell.BottomOperationalDrawer',
          'unitTests', jsonb_build_array('pnpm --filter @dvt/web test:presentation:run -- src/app/components/shell/BottomOperationalDrawer.test.tsx'),
          'fowlerSignals', jsonb_build_array('published_language'),
          'architectureGuard', 'pnpm --filter @dvt/web test:architecture:run -- src/app/components/shell/OperationalDrawerPanels.architecture.test.ts',
          'cypressCoverage', 'apps/web/cypress/e2e/shell/shell-layout-contract.cy.ts'
        ),
        jsonb_build_object(
          'name', 'BottomOperationalDrawerTabs',
          'path', 'apps/web/src/app/components/shell/OperationalDrawerPanels.tsx',
          'cqRails', jsonb_build_array('RenderBottomOperationalDrawer'),
          'dddOwner', 'web.shell.BottomOperationalDrawer',
          'unitTests', jsonb_build_array('pnpm --filter @dvt/web test:presentation:run -- src/app/components/shell/OperationalDrawerPanels.test.tsx'),
          'fowlerSignals', jsonb_build_array('published_language'),
          'architectureGuard', 'pnpm --filter @dvt/web test:architecture:run -- src/app/components/shell/OperationalDrawerPanels.architecture.test.ts',
          'cypressCoverage', 'apps/web/cypress/e2e/shell/shell-layout-contract.cy.ts'
        ),
        jsonb_build_object(
          'name', 'BottomOperationalDrawerBody',
          'path', 'apps/web/src/app/components/shell/OperationalDrawerPanels.tsx',
          'cqRails', jsonb_build_array('RenderBottomOperationalDrawer'),
          'dddOwner', 'web.shell.BottomOperationalDrawer',
          'unitTests', jsonb_build_array('pnpm --filter @dvt/web test:presentation:run -- src/app/components/shell/OperationalDrawerPanels.test.tsx'),
          'fowlerSignals', jsonb_build_array('published_language'),
          'architectureGuard', 'pnpm --filter @dvt/web test:architecture:run -- src/app/components/shell/OperationalDrawerPanels.architecture.test.ts',
          'cypressCoverage', 'apps/web/cypress/e2e/shell/shell-layout-contract.cy.ts'
        ),
        jsonb_build_object(
          'name', 'BottomOperationalProblemsPanel',
          'path', 'apps/web/src/app/components/shell/OperationalDrawerPanels.tsx',
          'cqRails', jsonb_build_array('RenderBottomOperationalDrawer'),
          'dddOwner', 'web.shell.BottomOperationalDrawer',
          'unitTests', jsonb_build_array('pnpm --filter @dvt/web test:presentation:run -- src/app/components/shell/OperationalDrawerPanels.test.tsx'),
          'fowlerSignals', jsonb_build_array('published_language'),
          'architectureGuard', 'pnpm --filter @dvt/web test:architecture:run -- src/app/components/shell/OperationalDrawerPanels.architecture.test.ts',
          'cypressCoverage', 'apps/web/cypress/e2e/shell/shell-layout-contract.cy.ts'
        ),
        jsonb_build_object(
          'name', 'BottomOperationalRunsPanel',
          'path', 'apps/web/src/app/components/shell/OperationalDrawerPanels.tsx',
          'cqRails', jsonb_build_array('RenderBottomOperationalDrawer'),
          'dddOwner', 'web.shell.BottomOperationalDrawer',
          'unitTests', jsonb_build_array('pnpm --filter @dvt/web test:presentation:run -- src/app/components/shell/OperationalDrawerPanels.test.tsx'),
          'fowlerSignals', jsonb_build_array('published_language'),
          'architectureGuard', 'pnpm --filter @dvt/web test:architecture:run -- src/app/components/shell/OperationalDrawerPanels.architecture.test.ts',
          'cypressCoverage', 'apps/web/cypress/e2e/shell/shell-layout-contract.cy.ts'
        ),
        jsonb_build_object(
          'name', 'BottomOperationalPreviewPanel',
          'path', 'apps/web/src/app/components/shell/OperationalDrawerPanels.tsx',
          'cqRails', jsonb_build_array('RenderBottomOperationalDrawer'),
          'dddOwner', 'web.shell.BottomOperationalDrawer',
          'unitTests', jsonb_build_array('pnpm --filter @dvt/web test:presentation:run -- src/app/components/shell/OperationalDrawerPanels.test.tsx'),
          'fowlerSignals', jsonb_build_array('published_language'),
          'architectureGuard', 'pnpm --filter @dvt/web test:architecture:run -- src/app/components/shell/OperationalDrawerPanels.architecture.test.ts',
          'cypressCoverage', 'apps/web/cypress/e2e/shell/shell-layout-contract.cy.ts'
        )
      )
    )
),
patched_rails as (
  select
    rail.rail_id,
    mapping.new_source_path,
    mapping.deprecated_source_paths,
    mapping.symbol_refs,
    mapping.implementation_refs,
    mapping.allowed_current_paths,
    mapping.forbidden_paths,
    mapping.completion_gate,
    mapping.red_green_cycles,
    mapping.replacement_symbols,
    coalesce(
      (
        select file_ref.content_hash
        from planning_query_store.governance_files file_ref
        where file_ref.path = mapping.new_source_path
        limit 1
      ),
      rail.source_content_sha256
    ) as source_content_sha256
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
    'sourcePathReconciledBy', '170_deprecate_canvas_output_target_and_repoint_drawer_rails',
    'deprecationPolicy', 'Retired bottomConsoleDrawerModel and Console files are forbidden implementation surfaces; landed BottomOperationalDrawer files are active sources.'
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
    'allowedImplementationSurfaces', patched.allowed_current_paths,
    'forbiddenImplementationSurfaces', patched.forbidden_paths,
    'completionGate', patched.completion_gate,
    'redGreenCycles', patched.red_green_cycles,
    'deprecatedSourcePaths', to_jsonb(patched.deprecated_source_paths),
    'currentImplementationSourcePath', patched.new_source_path,
    'sourcePathReconciledBy', '170_deprecate_canvas_output_target_and_repoint_drawer_rails',
    'deprecationPolicy', 'Retired bottomConsoleDrawerModel and Console files are forbidden implementation surfaces; landed BottomOperationalDrawer files are active sources.'
  ),
  revision = rail.revision + 1,
  updated_at = now()
from patched_rails patched
where rail.rail_id = patched.rail_id;
