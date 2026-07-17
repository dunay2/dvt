-- Preserve a recovery path for invalid selection state created by an older
-- client without reopening non-executable DBT resources as selectable roots.

update architecture.design
set
  rationale = 'CollectCanvasExecutionSelection remains the single policy seam. It rejects a non-empty explicit set when any member is unavailable or non-executable, exposes Select only for executable DBT roots, exposes Deselect for an already-selected invalid resource, and separates requested roots from dependencies derived by transitive closure.',
  updated_at = now()
where design_id = 'AD-DBT-SELECTION-INTENT-INTEGRITY-20260716';

delete from planning_query_store.governance_component_local_semantic_items
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION'
  and item_kind = 'public_api';

insert into planning_query_store.governance_component_local_semantic_items (
  component_id, item_kind, item_value, item_order
)
values
  (
    'SYS-WEB-CANVAS-EXECUTION-SELECTION',
    'public_api',
    'collectPreviewSelection;collectPlanSelection;isDbtExecutionSelectableNode;canOfferDbtExecutionSelectionToggle;resolveDbtExecutionScope;buildCanvasDbtExecutionProjection',
    0
  ),
  (
    'SYS-WEB-CANVAS-EXECUTION-SELECTION',
    'invariant',
    'A non-executable DBT resource never exposes Select; an already-selected invalid resource exposes only Deselect so the user can recover without widening scope.',
    5
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update planning_query_store.frontend_component_context_actions
set
  raw_action = raw_action || jsonb_build_object(
    'ineligibleBehavior', 'omit Select; expose Deselect only when already selected',
    'recoveryBehavior', 'remove invalid persisted member without widening execution scope'
  ),
  source_path = 'tools/planning-db/migrations/710_dbt_selection_recovery_affordance.sql',
  source_content_sha256 = md5('GraphNodeCard:selection-recovery:710'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCard'
  and context_id = 'node-card'
  and action_id = 'toggle-execution-selection-from-card';

update planning_query_store.frontend_component_validation_evidence
set
  proves = 'DBT sources omit Select; a source inherited in persisted selection exposes Deselect only, while model, test, and snapshot roots expose selection.',
  raw_evidence = raw_evidence || jsonb_build_object(
    'invalidPersistedSelectionCanBeRemoved', true,
    'invalidResourceCanBeNewlySelected', false
  ),
  source_path = 'tools/planning-db/migrations/710_dbt_selection_recovery_affordance.sql',
  source_content_sha256 = md5('validation:dbt-selection-recovery:710'),
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION'
  and evidence_id = 'VAL-WEB-DBT-SELECTION-AFFORDANCE';

do $$
declare
  recovery_behavior text;
  recovery_evidence boolean;
begin
  select raw_action->>'recoveryBehavior' into recovery_behavior
  from planning_query_store.frontend_component_context_actions
  where component_id = 'web.component.canvas.GraphNodeCard'
    and context_id = 'node-card'
    and action_id = 'toggle-execution-selection-from-card';

  select (raw_evidence->>'invalidPersistedSelectionCanBeRemoved')::boolean
  into recovery_evidence
  from planning_query_store.frontend_component_validation_evidence
  where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION'
    and evidence_id = 'VAL-WEB-DBT-SELECTION-AFFORDANCE';

  if recovery_behavior is distinct from 'remove invalid persisted member without widening execution scope' then
    raise exception 'GraphNodeCard must declare the invalid-selection recovery behavior';
  end if;

  if recovery_evidence is distinct from true then
    raise exception 'DBT selection recovery requires relational presentation evidence';
  end if;
end $$;
