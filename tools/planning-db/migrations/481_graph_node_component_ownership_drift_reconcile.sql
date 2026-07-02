-- Reconcile Graph node component ownership after the card family was split
-- into presentation leaves and query builders. These files are consumed across
-- the card family, but they must have a single DB owner so component-profile
-- and Fowler reviews do not report ambiguous ownership.

delete from planning_query_store.frontend_component_local_files
where (
    component_id = 'web.component.canvas.GraphNodeOperationalRail'
    and file_path in (
      'apps/web/src/app/plugins/graph/graphNodeCardStrategyContracts.ts',
      'apps/web/src/app/plugins/graph/graphNodeCardStrategyUtils.ts'
    )
  )
  or (
    component_id = 'web.component.canvas.GraphNodeCardStrategy'
    and file_path in (
      'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts',
      'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.test.ts'
    )
  );

delete from planning_query_store.frontend_component_files
where (
    component_id = 'web.component.canvas.GraphNodeOperationalRail'
    and file_path in (
      'apps/web/src/app/plugins/graph/graphNodeCardStrategyContracts.ts',
      'apps/web/src/app/plugins/graph/graphNodeCardStrategyUtils.ts'
    )
  )
  or (
    component_id = 'web.component.canvas.GraphNodeCardStrategy'
    and file_path in (
      'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts',
      'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.test.ts'
    )
  );

insert into architecture.component (
  component_id,
  name,
  kind,
  layer,
  owner,
  repo_path,
  public_contract,
  runtime,
  criticality,
  status
)
values (
  'web.component.canvas.GraphNodeCardStrategy',
  'GraphNodeCardStrategy',
  'module',
  'ui',
  'Frontend / Canvas',
  'apps/web/src/app/plugins/graph/graphNodeCardReadModel.ts',
  'ProjectGraphNodeCardReadModel',
  'typescript',
  'high',
  'implemented'
)
on conflict (component_id) do update set
  name = excluded.name,
  kind = excluded.kind,
  layer = excluded.layer,
  owner = excluded.owner,
  repo_path = excluded.repo_path,
  public_contract = excluded.public_contract,
  runtime = excluded.runtime,
  criticality = excluded.criticality,
  status = excluded.status,
  updated_at = now();

insert into architecture.component_relation (
  relation_id,
  source_component_id,
  target_component_id,
  relation_type,
  direction,
  sync_async,
  failure_mode,
  authorization_scope,
  source_refs,
  status
)
values
  (
    'REL-GRAPH-NODE-OPERATIONAL-RAIL-CONSUMES-CARD-CONTRACTS',
    'web.component.canvas.GraphNodeOperationalRail',
    'web.component.canvas.GraphNodeCardStrategy',
    'depends_on',
    'outbound',
    'sync',
    'type_contract_missing_breaks_operational_rail_compile',
    'canvas_presentation',
    jsonb_build_array(
      'RenderCanvasGraphNodeOperationalSummary',
      'ProjectGraphNodeCardReadModel',
      'apps/web/src/app/plugins/graph/GraphNodeOperationalRail.tsx',
      'apps/web/src/app/plugins/graph/graphNodeCardStrategyContracts.ts',
      'apps/web/src/app/plugins/graph/graphNodeCardStrategyUtils.ts',
      'component-profile --component web.component.canvas.GraphNodeOperationalRail'
    ),
    'implemented'
  ),
  (
    'REL-GRAPH-NODE-CARD-STRATEGY-USES-OPERATIONAL-SUMMARY',
    'web.component.canvas.GraphNodeCardStrategy',
    'web.component.canvas.GraphNodeOperationalSummary',
    'depends_on',
    'outbound',
    'sync',
    'operational_summary_projection_missing_removes_card_metrics',
    'canvas_read_model_projection',
    jsonb_build_array(
      'ProjectGraphNodeCardReadModel',
      'RenderCanvasGraphNodeOperationalSummary',
      'apps/web/src/app/plugins/graph/graphNodeCardReadModel.ts',
      'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts',
      'component-profile --component web.component.canvas.GraphNodeCardStrategy'
    ),
    'implemented'
  )
