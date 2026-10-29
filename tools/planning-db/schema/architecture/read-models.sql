--
-- Name: component_contract_query; Type: VIEW; Schema: architecture; Owner: -
--

CREATE VIEW architecture.component_contract_query AS
 SELECT contract.contract_id,
    contract.contract_kind,
    contract.owner_component_id AS component_id,
    component.name AS component_name,
    contract.contract_ref,
    contract.compatibility,
    contract.status,
    contract.validation_command,
    contract.created_at,
    contract.updated_at
   FROM (architecture.contract contract
     JOIN architecture.component component ON ((component.component_id = contract.owner_component_id)));


--
-- Name: component_dependency_observation_query; Type: VIEW; Schema: architecture; Owner: -
--

CREATE VIEW architecture.component_dependency_observation_query AS
 SELECT observation.observation_id,
    observation.scan_id,
    scan.design_id,
    scan.scan_state,
    observation.source_path,
    observation.target_path,
    observation.import_literal,
    observation.workspace_name,
    observation.package_name,
    observation.source_content_sha256,
    observation.is_test,
    observation.source_component_id,
    source_component.name AS source_component_name,
    observation.target_component_id,
    target_component.name AS target_component_name,
    observation.source_mapping_state,
    observation.target_mapping_state,
    observation.mapping_confidence,
    observation.mapping_reason,
    observation.relation_type,
    observation.observed_at,
    observation.metadata
   FROM (((architecture.component_dependency_observation observation
     JOIN architecture.component_dependency_scan scan ON ((scan.scan_id = observation.scan_id)))
     LEFT JOIN architecture.component source_component ON ((source_component.component_id = observation.source_component_id)))
     LEFT JOIN architecture.component target_component ON ((target_component.component_id = observation.target_component_id)));


--
-- Name: component_dependency_classification_query; Type: VIEW; Schema: architecture; Owner: -
--

CREATE VIEW architecture.component_dependency_classification_query AS
 WITH classified AS (
         SELECT observation.observation_id,
            observation.scan_id,
            observation.design_id,
            observation.scan_state,
            observation.source_path,
            observation.target_path,
            observation.import_literal,
            observation.workspace_name,
            observation.package_name,
            observation.source_content_sha256,
            observation.is_test,
            observation.source_component_id,
            observation.source_component_name,
            observation.target_component_id,
            observation.target_component_name,
            observation.source_mapping_state,
            observation.target_mapping_state,
            observation.mapping_confidence,
            observation.mapping_reason,
            observation.relation_type,
            observation.observed_at,
            observation.metadata,
            declared.relation_id AS declared_relation_id,
            reverse_declared.relation_id AS reverse_declared_relation_id,
                CASE
                    WHEN (observation.source_mapping_state = 'unmapped'::text) THEN 'unmapped_source'::text
                    WHEN (observation.target_mapping_state = 'unmapped'::text) THEN 'unmapped_target'::text
                    WHEN ((observation.source_mapping_state = 'ambiguous'::text) OR (observation.target_mapping_state = 'ambiguous'::text)) THEN 'ambiguous_mapping'::text
                    WHEN (observation.target_mapping_state = 'external'::text) THEN 'external_dependency'::text
                    WHEN ((observation.source_component_id IS NOT NULL) AND (observation.source_component_id = observation.target_component_id)) THEN 'self_dependency'::text
                    WHEN (declared.relation_id IS NOT NULL) THEN 'declared'::text
                    WHEN (reverse_declared.relation_id IS NOT NULL) THEN 'reverse_declared'::text
                    ELSE 'undeclared_dependency'::text
                END AS dependency_classification
           FROM ((architecture.component_dependency_observation_query observation
             LEFT JOIN architecture.component_relation declared ON (((declared.source_component_id = observation.source_component_id) AND (declared.target_component_id = observation.target_component_id) AND (declared.relation_type = observation.relation_type) AND (declared.status = ANY (ARRAY['approved'::text, 'implemented'::text])))))
             LEFT JOIN architecture.component_relation reverse_declared ON (((reverse_declared.source_component_id = observation.target_component_id) AND (reverse_declared.target_component_id = observation.source_component_id) AND (reverse_declared.relation_type = observation.relation_type) AND (reverse_declared.status = ANY (ARRAY['approved'::text, 'implemented'::text])))))
        )
 SELECT observation_id,
    scan_id,
    design_id,
    source_path,
    target_path,
    import_literal,
    source_component_id,
    source_component_name,
    target_component_id,
    target_component_name,
    relation_type,
    COALESCE(declared_relation_id, reverse_declared_relation_id) AS matched_relation_id,
    dependency_classification,
        CASE
            WHEN (dependency_classification = ANY (ARRAY['declared'::text, 'external_dependency'::text, 'self_dependency'::text])) THEN 'pass'::text
            WHEN (dependency_classification = ANY (ARRAY['unmapped_source'::text, 'unmapped_target'::text, 'undeclared_dependency'::text])) THEN 'fail'::text
            ELSE 'warning'::text
        END AS fitness_state,
    mapping_confidence,
    mapping_reason,
    is_test,
    source_content_sha256
   FROM classified;


