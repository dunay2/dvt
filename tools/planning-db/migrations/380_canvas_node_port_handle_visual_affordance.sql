-- Register the semantic Canvas node port affordance slice. The existing
-- GraphNodeCard rail still renders the whole card; this narrower rail governs
-- the visual connection handle contract exposed by CanvasNodePortHandle.

delete from planning_query_store.frontend_component_local_files
where source_path = 'tools/planning-db/migrations/380_canvas_node_port_handle_visual_affordance.sql'
  and component_id = 'web.component.canvas.GraphNodeCard'
  and (
    (file_path = 'apps/web/src/app/components/canvas/CanvasNodePortHandle.tsx' and file_role = 'presentation')
    or (file_path = 'apps/web/src/app/components/canvas/CanvasNodeShell.tsx' and file_role = 'template')
  );

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
  'web.component.canvas.GraphNodeCard',
  'RenderCanvasNodePortHandle',
  'local-query',
  'implemented-local',
  jsonb_build_object(
    'kind', 'query',
    'dddObject', 'CanvasNodePortHandle',
    'applicationPort', 'CanvasNodeShell.sourceHandleTone/targetHandleTone',
    'adapterSurface', 'CanvasNodePortHandle',
    'scope', 'presentation-only React Flow connection affordance',
    'authorization', 'inherits canvas graph visibility; no independent authority',
    'negativeTests', jsonb_build_array(
      'handle tone is supplied by the caller and not inferred by CanvasNodeShell',
      'source and target handles expose stable data-port slots',
      'styles are owned by CanvasNodeShell.module.css instead of inline TSX literals'
    )
  ),
  'tools/planning-db/migrations/380_canvas_node_port_handle_visual_affordance.sql',
  md5('rail:GraphNodeCard:RenderCanvasNodePortHandle:380')
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
    'web.component.canvas.GraphNodeCard',
    'apps/web/src/app/components/canvas/CanvasNodePortHandle.tsx',
    'component',
    'CanvasNodePortHandle',
    jsonb_build_object(
      'responsibility', 'Render the source/target React Flow connection handle with a caller supplied semantic tone.',
      'rails', jsonb_build_array('RenderCanvasGraphNodeCard', 'RenderCanvasNodePortHandle'),
      'presentationOnly', true,
      'ownsDomainToneMapping', false
    ),
    'tools/planning-db/migrations/380_canvas_node_port_handle_visual_affordance.sql',
    md5('file:CanvasNodePortHandle:visual-affordance:380')
  ),
  (
    'web.component.canvas.GraphNodeCard',
    'apps/web/src/app/components/canvas/CanvasNodeShell.tsx',
    'component',
    'CanvasNodeShell',
    jsonb_build_object(
      'responsibility', 'Compose node body, context menu, and source/target port handles without deriving domain kind.',
      'rails', jsonb_build_array('RenderCanvasGraphNodeCard', 'RenderCanvasNodePortHandle'),
      'delegatesPortRendering', true
    ),
    'tools/planning-db/migrations/380_canvas_node_port_handle_visual_affordance.sql',
    md5('file:CanvasNodeShell:port-tone-contract:380')
  ),
  (
    'web.component.canvas.GraphNodeCard',
    'apps/web/src/app/components/canvas/CanvasNodeShell.module.css',
    'style',
    null,
    jsonb_build_object(
      'responsibility', 'Own the visual token mapping for Canvas node shell and port handle presentation.',
      'rails', jsonb_build_array('RenderCanvasNodePortHandle'),
      'containsInlineBusinessRules', false
    ),
    'tools/planning-db/migrations/380_canvas_node_port_handle_visual_affordance.sql',
    md5('file:CanvasNodeShell.module.css:port-tone-contract:380')
  ),
  (
    'web.component.canvas.GraphNodeCard',
    'apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx',
    'test',
    null,
    jsonb_build_object(
      'coverage', 'CanvasNodeShell renders stable port slots and delegates semantic tone to CanvasNodePortHandle.',
      'rails', jsonb_build_array('RenderCanvasNodePortHandle')
    ),
    'tools/planning-db/migrations/380_canvas_node_port_handle_visual_affordance.sql',
    md5('file:CanvasNodeShell.test.tsx:port-tone-contract:380')
  ),
  (
    'web.component.canvas.DbtNodeCard',
    'apps/web/src/app/components/canvas/DbtNodeComponent.tsx',
    'adapter',
    'DbtNodeComponent',
    jsonb_build_object(
      'responsibility', 'Translate canonical node role into CanvasNodePortTone before rendering CanvasNodeShell.',
      'rails', jsonb_build_array('RenderCanvasNodePortHandle'),
      'ownsPortPresentation', false
    ),
    'tools/planning-db/migrations/380_canvas_node_port_handle_visual_affordance.sql',
    md5('file:DbtNodeComponent:port-tone-adapter:380')
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
  'web.component.canvas.GraphNodeCard',
  'EV-CANVAS-NODE-PORT-HANDLE-TONE-CONTRACT',
  'presentation-test',
  'current',
  'apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx',
  'RenderCanvasNodePortHandle',
  'node-card',
  'CanvasNodeShell delegates source/target port tones to CanvasNodePortHandle and preserves stable data-port slots.',
  jsonb_build_object(
    'redGreen', true,
    'redFailure', 'expected source/model data-tone values but received null attributes',
    'command', 'pnpm --filter @dvt/web test:presentation:run -- src/app/components/canvas/CanvasNodeShell.test.tsx'
  ),
  'tools/planning-db/migrations/380_canvas_node_port_handle_visual_affordance.sql',
  md5('evidence:CanvasNodeShell:port-tone-contract:380')
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
  'local#E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1#query#rendercanvasnodeporthandle',
  'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1',
  'implemented',
  'RenderCanvasNodePortHandle',
  'rendercanvasnodeporthandle',
  'query',
  'CanvasNodePortHandle',
  'implemented',
  jsonb_build_array(
    'apps/web/src/app/components/canvas/CanvasNodePortHandle.tsx#CanvasNodePortHandle',
    'apps/web/src/app/components/canvas/CanvasNodePortHandle.tsx#CanvasNodePortHandleKind',
    'apps/web/src/app/components/canvas/CanvasNodePortHandle.tsx#CanvasNodePortTone',
    'apps/web/src/app/components/canvas/CanvasNodeShell.tsx#CanvasNodeShell',
    'apps/web/src/app/components/canvas/DbtNodeComponent.tsx#NODE_ROLE_PORT_TONES'
  ),
  jsonb_build_array(
    'apps/web/src/app/components/canvas/CanvasNodePortHandle.tsx',
    'apps/web/src/app/components/canvas/CanvasNodeShell.tsx',
    'apps/web/src/app/components/canvas/CanvasNodeShell.module.css',
    'apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx',
    'apps/web/src/app/components/canvas/DbtNodeComponent.tsx',
    'tools/planning-db/migrations/380_canvas_node_port_handle_visual_affordance.sql'
  ),
  jsonb_build_array(
    'buzon/manual de implementacion.txt',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md'
  ),
  jsonb_build_array(
    'AGENTS.md',
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/guides/ai-work-protocol.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md',
    'buzon/manual de implementacion.txt'
  ),
  jsonb_build_array(
    'apps/web/src/app/components/canvas/CanvasNodePortHandle.tsx',
    'apps/web/src/app/components/canvas/CanvasNodeShell.tsx',
    'apps/web/src/app/components/canvas/CanvasNodeShell.module.css',
    'apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx',
    'apps/web/src/app/components/canvas/DbtNodeComponent.tsx',
    'tools/planning-db/migrations/380_canvas_node_port_handle_visual_affordance.sql'
  ),
  jsonb_build_array(
    'pnpm --filter @dvt/web test:presentation:run -- src/app/components/canvas/CanvasNodeShell.test.tsx',
    'node --test --test-name-pattern "Canvas node port handle" scripts/planning-db-migrate.test.cjs',
    'pnpm docs:feature-mechanization:implementation'
  ),
  jsonb_build_array(
    'pnpm --filter @dvt/web test:presentation:run -- src/app/components/canvas/CanvasNodeShell.test.tsx',
    'node --test --test-name-pattern "Canvas node port handle" scripts/planning-db-migrate.test.cjs',
    'pnpm docs:feature-mechanization:implementation',
    'pnpm verify:prepush'
  ),
  'tools/planning-db/migrations/380_canvas_node_port_handle_visual_affordance.sql',
  md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:RenderCanvasNodePortHandle:380'),
  jsonb_build_object(
    'name', 'RenderCanvasNodePortHandle',
    'type', 'query',
    'dddOwner', 'CanvasNodePortHandle',
    'status', 'implemented'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan', 'Add semantic, caller-owned visual tones to Canvas node source and target connection handles without moving domain inference into the shell template.',
    'componentGuides', jsonb_build_array('web.component.canvas.GraphNodeCard'),
    'userStories', jsonb_build_array(
      'As a Canvas author, I can identify node connection ports by semantic visual tone without the shell guessing node domain type.'
    ),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/guides/ai-work-protocol.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md',
      'buzon/manual de implementacion.txt'
    ),
    'allowedImplementationSurfaces', jsonb_build_array(
      'apps/web/src/app/components/canvas/CanvasNodePortHandle.tsx',
      'apps/web/src/app/components/canvas/CanvasNodeShell.tsx',
      'apps/web/src/app/components/canvas/CanvasNodeShell.module.css',
      'apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx',
      'apps/web/src/app/components/canvas/DbtNodeComponent.tsx',
      'tools/planning-db/migrations/380_canvas_node_port_handle_visual_affordance.sql'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'apps/web/src/app/plugins/graph/**#node-port-tone-inference',
      'apps/web/src/app/views/canvas/**#parallel-port-rendering'
    ),
    'domainObjects', jsonb_build_array('GraphNodeCard', 'CanvasNodeShell', 'CanvasNodePortHandle'),
    'fowlerSignals', jsonb_build_array('boundary_drift', 'primitive_presentation_tokens'),
    'architectureGuards', jsonb_build_array(
      'pnpm --filter @dvt/web test:presentation:run -- src/app/components/canvas/CanvasNodeShell.test.tsx',
      'pnpm --filter @dvt/web test:architecture:run -- src/app/components/canvas/DbtNodeComponent.architecture.test.ts',
      'node --test --test-name-pattern "Canvas node port handle" scripts/planning-db-migrate.test.cjs'
    ),
    'cypressFlows', jsonb_build_array('not_applicable:presentation_affordance_only'),
    'completionGate', jsonb_build_array(
      'pnpm --filter @dvt/web test:presentation:run -- src/app/components/canvas/CanvasNodeShell.test.tsx',
      'pnpm --filter @dvt/web test:architecture:run -- src/app/components/canvas/DbtNodeComponent.architecture.test.ts',
      'node --test --test-name-pattern "Canvas node port handle" scripts/planning-db-migrate.test.cjs',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', 'RenderCanvasNodePortHandle',
        'type', 'query',
        'dddOwner', 'CanvasNodePortHandle',
        'status', 'implemented'
      )
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'canvas-node-port-tone-contract',
        'redTest', 'pnpm --filter @dvt/web test:presentation:run -- src/app/components/canvas/CanvasNodeShell.test.tsx',
        'expectedFailure', 'expected source/model data-tone values but received null attributes',
        'patchSurfaces', jsonb_build_array(
          'apps/web/src/app/components/canvas/CanvasNodePortHandle.tsx',
          'apps/web/src/app/components/canvas/CanvasNodeShell.tsx',
          'apps/web/src/app/components/canvas/CanvasNodeShell.module.css',
          'apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx',
          'apps/web/src/app/components/canvas/DbtNodeComponent.tsx',
          'tools/planning-db/migrations/380_canvas_node_port_handle_visual_affordance.sql'
        ),
        'greenTest', 'pnpm --filter @dvt/web test:presentation:run -- src/app/components/canvas/CanvasNodeShell.test.tsx'
      )
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object(
        'name', 'CanvasNodePortHandle',
        'path', 'apps/web/src/app/components/canvas/CanvasNodePortHandle.tsx',
        'dddOwner', 'CanvasNodePortHandle',
        'cqRails', jsonb_build_array('RenderCanvasNodePortHandle'),
        'fowlerSignals', jsonb_build_array('presentation_component', 'semantic_visual_tone'),
        'architectureGuard', 'apps/web/src/app/components/canvas/DbtNodeComponent.architecture.test.ts',
        'cypressCoverage', 'not_applicable:presentation_affordance_only',
        'unitTests', jsonb_build_array('apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx')
      ),
      jsonb_build_object(
        'name', 'CanvasNodePortHandleKind',
        'path', 'apps/web/src/app/components/canvas/CanvasNodePortHandle.tsx',
        'dddOwner', 'CanvasNodePortHandle',
        'cqRails', jsonb_build_array('RenderCanvasNodePortHandle'),
        'fowlerSignals', jsonb_build_array('presentation_contract'),
        'architectureGuard', 'apps/web/src/app/components/canvas/DbtNodeComponent.architecture.test.ts',
        'cypressCoverage', 'not_applicable:type_alias',
        'unitTests', jsonb_build_array('apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx')
      ),
      jsonb_build_object(
        'name', 'CanvasNodePortTone',
        'path', 'apps/web/src/app/components/canvas/CanvasNodePortHandle.tsx',
        'dddOwner', 'CanvasNodePortHandle',
        'cqRails', jsonb_build_array('RenderCanvasNodePortHandle'),
        'fowlerSignals', jsonb_build_array('presentation_contract', 'semantic_visual_tone'),
        'architectureGuard', 'apps/web/src/app/components/canvas/DbtNodeComponent.architecture.test.ts',
        'cypressCoverage', 'not_applicable:type_alias',
        'unitTests', jsonb_build_array('apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx')
      ),
      jsonb_build_object(
        'name', 'NODE_ROLE_PORT_TONES',
        'path', 'apps/web/src/app/components/canvas/DbtNodeComponent.tsx',
        'dddOwner', 'DbtNodeCard',
        'cqRails', jsonb_build_array('RenderCanvasNodePortHandle'),
        'fowlerSignals', jsonb_build_array('adapter_mapping', 'no_shell_domain_inference'),
        'architectureGuard', 'apps/web/src/app/components/canvas/DbtNodeComponent.architecture.test.ts',
        'cypressCoverage', 'not_applicable:presentation_affordance_only',
        'unitTests', jsonb_build_array('apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx')
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