on conflict (relation_id) do update set
  source_component_id = excluded.source_component_id,
  target_component_id = excluded.target_component_id,
  relation_type = excluded.relation_type,
  direction = excluded.direction,
  sync_async = excluded.sync_async,
  failure_mode = excluded.failure_mode,
  authorization_scope = excluded.authorization_scope,
  source_refs = excluded.source_refs,
  status = excluded.status,
  updated_at = now();

update planning_query_store.frontend_component_local_components
set
  raw_component = coalesce(raw_component, '{}'::jsonb)
    || jsonb_build_object(
      'ownershipDriftReconcile',
      jsonb_build_object(
        'status', 'reconciled',
        'removedFileOwnership', jsonb_build_array(
          'apps/web/src/app/plugins/graph/graphNodeCardStrategyContracts.ts',
          'apps/web/src/app/plugins/graph/graphNodeCardStrategyUtils.ts'
        ),
        'replacementRelation', 'REL-GRAPH-NODE-OPERATIONAL-RAIL-CONSUMES-CARD-CONTRACTS',
        'rule', 'GraphNodeOperationalRail owns rendered operational rail markup only; shared strategy contracts remain with GraphNodeCardStrategy.'
      )
    ),
  source_path = 'tools/planning-db/migrations/481_graph_node_component_ownership_drift_reconcile.sql',
  source_content_sha256 = md5('component:GraphNodeOperationalRail:ownership-drift-reconcile:481'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeOperationalRail';

update planning_query_store.frontend_component_local_components
set
  raw_component = coalesce(raw_component, '{}'::jsonb)
    || jsonb_build_object(
      'ownershipDriftReconcile',
      jsonb_build_object(
        'status', 'reconciled',
        'removedFileOwnership', jsonb_build_array(
          'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts',
          'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.test.ts'
        ),
        'replacementRelation', 'REL-GRAPH-NODE-CARD-STRATEGY-USES-OPERATIONAL-SUMMARY',
        'rule', 'GraphNodeCardStrategy consumes GraphNodeOperationalSummary instead of owning the operational summary builder files.'
      )
    ),
  source_path = 'tools/planning-db/migrations/481_graph_node_component_ownership_drift_reconcile.sql',
  source_content_sha256 = md5('component:GraphNodeCardStrategy:ownership-drift-reconcile:481'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCardStrategy';

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
  'web.component.canvas.GraphNodeCardStrategy',
  'EV-CANVAS-GRAPH-NODE-COMPONENT-OWNERSHIP-DRIFT-RECONCILE',
  'architecture-test',
  'current',
  'pnpm planning:db:query component-profile --component web.component.canvas.GraphNodeCardStrategy',
  'ProjectGraphNodeCardReadModel',
  'graph-node-component-ownership-drift',
  'GraphNodeCardStrategy no longer owns GraphNodeOperationalSummary files and GraphNodeOperationalRail no longer owns strategy contract/helper files; both dependencies are represented as architecture relations.',
  jsonb_build_object(
    'dbFirst', true,
    'profileQueries', jsonb_build_array(
      'pnpm planning:db:query component-profile --component web.component.canvas.GraphNodeOperationalRail',
      'pnpm planning:db:query component-profile --component web.component.canvas.GraphNodeCardStrategy',
      'pnpm planning:db:query component-profile --component web.component.canvas.GraphNodeOperationalSummary'
    ),
    'relations', jsonb_build_array(
      'REL-GRAPH-NODE-OPERATIONAL-RAIL-CONSUMES-CARD-CONTRACTS',
      'REL-GRAPH-NODE-CARD-STRATEGY-USES-OPERATIONAL-SUMMARY'
    )
  ),
  'tools/planning-db/migrations/481_graph_node_component_ownership_drift_reconcile.sql',
  md5('evidence:GraphNodeComponentOwnershipDrift:481')
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
