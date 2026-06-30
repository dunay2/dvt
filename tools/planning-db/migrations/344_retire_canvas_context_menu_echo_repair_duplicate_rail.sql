-- Retire the echo-repair alias rail after its symbols were merged into the
-- canonical ResolveCanvasContextMenu rail. Leaving the repair row active makes
-- the rail vocabulary read model report an exact duplicate with the canonical
-- CanvasNodeContextMenuView owner.

update planning_query_store.feature_mechanization_local_rails
set
  mechanization_status = 'closed',
  rail_status = 'retired',
  raw_rail = coalesce(raw_rail, '{}'::jsonb)
    || jsonb_build_object(
      'status', 'retired',
      'retirementReason',
      'Alias rail superseded by the canonical DVT-CANVAS-NODE-CONTEXT-MENU-VIEW-20260619 ResolveCanvasContextMenu declaration.'
    ),
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'mechanizationStatus', 'retired',
      'retirementReason',
      'Echo-repair alias merged into the canonical ResolveCanvasContextMenu rail; keeping it active creates an exact duplicate vocabulary row.',
      'supersededBy', 'DVT-CANVAS-NODE-CONTEXT-MENU-VIEW-20260619'
    ),
  source_path = 'tools/planning-db/migrations/344_retire_canvas_context_menu_echo_repair_duplicate_rail.sql',
  source_content_sha256 = md5(
    'E-CANVAS-CONTEXT-MENU-GRAMMAR-REPAIR-1:ResolveCanvasContextMenu:retired-duplicate:344'
  ),
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
  'CANVAS-CONTEXT-MENU-ECHO-REPAIR-DUPLICATE-RAIL-RETIREMENT-20260627',
  'E-CANVAS-CONTEXT-MENU-GRAMMAR-REPAIR-1',
  'Canvas context-menu echo repair duplicate rail retirement',
  'Frontend / Canvas',
  'implemented',
  'The echo repair rail was an implementation patch for the canonical ResolveCanvasContextMenu rail, not a separate product query. Retiring the alias keeps feature history while restoring a single active command/query vocabulary row.',
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