--
-- Name: component_drift_query; Type: VIEW; Schema: architecture; Owner: -
--

CREATE VIEW architecture.component_drift_query AS
 SELECT 'component'::text AS subject_kind,
    component.component_id AS subject_id,
    'component_status_drift'::text AS drift_code,
    'error'::text AS severity,
    jsonb_build_object('status', component.status) AS metadata
   FROM architecture.component component
  WHERE (component.status = 'drift'::text)
UNION ALL
 SELECT 'relation'::text AS subject_kind,
    relation.relation_id AS subject_id,
    'relation_status_drift'::text AS drift_code,
    'error'::text AS severity,
    jsonb_build_object('sourceComponentId', relation.source_component_id, 'targetComponentId', relation.target_component_id, 'status', relation.status) AS metadata
   FROM architecture.component_relation relation
  WHERE (relation.status = 'drift'::text)
UNION ALL
 SELECT 'contract'::text AS subject_kind,
    contract.contract_id AS subject_id,
    'contract_deprecated'::text AS drift_code,
    'warning'::text AS severity,
    jsonb_build_object('status', contract.status) AS metadata
   FROM architecture.contract contract
  WHERE (contract.status = 'deprecated'::text)
UNION ALL
 SELECT health_check.subject_kind,
    health_check.subject_id,
    'health_check_failed'::text AS drift_code,
    health_check.severity,
    jsonb_build_object('checkId', health_check.check_id, 'checkKind', health_check.check_kind, 'status', health_check.status, 'predicate', health_check.predicate) AS metadata
   FROM architecture.component_health_check health_check
  WHERE (health_check.status = 'fail'::text);


--
-- Name: component_fitness_gap_summary_query; Type: VIEW; Schema: architecture; Owner: -
--

CREATE VIEW architecture.component_fitness_gap_summary_query AS
 WITH classified AS (
         SELECT classification.observation_id,
            classification.scan_id,
            classification.design_id,
            classification.source_path,
            classification.target_path,
            classification.import_literal,
            classification.source_component_id,
            classification.source_component_name,
            classification.target_component_id,
            classification.target_component_name,
            classification.relation_type,
            classification.matched_relation_id,
            classification.dependency_classification,
            classification.fitness_state,
            classification.mapping_confidence,
            classification.mapping_reason,
            classification.is_test,
            classification.source_content_sha256,
            NULLIF(concat_ws('/'::text, NULLIF(split_part(classification.source_path, '/'::text, 1), ''::text), NULLIF(split_part(classification.source_path, '/'::text, 2), ''::text), NULLIF(split_part(classification.source_path, '/'::text, 3), ''::text)), ''::text) AS source_prefix,
            NULLIF(concat_ws('/'::text, NULLIF(split_part(COALESCE(classification.target_path, ''::text), '/'::text, 1), ''::text), NULLIF(split_part(COALESCE(classification.target_path, ''::text), '/'::text, 2), ''::text), NULLIF(split_part(COALESCE(classification.target_path, ''::text), '/'::text, 3), ''::text)), ''::text) AS target_prefix
           FROM architecture.component_dependency_classification_query classification
          WHERE (classification.fitness_state <> 'pass'::text)
        )
 SELECT scan_id,
    design_id,
    dependency_classification AS gap_kind,
    fitness_state,
        CASE fitness_state
            WHEN 'fail'::text THEN 'error'::text
            WHEN 'warning'::text THEN 'warning'::text
            ELSE 'info'::text
        END AS severity,
    COALESCE(source_prefix, '-'::text) AS source_prefix,
    COALESCE(target_prefix, '-'::text) AS target_prefix,
    source_component_id,
    target_component_id,
    relation_type,
    (count(*))::integer AS observation_count,
    (count(*) FILTER (WHERE is_test))::integer AS test_observation_count,
    min(source_path) AS sample_source_path,
    min(target_path) AS sample_target_path,
    min(import_literal) AS sample_import_literal,
        CASE dependency_classification
            WHEN 'unmapped_source'::text THEN 'Record or refine architecture.component ownership for the source prefix.'::text
            WHEN 'unmapped_target'::text THEN 'Record or refine architecture.component ownership for the target prefix.'::text
            WHEN 'ambiguous_mapping'::text THEN 'Narrow overlapping architecture.component repo_path ownership.'::text
            WHEN 'undeclared_dependency'::text THEN 'Record architecture.component_relation or refactor the dependency.'::text
            WHEN 'reverse_declared'::text THEN 'Correct relation direction or refactor the dependency.'::text
            ELSE 'Review architecture fitness classification.'::text
        END AS action_hint
   FROM classified
  GROUP BY scan_id, design_id, dependency_classification, fitness_state, source_prefix, target_prefix, source_component_id, target_component_id, relation_type;


