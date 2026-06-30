-- Keep the active architecture model aligned after external/local panel
-- reassertion migrations and make command/query duplicate detection prefer
-- local implemented rails over imported documentation declarations.

insert into architecture.design (
  design_id,
  work_item_id,
  title,
  owner,
  status,
  rationale,
  fowler_signal,
  rail_ref,
  supersedes_id,
  approved_at
)
values (
  'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-REASSERTION-NEUTRALIZATION-20260619',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Neutralize Canvas node workbench panel profile reassertion',
  'Architecture / Planning DB / Frontend',
  'implemented',
  'The local DB received an external profile reassertion for CanvasNodeWorkbenchPanel after governance refresh, but this branch still has no CanvasNodeWorkbenchPanel source or test files. This migration runs after that reassertion, restores the panel as audit-only deprecated evidence, and updates rail duplicate detection so local implemented rails supersede imported documentation declarations for the same command/query intent.',
  'boundary_drift',
  'RecordArchitectureComponent;RecordArchitectureRelation;ValidateRailVocabulary;ValidateComponentIntegrity',
  'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-PARALLEL-REACTIVATION-NEUTRALIZATION-20260619',
  now()
)
on conflict (design_id) do update set
  work_item_id = excluded.work_item_id,
  title = excluded.title,
  owner = excluded.owner,
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  supersedes_id = excluded.supersedes_id,
  approved_at = excluded.approved_at,
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
    'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-REASSERTION-NEUTRALIZATION-20260619',
    'component',
    'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-REASSERTION-NEUTRALIZATION-20260619',
    'query',
    'ApplyWorkspaceGraphAuthoringCommand',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-REASSERTION-NEUTRALIZATION-20260619',
    'relation',
    'REL-WEB-CANVAS-NODE-WORKBENCH-CONTAINS-PANEL',
    'may_delete',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-REASSERTION-NEUTRALIZATION-20260619',
    'relation',
    'REL-WEB-CANVAS-NODE-WORKBENCH-OVERLAY-DEPENDS-ON-PANEL',
    'may_delete',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update architecture.design
set
  status = 'superseded',
  rationale = 'Superseded by PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-REASSERTION-NEUTRALIZATION-20260619 because this branch has no CanvasNodeWorkbenchPanel source or test files.',
  updated_at = now()
where design_id in (
  'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-PROFILE-REASSERTION-20260619',
  'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-EFFECTIVE-REACTIVATION-20260619',
  'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-REACTIVATION-20260619'
);

delete from planning_query_store.feature_mechanization_local_rails
where rail_id = 'local#WEB-CANVAS-NODE-WORKBENCH-PANEL-20260619#query#inspectcanvasnodeproperties'
   or feature_id = 'WEB-CANVAS-NODE-WORKBENCH-PANEL-20260619'
   or source_path in (
     'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
     'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx'
   );

delete from planning_query_store.governance_component_local_ownership_patterns
where component_id = 'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL'
  and pattern in (
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx'
  );

