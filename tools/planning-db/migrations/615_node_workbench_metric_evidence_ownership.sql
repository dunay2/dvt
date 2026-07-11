-- Reconcile the contextual node workbench after metric-evidence hardening.
-- The read model, presentation leaf, and workbench host remain separate SRP
-- components. Product-completeness gaps remain open as relational records.

update planning_query_store.frontend_component_local_components
set
  responsibility = 'Project canonical node facts, columns, tests, IO, code, sink policy, and metric evidence into passive NodePropertiesReadModel sections without rendering JSX or owning authoring commands.',
  component_status = 'partial',
  capability_gaps = '[]'::jsonb,
  evidence_refs = '[]'::jsonb,
  raw_component = coalesce(raw_component, '{}'::jsonb) || jsonb_build_object(
    'dbFirst', true,
    'srp', 'passive node-properties read-model projection',
    'presentationComponentId', 'web.component.canvas.NodePropertiesTabs',
    'hostComponentId', 'web.component.canvas.CanvasNodeWorkbenchPanel',
    'metricPresenterComponentId', 'web.component.metrics.SourceObjectMetricEvidencePresenter',
    'gapModel', 'relational'
  ),
  source_path = 'tools/planning-db/migrations/615_node_workbench_metric_evidence_ownership.sql',
  source_content_sha256 = md5('frontend-component:NodeWorkbench:metric-evidence:615'),
  updated_at = now()
where component_id = 'web.component.canvas.NodeWorkbench';

update planning_query_store.frontend_component_local_components
set
  component_status = 'partial',
  capability_gaps = '[]'::jsonb,
  evidence_refs = '[]'::jsonb,
  raw_component = coalesce(raw_component, '{}'::jsonb) || jsonb_build_object(
    'dbFirst', true,
    'srp', 'contextual workbench composition and authoring-slot orchestration',
    'readModelComponentId', 'web.component.canvas.NodeWorkbench',
    'presentationComponentId', 'web.component.canvas.NodePropertiesTabs',
    'gapModel', 'relational'
  ),
  source_path = 'tools/planning-db/migrations/615_node_workbench_metric_evidence_ownership.sql',
  source_content_sha256 = md5('frontend-component:CanvasNodeWorkbenchPanel:metric-evidence:615'),
  updated_at = now()
where component_id = 'web.component.canvas.CanvasNodeWorkbenchPanel';

update planning_query_store.frontend_component_local_components
set
  evidence_refs = '[]'::jsonb,
  raw_component = coalesce(raw_component, '{}'::jsonb) || jsonb_build_object(
    'metricHotspotComponentId', 'web.component.metrics.MetricEvidenceHotspot',
    'ownedFileManifestVersion', 615
  ),
  source_path = 'tools/planning-db/migrations/615_node_workbench_metric_evidence_ownership.sql',
  source_content_sha256 = md5('frontend-component:NodePropertiesTabs:metric-evidence:615'),
  updated_at = now()
where component_id = 'web.component.canvas.NodePropertiesTabs';

delete from planning_query_store.frontend_component_capability_gaps
where component_id in (
  'web.component.canvas.NodeWorkbench',
  'web.component.canvas.CanvasNodeWorkbenchPanel'
);

insert into planning_query_store.frontend_component_capability_gaps (
  component_id,
  gap_id,
  gap_kind,
  gap_status,
  description,
  owning_task_id,
  raw_gap,
  source_path,
  source_content_sha256
)
values
  (
    'web.component.canvas.NodeWorkbench',
    'GAP-NODE-WORKBENCH-DEMANDING-METADATA-PROOF',
    'product-proof',
    'open',
    'Demanding-user proof must exercise complete source, model, column, test, sink, and metric evidence from canonical projections without fabricated fallback data.',
    'E-SOURCE-OBJECT-METRICS-PROD-1',
    jsonb_build_object(
      'acceptance', 'live SourceObject to model to sink workbench inspection',
      'noFabrication', true
    ),
    'tools/planning-db/migrations/615_node_workbench_metric_evidence_ownership.sql',
    md5('gap:NodeWorkbench:demanding-metadata-proof:615')
  ),
  (
    'web.component.canvas.CanvasNodeWorkbenchPanel',
    'GAP-NODE-WORKBENCH-PANEL-DEMANDING-INTERACTION-PROOF',
    'product-proof',
    'open',
    'Demanding-user browser proof must exercise draggable ordered workbench sections, compact metric hotspots, and deterministic close/delete lifecycle without duplicated facts.',
    'E-SOURCE-OBJECT-METRICS-PROD-1',
    jsonb_build_object(
      'acceptance', 'mouse and keyboard workbench interaction in the live Canvas',
      'noDuplicateRows', true
    ),
    'tools/planning-db/migrations/615_node_workbench_metric_evidence_ownership.sql',
    md5('gap:CanvasNodeWorkbenchPanel:demanding-interaction-proof:615')
  )