--
-- Name: component_fitness_query; Type: VIEW; Schema: architecture; Owner: -
--

CREATE VIEW architecture.component_fitness_query AS
 SELECT evaluation.scan_id,
    scan.design_id,
    evaluation.fitness_rule_id,
    evaluation.subject_kind,
    evaluation.subject_id,
    evaluation.result_state,
    evaluation.severity,
    evaluation.reason,
    evaluation.evidence,
    evaluation.evaluated_at
   FROM (architecture.component_fitness_evaluation evaluation
     JOIN architecture.component_dependency_scan scan ON ((scan.scan_id = evaluation.scan_id)))
UNION ALL
 SELECT classification.scan_id,
    classification.design_id,
        CASE classification.dependency_classification
            WHEN 'unmapped_source'::text THEN 'DVT-ARCH-001'::text
            WHEN 'ambiguous_mapping'::text THEN 'DVT-ARCH-002'::text
            WHEN 'unmapped_target'::text THEN 'DVT-ARCH-002'::text
            WHEN 'undeclared_dependency'::text THEN 'DVT-ARCH-003'::text
            WHEN 'reverse_declared'::text THEN 'DVT-ARCH-004'::text
            ELSE 'DVT-ARCH-005'::text
        END AS fitness_rule_id,
    'observation'::text AS subject_kind,
    classification.observation_id AS subject_id,
    classification.fitness_state AS result_state,
        CASE classification.fitness_state
            WHEN 'fail'::text THEN 'error'::text
            WHEN 'warning'::text THEN 'warning'::text
            ELSE 'info'::text
        END AS severity,
        CASE classification.dependency_classification
            WHEN 'unmapped_source'::text THEN 'Observed source path is not mapped to an architecture component.'::text
            WHEN 'unmapped_target'::text THEN 'Observed target path is not mapped to an architecture component.'::text
            WHEN 'ambiguous_mapping'::text THEN 'Observed dependency has ambiguous component mapping.'::text
            WHEN 'undeclared_dependency'::text THEN 'Observed internal dependency is not declared in architecture.component_relation.'::text
            WHEN 'reverse_declared'::text THEN 'Observed dependency only matches a relation in the opposite direction.'::text
            WHEN 'external_dependency'::text THEN 'Observed dependency is external to the architecture component graph.'::text
            WHEN 'self_dependency'::text THEN 'Observed dependency remains within the same component.'::text
            ELSE 'Observed dependency matches an approved or implemented architecture relation.'::text
        END AS reason,
    jsonb_build_object('sourcePath', classification.source_path, 'targetPath', classification.target_path, 'importLiteral', classification.import_literal, 'sourceComponentId', classification.source_component_id, 'targetComponentId', classification.target_component_id, 'relationType', classification.relation_type, 'classification', classification.dependency_classification) AS evidence,
    now() AS evaluated_at
   FROM architecture.component_dependency_classification_query classification;


--
-- Name: component_flow_query; Type: VIEW; Schema: architecture; Owner: -
--

CREATE VIEW architecture.component_flow_query AS
SELECT
    NULL::text AS flow_id,
    NULL::text AS name,
    NULL::text AS entry_component_id,
    NULL::text AS entry_component_name,
    NULL::text AS exit_component_id,
    NULL::text AS exit_component_name,
    NULL::text AS flow_kind,
    NULL::text AS status,
    NULL::text AS criticality,
    NULL::integer AS step_count,
    NULL::timestamp with time zone AS created_at,
    NULL::timestamp with time zone AS updated_at;


