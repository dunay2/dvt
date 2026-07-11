-- Production hardening for source-object metric evidence and its Canvas health projection.
-- The existing ListWarehouseConnectionTables and TestWarehouseConnection rails remain
-- authoritative. This migration makes their cost/freshness semantics explicit and
-- registers the already-implemented Canvas summary/popover interactions as canonical rails.

update planning_query_store.feature_mechanization_local_rails
set
  ddd_owner = 'SYS-API-INFRA-WAREHOUSE-SOURCES',
  raw_rail = coalesce(raw_rail, '{}'::jsonb) || jsonb_build_object(
    'dddOwner', 'SYS-API-INFRA-WAREHOUSE-SOURCES',
    'readModel', 'SourceObjectMetricEvidence',
    'costPolicy', 'Catalog discovery may inspect source objects, but exact data scans must have a server-side timeout budget.',
    'freshnessPolicy', 'Every metric pair carries one observedAt timestamp.',
    'byteSemantics', 'byteSize declares physical-allocation, logical-payload, or lower-bound basis.'
  ),
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb) || jsonb_build_object(
    'productionHardening', jsonb_build_object(
      'status', 'implementing',
      'observedAtRequired', true,
      'byteSizeBasisRequired', true,
      'metadataPermissionFallback', 'data-plane LIMIT 0',
      'exactCountPolicy', 'bounded server-side statement timeout',
      'catalogObjectLimit', 500,
      'noUnboundedColumnTruncation', true
    )
  ),
  source_path = 'tools/planning-db/migrations/600_source_object_metric_production_hardening.sql',
  source_content_sha256 = md5('ListWarehouseConnectionTables:source-object-metric-production-hardening:600'),
  revision = revision + 1,
  updated_at = now()
where rail_name = 'ListWarehouseConnectionTables'
  and rail_type = 'query'
  and lower(coalesce(rail_status, '')) not in ('deprecated', 'retired');

update planning_query_store.feature_mechanization_local_rails
set
  raw_rail = coalesce(raw_rail, '{}'::jsonb) || jsonb_build_object(
    'costPolicy', 'TestWarehouseConnection performs one lightweight provider-catalog query and never loads per-object metrics or scans source data.'
  ),
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb) || jsonb_build_object(
    'productionHardening', jsonb_build_object(
      'status', 'implementing',
      'lightweightConnectionTest', true,
      'loadsObjectMetrics', false,
      'scansSourceData', false
    )
  ),
  source_path = 'tools/planning-db/migrations/600_source_object_metric_production_hardening.sql',
  source_content_sha256 = md5('TestWarehouseConnection:lightweight-probe:600'),
  revision = revision + 1,
  updated_at = now()
where rail_name = 'TestWarehouseConnection'
  and rail_type = 'command'
  and lower(coalesce(rail_status, '')) not in ('deprecated', 'retired');

