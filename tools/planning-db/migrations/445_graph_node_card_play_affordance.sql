-- Register the GraphNodeCardView card-local play affordance hardening.
-- The play button remains the supplied node-local action; this slice only
-- tokenizes its presentation posture so the card stays information-first.

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'cardLocalPlayAffordance',
      jsonb_build_object(
        'slot', 'graph-node-card-play',
        'commandOwnership', 'supplied-playAction',
        'doesNotCreateRunCommand', true,
        'visualPosture', 'secondary-until-hover-or-focus'
      )
    ),
  source_path = 'tools/planning-db/migrations/445_graph_node_card_play_affordance.sql',
  source_content_sha256 = md5('file:GraphNodeCardView.tsx:play-affordance:445'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCardView'
  and file_path = 'apps/web/src/app/plugins/graph/GraphNodeCardView.tsx';

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'cardLocalPlayAffordanceCoverage',
      jsonb_build_object(
        'presentationTest', 'apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx',
        'assertsSlot', 'graph-node-card-play',
        'assertsGreenTone', true,
        'assertsSecondaryVisibility', jsonb_build_array(
          'opacity-0',
          'group-hover:opacity-100',
          'focus-visible:opacity-100'
        )
      )
    ),
  source_path = 'tools/planning-db/migrations/445_graph_node_card_play_affordance.sql',
  source_content_sha256 = md5('file:GraphNodeCardView.test.tsx:play-affordance:445'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCardView'
  and file_path = 'apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx';

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'cardLocalPlayAffordanceTokens',
      jsonb_build_object(
        'surfaceGroupClass', 'graphNodeCardSurfaceClasses.root',
        'buttonToken', 'graphNodeCardLayoutClasses.playButton',
        'tone', 'green',
        'visibilityPosture', 'secondary-until-hover-or-focus',
        'noComponentLocalHexColors', true
      )
    ),
  source_path = 'tools/planning-db/migrations/445_graph_node_card_play_affordance.sql',
  source_content_sha256 = md5('file:graphVisualTokens.ts:play-affordance:445'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCard'
  and file_path = 'apps/web/src/app/plugins/graph/graphVisualTokens.ts';

update planning_query_store.frontend_component_local_cq_rails
set
  raw_rail = coalesce(raw_rail, '{}'::jsonb)
    || jsonb_build_object(
      'cardLocalPlayAffordance',
      jsonb_build_object(
        'slot', 'graph-node-card-play',
        'commandOwnership', 'supplied-playAction',
        'doesNotCreateRunCommand', true,
        'visualPosture', 'secondary-until-hover-or-focus'
      )
    ),
  source_path = 'tools/planning-db/migrations/445_graph_node_card_play_affordance.sql',
  source_content_sha256 = md5('rail:GraphNodeCardView:play-affordance:445'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCardView'
  and rail_name = 'RenderCanvasGraphNodeCard';

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
  'EV-CANVAS-GRAPH-NODE-CARD-PLAY-AFFORDANCE',
  'presentation-test',
  'current',
  'apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx',
  'RenderCanvasGraphNodeCard',
  'graph-node-card-view',
  'GraphNodeCardView exposes the supplied card-local play action as a green secondary affordance that becomes prominent on hover or keyboard focus without introducing a separate run command.',
  jsonb_build_object(
    'redGreen', true,
    'command', 'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/plugins/graph/GraphNodeCardView.test.tsx',
    'slot', 'graph-node-card-play',
    'doesNotCreateRunCommand', true,
    'visualPosture', 'secondary-until-hover-or-focus',
    'manualRule', 'Card = information; Toolbar = actions; if card play remains, it must be low visual weight.'
  ),
  'tools/planning-db/migrations/445_graph_node_card_play_affordance.sql',
  md5('evidence:GraphNodeCardView:play-affordance:445')
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
      values ('EV-CANVAS-GRAPH-NODE-CARD-PLAY-AFFORDANCE')
    ) updated_refs(value)
  ),
  raw_component = coalesce(raw_component, '{}'::jsonb)
    || jsonb_build_object(
      'cardLocalPlayAffordance',
      jsonb_build_object(
        'slot', 'graph-node-card-play',
        'doesNotCreateRunCommand', true,
        'visualPosture', 'secondary-until-hover-or-focus'
      )
    ),
  source_path = 'tools/planning-db/migrations/445_graph_node_card_play_affordance.sql',
  source_content_sha256 = md5('component:GraphNodeCardView:play-affordance:445'),
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
        ('apps/web/src/app/plugins/graph/graphVisualTokens.ts'),
        ('tools/planning-db/migrations/445_graph_node_card_play_affordance.sql')
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
        ('apps/web/src/app/plugins/graph/graphVisualTokens.ts'),
        ('tools/planning-db/migrations/445_graph_node_card_play_affordance.sql')
    ) updated_refs(value)
  ),
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'graphNodeCardPlayAffordance',
      jsonb_build_object(
        'status', 'implemented',
        'componentId', 'web.component.canvas.GraphNodeCardView',
        'rail', 'RenderCanvasGraphNodeCard',
        'doesNotCreateRunCommand', true,
        'slot', 'graph-node-card-play',
        'visualPosture', 'secondary-until-hover-or-focus'
      )
    ),
  source_path = 'tools/planning-db/migrations/445_graph_node_card_play_affordance.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:GraphNodeCardView:play-affordance:445'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
