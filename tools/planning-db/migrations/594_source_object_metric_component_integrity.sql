-- Reconcile source-object metric component ownership with the canonical
-- engineering hierarchy. API warehouse behavior remains owned by its existing
-- application and infrastructure components; only the provider-neutral value
-- object and the three focused web presentation components are new leaves.

update architecture.component_relation
set
  source_component_id = 'SYS-API-INFRA-WAREHOUSE-SOURCES',
  updated_at = now()
where relation_id = 'REL-WAREHOUSE-PROBE-USES-SOURCE-METRIC-EVIDENCE';

update architecture.component_relation
set
  source_component_id = 'SYS-API-APPLICATION-SERVICES-WAREHOUSE-SOURCES',
  updated_at = now()
where relation_id = 'REL-IMPORT-SOURCES-PERSISTS-SOURCE-METRIC-EVIDENCE';

delete from architecture.component
where component_id in (
  'api.component.warehouseSourceImport.WorkspaceWarehouseConnectionProbe',
  'api.component.warehouseSourceImport.ImportWarehouseSourcesUseCase'
);

update architecture.component
set
  parent_component_id = case component_id
    when 'api.component.sourceImport.SourceObjectMetricEvidence' then 'SYS-API-ROOT'
    when 'web.component.workspace.SourceObjectMetricEvidenceModel' then 'SYS-WEB-SERVICES-WORKSPACE'
    else 'SYS-WEB-CANVAS-GRAPH-SURFACE'
  end,
  updated_at = now()
where component_id in (
  'api.component.sourceImport.SourceObjectMetricEvidence',
  'web.component.workspace.SourceObjectMetricEvidenceModel',
  'web.component.canvas.GraphNodeVolumeMetricProjection',
  'web.component.canvas.GraphNodeMetricHotspot'
);

with leaf(
  component_id,
  source_path,
  name,
  parent_id,
  owned_concern,
  ddd_owner,
  cq_rails
) as (
  values
    (
      'api.component.sourceImport.SourceObjectMetricEvidence',
      'apps/api/src/domain/sourceImport/sourceObjectMetricEvidence.ts',
      'Source object metric evidence',
      'SYS-API-ROOT',
      'Own the provider-neutral invariant that row-count and byte-size evidence are complete, safe, and explicit about provenance, method, and confidence.',
      'SourceImportMetricEvidence',
      'ListWarehouseConnectionTables;ImportWarehouseSources'
    ),
    (
      'web.component.workspace.SourceObjectMetricEvidenceModel',
      'apps/web/src/app/services/workspace/sourceObjectMetricEvidence.ts',
      'Source object metric evidence model',
      'SYS-WEB-SERVICES-WORKSPACE',
      'Validate source-object metric evidence received by web workspace adapters without formatting or rendering it.',
      'WorkspaceSourceMetricReadModel',
      'ListWarehouseConnectionTables;ImportWarehouseSources'
    ),
    (
      'web.component.canvas.GraphNodeVolumeMetricProjection',
      'apps/web/src/app/plugins/graph/graphNodeSourceMetricProjection.ts',
      'Graph node volume metric projection',
      'SYS-WEB-CANVAS-GRAPH-SURFACE',
      'Project validated source evidence or non-source runtime volume into graph-card presentation metrics without rendering DOM.',
      'CanvasGraphNodeMetricPresentationModel',
      'RenderCanvasGraphNodeOperationalSummary'
    ),
    (
      'web.component.canvas.GraphNodeMetricHotspot',
      'apps/web/src/app/plugins/graph/GraphNodeMetricHotspot.tsx',
      'Graph node metric hotspot',
      'SYS-WEB-CANVAS-GRAPH-SURFACE',
      'Render a supplied compact graph metric as an accessible hover and keyboard-focus detail hotspot without deriving metric semantics.',
      'CanvasGraphNodeMetricPresentation',
      'RenderCanvasGraphNodeCard;RenderCanvasGraphNodeOperationalSummary'
    )
)
insert into planning_query_store.governance_component_local_definitions (
  component_id,
  source_path,
  source_content_sha256,
  revision,
  name,
  level,
  parent_id,
  root_unit,
  domain_unit,
  status,
  children_required,
  owned_concern,
  ddd_owner,
  cq_rails,
  created_by
)
select
  leaf.component_id,
  leaf.source_path,
  coalesce(
    (
      select file_ref.content_hash
      from planning_query_store.governance_files file_ref
      where file_ref.path = leaf.source_path
    ),
    repeat('0', 64)
  ),
  0,
  leaf.name,
  'component',
  leaf.parent_id,
  'SYS-DVT',
  'SYS-DVT',
  'review',
  false,
  leaf.owned_concern,
  leaf.ddd_owner,
  leaf.cq_rails,
  'codex'