on conflict (component_id, gap_id) do update set
  gap_kind = excluded.gap_kind,
  gap_status = excluded.gap_status,
  description = excluded.description,
  owning_task_id = excluded.owning_task_id,
  raw_gap = excluded.raw_gap,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

-- One source file has one ownership role inside the read-model component.
delete from planning_query_store.frontend_component_local_files
where component_id = 'web.component.canvas.NodeWorkbench'
  and file_path = 'apps/web/src/app/components/inspector/nodePropertiesReadModel.ts'
  and file_role = 'view-model';

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
    'web.component.canvas.NodeWorkbench',
    'apps/web/src/app/components/inspector/nodePropertiesReadModel.ts',
    'view-model',
    'buildNodePropertiesReadModel',
    jsonb_build_object(
      'retiredForPresentationOwnership', true,
      'retiredReason', 'The canonical role is read-model; view-model was duplicate vocabulary for the same file and symbol.'
    ),
    'tools/planning-db/migrations/615_node_workbench_metric_evidence_ownership.sql',
    md5('file:nodePropertiesReadModel:view-model-tombstone:615')
  ),
  (
    'web.component.canvas.NodeWorkbench',
    'apps/web/src/app/components/inspector/nodePropertiesReadModel.ts',
    'read-model',
    'buildNodePropertiesReadModel',
    jsonb_build_object(
      'rail', 'InspectCanvasNodeProperties',
      'responsibility', 'Project passive node-property sections and complete metric-evidence details.',
      'dependsOn', jsonb_build_array('web.component.metrics.SourceObjectMetricEvidencePresenter'),
      'doesNotOwn', jsonb_build_array('JSX', 'authoring commands', 'route state')
    ),
    'tools/planning-db/migrations/615_node_workbench_metric_evidence_ownership.sql',
    md5('file:nodePropertiesReadModel:read-model:615')
  ),
  (
    'web.component.canvas.NodeWorkbench',
    'apps/web/src/app/components/inspector/nodePropertiesReadModel.test.ts',
    'test',
    null,
    jsonb_build_object(
      'rail', 'InspectCanvasNodeProperties',
      'coverage', 'node sections, explicit empty states, DBT test semantics, DVT column selection, sink policy, and measured/estimated metric evidence'
    ),
    'tools/planning-db/migrations/615_node_workbench_metric_evidence_ownership.sql',
    md5('file:nodePropertiesReadModel.test:615')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

-- The presentation leaf owns every source and focused test in its family.
delete from planning_query_store.frontend_component_local_files
where component_id = 'web.component.canvas.NodePropertiesTabs';

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
  ('web.component.canvas.NodePropertiesTabs', 'apps/web/src/app/components/inspector/NodePropertiesTabs.tsx', 'presentation-template', 'NodePropertiesTabs', jsonb_build_object('rail', 'RenderNodePropertiesTabs', 'presentationOnly', true), 'tools/planning-db/migrations/615_node_workbench_metric_evidence_ownership.sql', md5('file:NodePropertiesTabs:615')),
  ('web.component.canvas.NodePropertiesTabs', 'apps/web/src/app/components/inspector/NodePropertySectionView.tsx', 'section-presentation', 'NodePropertySectionView', jsonb_build_object('rail', 'RenderNodePropertiesTabs', 'presentationOnly', true, 'dependsOn', 'web.component.metrics.MetricEvidenceHotspot'), 'tools/planning-db/migrations/615_node_workbench_metric_evidence_ownership.sql', md5('file:NodePropertySectionView:615')),
  ('web.component.canvas.NodePropertiesTabs', 'apps/web/src/app/components/inspector/NodePropertiesTabs.architecture.test.ts', 'architecture-test', null, jsonb_build_object('coverage', 'presentation/read-model boundary'), 'tools/planning-db/migrations/615_node_workbench_metric_evidence_ownership.sql', md5('file:NodePropertiesTabs.architecture.test:615')),
  ('web.component.canvas.NodePropertiesTabs', 'apps/web/src/app/components/inspector/NodePropertiesTabs.primarySections.test.tsx', 'presentation-test', null, jsonb_build_object('coverage', 'primary text tabs and More overflow'), 'tools/planning-db/migrations/615_node_workbench_metric_evidence_ownership.sql', md5('file:NodePropertiesTabs.primarySections.test:615')),
  ('web.component.canvas.NodePropertiesTabs', 'apps/web/src/app/components/inspector/NodePropertiesTabs.sectionContent.test.tsx', 'presentation-test', null, jsonb_build_object('coverage', 'supplied section content and plugin slots'), 'tools/planning-db/migrations/615_node_workbench_metric_evidence_ownership.sql', md5('file:NodePropertiesTabs.sectionContent.test:615')),
  ('web.component.canvas.NodePropertiesTabs', 'apps/web/src/app/components/inspector/NodePropertiesTabs.overflow.test.tsx', 'presentation-test', null, jsonb_build_object('coverage', 'secondary section overflow behavior'), 'tools/planning-db/migrations/615_node_workbench_metric_evidence_ownership.sql', md5('file:NodePropertiesTabs.overflow.test:615')),
  ('web.component.canvas.NodePropertiesTabs', 'apps/web/src/app/components/inspector/NodePropertySectionView.test.tsx', 'presentation-test', null, jsonb_build_object('coverage', 'section rows, tables, code, editable slots, and accessible metric evidence hotspots'), 'tools/planning-db/migrations/615_node_workbench_metric_evidence_ownership.sql', md5('file:NodePropertySectionView.test:615'));

-- The host consumes presentation leaves; it does not own their files or tests.
update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb) || jsonb_build_object(
    'retiredForPresentationOwnership', true,
    'retiredReason', 'Owned by web.component.canvas.NodePropertiesTabs; the workbench panel consumes the leaf contract.'
  ),
  source_path = 'tools/planning-db/migrations/615_node_workbench_metric_evidence_ownership.sql',
  source_content_sha256 = md5(component_id || ':' || file_path || ':' || file_role || ':presentation-owner:615'),
  updated_at = now()
