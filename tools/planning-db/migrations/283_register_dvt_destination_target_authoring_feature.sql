-- DB-first feature mechanization for DVT destination target authoring.
-- This registers the inspector command that captures database/schema/table and
-- sink partition strategy metadata without claiming runtime planner support for
-- fields outside the current transformation-flow contract.

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
  'local#DVT-CANVAS-P0-PRO-FLOW-1#command#configuredvtdestinationtarget',
  'DVT-CANVAS-P0-PRO-FLOW-1',
  'implemented',
  'ConfigureDvtDestinationTarget',
  'configuredvtdestinationtarget',
  'command',
  'CanvasInspectorAuthoringModel',
  'implemented',
  jsonb_build_array(
    'apps/web/src/app/views/canvas/canvasDvtAuthoringModel.ts#createSourceMetadata',
    'apps/web/src/app/views/canvas/canvasDvtAuthoringModel.ts#createSinkMetadata',
    'apps/web/src/app/views/canvas/canvasDvtAuthoringModel.ts#applyDvtNodeAuthoringMetadata',
    'apps/web/src/app/views/canvas/canvasDvtAuthoringModel.ts#optionalConfigString',
    'apps/web/src/app/views/canvas/DvtAuthoringFields.tsx#DvtAuthoringFields',
    'apps/web/src/app/views/canvas/DvtAuthoringFields.tsx#formatQualifiedTarget'
  ),
  jsonb_build_array(
    'apps/web/src/app/views/canvas/canvasDvtAuthoringModel.ts',
    'apps/web/src/app/views/canvas/DvtAuthoringFields.tsx',
    'apps/web/src/app/views/canvas/canvasCopy.types.ts',
    'apps/web/src/app/views/canvas/canvasCopyCatalog.authoring.ts',
    'apps/web/src/app/views/canvas/canvasCopyCatalog.authoring.es.ts',
    'apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.test.ts',
    'apps/web/src/app/views/canvas/DvtAuthoringFields.test.tsx',
    'scripts/planning-db-migrate.test.cjs',
    'tools/planning-db/migrations/283_register_dvt_destination_target_authoring_feature.sql'
  ),
  jsonb_build_array(
    'docs/architecture/components/web/frontend-component-inventory.md',
    'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md'
  ),
  jsonb_build_array(
    'AGENTS.md',
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/guides/ai-work-protocol.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md',
    'buzon/TAREA.TXT'
  ),
  jsonb_build_array(
    'apps/web/src/app/views/canvas/canvasDvtAuthoringModel.ts',
    'apps/web/src/app/views/canvas/DvtAuthoringFields.tsx',
    'apps/web/src/app/views/canvas/canvasCopy.types.ts',
    'apps/web/src/app/views/canvas/canvasCopyCatalog.authoring.ts',
    'apps/web/src/app/views/canvas/canvasCopyCatalog.authoring.es.ts',
    'apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.test.ts',
    'apps/web/src/app/views/canvas/DvtAuthoringFields.test.tsx',
    'scripts/planning-db-migrate.test.cjs',
    'tools/planning-db/migrations/283_register_dvt_destination_target_authoring_feature.sql'
  ),
  jsonb_build_array(
    'pnpm --filter @dvt/web test:unit:run -- src/app/views/canvas/canvasInspectorAuthoringModel.test.ts',
    'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/DvtAuthoringFields.test.tsx',
    'node --test --test-name-pattern "tracked migrations register DVT destination target authoring feature mechanization" scripts/planning-db-migrate.test.cjs',
    'pnpm docs:feature-mechanization:implementation'
  ),
  jsonb_build_array(
    'pnpm planning:db:migrate',
    'pnpm --filter @dvt/web test:unit:run -- src/app/views/canvas/canvasInspectorAuthoringModel.test.ts',
    'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/DvtAuthoringFields.test.tsx',
    'node --test --test-name-pattern "tracked migrations register DVT destination target authoring feature mechanization" scripts/planning-db-migrate.test.cjs',
    'pnpm docs:feature-mechanization:implementation',
    'pnpm verify:prepush'
  ),
  'tools/planning-db/migrations/283_register_dvt_destination_target_authoring_feature.sql',
  coalesce(
    (
      select file_ref.content_hash
      from planning_query_store.governance_files file_ref
      where file_ref.path =
        'tools/planning-db/migrations/283_register_dvt_destination_target_authoring_feature.sql'
    ),
    repeat('0', 64)
  ),
  jsonb_build_object(
    'name', 'ConfigureDvtDestinationTarget',
    'type', 'command',
    'dddOwner', 'CanvasInspectorAuthoringModel',
    'status', 'implemented'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'DVT-CANVAS-P0-PRO-FLOW-1',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan',
    'DVT inspector authoring captures source database metadata and sink database/schema/table/write mode/partition strategy metadata in metadata.config, clears optional target metadata when users blank those fields, and leaves runtime execution contract scope unchanged.',
    'componentGuides', jsonb_build_array(
      'docs/architecture/components/web/frontend-component-inventory.md',
      'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md'
    ),
    'userStories', jsonb_build_array(
      'As a DVT canvas user, imported source metadata shows the full database.schema.table target when the warehouse catalog provides a database.',
      'As a DVT canvas user, sink authoring lets me record the exact database/schema/table target and partition strategy before preview/run readiness.',
      'As a DVT canvas user, clearing optional database or partition strategy fields removes stale target metadata instead of silently restoring previous config.',
      'As a maintainer, destination target authoring remains explicit metadata capture and does not silently expand the planner contract.'
    ),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/guides/ai-work-protocol.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md',
      'buzon/TAREA.TXT'
    ),
    'allowedImplementationSurfaces', jsonb_build_array(
      'apps/web/src/app/views/canvas/canvasDvtAuthoringModel.ts',
      'apps/web/src/app/views/canvas/DvtAuthoringFields.tsx',
      'apps/web/src/app/views/canvas/canvasCopy.types.ts',
      'apps/web/src/app/views/canvas/canvasCopyCatalog.authoring.ts',
      'apps/web/src/app/views/canvas/canvasCopyCatalog.authoring.es.ts',
      'apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.test.ts',
      'apps/web/src/app/views/canvas/DvtAuthoringFields.test.tsx',
      'scripts/planning-db-migrate.test.cjs',
      'tools/planning-db/migrations/283_register_dvt_destination_target_authoring_feature.sql'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'packages/@dvt/contracts/**',
      'packages/@dvt/planner/**',
      'apps/web/cypress/e2e/**',
      'docs/planning/state/agent-lane-a.yaml',
      'docs/planning/state/agent-lane-b.yaml',
      'docs/planning/state/agent-lane-c.yaml',
      'docs/planning/state/agent-lane-d.yaml',
      'docs/planning/state/agent-lane-e.yaml'
    ),
    'domainObjects', jsonb_build_array(
      'CanvasInspectorAuthoringModel',
      'DvtNodeAuthoringMetadata',
      'DvtAuthoringFields'
    ),
    'fowlerSignals', jsonb_build_array(
      'hidden_authority',
      'primitive_obsession',
      'professional_destination_target_authoring'
    ),
    'architectureGuards', jsonb_build_array(
      'pnpm --filter @dvt/web test:unit:run -- src/app/views/canvas/canvasInspectorAuthoringModel.test.ts',
      'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/DvtAuthoringFields.test.tsx',
      'node --test --test-name-pattern "tracked migrations register DVT destination target authoring feature mechanization" scripts/planning-db-migrate.test.cjs',
      'pnpm docs:feature-mechanization:implementation'
    ),
    'cypressFlows', jsonb_build_array(
      'not_applicable:inspector_authoring_metadata_capture_only'
    ),
    'completionGate', jsonb_build_array(
      'pnpm planning:db:migrate',
      'pnpm --filter @dvt/web test:unit:run -- src/app/views/canvas/canvasInspectorAuthoringModel.test.ts',
      'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/DvtAuthoringFields.test.tsx',
      'node --test --test-name-pattern "tracked migrations register DVT destination target authoring feature mechanization" scripts/planning-db-migrate.test.cjs',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', 'ConfigureDvtDestinationTarget',
        'type', 'command',
        'dddOwner', 'CanvasInspectorAuthoringModel',
        'status', 'implemented'
      )
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'dvt-destination-target-authoring',
        'redTest',
        'pnpm --filter @dvt/web test:unit:run -- src/app/views/canvas/canvasInspectorAuthoringModel.test.ts',
        'expectedFailure',
        'DVT source and sink drafts drop database and partition strategy metadata, and existing optional target metadata cannot be cleared once set.',
        'patchSurfaces', jsonb_build_array(
          'apps/web/src/app/views/canvas/canvasDvtAuthoringModel.ts',
          'apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.test.ts'
        ),
        'greenTest',
        'pnpm --filter @dvt/web test:unit:run -- src/app/views/canvas/canvasInspectorAuthoringModel.test.ts'
      ),
      jsonb_build_object(
        'id', 'dvt-destination-target-fields',
        'redTest',
        'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/DvtAuthoringFields.test.tsx',
        'expectedFailure',
        'DVT authoring fields do not render or update database and partition strategy controls.',
        'patchSurfaces', jsonb_build_array(
          'apps/web/src/app/views/canvas/DvtAuthoringFields.tsx',
          'apps/web/src/app/views/canvas/DvtAuthoringFields.test.tsx'
        ),
        'greenTest',
        'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/DvtAuthoringFields.test.tsx'
      ),
      jsonb_build_object(
        'id', 'dbfirst-feature-mechanization-dvt-destination-target',
        'redTest',
        'pnpm docs:feature-mechanization:implementation',
        'expectedFailure',
        'The DVT destination target authoring symbols and implementation surfaces are absent from DB-first feature mechanization.',
        'patchSurfaces', jsonb_build_array(
          'scripts/planning-db-migrate.test.cjs',
          'tools/planning-db/migrations/283_register_dvt_destination_target_authoring_feature.sql'
        ),
        'greenTest',
        'pnpm docs:feature-mechanization:implementation'
      )
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object(
        'name', 'createSourceMetadata',
        'path', 'apps/web/src/app/views/canvas/canvasDvtAuthoringModel.ts',
        'dddOwner', 'CanvasInspectorAuthoringModel',
        'cqRails', jsonb_build_array('ConfigureDvtDestinationTarget'),
        'fowlerSignals', jsonb_build_array('hidden_authority', 'professional_destination_target_authoring'),
        'architectureGuard', 'apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.test.ts',
        'cypressCoverage', 'not_applicable:inspector_authoring_metadata_capture_only',
        'unitTests', jsonb_build_array(
          'pnpm --filter @dvt/web test:unit:run -- src/app/views/canvas/canvasInspectorAuthoringModel.test.ts'
        )
      ),
      jsonb_build_object(
        'name', 'createSinkMetadata',
        'path', 'apps/web/src/app/views/canvas/canvasDvtAuthoringModel.ts',
        'dddOwner', 'CanvasInspectorAuthoringModel',
        'cqRails', jsonb_build_array('ConfigureDvtDestinationTarget'),
        'fowlerSignals', jsonb_build_array('hidden_authority', 'professional_destination_target_authoring'),
        'architectureGuard', 'apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.test.ts',
        'cypressCoverage', 'not_applicable:inspector_authoring_metadata_capture_only',
        'unitTests', jsonb_build_array(
          'pnpm --filter @dvt/web test:unit:run -- src/app/views/canvas/canvasInspectorAuthoringModel.test.ts'
        )
      ),
      jsonb_build_object(
        'name', 'applyDvtNodeAuthoringMetadata',
        'path', 'apps/web/src/app/views/canvas/canvasDvtAuthoringModel.ts',
        'dddOwner', 'CanvasInspectorAuthoringModel',
        'cqRails', jsonb_build_array('ConfigureDvtDestinationTarget'),
        'fowlerSignals', jsonb_build_array('hidden_authority', 'professional_destination_target_authoring'),
        'architectureGuard', 'apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.test.ts',
        'cypressCoverage', 'not_applicable:inspector_authoring_metadata_capture_only',
        'unitTests', jsonb_build_array(
          'pnpm --filter @dvt/web test:unit:run -- src/app/views/canvas/canvasInspectorAuthoringModel.test.ts'
        )
      ),
      jsonb_build_object(
        'name', 'optionalConfigString',
        'path', 'apps/web/src/app/views/canvas/canvasDvtAuthoringModel.ts',
        'dddOwner', 'CanvasInspectorAuthoringModel',
        'cqRails', jsonb_build_array('ConfigureDvtDestinationTarget'),
        'fowlerSignals', jsonb_build_array('primitive_obsession', 'professional_destination_target_authoring'),
        'architectureGuard', 'apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.test.ts',
        'cypressCoverage', 'not_applicable:inspector_authoring_metadata_capture_only',
        'unitTests', jsonb_build_array(
          'pnpm --filter @dvt/web test:unit:run -- src/app/views/canvas/canvasInspectorAuthoringModel.test.ts'
        )
      ),
      jsonb_build_object(
        'name', 'DvtAuthoringFields',
        'path', 'apps/web/src/app/views/canvas/DvtAuthoringFields.tsx',
        'dddOwner', 'CanvasInspectorAuthoringModel',
        'cqRails', jsonb_build_array('ConfigureDvtDestinationTarget'),
        'fowlerSignals', jsonb_build_array('professional_destination_target_authoring'),
        'architectureGuard', 'apps/web/src/app/views/canvas/DvtAuthoringFields.test.tsx',
        'cypressCoverage', 'not_applicable:inspector_authoring_metadata_capture_only',
        'unitTests', jsonb_build_array(
          'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/DvtAuthoringFields.test.tsx'
        )
      ),
      jsonb_build_object(
        'name', 'formatQualifiedTarget',
        'path', 'apps/web/src/app/views/canvas/DvtAuthoringFields.tsx',
        'dddOwner', 'CanvasInspectorAuthoringModel',
        'cqRails', jsonb_build_array('ConfigureDvtDestinationTarget'),
        'fowlerSignals', jsonb_build_array('primitive_obsession', 'professional_destination_target_authoring'),
        'architectureGuard', 'apps/web/src/app/views/canvas/DvtAuthoringFields.test.tsx',
        'cypressCoverage', 'not_applicable:inspector_authoring_metadata_capture_only',
        'unitTests', jsonb_build_array(
          'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/DvtAuthoringFields.test.tsx'
        )
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
