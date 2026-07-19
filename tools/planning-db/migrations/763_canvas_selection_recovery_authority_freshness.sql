-- A resolved query transport is not sufficient recovery authority. DBT
-- refresh succeeds only when the returned project projection is usable.

update architecture.design
set
  rationale = 'Execution-selection recovery is explicit and fail-closed. Refresh analysis produces a success receipt only when the authority query succeeds and the owning context accepts the returned projection as usable; DBT requires fresh analysis.',
  updated_at = now()
where design_id = 'AD-DBT-SELECTION-RECOVERY-20260717';

update architecture.component_responsibility
set
  responsibility = 'Classify blocked DBT selection and execute explicit recovery strategies against query-success and context-specific authority-usability policy.',
  reason_to_change = 'Selection recovery algebra, strategy vocabulary, query result adaptation, or authority usability policy changes.',
  status = 'approved'
where responsibility_id = 'RESP-WEB-DBT-SELECTION-RECOVERY';

update architecture.component_port
set
  negative_tests = array_append(
    array_remove(negative_tests, 'query refresh errors fabricate a recovery success receipt'),
    'query success with stale-last-valid, invalid, or unavailable DBT authority fabricates a recovery success receipt'
  ),
  status = 'approved'
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY'
  and port_name = 'RecoverCanvasExecutionSelection';

delete from planning_query_store.governance_component_local_semantic_items
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY'
  and item_kind = 'invariant'
  and item_value = 'Refresh success requires authoritative query success; errors never fabricate receipts.';

insert into planning_query_store.governance_component_local_semantic_items (
  component_id, item_kind, item_value, item_order
)
values (
  'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY',
  'invariant',
  'Refresh success requires both authoritative query success and context-specific usable authority; DBT stale-last-valid, invalid, and unavailable projections fail closed.',
  2
)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update planning_query_store.frontend_component_validation_evidence
set
  evidence_status = 'gap',
  proves = 'Query errors and successful responses carrying unusable DBT freshness both reject and cannot fabricate recovery success.',
  raw_evidence = jsonb_build_object(
    'falseTransportSuccessRejected', true,
    'staleLastValidRejected', true,
    'invalidRejected', true,
    'unavailableRejected', true
  ),
  source_path = 'tools/planning-db/migrations/763_canvas_selection_recovery_authority_freshness.sql',
  source_content_sha256 = md5('validation:selection-recovery-authority-freshness:763'),
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY'
  and evidence_id = 'VAL-WEB-DBT-SELECTION-RECOVERY-AUTHORITY';

do $$
begin
  if not exists (
    select 1
    from planning_query_store.frontend_component_local_cq_rails
    where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY'
      and rail_name = 'RecoverCanvasExecutionSelection'
      and rail_kind = 'command'
  ) then
    raise exception 'Selection recovery authority policy lost its canonical command rail';
  end if;
end
$$;
