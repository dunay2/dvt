-- DB-first component and feature-mechanization registration for the DVT
-- authoring field section split. DvtAuthoringFields remains the selector while
-- source, SQL transform, and sink templates own their respective presentation
-- details.

insert into architecture.design (
  design_id,
  work_item_id,
  title,
  owner,
  status,
  rationale,
  fowler_signal,
  rail_ref,
  approved_at
)
values (
  'WEB-CANVAS-DVT-AUTHORING-FIELD-SECTIONS-20260625',
  'DVT-CANVAS-P0-PRO-FLOW-1',
  'DVT Canvas authoring field section split',
  'Frontend / Canvas',
  'implemented',
  'DvtAuthoringFields had accumulated source, SQL transform, and sink presentation branches in one TSX file. The professional Canvas work needs separate presentational leaves so the node workbench can evolve without duplicating field semantics or embedding ad hoc HTML in the selector.',
  'responsibility_overload',
  'ConfigureCanvasDvtNode;ConfigureDvtDestinationTarget;RenderDvtAuthoringFieldSections',
  now()
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  approved_at = coalesce(architecture.design.approved_at, excluded.approved_at),
  updated_at = now();

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
  source_path,
  source_content_sha256,
  raw_component
)
values
  (
    'web.component.canvas.DvtAuthoringFields',
    'DvtAuthoringFields',
    'form',
    'current',
    'extract',
    'Frontend / Canvas',
    'Selects the DVT source, SQL transform, or sink authoring section for the active node draft without owning the field templates.',
    '@dvt/web',
    '/canvas',
    'dvt',
    jsonb_build_array(
      'The broader DVT P0 flow still needs canvas-first SQL split workbench, bottom drawer readiness proof, and browser-level run proof.'
    ),
    jsonb_build_array(
      'EV-WEB-CANVAS-DVT-AUTHORING-FIELDS-PRESENTATION',
      'EV-WEB-CANVAS-DVT-AUTHORING-FIELDS-ARCHITECTURE'
    ),
    'tools/planning-db/migrations/286_register_dvt_authoring_field_sections.sql',
    md5('web.component.canvas.DvtAuthoringFields:286')
      || md5('DvtAuthoringFields:RenderDvtAuthoringFieldSections'),
    jsonb_build_object(
      'dbFirst', true,
      'fowlerSignal', 'selector_not_template_owner',
      'governingRails', jsonb_build_array('ConfigureCanvasDvtNode', 'ConfigureDvtDestinationTarget')
    )
  ),
  (
    'web.component.canvas.DvtSourceAuthoringSection',
    'DvtSourceAuthoringSection',
    'form',
    'current',
    'create',
    'Frontend / Canvas',
    'Renders DVT source relation and alias fields from the route-owned node draft.',
    '@dvt/web',
    '/canvas',
    'dvt',
    jsonb_build_array(
      'Source browsing and column selection remain owned by the contextual Add source flow, not this inspector field section.'
    ),
    jsonb_build_array(
      'EV-WEB-CANVAS-DVT-AUTHORING-FIELDS-PRESENTATION',
      'EV-WEB-CANVAS-DVT-AUTHORING-FIELDS-ARCHITECTURE'
    ),
    'tools/planning-db/migrations/286_register_dvt_authoring_field_sections.sql',
    md5('web.component.canvas.DvtSourceAuthoringSection:286')
      || md5('ConfigureCanvasDvtNode:source'),
    jsonb_build_object(
      'dbFirst', true,
      'fowlerSignal', 'source_field_template_leaf',
      'governingRail', 'ConfigureCanvasDvtNode'
    )
  ),
  (
    'web.component.canvas.DvtSqlTransformAuthoringSection',
    'DvtSqlTransformAuthoringSection',
    'form',
    'current',
    'create',
    'Frontend / Canvas',
    'Renders DVT SQL transform body, line-count feedback, and SQL validation errors from the route-owned node draft.',
    '@dvt/web',
    '/canvas',
    'dvt',
    jsonb_build_array(
      'The full SQL workbench split editor remains a later DVT P0 slice.'
    ),
    jsonb_build_array(
      'EV-WEB-CANVAS-DVT-AUTHORING-FIELDS-PRESENTATION',
      'EV-WEB-CANVAS-DVT-AUTHORING-FIELDS-ARCHITECTURE'
    ),
    'tools/planning-db/migrations/286_register_dvt_authoring_field_sections.sql',
    md5('web.component.canvas.DvtSqlTransformAuthoringSection:286')
      || md5('ConfigureCanvasDvtNode:sql_transform'),
    jsonb_build_object(
      'dbFirst', true,
      'fowlerSignal', 'sql_transform_field_template_leaf',
      'governingRail', 'ConfigureCanvasDvtNode'
    )
  ),
  (
    'web.component.canvas.DvtSinkAuthoringSection',
    'DvtSinkAuthoringSection',
    'form',
    'current',
    'create',
    'Frontend / Canvas',
    'Renders exact DVT sink database/schema/table, materialization, write mode, and partition strategy fields from the route-owned node draft.',
    '@dvt/web',
    '/canvas',
    'dvt',
    jsonb_build_array(
      'Runtime sink contract validation remains governed by preview/readiness rails and is not claimed by this presentational split.'
    ),
    jsonb_build_array(
      'EV-WEB-CANVAS-DVT-AUTHORING-FIELDS-PRESENTATION',
      'EV-WEB-CANVAS-DVT-AUTHORING-FIELDS-ARCHITECTURE'
    ),
    'tools/planning-db/migrations/286_register_dvt_authoring_field_sections.sql',
    md5('web.component.canvas.DvtSinkAuthoringSection:286')
      || md5('ConfigureDvtDestinationTarget:sink'),
    jsonb_build_object(
      'dbFirst', true,
      'fowlerSignal', 'sink_field_template_leaf',
      'governingRail', 'ConfigureDvtDestinationTarget'
    )
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
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  raw_component = excluded.raw_component,
  updated_at = now();

insert into planning_query_store.frontend_component_local_surface_links (
  component_id,
  surface_id,
  route_path,
  placement_kind,
  placement_order,
  raw_link,
  source_path,
  source_content_sha256
)
values
  (
    'web.component.canvas.DvtAuthoringFields',
    'web.canvas.graph',
    '/canvas',
    'node-workbench-dvt-authoring-selector',
    61,
    jsonb_build_object('surfaceRole', 'DVT authoring section selector'),
    'tools/planning-db/migrations/286_register_dvt_authoring_field_sections.sql',
    md5('DvtAuthoringFields:web.canvas.graph:286')
  ),
  (
    'web.component.canvas.DvtSourceAuthoringSection',
    'web.canvas.graph',
    '/canvas',
    'node-workbench-dvt-source-authoring',
    62,
    jsonb_build_object('surfaceRole', 'DVT source field template'),
    'tools/planning-db/migrations/286_register_dvt_authoring_field_sections.sql',
    md5('DvtSourceAuthoringSection:web.canvas.graph:286')
  ),
  (
    'web.component.canvas.DvtSqlTransformAuthoringSection',
    'web.canvas.graph',
    '/canvas',
    'node-workbench-dvt-sql-authoring',
    63,
    jsonb_build_object('surfaceRole', 'DVT SQL transform field template'),
    'tools/planning-db/migrations/286_register_dvt_authoring_field_sections.sql',
    md5('DvtSqlTransformAuthoringSection:web.canvas.graph:286')
  ),
  (
    'web.component.canvas.DvtSinkAuthoringSection',
    'web.canvas.graph',
    '/canvas',
    'node-workbench-dvt-sink-authoring',
    64,
    jsonb_build_object('surfaceRole', 'DVT sink field template'),
    'tools/planning-db/migrations/286_register_dvt_authoring_field_sections.sql',
    md5('DvtSinkAuthoringSection:web.canvas.graph:286')
  )
on conflict (component_id, surface_id, placement_kind) do update set
  route_path = excluded.route_path,
  placement_order = excluded.placement_order,
  raw_link = excluded.raw_link,
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
    'web.component.canvas.DvtAuthoringFields',
    'apps/web/src/app/views/canvas/DvtAuthoringFields.tsx',
    'component',
    'DvtAuthoringFields',
    jsonb_build_object('role', 'DVT authoring section selector', 'rail', 'RenderDvtAuthoringFieldSections'),
    'tools/planning-db/migrations/286_register_dvt_authoring_field_sections.sql',
    md5('DvtAuthoringFields.tsx:286')
  ),
  (
    'web.component.canvas.DvtSourceAuthoringSection',
    'apps/web/src/app/views/canvas/DvtSourceAuthoringSection.tsx',
    'component',
    'DvtSourceAuthoringSection',
    jsonb_build_object('role', 'DVT source field template', 'rail', 'ConfigureCanvasDvtNode'),
    'tools/planning-db/migrations/286_register_dvt_authoring_field_sections.sql',
    md5('DvtSourceAuthoringSection.tsx:286')
  ),
  (
    'web.component.canvas.DvtSqlTransformAuthoringSection',
    'apps/web/src/app/views/canvas/DvtSqlTransformAuthoringSection.tsx',
    'component',
    'DvtSqlTransformAuthoringSection',
    jsonb_build_object('role', 'DVT SQL transform field template', 'rail', 'ConfigureCanvasDvtNode'),
    'tools/planning-db/migrations/286_register_dvt_authoring_field_sections.sql',
    md5('DvtSqlTransformAuthoringSection.tsx:286')
  ),
  (
    'web.component.canvas.DvtSinkAuthoringSection',
    'apps/web/src/app/views/canvas/DvtSinkAuthoringSection.tsx',
    'component',
    'DvtSinkAuthoringSection',
    jsonb_build_object('role', 'DVT sink field template', 'rail', 'ConfigureDvtDestinationTarget'),
    'tools/planning-db/migrations/286_register_dvt_authoring_field_sections.sql',
    md5('DvtSinkAuthoringSection.tsx:286')
  ),
  (
    'web.component.canvas.DvtAuthoringFields',
    'apps/web/src/app/views/canvas/DvtAuthoringFields.test.tsx',
    'test',
    null,
    jsonb_build_object('coverage', 'DVT authoring source, SQL, and sink behavior'),
    'tools/planning-db/migrations/286_register_dvt_authoring_field_sections.sql',
    md5('DvtAuthoringFields.test.tsx:286')
  ),
  (
    'web.component.canvas.DvtAuthoringFields',
    'apps/web/src/app/views/canvas/canvasInspectorAuthoringComponent.architecture.test.ts',
    'test',
    null,
    jsonb_build_object('coverage', 'DVT authoring section ownership boundary'),
    'tools/planning-db/migrations/286_register_dvt_authoring_field_sections.sql',
    md5('canvasInspectorAuthoringComponent.architecture.test.ts:286')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
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
    'web.component.canvas.DvtAuthoringFields',
    'RenderDvtAuthoringFieldSections',
    'local-query',
    'implemented-local',
    jsonb_build_object(
      'purpose', 'Selects the DVT source, SQL transform, or sink presentational field section from the node draft.',
      'owner', 'DvtAuthoringFields'
    ),
    'tools/planning-db/migrations/286_register_dvt_authoring_field_sections.sql',
    md5('DvtAuthoringFields:RenderDvtAuthoringFieldSections:286')
  ),
  (
    'web.component.canvas.DvtSourceAuthoringSection',
    'ConfigureCanvasDvtNode',
    'local-command',
    'implemented-local',
    jsonb_build_object(
      'purpose', 'Projects DVT source authoring controls over the route-owned node draft.',
      'owner', 'DvtSourceAuthoringSection'
    ),
    'tools/planning-db/migrations/286_register_dvt_authoring_field_sections.sql',
    md5('DvtSourceAuthoringSection:ConfigureCanvasDvtNode:286')
  ),
  (
    'web.component.canvas.DvtSqlTransformAuthoringSection',
    'ConfigureCanvasDvtNode',
    'local-command',
    'implemented-local',
    jsonb_build_object(
      'purpose', 'Projects DVT SQL transform authoring controls over the route-owned node draft.',
      'owner', 'DvtSqlTransformAuthoringSection'
    ),
    'tools/planning-db/migrations/286_register_dvt_authoring_field_sections.sql',
    md5('DvtSqlTransformAuthoringSection:ConfigureCanvasDvtNode:286')
  ),
  (
    'web.component.canvas.DvtSinkAuthoringSection',
    'ConfigureDvtDestinationTarget',
    'local-command',
    'implemented-local',
    jsonb_build_object(
      'purpose', 'Projects exact DVT sink target controls over the route-owned node draft.',
      'owner', 'DvtSinkAuthoringSection'
    ),
    'tools/planning-db/migrations/286_register_dvt_authoring_field_sections.sql',
    md5('DvtSinkAuthoringSection:ConfigureDvtDestinationTarget:286')
  )
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = excluded.raw_rail,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_local_evidence (
  evidence_id,
  component_id,
  evidence_kind,
  evidence_ref,
  evidence_status,
  raw_evidence,
  source_path,
  source_content_sha256
)
values
  (
    'EV-WEB-CANVAS-DVT-AUTHORING-FIELDS-PRESENTATION',
    'web.component.canvas.DvtAuthoringFields',
    'test',
    'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/DvtAuthoringFields.test.tsx',
    'passing',
    jsonb_build_object('scope', 'DVT source, SQL transform, and sink authoring behavior'),
    'tools/planning-db/migrations/286_register_dvt_authoring_field_sections.sql',
    md5('EV-WEB-CANVAS-DVT-AUTHORING-FIELDS-PRESENTATION:286')
  ),
  (
    'EV-WEB-CANVAS-DVT-AUTHORING-FIELDS-ARCHITECTURE',
    'web.component.canvas.DvtAuthoringFields',
    'test',
    'pnpm --filter @dvt/web test:canvas-architecture:run -- src/app/views/canvas/canvasInspectorAuthoringComponent.architecture.test.ts',
    'passing',
    jsonb_build_object('scope', 'DVT source, SQL transform, and sink section boundaries'),
    'tools/planning-db/migrations/286_register_dvt_authoring_field_sections.sql',
    md5('EV-WEB-CANVAS-DVT-AUTHORING-FIELDS-ARCHITECTURE:286')
  )
