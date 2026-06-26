-- Register the product-facing Execution Preview copy/readiness surface.
-- UX-011 retires ambiguous "Plan" actions from visible Canvas preview/run
-- flows without changing planner/runtime contract vocabulary such as planRef.

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
  'local#E-CANVAS-EXECUTION-PREVIEW-READINESS-1#command#previewexecutionplan#copy-readiness',
  'E-CANVAS-EXECUTION-PREVIEW-READINESS-1',
  'implemented',
  'PreviewExecutionPlan',
  'previewexecutionplan',
  'command',
  'Canvas execution preview/readiness presentation',
  'implemented',
  jsonb_build_array(
    'apps/web/src/app/components/Modals.tsx#PlanPreviewModal',
    'apps/web/src/app/components/Modals.tsx#RePlanRequiredModal',
    'apps/web/src/app/services/api/protectedRuntimeRejection.ts#normalizeProtectedRuntimeRejection'
  ),
  jsonb_build_array(
    'apps/web/src/app/components/Modals.tsx',
    'apps/web/src/app/services/api/protectedRuntimeRejection.ts',
    'tools/planning-db/migrations/324_canvas_execution_preview_copy_surface.sql'
  ),
  jsonb_build_array(
    'buzon/TAREA.TXT',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md'
  ),
  jsonb_build_array(
    'AGENTS.md',
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/guides/ai-work-protocol.md',
    'docs/planning/state/planning-control-tower.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md',
    'buzon/TAREA.TXT'
  ),
  jsonb_build_array(
    'apps/web/src/app/components/Modals.tsx',
    'apps/web/src/app/components/Modals.test.tsx',
    'apps/web/src/app/services/api/protectedRuntimeRejection.ts',
    'apps/web/src/app/services/api/protectedRuntimeRejection.test.ts',
    'apps/web/src/app/services/plans/plansService.test.ts',
    'apps/web/src/app/views/canvas/canvasExecutionCopy.test.ts',
    'tools/planning-db/migrations/324_canvas_execution_preview_copy_surface.sql'
  ),
  jsonb_build_array(
    'pnpm --filter @dvt/web exec vitest run src/app/services/api/protectedRuntimeRejection.test.ts src/app/components/Modals.test.tsx src/app/services/plans/plansService.test.ts src/app/views/canvas/canvasExecutionCopy.test.ts',
    'pnpm docs:feature-mechanization:implementation'
  ),
  jsonb_build_array(
    'pnpm planning:db:migrate',
    'pnpm --filter @dvt/web exec vitest run src/app/services/api/protectedRuntimeRejection.test.ts src/app/components/Modals.test.tsx src/app/services/plans/plansService.test.ts src/app/views/canvas/canvasExecutionCopy.test.ts',
    'pnpm docs:feature-mechanization:implementation',
    'pnpm verify:prepush'
  ),
  'tools/planning-db/migrations/324_canvas_execution_preview_copy_surface.sql',
  md5('E-CANVAS-EXECUTION-PREVIEW-READINESS-1:PreviewExecutionPlan:324')
    || md5('canvas-execution-preview-copy-surface'),
  jsonb_build_object(
    'name', 'PreviewExecutionPlan',
    'type', 'command',
    'dddOwner', 'Canvas execution preview/readiness presentation',
    'status', 'implemented'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'E-CANVAS-EXECUTION-PREVIEW-READINESS-1',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan',
    'Retire ambiguous user-visible Plan/re-plan copy from Canvas preview and protected-runtime rejection flows while preserving canonical planRef/runtime domain names.',
    'componentGuides',
    jsonb_build_array(
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md',
      'buzon/TAREA.TXT'
    ),
    'userStories',
    jsonb_build_array(
      jsonb_build_object(
        'role', 'Canvas operator',
        'need', 'See the action as Execution Preview instead of an ambiguous Plan command.',
        'acceptance',
        'Preview/run stale-state and protected runtime rejection copy says preview execution plan again, not re-run Plan.'
      )
    ),
    'governingSources',
    jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/guides/ai-work-protocol.md',
      'docs/planning/state/planning-control-tower.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md',
      'buzon/TAREA.TXT'
    ),
    'allowedImplementationSurfaces',
    jsonb_build_array(
      'apps/web/src/app/components/Modals.tsx',
      'apps/web/src/app/components/Modals.test.tsx',
      'apps/web/src/app/services/api/protectedRuntimeRejection.ts',
      'apps/web/src/app/services/api/protectedRuntimeRejection.test.ts',
      'apps/web/src/app/services/plans/plansService.test.ts',
      'apps/web/src/app/views/canvas/canvasExecutionCopy.test.ts',
      'tools/planning-db/migrations/324_canvas_execution_preview_copy_surface.sql'
    ),
    'forbiddenImplementationSurfaces',
    jsonb_build_array(
      'packages/@dvt/contracts/**',
      'packages/@dvt/engine/**',
      'packages/@dvt/adapter-*/**'
    ),
    'domainObjects',
    jsonb_build_array(
      'CanvasExecutionPreviewReadinessCopy',
      'ProtectedRuntimeRejectionPresentation'
    ),
    'fowlerSignals',
    jsonb_build_array(
      'duplicate_semantics',
      'legacy_alias',
      'ambiguous_language'
    ),
    'architectureGuards',
    jsonb_build_array(
      'pnpm --filter @dvt/web exec vitest run src/app/services/api/protectedRuntimeRejection.test.ts src/app/components/Modals.test.tsx src/app/services/plans/plansService.test.ts src/app/views/canvas/canvasExecutionCopy.test.ts',
      'pnpm docs:feature-mechanization:implementation'
    ),
    'cypressFlows',
    jsonb_build_array('not_applicable:copy_surface_only'),
    'completionGate',
    jsonb_build_array(
      'pnpm planning:db:migrate',
      'pnpm --filter @dvt/web exec vitest run src/app/services/api/protectedRuntimeRejection.test.ts src/app/components/Modals.test.tsx src/app/services/plans/plansService.test.ts src/app/views/canvas/canvasExecutionCopy.test.ts',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ),
    'commandQueryRails',
    jsonb_build_array(
      jsonb_build_object(
        'name', 'PreviewExecutionPlan',
        'type', 'command',
        'dddOwner', 'Canvas execution preview/readiness presentation',
        'status', 'implemented'
      )
    ),
    'redGreenCycles',
    jsonb_build_array(
      jsonb_build_object(
        'id', 'protected-runtime-rejection-copy',
        'redTest',
        'pnpm --filter @dvt/web exec vitest run src/app/services/api/protectedRuntimeRejection.test.ts',
        'expectedFailure',
        'Protected runtime rejection messages still told operators to re-run Plan.',
        'patchSurfaces',
        jsonb_build_array(
          'apps/web/src/app/services/api/protectedRuntimeRejection.ts',
          'apps/web/src/app/services/api/protectedRuntimeRejection.test.ts',
          'apps/web/src/app/services/plans/plansService.test.ts'
        ),
        'greenTest',
        'pnpm --filter @dvt/web exec vitest run src/app/services/api/protectedRuntimeRejection.test.ts src/app/services/plans/plansService.test.ts'
      ),
      jsonb_build_object(
        'id', 'modal-execution-preview-copy',
        'redTest',
        'pnpm --filter @dvt/web exec vitest run src/app/components/Modals.test.tsx',
        'expectedFailure',
        'The stale-preview modal still rendered Re-Plan/Create New Plan copy.',
        'patchSurfaces',
        jsonb_build_array(
          'apps/web/src/app/components/Modals.tsx',
          'apps/web/src/app/components/Modals.test.tsx'
        ),
        'greenTest',
        'pnpm --filter @dvt/web exec vitest run src/app/components/Modals.test.tsx'
      )
    ),
    'symbols',
    jsonb_build_array(
      jsonb_build_object(
        'name', 'PlanPreviewModal',
        'path', 'apps/web/src/app/components/Modals.tsx',
        'dddOwner', 'Canvas execution preview/readiness presentation',
        'cqRails', jsonb_build_array('PreviewExecutionPlan'),
        'fowlerSignals', jsonb_build_array('ambiguous_language'),
        'architectureGuard', 'apps/web/src/app/components/Modals.test.tsx',
        'cypressCoverage', 'not_applicable:copy_surface_only',
        'unitTests', jsonb_build_array('apps/web/src/app/components/Modals.test.tsx')
      ),
      jsonb_build_object(
        'name', 'RePlanRequiredModal',
        'path', 'apps/web/src/app/components/Modals.tsx',
        'dddOwner', 'Canvas execution preview/readiness presentation',
        'cqRails', jsonb_build_array('PreviewExecutionPlan'),
        'fowlerSignals', jsonb_build_array('legacy_alias', 'ambiguous_language'),
        'architectureGuard', 'apps/web/src/app/components/Modals.test.tsx',
        'cypressCoverage', 'not_applicable:copy_surface_only',
        'unitTests', jsonb_build_array('apps/web/src/app/components/Modals.test.tsx')
      ),
      jsonb_build_object(
        'name', 'normalizeProtectedRuntimeRejection',
        'path', 'apps/web/src/app/services/api/protectedRuntimeRejection.ts',
        'dddOwner', 'ProtectedRuntimeRejectionPresentation',
        'cqRails', jsonb_build_array('PreviewExecutionPlan'),
        'fowlerSignals', jsonb_build_array('legacy_alias', 'ambiguous_language'),
        'architectureGuard', 'apps/web/src/app/services/api/protectedRuntimeRejection.test.ts',
        'cypressCoverage', 'not_applicable:copy_surface_only',
        'unitTests', jsonb_build_array('apps/web/src/app/services/api/protectedRuntimeRejection.test.ts')
      )
    )
  ),
  0,
  'codex'
)
on conflict (rail_id) do update set
  feature_id = excluded.feature_id,
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
