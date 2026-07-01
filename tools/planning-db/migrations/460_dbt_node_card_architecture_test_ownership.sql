-- DbtNodeComponent.architecture.test.ts verifies the DBT node renderer and
-- its handoff to shared shell/context-menu/port templates. It is evidence for
-- DbtNodeCard, not ownership of the generic GraphNodeCard read model. This
-- also removes the duplicate DbtNodeComponent.tsx adapter/component count for
-- DbtNodeCard: one file should have one active ownership role.

insert into planning_query_store.frontend_component_local_files (
  component_id,
  file_path,
  file_role,
  exported_symbol,
  raw_file,
  source_path,
  source_content_sha256
)
values (
  'web.component.canvas.DbtNodeCard',
  'apps/web/src/app/components/canvas/DbtNodeComponent.architecture.test.ts',
  'architecture-test',
  null,
  jsonb_build_object(
    'coverage', 'DBT node card delegates shell, ports, context-menu, drag surface, schema drop, and execution-selection behavior to governed Canvas components.',
    'rails', jsonb_build_array('RenderDbtCanvasNodeCard', 'RenderCanvasGraphNodeCard', 'RenderCanvasNodePortHandle'),
    'fowlerSignal', 'strategy_specific_card_renderer_test',
    'doesNotOwnGenericGraphNodeReadModel', true
  ),
  'tools/planning-db/migrations/460_dbt_node_card_architecture_test_ownership.sql',
  md5('file:DbtNodeCard:DbtNodeComponent.architecture.test.ts:460')
)
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_validation_evidence (
  component_id,
  evidence_id,
  evidence_kind,
  evidence_status,
  evidence_ref,
  rail_name,
  context_id,
  proves,
  raw_evidence,
  source_path,
  source_content_sha256
)
values (
  'web.component.canvas.DbtNodeCard',
  'EV-CANVAS-DBT-NODE-CARD-ARCHITECTURE-OWNERSHIP',
  'architecture-test',
  'current',
  'apps/web/src/app/components/canvas/DbtNodeComponent.architecture.test.ts',
  'RenderDbtCanvasNodeCard',
  'dbt-node-card',
  'DBT node card architecture tests are owned by DbtNodeCard while shared shell, port, and context menu components remain separate.',
  jsonb_build_object(
    'redGreen', false,
    'command', 'pnpm --filter @dvt/web test:architecture:run -- src/app/components/canvas/DbtNodeComponent.architecture.test.ts',
    'ownershipCheck', 'pnpm planning:db:query frontend-component-files --component web.component.canvas.DbtNodeCard --limit 40'
  ),
  'tools/planning-db/migrations/460_dbt_node_card_architecture_test_ownership.sql',
  md5('evidence:DbtNodeCard:architecture-test-ownership:460')
)
on conflict (component_id, evidence_id) do update set
  evidence_kind = excluded.evidence_kind,
  evidence_status = excluded.evidence_status,
  evidence_ref = excluded.evidence_ref,
  rail_name = excluded.rail_name,
  context_id = excluded.context_id,
  proves = excluded.proves,
  raw_evidence = excluded.raw_evidence,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

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
    'web.component.canvas.GraphNodeCard',
    'apps/web/src/app/components/canvas/DbtNodeComponent.architecture.test.ts',
    'architecture-test',
    null,
    jsonb_build_object(
      'retiredForPresentationOwnership', true,
      'reassignedToComponent', 'web.component.canvas.DbtNodeCard',
      'reassignedRail', 'RenderDbtCanvasNodeCard',
      'reason', 'The architecture test verifies DBT renderer handoff into shared templates; it is not GraphNodeCard read-model ownership.'
    ),
    'tools/planning-db/migrations/460_dbt_node_card_architecture_test_ownership.sql',
    md5('file:GraphNodeCard:DbtNodeComponent.architecture.test.ts:retired:460')
  ),
  (
    'web.component.canvas.DbtNodeCard',
    'apps/web/src/app/components/canvas/DbtNodeComponent.tsx',
    'adapter',
    'DbtNodeComponent',
    jsonb_build_object(
      'retiredForPresentationOwnership', true,
      'reassignedToComponent', 'web.component.canvas.DbtNodeCard',
      'reassignedRole', 'component',
      'reassignedRail', 'RenderDbtCanvasNodeCard',
      'reason', 'DbtNodeComponent.tsx is the DBT card component; counting the same file as adapter and component double-counts ownership.'
    ),
    'tools/planning-db/migrations/460_dbt_node_card_architecture_test_ownership.sql',
    md5('file:DbtNodeCard:DbtNodeComponent.tsx:adapter-retired:460')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();