from leaf
on conflict (component_id) do update set
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  name = excluded.name,
  parent_id = excluded.parent_id,
  status = excluded.status,
  children_required = excluded.children_required,
  owned_concern = excluded.owned_concern,
  ddd_owner = excluded.ddd_owner,
  cq_rails = excluded.cq_rails;

delete from planning_query_store.governance_component_local_ownership_patterns
where component_id in (
  'api.component.sourceImport.SourceObjectMetricEvidence',
  'web.component.workspace.SourceObjectMetricEvidenceModel',
  'web.component.canvas.GraphNodeVolumeMetricProjection',
  'web.component.canvas.GraphNodeMetricHotspot'
);

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values
  ('api.component.sourceImport.SourceObjectMetricEvidence', 'owns', 'apps/api/src/domain/sourceImport/sourceObjectMetricEvidence.ts', 0),
  ('web.component.workspace.SourceObjectMetricEvidenceModel', 'owns', 'apps/web/src/app/services/workspace/sourceObjectMetricEvidence.ts', 0),
  ('web.component.canvas.GraphNodeVolumeMetricProjection', 'owns', 'apps/web/src/app/plugins/graph/graphNodeSourceMetricProjection.ts', 0),
  ('web.component.canvas.GraphNodeMetricHotspot', 'owns', 'apps/web/src/app/plugins/graph/GraphNodeMetricHotspot.tsx', 0)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

