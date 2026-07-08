-- Let Source Import nodes keep their graph-card projection when rendered inside
-- a DBT canvas. This reuses the existing GraphNodeCardStrategy rail and does
-- not import the whole DVT canvas surface into DBT.

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  (
    'SYS-WEB-PLUGINS-CORE',
    'invariant',
    'getCanvasGraphNodeCardStrategies must include graphNodeCardStrategies from sourceImport render plugins such as dvt.warehouse-source while keeping active canvas owner strategies first and deduplicated by strategy id.',
    54
  ),
  (
    'SYS-WEB-PLUGINS-DVT',
    'invariant',
    'dvt.warehouse-source contributes the existing dvtGraphNodeCardStrategy only for imported warehouse source rendering; it does not register a DVT canvas kind or DVT authoring surface in DBT canvases.',
    54
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

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
    'SYS-WEB-PLUGINS-CORE',
    'EV-SOURCE-IMPORT-GRAPH-CARD-STRATEGY-SHARING',
    'unit-test',
    'current',
    'apps/web/src/app/plugins/graphStrategyRegistry.test.ts',
    'ResolveGraphNodeCardReadModel',
    'source-import-graph-card-strategy-sharing',
    'DBT canvases receive the active dbt-card strategy plus the source-import warehouse card strategy without leaking DBT cards into DVT canvases.',
    jsonb_build_object(
      'featureIds',
      jsonb_build_array(
        'E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1',
        'E-CANVAS-ADD-SOURCE-LIVE-FLOW-1'
      ),
      'componentOwners',
      jsonb_build_array(
        'SYS-WEB-PLUGINS-CORE',
        'SYS-WEB-PLUGINS-DVT',
        'web.component.canvas.GraphNodeCardStrategy'
      ),
      'asserts',
      jsonb_build_array(
        'getCanvasGraphNodeCardStrategies(''dbt'') returns dbt-card then dvt-card',
        'getCanvasGraphNodeCardStrategies(''transformation'') returns one deduplicated dvt-card'
      )
    ),
    'tools/planning-db/migrations/546_source_import_graph_card_strategy_sharing.sql',
    md5('evidence:source-import-graph-card-strategy-sharing:546')
  ),
  (
    'SYS-WEB-PLUGINS-DVT',
    'EV-SOURCE-IMPORT-WAREHOUSE-SOURCE-CARD-STRATEGY-CONTRIBUTION',
    'unit-test',
    'current',
    'apps/web/src/app/plugins/graphStrategyRegistry.test.ts',
    'ResolveGraphNodeCardReadModel',
    'source-import-warehouse-source-card-strategy-contribution',
    'dvtContributions.ts declares graphNodeCardStrategies for dvt.warehouse-source so imported source nodes can render real source metrics in non-DVT canvases.',
    jsonb_build_object(
      'pluginId',
      'dvt.warehouse-source',
      'strategy',
      'dvtGraphNodeCardStrategy',
      'sourceFile',
      'apps/web/src/app/plugins/dvt/dvtContributions.ts',
      'sourceImportOnly',
      true
    ),
    'tools/planning-db/migrations/546_source_import_graph_card_strategy_sharing.sql',
    md5('evidence:source-import-warehouse-source-card-strategy-contribution:546')
  ),
  (
    'web.component.canvas.GraphNodeCardStrategy',
    'EV-SOURCE-IMPORT-GRAPH-CARD-STRATEGY-LIVE-PROOF',
    'e2e-test',
    'current',
    'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
    'RenderCanvasGraphNodeCard',
    'source-import-graph-card-strategy-live-proof',
    'The Source Import live proof asserts imported warehouse source cards show Rows and Size after the registry supplies the source-import card strategy in a DBT canvas.',
    jsonb_build_object(
      'featureIds',
      jsonb_build_array(
        'E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1',
        'E-CANVAS-ADD-SOURCE-LIVE-FLOW-1'
      ),
      'asserts',
      jsonb_build_array(
        'imported graph node card renders Rows',
        'imported graph node card renders Size',
        'imported graph node card renders 3.9 MB'
      ),
      'negativePosture',
      'No generic fallback card for dvt.warehouse-source in DBT canvas'
    ),
    'tools/planning-db/migrations/546_source_import_graph_card_strategy_sharing.sql',
    md5('evidence:source-import-graph-card-strategy-live-proof:546')
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
  implementation_refs = (
    select jsonb_agg(to_jsonb(ref) order by ref)
    from (
      select distinct existing.ref
      from jsonb_array_elements_text(coalesce(implementation_refs, '[]'::jsonb)) existing(ref)
      union
      values
        ('apps/web/src/app/plugins/graphStrategyRegistry.ts'),
        ('apps/web/src/app/plugins/graphStrategyRegistry.test.ts'),
        ('apps/web/src/app/plugins/dvt/dvtContributions.ts'),
        ('apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'),
        ('tools/planning-db/migrations/546_source_import_graph_card_strategy_sharing.sql')
    ) refs(ref)
  ),
  architecture_guards = (
    select jsonb_agg(to_jsonb(ref) order by ref)
    from (
      select distinct existing.ref
      from jsonb_array_elements_text(coalesce(architecture_guards, '[]'::jsonb)) existing(ref)
      union
      values
        ('apps/web/src/app/plugins/graphStrategyRegistry.test.ts'),
        ('apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'),
        ('scripts/planning-db-migrate.test.cjs')
    ) refs(ref)
  ),
  raw_manifest = jsonb_set(
    jsonb_set(
      jsonb_set(
        coalesce(raw_manifest, '{}'::jsonb),
        '{implementationRefs}',
        (
          select jsonb_agg(to_jsonb(ref) order by ref)
          from (
            select distinct existing.ref
            from jsonb_array_elements_text(coalesce(raw_manifest -> 'implementationRefs', '[]'::jsonb)) existing(ref)
            union
            values
              ('apps/web/src/app/plugins/graphStrategyRegistry.ts'),
              ('apps/web/src/app/plugins/graphStrategyRegistry.test.ts'),
              ('apps/web/src/app/plugins/dvt/dvtContributions.ts'),
              ('apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'),
              ('tools/planning-db/migrations/546_source_import_graph_card_strategy_sharing.sql')
          ) refs(ref)
        ),
        true
      ),
      '{architectureGuards}',
      (
        select jsonb_agg(to_jsonb(ref) order by ref)
        from (
          select distinct existing.ref
          from jsonb_array_elements_text(coalesce(raw_manifest -> 'architectureGuards', '[]'::jsonb)) existing(ref)
          union
          values
            ('apps/web/src/app/plugins/graphStrategyRegistry.test.ts'),
            ('apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'),
            ('scripts/planning-db-migrate.test.cjs')
        ) refs(ref)
      ),
      true
    ),
    '{graphCardStrategySharing}',
    jsonb_build_object(
      'registryOwner',
      'SYS-WEB-PLUGINS-CORE',
      'pluginOwner',
      'SYS-WEB-PLUGINS-DVT',
      'cardOwner',
      'web.component.canvas.GraphNodeCardStrategy',
      'pluginId',
      'dvt.warehouse-source',
      'property',
      'graphNodeCardStrategies',
      'unitTest',
      'apps/web/src/app/plugins/graphStrategyRegistry.test.ts',
      'liveProof',
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'
    ),
    true
  ),
  updated_at = now()
where feature_id in (
  'E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1',
  'E-CANVAS-ADD-SOURCE-LIVE-FLOW-1'
);
