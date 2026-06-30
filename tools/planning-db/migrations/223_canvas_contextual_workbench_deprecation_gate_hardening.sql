-- Complete the deprecated Canvas contextual workbench local rail gate.
-- Migration 222 moved the stale DB-local row to the command/query catalog as
-- deprecated transition evidence. Because that catalog path is a governed
-- feature-mechanization source, its local row must still carry the repository
-- closeout gate explicitly.

with target_gate as (
  select
    rail.rail_id,
    (
      select jsonb_agg(distinct gate.value order by gate.value)
      from (
        select value
        from jsonb_array_elements_text(coalesce(rail.completion_gate, '[]'::jsonb)) existing_gate(value)
        union all
        select 'pnpm verify:prepush'
      ) gate
    ) as completion_gate
  from planning_query_store.feature_mechanization_local_rails rail
  where rail.rail_id = 'local#CANVAS-CONTEXTUAL-PROJECT-CODE-20260619#query#resolvecanvascontextmenu'
    and rail.rail_status = 'deprecated'
)
update planning_query_store.feature_mechanization_local_rails rail
set
  completion_gate = target_gate.completion_gate,
  raw_manifest = jsonb_set(
    coalesce(rail.raw_manifest, '{}'::jsonb),
    '{completionGate}',
    target_gate.completion_gate,
    true
  ) || jsonb_build_object(
    'completionGateHardenedBy',
    '223_canvas_contextual_workbench_deprecation_gate_hardening',
    'completionGatePolicy',
    'Deprecated DB-local rail evidence still carries pnpm verify:prepush when exposed from a governed feature-mechanization source.'
  ),
  raw_rail = coalesce(rail.raw_rail, '{}'::jsonb) || jsonb_build_object(
    'completionGateHardenedBy',
    '223_canvas_contextual_workbench_deprecation_gate_hardening',
    'completionGatePolicy',
    'Deprecated DB-local rail evidence still carries pnpm verify:prepush when exposed from a governed feature-mechanization source.'
  ),
  revision = rail.revision + 1,
  updated_at = now()
from target_gate
where rail.rail_id = target_gate.rail_id;
