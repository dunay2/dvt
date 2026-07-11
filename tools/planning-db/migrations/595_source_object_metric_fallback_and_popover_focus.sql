-- Reconcile the hard-QA findings for source metric completeness and the
-- existing GraphNodeHealthPopover interaction contract. Provider statistics
-- and query plans remain the preferred row-count paths; an authorized exact
-- scan is the last-resort data-plane fallback. The popover now receives focus
-- when opened so its established Escape close rail is usable from the browser.

update planning_query_store.feature_mechanization_local_rails rails
set
  symbol_refs = (
    select jsonb_agg(distinct ref order by ref)
    from jsonb_array_elements_text(
      coalesce(rails.symbol_refs, '[]'::jsonb)
        || jsonb_build_array(
          'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.ts#loadPostgresExactRowCount'
        )
    ) refs(ref)
  ),
  raw_manifest = jsonb_set(
    jsonb_set(
      coalesce(rails.raw_manifest, '{}'::jsonb),
      '{sourceObjectMetricEvidence,rowCountResolution}',
      jsonb_build_object(
        'preferred', jsonb_build_array('provider-statistics', 'query-plan'),
        'lastResort', 'authorized data-scan',
        'invariant', 'An object exposed as importable must carry usable row-count and byte-size evidence.',
        'noSyntheticFallback', true
      ),
      true
    ),
    '{symbols}',
    coalesce(
      (
        select jsonb_agg(
          case
            when symbol ->> 'name' = 'buildPostgresSourceObjectMetricEvidence'
              then symbol || jsonb_build_object(
                'fowlerSignals', jsonb_build_array(
                  'provider-specific estimation stays behind the Postgres adapter',
                  'provider statistics and query plans are preferred over data scans',
                  'authorized exact scans are last-resort row evidence',
                  'schema-width estimates are low-confidence byte evidence'
                )
              )
            else symbol
          end
          order by symbol ->> 'path', symbol ->> 'name'
        )
        from jsonb_array_elements(coalesce(rails.raw_manifest -> 'symbols', '[]'::jsonb)) symbols(symbol)
      ),
      '[]'::jsonb
    ),
    true
  ),
  source_path = 'tools/planning-db/migrations/595_source_object_metric_fallback_and_popover_focus.sql',
  source_content_sha256 = md5('ListWarehouseConnectionTables:source-object-metric-fallback:595'),
  revision = rails.revision + 1,
  updated_at = now()
where rails.rail_name = 'ListWarehouseConnectionTables'
  and rails.rail_type = 'query';

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values (
  'api.component.sourceImport.SourceObjectMetricEvidence',
  'invariant',
  'Provider statistics and query plans are preferred; an authorized exact data scan is the last-resort row-count method.',
  1
)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update planning_query_store.frontend_component_local_components
set
  raw_component = coalesce(raw_component, '{}'::jsonb) || jsonb_build_object(
    'focusOnOpen', true,
    'keyboardCloseRail', 'CloseCanvasNodeHealthPopover'
  ),
  source_path = 'tools/planning-db/migrations/595_source_object_metric_fallback_and_popover_focus.sql',
  source_content_sha256 = md5('component:GraphNodeHealthPopover:focus-on-open:595'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeHealthPopover';

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb) || jsonb_build_object(
    'focusOnOpen', true,
    'escapeCloseProven', true
  ),
  source_path = 'tools/planning-db/migrations/595_source_object_metric_fallback_and_popover_focus.sql',
  source_content_sha256 = md5('file:GraphNodeHealthPopoverView:focus-on-open:595'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeHealthPopover'
  and file_path in (
    'apps/web/src/app/plugins/graph/GraphNodeHealthPopoverView.tsx',
    'apps/web/src/app/plugins/graph/GraphNodeHealthPopoverView.test.tsx'
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
values (
  'web.component.canvas.GraphNodeHealthPopover',
  'EV-GRAPH-NODE-HEALTH-POPOVER-FOCUS-ON-OPEN',
  'presentation-test',
  'current',
  'apps/web/src/app/plugins/graph/GraphNodeHealthPopoverView.test.tsx',
  'CloseCanvasNodeHealthPopover',
  'graph-node-health-popover-focus-on-open',
  'The opened detail dialog owns keyboard focus and closes through Escape without depending on an unreachable key handler.',
  jsonb_build_object(
    'focusOnOpen', true,
    'escapeClose', true,
    'nonModal', true
  ),
  'tools/planning-db/migrations/595_source_object_metric_fallback_and_popover_focus.sql',
  md5('evidence:GraphNodeHealthPopover:focus-on-open:595')
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
