create or replace view planning_query_store.component_engineering_file_rollup_query as
select
  component_id,
  coalesce(
    jsonb_agg(file_path order by file_path) filter (where file_role = 'owned'),
    '[]'::jsonb
  ) as owned_files,
  coalesce(
    jsonb_agg(file_path order by file_path) filter (where file_role = 'test'),
    '[]'::jsonb
  ) as test_files
from planning_query_store.component_engineering_file_query
group by component_id;

create or replace view planning_query_store.governance_component_engineering_record_v2_query as
with components as (
  select *
  from planning_query_store.component_engineering_component_query
),
component_documents as (
  select
    component_id,
    coalesce(
      jsonb_agg(document_path order by document_path)
        filter (where document_kind = 'governing'),
      '[]'::jsonb
    ) as governing_documents,
    coalesce(
      jsonb_agg(metadata order by document_path, reference)
        filter (where document_kind = 'adr'),
      '[]'::jsonb
    ) as adrs,
    coalesce(
      jsonb_agg(metadata order by document_path, reference)
        filter (where document_kind = 'requirement'),
      '[]'::jsonb
    ) as requirements,
    coalesce(
      jsonb_agg(metadata order by document_path, reference)
        filter (where document_kind = 'runtimeEvidence'),
      '[]'::jsonb
    ) as runtime_evidence
  from planning_query_store.component_engineering_document_query
  group by component_id
),
component_children as (
  select
    source_component_id as component_id,
    coalesce(jsonb_agg(target_id order by target_id), '[]'::jsonb) as child_component_ids
  from planning_query_store.component_engineering_relation_query
  where relation_type = 'child'
  group by source_component_id
),
component_contracts as (
  select
    component_id,
    coalesce(
      jsonb_agg(contract_name order by contract_name)
        filter (where contract_kind = 'commandQueryRail'),
      '[]'::jsonb
    ) as api_surface
  from planning_query_store.component_engineering_contract_query
  group by component_id
),
component_gaps as (
  select
    component_id,
    coalesce(jsonb_agg(gap_code order by gap_code), '[]'::jsonb) as completeness_gaps
  from planning_query_store.component_engineering_gap_query
  group by component_id
),
base_records as (
  select
    component_id,
    record
  from planning_query_store.governance_component_engineering_record_query
)
select
  components.component_id,
  base_records.record
  || jsonb_build_object(
    'schemaVersion', 'v2',
    'relatedDocuments', jsonb_build_object(
      'governing', coalesce(component_documents.governing_documents, '[]'::jsonb),
      'adrs', coalesce(component_documents.adrs, '[]'::jsonb),
      'requirements', coalesce(component_documents.requirements, '[]'::jsonb),
      'runtimeEvidence', coalesce(component_documents.runtime_evidence, '[]'::jsonb)
    ),
    'domain', jsonb_build_object(
      'rootUnit', components.root_unit,
      'domainUnit', components.domain_unit,
      'unitPath', coalesce(base_records.record #> '{identity,unitPath}', '[]'::jsonb),
      'dddOwner', components.ddd_owner,
      'canonicalRole', components.canonical_role
    ),
    'composition', jsonb_build_object(
      'parentComponentId', components.parent_id,
      'children', coalesce(base_records.record->'subcomponents', '[]'::jsonb),
      'childComponentIds', coalesce(component_children.child_component_ids, '[]'::jsonb),
      'level', components.level
    ),
    'contracts', jsonb_build_object(
      'indexed', false,
      'provides', '[]'::jsonb,
      'consumes', '[]'::jsonb,
      'eventsEmitted', '[]'::jsonb,
      'eventsConsumed', '[]'::jsonb,
      'apiSurface', coalesce(component_contracts.api_surface, '[]'::jsonb),
      'gaps', jsonb_build_array('missing_contract_index')
    ),
    'codeSurface', jsonb_build_object(
      'indexed', false,
      'ownedFiles', coalesce(component_files.owned_files, '[]'::jsonb),
      'testFiles', coalesce(component_files.test_files, '[]'::jsonb),
      'interfaces', '[]'::jsonb,
      'methods', '[]'::jsonb,
      'gaps', jsonb_build_array('missing_code_symbol_index')
    ),
    'connections', jsonb_build_object(
      'indexed', false,
      'parentComponentId', components.parent_id,
      'childComponentIds', coalesce(component_children.child_component_ids, '[]'::jsonb),
      'commandQueryRails', coalesce(component_contracts.api_surface, '[]'::jsonb),
      'gaps', jsonb_build_array('missing_component_connection_index')
    ),
    'capabilities', jsonb_build_object(
      'indexed', false,
      'items', '[]'::jsonb,
      'gaps', jsonb_build_array('missing_capability_index')
    ),
    'invariants', jsonb_build_object(
      'indexed', false,
      'architecture', '[]'::jsonb,
      'gaps', jsonb_build_array('missing_invariants_index')
    ),
    'dependencies', jsonb_build_object(
      'indexed', false,
      'runtime', '[]'::jsonb,
      'build', '[]'::jsonb,
      'external', '[]'::jsonb,
      'forbidden', '[]'::jsonb,
      'ownedPaths', coalesce(base_records.record #> '{dependencies,owns}', '[]'::jsonb),
      'excludedPaths', coalesce(base_records.record #> '{dependencies,excludes}', '[]'::jsonb),
      'gaps', jsonb_build_array('missing_dependency_classification_index')
    ),
    'configuration', jsonb_build_object(
      'indexed', false,
      'required', '[]'::jsonb,
      'optional', '[]'::jsonb,
      'secrets', '[]'::jsonb,
      'gaps', jsonb_build_array('missing_configuration_index')
    ),
    'runtime', jsonb_build_object(
      'indexed', false,
      'deployable', null,
      'runtimeType', null,
      'stateless', null,
      'statefulResources', '[]'::jsonb,
      'scalingModel', null,
      'gaps', jsonb_build_array('missing_runtime_profile_index')
    ),
    'observability', jsonb_build_object(
      'indexed', false,
      'logs', '[]'::jsonb,
      'metrics', '[]'::jsonb,
      'traces', '[]'::jsonb,
      'gaps', jsonb_build_array('missing_observability_index')
    ),
    'failureModes', jsonb_build_object(
      'indexed', false,
      'modes', '[]'::jsonb,
      'recovery', '[]'::jsonb,
      'gaps', jsonb_build_array('missing_failure_mode_index')
    ),
    'costModel', jsonb_build_object(
      'indexed', false,
      'cpuWeight', null,
      'memoryMb', null,
      'ioWeight', null,
      'networkWeight', null,
      'estimatedCostPerRun', null,
      'gaps', jsonb_build_array('missing_cost_model_index')
    ),
    'completenessGaps', coalesce(component_gaps.completeness_gaps, '[]'::jsonb)
  ) as record
from components
join base_records
  on base_records.component_id = components.component_id
left join component_documents
  on component_documents.component_id = components.component_id
left join planning_query_store.component_engineering_file_rollup_query component_files
  on component_files.component_id = components.component_id
left join component_children
  on component_children.component_id = components.component_id
left join component_contracts
  on component_contracts.component_id = components.component_id
left join component_gaps
  on component_gaps.component_id = components.component_id;