--
-- Name: component_flow_step_query; Type: VIEW; Schema: architecture; Owner: -
--

CREATE VIEW architecture.component_flow_step_query AS
 SELECT step.flow_id,
    step.step_order,
    step.component_id,
    component.name AS component_name,
    step.relation_id,
    relation.relation_type,
    step.input_contract_id,
    input_contract.contract_ref AS input_contract_ref,
    step.output_contract_id,
    output_contract.contract_ref AS output_contract_ref,
    step.transformation_id,
    transformation.transformation_kind,
    step.created_at
   FROM (((((architecture.component_flow_step step
     JOIN architecture.component component ON ((component.component_id = step.component_id)))
     LEFT JOIN architecture.component_relation relation ON ((relation.relation_id = step.relation_id)))
     LEFT JOIN architecture.contract input_contract ON ((input_contract.contract_id = step.input_contract_id)))
     LEFT JOIN architecture.contract output_contract ON ((output_contract.contract_id = step.output_contract_id)))
     LEFT JOIN architecture.component_transformation transformation ON ((transformation.transformation_id = step.transformation_id)));


--
-- Name: component_io_query; Type: VIEW; Schema: architecture; Owner: -
--

CREATE VIEW architecture.component_io_query AS
 SELECT port.component_id,
    port.port_id AS io_id,
    'port'::text AS io_kind,
    port.port_name AS io_name,
    port.direction,
    COALESCE(port.input_contract_id, port.output_contract_id) AS contract_id,
    'none'::text AS runtime,
    jsonb_build_object('portKind', port.port_kind, 'inputContractId', port.input_contract_id, 'outputContractId', port.output_contract_id, 'negativeTests', to_jsonb(port.negative_tests), 'status', port.status) AS metadata
   FROM architecture.component_port port
UNION ALL
 SELECT event_io.component_id,
    event_io.event_io_id AS io_id,
    'event'::text AS io_kind,
    event_io.event_name AS io_name,
    event_io.direction,
    event_io.contract_id,
    event_io.runtime,
    jsonb_build_object('status', 'declared') AS metadata
   FROM architecture.component_event_io event_io
UNION ALL
 SELECT storage_io.component_id,
    storage_io.storage_io_id AS io_id,
    'storage'::text AS io_kind,
    storage_io.storage_object AS io_name,
    storage_io.direction,
    storage_io.contract_id,
    'none'::text AS runtime,
    jsonb_build_object('accessPattern', storage_io.access_pattern) AS metadata
   FROM architecture.component_storage_io storage_io;


--
-- Name: component_maturity_query; Type: VIEW; Schema: architecture; Owner: -
--

