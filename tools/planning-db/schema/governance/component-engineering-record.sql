--
-- Name: governance_component_engineering_record_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.governance_component_engineering_record_query AS
 WITH child_components AS (
         SELECT governance_component_query.parent_id AS component_id,
            (count(*))::integer AS subcomponent_count,
            COALESCE(jsonb_agg(jsonb_build_object('componentId', governance_component_query.component_id, 'name', governance_component_query.name, 'level', governance_component_query.level, 'governanceState', governance_component_query.governance_state, 'fileCount', governance_component_query.file_count, 'dddOwner', governance_component_query.ddd_owner, 'commandQueryRails', governance_component_query.cq_rails) ORDER BY governance_component_query.component_id), '[]'::jsonb) AS subcomponents
           FROM planning_query_store.governance_component_query
          WHERE (governance_component_query.parent_id IS NOT NULL)
          GROUP BY governance_component_query.parent_id
        ), related_test_component_links AS (
         SELECT source.component_id,
            test_component.component_id AS test_component_id,
            test_component.name,
            test_component.file_count,
            test_component.governance_state
           FROM (planning_query_store.governance_component_query source
             JOIN planning_query_store.governance_component_query test_component ON (((test_component.parent_id = source.parent_id) AND (test_component.component_id <> source.component_id))))
          WHERE (regexp_replace(lower(test_component.component_id), '-tests?$'::text, ''::text) = regexp_replace(lower(source.component_id), 's$'::text, ''::text))
        ), related_test_components AS (
         SELECT related_test_component_links.component_id,
            (count(*))::integer AS test_component_count,
            COALESCE(jsonb_agg(jsonb_build_object('componentId', related_test_component_links.test_component_id, 'name', related_test_component_links.name, 'fileCount', related_test_component_links.file_count, 'governanceState', related_test_component_links.governance_state) ORDER BY related_test_component_links.test_component_id), '[]'::jsonb) AS test_components
           FROM related_test_component_links
          GROUP BY related_test_component_links.component_id
        ), component_file_sets AS (
         SELECT governance_component_files.component_id,
            (count(*))::integer AS owned_file_count,
            COALESCE(jsonb_agg(governance_component_files.path ORDER BY governance_component_files.path), '[]'::jsonb) AS owned_files,
            COALESCE(jsonb_agg(governance_component_files.path ORDER BY governance_component_files.path) FILTER (WHERE (governance_component_files.path ~* '(^|/)(test|tests|__tests__)/|(\.test|\.spec|\.architecture\.test)\.[cm]?[jt]sx?$'::text)), '[]'::jsonb) AS test_files,
            (count(*) FILTER (WHERE (governance_component_files.path ~* '(^|/)(test|tests|__tests__)/|(\.test|\.spec|\.architecture\.test)\.[cm]?[jt]sx?$'::text)))::integer AS test_file_count
           FROM planning_query_store.governance_component_files
          GROUP BY governance_component_files.component_id
        ), related_test_file_sets AS (
         SELECT link.component_id,
            (count(file.path))::integer AS related_test_file_count,
            COALESCE(jsonb_agg(file.path ORDER BY file.path), '[]'::jsonb) AS related_test_files
           FROM (related_test_component_links link
             JOIN planning_query_store.governance_component_files file ON ((file.component_id = link.test_component_id)))
          GROUP BY link.component_id
        ), governance_doc_refs AS (
         SELECT component_1.component_id,
            COALESCE(jsonb_agg(ref.value ORDER BY ref.value), '[]'::jsonb) AS governance_documents,
            COALESCE(jsonb_agg(ref.value ORDER BY ref.value) FILTER (WHERE (ref.value ~~ 'docs/adr/%'::text)), '[]'::jsonb) AS adr_documents,
            COALESCE(jsonb_agg(ref.value ORDER BY ref.value) FILTER (WHERE ((ref.value ~~ 'docs/evidence/%'::text) OR (ref.value ~~ 'docs/runbooks/%'::text))), '[]'::jsonb) AS runtime_evidence_documents
           FROM (planning_query_store.governance_component_query component_1
             LEFT JOIN LATERAL jsonb_array_elements_text(component_1.governance_refs) ref(value) ON (true))
          GROUP BY component_1.component_id
        ), component_requirement_refs AS (
         SELECT component_1.component_id,
            COALESCE(jsonb_agg(jsonb_build_object('reference', reference.reference_text, 'classification', reference.classification, 'documentPath', reference.document_path) ORDER BY reference.document_path, reference.reference_text), '[]'::jsonb) AS requirement_refs
           FROM ((planning_query_store.governance_component_query component_1
             JOIN LATERAL jsonb_array_elements_text(component_1.governance_refs) doc(path) ON (true))
             JOIN planning_query_store.doc_task_reference_query reference ON ((reference.document_path = doc.path)))
          GROUP BY component_1.component_id
        ), coverage_rows AS (
         SELECT governance_coverage_query.component_id,
            COALESCE(jsonb_agg(jsonb_build_object('kind', governance_coverage_query.coverage_kind, 'name', governance_coverage_query.name, 'count', governance_coverage_query.count_value, 'fileCount', governance_coverage_query.file_count, 'metadata', governance_coverage_query.metadata) ORDER BY governance_coverage_query.coverage_kind, governance_coverage_query.name), '[]'::jsonb) AS coverage
           FROM planning_query_store.governance_coverage_query
          WHERE (governance_coverage_query.component_id IS NOT NULL)
          GROUP BY governance_coverage_query.component_id
        ), remediation_rows AS (
         SELECT governance_remediation_query.component_unit AS component_id,
            (count(*))::integer AS remediation_count,
            to_jsonb(array_agg(DISTINCT lower(governance_remediation_query.task_type) ORDER BY (lower(governance_remediation_query.task_type)))) AS gap_types,
            COALESCE(jsonb_agg(jsonb_build_object('taskId', governance_remediation_query.task_id, 'type', lower(governance_remediation_query.task_type), 'priority', governance_remediation_query.priority, 'blocking', governance_remediation_query.blocking, 'reason', governance_remediation_query.reason, 'documents', governance_remediation_query.documents, 'files', governance_remediation_query.files, 'expectedValidation', governance_remediation_query.expected_validation) ORDER BY governance_remediation_query.priority, governance_remediation_query.task_id), '[]'::jsonb) AS remediation
           FROM planning_query_store.governance_remediation_query
          GROUP BY governance_remediation_query.component_unit
        )
 SELECT component.component_id,
    jsonb_strip_nulls(jsonb_build_object('recordType', 'componentEngineeringRecord', 'schemaVersion', 'v1', 'identity', jsonb_build_object('componentId', component.component_id, 'name', component.name, 'level', component.level, 'parentId', component.parent_id, 'rootUnit', component.root_unit, 'domainUnit', component.domain_unit, 'unitPath', component.unit_path, 'sourcePath', component.source_path, 'sourceContentSha256', component.source_content_sha256), 'purpose', jsonb_build_object('summary', component.name, 'governanceState', component.governance_state, 'fowlerSignals', component.fowler_signals), 'ownership', jsonb_build_object('dddOwner', component.ddd_owner, 'canonicalRole', component.canonical_role, 'evidenceState', component.evidence_state), 'subcomponents', COALESCE(children.subcomponents, '[]'::jsonb), 'publicContract', jsonb_build_object('commandQueryRails', component.cq_rails, 'apiStatus',
        CASE
            WHEN (COALESCE(remediation.gap_types, '[]'::jsonb) ? 'cq_rail_gap'::text) THEN 'gap'::text
            ELSE 'indexed'::text
        END), 'inputsOutputs', jsonb_build_object('indexed', false, 'gaps', jsonb_build_array('missing_inputs_outputs_index')), 'invariants', jsonb_build_object('indexed', false, 'gaps', jsonb_build_array('missing_invariants_index')), 'stateModel', jsonb_build_object('indexed', false, 'gaps', jsonb_build_array('missing_state_model_index')), 'errorModel', jsonb_build_object('indexed', false, 'gaps', jsonb_build_array('missing_error_model_index')), 'securityRules', jsonb_build_object('indexed', false, 'gaps', jsonb_build_array('missing_security_rule_index')), 'dependencies', jsonb_build_object('owns', component.owns, 'excludes', component.excludes), 'configuration', jsonb_build_object('indexed', false, 'gaps', jsonb_build_array('missing_configuration_index')), 'events', jsonb_build_object('indexed', false, 'gaps', jsonb_build_array('missing_event_index')), 'persistenceImpact', jsonb_build_object('indexed', false, 'gaps', jsonb_build_array('missing_persistence_impact_index')), 'observability', jsonb_build_object('indexed', false, 'gaps', jsonb_build_array('missing_observability_index')), 'tests', jsonb_build_object('testComponents', COALESCE(test_components.test_components, '[]'::jsonb), 'testFiles', (COALESCE(files.test_files, '[]'::jsonb) || COALESCE(related_test_files.related_test_files, '[]'::jsonb)), 'testFileCount', (COALESCE(files.test_file_count, 0) + COALESCE(related_test_files.related_test_file_count, 0)), 'expectedValidation', COALESCE(remediation.remediation, '[]'::jsonb)), 'adrsLinked', COALESCE(docs.adr_documents, '[]'::jsonb), 'requirementsLinked', COALESCE(requirements.requirement_refs, '[]'::jsonb), 'runtimeEvidence', COALESCE(docs.runtime_evidence_documents, '[]'::jsonb), 'lifecycle', jsonb_build_object('status', component.status, 'isLegacy', component.is_legacy, 'isDrift', component.is_drift, 'childrenRequired', component.children_required), 'governingDocuments', COALESCE(docs.governance_documents, '[]'::jsonb), 'coverage', COALESCE(coverage.coverage, '[]'::jsonb), 'ownedFiles', COALESCE(files.owned_files, '[]'::jsonb), 'remediation', COALESCE(remediation.remediation, '[]'::jsonb), 'completenessGaps', (to_jsonb(array_remove(ARRAY[
        CASE
            WHEN (component.children_required AND (COALESCE(children.subcomponent_count, 0) = 0)) THEN 'missing_required_subcomponents'::text
            ELSE NULL::text
        END,
        CASE
            WHEN (jsonb_array_length(component.governance_refs) = 0) THEN 'missing_governance_refs'::text
            ELSE NULL::text
        END,
        CASE
            WHEN ((COALESCE(files.test_file_count, 0) + COALESCE(related_test_files.related_test_file_count, 0)) = 0) THEN 'missing_test_files'::text
            ELSE NULL::text
        END,
        CASE
            WHEN (COALESCE(remediation.remediation_count, 0) > 0) THEN 'open_remediation'::text
            ELSE NULL::text
        END], NULL::text)) || COALESCE(remediation.gap_types, '[]'::jsonb)))) AS record
   FROM ((((((((planning_query_store.governance_component_query component
     LEFT JOIN child_components children ON ((children.component_id = component.component_id)))
     LEFT JOIN related_test_components test_components ON ((test_components.component_id = component.component_id)))
     LEFT JOIN component_file_sets files ON ((files.component_id = component.component_id)))
     LEFT JOIN related_test_file_sets related_test_files ON ((related_test_files.component_id = component.component_id)))
     LEFT JOIN governance_doc_refs docs ON ((docs.component_id = component.component_id)))
     LEFT JOIN component_requirement_refs requirements ON ((requirements.component_id = component.component_id)))
     LEFT JOIN coverage_rows coverage ON ((coverage.component_id = component.component_id)))
     LEFT JOIN remediation_rows remediation ON ((remediation.component_id = component.component_id)));