with rail(
  rail_id,
  rail_name,
  rail_type,
  ddd_owner,
  symbol_refs,
  implementation_refs,
  raw_rail
) as (
  values
    (
      'local#E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1#query#rendercanvasgraphnodeoperationalsummary',
      'RenderCanvasGraphNodeOperationalSummary',
      'query',
      'web.component.canvas.GraphNodeOperationalSummary',
      jsonb_build_array(
        'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts#buildGraphNodeOperationalSummary'
      ),
      jsonb_build_array(
        'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts',
        'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.test.ts'
      ),
      jsonb_build_object(
        'name', 'RenderCanvasGraphNodeOperationalSummary',
        'type', 'query',
        'dddOwner', 'web.component.canvas.GraphNodeOperationalSummary',
        'projectionStrategy', 'explicit source or execution strategy',
        'status', 'implemented'
      )
    ),
    (
      'local#E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1#query#rendercanvasnodehealthpopover',
      'RenderCanvasNodeHealthPopover',
      'query',
      'web.component.canvas.GraphNodeHealthPopover',
      jsonb_build_array(
        'apps/web/src/app/plugins/graph/GraphNodeHealthPopoverView.tsx#GraphNodeHealthPopoverView'
      ),
      jsonb_build_array(
        'apps/web/src/app/plugins/graph/GraphNodeHealthPopoverView.tsx',
        'apps/web/src/app/plugins/graph/GraphNodeHealthPopoverView.test.tsx'
      ),
      jsonb_build_object(
        'name', 'RenderCanvasNodeHealthPopover',
        'type', 'query',
        'dddOwner', 'web.component.canvas.GraphNodeHealthPopover',
        'accessibility', 'Metric detail is visible and exposed to assistive technology.',
        'status', 'implemented'
      )
    ),
    (
      'local#E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1#command#opencanvasnodehealthpopover',
      'OpenCanvasNodeHealthPopover',
      'command',
      'web.component.canvas.GraphNodeHealthPopover',
      jsonb_build_array(
        'apps/web/src/app/views/canvas/CanvasViewport.tsx#CanvasViewport'
      ),
      jsonb_build_array(
        'apps/web/src/app/views/canvas/CanvasViewport.tsx',
        'apps/web/src/app/views/canvas/CanvasViewport.nodeOperationalRail.test.tsx'
      ),
      jsonb_build_object(
        'name', 'OpenCanvasNodeHealthPopover',
        'type', 'command',
        'dddOwner', 'web.component.canvas.GraphNodeHealthPopover',
        'positionPolicy', 'Anchor to the operational rail and remain inside the viewport.',
        'status', 'implemented'
      )
    ),
    (
      'local#E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1#command#closecanvasnodehealthpopover',
      'CloseCanvasNodeHealthPopover',
      'command',
      'web.component.canvas.GraphNodeHealthPopover',
      jsonb_build_array(
        'apps/web/src/app/views/canvas/CanvasViewport.tsx#CanvasViewport'
      ),
      jsonb_build_array(
        'apps/web/src/app/views/canvas/CanvasViewport.tsx',
        'apps/web/src/app/plugins/graph/GraphNodeHealthPopoverView.tsx',
        'apps/web/src/app/views/canvas/CanvasViewport.nodeOperationalRail.test.tsx'
      ),
      jsonb_build_object(
        'name', 'CloseCanvasNodeHealthPopover',
        'type', 'command',
        'dddOwner', 'web.component.canvas.GraphNodeHealthPopover',
        'focusPolicy', 'Escape restores focus to the triggering operational rail.',
        'status', 'implemented'
      )
    )
)
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
select
  rail.rail_id,
  'E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1',
  'implemented',
  rail.rail_name,
  lower(rail.rail_name),
  rail.rail_type,
  rail.ddd_owner,
  'implemented',
  rail.symbol_refs,
  rail.implementation_refs,
  '[]'::jsonb,
  jsonb_build_array(
    'AGENTS.md',
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md'
  ),
  rail.implementation_refs,
  jsonb_build_array(
    'pnpm --filter @dvt/web test:architecture:run',
    'pnpm --filter @dvt/web test:presentation:run'
  ),
  jsonb_build_array(
    'pnpm --filter @dvt/web typecheck',
    'pnpm --filter @dvt/web lint',
    'pnpm --filter @dvt/web test:e2e:source-import:live'
  ),
  'tools/planning-db/migrations/600_source_object_metric_production_hardening.sql',
  md5(rail.rail_name || ':source-object-metric-production-hardening:600'),
  rail.raw_rail,
  jsonb_build_object(
    'version', 1,
    'featureId', 'E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'commandQueryRails', jsonb_build_array(rail.raw_rail),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/architecture/command-query-rail-governance.md'
    ),
    'allowedImplementationSurfaces', rail.implementation_refs,
    'symbols', (
      select jsonb_agg(
        jsonb_build_object(
          'name', split_part(symbol_ref, '#', 2),
          'path', split_part(symbol_ref, '#', 1),
          'dddOwner', rail.ddd_owner,
          'cqRails', jsonb_build_array(rail.rail_name)
        )
      )
      from jsonb_array_elements_text(rail.symbol_refs) symbol(symbol_ref)
    )
  ),
  0,
  'codex'
from rail
on conflict (rail_id) do update set
  mechanization_status = excluded.mechanization_status,
  rail_name = excluded.rail_name,
  normalized_rail_name = excluded.normalized_rail_name,
  rail_type = excluded.rail_type,
  ddd_owner = excluded.ddd_owner,
  rail_status = excluded.rail_status,
  symbol_refs = excluded.symbol_refs,
  implementation_refs = excluded.implementation_refs,
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

update planning_query_store.governance_component_local_definitions
set
  owned_concern = 'Own the provider-neutral invariant that row-count and byte-size evidence are complete, timestamped, safe, and explicit about provenance, method, confidence, and byte-size basis.',
  cq_rails = 'ListWarehouseConnectionTables;ImportWarehouseSources',
  source_content_sha256 = repeat(md5('api.component.sourceImport.SourceObjectMetricEvidence:observed-at-byte-basis:600'), 2),
  revision = revision + 1
where component_id = 'api.component.sourceImport.SourceObjectMetricEvidence';