CREATE VIEW architecture.component_maturity_query AS
 WITH metric_rollup AS (
         SELECT metric.component_id,
            COALESCE(jsonb_object_agg(metric.metric_name, metric.metric_value ORDER BY metric.metric_name), '{}'::jsonb) AS metrics
           FROM architecture.component_metric metric
          GROUP BY metric.component_id
        ), component_signals AS (
         SELECT component_1.component_id,
            (EXISTS ( SELECT 1
                   FROM architecture.component_responsibility responsibility
                  WHERE (responsibility.component_id = component_1.component_id))) AS has_responsibility,
            (EXISTS ( SELECT 1
                   FROM architecture.component_relation relation
                  WHERE ((relation.source_component_id = component_1.component_id) OR (relation.target_component_id = component_1.component_id)))) AS has_relation,
            (EXISTS ( SELECT 1
                   FROM architecture.component_test component_test
                  WHERE ((component_test.component_id = component_1.component_id) AND component_test.required))) AS has_required_test,
            (EXISTS ( SELECT 1
                   FROM architecture.component_observability observability
                  WHERE ((observability.component_id = component_1.component_id) AND observability.required AND (observability.status = ANY (ARRAY['implemented'::text, 'not_applicable'::text]))))) AS has_required_observability
           FROM architecture.component component_1
        )
 SELECT component.component_id,
    component.name,
    COALESCE(component.maturity_score, (((((((((
        CASE
            WHEN ((component.owner <> ''::text) AND (component.layer <> ''::text)) THEN 10
            ELSE 0
        END +
        CASE
            WHEN ((component.kind <> ''::text) AND (component.repo_path <> ''::text)) THEN 10
            ELSE 0
        END) +
        CASE
            WHEN ((component.public_contract <> ''::text) OR (component.kind = ANY (ARRAY['module'::text, 'adapter'::text]))) THEN 15
            ELSE 0
        END) +
        CASE
            WHEN signals.has_relation THEN 15
            ELSE 0
        END) +
        CASE
            WHEN signals.has_required_test THEN 15
            ELSE 0
        END) +
        CASE
            WHEN ((component.runtime = 'none'::text) OR (component.criticality = ANY (ARRAY['low'::text, 'medium'::text])) OR signals.has_required_observability) THEN 10
            ELSE 0
        END) +
        CASE
            WHEN (EXISTS ( SELECT 1
               FROM architecture.decision decision
              WHERE (decision.applies_to @> jsonb_build_array(jsonb_build_object('subjectKind', 'component', 'subjectId', component.component_id))))) THEN 10
            ELSE 0
        END) +
        CASE
            WHEN (EXISTS ( SELECT 1
               FROM architecture.risk risk
              WHERE (risk.component_id = component.component_id))) THEN 5
            ELSE 0
        END) +
        CASE
            WHEN (component.status <> 'drift'::text) THEN 10
            ELSE 0
        END))::numeric) AS maturity_score,
    COALESCE(metric_rollup.metrics, '{}'::jsonb) AS metrics,
        CASE
            WHEN (component.status = 'deprecated'::text) THEN ARRAY[]::text[]
            ELSE array_remove(ARRAY[
            CASE
                WHEN ((component.owner = ''::text) OR (component.layer = ''::text)) THEN 'missing_owner_or_layer'::text
                ELSE NULL::text
            END,
            CASE
                WHEN ((component.kind = ''::text) OR (component.repo_path = ''::text)) THEN 'missing_kind_or_repo_path'::text
                ELSE NULL::text
            END,
            CASE
                WHEN ((component.public_contract = ''::text) AND (component.kind <> ALL (ARRAY['module'::text, 'adapter'::text]))) THEN 'missing_public_contract'::text
                ELSE NULL::text
            END,
            CASE
                WHEN (NOT signals.has_responsibility) THEN 'missing_responsibility'::text
                ELSE NULL::text
            END,
            CASE
                WHEN (NOT signals.has_relation) THEN 'missing_relation'::text
                ELSE NULL::text
            END,
            CASE
                WHEN (NOT signals.has_required_test) THEN 'missing_required_test'::text
                ELSE NULL::text
            END,
            CASE
                WHEN ((component.runtime <> 'none'::text) AND (component.criticality = ANY (ARRAY['high'::text, 'critical'::text])) AND (NOT signals.has_required_observability)) THEN 'missing_observability'::text
                ELSE NULL::text
            END,
            CASE
                WHEN (component.status = 'drift'::text) THEN 'component_in_drift'::text
                ELSE NULL::text
            END], NULL::text)
        END AS missing_reasons
   FROM ((architecture.component component
     JOIN component_signals signals ON ((signals.component_id = component.component_id)))
     LEFT JOIN metric_rollup ON ((metric_rollup.component_id = component.component_id)));


--
-- Name: component_path_mapping_query; Type: VIEW; Schema: architecture; Owner: -
--

CREATE VIEW architecture.component_path_mapping_query AS
 SELECT observation.scan_id,
    scan.design_id,
    'source'::text AS path_role,
    observation.source_path AS path,
    observation.source_component_id AS component_id,
    source_component.name AS component_name,
    observation.source_mapping_state AS mapping_state,
    observation.mapping_confidence,
    observation.mapping_reason,
    observation.source_content_sha256
   FROM ((architecture.component_dependency_observation observation
     JOIN architecture.component_dependency_scan scan ON ((scan.scan_id = observation.scan_id)))
     LEFT JOIN architecture.component source_component ON ((source_component.component_id = observation.source_component_id)))
UNION ALL
 SELECT observation.scan_id,
    scan.design_id,
    'target'::text AS path_role,
    observation.target_path AS path,
    observation.target_component_id AS component_id,
    target_component.name AS component_name,
    observation.target_mapping_state AS mapping_state,
    observation.mapping_confidence,
    observation.mapping_reason,
    observation.source_content_sha256
   FROM ((architecture.component_dependency_observation observation
     JOIN architecture.component_dependency_scan scan ON ((scan.scan_id = observation.scan_id)))
     LEFT JOIN architecture.component target_component ON ((target_component.component_id = observation.target_component_id)))
  WHERE (observation.target_path IS NOT NULL);