delete from planning_query_store.governance_component_local_semantic_items
where component_id in (
  'api.component.sourceImport.SourceObjectMetricEvidence',
  'web.component.workspace.SourceObjectMetricEvidenceModel',
  'web.component.canvas.GraphNodeVolumeMetricProjection',
  'web.component.canvas.GraphNodeMetricHotspot'
);

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  ('api.component.sourceImport.SourceObjectMetricEvidence', 'responsibility', 'Keep source row-count and byte-size evidence complete, safe, provider-neutral, and explicit about provenance.', 0),
  ('api.component.sourceImport.SourceObjectMetricEvidence', 'non_goal', 'Does not query a provider, format values, or render user interface.', 0),
  ('api.component.sourceImport.SourceObjectMetricEvidence', 'reason_to_change', 'The provider-neutral source metric evidence invariant changes.', 0),
  ('api.component.sourceImport.SourceObjectMetricEvidence', 'public_api', 'SourceObjectMetricEvidence; createSourceObjectMetricEvidence', 0),
  ('api.component.sourceImport.SourceObjectMetricEvidence', 'invariant', 'A source object never exposes row count without byte size or byte size without row count.', 0),
  ('api.component.sourceImport.SourceObjectMetricEvidence', 'fowler_signal', 'Value Object', 0),
  ('web.component.workspace.SourceObjectMetricEvidenceModel', 'responsibility', 'Validate the transport evidence pair before web presentation consumes it.', 0),
  ('web.component.workspace.SourceObjectMetricEvidenceModel', 'non_goal', 'Does not estimate, format, color, or render source metrics.', 0),
  ('web.component.workspace.SourceObjectMetricEvidenceModel', 'reason_to_change', 'The web-facing source metric transport contract changes.', 0),
  ('web.component.workspace.SourceObjectMetricEvidenceModel', 'public_api', 'readSourceObjectMetricEvidence', 0),
  ('web.component.workspace.SourceObjectMetricEvidenceModel', 'invariant', 'Partial or unsafe evidence fails closed.', 0),
  ('web.component.workspace.SourceObjectMetricEvidenceModel', 'fowler_signal', 'Gateway Read Model', 0),
  ('web.component.canvas.GraphNodeVolumeMetricProjection', 'responsibility', 'Project valid source evidence and runtime volume into graph presentation metrics.', 0),
  ('web.component.canvas.GraphNodeVolumeMetricProjection', 'non_goal', 'Does not render DOM, inspect provider metadata, or execute graph commands.', 0),
  ('web.component.canvas.GraphNodeVolumeMetricProjection', 'reason_to_change', 'Graph volume metric presentation semantics change.', 0),
  ('web.component.canvas.GraphNodeVolumeMetricProjection', 'public_api', 'buildGraphNodeVolumeMetricProjection', 0),
  ('web.component.canvas.GraphNodeVolumeMetricProjection', 'invariant', 'Measured evidence uses success tone; estimated evidence uses warning tone; row-only source metrics are suppressed.', 0),
  ('web.component.canvas.GraphNodeVolumeMetricProjection', 'fowler_signal', 'Presentation Model', 0),
  ('web.component.canvas.GraphNodeMetricHotspot', 'responsibility', 'Render compact metric values with accessible full detail on hover and keyboard focus.', 0),
  ('web.component.canvas.GraphNodeMetricHotspot', 'non_goal', 'Does not derive values, evidence provenance, or metric tone.', 0),
  ('web.component.canvas.GraphNodeMetricHotspot', 'reason_to_change', 'Metric detail interaction, accessibility, or graph visual tokens change.', 0),
  ('web.component.canvas.GraphNodeMetricHotspot', 'public_api', 'GraphNodeMetricHotspot', 0),
  ('web.component.canvas.GraphNodeMetricHotspot', 'invariant', 'Every supplied detail is discoverable without a native title attribute.', 0),
  ('web.component.canvas.GraphNodeMetricHotspot', 'fowler_signal', 'View Component', 0)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

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
  ('REL-API-ROOT-CONTAINS-SOURCE-OBJECT-METRIC-EVIDENCE', 'SYS-API-ROOT', 'api.component.sourceImport.SourceObjectMetricEvidence', 'contains', 'outbound', 'sync', null, 'source metric evidence has no explicit domain owner', 'architecture', jsonb_build_array('apps/api/src/domain/sourceImport/sourceObjectMetricEvidence.ts'), 'implemented'),
  ('REL-WEB-WORKSPACE-CONTAINS-SOURCE-METRIC-MODEL', 'SYS-WEB-SERVICES-WORKSPACE', 'web.component.workspace.SourceObjectMetricEvidenceModel', 'contains', 'outbound', 'sync', null, 'transport validation remains implicit in workspace adapters', 'architecture', jsonb_build_array('apps/web/src/app/services/workspace/sourceObjectMetricEvidence.ts'), 'implemented'),
  ('REL-GRAPH-SURFACE-CONTAINS-VOLUME-METRIC-PROJECTION', 'SYS-WEB-CANVAS-GRAPH-SURFACE', 'web.component.canvas.GraphNodeVolumeMetricProjection', 'contains', 'outbound', 'sync', null, 'graph metric projection ownership is ambiguous', 'architecture', jsonb_build_array('apps/web/src/app/plugins/graph/graphNodeSourceMetricProjection.ts'), 'implemented'),
  ('REL-GRAPH-SURFACE-CONTAINS-METRIC-HOTSPOT', 'SYS-WEB-CANVAS-GRAPH-SURFACE', 'web.component.canvas.GraphNodeMetricHotspot', 'contains', 'outbound', 'sync', null, 'metric detail interaction ownership is ambiguous', 'architecture', jsonb_build_array('apps/web/src/app/plugins/graph/GraphNodeMetricHotspot.tsx'), 'implemented')
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

insert into architecture.component_port (
  port_id,
  component_id,
  port_name,
  port_kind,
  direction,
  input_contract_id,
  output_contract_id,
  negative_tests,
  status
)
values
  ('PORT-SOURCE-OBJECT-METRIC-EVIDENCE-VALIDATE', 'api.component.sourceImport.SourceObjectMetricEvidence', 'ValidateSourceObjectMetricEvidence', 'api', 'inbound', 'CONTRACT-SOURCE-OBJECT-METRIC-EVIDENCE', 'CONTRACT-SOURCE-OBJECT-METRIC-EVIDENCE', array['reject partial row/byte pairs', 'reject negative or unsafe values']::text[], 'implemented'),
  ('PORT-WEB-SOURCE-METRIC-EVIDENCE-READ', 'web.component.workspace.SourceObjectMetricEvidenceModel', 'ReadSourceObjectMetricEvidence', 'query', 'inbound', 'CONTRACT-SOURCE-OBJECT-METRIC-EVIDENCE', 'CONTRACT-SOURCE-OBJECT-METRIC-EVIDENCE', array['return null for partial evidence', 'return null for unsafe values']::text[], 'implemented'),
  ('PORT-GRAPH-VOLUME-METRIC-PROJECTION-READ', 'web.component.canvas.GraphNodeVolumeMetricProjection', 'RenderCanvasGraphNodeOperationalSummary', 'query', 'inbound', 'CONTRACT-SOURCE-OBJECT-METRIC-EVIDENCE', null, array['suppress row-only source metrics', 'do not relabel measured values as estimated']::text[], 'implemented'),
  ('PORT-GRAPH-NODE-METRIC-HOTSPOT-RENDER', 'web.component.canvas.GraphNodeMetricHotspot', 'RenderCanvasGraphNodeMetricDetail', 'ui-action', 'inbound', null, null, array['do not use native title attributes', 'keep details keyboard discoverable']::text[], 'implemented')