update architecture.component_responsibility
set
  responsibility = 'Keep row-count and byte-size values complete, non-negative, timestamped, provider-neutral, and explicit about provenance, method, confidence, and physical-versus-logical byte basis.'
where responsibility_id = 'RESP-SOURCE-OBJECT-METRIC-EVIDENCE-INVARIANT';

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values
  ('SYS-API-INFRA-WAREHOUSE-SOURCES', 'owns', 'apps/api/src/infrastructure/warehouseSourceImport/postgresSourceObjectMetricEvidence.ts', 10),
  ('SYS-API-INFRA-WAREHOUSE-SOURCES', 'owns', 'apps/api/test/infrastructure/warehouseSourceImport/postgresSourceObjectMetricEvidence.test.ts', 11),
  ('SYS-API-INFRA-WAREHOUSE-SOURCES', 'owns', 'apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts', 12)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

update architecture.component_relation
set
  source_component_id = 'SYS-API-INFRA-WAREHOUSE-SOURCES',
  source_refs = jsonb_build_array(
    'ListWarehouseConnectionTables',
    'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.ts',
    'apps/api/src/infrastructure/warehouseSourceImport/postgresSourceObjectMetricEvidence.ts'
  ),
  updated_at = now()
where relation_id = 'REL-WAREHOUSE-PROBE-USES-SOURCE-METRIC-EVIDENCE';

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
  ('TEST-POSTGRES-SOURCE-OBJECT-METRIC-EVIDENCE', 'SYS-API-INFRA-WAREHOUSE-SOURCES', 'apps/api/test/infrastructure/warehouseSourceImport/postgresSourceObjectMetricEvidence.test.ts', 'unit', 'behavior', true, 'pnpm --filter dvt-api exec vitest run test/infrastructure/warehouseSourceImport/postgresSourceObjectMetricEvidence.test.ts'),
  ('TEST-WAREHOUSE-SOURCE-PROBE-PRODUCTION-POLICY', 'SYS-API-INFRA-WAREHOUSE-SOURCES', 'apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts', 'integration', 'boundary', true, 'pnpm --filter dvt-api exec vitest run test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts'),
  ('TEST-GRAPH-NODE-HEALTH-POPOVER-ACCESSIBILITY', 'web.component.canvas.GraphNodeHealthPopover', 'apps/web/src/app/plugins/graph/GraphNodeHealthPopoverView.test.tsx', 'unit', 'behavior', true, 'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/plugins/graph/GraphNodeHealthPopoverView.test.tsx'),
  ('TEST-CANVAS-NODE-HEALTH-POPOVER-LIFECYCLE', 'web.component.canvas.GraphNodeHealthPopover', 'apps/web/src/app/views/canvas/CanvasViewport.nodeOperationalRail.test.tsx', 'integration', 'behavior', true, 'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/CanvasViewport.nodeOperationalRail.test.tsx')
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

insert into architecture.component_responsibility (
  responsibility_id,
  component_id,
  responsibility,
  reason_to_change,
  ddd_owner,
  status
)
values (
  'RESP-API-WAREHOUSE-SOURCE-PROBE-PRODUCTION-POLICY',
  'SYS-API-INFRA-WAREHOUSE-SOURCES',
  'Keep connection tests lightweight, isolate metadata permission fallbacks, and bound any exact source-data scan used to complete required metric evidence.',
  'Provider probing cost, permission fallback, or source-object metric acquisition policy changes.',
  'ApiWarehouseSourceInfrastructureAdapter',
  'implemented'
)
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

insert into architecture.component_responsibility (
  responsibility_id,
  component_id,
  responsibility,
  reason_to_change,
  ddd_owner,
  status
)
values
  (
    'RESP-GRAPH-NODE-OPERATIONAL-SUMMARY-STRATEGY',
    'web.component.canvas.GraphNodeOperationalSummary',
    'Select source-health or execution summary projection through an explicit strategy discriminator rather than incidental metadata keys.',
    'Graph node operational summary strategy or metric composition changes.',
    'CanvasGraphNodeMetricPresentationModel',
    'implemented'
  ),
  (
    'RESP-GRAPH-NODE-HEALTH-POPOVER-PRODUCTION-UX',
    'web.component.canvas.GraphNodeHealthPopover',
    'Render visible and accessible metric evidence details, remain inside the Canvas viewport, and restore trigger focus after Escape.',
    'Graph node health popover interaction, accessibility, or positioning changes.',
    'Canvas Presentation',
    'implemented'
  )
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

refresh materialized view planning_query_store.component_engineering_file_ownership_projection;
