-- Reconcile GraphNodeHealthPopover contract ownership. The popover renders the
-- supplied GraphNodeOperationalDetail, but the shared strategy contract file
-- belongs to GraphNodeCardStrategy. Keep the dependency explicit as a Fowler
-- component relation instead of duplicate file ownership.

delete from planning_query_store.frontend_component_local_files
where component_id = 'web.component.canvas.GraphNodeHealthPopover'
  and file_path = 'apps/web/src/app/plugins/graph/graphNodeCardStrategyContracts.ts';

delete from planning_query_store.frontend_component_files
where component_id = 'web.component.canvas.GraphNodeHealthPopover'
  and file_path = 'apps/web/src/app/plugins/graph/graphNodeCardStrategyContracts.ts';

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
values
  (
    'web.component.canvas.GraphNodeHealthPopover',
    'GraphNodeHealthPopover',
    'ui-view',
    'ui',
    'Frontend / Canvas',
    'apps/web/src/app/plugins/graph/GraphNodeHealthPopoverView.tsx',
    'GraphNodeOperationalDetail',
    'typescript',
    'high',
    'implemented'
  ),
  (
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
values (
  'REL-GRAPH-NODE-HEALTH-POPOVER-CONSUMES-CARD-CONTRACTS',
  'web.component.canvas.GraphNodeHealthPopover',
  'web.component.canvas.GraphNodeCardStrategy',
  'depends_on',
  'outbound',
  'sync',
  'type_contract_missing_breaks_health_popover_compile',
  'canvas_presentation',
  jsonb_build_array(
    'RenderCanvasNodeHealthPopover',
    'ProjectGraphNodeCardReadModel',
    'apps/web/src/app/plugins/graph/GraphNodeHealthPopoverView.tsx',
    'apps/web/src/app/plugins/graph/graphNodeCardStrategyContracts.ts',
    'component-profile --component web.component.canvas.GraphNodeHealthPopover'
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
          'apps/web/src/app/plugins/graph/graphNodeCardStrategyContracts.ts'
        ),
        'replacementRelation', 'REL-GRAPH-NODE-HEALTH-POPOVER-CONSUMES-CARD-CONTRACTS',
        'rule', 'GraphNodeHealthPopover consumes GraphNodeOperationalDetail from GraphNodeCardStrategy; it owns only the supplied detail popover presentation.'
      )
    ),
  source_path = 'tools/planning-db/migrations/496_graph_node_health_popover_contract_ownership_reconcile.sql',
  source_content_sha256 = md5('component:GraphNodeHealthPopover:contract-ownership-reconcile:496'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeHealthPopover';

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
  'web.component.canvas.GraphNodeHealthPopover',
  'EV-CANVAS-GRAPH-NODE-HEALTH-POPOVER-CONTRACT-OWNERSHIP-DRIFT',
  'architecture-test',
  'current',
  'pnpm planning:db:query component-profile --component web.component.canvas.GraphNodeHealthPopover',
  'RenderCanvasNodeHealthPopover',
  'graph-node-health-popover-contract-ownership-drift',
  'GraphNodeHealthPopover consumes GraphNodeOperationalDetail from GraphNodeCardStrategy without owning graphNodeCardStrategyContracts.ts.',
  jsonb_build_object(
    'dbFirst', true,
    'profileQueries', jsonb_build_array(
      'pnpm planning:db:query component-profile --component web.component.canvas.GraphNodeHealthPopover',
      'pnpm planning:db:query component-profile --component web.component.canvas.GraphNodeCardStrategy'
    ),
    'relations', jsonb_build_array(
      'REL-GRAPH-NODE-HEALTH-POPOVER-CONSUMES-CARD-CONTRACTS'
    ),
    'removedDuplicateOwnership', jsonb_build_array(
      'apps/web/src/app/plugins/graph/graphNodeCardStrategyContracts.ts'
    )
  ),
  'tools/planning-db/migrations/496_graph_node_health_popover_contract_ownership_reconcile.sql',
  md5('evidence:GraphNodeHealthPopoverContractOwnershipDrift:496')
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