--
-- Name: component_query; Type: VIEW; Schema: architecture; Owner: -
--

CREATE VIEW architecture.component_query AS
 SELECT component_id,
    name,
    kind,
    layer,
    owner,
    repo_path,
    public_contract,
    runtime,
    criticality,
    status,
    maturity_score,
    parent_component_id,
    created_at,
    updated_at
   FROM architecture.component;


--
-- Name: component_relation_query; Type: VIEW; Schema: architecture; Owner: -
--

CREATE VIEW architecture.component_relation_query AS
 SELECT relation.relation_id,
    relation.source_component_id,
    source.name AS source_component_name,
    relation.target_component_id,
    target.name AS target_component_name,
    relation.relation_type,
    relation.direction,
    relation.sync_async,
    relation.contract_id,
    contract.contract_ref,
    relation.failure_mode,
    relation.authorization_scope,
    relation.source_refs,
    relation.status,
    relation.created_at,
    relation.updated_at
   FROM (((architecture.component_relation relation
     JOIN architecture.component source ON ((source.component_id = relation.source_component_id)))
     JOIN architecture.component target ON ((target.component_id = relation.target_component_id)))
     LEFT JOIN architecture.contract contract ON ((contract.contract_id = relation.contract_id)));


--
-- Name: component_responsibility_query; Type: VIEW; Schema: architecture; Owner: -
--

CREATE VIEW architecture.component_responsibility_query AS
 SELECT responsibility.responsibility_id,
    responsibility.component_id,
    component.name AS component_name,
    responsibility.responsibility,
    responsibility.reason_to_change,
    responsibility.ddd_owner,
    responsibility.status,
    responsibility.created_at
   FROM (architecture.component_responsibility responsibility
     JOIN architecture.component component ON ((component.component_id = responsibility.component_id)));


--
-- Name: design_query; Type: VIEW; Schema: architecture; Owner: -
--

CREATE VIEW architecture.design_query AS
 SELECT design_id,
    work_item_id,
    title,
    owner,
    status,
    rationale,
    fowler_signal,
    rail_ref,
    approved_at,
    supersedes_id,
    created_at,
    updated_at
   FROM architecture.design;


--
-- Name: design_scope_query; Type: VIEW; Schema: architecture; Owner: -
--

CREATE VIEW architecture.design_scope_query AS
 SELECT scope.design_id,
    design.work_item_id,
    design.title AS design_title,
    design.status AS design_status,
    scope.subject_kind,
    scope.subject_id,
    scope.scope_kind,
    scope.required,
    scope.created_at
   FROM (architecture.design_scope scope
     JOIN architecture.design design ON ((design.design_id = scope.design_id)));


--
-- Name: implementation_authorization_query; Type: VIEW; Schema: architecture; Owner: -
--

CREATE VIEW architecture.implementation_authorization_query AS
 SELECT scope.design_id,
    design.work_item_id,
    design.title AS design_title,
    design.status AS authorization_state,
    scope.subject_kind,
    scope.subject_id,
    scope.scope_kind,
    scope.required,
    design.approved_at
   FROM (architecture.design_scope scope
     JOIN architecture.design design ON ((design.design_id = scope.design_id)))
  WHERE (design.status = ANY (ARRAY['approved'::text, 'implementing'::text, 'implemented'::text]));


--
-- Name: evidence_subject_implementation_query; Type: VIEW; Schema: architecture; Owner: -
--