where component_id = 'web.component.canvas.CanvasNodeWorkbenchPanel'
  and file_path in (
    'apps/web/src/app/components/inspector/NodePropertiesTabs.tsx',
    'apps/web/src/app/components/inspector/NodePropertySectionView.tsx',
    'apps/web/src/app/components/inspector/NodePropertiesTabs.primarySections.test.tsx',
    'apps/web/src/app/components/inspector/NodePropertySectionView.test.tsx'
  );

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
values
  ('web.component.canvas.NodeWorkbench', 'EV-NODE-WORKBENCH-PROPERTIES-READ-MODEL', 'unit-test', 'current', 'apps/web/src/app/components/inspector/nodePropertiesReadModel.test.ts', 'InspectCanvasNodeProperties', 'node-workbench', 'The passive read model projects canonical sections, explicit absence, and compact measured/estimated metric evidence without fabricating records.', jsonb_build_object('command', 'pnpm --filter @dvt/web exec vitest run src/app/components/inspector/nodePropertiesReadModel.test.ts'), 'tools/planning-db/migrations/615_node_workbench_metric_evidence_ownership.sql', md5('evidence:NodeWorkbench:properties-read-model:615')),
  ('web.component.canvas.NodePropertiesTabs', 'EV-NODE-PROPERTY-SECTION-METRIC-HOTSPOT', 'presentation-test', 'current', 'apps/web/src/app/components/inspector/NodePropertySectionView.test.tsx', 'RenderNodePropertiesTabs', 'node-workbench', 'NodePropertySectionView renders compact metric values through the shared accessible measured/estimated hotspot.', jsonb_build_object('command', 'pnpm --filter @dvt/web exec vitest run src/app/components/inspector/NodePropertySectionView.test.tsx'), 'tools/planning-db/migrations/615_node_workbench_metric_evidence_ownership.sql', md5('evidence:NodePropertySectionView:metric-hotspot:615')),
  ('web.component.canvas.CanvasNodeWorkbenchPanel', 'EV-NODE-WORKBENCH-PANEL-PRESENTATION', 'presentation-test', 'current', 'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx', 'InspectCanvasNodeProperties', 'node-workbench', 'The contextual panel composes supplied node facts and authoring slots without owning leaf presentation files.', jsonb_build_object('command', 'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx'), 'tools/planning-db/migrations/615_node_workbench_metric_evidence_ownership.sql', md5('evidence:CanvasNodeWorkbenchPanel:presentation:615')),
  ('web.component.canvas.CanvasNodeWorkbenchPanel', 'EV-NODE-WORKBENCH-PANEL-DRAG-LIFECYCLE', 'presentation-test', 'current', 'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx', 'InspectCanvasNodeProperties', 'node-workbench', 'The workbench overlay opens only for a selected live node, moves by mouse drag, and closes with the node lifecycle.', jsonb_build_object('command', 'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx'), 'tools/planning-db/migrations/615_node_workbench_metric_evidence_ownership.sql', md5('evidence:CanvasNodeWorkbenchPanel:drag-lifecycle:615'))
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

