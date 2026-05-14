create or replace view planning_query_store.component_engineering_file_ownership_query as
with base_files as (
  select
    governance_file.path as file_path,
    governance_file.component_unit as imported_component_id,
    governance_file.owning_unit as imported_owning_unit,
    governance_file.root_unit as imported_root_unit,
    governance_file.domain_unit as imported_domain_unit,
    governance_file.owner_level as imported_owner_level,
    governance_file.governance_state as imported_governance_state,
    governance_file.canonical_role as imported_canonical_role,
    governance_file.evidence_state as imported_evidence_state,
    governance_file.is_drift as imported_is_drift,
    governance_file.is_legacy as imported_is_legacy,
    governance_file.ddd_owner as imported_ddd_owner,
    governance_file.cq_rails as imported_cq_rails,
    governance_file.source_path as imported_source_path,
    governance_file.source_content_sha256 as imported_source_content_sha256
  from planning_query_store.governance_file_query governance_file
),
active_local_components as (
  select
    local_definition.component_id,
    local_definition.level,
    local_definition.root_unit,
    local_definition.domain_unit,
    local_definition.status,
    local_definition.ddd_owner,
    local_definition.cq_rails,
    local_definition.owns,
    local_definition.excludes,
    local_definition.source_path,
    local_definition.source_content_sha256
  from planning_query_store.governance_component_local_definitions local_definition
  where local_definition.status <> 'superseded'
    and not exists (
      select 1
      from planning_query_store.governance_components imported
      where imported.component_id = local_definition.component_id
    )
),
local_file_claims as (
  select
    matched_file.file_path,
    matched_file.component_id,
    matched_file.level,
    matched_file.root_unit,
    matched_file.domain_unit,
    matched_file.status,
    matched_file.ddd_owner,
    matched_file.cq_rails,
    matched_file.source_path,
    matched_file.source_content_sha256,
    row_number() over (
      partition by matched_file.file_path
      order by length(matched_file.own_pattern) desc, matched_file.component_id
    ) as claim_rank
  from (
    select
      base_file.file_path,
      local_component.component_id,
      local_component.level,
      local_component.root_unit,
      local_component.domain_unit,
      local_component.status,
      local_component.ddd_owner,
      local_component.cq_rails,
      local_component.source_path,
      local_component.source_content_sha256,
      own_pattern.value as own_pattern
    from base_files base_file
    join active_local_components local_component
      on exists (
        select 1
        from jsonb_array_elements_text(local_component.owns) as own_pattern(value)
        where base_file.file_path = own_pattern.value
           or base_file.file_path like replace(replace(own_pattern.value, '**', '%'), '*', '%')
      )
    cross join lateral jsonb_array_elements_text(local_component.owns) as own_pattern(value)
    where (
        base_file.file_path = own_pattern.value
        or base_file.file_path like replace(replace(own_pattern.value, '**', '%'), '*', '%')
      )
      and not exists (
        select 1
        from jsonb_array_elements_text(local_component.excludes) as exclude_pattern(value)
        where base_file.file_path = exclude_pattern.value
           or base_file.file_path like replace(replace(exclude_pattern.value, '**', '%'), '*', '%')
      )
  ) matched_file
)
select
  base_file.file_path,
  coalesce(local_claim.component_id, base_file.imported_component_id) as leaf_component_id,
  coalesce(local_claim.component_id, base_file.imported_owning_unit) as owning_unit,
  coalesce(local_claim.root_unit, base_file.imported_root_unit) as root_unit,
  coalesce(local_claim.domain_unit, base_file.imported_domain_unit) as domain_unit,
  coalesce(local_claim.level, base_file.imported_owner_level) as owner_level,
  coalesce(
    case
      when local_claim.status = 'canonical' then 'governed'
      else local_claim.status
    end,
    base_file.imported_governance_state
  ) as governance_state,
  coalesce(
    case
      when local_claim.status = 'canonical' then 'implementation-owner'
      when local_claim.status is not null then 'none'
      else null
    end,
    base_file.imported_canonical_role
  ) as canonical_role,
  coalesce(
    case
      when local_claim.status = 'canonical' then 'classification-only'
      when local_claim.status = 'coverage-required' then 'coverage-required'
      when local_claim.status in ('drift', 'legacy') then 'remediation-required'
      when local_claim.status = 'review' then 'review-required'
      when local_claim.status = 'superseded' then 'retired'
      else null
    end,
    base_file.imported_evidence_state
  ) as evidence_state,
  coalesce(local_claim.status = 'drift', base_file.imported_is_drift) as is_drift,
  coalesce(local_claim.status = 'legacy', base_file.imported_is_legacy) as is_legacy,
  coalesce(local_claim.ddd_owner, base_file.imported_ddd_owner) as ddd_owner,
  coalesce(local_claim.cq_rails, base_file.imported_cq_rails) as cq_rails,
  case
    when base_file.file_path ~* '(^|/)(test|tests|__tests__)/|(\.test|\.spec|\.architecture\.test)\.[cm]?[jt]sx?$'
      then 'test'
    when base_file.file_path ~* '(^|/)docs/|\.md$'
      then 'doc'
    when base_file.file_path ~* '(^|/)(fixtures|vectors)/'
      then 'fixture'
    when base_file.file_path ~* '(^|/)\.github/workflows/|(^|/)scripts/|(^|/)tools/'
      then 'governance-tooling'
    else 'source'
  end as file_role,
  tree.parent_component_id,
  tree.component_level,
  tree.is_leaf_component,
  coalesce(local_claim.source_path, base_file.imported_source_path) as source_path,
  coalesce(
    local_claim.source_content_sha256,
    base_file.imported_source_content_sha256
  ) as source_content_sha256
from base_files base_file
left join local_file_claims local_claim
  on local_claim.file_path = base_file.file_path
 and local_claim.claim_rank = 1
left join planning_query_store.component_engineering_component_tree_query tree
  on tree.component_id = coalesce(local_claim.component_id, base_file.imported_component_id);

create or replace view component_engineering.file_ownership_query as
select
  file_path,
  leaf_component_id,
  owning_unit,
  root_unit,
  domain_unit,
  owner_level,
  governance_state,
  canonical_role,
  evidence_state,
  is_drift,
  is_legacy,
  ddd_owner,
  cq_rails,
  file_role,
  parent_component_id,
  component_level,
  is_leaf_component,
  source_path,
  source_content_sha256
from planning_query_store.component_engineering_file_ownership_query;
