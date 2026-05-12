create or replace view planning_query_store.component_engineering_component_query as
select
  component_id,
  name,
  level,
  parent_id,
  root_unit,
  domain_unit,
  status,
  governance_state,
  canonical_role,
  evidence_state,
  is_drift,
  is_legacy,
  children_required,
  file_count,
  ddd_owner,
  cq_rails,
  source_path,
  source_content_sha256
from planning_query_store.governance_component_query;

create or replace view planning_query_store.component_engineering_file_query as
select
  component_id,
  path as file_path,
  case
    when path ~* '(^|/)(test|tests|__tests__)/|(\.test|\.spec|\.architecture\.test)\.[cm]?[jt]sx?$'
      then 'test'
    else 'owned'
  end as file_role,
  source_path,
  source_content_sha256
from planning_query_store.governance_component_files;

create or replace view planning_query_store.component_engineering_document_query as
with records as (
  select
    component_id,
    record
  from planning_query_store.governance_component_engineering_record_query
)
select
  records.component_id,
  'governing'::text as document_kind,
  document.value #>> '{}' as document_path,
  null::text as reference,
  null::text as classification,
  jsonb_build_object('sourceField', 'governingDocuments') as metadata
from records
cross join lateral jsonb_array_elements(
  coalesce(records.record->'governingDocuments', '[]'::jsonb)
) document(value)
union all
select
  records.component_id,
  'adr'::text as document_kind,
  coalesce(document.value->>'documentPath', document.value #>> '{}') as document_path,
  document.value->>'reference' as reference,
  document.value->>'classification' as classification,
  document.value as metadata
from records
cross join lateral jsonb_array_elements(
  coalesce(records.record->'adrsLinked', '[]'::jsonb)
) document(value)
union all
select
  records.component_id,
  'requirement'::text as document_kind,
  coalesce(document.value->>'documentPath', document.value #>> '{}') as document_path,
  document.value->>'reference' as reference,
  document.value->>'classification' as classification,
  document.value as metadata
from records
cross join lateral jsonb_array_elements(
  coalesce(records.record->'requirementsLinked', '[]'::jsonb)
) document(value)
union all
select
  records.component_id,
  'runtimeEvidence'::text as document_kind,
  coalesce(document.value->>'documentPath', document.value #>> '{}') as document_path,
  document.value->>'reference' as reference,
  document.value->>'classification' as classification,
  document.value as metadata
from records
cross join lateral jsonb_array_elements(
  coalesce(records.record->'runtimeEvidence', '[]'::jsonb)
) document(value);

create or replace view planning_query_store.component_engineering_relation_query as
select
  component_id as source_component_id,
  'parent'::text as relation_type,
  'component'::text as target_kind,
  parent_id as target_id,
  jsonb_build_object('source', 'component.parent_id') as metadata
from planning_query_store.component_engineering_component_query
where parent_id is not null
union all
select
  parent_id as source_component_id,
  'child'::text as relation_type,
  'component'::text as target_kind,
  component_id as target_id,
  jsonb_build_object('source', 'component.parent_id') as metadata
from planning_query_store.component_engineering_component_query
where parent_id is not null
union all
select
  component_id as source_component_id,
  'ownsFile'::text as relation_type,
  'file'::text as target_kind,
  file_path as target_id,
  jsonb_build_object('fileRole', file_role) as metadata
from planning_query_store.component_engineering_file_query
where file_role = 'owned'
union all
select
  component_id as source_component_id,
  'testedBy'::text as relation_type,
  'file'::text as target_kind,
  file_path as target_id,
  jsonb_build_object('fileRole', file_role) as metadata
from planning_query_store.component_engineering_file_query
where file_role = 'test'
union all
select
  component_id as source_component_id,
  'governedBy'::text as relation_type,
  'document'::text as target_kind,
  document_path as target_id,
  jsonb_build_object(
    'documentKind', document_kind,
    'reference', reference,
    'classification', classification
  ) as metadata
from planning_query_store.component_engineering_document_query
where document_path is not null;

create or replace view planning_query_store.component_engineering_contract_query as
select
  component_id,
  'commandQueryRail'::text as contract_kind,
  nullif(cq_rails, '') as contract_name,
  false as indexed,
  'missing_contract_index'::text as gap_code,
  jsonb_build_object('source', 'governance_component_query.cq_rails') as metadata
from planning_query_store.component_engineering_component_query
where nullif(cq_rails, '') is not null;

create or replace view planning_query_store.component_engineering_gap_query as
with records as (
  select
    component_id,
    record
  from planning_query_store.governance_component_engineering_record_query
),
base_gaps as (
  select
    records.component_id,
    gap.value #>> '{}' as gap_code,
    'v1'::text as gap_source
  from records
  cross join lateral jsonb_array_elements(
    coalesce(records.record->'completenessGaps', '[]'::jsonb)
  ) gap(value)
),
v2_gaps as (
  select
    records.component_id,
    gap.gap_code,
    'v2'::text as gap_source
  from records
  cross join lateral (
    values
      ('missing_contract_index'),
      ('missing_capability_index'),
      ('missing_dependency_classification_index'),
      ('missing_runtime_profile_index'),
      ('missing_failure_mode_index'),
      ('missing_cost_model_index'),
      ('missing_code_symbol_index'),
      ('missing_component_connection_index')
  ) gap(gap_code)
)
select distinct
  component_id,
  gap_code,
  gap_source
from (
  select * from base_gaps
  union all
  select * from v2_gaps
) gaps;

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
component_files as (
  select
    component_id,
    coalesce(jsonb_agg(file_path order by file_path), '[]'::jsonb) as owned_files,
    coalesce(
      jsonb_agg(file_path order by file_path) filter (where file_role = 'test'),
      '[]'::jsonb
    ) as test_files
  from planning_query_store.component_engineering_file_query
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
left join component_files
  on component_files.component_id = components.component_id
left join component_children
  on component_children.component_id = components.component_id
left join component_contracts
  on component_contracts.component_id = components.component_id
left join component_gaps
  on component_gaps.component_id = components.component_id;