on conflict (evidence_id) do update set
  component_id = excluded.component_id,
  evidence_kind = excluded.evidence_kind,
  evidence_ref = excluded.evidence_ref,
  evidence_status = excluded.evidence_status,
  raw_evidence = excluded.raw_evidence,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

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
  'local#DVT-CANVAS-P0-PRO-FLOW-1#query#renderdvtauthoringfieldsections',
  'DVT-CANVAS-P0-PRO-FLOW-1',
  'implemented',
  'RenderDvtAuthoringFieldSections',
  'renderdvtauthoringfieldsections',
  'query',
  'DvtAuthoringFields',
  'implemented',
  jsonb_build_array(
    'apps/web/src/app/views/canvas/DvtSourceAuthoringSection.tsx#DvtSourceAuthoringSection',
    'apps/web/src/app/views/canvas/DvtSqlTransformAuthoringSection.tsx#DvtSqlTransformAuthoringSection',
    'apps/web/src/app/views/canvas/DvtSinkAuthoringSection.tsx#DvtSinkAuthoringSection'
  ),
  jsonb_build_array(
    'apps/web/src/app/views/canvas/DvtAuthoringFields.tsx',
    'apps/web/src/app/views/canvas/DvtSourceAuthoringSection.tsx',
    'apps/web/src/app/views/canvas/DvtSqlTransformAuthoringSection.tsx',
    'apps/web/src/app/views/canvas/DvtSinkAuthoringSection.tsx',
    'apps/web/src/app/views/canvas/DvtAuthoringFields.test.tsx',
    'apps/web/src/app/views/canvas/canvasInspectorAuthoringComponent.architecture.test.ts',
    'scripts/planning-db-migrate.test.cjs',
    'tools/planning-db/migrations/286_register_dvt_authoring_field_sections.sql'
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
    'apps/web/src/app/views/canvas/DvtAuthoringFields.tsx',
    'apps/web/src/app/views/canvas/DvtSourceAuthoringSection.tsx',
    'apps/web/src/app/views/canvas/DvtSqlTransformAuthoringSection.tsx',
    'apps/web/src/app/views/canvas/DvtSinkAuthoringSection.tsx',
    'apps/web/src/app/views/canvas/DvtAuthoringFields.test.tsx',
    'apps/web/src/app/views/canvas/canvasInspectorAuthoringComponent.architecture.test.ts',
    'scripts/planning-db-migrate.test.cjs',
    'tools/planning-db/migrations/286_register_dvt_authoring_field_sections.sql'
  ),
  jsonb_build_array(
    'pnpm --filter @dvt/web test:canvas-architecture:run -- src/app/views/canvas/canvasInspectorAuthoringComponent.architecture.test.ts',
    'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/DvtAuthoringFields.test.tsx',
    'node --test --test-name-pattern "tracked migrations register DVT authoring field section components" scripts/planning-db-migrate.test.cjs',
    'pnpm docs:feature-mechanization:implementation'
  ),
  jsonb_build_array(
    'pnpm planning:db:migrate',
    'pnpm --filter @dvt/web test:canvas-architecture:run -- src/app/views/canvas/canvasInspectorAuthoringComponent.architecture.test.ts',
    'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/DvtAuthoringFields.test.tsx',
    'node --test --test-name-pattern "tracked migrations register DVT authoring field section components" scripts/planning-db-migrate.test.cjs',
    'pnpm docs:feature-mechanization:implementation',
    'pnpm verify:prepush'
  ),
  'tools/planning-db/migrations/286_register_dvt_authoring_field_sections.sql',
  md5('DVT-CANVAS-P0-PRO-FLOW-1:RenderDvtAuthoringFieldSections:286')
    || md5('DvtSourceAuthoringSection:DvtSqlTransformAuthoringSection:DvtSinkAuthoringSection'),
  jsonb_build_object(
    'name', 'RenderDvtAuthoringFieldSections',
    'type', 'query',
    'dddOwner', 'DvtAuthoringFields',
    'status', 'implemented'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'DVT-CANVAS-P0-PRO-FLOW-1',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan',
    'DVT authoring field presentation is split into source, SQL transform, and sink leaves while DvtAuthoringFields remains the selector over the route-owned node draft. This is an enabling Fowler slice for the broader canvas-first P0 flow, not a claim that the full P0 flow is closed.',
    'componentGuides', jsonb_build_array(
      'web.component.canvas.DvtAuthoringFields',
      'web.component.canvas.DvtSourceAuthoringSection',
      'web.component.canvas.DvtSqlTransformAuthoringSection',
      'web.component.canvas.DvtSinkAuthoringSection'
    ),
    'userStories', jsonb_build_array(
      'As a maintainer, DVT source field presentation changes can be made without editing SQL transform or sink markup.',
      'As a maintainer, DVT SQL field feedback can evolve toward the contextual SQL workbench without changing source or sink templates.',
      'As a maintainer, exact sink target authoring remains isolated from source and transform field templates.'
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
      'apps/web/src/app/views/canvas/DvtAuthoringFields.tsx',
      'apps/web/src/app/views/canvas/DvtSourceAuthoringSection.tsx',
      'apps/web/src/app/views/canvas/DvtSqlTransformAuthoringSection.tsx',
      'apps/web/src/app/views/canvas/DvtSinkAuthoringSection.tsx',
      'apps/web/src/app/views/canvas/DvtAuthoringFields.test.tsx',
      'apps/web/src/app/views/canvas/canvasInspectorAuthoringComponent.architecture.test.ts',
      'scripts/planning-db-migrate.test.cjs',
      'tools/planning-db/migrations/286_register_dvt_authoring_field_sections.sql'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'packages/@dvt/contracts/**',
      'packages/@dvt/planner/**',
      'apps/web/cypress/e2e/**#fake_canvas_success',
      'docs/planning/state/agent-lane-a.yaml',
      'docs/planning/state/agent-lane-b.yaml',
      'docs/planning/state/agent-lane-c.yaml',
      'docs/planning/state/agent-lane-d.yaml',
      'docs/planning/state/agent-lane-e.yaml'
    ),
    'domainObjects', jsonb_build_array(
      'DvtAuthoringFields',
      'DvtSourceAuthoringSection',
      'DvtSqlTransformAuthoringSection',
      'DvtSinkAuthoringSection'
    ),
    'fowlerSignals', jsonb_build_array(
      'responsibility_overload',
      'presentation_template_extraction',
      'dbfirst_component_mapping'
    ),
    'architectureGuards', jsonb_build_array(
      'pnpm --filter @dvt/web test:canvas-architecture:run -- src/app/views/canvas/canvasInspectorAuthoringComponent.architecture.test.ts',
      'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/DvtAuthoringFields.test.tsx',
      'node --test --test-name-pattern "tracked migrations register DVT authoring field section components" scripts/planning-db-migrate.test.cjs',
      'pnpm docs:feature-mechanization:implementation'
    ),
    'cypressFlows', jsonb_build_array(
      'not_applicable:component_split_only'
    ),
    'completionGate', jsonb_build_array(
      'pnpm planning:db:migrate',
      'pnpm --filter @dvt/web test:canvas-architecture:run -- src/app/views/canvas/canvasInspectorAuthoringComponent.architecture.test.ts',
      'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/DvtAuthoringFields.test.tsx',
      'node --test --test-name-pattern "tracked migrations register DVT authoring field section components" scripts/planning-db-migrate.test.cjs',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', 'RenderDvtAuthoringFieldSections',
        'type', 'query',
        'dddOwner', 'DvtAuthoringFields',
        'status', 'implemented'
      ),
      jsonb_build_object(
        'name', 'ConfigureCanvasDvtNode',
        'type', 'command',
        'dddOwner', 'CanvasInspectorAuthoringModel',
        'status', 'implemented'
      ),
      jsonb_build_object(
        'name', 'ConfigureDvtDestinationTarget',
        'type', 'command',
        'dddOwner', 'CanvasInspectorAuthoringModel',
        'status', 'implemented'
      )
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'dvt-authoring-section-boundaries',
        'redTest',
        'pnpm --filter @dvt/web test:canvas-architecture:run -- src/app/views/canvas/canvasInspectorAuthoringComponent.architecture.test.ts',
        'expectedFailure',
        'The DVT source, SQL transform, and sink presentational sections are missing and DvtAuthoringFields still owns the field templates.',
        'patchSurfaces', jsonb_build_array(
          'apps/web/src/app/views/canvas/DvtAuthoringFields.tsx',
          'apps/web/src/app/views/canvas/DvtSourceAuthoringSection.tsx',
          'apps/web/src/app/views/canvas/DvtSqlTransformAuthoringSection.tsx',
          'apps/web/src/app/views/canvas/DvtSinkAuthoringSection.tsx',
          'apps/web/src/app/views/canvas/canvasInspectorAuthoringComponent.architecture.test.ts'
        ),
        'greenTest',
        'pnpm --filter @dvt/web test:canvas-architecture:run -- src/app/views/canvas/canvasInspectorAuthoringComponent.architecture.test.ts'
      ),
      jsonb_build_object(
        'id', 'dbfirst-dvt-authoring-section-registration',
        'redTest',
        'node --test --test-name-pattern "tracked migrations register DVT authoring field section components" scripts/planning-db-migrate.test.cjs',
        'expectedFailure',
        'Planning DB has no local frontend component and feature-mechanization registration for the new DVT authoring section leaves.',
        'patchSurfaces', jsonb_build_array(
          'scripts/planning-db-migrate.test.cjs',
          'tools/planning-db/migrations/286_register_dvt_authoring_field_sections.sql'
        ),
        'greenTest',
        'node --test --test-name-pattern "tracked migrations register DVT authoring field section components" scripts/planning-db-migrate.test.cjs'
      )
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object(
        'name', 'DvtSourceAuthoringSection',
        'path', 'apps/web/src/app/views/canvas/DvtSourceAuthoringSection.tsx',
        'dddOwner', 'DvtAuthoringFields',
        'cqRails', jsonb_build_array('RenderDvtAuthoringFieldSections', 'ConfigureCanvasDvtNode'),
        'fowlerSignals', jsonb_build_array('presentation_template_extraction'),
        'architectureGuard', 'apps/web/src/app/views/canvas/canvasInspectorAuthoringComponent.architecture.test.ts',
        'cypressCoverage', 'not_applicable:component_split_only',
        'unitTests', jsonb_build_array(
          'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/DvtAuthoringFields.test.tsx'
        )
      ),
      jsonb_build_object(
        'name', 'DvtSqlTransformAuthoringSection',
        'path', 'apps/web/src/app/views/canvas/DvtSqlTransformAuthoringSection.tsx',
        'dddOwner', 'DvtAuthoringFields',
        'cqRails', jsonb_build_array('RenderDvtAuthoringFieldSections', 'ConfigureCanvasDvtNode'),
        'fowlerSignals', jsonb_build_array('presentation_template_extraction'),
        'architectureGuard', 'apps/web/src/app/views/canvas/canvasInspectorAuthoringComponent.architecture.test.ts',
        'cypressCoverage', 'not_applicable:component_split_only',
        'unitTests', jsonb_build_array(
          'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/DvtAuthoringFields.test.tsx'
        )
      ),
      jsonb_build_object(
        'name', 'DvtSinkAuthoringSection',
        'path', 'apps/web/src/app/views/canvas/DvtSinkAuthoringSection.tsx',
        'dddOwner', 'DvtAuthoringFields',
        'cqRails', jsonb_build_array('RenderDvtAuthoringFieldSections', 'ConfigureDvtDestinationTarget'),
        'fowlerSignals', jsonb_build_array('presentation_template_extraction'),
        'architectureGuard', 'apps/web/src/app/views/canvas/canvasInspectorAuthoringComponent.architecture.test.ts',
        'cypressCoverage', 'not_applicable:component_split_only',
        'unitTests', jsonb_build_array(
          'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/DvtAuthoringFields.test.tsx'
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
