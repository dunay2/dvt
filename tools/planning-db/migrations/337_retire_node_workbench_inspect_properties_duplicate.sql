-- Retire the older local InspectCanvasNodeProperties declaration now that the
-- concrete CanvasNodeWorkbenchPanel component owns the active query rail.
-- Migration 334 remains useful section-authoring evidence, but it must not
-- compete as a second active command/query rail for the same product intent.

update planning_query_store.feature_mechanization_local_rails
set
  mechanization_status = 'closed',
  rail_status = 'retired',
  ddd_owner = 'CanvasNodeWorkbenchPanel',
  documentation_refs = jsonb_build_array(
    'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md#InspectCanvasNodeProperties',
    'docs/architecture/components/web/frontend-component-inventory.md#CanvasNodeWorkbenchPanel'
  ),
  governing_sources = jsonb_build_array(
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md',
    'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md'
  ),
  architecture_guards = jsonb_build_array(
    'planning:db:integrity:check must report zero exact_duplicate rail_vocabulary errors',
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
      '"CanvasNodeWorkbenchPanel"'::jsonb,
      true
    ),
    '{retirementReason}',
    to_jsonb(
      'Superseded by WEB-CANVAS-NODE-WORKBENCH-PANEL-20260619, which owns the active InspectCanvasNodeProperties query rail from the tracked CanvasNodeWorkbenchPanel implementation.'::text
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
      '{commandQueryRails}',
      jsonb_build_array(
        jsonb_build_object(
          'name',
          'InspectCanvasNodeProperties',
          'type',
          'query',
          'status',
          'retired',
          'dddOwner',
          'CanvasNodeWorkbenchPanel'
        )
      ),
      true
    ),
    '{duplicateRetirementReason}',
    to_jsonb(
      'Retired because the same InspectCanvasNodeProperties query rail is actively owned by WEB-CANVAS-NODE-WORKBENCH-PANEL-20260619 and backed by CanvasNodeWorkbenchPanel.tsx.'::text
    ),
    true
  ),
  revision = greatest(revision, 1) + 1,
  updated_at = now()
where feature_id = 'CANVAS-NODE-CONTEXT-PROPERTIES-PANEL-20260604'
  and rail_type = 'query'
  and normalized_rail_name = 'inspectcanvasnodeproperties'
  and source_path = 'tools/planning-db/migrations/334_canvas_node_workbench_section_authoring.sql';
