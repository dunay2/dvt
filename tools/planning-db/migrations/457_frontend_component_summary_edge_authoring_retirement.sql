-- Keep frontend component summaries aligned with file ownership retirement.
-- Migration 456 moved connection compatibility ownership to edge authoring and
-- filtered retired rows from frontend_component_file_query. This projection
-- applies the same file-count rule to frontend_component_summary_query.

create or replace view planning_query_store.frontend_component_summary_query as
with effective_files as (
  select
    imported.component_id,
    imported.file_path,
    imported.file_role,
    imported.raw_file
  from planning_query_store.frontend_component_files imported
  where not exists (
    select 1
    from planning_query_store.frontend_component_local_files local_file
    where local_file.component_id = imported.component_id
      and local_file.file_path = imported.file_path
      and local_file.file_role = imported.file_role
  )
  union all
  select
    local_file.component_id,
    local_file.file_path,
    local_file.file_role,
    local_file.raw_file
  from planning_query_store.frontend_component_local_files local_file
),
effective_rails as (
  select
    imported.component_id,
    imported.rail_name,
    imported.raw_rail
  from planning_query_store.frontend_component_cq_rails imported
  where not exists (
    select 1
    from planning_query_store.frontend_component_local_cq_rails local_rail
    where local_rail.component_id = imported.component_id
      and local_rail.rail_name = imported.rail_name
  )
  union all
  select
    local_rail.component_id,
    local_rail.rail_name,
    local_rail.raw_rail
  from planning_query_store.frontend_component_local_cq_rails local_rail
),
effective_evidence as (
  select
    imported.component_id,
    imported.evidence_id
  from planning_query_store.frontend_component_evidence imported
  where not exists (
    select 1
    from planning_query_store.frontend_component_local_evidence local_evidence
    where local_evidence.evidence_id = imported.evidence_id
  )
  union all
  select
    local_evidence.component_id,
    local_evidence.evidence_id
  from planning_query_store.frontend_component_local_evidence local_evidence
),
surface_rollups as (
  select
    link.component_id,
    jsonb_agg(link.surface_id order by link.surface_id) as surface_ids,
    count(*)::int as surface_count
  from planning_query_store.frontend_component_surface_link_query link
  group by link.component_id
),
file_counts as (
  select
    file_ref.component_id,
    count(*)::int as file_count
  from effective_files file_ref
  where not coalesce((file_ref.raw_file ->> 'retiredForContextActionCatalog')::boolean, false)
    and not coalesce((file_ref.raw_file ->> 'retiredForPresentationOwnership')::boolean, false)
    and not coalesce((file_ref.raw_file ->> 'retiredForEdgeAuthoringOwnership')::boolean, false)
  group by file_ref.component_id
),
rail_counts as (
  select
    rail_relation.component_id,
    count(*)::int as rail_count
  from (
    select distinct
      rail.component_id,
      rail.rail_name
    from effective_rails rail
    where not coalesce((rail.raw_rail ->> 'retiredForContextActionCatalog')::boolean, false)
    union
    select distinct
      action.component_id,
      action.rail_name
    from planning_query_store.frontend_component_context_actions action
    where action.rail_name is not null
      and action.action_status <> 'retired'
  ) rail_relation
  group by rail_relation.component_id
),
evidence_counts as (
  select
    evidence.component_id,
    count(*)::int as evidence_count
  from effective_evidence evidence
  group by evidence.component_id
),
gap_counts as (
  select
    gap.component_id,
    count(*)::int as capability_gap_count
  from planning_query_store.frontend_component_capability_gaps gap
  where gap.gap_status in ('open', 'planned', 'moved')
  group by gap.component_id
),
validation_evidence_counts as (
  select
    evidence.component_id,
    count(*)::int as evidence_ref_count
  from planning_query_store.frontend_component_validation_evidence evidence
  where evidence.evidence_status = 'current'
  group by evidence.component_id
)
select
  component.component_id,
  component.component_name,
  component.component_kind,
  component.component_status,
  component.reuse_decision,
  component.frontend_owner,
  component.responsibility,
  component.package_name,
  component.route_scope,
  component.plugin_scope,
  component.capability_gaps,
  component.evidence_refs,
  coalesce(surface_rollups.surface_ids, '[]'::jsonb) as surface_ids,
  coalesce(surface_rollups.surface_count, 0) as surface_count,
  coalesce(file_counts.file_count, 0) as file_count,
  coalesce(rail_counts.rail_count, 0) as rail_count,
  coalesce(evidence_counts.evidence_count, 0) as evidence_count,
  coalesce(gap_counts.capability_gap_count, 0) as capability_gap_count,
  coalesce(validation_evidence_counts.evidence_ref_count, 0) as evidence_ref_count,
  component.source_path,
  component.source_content_sha256,
  component.imported_at,
  coalesce(component.raw_component ->> 'fileOwnershipModel', 'owned-files') as file_ownership_model,
  coalesce((component.raw_component ->> 'fileCountZeroIsValid')::boolean, false) as file_count_zero_is_valid
from planning_query_store.frontend_component_effective_component_query component
left join surface_rollups
  on surface_rollups.component_id = component.component_id
left join file_counts
  on file_counts.component_id = component.component_id
left join rail_counts
  on rail_counts.component_id = component.component_id
left join evidence_counts
  on evidence_counts.component_id = component.component_id
left join gap_counts
  on gap_counts.component_id = component.component_id
left join validation_evidence_counts
  on validation_evidence_counts.component_id = component.component_id;