delete from planning_query_store.governance_component_local_semantic_items
where component_id = 'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL';

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  (
    'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
    'responsibility',
    'Superseded audit-only Canvas node workbench panel; no tracked implementation files exist in this branch.',
    0
  ),
  (
    'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
    'reason_to_change',
    'Only changes when a governed migration reintroduces real CanvasNodeWorkbenchPanel implementation files.',
    0
  ),
  (
    'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
    'governance_ref',
    'tools/planning-db/migrations/235_canvas_panel_reassertion_neutralization_and_rail_precedence.sql',
    0
  ),
  (
    'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
    'fowler_signal',
    'boundary_drift',
    0
  ),
  (
    'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
    'transition',
    'Profile reassertion remains neutralized until tracked CanvasNodeWorkbenchPanel source and test files exist.',
    0
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update planning_query_store.governance_component_local_definitions
set
  status = 'superseded',
  owned_concern = 'Superseded audit-only component. CanvasNodeWorkbenchPanel.tsx and CanvasNodeWorkbenchPanel.test.tsx are not tracked; active overlay presentation is owned by SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY and SYS-WEB-CANVAS-INSPECTOR-PANEL.',
  ddd_owner = 'CanvasNodeWorkbenchDuplicateResolution',
  cq_rails = 'none - superseded profile reassertion',
  source_path = 'tools/planning-db/migrations/235_canvas_panel_reassertion_neutralization_and_rail_precedence.sql',
  source_content_sha256 = coalesce(
    (
      select file_ref.content_hash
      from planning_query_store.governance_files file_ref
      where file_ref.path = 'tools/planning-db/migrations/235_canvas_panel_reassertion_neutralization_and_rail_precedence.sql'
      limit 1
    ),
    source_content_sha256
  ),
  revision = greatest(revision, 1) + 1
where component_id = 'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL';

update architecture.component
set
  owner = 'CanvasNodeWorkbenchDuplicateResolution',
  repo_path = 'planning_query_store.governance_component_local_definitions#SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
  public_contract = 'Deprecated audit-only component. CanvasNodeWorkbenchPanel.tsx is not tracked; active presentation uses SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY and SYS-WEB-CANVAS-INSPECTOR-PANEL.',
  status = 'deprecated',
  maturity_score = null,
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL';

update architecture.component_responsibility
set
  responsibility = 'Superseded audit-only component retained to document a neutralized profile reassertion.',
  reason_to_change = 'A real implementation would require tracked CanvasNodeWorkbenchPanel source and test files plus governed ownership.',
  ddd_owner = 'CanvasNodeWorkbenchDuplicateResolution',
  status = 'implemented'
where responsibility_id = 'RESP-SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL';

update architecture.contract
set
  contract_ref = 'planning_query_store.governance_component_local_definitions#SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
  compatibility = 'internal',
  status = 'implemented',
  validation_command = 'pnpm planning:db:query component-profile --component SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL --no-refresh --limit 80',
  updated_at = now()
where owner_component_id = 'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL';

delete from architecture.component_port
where component_id = 'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL';

delete from architecture.component_relation
where relation_id in (
  'REL-WEB-CANVAS-NODE-WORKBENCH-CONTAINS-PANEL',
  'REL-WEB-CANVAS-NODE-WORKBENCH-OVERLAY-DEPENDS-ON-PANEL'
);

update architecture.component_test
set
  test_path = 'scripts/planning-db-migrate.test.cjs',
  test_kind = 'architecture',
  coverage_level = 'boundary',
  required = true,
  validation_command = 'node --test scripts/planning-db-migrate.test.cjs'
where component_id = 'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL';

update architecture.component_observability
set
  signal_name = 'Neutralized Canvas node workbench panel profile reassertion is observable through component-profile, files query absence, source-drift, and migration evidence.',
  required = true,
  status = 'implemented'
where observability_id in (
  'OBS-SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL-COMPONENT-PROFILE',
  'OBS-SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL-PHANTOM-RETIREMENT'
);

delete from planning_query_store.governance_files
where path in (
  'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
  'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx'
);

create or replace view planning_query_store.command_query_rail_query as
with manifest_rails as (
  select
    rail.*,
    case
      when rail.source_path like 'docs/archive/%' then 5
      when rail.rail_source = 'local' then 0
      when rail.feature_id = 'DOCUMENTED-COMMAND-QUERY-RAIL-CATALOG' then 1
      when rail.source_path like 'docs/architecture/components/%command-query-catalog.md' then 1
      when rail.source_path like 'docs/architecture/components/%' then 2
      when rail.mechanization_status in ('implemented', 'closed') then 3
      else 4
    end as authority_priority
  from planning_query_store.command_query_rail_manifest_query rail
),
rail_group as (
  select
    rail_type,
    normalized_rail_name,
    bool_or(
      lower(coalesce(rail_status, '')) not in ('deprecated', 'retired')
      and not is_gap
    ) as has_active_non_gap,
    bool_or(
      rail_source = 'local'
      and lower(coalesce(rail_status, '')) not in ('deprecated', 'retired')
      and not is_gap
    ) as has_active_local_non_gap
  from manifest_rails
  group by rail_type, normalized_rail_name
),
reference_rollup as (
  select
    rail.rail_type,
    rail.normalized_rail_name,
    count(*)::int as reference_count,
    count(*) filter (
      where rail.authority_priority <= 2
        and lower(coalesce(rail.rail_status, '')) not in ('deprecated', 'retired')
        and not (rail_group.has_active_non_gap and rail.is_gap)
        and not (rail_group.has_active_local_non_gap and rail.rail_source <> 'local')
    )::int as canonical_candidate_count,
    jsonb_agg(distinct rail.feature_id order by rail.feature_id) as related_feature_ids,
    jsonb_agg(distinct rail.source_path order by rail.source_path) as related_source_paths
  from manifest_rails rail
  join rail_group
    on rail_group.rail_type = rail.rail_type
   and rail_group.normalized_rail_name = rail.normalized_rail_name
  group by rail.rail_type, rail.normalized_rail_name
),
ranked_canonical_rails as (
  select
    rail.*,
    row_number() over (
      partition by rail.rail_type, rail.normalized_rail_name
      order by
        case
          when not rail_group.has_active_non_gap
            and rail.rail_source = 'local'
            and lower(coalesce(rail.rail_status, '')) in ('deprecated', 'retired')
            then 0
          when lower(coalesce(rail.rail_status, '')) not in ('deprecated', 'retired')
            and not rail.is_gap
            then 1
          when rail.rail_source = 'local'
            and lower(coalesce(rail.rail_status, '')) not in ('deprecated', 'retired')
            then 2
          when lower(coalesce(rail.rail_status, '')) not in ('deprecated', 'retired')
            then 3
          else 4
        end,
        case when rail.rail_source = 'local' then 0 else 1 end,
        rail.is_gap,
        rail.authority_priority,
        rail.implementation_ref_count desc,
        rail.documentation_ref_count desc,
        rail.imported_at desc,
        rail.rail_id
    ) as canonical_rank
  from manifest_rails rail
  join rail_group
    on rail_group.rail_type = rail.rail_type
   and rail_group.normalized_rail_name = rail.normalized_rail_name
)
select
  rail.rail_id,
  rail.feature_id,
  rail.mechanization_status,
  rail.rail_name,
  rail.normalized_rail_name,
  rail.rail_type,
  rail.ddd_owner,
  rail.rail_status,
  rail.symbol_refs,
  rail.implementation_refs,
  rail.documentation_refs,
  rail.implementation_ref_count,
  rail.documentation_ref_count,
  rail.governing_sources,
  rail.allowed_implementation_surfaces,
  rail.architecture_guards,
  rail.completion_gate,
  rail.is_gap,
  rollup.reference_count,
  rollup.canonical_candidate_count as duplicate_count,
  rollup.canonical_candidate_count > 1 as is_duplicate,
  rollup.related_feature_ids,
  rollup.related_source_paths,
  rail.source_path,
  rail.source_content_sha256,
  rail.raw_rail,
  rail.raw_manifest,
  rail.rail_source,
  rail.imported_at
from ranked_canonical_rails rail
join reference_rollup rollup
  on rollup.rail_type = rail.rail_type
 and rollup.normalized_rail_name = rail.normalized_rail_name
where rail.canonical_rank = 1;
