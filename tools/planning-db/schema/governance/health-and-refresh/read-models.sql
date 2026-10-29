--
-- Name: governance_coverage_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.governance_coverage_query AS
 SELECT coverage_id,
    coverage_kind,
    name,
    count_value,
    file_count,
    component_id,
    metadata,
    source_path,
    source_content_sha256,
    raw_coverage
   FROM planning_query_store.governance_coverage;


--
-- Name: governance_remediation_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.governance_remediation_query AS
 SELECT task_id,
    task_type,
    priority,
    component_unit,
    component_file_map,
    root_unit,
    domain_unit,
    ddd_owner,
    cq_rails,
    blocking,
    reason,
    file_count,
    document_count,
    source_path,
    source_content_sha256,
    files,
    documents,
    expected_validation,
    raw_task
   FROM planning_query_store.governance_remediation;


--
-- Name: governance_drift_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.governance_drift_query AS
 SELECT path,
    owning_unit,
    root_unit,
    domain_unit,
    component_unit,
    source_path,
    source_content_sha256,
    array_remove(ARRAY[
        CASE
            WHEN (stored_file_id IS DISTINCT FROM derived_file_id) THEN 'file_id'::text
            ELSE NULL::text
        END,
        CASE
            WHEN (stored_path_hash IS DISTINCT FROM derived_path_hash) THEN 'path_hash'::text
            ELSE NULL::text
        END,
        CASE
            WHEN (stored_governance_hash IS DISTINCT FROM derived_governance_hash) THEN 'governance_hash'::text
            ELSE NULL::text
        END,
        CASE
            WHEN (stored_state_fingerprint IS DISTINCT FROM derived_state_fingerprint) THEN 'state_fingerprint'::text
            ELSE NULL::text
        END], NULL::text) AS drift_fields,
    stored_file_id,
    derived_file_id,
    stored_path_hash,
    derived_path_hash,
    stored_governance_hash,
    derived_governance_hash,
    stored_state_fingerprint,
    derived_state_fingerprint
   FROM planning_query_store.governance_file_hash_drift;


--
-- Name: governance_problem_dashboard_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.governance_problem_dashboard_query AS
 SELECT 'rail-vocabulary'::text AS problem_surface,
    command_query_rail_vocabulary_query.finding_kind,
    command_query_rail_vocabulary_query.severity,
    command_query_rail_vocabulary_query.rail_name AS subject_id,
    NULL::text AS component_id,
    command_query_rail_vocabulary_query.source_path AS path,
    command_query_rail_vocabulary_query.duplicate_count AS evidence_count,
    command_query_rail_vocabulary_query.action_hint,
    command_query_rail_vocabulary_query.metadata
   FROM planning_query_store.command_query_rail_vocabulary_query
UNION ALL
 SELECT 'code-symbols'::text AS problem_surface,
    code_symbol_problem_query.finding_kind,
    code_symbol_problem_query.severity,
    code_symbol_problem_query.symbol_id AS subject_id,
    code_symbol_problem_query.component_id,
    code_symbol_problem_query.source_path AS path,
    code_symbol_problem_query.duplicate_count AS evidence_count,
    code_symbol_problem_query.action_hint,
    code_symbol_problem_query.metadata
   FROM planning_query_store.code_symbol_problem_query
UNION ALL
 SELECT 'source-drift'::text AS problem_surface,
    governed_source_drift_query.finding_kind,
    governed_source_drift_query.severity,
    governed_source_drift_query.source_path AS subject_id,
    NULL::text AS component_id,
    governed_source_drift_query.source_path AS path,
    governed_source_drift_query.reference_count AS evidence_count,
    governed_source_drift_query.action_hint,
    governed_source_drift_query.metadata
   FROM planning_query_store.governed_source_drift_query;


--
-- Name: governance_refresh_run_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.governance_refresh_run_query AS
 SELECT run.run_id,
    run.run_state,
    run.actor,
    run.command_name,
    run.source_ref,
    run.source_content_sha256,
    run.max_passes,
    run.generation_passes,
    run.stabilized,
    run.error_summary,
    run.revision,
    run.started_at,
    run.completed_at,
    (COALESCE(stage_rollup.stage_count, (0)::bigint))::integer AS stage_count,
    (COALESCE(stage_rollup.failed_stage_count, (0)::bigint))::integer AS failed_stage_count,
    (COALESCE(stage_rollup.generation_stage_count, (0)::bigint))::integer AS generation_stage_count,
    (COALESCE(stage_rollup.database_stage_count, (0)::bigint))::integer AS database_stage_count,
    run.payload
   FROM (planning_query_store.governance_refresh_runs run
     LEFT JOIN ( SELECT stage.run_id,
            count(*) AS stage_count,
            count(*) FILTER (WHERE (stage.stage_state = 'failed'::text)) AS failed_stage_count,
            count(*) FILTER (WHERE (stage.stage_group = 'generation'::text)) AS generation_stage_count,
            count(*) FILTER (WHERE (stage.stage_group = 'database'::text)) AS database_stage_count
           FROM planning_query_store.governance_refresh_stage_runs stage
          GROUP BY stage.run_id) stage_rollup ON ((stage_rollup.run_id = run.run_id)));


--
-- Name: pr_readiness_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.pr_readiness_query AS
 SELECT readiness_id,
    base_ref,
    head_ref,
    source_path,
    source_content_sha256,
    effective_arc_level,
    is_arc,
    blocking,
    requirements,
    required_checks,
    recommended_guides,
    changed_files,
    jsonb_array_length(changed_files) AS changed_file_count,
    evidence_docs,
    jsonb_array_length(evidence_docs) AS evidence_doc_count,
    risk_updates,
    jsonb_array_length(risk_updates) AS risk_update_count,
    trigger_hits,
    jsonb_array_length(trigger_hits) AS trigger_count,
    missing_requirements,
    jsonb_array_length(missing_requirements) AS missing_requirement_count,
    COALESCE(((requirements ->> 'evidenceDoc'::text))::boolean, false) AS requires_evidence_doc,
    (jsonb_array_length(evidence_docs) > 0) AS has_evidence_doc,
        CASE
            WHEN (COALESCE(((requirements ->> 'evidenceDoc'::text))::boolean, false) AND (jsonb_array_length(evidence_docs) = 0)) THEN 'missing'::text
            WHEN COALESCE(((requirements ->> 'evidenceDoc'::text))::boolean, false) THEN 'present'::text
            ELSE 'not-required'::text
        END AS evidence_doc_status,
    COALESCE(((requirements ->> 'riskUpdate'::text))::boolean, false) AS requires_risk_update,
    (jsonb_array_length(risk_updates) > 0) AS has_risk_update,
        CASE
            WHEN (COALESCE(((requirements ->> 'riskUpdate'::text))::boolean, false) AND (jsonb_array_length(risk_updates) = 0)) THEN 'missing'::text
            WHEN COALESCE(((requirements ->> 'riskUpdate'::text))::boolean, false) THEN 'present'::text
            ELSE 'not-required'::text
        END AS risk_update_status,
    raw_readiness,
    imported_at
   FROM planning_query_store.pr_readiness_checks;
