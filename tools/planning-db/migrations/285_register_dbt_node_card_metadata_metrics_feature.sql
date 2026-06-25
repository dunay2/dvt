-- DBT graph cards now surface source-import metadata that comes from the
-- workspace graph draft read model: physical relation, rows, bytes, and columns.

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
  'local#DBT-CANVAS-P0-PRO-FLOW-1#query#renderdbtgraphnodecardmetrics',
  'DBT-CANVAS-P0-PRO-FLOW-1',
  'implemented',
  'RenderDbtGraphNodeCardMetrics',
  'renderdbtgraphnodecardmetrics',
  'query',
  'GraphNodeCardStrategy',
  'implemented',
  jsonb_build_array(
    'apps/web/src/app/plugins/dbt/dbtGraphNodeCardStrategy.ts#dbtGraphNodeCardStrategy'
  ),
  jsonb_build_array(
    'apps/web/src/app/plugins/dbt/dbtGraphNodeCardStrategy.ts#dbtGraphNodeCardStrategy',
    'apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts',
    'apps/web/cypress/e2e/canvas/canvas-source-import-contextual.cy.ts',
    'scripts/planning-db-migrate.test.cjs',
    'tools/planning-db/migrations/285_register_dbt_node_card_metadata_metrics_feature.sql'
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
    'apps/web/src/app/plugins/dbt/dbtGraphNodeCardStrategy.ts',
    'apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts',
    'apps/web/cypress/e2e/canvas/canvas-source-import-contextual.cy.ts',
    'scripts/planning-db-migrate.test.cjs',
    'tools/planning-db/migrations/285_register_dbt_node_card_metadata_metrics_feature.sql'
  ),
  jsonb_build_array(
    'pnpm --filter @dvt/web test:unit:run -- src/app/plugins/graph/graphNodeCardReadModel.test.ts',
    'pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/canvas/canvas-source-import-contextual.cy.ts',
    'node --test --test-name-pattern "tracked migrations register DBT node card metadata metrics feature mechanization" scripts/planning-db-migrate.test.cjs',
    'pnpm docs:feature-mechanization:implementation'
  ),
  jsonb_build_array(
    'pnpm planning:db:migrate',
    'pnpm --filter @dvt/web test:unit:run -- src/app/plugins/graph/graphNodeCardReadModel.test.ts',
    'pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/canvas/canvas-source-import-contextual.cy.ts',
    'node --test --test-name-pattern "tracked migrations register DBT node card metadata metrics feature mechanization" scripts/planning-db-migrate.test.cjs',
    'pnpm docs:feature-mechanization:implementation',
    'pnpm verify:prepush'
  ),
  'tools/planning-db/migrations/285_register_dbt_node_card_metadata_metrics_feature.sql',
  md5('DBT-CANVAS-P0-PRO-FLOW-1:RenderDbtGraphNodeCardMetrics:285')
    || md5('web.component.canvas.GraphNodeCardStrategy:dbt'),
  jsonb_build_object(
    'name', 'RenderDbtGraphNodeCardMetrics',
    'type', 'query',
    'dddOwner', 'GraphNodeCardStrategy',
    'status', 'implemented'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'DBT-CANVAS-P0-PRO-FLOW-1',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan',
    'DBT graph node cards render physical relation and available warehouse metadata from the governed workspace graph draft read model.',
    'componentGuides', jsonb_build_array(
      'web.component.canvas.GraphNodeCardStrategy',
      'docs/architecture/components/web/frontend-component-inventory.md',
      'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md'
    ),
    'userStories', jsonb_build_array(
      'As a DBT canvas author, an imported source card shows the relation, row count, byte size, and column count when the source import read model provides them.',
      'As a DBT canvas author, opening the node workbench after contextual source import exposes the imported columns instead of a fake success toast.'
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
      'apps/web/src/app/plugins/dbt/dbtGraphNodeCardStrategy.ts',
      'apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts',
      'apps/web/cypress/e2e/canvas/canvas-source-import-contextual.cy.ts',
      'scripts/planning-db-migrate.test.cjs',
      'tools/planning-db/migrations/285_register_dbt_node_card_metadata_metrics_feature.sql'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'buzon/**',
      'apps/web/cypress/e2e/canvas/**#cy.intercept_workspace_graph_draft',
      'docs/planning/state/agent-lane-a.yaml',
      'docs/planning/state/agent-lane-b.yaml',
      'docs/planning/state/agent-lane-c.yaml',
      'docs/planning/state/agent-lane-d.yaml',
      'docs/planning/state/agent-lane-e.yaml'
    ),
    'domainObjects', jsonb_build_array(
      'GraphNodeCardStrategy',
      'GraphNodeCardReadModel',
      'DbtGraphNodeCardStrategy',
      'WorkspaceGraphDraft'
    ),
    'fowlerSignals', jsonb_build_array(
      'canvas_first_professional_flow',
      'read_model_projection',
      'metadata_visibility'
    ),
    'architectureGuards', jsonb_build_array(
      'pnpm --filter @dvt/web test:unit:run -- src/app/plugins/graph/graphNodeCardReadModel.test.ts',
      'node --test --test-name-pattern "tracked migrations register DBT node card metadata metrics feature mechanization" scripts/planning-db-migrate.test.cjs',
      'pnpm docs:feature-mechanization:implementation'
    ),
    'cypressFlows', jsonb_build_array(
      'apps/web/cypress/e2e/canvas/canvas-source-import-contextual.cy.ts'
    ),
    'completionGate', jsonb_build_array(
      'pnpm planning:db:migrate',
      'pnpm --filter @dvt/web test:unit:run -- src/app/plugins/graph/graphNodeCardReadModel.test.ts',
      'pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/canvas/canvas-source-import-contextual.cy.ts',
      'node --test --test-name-pattern "tracked migrations register DBT node card metadata metrics feature mechanization" scripts/planning-db-migrate.test.cjs',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', 'RenderDbtGraphNodeCardMetrics',
        'type', 'query',
        'dddOwner', 'GraphNodeCardStrategy',
        'status', 'implemented'
      )
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'dbt-node-card-source-import-metadata',
        'redTest',
        'pnpm --filter @dvt/web test:unit:run -- src/app/plugins/graph/graphNodeCardReadModel.test.ts',
        'expectedFailure',
        'DBT source cards omit physical relation, row count, byte size, or column count supplied by imported warehouse metadata.',
        'patchSurfaces', jsonb_build_array(
          'apps/web/src/app/plugins/dbt/dbtGraphNodeCardStrategy.ts',
          'apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts'
        ),
        'greenTest',
        'pnpm --filter @dvt/web test:unit:run -- src/app/plugins/graph/graphNodeCardReadModel.test.ts'
      ),
      jsonb_build_object(
        'id', 'contextual-source-import-draft-refresh',
        'redTest',
        'pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/canvas/canvas-source-import-contextual.cy.ts',
        'expectedFailure',
        'The contextual source import flow can show a success modal without proving the graph draft reloads with the imported source and its columns.',
        'patchSurfaces', jsonb_build_array(
          'apps/web/cypress/e2e/canvas/canvas-source-import-contextual.cy.ts',
          'apps/web/cypress/support/canvasDraftAuthoring.ts',
          'apps/web/cypress/support/test/canvasPreviewRunPersisted.ts'
        ),
        'greenTest',
        'pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/canvas/canvas-source-import-contextual.cy.ts'
      )
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object(
        'name', 'dbtGraphNodeCardStrategy',
        'path', 'apps/web/src/app/plugins/dbt/dbtGraphNodeCardStrategy.ts',
        'dddOwner', 'GraphNodeCardStrategy',
        'cqRails', jsonb_build_array('RenderDbtGraphNodeCardMetrics'),
        'fowlerSignals', jsonb_build_array('read_model_projection', 'metadata_visibility'),
        'architectureGuard', 'apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-contextual.cy.ts',
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
