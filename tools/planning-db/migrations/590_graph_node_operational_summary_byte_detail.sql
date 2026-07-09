-- Register the corrected GraphNode operational detail policy: the health popover
-- remains available when recorded byte-level metadata can add useful detail
-- beyond visible Rows/Columns rail metrics.

update planning_query_store.frontend_component_local_cq_rails
set
  raw_rail = coalesce(raw_rail, '{}'::jsonb)
    || jsonb_build_object(
      'byteLevelDetailPolicy',
      jsonb_build_object(
        'implementedBy',
        jsonb_build_array(
          'pushByteLevelDetailRows',
          'formatExactBytes',
          'formatAverageBytes'
        ),
        'rule',
        'Graph node health details stay interactive when recorded byteSize/datasetSize metadata can project dataset size, exact bytes, and average row size.',
        'doesNotInventMissingBytes', true,
        'rowColumnOnlyStaysNonInteractive', true,
        'byteSizeCreatesComplementaryDetail', true
      ),
      'negativeTests',
      coalesce(raw_rail->'negativeTests', '[]'::jsonb)
        || jsonb_build_array(
          'row and column-only static metrics remain non-interactive when byte detail is unavailable',
          'static row column and byte metrics open a complementary byte-level health detail'
        )
    ),
  source_path = 'tools/planning-db/migrations/590_graph_node_operational_summary_byte_detail.sql',
  source_content_sha256 = md5('rail:GraphNodeCardStrategy:byte-detail:590'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCardStrategy'
  and rail_name = 'RenderGraphNodeCardMetrics';

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
  'web.component.canvas.GraphNodeCardStrategy',
  'EV-GRAPH-NODE-OPERATIONAL-SUMMARY-BYTE-DETAIL',
  'unit-test',
  'current',
  'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.test.ts; apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts',
  'RenderGraphNodeCardMetrics',
  'graph-node-card-operational-summary-byte-detail',
  'GraphNodeHealthPopover remains available for recorded byte-level metadata and avoids inventing a popover when only rows and columns are known.',
  jsonb_build_object(
    'command',
    'pnpm --filter @dvt/web exec vitest run --config vitest.config.ts src/app/plugins/graph/graphNodeOperationalSummary.test.ts src/app/plugins/graph/graphNodeCardReadModel.test.ts',
    'redFailures',
    jsonb_build_array(
      'expected byte-level static source detail but received null',
      'expected average row size to be formatted without unbounded decimal precision'
    )
  ),
  'tools/planning-db/migrations/590_graph_node_operational_summary_byte_detail.sql',
  md5('evidence:GraphNodeCardStrategy:byte-detail:590')
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

update planning_query_store.feature_mechanization_local_rails
set
  symbol_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(symbol_refs, '[]'::jsonb))
      union all
      values
        ('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts#pushByteLevelDetailRows'),
        ('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts#formatExactBytes'),
        ('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts#formatAverageBytes')
    ) refs(value)
  ),
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(implementation_refs, '[]'::jsonb))
      union all
      values
        ('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts'),
        ('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.test.ts'),
        ('apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts'),
        ('tools/planning-db/migrations/590_graph_node_operational_summary_byte_detail.sql')
    ) refs(value)
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(allowed_implementation_surfaces, '[]'::jsonb))
      union all
      values
        ('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts'),
        ('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.test.ts'),
        ('apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts'),
        ('tools/planning-db/migrations/590_graph_node_operational_summary_byte_detail.sql')
    ) refs(value)
  ),
  raw_manifest = jsonb_set(
    coalesce(raw_manifest, '{}'::jsonb)
      || jsonb_build_object(
        'graphNodeOperationalSummaryByteLevelDetail',
        jsonb_build_object(
          'status', 'implemented',
          'componentId', 'web.component.canvas.GraphNodeCardStrategy',
          'rail', 'RenderCanvasGraphNodeOperationalSummary',
          'rule', 'Health popover details must stay available when recorded byte metadata adds useful non-placeholder rows.',
          'doesNotInventMissingBytes', true,
          'rowColumnOnlyStaysNonInteractive', true,
          'byteSizeCreatesComplementaryDetail', true
        )
      ),
    '{symbols}',
    coalesce(raw_manifest->'symbols', '[]'::jsonb)
      || jsonb_build_array(
        jsonb_build_object(
          'name',
          'pushByteLevelDetailRows',
          'path',
          'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts',
          'dddOwner',
          'GraphNodeCardStrategy',
          'cqRails',
          jsonb_build_array('RenderCanvasGraphNodeOperationalSummary'),
          'fowlerSignals',
          jsonb_build_array('projection_helper', 'byte_level_detail', 'presentation_query_policy'),
          'architectureGuard',
          'scripts/planning-db-migrate.test.cjs',
          'cypressCoverage',
          'not_applicable:component_projection_unit_covered',
          'unitTests',
          jsonb_build_array(
            'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.test.ts',
            'apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts'
          )
        )
      ),
    true
  ),
  source_path = 'tools/planning-db/migrations/590_graph_node_operational_summary_byte_detail.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:operational-summary-byte-detail:590'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