CREATE VIEW architecture.evidence_subject_implementation_query AS
 WITH implementation_inputs AS (
         SELECT rail.rail_type AS subject_kind,
            rail.rail_name AS subject_id,
            rail.source_path AS rail_source_path,
            rail.source_content_sha256 AS rail_source_content_sha256,
            reference.value AS implementation_ref,
            split_part(reference.value, '#'::text, 1) AS implementation_path,
            implementation_file.content_hash AS implementation_content_hash
           FROM ((planning_query_store.command_query_rail_query rail
             CROSS JOIN LATERAL jsonb_array_elements_text(rail.implementation_refs) reference(value))
             LEFT JOIN planning_query_store.governance_file_query implementation_file ON ((implementation_file.path = split_part(reference.value, '#'::text, 1))))
        )
 SELECT implementation_inputs.subject_kind,
    implementation_inputs.subject_id,
    implementation_inputs.rail_source_path,
    implementation_inputs.rail_source_content_sha256,
    (count(*))::integer AS implementation_ref_count,
    (count(*) FILTER (WHERE (implementation_inputs.implementation_content_hash IS NULL)))::integer AS missing_implementation_ref_count,
    jsonb_agg(jsonb_build_object('implementation_ref', implementation_inputs.implementation_ref, 'implementation_path', implementation_inputs.implementation_path, 'implementation_content_hash', implementation_inputs.implementation_content_hash) ORDER BY implementation_inputs.implementation_ref) AS implementation_files,
    planning_query_store.sha256_text((((((((implementation_inputs.subject_kind || E'\n'::text) || implementation_inputs.subject_id) || E'\n'::text) || implementation_inputs.rail_source_path) || E'\n'::text) || implementation_inputs.rail_source_content_sha256) || E'\n'::text) || string_agg(((implementation_inputs.implementation_ref || '='::text) || COALESCE(implementation_inputs.implementation_content_hash, 'missing'::text)), E'\n'::text ORDER BY implementation_inputs.implementation_ref)) AS current_implementation_content_sha256
   FROM implementation_inputs
  GROUP BY implementation_inputs.subject_kind, implementation_inputs.subject_id, implementation_inputs.rail_source_path, implementation_inputs.rail_source_content_sha256;


--
-- Name: evidence_query; Type: VIEW; Schema: architecture; Owner: -
--

CREATE VIEW architecture.evidence_query AS
 SELECT evidence.evidence_id,
    evidence.design_id,
    evidence.subject_kind,
    evidence.subject_id,
    evidence.evidence_kind,
    evidence.evidence_origin,
    evidence.source_ref,
    evidence.source_path,
    evidence.result_state,
    evidence.recorded_at,
    evidence.source_content_sha256,
    source.content_hash AS current_source_content_sha256,
    evidence.implementation_content_sha256,
    subject_implementation.current_implementation_content_sha256,
        CASE
            WHEN (evidence.evidence_origin = ANY (ARRAY['declared'::text, 'imported_assertion'::text])) THEN 'assertion_only'::text
            WHEN (source.path IS NULL) THEN 'missing_source'::text
            WHEN (evidence.source_content_sha256 IS DISTINCT FROM source.content_hash) THEN 'source_changed'::text
            WHEN ((evidence.subject_kind = ANY (ARRAY['command'::text, 'query'::text])) AND (subject_implementation.current_implementation_content_sha256 IS NULL)) THEN 'missing_implementation'::text
            WHEN ((evidence.subject_kind = ANY (ARRAY['command'::text, 'query'::text])) AND (evidence.implementation_content_sha256 IS DISTINCT FROM subject_implementation.current_implementation_content_sha256)) THEN 'implementation_changed'::text
            WHEN (evidence.result_state = 'stale'::text) THEN 'stale'::text
            WHEN (evidence.recorded_at < (now() - '30 days'::interval)) THEN 'stale'::text
            ELSE 'fresh'::text
        END AS freshness_state,
        CASE
            WHEN (evidence.evidence_origin = ANY (ARRAY['declared'::text, 'imported_assertion'::text])) THEN 'assertion_only'::text
            WHEN ((source.path IS NULL) OR (evidence.source_content_sha256 IS DISTINCT FROM source.content_hash) OR ((evidence.subject_kind = ANY (ARRAY['command'::text, 'query'::text])) AND ((subject_implementation.current_implementation_content_sha256 IS NULL) OR (evidence.implementation_content_sha256 IS DISTINCT FROM subject_implementation.current_implementation_content_sha256))) OR (evidence.result_state = 'stale'::text) OR (evidence.recorded_at < (now() - '30 days'::interval))) THEN 'stale'::text
            WHEN (evidence.result_state = 'pass'::text) THEN 'verified'::text
            WHEN (evidence.result_state = 'fail'::text) THEN 'failed'::text
            ELSE 'missing'::text
        END AS verification_state,
        CASE
            WHEN (evidence.evidence_origin = ANY (ARRAY['declared'::text, 'imported_assertion'::text])) THEN 'assertion_only'::text
            WHEN (source.path IS NULL) THEN 'missing'::text
            WHEN (evidence.source_content_sha256 IS DISTINCT FROM source.content_hash) THEN 'changed'::text
            ELSE 'verified'::text
        END AS source_verification_state,
        CASE
            WHEN (evidence.subject_kind <> ALL (ARRAY['command'::text, 'query'::text])) THEN 'not_applicable'::text
            WHEN (subject_implementation.current_implementation_content_sha256 IS NULL) THEN 'missing'::text
            WHEN (evidence.implementation_content_sha256 IS DISTINCT FROM subject_implementation.current_implementation_content_sha256) THEN 'changed'::text
            ELSE 'verified'::text
        END AS implementation_verification_state
   FROM ((architecture.evidence evidence
     LEFT JOIN planning_query_store.governance_file_query source ON ((source.path = evidence.source_path)))
     LEFT JOIN architecture.evidence_subject_implementation_query subject_implementation ON (((subject_implementation.subject_kind = evidence.subject_kind) AND (subject_implementation.subject_id = evidence.subject_id))));


