-- Retire the feature-local Canvas context-menu echo guard rail declaration.
-- The echo guard implements presenter behavior under the existing
-- ResolveCanvasContextMenu rail; it must not remain a second active canonical
-- query declaration beside the Canvas interaction command surface rail.

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
  'PLANNING-DB-WEB-CANVAS-CONTEXT-MENU-ECHO-GUARD-RAIL-DEDUP-20260619',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Web Canvas context-menu echo guard rail de-duplication',
  'Architecture / Planning DB / Frontend',
  'implemented',
  'CANVAS-CONTEXTUAL-PROJECT-CODE-20260619 implemented presenter echo-guard behavior under ResolveCanvasContextMenu, but its local feature rail row stayed active as a second canonical query declaration. Retire that local row as an alias/evidence record and keep the Canvas interaction command surface rail as the unique active query rail.',
  'boundary_drift',
  'ResolveCanvasContextMenu;CheckPlanningDbComponentIntegrity;ReadRailVocabulary',
  now()
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  approved_at = coalesce(architecture.design.approved_at, excluded.approved_at),
  updated_at = now();

insert into architecture.design_scope (
  design_id,
  subject_kind,
  subject_id,
  scope_kind,
  required
)
values
  (
    'PLANNING-DB-WEB-CANVAS-CONTEXT-MENU-ECHO-GUARD-RAIL-DEDUP-20260619',
    'query',
    'ResolveCanvasContextMenu',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-CONTEXT-MENU-ECHO-GUARD-RAIL-DEDUP-20260619',
    'path',
    'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md',
    'may_reference',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-CONTEXT-MENU-ECHO-GUARD-RAIL-DEDUP-20260619',
    'path',
    'docs/architecture/components/web/graph/canvas-interaction-command-surface-component.md',
    'may_reference',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-CONTEXT-MENU-ECHO-GUARD-RAIL-DEDUP-20260619',
    'path',
    'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts',
    'may_reference',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update planning_query_store.feature_mechanization_local_rails
set
  mechanization_status = 'closed',
  rail_status = 'retired',
  documentation_refs = jsonb_build_array(
    'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md#ResolveCanvasContextMenu',
    'docs/architecture/components/web/graph/canvas-interaction-command-surface-component.md#ResolveCanvasContextMenu'
  ),
  governing_sources = jsonb_build_array(
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md',
    'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md',
    'docs/architecture/components/web/graph/canvas-interaction-command-surface-component.md'
  ),
  architecture_guards = jsonb_build_array(
    'pnpm planning:db:query rail-vocabulary --rail ResolveCanvasContextMenu --no-refresh --limit 80 must report no exact_duplicate rows',
    'pnpm planning:db:integrity:check must report zero rail_vocabulary violations'
  ),
  completion_gate = jsonb_build_array(
    'pnpm planning:db:query rail-vocabulary --rail ResolveCanvasContextMenu --no-refresh --limit 80',
    'pnpm planning:db:integrity:check',
    'pnpm verify:prepush'
  ),
  raw_rail = jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          coalesce(raw_rail, '{}'::jsonb),
          '{status}',
          '"retired"'::jsonb,
          true
        ),
        '{aliasOf}',
        '"ResolveCanvasContextMenu"'::jsonb,
        true
      ),
      '{canonicalFeatureId}',
      '"DVT-CANVAS-P0-PRO-FLOW-1"'::jsonb,
      true
    ),
    '{retirementReason}',
    to_jsonb(
      'Retired duplicate local rail declaration: CANVAS-CONTEXTUAL-PROJECT-CODE-20260619 is implementation evidence for the context-menu presenter echo guard, not a second canonical ResolveCanvasContextMenu query rail.'::text
    ),
    true
  ),
  raw_manifest = jsonb_set(
    jsonb_set(
      jsonb_set(
        coalesce(raw_manifest, '{}'::jsonb),
        '{mechanizationStatus}',
        '"closed"'::jsonb,
        true
      ),
      '{duplicateRetirementReason}',
      to_jsonb(
        'The echo guard feature implements useCanvasContextMenuPresenter under the existing ResolveCanvasContextMenu rail. The active canonical query rail remains DVT-CANVAS-P0-PRO-FLOW-1.'::text
      ),
      true
    ),
    '{canonicalRailFeatureId}',
    '"DVT-CANVAS-P0-PRO-FLOW-1"'::jsonb,
    true
  ),
  revision = greatest(revision, 1) + 1,
  updated_at = now()
where feature_id = 'CANVAS-CONTEXTUAL-PROJECT-CODE-20260619'
  and normalized_rail_name = 'resolvecanvascontextmenu'
  and rail_type = 'query';
