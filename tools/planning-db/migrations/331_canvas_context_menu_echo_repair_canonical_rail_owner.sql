-- Reuse the existing active ResolveCanvasContextMenu rail owner. The echo
-- repair is a lifecycle refinement of the canonical Canvas node context menu
-- rail, not a second product rail.

update planning_query_store.feature_mechanization_local_rails
set
  ddd_owner = 'CanvasNodeContextMenuView',
  raw_rail = jsonb_build_object(
    'name', 'ResolveCanvasContextMenu',
    'type', 'query',
    'status', 'implemented',
    'dddOwner', 'CanvasNodeContextMenuView'
  ),
  raw_manifest = jsonb_set(
    jsonb_set(
      raw_manifest,
      '{commandQueryRails,0,dddOwner}',
      to_jsonb('CanvasNodeContextMenuView'::text),
      false
    ),
    '{domainObjects}',
    jsonb_build_array(
      jsonb_build_object(
        'name', 'CanvasNodeContextMenuView',
        'type', 'context menu view',
        'owner', 'Canvas workbench'
      ),
      jsonb_build_object(
        'name', 'CanvasContextMenuPresenter',
        'type', 'interaction presenter',
        'owner', 'Canvas workbench'
      )
    ),
    true
  ),
  source_path = 'tools/planning-db/migrations/331_canvas_context_menu_echo_repair_canonical_rail_owner.sql',
  source_content_sha256 = repeat('d', 64),
  revision = revision + 1,
  updated_at = now()
where rail_id =
  'tools/planning-db/migrations/329_canvas_context_menu_echo_consumption_repair.sql#E-CANVAS-CONTEXT-MENU-GRAMMAR-REPAIR-1#query#001#resolvecanvascontextmenu';

insert into architecture.design (
  design_id,
  work_item_id,
  title,
  owner,
  status,
  rationale,
  fowler_signal,
  rail_ref,
  approved_at
)
values (
  'CANVAS-CONTEXT-MENU-ECHO-REPAIR-CANONICAL-RAIL-OWNER-20260626',
  'E-CANVAS-CONTEXT-MENU-GRAMMAR-REPAIR-1',
  'Canvas context-menu echo repair canonical rail owner',
  'Frontend / Canvas',
  'implemented',
  'The echo repair initially recorded a second active ResolveCanvasContextMenu declaration with a different owner. The canonical rail is already active under CanvasNodeContextMenuView, so the repair reuses that owner and leaves command_query_rail_vocabulary_query with zero exact_duplicate findings.',
  'hidden_authority',
  'ResolveCanvasContextMenu',
  now()
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  approved_at = coalesce(architecture.design.approved_at, excluded.approved_at),
  updated_at = now();
