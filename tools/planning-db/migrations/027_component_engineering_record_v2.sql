create or replace view planning_query_store.governance_component_engineering_record_v2_query as
select
  component_id,
  jsonb_strip_nulls(
    record
    || jsonb_build_object(
      'schemaVersion', 'v2',
      'contracts', jsonb_build_object(
        'indexed', false,
        'provides', '[]'::jsonb,
        'consumes', '[]'::jsonb,
        'eventsEmitted', '[]'::jsonb,
        'eventsConsumed', '[]'::jsonb,
        'apiSurface', coalesce(record #> '{publicContract,commandQueryRails}', 'null'::jsonb),
        'gaps', jsonb_build_array('missing_contract_index')
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
        'ownedPaths', coalesce(record #> '{dependencies,owns}', '[]'::jsonb),
        'excludedPaths', coalesce(record #> '{dependencies,excludes}', '[]'::jsonb),
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
        coalesce(record->'completenessGaps', '[]'::jsonb)
        || jsonb_build_array(
          'missing_contract_index',
          'missing_capability_index',
          'missing_dependency_classification_index',
          'missing_runtime_profile_index',
          'missing_failure_mode_index',
          'missing_cost_model_index'
        )
    )
  ) as record
from planning_query_store.governance_component_engineering_record_query;