-- Metric presenter and hotspot participate in the existing inspect query; no
-- parallel command/query intent is introduced.
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
  ('web.component.metrics.SourceObjectMetricEvidencePresenter', 'InspectCanvasNodeProperties', 'projection', 'implemented-projection', jsonb_build_object('name', 'InspectCanvasNodeProperties', 'type', 'query', 'role', 'metric evidence presentation model'), 'tools/planning-db/migrations/615_node_workbench_metric_evidence_ownership.sql', md5('metric-presenter:node-workbench:615')),
  ('web.component.metrics.MetricEvidenceHotspot', 'InspectCanvasNodeProperties', 'projection', 'implemented-projection', jsonb_build_object('name', 'InspectCanvasNodeProperties', 'type', 'query', 'role', 'metric evidence presentation template'), 'tools/planning-db/migrations/615_node_workbench_metric_evidence_ownership.sql', md5('metric-hotspot:node-workbench:615'))
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = excluded.raw_rail,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

update planning_query_store.governance_component_local_definitions
set
  owned_concern = 'Format compact and exact byte values and describe complete metric provenance, acquisition method, confidence, storage basis, and observation scope without rendering DOM.',
  cq_rails = 'RenderCanvasGraphNodeOperationalSummary;RenderSourceImportCatalogView;InspectCanvasNodeProperties',
  source_path = 'apps/web/src/app/services/workspace/sourceObjectMetricEvidencePresentation.ts',
  source_content_sha256 = repeat(md5('web.component.metrics.SourceObjectMetricEvidencePresenter:615'), 2),
  revision = revision + 1
where component_id = 'web.component.metrics.SourceObjectMetricEvidencePresenter';

update planning_query_store.governance_component_local_definitions
set
  cq_rails = 'RenderCanvasGraphNodeOperationalSummary;RenderSourceImportCatalogView;InspectCanvasNodeProperties',
  source_content_sha256 = repeat(md5('web.component.metrics.MetricEvidenceHotspot:615'), 2),
  revision = revision + 1
where component_id = 'web.component.metrics.MetricEvidenceHotspot';

delete from planning_query_store.governance_component_local_semantic_items
where component_id in (
  'web.component.metrics.SourceObjectMetricEvidencePresenter',
  'web.component.metrics.MetricEvidenceHotspot'
)
and item_kind in ('public_api', 'consumer', 'transition');

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  ('web.component.metrics.SourceObjectMetricEvidencePresenter', 'public_api', 'formatSourceObjectMetricByteSize, formatSourceObjectMetricByteDetail, and describeSourceObjectMetricEvidence provide one pure operator-facing metric presentation vocabulary.', 0),
  ('web.component.metrics.SourceObjectMetricEvidencePresenter', 'consumer', 'web.component.canvas.GraphNodeVolumeMetricProjection;SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW;SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-READ-MODEL', 0),
  ('web.component.metrics.SourceObjectMetricEvidencePresenter', 'transition', 'The presenter is canonical when graph, source catalog, and node workbench surfaces delegate metric formatting and evidence wording instead of duplicating either.', 0),
  ('web.component.metrics.MetricEvidenceHotspot', 'public_api', 'MetricEvidenceHotspot renders a compact value, complete evidence detail, focus posture, and supplied measured/estimated tone.', 0),
  ('web.component.metrics.MetricEvidenceHotspot', 'consumer', 'web.component.canvas.GraphNodeMetricHotspot;SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW;SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-PRESENTER', 0),
  ('web.component.metrics.MetricEvidenceHotspot', 'transition', 'The hotspot is canonical when graph, source catalog, and node workbench adapters reuse its tokenized accessible template.', 0)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update architecture.component
