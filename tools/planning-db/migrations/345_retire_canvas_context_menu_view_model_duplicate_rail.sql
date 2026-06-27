-- The Canvas context-menu view-model slice is an internal presenter extraction
-- under the existing ResolveCanvasContextMenu rail. It must not register a
-- second active command/query rail for the same product intent.

update planning_query_store.feature_mechanization_local_rails
set
  mechanization_status = 'closed',
  rail_status = 'retired',
  ddd_owner = 'CanvasNodeContextMenuView',
  documentation_refs = jsonb_build_array(
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md#ResolveCanvasContextMenu'
  ),
  governing_sources = jsonb_build_array(
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md',
    'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md'
  ),
  architecture_guards = jsonb_build_array(
    'pnpm planning:db:integrity:check',
    'pnpm docs:feature-mechanization:implementation'
  ),
  completion_gate = jsonb_build_array(
    'pnpm planning:db:integrity:check',
    'pnpm verify:prepush'
  ),
  raw_rail = jsonb_set(
    jsonb_set(
      jsonb_set(
        coalesce(raw_rail, '{}'::jsonb),
        '{status}',
        '"retired"'::jsonb,
        true
      ),
      '{dddOwner}',
      '"CanvasNodeContextMenuView"'::jsonb,
      true
    ),
    '{retirementReason}',
    to_jsonb(
      'Presenter extraction reuses the canonical DVT-CANVAS-NODE-CONTEXT-MENU-VIEW-20260619 ResolveCanvasContextMenu query rail and must not remain as a second active rail.'::text
    ),
    true
  ),
  raw_manifest = jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          coalesce(raw_manifest, '{}'::jsonb),
          '{mechanizationStatus}',
          '"closed"'::jsonb,
          true
        ),
        '{commandQueryRails}',
        jsonb_build_array(
          jsonb_build_object(
            'name',
            'ResolveCanvasContextMenu',
            'type',
            'query',
            'status',
            'retired',
            'dddOwner',
            'CanvasNodeContextMenuView',
            'reusedCanonicalFeatureId',
            'DVT-CANVAS-NODE-CONTEXT-MENU-VIEW-20260619'
          )
        ),
        true
      ),
      '{duplicateRetirementReason}',
      to_jsonb(
        'Retired because the presenter extraction is an internal view-model implementation of the canonical ResolveCanvasContextMenu query, not a new product rail.'::text
      ),
      true
    ),
    '{canonicalRailReuse}',
    to_jsonb('DVT-CANVAS-NODE-CONTEXT-MENU-VIEW-20260619'::text),
    true
  ),
  source_path = 'tools/planning-db/migrations/345_retire_canvas_context_menu_view_model_duplicate_rail.sql',
  source_content_sha256 = md5(
    'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:ResolveCanvasContextMenu:view-model-retired-duplicate:345'
  ),
  revision = greatest(revision, 1) + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_type = 'query'
  and normalized_rail_name = 'resolvecanvascontextmenu'
  and ddd_owner = 'web.component.canvas.CanvasContextMenu';

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
  'CANVAS-CONTEXT-MENU-VIEW-MODEL-DUPLICATE-RAIL-RETIREMENT-20260627',
  'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1',
  'Canvas context-menu view-model canonical rail reuse',
  'Frontend / Canvas',
  'implemented',
  'The view-model extraction is a presenter refactor under ResolveCanvasContextMenu. Retiring the slice-local rail prevents duplicate vocabulary while preserving DB-first symbol and validation evidence.',
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
