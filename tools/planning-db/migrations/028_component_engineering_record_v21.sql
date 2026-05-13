create or replace view planning_query_store.governance_component_engineering_record_v2_query as
with base_records as (
  select
    component_id,
    record
  from planning_query_store.governance_component_engineering_record_query
),
child_components as (
  select
    base_records.component_id,
    coalesce(
      jsonb_agg(child.value->'componentId')
        filter (where child.value ? 'componentId'),
      '[]'::jsonb
    ) as child_component_ids
  from base_records
  left join lateral jsonb_array_elements(
    coalesce(base_records.record->'subcomponents', '[]'::jsonb)
  ) child(value) on true
  group by base_records.component_id
)
select
  base_records.component_id,
  jsonb_strip_nulls(
    base_records.record
    || jsonb_build_object(
      'schemaVersion', 'v2',
      'relatedDocuments', jsonb_build_object(
        'governing', coalesce(base_records.record->'governingDocuments', '[]'::jsonb),
        'adrs', coalesce(base_records.record->'adrsLinked', '[]'::jsonb),
        'requirements', coalesce(base_records.record->'requirementsLinked', '[]'::jsonb),
        'runtimeEvidence', coalesce(base_records.record->'runtimeEvidence', '[]'::jsonb)
      ),
      'domain', jsonb_build_object(
        'rootUnit', base_records.record #> '{identity,rootUnit}',
        'domainUnit', base_records.record #> '{identity,domainUnit}',
        'unitPath', coalesce(base_records.record #> '{identity,unitPath}', '[]'::jsonb),
        'dddOwner', base_records.record #> '{ownership,dddOwner}',
        'canonicalRole', base_records.record #> '{ownership,canonicalRole}'
      ),
      'composition', jsonb_build_object(
        'parentComponentId', base_records.record #> '{identity,parentId}',
        'children', coalesce(base_records.record->'subcomponents', '[]'::jsonb),
        'childComponentIds', child_components.child_component_ids,
        'level', base_records.record #> '{identity,level}'
      ),
      'contracts', jsonb_build_object(
        'indexed', false,
        'provides', '[]'::jsonb,
        'consumes', '[]'::jsonb,
        'eventsEmitted', '[]'::jsonb,
        'eventsConsumed', '[]'::jsonb,
        'apiSurface', coalesce(base_records.record #> '{publicContract,commandQueryRails}', 'null'::jsonb),
        'gaps', jsonb_build_array('missing_contract_index')
      ),
      'codeSurface', jsonb_build_object(
        'indexed', false,
        'ownedFiles', coalesce(base_records.record->'ownedFiles', '[]'::jsonb),
        'testFiles', coalesce(base_records.record #> '{tests,testFiles}', '[]'::jsonb),
        'interfaces', '[]'::jsonb,
        'methods', '[]'::jsonb,
        'gaps', jsonb_build_array('missing_code_symbol_index')
      ),
      'connections', jsonb_build_object(
        'indexed', false,
        'parentComponentId', base_records.record #> '{identity,parentId}',
        'childComponentIds', child_components.child_component_ids,
        'commandQueryRails', coalesce(
          base_records.record #> '{publicContract,commandQueryRails}',
          'null'::jsonb
        ),
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
      'completenessGaps',
        coalesce(base_records.record->'completenessGaps', '[]'::jsonb)
        || jsonb_build_array(
          'missing_contract_index',
          'missing_capability_index',
          'missing_dependency_classification_index',
          'missing_runtime_profile_index',
          'missing_failure_mode_index',
          'missing_cost_model_index',
          'missing_code_symbol_index',
          'missing_component_connection_index'
        )
    )
  ) as record
from base_records
join child_components
  on child_components.component_id = base_records.component_id;