on conflict (port_id) do update set
  component_id = excluded.component_id,
  port_name = excluded.port_name,
  port_kind = excluded.port_kind,
  direction = excluded.direction,
  input_contract_id = excluded.input_contract_id,
  output_contract_id = excluded.output_contract_id,
  negative_tests = excluded.negative_tests,
  status = excluded.status;

insert into architecture.component_test (
  test_id,
  component_id,
  test_path,
  test_kind,
  coverage_level,
  required,
  validation_command
)
values
  ('TEST-SOURCE-OBJECT-METRIC-EVIDENCE', 'api.component.sourceImport.SourceObjectMetricEvidence', 'apps/api/test/domain/sourceImport/sourceObjectMetricEvidence.test.ts', 'unit', 'behavior', true, 'pnpm --filter dvt-api exec vitest run test/domain/sourceImport/sourceObjectMetricEvidence.test.ts'),
  ('TEST-WEB-SOURCE-OBJECT-METRIC-EVIDENCE', 'web.component.workspace.SourceObjectMetricEvidenceModel', 'apps/web/src/app/services/workspace/sourceObjectMetricEvidence.test.ts', 'unit', 'behavior', true, 'pnpm --filter @dvt/web exec vitest run src/app/services/workspace/sourceObjectMetricEvidence.test.ts'),
  ('TEST-GRAPH-NODE-VOLUME-METRIC-PROJECTION', 'web.component.canvas.GraphNodeVolumeMetricProjection', 'apps/web/src/app/plugins/graph/graphNodeSourceMetricProjection.test.ts', 'unit', 'behavior', true, 'pnpm --filter @dvt/web exec vitest run src/app/plugins/graph/graphNodeSourceMetricProjection.test.ts'),
  ('TEST-GRAPH-NODE-METRIC-HOTSPOT', 'web.component.canvas.GraphNodeMetricHotspot', 'apps/web/src/app/plugins/graph/GraphNodeMetricHotspot.test.tsx', 'unit', 'behavior', true, 'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/plugins/graph/GraphNodeMetricHotspot.test.tsx')
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

insert into architecture.component_observability (
  observability_id,
  component_id,
  signal_name,
  signal_kind,
  required,
  status
)
values
  ('OBS-SOURCE-OBJECT-METRIC-EVIDENCE-TESTS', 'api.component.sourceImport.SourceObjectMetricEvidence', 'Value-object validity is observable through its focused domain test and component-integrity profile; runtime telemetry is not applicable.', 'log', true, 'not_applicable'),
  ('OBS-WEB-SOURCE-METRIC-EVIDENCE-TESTS', 'web.component.workspace.SourceObjectMetricEvidenceModel', 'Transport validation is observable through focused read-model tests and component-integrity; runtime telemetry is not applicable.', 'log', true, 'not_applicable'),
  ('OBS-GRAPH-VOLUME-METRIC-PROJECTION-TESTS', 'web.component.canvas.GraphNodeVolumeMetricProjection', 'Presentation projection behavior is observable through focused tests and component-integrity; runtime telemetry is not applicable.', 'log', true, 'not_applicable'),
  ('OBS-GRAPH-NODE-METRIC-HOTSPOT-TESTS', 'web.component.canvas.GraphNodeMetricHotspot', 'Accessible tooltip behavior is observable through focused presentation tests and browser QA; runtime telemetry is not applicable.', 'log', true, 'not_applicable')
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;

refresh materialized view planning_query_store.component_engineering_file_ownership_projection;
