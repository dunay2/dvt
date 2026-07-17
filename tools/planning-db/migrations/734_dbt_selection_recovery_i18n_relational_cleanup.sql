begin;

delete from architecture.component_test
where test_id = 'TEST-WEB-DBT-SELECTION-RECOVERY-COPY';

update architecture.component_responsibility
set reason_to_change = 'Selection recovery presentation or its i18n message projection changes.'
where responsibility_id = 'RESP-WEB-DBT-SELECTION-RECOVERY-VIEW';

update architecture.component_port
set negative_tests = array[
      'presentation derives execution scope',
      'action labels bypass the ResolveCanvasViewCopy i18n rail',
      'failure fabricates a success receipt'
    ]::text[]
where port_id = 'PORT-WEB-DBT-SELECTION-RECOVERY-VIEW-IN';

delete from planning_query_store.governance_component_local_semantic_items
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW'
  and item_kind in ('reason_to_change', 'public_api', 'invariant', 'governance_ref');

insert into planning_query_store.governance_component_local_semantic_items (
  component_id, item_kind, item_value, item_order
)
values
  (
    'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW',
    'reason_to_change',
    'Operational selection recovery presentation or its i18n message projection changes.',
    0
  ),
  (
    'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW',
    'public_api',
    'OperationalDrawerSelectionRecoveryView;OperationalDrawerSelectionRecoveryMessages;formatOperationalDrawerSelectionRecoveryReceipt',
    0
  ),
  (
    'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW',
    'invariant',
    'The presentation template contains no store access, business derivation, localized literals, or ad hoc CSS.',
    0
  ),
  (
    'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW',
    'governance_ref',
    'web.component.canvas.CanvasCopyCatalog:ResolveCanvasViewCopy',
    0
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update planning_query_store.governance_component_local_definitions
set cq_rails = 'CollectCanvasExecutionSelection;RecoverCanvasExecutionSelection;ResolveCanvasViewCopy',
    source_path = 'tools/planning-db/migrations/734_dbt_selection_recovery_i18n_relational_cleanup.sql',
    source_content_sha256 = repeat(md5('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW:734'), 2),
    revision = revision + 1
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW';

update planning_query_store.frontend_component_local_components
set responsibility = 'Render a supplied recovery contract using the canonical Canvas i18n query rail.',
    raw_component = raw_component || jsonb_build_object(
      'i18nProviderComponentId', 'web.component.canvas.CanvasCopyCatalog',
      'i18nRail', 'ResolveCanvasViewCopy',
      'ownsLocalizedMessages', false
    ),
    source_path = 'tools/planning-db/migrations/734_dbt_selection_recovery_i18n_relational_cleanup.sql',
    source_content_sha256 = md5('frontend:CanvasDbtExecutionSelectionRecoveryView:i18n:734'),
    updated_at = now()
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW';

insert into planning_query_store.frontend_component_local_cq_rails (
  component_id, rail_name, rail_kind, rail_status, raw_rail, source_path,
  source_content_sha256
)
values (
  'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW',
  'ResolveCanvasViewCopy',
  'local-query',
  'implemented-local',
  jsonb_build_object(
    'ownership', 'consumed',
    'ownerComponentId', 'web.component.canvas.CanvasCopyCatalog',
    'readModel', 'CanvasViewCopy',
    'adapterSurface', 'apps/web/src/app/views/canvas/canvasCopyCatalog.ts'
  ),
  'tools/planning-db/migrations/734_dbt_selection_recovery_i18n_relational_cleanup.sql',
  md5('rail:selection-recovery-view:ResolveCanvasViewCopy:734')
)
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = excluded.raw_rail,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_local_evidence (
  evidence_id, component_id, evidence_kind, evidence_ref, evidence_status,
  raw_evidence, source_path, source_content_sha256
)
values (
  'EV-WEB-DBT-SELECTION-RECOVERY-I18N-CATALOG',
  'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW',
  'unit-test',
  'apps/web/src/app/views/canvas/copy.test.ts',
  'passing',
  jsonb_build_object(
    'rail', 'ResolveCanvasViewCopy',
    'ownerComponentId', 'web.component.canvas.CanvasCopyCatalog',
    'locales', jsonb_build_array('en', 'es')
  ),
  'tools/planning-db/migrations/734_dbt_selection_recovery_i18n_relational_cleanup.sql',
  md5('evidence:selection-recovery-view:i18n-catalog:734')
)
on conflict (evidence_id) do update set
  component_id = excluded.component_id,
  evidence_kind = excluded.evidence_kind,
  evidence_ref = excluded.evidence_ref,
  evidence_status = excluded.evidence_status,
  raw_evidence = excluded.raw_evidence,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

do $$
declare
  stale_copy_test_count integer;
  stale_copy_semantic_count integer;
  i18n_rail_count integer;
  canonical_i18n_file_count integer;
begin
  select count(*) into stale_copy_test_count
  from architecture.component_test
  where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW'
    and test_path ilike '%SelectionRecoveryCopy%';

  select count(*) into stale_copy_semantic_count
  from planning_query_store.governance_component_local_semantic_items
  where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW'
    and item_value ilike '%localized copy%';

  select count(*) into i18n_rail_count
  from planning_query_store.frontend_component_local_cq_rails
  where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW'
    and rail_name = 'ResolveCanvasViewCopy'
    and raw_rail->>'ownership' = 'consumed'
    and raw_rail->>'ownerComponentId' = 'web.component.canvas.CanvasCopyCatalog';

  select count(*) into canonical_i18n_file_count
  from planning_query_store.frontend_component_file_query
  where component_id = 'web.component.canvas.CanvasCopyCatalog'
    and file_path in (
      'apps/web/src/app/views/canvas/canvasCopy.types.ts',
      'apps/web/src/app/views/canvas/canvasCopyCatalog.execution.ts',
      'apps/web/src/app/views/canvas/canvasCopyCatalog.execution.es.ts'
    );

  if stale_copy_test_count <> 0 or stale_copy_semantic_count <> 0 then
    raise exception 'Selection recovery retains stale local-copy metadata: tests=%, semantics=%',
      stale_copy_test_count, stale_copy_semantic_count;
  end if;

  if i18n_rail_count <> 1 then
    raise exception 'Selection recovery must consume exactly one ResolveCanvasViewCopy rail, found %',
      i18n_rail_count;
  end if;

  if canonical_i18n_file_count <> 3 then
    raise exception 'CanvasCopyCatalog must own all three recovery i18n surfaces, found %',
      canonical_i18n_file_count;
  end if;
end $$;

commit;
