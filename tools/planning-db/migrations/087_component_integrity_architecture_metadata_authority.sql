create or replace view planning_query_store.component_integrity_query as
with architecture_components as (
  select *
  from architecture.component_query
),
engineering_components as (
  select *
  from planning_query_store.component_engineering_component_metadata_query
),
fitness_gaps as (
  select
    'fitness_gap'::text as finding_kind,
    gap.severity,
    coalesce(gap.source_component_id, gap.target_component_id, '-') as component_id,
    coalesce(component.name, '-') as component_name,
    gap.fitness_state as finding_state,
    gap.sample_source_path as path,
    case
      when gap.source_component_id is not null then gap.target_component_id
      else gap.source_component_id
    end as related_component_id,
    null::text as relation_id,
    gap.observation_count as evidence_count,
    gap.action_hint,
    'architecture.component_fitness_gap_summary_query'::text as source_view,
    jsonb_build_object(
      'designId', gap.design_id,
      'scanId', gap.scan_id,
      'gapKind', gap.gap_kind,
      'sourcePrefix', gap.source_prefix,
      'targetPrefix', gap.target_prefix,
      'relationType', gap.relation_type,
      'testObservationCount', gap.test_observation_count,
      'sampleImportLiteral', gap.sample_import_literal
    ) as metadata
  from architecture.component_fitness_gap_summary_query gap
  left join architecture_components component
    on component.component_id = coalesce(gap.source_component_id, gap.target_component_id)
),
architecture_drift as (
  select
    'architecture_drift'::text as finding_kind,
    drift.severity,
    case
      when drift.subject_kind = 'component' then drift.subject_id
      when drift.subject_kind = 'relation' then relation.source_component_id
      else coalesce(contract.component_id, '-')
    end as component_id,
    coalesce(component.name, contract.component_name, '-') as component_name,
    'fail'::text as finding_state,
    null::text as path,
    case
      when drift.subject_kind = 'relation' then relation.target_component_id
      else null
    end as related_component_id,
    case
      when drift.subject_kind = 'relation' then drift.subject_id
      else null
    end as relation_id,
    1::int as evidence_count,
    'Resolve architecture drift or retire the affected subject explicitly.'::text as action_hint,
    'architecture.component_drift_query'::text as source_view,
    drift.metadata
  from architecture.component_drift_query drift
  left join architecture.component_relation_query relation
    on relation.relation_id = drift.subject_id
  left join architecture.component_contract_query contract
    on contract.contract_id = drift.subject_id
  left join architecture_components component
    on component.component_id = case
      when drift.subject_kind = 'component' then drift.subject_id
      when drift.subject_kind = 'relation' then relation.source_component_id
      else contract.component_id
    end
),
maturity_gaps as (
  select
    'missing_maturity_evidence'::text as finding_kind,
    case
      when 'missing_required_test' = any(maturity.missing_reasons)
        or 'missing_relation' = any(maturity.missing_reasons)
        then 'error'
      else 'warning'
    end as severity,
    maturity.component_id,
    maturity.name as component_name,
    'warning'::text as finding_state,
    component.repo_path as path,
    null::text as related_component_id,
    null::text as relation_id,
    coalesce(array_length(maturity.missing_reasons, 1), 0)::int as evidence_count,
    'Complete component responsibility, relation, test, observability, and contract evidence.'::text as action_hint,
    'architecture.component_maturity_query'::text as source_view,
    jsonb_build_object(
      'maturityScore', maturity.maturity_score,
      'missingReasons', to_jsonb(maturity.missing_reasons)
    ) as metadata
  from architecture.component_maturity_query maturity
  join architecture_components component
    on component.component_id = maturity.component_id
  where coalesce(array_length(maturity.missing_reasons, 1), 0) > 0
),
duplicate_repo_paths as (
  select
    'duplicate_repo_path'::text as finding_kind,
    'warning'::text as severity,
    component.component_id,
    component.name as component_name,
    'warning'::text as finding_state,
    component.repo_path as path,
    null::text as related_component_id,
    null::text as relation_id,
    rollup.component_count::int as evidence_count,
    'Split overlapping component ownership or choose one canonical component for the repo path.'::text as action_hint,
    'architecture.component_query'::text as source_view,
    jsonb_build_object(
      'repoPath', component.repo_path,
      'componentIds', rollup.component_ids
    ) as metadata
  from architecture_components component
  join (
    select
      repo_path,
      count(*)::int as component_count,
      jsonb_agg(component_id order by component_id) as component_ids
    from architecture_components
    where status not in ('deprecated', 'drift')
      and nullif(btrim(repo_path), '') is not null
      and repo_path <> '.'
    group by repo_path
    having count(*) > 1
  ) rollup
    on rollup.repo_path = component.repo_path
),
component_paths_without_files as (
  select
    'component_path_without_files'::text as finding_kind,
    'warning'::text as severity,
    component.component_id,
    component.name as component_name,
    'warning'::text as finding_state,
    component.repo_path as path,
    null::text as related_component_id,
    null::text as relation_id,
    0::int as evidence_count,
    'Remap the component path, retire the phantom component, or justify the virtual boundary explicitly.'::text as action_hint,
    'architecture.component_query'::text as source_view,
    jsonb_build_object('repoPath', component.repo_path, 'status', component.status) as metadata
  from architecture_components component
  where component.status not in ('deprecated', 'drift')
    and nullif(btrim(component.repo_path), '') is not null
    and component.repo_path <> '.'
    and not exists (
      select 1
      from planning_query_store.component_engineering_file_ownership_query ownership
      where ownership.file_path = component.repo_path
         or ownership.file_path like component.repo_path || '/%'
    )
),
filesystem_coverage as (
  select
    'filesystem_coverage'::text as finding_kind,
    'blocker'::text as severity,
    coalesce(ownership.leaf_component_id, ownership.owning_unit, '-') as component_id,
    coalesce(engineering.name, '-') as component_name,
    'fail'::text as finding_state,
    ownership.file_path as path,
    null::text as related_component_id,
    null::text as relation_id,
    1::int as evidence_count,
    'Assign the tracked file to one canonical component owner through Planning DB component ownership.'::text as action_hint,
    'planning_query_store.component_engineering_file_ownership_query'::text as source_view,
    jsonb_build_object(
      'owningUnit', ownership.owning_unit,
      'leafComponentId', ownership.leaf_component_id,
      'fileRole', ownership.file_role,
      'governanceState', ownership.governance_state
    ) as metadata
  from planning_query_store.component_engineering_file_ownership_query ownership
  left join engineering_components engineering
    on engineering.component_id = coalesce(ownership.leaf_component_id, ownership.owning_unit)
  where ownership.leaf_component_id is null
     or ownership.owning_unit is null
),
missing_architecture_components as (
  select
    'component_missing_architecture_authority'::text as finding_kind,
    case
      when engineering.component_level in ('system', 'domain') then 'error'
      else 'warning'
    end as severity,
    engineering.component_id,
    engineering.name as component_name,
    'warning'::text as finding_state,
    null::text as path,
    null::text as related_component_id,
    null::text as relation_id,
    coalesce(engineering.descendant_file_count, engineering.direct_file_count, 0)::int as evidence_count,
    'Create, merge, or retire the architecture.component authority row for this governed component.'::text as action_hint,
    'planning_query_store.component_engineering_component_metadata_query'::text as source_view,
    jsonb_build_object(
      'componentLevel', engineering.component_level,
      'dddOwner', engineering.ddd_owner,
      'metadataState', engineering.metadata_state,
      'qualityState', engineering.quality_state
    ) as metadata
  from engineering_components engineering
  left join architecture_components component
    on component.component_id = engineering.component_id
  where component.component_id is null
    and engineering.status not in ('superseded', 'legacy')
),
architecture_test_evidence as (
  select
    component_test.component_id,
    count(*)::int as architecture_test_count
  from architecture.component_test component_test
  where component_test.required
  group by component_test.component_id
),
architecture_maturity_evidence as (
  select
    component_id,
    maturity_score,
    missing_reasons
  from architecture.component_maturity_query
),
component_evidence_gaps as (
  select
    'component_evidence_gap'::text as finding_kind,
    'warning'::text as severity,
    engineering.component_id,
    engineering.name as component_name,
    engineering.metadata_state as finding_state,
    null::text as path,
    null::text as related_component_id,
    null::text as relation_id,
    (
      coalesce(engineering.test_file_count, 0)
      + coalesce(architecture_test_evidence.architecture_test_count, 0)
    )::int as evidence_count,
    'Connect tests, docs, public API, invariants, transitions, and consumers to the component profile.'::text as action_hint,
    'planning_query_store.component_engineering_component_metadata_query'::text as source_view,
    jsonb_build_object(
      'metadataState', engineering.metadata_state,
      'testFileCount', engineering.test_file_count,
      'architectureTestCount', coalesce(architecture_test_evidence.architecture_test_count, 0),
      'architectureMaturityScore', architecture_maturity_evidence.maturity_score,
      'architectureMissingReasons', to_jsonb(architecture_maturity_evidence.missing_reasons),
      'sourcePaths', engineering.source_paths
    ) as metadata
  from engineering_components engineering
  left join architecture_test_evidence
    on architecture_test_evidence.component_id = engineering.component_id
  left join architecture_maturity_evidence
    on architecture_maturity_evidence.component_id = engineering.component_id
  where engineering.status not in ('superseded', 'legacy')
    and not (
      architecture_maturity_evidence.component_id is not null
      and coalesce(array_length(architecture_maturity_evidence.missing_reasons, 1), 0) = 0
    )
    and (
      engineering.metadata_state <> 'declared'
      or (
        coalesce(engineering.test_file_count, 0)
        + coalesce(architecture_test_evidence.architecture_test_count, 0)
      ) = 0
    )
)
select * from fitness_gaps
union all
select * from architecture_drift
union all
select * from maturity_gaps
union all
select * from duplicate_repo_paths
union all
select * from component_paths_without_files
union all
select * from filesystem_coverage
union all
select * from missing_architecture_components
union all
select * from component_evidence_gaps;
