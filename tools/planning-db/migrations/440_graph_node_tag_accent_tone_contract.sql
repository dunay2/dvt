-- Register graph-node tag accent tones as a strategy-projected presentation
-- contract. The read model owns tone selection; GraphNodeTagList only renders
-- the supplied token.

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'tagAccentToneContract',
      jsonb_build_object(
        'field', 'GraphNodeCardReadModel.accentTone',
        'type', 'GraphNodeCardAccentTone',
        'renderOwner', 'web.component.canvas.GraphNodeTagList'
      )
    ),
  source_path = 'tools/planning-db/migrations/440_graph_node_tag_accent_tone_contract.sql',
  source_content_sha256 = md5('file:graphNodeCardStrategyContracts.ts:tag-accent-tone:440'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCardStrategy'
  and file_path = 'apps/web/src/app/plugins/graph/graphNodeCardStrategyContracts.ts';

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'tagAccentToneProjection',
      jsonb_build_object(
        'helper', 'resolveNodeCardAccentTone',
        'kindBeforeRole', true,
        'doesNotInspectTags', true
      )
    ),
  source_path = 'tools/planning-db/migrations/440_graph_node_tag_accent_tone_contract.sql',
  source_content_sha256 = md5('file:graphNodeCardStrategyUtils.ts:tag-accent-tone:440'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCardStrategy'
  and file_path = 'apps/web/src/app/plugins/graph/graphNodeCardStrategyUtils.ts';

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object('projectsTagAccentTone', true),
  source_path = 'tools/planning-db/migrations/440_graph_node_tag_accent_tone_contract.sql',
  source_content_sha256 = md5('file:strategy:tag-accent-tone:440'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCardStrategy'
  and file_path in (
    'apps/web/src/app/plugins/dbt/dbtGraphNodeCardStrategy.ts',
    'apps/web/src/app/plugins/dvt/dvtGraphNodeCardStrategy.ts',
    'apps/web/src/app/plugins/graph/defaultGraphNodeCardStrategy.ts'
  );

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'rendersSuppliedAccentTone',
      true,
      'doesNotResolveToneFromTagText',
      true
    ),
  source_path = 'tools/planning-db/migrations/440_graph_node_tag_accent_tone_contract.sql',
  source_content_sha256 = md5('file:GraphNodeTagList.tsx:tag-accent-tone:440'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeTagList'
  and file_path = 'apps/web/src/app/plugins/graph/GraphNodeTagList.tsx';

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'tagAccentToneCoverage',
      jsonb_build_object(
        'presentationTest', 'apps/web/src/app/plugins/graph/GraphNodeTagList.test.tsx',
        'assertsDataTone', 'source',
        'doesNotResolveToneFromTagText', true
      )
    ),
  source_path = 'tools/planning-db/migrations/440_graph_node_tag_accent_tone_contract.sql',
  source_content_sha256 = md5('file:GraphNodeTagList.test.tsx:tag-accent-tone:440'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeTagList'
  and file_path = 'apps/web/src/app/plugins/graph/GraphNodeTagList.test.tsx';

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object('passesReadModelAccentToneToTagList', true),
  source_path = 'tools/planning-db/migrations/440_graph_node_tag_accent_tone_contract.sql',
  source_content_sha256 = md5('file:GraphNodeCardView.tsx:tag-accent-tone:440'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCardView'
  and file_path = 'apps/web/src/app/plugins/graph/GraphNodeCardView.tsx';

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'tagAccentToneTokens',
      jsonb_build_object(
        'tokenOwner', 'graphNodeTagListClasses.tone',
        'tones', jsonb_build_array('source', 'model', 'test', 'output', 'control', 'unknown')
      )
    ),
  source_path = 'tools/planning-db/migrations/440_graph_node_tag_accent_tone_contract.sql',
  source_content_sha256 = md5('file:graphVisualTokens.ts:tag-accent-tone:440'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCard'
  and file_path = 'apps/web/src/app/plugins/graph/graphVisualTokens.ts';

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
    'web.component.canvas.GraphNodeCardStrategy',
    'EV-CANVAS-GRAPH-NODE-TAG-ACCENT-TONE-PROJECTION',
    'unit-test',
    'current',
    'apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts',
    'RenderGraphNodeCardMetrics',
    'graph-node-card-read-model',
    'GraphNodeCard strategies project tag accent tone from node kind before role fallback.',
    jsonb_build_object(
      'redGreen', true,
      'command', 'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/plugins/graph/graphNodeCardReadModel.test.ts',
      'kindBeforeRole', true,
      'tones', jsonb_build_array('source', 'model', 'test')
    ),
    'tools/planning-db/migrations/440_graph_node_tag_accent_tone_contract.sql',
    md5('evidence:GraphNodeCardStrategy:tag-accent-tone:440')
  ),
  (
    'web.component.canvas.GraphNodeTagList',
    'EV-CANVAS-GRAPH-NODE-TAG-LIST-ACCENT-TONE-RENDER',
    'presentation-test',
    'current',
    'apps/web/src/app/plugins/graph/GraphNodeTagList.test.tsx',
    'RenderCanvasGraphNodeTagList',
    'graph-node-tag-list',
    'GraphNodeTagList renders the supplied accent tone token without deriving semantics from tag text.',
    jsonb_build_object(
      'redGreen', true,
      'command', 'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/plugins/graph/GraphNodeTagList.test.tsx src/app/plugins/graph/GraphNodeCardView.test.tsx',
      'dataTone', 'source',
      'doesNotResolveToneFromTagText', true
    ),
    'tools/planning-db/migrations/440_graph_node_tag_accent_tone_contract.sql',
    md5('evidence:GraphNodeTagList:tag-accent-tone:440')
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
      values ('EV-CANVAS-GRAPH-NODE-TAG-ACCENT-TONE-PROJECTION')
    ) updated_refs(value)
  ),
  raw_component = coalesce(raw_component, '{}'::jsonb)
    || jsonb_build_object('projectsTagAccentTone', true),
  source_path = 'tools/planning-db/migrations/440_graph_node_tag_accent_tone_contract.sql',
  source_content_sha256 = md5('component:GraphNodeCardStrategy:tag-accent-tone:440'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCardStrategy';

update planning_query_store.frontend_component_local_components
set
  evidence_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(evidence_refs, '[]'::jsonb)) refs(value)
      union all
      values ('EV-CANVAS-GRAPH-NODE-TAG-LIST-ACCENT-TONE-RENDER')
    ) updated_refs(value)
  ),
  raw_component = coalesce(raw_component, '{}'::jsonb)
    || jsonb_build_object('rendersSuppliedAccentTone', true),
  source_path = 'tools/planning-db/migrations/440_graph_node_tag_accent_tone_contract.sql',
  source_content_sha256 = md5('component:GraphNodeTagList:tag-accent-tone:440'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeTagList';

update planning_query_store.frontend_component_local_cq_rails
set
  raw_rail = coalesce(raw_rail, '{}'::jsonb)
    || jsonb_build_object(
      'rendersSuppliedAccentTone',
      true,
      'doesNotResolveToneFromTagText',
      true
    ),
  source_path = 'tools/planning-db/migrations/440_graph_node_tag_accent_tone_contract.sql',
  source_content_sha256 = md5('rail:GraphNodeTagList:tag-accent-tone:440'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeTagList'
  and rail_name = 'RenderCanvasGraphNodeTagList';

update planning_query_store.feature_mechanization_local_rails
set
  raw_manifest = jsonb_set(
    coalesce(raw_manifest, '{}'::jsonb),
    '{symbols}',
    (
      select jsonb_agg(value order by value->>'name')
      from (
        select distinct on (value->>'name', value->>'path') value
        from (
          select value
          from jsonb_array_elements(coalesce(raw_manifest->'symbols', '[]'::jsonb)) existing(value)
          where value->>'name' not in ('GraphNodeCardAccentTone', 'resolveNodeCardAccentTone')
          union all
          select jsonb_build_object(
            'name', 'GraphNodeCardAccentTone',
            'path', 'apps/web/src/app/plugins/graph/graphNodeCardStrategyContracts.ts',
            'dddOwner', 'web.component.canvas.GraphNodeCardStrategy',
            'cqRails', jsonb_build_array('RenderGraphNodeCardMetrics', 'RenderCanvasGraphNodeTagList'),
            'fowlerSignals', jsonb_build_array('read_model_contract', 'presentation_tone_token'),
            'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
            'cypressCoverage', 'not_applicable:type_contract',
            'unitTests', jsonb_build_array('apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts')
          )
          union all
          select jsonb_build_object(
            'name', 'resolveNodeCardAccentTone',
            'path', 'apps/web/src/app/plugins/graph/graphNodeCardStrategyUtils.ts',
            'dddOwner', 'web.component.canvas.GraphNodeCardStrategy',
            'cqRails', jsonb_build_array('RenderGraphNodeCardMetrics', 'RenderCanvasGraphNodeTagList'),
            'fowlerSignals', jsonb_build_array('pure_projection_helper', 'kind_before_role'),
            'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
            'cypressCoverage', 'not_applicable:pure_read_model_helper',
            'unitTests', jsonb_build_array('apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts')
          )
        ) all_symbols(value)
      ) distinct_symbols
    ),
    true
  ),
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(implementation_refs, '[]'::jsonb)) refs(value)
      union all
      values
        ('apps/web/src/app/plugins/dbt/dbtGraphNodeCardStrategy.ts'),
        ('apps/web/src/app/plugins/dvt/dvtGraphNodeCardStrategy.ts'),
        ('apps/web/src/app/plugins/graph/GraphNodeCardView.tsx'),
        ('apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx'),
        ('apps/web/src/app/plugins/graph/GraphNodeTagList.tsx'),
        ('apps/web/src/app/plugins/graph/GraphNodeTagList.test.tsx'),
        ('apps/web/src/app/plugins/graph/defaultGraphNodeCardStrategy.ts'),
        ('apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts'),
        ('apps/web/src/app/plugins/graph/graphNodeCardStrategyContracts.ts'),
        ('apps/web/src/app/plugins/graph/graphNodeCardStrategyUtils.ts'),
        ('apps/web/src/app/plugins/graph/graphVisualTokens.ts'),
        ('tools/planning-db/migrations/440_graph_node_tag_accent_tone_contract.sql')
    ) updated_refs(value)
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(allowed_implementation_surfaces, '[]'::jsonb)) refs(value)
      union all
      values
        ('apps/web/src/app/plugins/dbt/dbtGraphNodeCardStrategy.ts'),
        ('apps/web/src/app/plugins/dvt/dvtGraphNodeCardStrategy.ts'),
        ('apps/web/src/app/plugins/graph/GraphNodeCardView.tsx'),
        ('apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx'),
        ('apps/web/src/app/plugins/graph/GraphNodeTagList.tsx'),
        ('apps/web/src/app/plugins/graph/GraphNodeTagList.test.tsx'),
        ('apps/web/src/app/plugins/graph/defaultGraphNodeCardStrategy.ts'),
        ('apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts'),
        ('apps/web/src/app/plugins/graph/graphNodeCardStrategyContracts.ts'),
        ('apps/web/src/app/plugins/graph/graphNodeCardStrategyUtils.ts'),
        ('apps/web/src/app/plugins/graph/graphVisualTokens.ts'),
        ('tools/planning-db/migrations/440_graph_node_tag_accent_tone_contract.sql')
    ) updated_refs(value)
  ),
  source_path = 'tools/planning-db/migrations/440_graph_node_tag_accent_tone_contract.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:tag-accent-tone:440'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
