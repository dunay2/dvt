-- Register GraphNodeColumnSection as the focused column-disclosure leaf owned
-- by the graph node card presentation surface.

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
  'web.component.canvas.GraphNodeColumnSection',
  'GraphNodeColumnSection',
  'table',
  'current',
  'extract',
  'Frontend / Canvas',
  'Render recorded graph-node columns as a compact disclosure without deciding metadata, selection, or schema semantics.',
  '@dvt/web',
  '/canvas',
  'dbt;dvt',
  '[]'::jsonb,
  jsonb_build_array('EV-CANVAS-GRAPH-NODE-COLUMN-SECTION-PRESENTATION'),
  jsonb_build_object(
    'dbFirst', true,
    'parentComponentId', 'web.component.canvas.GraphNodeCardView',
    'governingRail', 'RenderCanvasGraphNodeColumnSection',
    'doesNotOwnColumnSelection', true,
    'doesNotInventMetadata', true,
    'copyLocale', 'es'
  ),
  'tools/planning-db/migrations/479_graph_node_column_section_component.sql',
  md5('component:GraphNodeColumnSection:479')
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
values (
  'web.component.canvas.GraphNodeColumnSection',
  'RenderCanvasGraphNodeColumnSection',
  'local-query',
  'implemented-local',
  jsonb_build_object(
    'kind', 'query',
    'dddObject', 'GraphNodeColumnSection',
    'readModel', 'RecordedGraphNodeColumns',
    'applicationPort', 'graph-node-column-section',
    'adapterSurface', 'apps/web/src/app/plugins/graph/GraphNodeColumnSection.tsx',
    'scope', 'canvas_presentation',
    'authorization', 'inherits_canvas_visibility',
    'negativeTests', jsonb_build_array(
      'empty columns render count without placeholder rows',
      'collapsed disclosure does not expose column rows',
      'expanded disclosure renders only recorded column names and types'
    )
  ),
  'tools/planning-db/migrations/479_graph_node_column_section_component.sql',
  md5('rail:GraphNodeColumnSection:RenderCanvasGraphNodeColumnSection:479')
)
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = excluded.raw_rail,
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
    'web.component.canvas.GraphNodeColumnSection',
    'apps/web/src/app/plugins/graph/GraphNodeColumnSection.tsx',
    'presentation',
    'GraphNodeColumnSection;GraphNodeColumn',
    jsonb_build_object(
      'rail', 'RenderCanvasGraphNodeColumnSection',
      'responsibility', 'Render a localized disclosure for recorded columns.',
      'doesNotComputeColumns', true
    ),
    'tools/planning-db/migrations/479_graph_node_column_section_component.sql',
    md5('file:GraphNodeColumnSection.tsx:479')
  ),
  (
    'web.component.canvas.GraphNodeColumnSection',
    'apps/web/src/app/plugins/graph/GraphNodeColumnSection.test.tsx',
    'presentation-test',
    null,
    jsonb_build_object(
      'rail', 'RenderCanvasGraphNodeColumnSection',
      'redGreen', true,
      'proves', 'Column disclosure copy, collapsed state, expanded rows, and no placeholder metadata.'
    ),
    'tools/planning-db/migrations/479_graph_node_column_section_component.sql',
    md5('file:GraphNodeColumnSection.test.tsx:479')
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
  'web.component.canvas.GraphNodeColumnSection',
  'EV-CANVAS-GRAPH-NODE-COLUMN-SECTION-PRESENTATION',
  'presentation-test',
  'current',
  'apps/web/src/app/plugins/graph/GraphNodeColumnSection.test.tsx',
  'RenderCanvasGraphNodeColumnSection',
  'graph-node-column-section',
  'GraphNodeColumnSection renders localized column disclosure from recorded column data only.',
  jsonb_build_object(
    'command',
    'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/plugins/graph/GraphNodeColumnSection.test.tsx',
    'noPlaceholderMetadata',
    true,
    'copyLocale',
    'es'
  ),
  'tools/planning-db/migrations/479_graph_node_column_section_component.sql',
  md5('evidence:GraphNodeColumnSection:presentation:479')
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
  'web.component.canvas.GraphNodeColumnSection',
  'GraphNodeColumnSection',
  'ui-view',
  'ui',
  'Frontend / Canvas',
  'apps/web/src/app/plugins/graph/GraphNodeColumnSection.tsx',
  'RenderCanvasGraphNodeColumnSection',
  'react',
  'medium',
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

insert into architecture.component_responsibility (
  responsibility_id,
  component_id,
  responsibility,
  reason_to_change,
  ddd_owner,
  status
)
values (
  'RESP-GRAPH-NODE-COLUMN-SECTION',
  'web.component.canvas.GraphNodeColumnSection',
  'Render recorded graph-node columns as a localized collapsible presentation leaf.',
  'Change only when the card column disclosure presentation or copy changes.',
  'Frontend / Canvas',
  'implemented'
)
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
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
values (
  'TEST-GRAPH-NODE-COLUMN-SECTION',
  'web.component.canvas.GraphNodeColumnSection',
  'apps/web/src/app/plugins/graph/GraphNodeColumnSection.test.tsx',
  'unit',
  'behavior',
  true,
  'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/plugins/graph/GraphNodeColumnSection.test.tsx'
)
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
values (
  'OBS-GRAPH-NODE-COLUMN-SECTION-COMPONENT-PROFILE',
  'web.component.canvas.GraphNodeColumnSection',
  'component-profile',
  'dashboard',
  true,
  'implemented'
)
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;

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
  'REL-GRAPH-NODE-CARD-VIEW-COMPOSES-COLUMN-SECTION',
  'web.component.canvas.GraphNodeCardView',
  'web.component.canvas.GraphNodeColumnSection',
  'contains',
  'outbound',
  'sync',
  'renders_without_column_section_when_show_columns_false',
  'canvas_presentation',
  jsonb_build_array(
    'RenderCanvasGraphNodeCard',
    'RenderCanvasGraphNodeColumnSection',
    'apps/web/src/app/plugins/graph/GraphNodeCardView.tsx',
    'apps/web/src/app/plugins/graph/GraphNodeColumnSection.tsx'
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
