-- Promote NodePropertiesTabs from an implementation detail of NodeWorkbench to
-- an owned presentation component. NodeWorkbench remains the contextual
-- capability; this leaf owns tab rendering and delegates section body markup.

delete from planning_query_store.frontend_component_local_files
where component_id = 'web.component.canvas.NodeWorkbench'
  and (
    (file_path = 'apps/web/src/app/components/inspector/NodePropertiesTabs.tsx'
      and file_role = 'component')
    or
    (file_path = 'apps/web/src/app/components/inspector/NodePropertySectionView.tsx'
      and file_role = 'component')
  );

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
  'web.component.canvas.NodePropertiesTabs',
  'NodePropertiesTabs',
  'tab-strip',
  'current',
  'extract',
  'Frontend / Canvas',
  'Render the contextual node workbench tab template from a supplied node-properties read model without owning node data lookup, authoring state, or plugin panel resolution.',
  '@dvt/web',
  '/canvas',
  'dbt;dvt',
  '[]'::jsonb,
  jsonb_build_array(
    'apps/web/src/app/components/inspector/NodePropertiesTabs.architecture.test.ts',
    'apps/web/src/app/components/inspector/NodePropertiesTabs.primarySections.test.tsx',
    'apps/web/src/app/components/inspector/NodePropertiesTabs.sectionContent.test.tsx',
    'apps/web/src/app/components/inspector/NodePropertiesTabs.overflow.test.tsx'
  ),
  jsonb_build_object(
    'dbFirst', true,
    'parentComponentId', 'web.component.canvas.NodeWorkbench',
    'hostComponents', jsonb_build_array(
      'web.component.canvas.NodeWorkbench',
      'web.component.canvas.CanvasNodeWorkbenchPanel'
    ),
    'fileOwnershipModel', 'owned-leaf-component-files',
    'governingRails', jsonb_build_array('RenderNodePropertiesTabs'),
    'invariants', jsonb_build_array(
      'NodePropertiesTabs renders from a supplied NodePropertiesReadModel',
      'NodePropertiesTabs delegates section body markup to NodePropertySectionView',
      'NodePropertiesTabs owns tab overflow and primary section presentation only',
      'NodePropertiesTabs does not query plugin panels, graph nodes, or graph edges'
    ),
    'presentationOnly', true
  ),
  'tools/planning-db/migrations/526_node_properties_tabs_component_ownership.sql',
  md5('web.component.canvas.NodePropertiesTabs:526')
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
  'web.component.canvas.NodePropertiesTabs',
  'RenderNodePropertiesTabs',
  'local-query',
  'implemented-local',
  jsonb_build_object(
    'kind', 'query',
    'dddObject', 'NodePropertiesReadModel',
    'applicationPort', 'NodePropertiesTabsProps.model',
    'adapterSurface', 'NodePropertiesTabs',
    'scope', 'selected canvas node workbench',
    'authorization', 'inherits selected canvas node visibility',
    'negativeTests', jsonb_build_array(
      'tabs component must not build the node read model',
      'tabs component must not query graph edges or plugin registries',
      'tabs component must not render raw section tables directly'
    )
  ),
  'tools/planning-db/migrations/526_node_properties_tabs_component_ownership.sql',
  md5('rail:NodePropertiesTabs:RenderNodePropertiesTabs:526')
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
    'web.component.canvas.NodePropertiesTabs',
    'apps/web/src/app/components/inspector/NodePropertiesTabs.tsx',
    'presentation-template',
    'NodePropertiesTabs',
    jsonb_build_object(
      'responsibility', 'Render node workbench tabs, primary section policy, overflow, and plugin panel tab slots from supplied props.',
      'rail', 'RenderNodePropertiesTabs',
      'presentationOnly', true
    ),
    'tools/planning-db/migrations/526_node_properties_tabs_component_ownership.sql',
    md5('file:NodePropertiesTabs.tsx:526')
  ),
  (
    'web.component.canvas.NodePropertiesTabs',
    'apps/web/src/app/components/inspector/NodePropertySectionView.tsx',
    'section-presentation',
    'NodePropertySectionView',
    jsonb_build_object(
      'responsibility', 'Render supplied node property section rows, table rows, code blocks, and child authoring slots.',
      'rail', 'RenderNodePropertiesTabs',
      'presentationOnly', true
    ),
    'tools/planning-db/migrations/526_node_properties_tabs_component_ownership.sql',
    md5('file:NodePropertySectionView.tsx:526')
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
values
  (
    'web.component.canvas.NodePropertiesTabs',
    'EV-CANVAS-NODE-PROPERTIES-TABS-PRESENTATION-SRP',
    'architecture-test',
    'current',
    'apps/web/src/app/components/inspector/NodePropertiesTabs.architecture.test.ts',
    'RenderNodePropertiesTabs',
    'node-workbench',
    'NodePropertiesTabs delegates section body markup to NodePropertySectionView and does not inline table/list/code rendering.',
    jsonb_build_object('presentationOnly', true, 'srp', true, 'noInlineSectionBody', true),
    'tools/planning-db/migrations/526_node_properties_tabs_component_ownership.sql',
    md5('evidence:NodePropertiesTabs:presentation-srp:526')
  ),
  (
    'web.component.canvas.NodePropertiesTabs',
    'EV-CANVAS-NODE-PROPERTIES-TABS-PRIMARY-OVERFLOW',
    'presentation-test',
    'current',
    'apps/web/src/app/components/inspector/NodePropertiesTabs.primarySections.test.tsx',
    'RenderNodePropertiesTabs',
    'node-workbench',
    'NodePropertiesTabs renders primary text tabs and keeps secondary sections in the More overflow menu.',
    jsonb_build_object('textTabsOnly', true, 'overflowMenu', true),
    'tools/planning-db/migrations/526_node_properties_tabs_component_ownership.sql',
    md5('evidence:NodePropertiesTabs:primary-overflow:526')
  ),
  (
    'web.component.canvas.NodePropertiesTabs',
    'EV-CANVAS-NODE-PROPERTIES-TABS-SECTION-CONTENT',
    'presentation-test',
    'current',
    'apps/web/src/app/components/inspector/NodePropertiesTabs.sectionContent.test.tsx',
    'RenderNodePropertiesTabs',
    'node-workbench',
    'NodePropertiesTabs renders supplied section content and plugin panel slots without owning node read-model construction.',
    jsonb_build_object('slotContract', true, 'noReadModelLookup', true),
    'tools/planning-db/migrations/526_node_properties_tabs_component_ownership.sql',
    md5('evidence:NodePropertiesTabs:section-content:526')
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
  'web.component.canvas.NodeWorkbench',
  'EV-CANVAS-NODE-WORKBENCH-NODE-PROPERTIES-TABS-LEAF-OWNERSHIP',
  'architecture-test',
  'current',
  'pnpm planning:db:query frontend-components --filter NodePropertiesTabs --limit 20',
  'InspectCanvasNodeProperties',
  'node-workbench',
  'NodeWorkbench treats NodePropertiesTabs as a child presentation component rather than owning its template files.',
  jsonb_build_object(
    'duplicateFileOwnershipRemoved', true,
    'semanticOwner', 'web.component.canvas.NodeWorkbench',
    'leafOwner', 'web.component.canvas.NodePropertiesTabs',
    'reconciledFiles', jsonb_build_array(
      'apps/web/src/app/components/inspector/NodePropertiesTabs.tsx',
      'apps/web/src/app/components/inspector/NodePropertySectionView.tsx'
    )
  ),
  'tools/planning-db/migrations/526_node_properties_tabs_component_ownership.sql',
  md5('evidence:NodeWorkbench:node-properties-tabs-leaf-ownership:526')
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