set
  public_contract = 'Pure compact/exact byte formatting and complete evidence-detail projection for graph, source catalog, and node workbench presentation',
  updated_at = now()
where component_id = 'web.component.metrics.SourceObjectMetricEvidencePresenter';

update architecture.component
set
  public_contract = 'Node properties read model with explicit absence and complete measured/estimated metric evidence for Canvas workbench sections',
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-READ-MODEL';

delete from architecture.component_relation
where relation_id = 'REL-WEB-CANVAS-NODE-WORKBENCH-OVERLAY-DEPENDS-ON-INSPECTOR-PANEL';

insert into architecture.component_relation (
  relation_id,
  source_component_id,
  target_component_id,
  relation_type,
  direction,
  sync_async,
  contract_id,
  failure_mode,
  authorization_scope,
  source_refs,
  status
)
values
  ('REL-WEB-CANVAS-NODE-WORKBENCH-PANEL-USES-READ-MODEL', 'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL', 'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-READ-MODEL', 'depends_on', 'outbound', 'sync', null, 'The workbench renders ad hoc node facts outside the canonical read model', 'workspace', jsonb_build_array('apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx', 'apps/web/src/app/components/inspector/nodePropertiesReadModel.ts'), 'implemented'),
  ('REL-WEB-CANVAS-NODE-WORKBENCH-PANEL-USES-TABS-PRESENTER', 'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL', 'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-PRESENTER', 'depends_on', 'outbound', 'sync', null, 'The workbench duplicates tab or section presentation markup', 'workspace', jsonb_build_array('apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx', 'apps/web/src/app/components/inspector/NodePropertiesTabs.tsx'), 'implemented'),
  ('REL-WEB-CANVAS-NODE-PROPERTIES-READ-MODEL-USES-METRIC-PRESENTER', 'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-READ-MODEL', 'web.component.metrics.SourceObjectMetricEvidencePresenter', 'depends_on', 'outbound', 'sync', 'CONTRACT-SOURCE-OBJECT-CATALOG-V1', 'Node properties duplicate or mislabel source metric evidence', 'workspace', jsonb_build_array('apps/web/src/app/components/inspector/nodePropertiesReadModel.ts', 'apps/web/src/app/services/workspace/sourceObjectMetricEvidencePresentation.ts'), 'implemented'),
  ('REL-WEB-CANVAS-NODE-PROPERTIES-TABS-USES-METRIC-HOTSPOT', 'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-PRESENTER', 'web.component.metrics.MetricEvidenceHotspot', 'depends_on', 'outbound', 'sync', null, 'Node properties lose consistent hover and keyboard evidence disclosure', 'workspace', jsonb_build_array('apps/web/src/app/components/inspector/NodePropertySectionView.tsx', 'apps/web/src/app/components/metrics/MetricEvidenceHotspot.tsx'), 'implemented')
on conflict (relation_id) do update set
  source_component_id = excluded.source_component_id,
  target_component_id = excluded.target_component_id,
  relation_type = excluded.relation_type,
  direction = excluded.direction,
  sync_async = excluded.sync_async,
  contract_id = excluded.contract_id,
  failure_mode = excluded.failure_mode,
  authorization_scope = excluded.authorization_scope,
  source_refs = excluded.source_refs,
  status = excluded.status,
  updated_at = now();

update architecture.component_relation
set
  source_refs = jsonb_build_array(
    'apps/web/src/app/plugins/graph/graphNodeSourceMetricProjection.ts',
    'apps/web/src/app/plugins/graph/graphNodeCardStrategyUtils.ts',
    'apps/web/src/app/services/workspace/sourceObjectMetricEvidencePresentation.ts'
  ),
  updated_at = now()
where relation_id = 'REL-GRAPH-VOLUME-PROJECTION-USES-METRIC-PRESENTER';

insert into architecture.component_test (
  test_id,
  component_id,
  test_path,
  test_kind,
  coverage_level,
  required,
  validation_command
)
values (
  'TEST-WEB-CANVAS-NODE-PROPERTY-SECTION-PRESENTATION',
  'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-PRESENTER',
  'apps/web/src/app/components/inspector/NodePropertySectionView.test.tsx',
  'unit',
  'behavior',
  true,
  'pnpm --filter @dvt/web exec vitest run src/app/components/inspector/NodePropertySectionView.test.tsx'
)
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;
