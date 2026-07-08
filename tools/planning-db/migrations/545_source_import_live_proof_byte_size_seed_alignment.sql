-- Align the live Source Import proof seed with the real byte-size metadata
-- contract. This does not create a new product rail: it attaches proof evidence
-- to the existing Source Import byte-size and live Add Source rails.

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-RUNTIME-PROOFS',
    'invariant',
    'buildLocalWarehouseConnectionCatalog must seed byteSize: 4096000 for the local Postgres proof tables so the live Add Source flow proves real row and size metadata instead of silently omitting storage metrics.',
    45
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'invariant',
    'The live Source Import proof must assert visible warehouse metrics including 3 rows and 3.9 MB before and after importing a source into the canvas.',
    45
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'transition',
    'Removed the stale workspacePortCopy.ts copy surface because it advertised an obsolete API-mode Source Import stub while the active Source Import flow is backend-backed.',
    46
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
    'SYS-CI-GOVERNANCE-SCRIPTS-RUNTIME-PROOFS',
    'EV-SOURCE-IMPORT-LIVE-PROOF-BYTE-SIZE-SEED',
    'unit-test',
    'current',
    'scripts/run-dev-stack.test.cjs',
    'RunCanvasFirstAuthoringLiveProof',
    'source-import-live-proof-byte-size-seed-alignment',
    'The local dev-stack Source Import catalog seeds byteSize: 4096000 for both proof tables so browser proof data can render a 3.9 MB table-size metric.',
    jsonb_build_object(
      'featureIds',
      jsonb_build_array(
        'E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1',
        'E-CANVAS-ADD-SOURCE-LIVE-FLOW-1'
      ),
      'asserts',
      jsonb_build_array(
        'buildLocalWarehouseConnectionCatalog emits byteSize: 4096000 for dvt.public.source_1',
        'buildLocalWarehouseConnectionCatalog emits byteSize: 4096000 for dvt.raw.orders'
      ),
      'userMetricLabel',
      '3.9 MB',
      'noStub',
      true
    ),
    'tools/planning-db/migrations/545_source_import_live_proof_byte_size_seed_alignment.sql',
    md5('evidence:source-import-live-proof-byte-size-seed:545')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'EV-SOURCE-IMPORT-LIVE-PROOF-BYTE-SIZE-USER-FLOW',
    'e2e-test',
    'current',
    'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
    'RenderSourceImportCatalogView',
    'source-import-live-proof-byte-size-user-flow',
    'The live Add Source browser proof asserts real rows and byte-size metadata in search results, active metadata, and the imported graph node card.',
    jsonb_build_object(
      'featureIds',
      jsonb_build_array(
        'E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1',
        'E-CANVAS-ADD-SOURCE-LIVE-FLOW-1'
      ),
      'asserts',
      jsonb_build_array(
        'search result renders 3 rows',
        'search result renders 3.9 MB',
        'metadata tab renders 3 rows',
        'metadata tab renders 3.9 MB',
        'graph node card renders Rows 3 and Size 3.9 MB'
      ),
      'forbidden',
      jsonb_build_array(
        'cy.intercept for /workspace/graph/draft',
        'direct database seeding inside the Cypress spec',
        'invented size labels in the graph card'
      )
    ),
    'tools/planning-db/migrations/545_source_import_live_proof_byte_size_seed_alignment.sql',
    md5('evidence:source-import-live-proof-byte-size-user-flow:545')
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
        ('scripts/run-dev-stack.cjs'),
        ('scripts/run-dev-stack.test.cjs'),
        ('apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'),
        ('tools/planning-db/migrations/545_source_import_live_proof_byte_size_seed_alignment.sql')
    ) refs(ref)
  ),
  architecture_guards = (
    select jsonb_agg(to_jsonb(ref) order by ref)
    from (
      select distinct existing.ref
      from jsonb_array_elements_text(coalesce(architecture_guards, '[]'::jsonb)) existing(ref)
      union
      values
        ('scripts/run-dev-stack.test.cjs'),
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
              ('scripts/run-dev-stack.cjs'),
              ('scripts/run-dev-stack.test.cjs'),
              ('apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'),
              ('tools/planning-db/migrations/545_source_import_live_proof_byte_size_seed_alignment.sql')
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
            ('scripts/run-dev-stack.test.cjs'),
            ('apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'),
            ('scripts/planning-db-migrate.test.cjs')
        ) refs(ref)
      ),
      true
    ),
    '{liveProofByteSizeSeed}',
    jsonb_build_object(
      'seedFunction',
      'buildLocalWarehouseConnectionCatalog',
      'metricSource',
      'byteSize: 4096000',
      'expectedDisplay',
      '3.9 MB',
      'unitTest',
      'scripts/run-dev-stack.test.cjs',
      'userFlow',
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
      'evidence',
      'EV-SOURCE-IMPORT-LIVE-PROOF-BYTE-SIZE-SEED'
    ),
    true
  ),
  updated_at = now()
where feature_id in (
  'E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1',
  'E-CANVAS-ADD-SOURCE-LIVE-FLOW-1'
);
