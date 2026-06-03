create or replace view planning_query_store.governance_component_engineering_record_query as
with child_components as (
  select
    parent_id as component_id,
    count(*)::int as subcomponent_count,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'componentId', component_id,
          'name', name,
          'level', level,
          'governanceState', governance_state,
          'fileCount', file_count,
          'dddOwner', ddd_owner,
          'commandQueryRails', cq_rails
        )
        order by component_id
      ),
      '[]'::jsonb
    ) as subcomponents
  from planning_query_store.governance_component_query
  where parent_id is not null
  group by parent_id
),
component_file_sets as (
  select
    component_id,
    count(*)::int as owned_file_count,
    coalesce(jsonb_agg(path order by path), '[]'::jsonb) as owned_files,
    coalesce(
      jsonb_agg(path order by path) filter (
        where path ~* '(^|/)(test|tests|__tests__)/|(\.test|\.spec|\.architecture\.test)\.[cm]?[jt]sx?$'
      ),
      '[]'::jsonb
    ) as test_files,
    count(*) filter (
      where path ~* '(^|/)(test|tests|__tests__)/|(\.test|\.spec|\.architecture\.test)\.[cm]?[jt]sx?$'
    )::int as test_file_count
  from planning_query_store.governance_component_files
  group by component_id
),
governance_doc_refs as (
  select
    component.component_id,
    coalesce(jsonb_agg(ref.value order by ref.value), '[]'::jsonb) as governance_documents,
    coalesce(
      jsonb_agg(ref.value order by ref.value) filter (where ref.value like 'docs/adr/%'),
      '[]'::jsonb
    ) as adr_documents,
    coalesce(
      jsonb_agg(ref.value order by ref.value) filter (
        where ref.value like 'docs/evidence/%' or ref.value like 'docs/runbooks/%'
      ),
      '[]'::jsonb
    ) as runtime_evidence_documents
  from planning_query_store.governance_component_query component
  left join lateral jsonb_array_elements_text(component.governance_refs) as ref(value) on true
  group by component.component_id
),
component_requirement_refs as (
  select
    component.component_id,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'reference', reference.reference_text,
          'classification', reference.classification,
          'documentPath', reference.document_path,
          'registeredPlanningTask', reference.registered_planning_task
        )
        order by reference.document_path, reference.reference_text
      ),
      '[]'::jsonb
    ) as requirement_refs
  from planning_query_store.governance_component_query component
  join lateral jsonb_array_elements_text(component.governance_refs) as doc(path) on true
  join planning_query_store.doc_task_reference_query reference
    on reference.document_path = doc.path
  group by component.component_id
),
coverage_rows as (
  select
    component_id,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'kind', coverage_kind,
          'name', name,
          'count', count_value,
          'fileCount', file_count,
          'metadata', metadata
        )
        order by coverage_kind, name
      ),
      '[]'::jsonb
    ) as coverage
  from planning_query_store.governance_coverage_query
  where component_id is not null
  group by component_id
),
remediation_rows as (
  select
    component_unit as component_id,
    count(*)::int as remediation_count,
    to_jsonb(array_agg(distinct lower(task_type) order by lower(task_type))) as gap_types,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'taskId', task_id,
          'type', lower(task_type),
          'priority', priority,
          'blocking', blocking,
          'reason', reason,
          'documents', documents,
          'files', files,
          'expectedValidation', expected_validation
        )
        order by priority, task_id
      ),
      '[]'::jsonb
    ) as remediation
  from planning_query_store.governance_remediation_query
  group by component_unit
)
select
  component.component_id,
  jsonb_strip_nulls(
    jsonb_build_object(
      'recordType', 'componentEngineeringRecord',
      'schemaVersion', 'v1',
      'identity', jsonb_build_object(
        'componentId', component.component_id,
        'name', component.name,
        'level', component.level,
        'parentId', component.parent_id,
        'rootUnit', component.root_unit,
        'domainUnit', component.domain_unit,
        'unitPath', component.unit_path,
        'sourcePath', component.source_path,
        'sourceContentSha256', component.source_content_sha256
      ),
      'purpose', jsonb_build_object(
        'summary', component.name,
        'governanceState', component.governance_state,
        'fowlerSignals', component.fowler_signals
      ),
      'ownership', jsonb_build_object(
        'dddOwner', component.ddd_owner,
        'canonicalRole', component.canonical_role,
        'evidenceState', component.evidence_state
      ),
      'subcomponents', coalesce(children.subcomponents, '[]'::jsonb),
      'publicContract', jsonb_build_object(
        'commandQueryRails', component.cq_rails,
        'apiStatus',
          case
            when coalesce(remediation.gap_types, '[]'::jsonb) ? 'cq_rail_gap' then 'gap'
            else 'indexed'
          end
      ),
      'inputsOutputs', jsonb_build_object(
        'indexed', false,
        'gaps', jsonb_build_array('missing_inputs_outputs_index')
      ),
      'invariants', jsonb_build_object(
        'indexed', false,
        'gaps', jsonb_build_array('missing_invariants_index')
      ),
      'stateModel', jsonb_build_object(
        'indexed', false,
        'gaps', jsonb_build_array('missing_state_model_index')
      ),
      'errorModel', jsonb_build_object(
        'indexed', false,
        'gaps', jsonb_build_array('missing_error_model_index')
      ),
      'securityRules', jsonb_build_object(
        'indexed', false,
        'gaps', jsonb_build_array('missing_security_rule_index')
      ),
      'dependencies', jsonb_build_object(
        'owns', component.owns,
        'excludes', component.excludes
      ),
      'configuration', jsonb_build_object(
        'indexed', false,
        'gaps', jsonb_build_array('missing_configuration_index')
      ),
      'events', jsonb_build_object(
        'indexed', false,
        'gaps', jsonb_build_array('missing_event_index')
      ),
      'persistenceImpact', jsonb_build_object(
        'indexed', false,
        'gaps', jsonb_build_array('missing_persistence_impact_index')
      ),
      'observability', jsonb_build_object(
        'indexed', false,
        'gaps', jsonb_build_array('missing_observability_index')
      ),
      'tests', jsonb_build_object(
        'testFiles', coalesce(files.test_files, '[]'::jsonb),
        'testFileCount', coalesce(files.test_file_count, 0),
        'expectedValidation', coalesce(remediation.remediation, '[]'::jsonb)
      ),
      'adrsLinked', coalesce(docs.adr_documents, '[]'::jsonb),
      'requirementsLinked', coalesce(requirements.requirement_refs, '[]'::jsonb),
      'runtimeEvidence', coalesce(docs.runtime_evidence_documents, '[]'::jsonb),
      'lifecycle', jsonb_build_object(
        'status', component.status,
        'isLegacy', component.is_legacy,
        'isDrift', component.is_drift,
        'childrenRequired', component.children_required
      ),
      'governingDocuments', coalesce(docs.governance_documents, '[]'::jsonb),
      'coverage', coalesce(coverage.coverage, '[]'::jsonb),
      'ownedFiles', coalesce(files.owned_files, '[]'::jsonb),
      'remediation', coalesce(remediation.remediation, '[]'::jsonb),
      'completenessGaps',
        to_jsonb(
          array_remove(
            array[
              case
                when component.children_required
                  and coalesce(children.subcomponent_count, 0) = 0
                  then 'missing_required_subcomponents'
              end,
              case
                when jsonb_array_length(component.governance_refs) = 0
                  then 'missing_governance_refs'
              end,
              case
                when coalesce(files.test_file_count, 0) = 0
                  then 'missing_test_files'
              end,
              case
                when coalesce(remediation.remediation_count, 0) > 0
                  then 'open_remediation'
              end
            ],
            null
          )
        ) || coalesce(remediation.gap_types, '[]'::jsonb)
    )
  ) as record
from planning_query_store.governance_component_query component
left join child_components children
  on children.component_id = component.component_id
left join component_file_sets files
  on files.component_id = component.component_id
left join governance_doc_refs docs
  on docs.component_id = component.component_id
left join component_requirement_refs requirements
  on requirements.component_id = component.component_id
left join coverage_rows coverage
  on coverage.component_id = component.component_id
left join remediation_rows remediation
  on remediation.component_id = component.component_id;
