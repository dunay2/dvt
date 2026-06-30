-- DB-first feature mechanization for DVT node-card runtime metrics.
-- DVT graph cards already own row, byte, and column metrics; this slice keeps
-- canonical runtime duration and cost on strategy-owned cards without making
-- the component fall back to the generic card strategy.

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
  'local#DVT-CANVAS-P0-PRO-FLOW-1#query#rendergraphnodecardmetrics',
  'DVT-CANVAS-P0-PRO-FLOW-1',
  'implemented',
  'RenderGraphNodeCardMetrics',
  'rendergraphnodecardmetrics',
  'query',
  'GraphNodeCardStrategy',
  'implemented',
  jsonb_build_array(
    'apps/web/src/app/plugins/dvt/dvtGraphNodeCardStrategy.ts#resolveCanonicalDurationMs',
    'apps/web/src/app/plugins/dvt/dvtGraphNodeCardStrategy.ts#pushCanonicalCostMetric'
  ),
  jsonb_build_array(
    'apps/web/src/app/plugins/dvt/dvtGraphNodeCardStrategy.ts#resolveCanonicalDurationMs',
    'apps/web/src/app/plugins/dvt/dvtGraphNodeCardStrategy.ts#pushCanonicalCostMetric',
    'apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts',
    'scripts/planning-db-migrate.test.cjs',
    'tools/planning-db/migrations/282_register_dvt_node_card_runtime_metrics_feature.sql'
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
    'docs/architecture/components/web/frontend-component-inventory.md'
  ),
  jsonb_build_array(
    'apps/web/src/app/plugins/dvt/dvtGraphNodeCardStrategy.ts',
    'apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts',
    'scripts/planning-db-migrate.test.cjs',
    'tools/planning-db/migrations/282_register_dvt_node_card_runtime_metrics_feature.sql'
  ),
  jsonb_build_array(
    'pnpm --filter @dvt/web test:unit:run -- src/app/plugins/graph/graphNodeCardReadModel.test.ts',
    'node --test --test-name-pattern "tracked migrations register DVT node card runtime metrics feature mechanization" scripts/planning-db-migrate.test.cjs',
    'pnpm docs:feature-mechanization:implementation'
  ),
  jsonb_build_array(
    'pnpm planning:db:migrate',
    'pnpm --filter @dvt/web test:unit:run -- src/app/plugins/graph/graphNodeCardReadModel.test.ts',
    'node --test --test-name-pattern "tracked migrations register DVT node card runtime metrics feature mechanization" scripts/planning-db-migrate.test.cjs',
    'pnpm docs:feature-mechanization:implementation',
    'pnpm verify:prepush'
  ),
  'tools/planning-db/migrations/282_register_dvt_node_card_runtime_metrics_feature.sql',
  coalesce(
    (
      select file_ref.content_hash
      from planning_query_store.governance_files file_ref
      where file_ref.path =
        'tools/planning-db/migrations/282_register_dvt_node_card_runtime_metrics_feature.sql'
    ),
    repeat('0', 64)
  ),
  jsonb_build_object(
    'name', 'RenderGraphNodeCardMetrics',
    'type', 'query',
    'dddOwner', 'GraphNodeCardStrategy',
    'status', 'implemented'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'DVT-CANVAS-P0-PRO-FLOW-1',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan',
    'DVT graph node cards keep canonical runtime duration and cost metrics while the DVT card strategy owns row, byte, and column presentation metrics.',
    'componentGuides', jsonb_build_array(
      'docs/architecture/components/web/frontend-component-inventory.md',
      'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md'
    ),
    'userStories', jsonb_build_array(
      'As a DVT canvas user, node cards show recorded rows, bytes, columns, duration, and cost when the backing read model has those values.',
      'As a frontend maintainer, DVT card metrics stay owned by the DVT graph-node-card strategy instead of silently falling through to the generic card strategy.'
    ),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/guides/ai-work-protocol.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md',
      'docs/architecture/components/web/frontend-component-inventory.md'
    ),
    'allowedImplementationSurfaces', jsonb_build_array(
      'apps/web/src/app/plugins/dvt/dvtGraphNodeCardStrategy.ts',
      'apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts',
      'scripts/planning-db-migrate.test.cjs',
      'tools/planning-db/migrations/282_register_dvt_node_card_runtime_metrics_feature.sql'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'apps/web/cypress/e2e/**',
      'docs/planning/state/agent-lane-a.yaml',
      'docs/planning/state/agent-lane-b.yaml',
      'docs/planning/state/agent-lane-c.yaml',
      'docs/planning/state/agent-lane-d.yaml',
      'docs/planning/state/agent-lane-e.yaml'
    ),
    'domainObjects', jsonb_build_array(
      'GraphNodeCardStrategy',
      'GraphNodeCardReadModel',
      'DvtGraphNodeCardStrategy'
    ),
    'fowlerSignals', jsonb_build_array(
      'responsibility_overload',
      'hidden_authority',
      'professional_runtime_metrics'
    ),
    'architectureGuards', jsonb_build_array(
      'pnpm --filter @dvt/web test:unit:run -- src/app/plugins/graph/graphNodeCardReadModel.test.ts',
      'node --test --test-name-pattern "tracked migrations register DVT node card runtime metrics feature mechanization" scripts/planning-db-migrate.test.cjs',
      'pnpm docs:feature-mechanization:implementation'
    ),
    'cypressFlows', jsonb_build_array(
      'not_applicable:presentation_read_model_metric_projection_only'
    ),
    'completionGate', jsonb_build_array(
      'pnpm planning:db:migrate',
      'pnpm --filter @dvt/web test:unit:run -- src/app/plugins/graph/graphNodeCardReadModel.test.ts',
      'node --test --test-name-pattern "tracked migrations register DVT node card runtime metrics feature mechanization" scripts/planning-db-migrate.test.cjs',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', 'RenderGraphNodeCardMetrics',
        'type', 'query',
        'dddOwner', 'GraphNodeCardStrategy',
        'status', 'implemented'
      )
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'dvt-node-card-runtime-metrics',
        'redTest',
        'pnpm --filter @dvt/web test:unit:run -- src/app/plugins/graph/graphNodeCardReadModel.test.ts',
        'expectedFailure',
        'DVT strategy-owned graph cards drop canonical lastDuration and lastCost metrics from CanonicalNode values.',
        'patchSurfaces', jsonb_build_array(
          'apps/web/src/app/plugins/dvt/dvtGraphNodeCardStrategy.ts',
          'apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts'
        ),
        'greenTest',
        'pnpm --filter @dvt/web test:unit:run -- src/app/plugins/graph/graphNodeCardReadModel.test.ts'
      ),
      jsonb_build_object(
        'id', 'dbfirst-feature-mechanization-runtime-metrics',
        'redTest',
        'pnpm docs:feature-mechanization:implementation',
        'expectedFailure',
        'The DVT node card metric helpers and implementation surface are absent from DB-first feature mechanization.',
        'patchSurfaces', jsonb_build_array(
          'scripts/planning-db-migrate.test.cjs',
          'tools/planning-db/migrations/282_register_dvt_node_card_runtime_metrics_feature.sql'
        ),
        'greenTest',
        'pnpm docs:feature-mechanization:implementation'
      )
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object(
        'name', 'resolveCanonicalDurationMs',
        'path', 'apps/web/src/app/plugins/dvt/dvtGraphNodeCardStrategy.ts',
        'dddOwner', 'GraphNodeCardStrategy',
        'cqRails', jsonb_build_array('RenderGraphNodeCardMetrics'),
        'fowlerSignals', jsonb_build_array('hidden_authority', 'professional_runtime_metrics'),
        'architectureGuard', 'apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts',
        'cypressCoverage', 'not_applicable:presentation_read_model_metric_projection_only',
        'unitTests', jsonb_build_array(
          'pnpm --filter @dvt/web test:unit:run -- src/app/plugins/graph/graphNodeCardReadModel.test.ts'
        )
      ),
      jsonb_build_object(
        'name', 'pushCanonicalCostMetric',
        'path', 'apps/web/src/app/plugins/dvt/dvtGraphNodeCardStrategy.ts',
        'dddOwner', 'GraphNodeCardStrategy',
        'cqRails', jsonb_build_array('RenderGraphNodeCardMetrics'),
        'fowlerSignals', jsonb_build_array('hidden_authority', 'professional_runtime_metrics'),
        'architectureGuard', 'apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts',
        'cypressCoverage', 'not_applicable:presentation_read_model_metric_projection_only',
        'unitTests', jsonb_build_array(
          'pnpm --filter @dvt/web test:unit:run -- src/app/plugins/graph/graphNodeCardReadModel.test.ts'
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
