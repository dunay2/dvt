-- Record the follow-up review fix for GraphNodeCard status projection. The
-- existing RenderCanvasGraphNodeCard query owns the card chip status; this
-- migration adds evidence that canonical warning node status is preserved when
-- runtime runStatus metadata is absent.

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
  'EV-GRAPH-NODE-CARD-WARNING-STATUS-PRESERVED',
  'unit-test',
  'current',
  'apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts',
  'RenderCanvasGraphNodeCard',
  'graph-node-card-status-chip',
  'Canonical warn node status projects to a warning card chip when runtime runStatus metadata is not recorded.',
  jsonb_build_object(
    'reviewedPr', 1811,
    'reviewCommit', 'dab27cf21a',
    'redFailure', 'expected Warning but received Ready when node.status was warn and runStatus was absent',
    'command', 'pnpm --filter @dvt/web test:unit:run -- src/app/plugins/graph/graphNodeCardReadModel.test.ts'
  ),
  'tools/planning-db/migrations/381_graph_node_card_warning_status_review_fix.sql',
  md5('evidence:GraphNodeCard:warning-status-preserved:381')
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
  architecture_guards = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(architecture_guards, '[]'::jsonb))
      union all
      values
        ('pnpm --filter @dvt/web test:unit:run -- src/app/plugins/graph/graphNodeCardReadModel.test.ts'),
        ('node --test --test-name-pattern "Graph node card warning status" scripts/planning-db-migrate.test.cjs')
    ) guards(value)
  ),
  completion_gate = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(completion_gate, '[]'::jsonb))
      union all
      values
        ('pnpm --filter @dvt/web test:unit:run -- src/app/plugins/graph/graphNodeCardReadModel.test.ts'),
        ('node --test --test-name-pattern "Graph node card warning status" scripts/planning-db-migrate.test.cjs')
    ) gates(value)
  ),
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'graphNodeCardWarningStatusReviewFix',
      jsonb_build_object(
        'status', 'implemented',
        'rail', 'RenderCanvasGraphNodeCard',
        'reviewedPr', 1811,
        'reviewCommit', 'dab27cf21a',
        'redTest', 'graphNodeCardReadModel preserves canonical warning status when runStatus is absent',
        'evidenceId', 'EV-GRAPH-NODE-CARD-WARNING-STATUS-PRESERVED'
      )
    ),
  source_path = 'tools/planning-db/migrations/381_graph_node_card_warning_status_review_fix.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:GraphNodeCardWarningStatus:381'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
