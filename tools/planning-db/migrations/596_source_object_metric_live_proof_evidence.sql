-- Register the demanding-user browser proof and remove the last fake metric
-- path from the local coordinated stack. This extends evidence for existing
-- rails and components; it does not introduce a command/query synonym.

update planning_query_store.feature_mechanization_local_rails rails
set
  implementation_refs = (
    select jsonb_agg(distinct ref order by ref)
    from jsonb_array_elements_text(
      coalesce(rails.implementation_refs, '[]'::jsonb)
        || jsonb_build_array(
          'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
          'scripts/run-canvas-source-import-live-proof.cjs',
          'scripts/run-dev-stack.cjs'
        )
    ) refs(ref)
  ),
  raw_manifest = jsonb_set(
    coalesce(rails.raw_manifest, '{}'::jsonb),
    '{sourceObjectMetricEvidence,liveProof}',
    jsonb_build_object(
      'spec', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
      'runner', 'scripts/run-canvas-source-import-live-proof.cjs',
      'noDraftIntercept', true,
      'measuredDevCatalog', true,
      'proves', jsonb_build_array(
        'real connection discovery and authoritative identity-only import',
        'estimated row evidence is warning-toned and explained by tooltip',
        'measured byte evidence is success-toned and explained by tooltip',
        'health details receive focus, expose non-duplicated detail, and close on Escape',
        'source connects to a DBT model and reaches persisted execution preview'
      )
    ),
    true
  ),
  source_path = 'tools/planning-db/migrations/596_source_object_metric_live_proof_evidence.sql',
  source_content_sha256 = md5(rails.rail_name || ':source-object-metric-live-proof:596'),
  revision = rails.revision + 1,
  updated_at = now()
where rails.rail_name in (
  'ListWarehouseConnectionTables',
  'ImportWarehouseSources'
);

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
    'web.component.canvas.GraphNodeVolumeMetricProjection',
    'EV-SOURCE-OBJECT-METRIC-LIVE-PROOF',
    'e2e-test',
    'current',
    'node scripts/run-canvas-source-import-live-proof.cjs',
    'RenderCanvasGraphNodeOperationalSummary',
    'source-object-metric-live-proof',
    'A live source import renders provider evidence with the correct compact values, tones, and complete operator detail.',
    jsonb_build_object('noIntercept', true, 'measuredAndEstimated', true, 'realPostgres', true),
    'tools/planning-db/migrations/596_source_object_metric_live_proof_evidence.sql',
    md5('evidence:GraphNodeVolumeMetricProjection:live-proof:596')
  ),
  (
    'web.component.canvas.GraphNodeMetricHotspot',
    'EV-GRAPH-NODE-METRIC-HOTSPOT-LIVE-PROOF',
    'e2e-test',
    'current',
    'node scripts/run-canvas-source-import-live-proof.cjs',
    'RenderCanvasGraphNodeCard',
    'graph-node-metric-hotspot-live-proof',
    'A browser user can hover compact row and size values and read provenance, method, confidence, and full value detail.',
    jsonb_build_object('hover', true, 'warningTone', true, 'successTone', true),
    'tools/planning-db/migrations/596_source_object_metric_live_proof_evidence.sql',
    md5('evidence:GraphNodeMetricHotspot:live-proof:596')
  ),
  (
    'web.component.canvas.GraphNodeHealthPopover',
    'EV-GRAPH-NODE-HEALTH-POPOVER-METRIC-LIVE-PROOF',
    'e2e-test',
    'current',
    'node scripts/run-canvas-source-import-live-proof.cjs',
    'RenderCanvasNodeHealthPopover',
    'graph-node-health-popover-metric-live-proof',
    'The live Health surface receives focus, exposes columns and byte-level details without repeating rail metrics, and closes on Escape.',
    jsonb_build_object('focusOnOpen', true, 'escapeClose', true, 'noRailDuplication', true),
    'tools/planning-db/migrations/596_source_object_metric_live_proof_evidence.sql',
    md5('evidence:GraphNodeHealthPopover:metric-live-proof:596')
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