--
-- Name: implementation_violation_query; Type: VIEW; Schema: architecture; Owner: -
--

CREATE VIEW architecture.implementation_violation_query AS
 WITH ranked_execution AS (
         SELECT evidence.evidence_id,
            evidence.design_id,
            evidence.subject_kind,
            evidence.subject_id,
            evidence.evidence_origin,
            evidence.result_state,
            evidence.recorded_at,
            evidence.source_path,
            evidence.source_content_sha256,
            source.content_hash AS current_source_content_sha256,
            evidence.implementation_content_sha256,
            subject_implementation.current_implementation_content_sha256,
            row_number() OVER (PARTITION BY evidence.design_id, evidence.subject_kind, evidence.subject_id ORDER BY evidence.recorded_at DESC, evidence.evidence_id DESC) AS execution_rank
           FROM ((architecture.evidence evidence
             LEFT JOIN planning_query_store.governance_file_query source ON ((source.path = evidence.source_path)))
             LEFT JOIN architecture.evidence_subject_implementation_query subject_implementation ON (((subject_implementation.subject_kind = evidence.subject_kind) AND (subject_implementation.subject_id = evidence.subject_id))))
          WHERE (evidence.evidence_origin = ANY (ARRAY['local_execution'::text, 'ci_execution'::text]))
        )
 SELECT health_check.check_id AS violation_id,
    NULL::text AS design_id,
    health_check.subject_kind,
    health_check.subject_id,
    'health_check_failed'::text AS violation_kind,
    health_check.severity,
    jsonb_build_object('checkKind', health_check.check_kind, 'predicate', health_check.predicate, 'queryRef', health_check.query_ref, 'status', health_check.status) AS evidence
   FROM architecture.component_health_check health_check
  WHERE ((health_check.status = ANY (ARRAY['fail'::text, 'not_indexed'::text])) AND (health_check.severity = ANY (ARRAY['error'::text, 'blocker'::text])))
UNION ALL
 SELECT ((((scope.design_id || ':'::text) || scope.subject_kind) || ':'::text) || scope.subject_id) AS violation_id,
    scope.design_id,
    scope.subject_kind,
    scope.subject_id,
    'required_evidence_missing'::text AS violation_kind,
    'blocker'::text AS severity,
    jsonb_build_object('scopeKind', scope.scope_kind, 'required', scope.required, 'designStatus', design.status, 'latestEvidenceId', evidence.evidence_id, 'latestResult', evidence.result_state, 'sourcePath', evidence.source_path, 'sourceHash', evidence.source_content_sha256, 'currentSourceHash', evidence.current_source_content_sha256, 'implementationHash', evidence.implementation_content_sha256, 'currentImplementationHash', evidence.current_implementation_content_sha256) AS evidence
   FROM ((architecture.design_scope scope
     JOIN architecture.design design ON ((design.design_id = scope.design_id)))
     LEFT JOIN ranked_execution evidence ON (((evidence.design_id = scope.design_id) AND (evidence.subject_kind = scope.subject_kind) AND (evidence.subject_id = scope.subject_id) AND (evidence.execution_rank = 1))))
  WHERE (scope.required AND (scope.scope_kind = 'must_prove'::text) AND (design.status = ANY (ARRAY['approved'::text, 'implementing'::text, 'implemented'::text])) AND ((evidence.evidence_id IS NULL) OR (evidence.result_state <> 'pass'::text) OR (evidence.recorded_at < (now() - '30 days'::interval)) OR (evidence.current_source_content_sha256 IS NULL) OR (evidence.source_content_sha256 IS DISTINCT FROM evidence.current_source_content_sha256) OR ((scope.subject_kind = ANY (ARRAY['command'::text, 'query'::text])) AND ((evidence.current_implementation_content_sha256 IS NULL) OR (evidence.implementation_content_sha256 IS DISTINCT FROM evidence.current_implementation_content_sha256)))));
