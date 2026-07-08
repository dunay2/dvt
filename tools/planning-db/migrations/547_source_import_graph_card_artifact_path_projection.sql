-- Imported warehouse-source cards must show the generated dbt artifact path as
-- the card path, while keeping the warehouse relation as technical metadata.
-- This closes the live-proof gap where a valid imported source rendered metrics
-- but hid the created models/sources/*.yml artifact from the graph card.

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  (
    'SYS-WEB-PLUGINS-DVT',
    'invariant',
    'dvtGraphNodeCardStrategy must project an imported dvt.warehouse-source node.path such as models/sources/src_public.yml as the visible graph-card artifact path; database.schema.table remains relation metadata, not a replacement for the generated source file path.',
    55
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
    'web.component.canvas.GraphNodeCardStrategy',
    'EV-SOURCE-IMPORT-GRAPH-CARD-ARTIFACT-PATH',
    'unit-test',
    'current',
    'apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts',
    'ResolveGraphNodeCardReadModel',
    'source-import-graph-card-artifact-path',
    'Imported dvt.warehouse-source cards preserve models/sources/*.yml as the card path instead of replacing it with database.schema.table.',
    jsonb_build_object(
      'featureIds',
      jsonb_build_array(
        'E-CANVAS-ADD-SOURCE-LIVE-FLOW-1',
        'E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1'
      ),
      'implementationRefs',
      jsonb_build_array(
        'apps/web/src/app/plugins/dvt/dvtGraphNodeCardStrategy.ts',
        'apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts'
      ),
      'railNames',
      jsonb_build_array(
        'ResolveGraphNodeCardReadModel',
        'RenderCanvasGraphNodeCard'
      ),
      'asserts',
      jsonb_build_array(
        'model.subtitle remains warehouse.erp.orders',
        'model.path is models/sources/src_erp.yml'
      ),
      'liveProofAssertion',
      'canvas-source-import-live-clean.cy.ts expects models/sources/src_public.yml on the imported source card'
    ),
    'tools/planning-db/migrations/547_source_import_graph_card_artifact_path_projection.sql',
    md5('evidence:source-import-graph-card-artifact-path:547')
  ),
  (
    'web.component.canvas.GraphNodeCardStrategy',
    'EV-SOURCE-IMPORT-GRAPH-CARD-ARTIFACT-PATH-LIVE-PROOF',
    'e2e-test',
    'current',
    'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
    'RenderCanvasGraphNodeCard',
    'source-import-graph-card-artifact-path-live-proof',
    'The live Source Import proof requires the imported source card to show Rows, Size, and the generated models/sources/src_public.yml path before connecting to a dbt model.',
    jsonb_build_object(
      'featureIds',
      jsonb_build_array(
        'E-CANVAS-ADD-SOURCE-LIVE-FLOW-1',
        'E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1'
      ),
      'asserts',
      jsonb_build_array(
        'imported source card renders Rows 3',
        'imported source card renders Size 3.9 MB',
        'imported source card renders models/sources/src_public.yml'
      ),
      'negativePosture',
      'A relation label such as dvt.public.source_1 is not enough to prove the generated dbt source artifact is visible'
    ),
    'tools/planning-db/migrations/547_source_import_graph_card_artifact_path_projection.sql',
    md5('evidence:source-import-graph-card-artifact-path-live-proof:547')
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
        ('apps/web/src/app/plugins/dvt/dvtGraphNodeCardStrategy.ts'),
        ('apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts'),
        ('apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'),
        ('tools/planning-db/migrations/547_source_import_graph_card_artifact_path_projection.sql')
    ) refs(ref)
  ),
  architecture_guards = (
    select jsonb_agg(to_jsonb(ref) order by ref)
    from (
      select distinct existing.ref
      from jsonb_array_elements_text(coalesce(architecture_guards, '[]'::jsonb)) existing(ref)
      union
      values
        ('apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts'),
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
              ('apps/web/src/app/plugins/dvt/dvtGraphNodeCardStrategy.ts'),
              ('apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts'),
              ('apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'),
              ('tools/planning-db/migrations/547_source_import_graph_card_artifact_path_projection.sql')
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
            ('apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts'),
            ('apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'),
            ('scripts/planning-db-migrate.test.cjs')
        ) refs(ref)
      ),
      true
    ),
    '{graphCardArtifactPathProjection}',
    jsonb_build_object(
      'component',
      'web.component.canvas.GraphNodeCardStrategy',
      'strategy',
      'dvtGraphNodeCardStrategy',
      'sourceImportPlugin',
      'dvt.warehouse-source',
      'artifactPathExample',
      'models/sources/src_public.yml',
      'relationExample',
      'dvt.public.source_1',
      'rails',
      jsonb_build_array(
        'ResolveGraphNodeCardReadModel',
        'RenderCanvasGraphNodeCard'
      ),
      'unitTest',
      'apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts',
      'liveProof',
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'
    ),
    true
  ),
  updated_at = now()
where feature_id in (
  'E-CANVAS-ADD-SOURCE-LIVE-FLOW-1',
  'E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1'
);
