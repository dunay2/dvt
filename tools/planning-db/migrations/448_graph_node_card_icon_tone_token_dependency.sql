-- Declare the shared visual-token file used by GraphNodeCardView for card
-- icon tone rendering. The card view derives icon presentation from the
-- GraphNodeCardReadModel accent tone instead of accepting raw inline colors.

insert into planning_query_store.frontend_component_local_files (
  component_id,
  file_path,
  file_role,
  exported_symbol,
  raw_file,
  source_path,
  source_content_sha256
)
values (
  'web.component.canvas.GraphNodeCardView',
  'apps/web/src/app/plugins/graph/graphVisualTokens.ts',
  'style-token',
  'graphNodeCardLayoutClasses.iconTone',
  jsonb_build_object(
    'responsibility', 'Provide tokenized icon tone classes consumed by GraphNodeCardView.',
    'rail', 'RenderCanvasGraphNodeCard',
    'sharedTokenFile', true,
    'ownedUse', 'card icon accent tone rendering',
    'noInlineIconColor', true
  ),
  'tools/planning-db/migrations/448_graph_node_card_icon_tone_token_dependency.sql',
  md5('file:graphVisualTokens.ts:GraphNodeCardView:icon-tone:448')
)
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = coalesce(planning_query_store.frontend_component_local_files.raw_file, '{}'::jsonb)
    || excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'cardIconTone',
      jsonb_build_object(
        'slot', 'graph-node-card-icon',
        'toneSource', 'GraphNodeCardReadModel.accentTone',
        'token', 'graphNodeCardLayoutClasses.iconTone',
        'noInlineIconColor', true
      )
    ),
  source_path = 'tools/planning-db/migrations/448_graph_node_card_icon_tone_token_dependency.sql',
  source_content_sha256 = md5('file:GraphNodeCardView.tsx:icon-tone:448'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCardView'
  and file_path = 'apps/web/src/app/plugins/graph/GraphNodeCardView.tsx';

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'cardIconToneCoverage',
      jsonb_build_object(
        'presentationTest', 'apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx',
        'assertsSlot', 'graph-node-card-icon',
        'assertsToneSource', 'GraphNodeCardReadModel.accentTone',
        'assertsNoInlineIconColor', true
      )
    ),
  source_path = 'tools/planning-db/migrations/448_graph_node_card_icon_tone_token_dependency.sql',
  source_content_sha256 = md5('file:GraphNodeCardView.test.tsx:icon-tone:448'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCardView'
  and file_path = 'apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx';

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
  'web.component.canvas.GraphNodeCardView',
  'EV-CANVAS-GRAPH-NODE-CARD-ICON-TONE-TOKEN-OWNERSHIP',
  'presentation-test',
  'current',
  'apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx',
  'RenderCanvasGraphNodeCard',
  'graph-node-card-view',
  'GraphNodeCardView renders icon tone from GraphNodeCardReadModel.accentTone through shared graph visual tokens without accepting inline icon colors.',
  jsonb_build_object(
    'redGreen', true,
    'command', 'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/plugins/graph/GraphNodeCardView.test.tsx',
    'featureMechanizationCommand', 'pnpm docs:feature-mechanization:implementation',
    'slot', 'graph-node-card-icon',
    'token', 'graphNodeCardLayoutClasses.iconTone',
    'noInlineIconColor', true,
    'manualRule', 'No hardcoded colors outside graph visual tokens.'
  ),
  'tools/planning-db/migrations/448_graph_node_card_icon_tone_token_dependency.sql',
  md5('evidence:GraphNodeCardView:icon-tone-token-ownership:448')
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

update planning_query_store.frontend_component_local_components
set
  evidence_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(evidence_refs, '[]'::jsonb)) refs(value)
      union all
      values ('EV-CANVAS-GRAPH-NODE-CARD-ICON-TONE-TOKEN-OWNERSHIP')
    ) updated_refs(value)
  ),
  raw_component = coalesce(raw_component, '{}'::jsonb)
    || jsonb_build_object(
      'styleTokenDependencies',
      jsonb_build_array('apps/web/src/app/plugins/graph/graphVisualTokens.ts#graphNodeCardLayoutClasses.iconTone'),
      'cardIconTone',
      jsonb_build_object(
        'slot', 'graph-node-card-icon',
        'toneSource', 'GraphNodeCardReadModel.accentTone',
        'noInlineIconColor', true
      )
    ),
  source_path = 'tools/planning-db/migrations/448_graph_node_card_icon_tone_token_dependency.sql',
  source_content_sha256 = md5('component:GraphNodeCardView:icon-tone-token-dependency:448'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCardView';

update planning_query_store.feature_mechanization_local_rails
set
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(implementation_refs, '[]'::jsonb)) refs(value)
      union all
      values
        ('apps/web/src/app/plugins/graph/GraphNodeCardView.tsx'),
        ('apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx'),
        ('apps/web/src/app/plugins/graph/GraphNodeRenderer.tsx'),
        ('apps/web/src/app/plugins/graph/graphVisualTokens.ts'),
        ('apps/web/src/app/plugins/dbt/DbtNodeRenderer.tsx'),
        ('tools/planning-db/migrations/448_graph_node_card_icon_tone_token_dependency.sql')
    ) updated_refs(value)
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(allowed_implementation_surfaces, '[]'::jsonb)) refs(value)
      union all
      values
        ('apps/web/src/app/plugins/graph/GraphNodeCardView.tsx'),
        ('apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx'),
        ('apps/web/src/app/plugins/graph/GraphNodeRenderer.tsx'),
        ('apps/web/src/app/plugins/graph/graphVisualTokens.ts'),
        ('apps/web/src/app/plugins/dbt/DbtNodeRenderer.tsx'),
        ('tools/planning-db/migrations/448_graph_node_card_icon_tone_token_dependency.sql')
    ) updated_refs(value)
  ),
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'graphNodeCardIconToneToken',
      jsonb_build_object(
        'status', 'implemented',
        'componentId', 'web.component.canvas.GraphNodeCardView',
        'rail', 'RenderCanvasGraphNodeCard',
        'token', 'graphNodeCardLayoutClasses.iconTone',
        'slot', 'graph-node-card-icon',
        'noInlineIconColor', true
      )
    ),
  source_path = 'tools/planning-db/migrations/448_graph_node_card_icon_tone_token_dependency.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:GraphNodeCardView:icon-tone-token:448'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
