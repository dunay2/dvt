-- Overlay the imported NodeWorkbench inventory row. The canonical component is
-- a passive read-model capability; DBT/DVT authoring commands belong to their
-- dedicated field components and are retired from this component projection.

insert into planning_query_store.frontend_component_local_components (
  component_id,
  component_name,
  component_kind,
  component_status,
  reuse_decision,
  frontend_owner,
  responsibility,
  package_name,
  route_scope,
  plugin_scope,
  capability_gaps,
  evidence_refs,
  raw_component,
  source_path,
  source_content_sha256
)
values (
  'web.component.canvas.NodeWorkbench',
  'NodeWorkbench',
  'canvas-inspector',
  'partial',
  'harden',
  'Canvas node authoring',
  'Project canonical node facts, columns, tests, IO, code, sink policy, and metric evidence into passive NodePropertiesReadModel sections without rendering JSX or owning authoring commands.',
  '@dvt/web',
  '/canvas',
  'dbt;dvt',
  '[]'::jsonb,
  '[]'::jsonb,
  jsonb_build_object(
    'dbFirst', true,
    'srp', 'passive node-properties read-model projection',
    'presentationComponentId', 'web.component.canvas.NodePropertiesTabs',
    'hostComponentId', 'web.component.canvas.CanvasNodeWorkbenchPanel',
    'metricPresenterComponentId', 'web.component.metrics.SourceObjectMetricEvidencePresenter',
    'gapModel', 'relational',
    'importedInventoryReplaced', true
  ),
  'tools/planning-db/migrations/616_node_workbench_imported_definition_overlay.sql',
  md5('frontend-component:NodeWorkbench:imported-overlay:616')
)
on conflict (component_id) do update set
  component_name = excluded.component_name,
  component_kind = excluded.component_kind,
  component_status = excluded.component_status,
  reuse_decision = excluded.reuse_decision,
  frontend_owner = excluded.frontend_owner,
  responsibility = excluded.responsibility,
  package_name = excluded.package_name,
  route_scope = excluded.route_scope,
  plugin_scope = excluded.plugin_scope,
  capability_gaps = excluded.capability_gaps,
  evidence_refs = excluded.evidence_refs,
  raw_component = excluded.raw_component,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_local_cq_rails (
  component_id,
  rail_name,
  rail_kind,
  rail_status,
  raw_rail,
  source_path,
  source_content_sha256
)
values
  (
    'web.component.canvas.NodeWorkbench',
    'ConfigureCanvasDbtNode',
    'command',
    'retired',
    jsonb_build_object(
      'retiredForContextActionCatalog', true,
      'canonicalComponentId', 'web.component.canvas.DbtAuthoringFields',
      'retirementReason', 'Passive NodeWorkbench read-model projection does not own DBT authoring commands.'
    ),
    'tools/planning-db/migrations/616_node_workbench_imported_definition_overlay.sql',
    md5('rail:NodeWorkbench:retire-ConfigureCanvasDbtNode:616')
  ),
  (
    'web.component.canvas.NodeWorkbench',
    'ConfigureCanvasDvtNode',
    'command',
    'retired',
    jsonb_build_object(
      'retiredForContextActionCatalog', true,
      'canonicalComponentIds', jsonb_build_array(
        'web.component.canvas.DvtSourceAuthoringSection',
        'web.component.canvas.DvtSqlTransformAuthoringSection'
      ),
      'retirementReason', 'Passive NodeWorkbench read-model projection does not own DVT authoring commands.'
    ),
    'tools/planning-db/migrations/616_node_workbench_imported_definition_overlay.sql',
    md5('rail:NodeWorkbench:retire-ConfigureCanvasDvtNode:616')
  ),
  (
    'web.component.canvas.NodeWorkbench',
    'InspectCanvasNodeProperties',
    'query',
    'implemented-local',
    jsonb_build_object(
      'kind', 'query',
      'owner', 'NodeWorkbench',
      'dddObject', 'NodePropertiesReadModel',
      'applicationPort', 'buildNodePropertiesReadModel',
      'adapterSurface', 'CanvasNodeWorkbenchPanel',
      'scope', 'selected visible Canvas node',
      'negativeTests', jsonb_build_array(
        'does not fabricate absent metadata',
        'does not render JSX',
        'does not own DBT or DVT authoring commands'
      )
    ),
    'tools/planning-db/migrations/616_node_workbench_imported_definition_overlay.sql',
    md5('rail:NodeWorkbench:InspectCanvasNodeProperties:616')
  )
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = excluded.raw_rail,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();
