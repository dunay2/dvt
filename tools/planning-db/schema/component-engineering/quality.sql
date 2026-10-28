--
-- Name: component_roadmap_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.component_roadmap_query AS
 WITH feature_manifests AS (
         SELECT DISTINCT rail.feature_id,
            rail.mechanization_status,
            rail.source_path,
            rail.source_content_sha256,
            rail.raw_manifest
           FROM planning_query_store.command_query_rail_manifest_query rail
          WHERE ((rail.raw_manifest IS NOT NULL) AND (rail.raw_manifest ? 'featureId'::text))
        ), planned_component_refs AS (
         SELECT NULLIF(btrim(component_ref.value), ''::text) AS component_ref,
            manifest.feature_id,
            manifest.mechanization_status,
            manifest.source_path,
            manifest.source_content_sha256
           FROM (feature_manifests manifest
             CROSS JOIN LATERAL jsonb_array_elements_text(
                CASE
                    WHEN (jsonb_typeof((manifest.raw_manifest -> 'componentGuides'::text)) = 'array'::text) THEN (manifest.raw_manifest -> 'componentGuides'::text)
                    ELSE '[]'::jsonb
                END) component_ref(value))
          WHERE ((NULLIF(btrim(component_ref.value), ''::text) IS NOT NULL) AND (component_ref.value !~ '^(docs/|buzon/)'::text) AND (component_ref.value !~ '\.[A-Za-z0-9]+$'::text) AND ((component_ref.value ~~ 'SYS-%'::text) OR (component_ref.value ~ '^(apps|packages|scripts|tools|\.github)/'::text)))
        ), planned_components AS (
         SELECT planned_component_refs.component_ref,
            (count(DISTINCT planned_component_refs.feature_id))::integer AS planned_feature_count,
            (count(DISTINCT planned_component_refs.feature_id) FILTER (WHERE (planned_component_refs.mechanization_status = ANY (ARRAY['implemented'::text, 'closed'::text]))))::integer AS implemented_feature_count,
            min(planned_component_refs.source_path) AS source_path,
            min(planned_component_refs.source_content_sha256) AS source_content_sha256,
            jsonb_agg(DISTINCT planned_component_refs.feature_id ORDER BY planned_component_refs.feature_id) AS feature_ids,
            jsonb_agg(DISTINCT planned_component_refs.mechanization_status ORDER BY planned_component_refs.mechanization_status) AS mechanization_states
           FROM planned_component_refs
          GROUP BY planned_component_refs.component_ref
        ), engineering_components AS (
         SELECT component_metadata_query.component_id,
            component_metadata_query.name,
            component_metadata_query.component_level,
            component_metadata_query.parent_component_id,
            component_metadata_query.domain_unit,
            component_metadata_query.status,
            component_metadata_query.governance_state,
            component_metadata_query.quality_state,
            component_metadata_query.metadata_state,
            component_metadata_query.source_paths,
            component_metadata_query.source_content_sha256_values
           FROM component_engineering.component_metadata_query
        ), architecture_components AS (
         SELECT component_query.component_id,
            component_query.name,
            component_query.kind,
            component_query.layer,
            component_query.owner,
            component_query.repo_path,
            component_query.status,
            component_query.maturity_score,
            component_query.parent_component_id
           FROM architecture.component_query
        ), planned_roadmap AS (
         SELECT COALESCE(engineering.component_id, architecture.component_id, planned.component_ref) AS component_id,
            planned.component_ref,
            COALESCE(engineering.name, architecture.name, planned.component_ref) AS component_name,
                CASE
                    WHEN (engineering.component_id IS NOT NULL) THEN 'implemented'::text
                    ELSE 'planned'::text
                END AS implementation_state,
                CASE
                    WHEN ((planned.planned_feature_count > 0) AND (planned.planned_feature_count = planned.implemented_feature_count)) THEN 'programmed'::text
                    ELSE 'open'::text
                END AS planning_state,
                CASE
                    WHEN (engineering.component_id IS NULL) THEN 'planned_component_missing_db_component'::text
                    WHEN (architecture.component_id IS NULL) THEN 'component_missing_architecture_authority'::text
                    ELSE 'none'::text
                END AS gap_kind,
            COALESCE(architecture.status, 'missing'::text) AS architecture_status,
            COALESCE(engineering.quality_state, 'missing'::text) AS engineering_quality_state,
            planned.planned_feature_count,
            planned.implemented_feature_count,
            planned.source_path,
            planned.source_content_sha256
           FROM ((planned_components planned
             LEFT JOIN engineering_components engineering ON (((engineering.component_id = planned.component_ref) OR (EXISTS ( SELECT 1
                   FROM jsonb_array_elements_text(COALESCE(engineering.source_paths, '[]'::jsonb)) source_path(value)
                  WHERE (source_path.value = planned.component_ref))))))
             LEFT JOIN architecture_components architecture ON (((architecture.component_id = COALESCE(engineering.component_id, planned.component_ref)) OR (architecture.repo_path = planned.component_ref))))
        ), engineering_roadmap AS (
         SELECT engineering.component_id,
            NULL::text AS component_ref,
            engineering.name AS component_name,
            'implemented'::text AS implementation_state,
            'unplanned'::text AS planning_state,
                CASE
                    WHEN (architecture.component_id IS NULL) THEN 'component_missing_architecture_authority'::text
                    ELSE 'none'::text
                END AS gap_kind,
            COALESCE(architecture.status, 'missing'::text) AS architecture_status,
            COALESCE(engineering.quality_state, 'missing'::text) AS engineering_quality_state,
            0 AS planned_feature_count,
            0 AS implemented_feature_count,
            (engineering.source_paths ->> 0) AS source_path,
            (engineering.source_content_sha256_values ->> 0) AS source_content_sha256
           FROM (engineering_components engineering
             LEFT JOIN architecture_components architecture ON ((architecture.component_id = engineering.component_id)))
          WHERE (NOT (EXISTS ( SELECT 1
                   FROM planned_components planned
                  WHERE ((planned.component_ref = engineering.component_id) OR (EXISTS ( SELECT 1
                           FROM jsonb_array_elements_text(COALESCE(engineering.source_paths, '[]'::jsonb)) source_path(value)
                          WHERE (source_path.value = planned.component_ref)))))))
        ), architecture_roadmap AS (
         SELECT architecture.component_id,
            NULL::text AS component_ref,
            architecture.name AS component_name,
            'declared'::text AS implementation_state,
            'accepted'::text AS planning_state,
            'architecture_component_missing_engineering_component'::text AS gap_kind,
            architecture.status AS architecture_status,
            'missing'::text AS engineering_quality_state,
            0 AS planned_feature_count,
            0 AS implemented_feature_count,
            architecture.repo_path AS source_path,
            repeat('0'::text, 64) AS source_content_sha256
           FROM architecture_components architecture
          WHERE ((NOT (EXISTS ( SELECT 1
                   FROM engineering_components engineering
                  WHERE (engineering.component_id = architecture.component_id)))) AND (NOT (EXISTS ( SELECT 1
                   FROM planned_components planned
                  WHERE ((planned.component_ref = architecture.component_id) OR (planned.component_ref = architecture.repo_path))))))
        ), component_roadmap AS (
         SELECT planned_roadmap.component_id,
            planned_roadmap.component_ref,
            planned_roadmap.component_name,
            planned_roadmap.implementation_state,
            planned_roadmap.planning_state,
            planned_roadmap.gap_kind,
            planned_roadmap.architecture_status,
            planned_roadmap.engineering_quality_state,
            planned_roadmap.planned_feature_count,
            planned_roadmap.implemented_feature_count,
            planned_roadmap.source_path,
            planned_roadmap.source_content_sha256
           FROM planned_roadmap
        UNION ALL
         SELECT engineering_roadmap.component_id,
            engineering_roadmap.component_ref,
            engineering_roadmap.component_name,
            engineering_roadmap.implementation_state,
            engineering_roadmap.planning_state,
            engineering_roadmap.gap_kind,
            engineering_roadmap.architecture_status,
            engineering_roadmap.engineering_quality_state,
            engineering_roadmap.planned_feature_count,
            engineering_roadmap.implemented_feature_count,
            engineering_roadmap.source_path,
            engineering_roadmap.source_content_sha256
           FROM engineering_roadmap
        UNION ALL
         SELECT architecture_roadmap.component_id,
            architecture_roadmap.component_ref,
            architecture_roadmap.component_name,
            architecture_roadmap.implementation_state,
            architecture_roadmap.planning_state,
            architecture_roadmap.gap_kind,
            architecture_roadmap.architecture_status,
            architecture_roadmap.engineering_quality_state,
            architecture_roadmap.planned_feature_count,
            architecture_roadmap.implemented_feature_count,
            architecture_roadmap.source_path,
            architecture_roadmap.source_content_sha256
           FROM architecture_roadmap
        )
 SELECT component_id AS component_key,
    component_id,
    component_ref,
    component_name,
    implementation_state,
    planning_state,
    gap_kind,
    (gap_kind <> 'none'::text) AS is_gap,
    architecture_status,
    engineering_quality_state,
    planned_feature_count,
    implemented_feature_count,
    COALESCE(source_path, '-'::text) AS source_path,
    COALESCE(source_content_sha256, repeat('0'::text, 64)) AS source_content_sha256
   FROM component_roadmap;


--
-- Name: component_engineering_component_metadata_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.component_engineering_component_metadata_query AS
 SELECT component_id,
    name,
    component_level,
    parent_component_id,
    root_unit,
    domain_unit,
    status,
    governance_state,
    ddd_owner,
    owned_concern,
    responsibilities,
    non_goals,
    reasons_to_change,
    public_api,
    invariants,
    transitions,
    consumers,
    direct_file_count,
    descendant_component_count,
    descendant_file_count,
    children_count,
    test_file_count,
    quality_state,
    drift_codes,
    metadata_state,
    source_paths,
    source_content_sha256_values
   FROM component_engineering.component_metadata_query;


--
-- Name: component_engineering_component_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.component_engineering_component_query AS
 SELECT component_id,
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
   FROM planning_query_store.governance_component_query;


--
-- Name: component_engineering_contract_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.component_engineering_contract_query AS
 SELECT component_id,
    'commandQueryRail'::text AS contract_kind,
    NULLIF(cq_rails, ''::text) AS contract_name,
    false AS indexed,
    'missing_contract_index'::text AS gap_code,
    jsonb_build_object('source', 'governance_component_query.cq_rails') AS metadata
   FROM planning_query_store.component_engineering_component_query
  WHERE (NULLIF(cq_rails, ''::text) IS NOT NULL);


--
-- Name: component_engineering_document_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.component_engineering_document_query AS
 WITH records AS (
         SELECT governance_component_engineering_record_query.component_id,
            governance_component_engineering_record_query.record
           FROM planning_query_store.governance_component_engineering_record_query
        )
 SELECT records.component_id,
    'governing'::text AS document_kind,
    (document.value #>> '{}'::text[]) AS document_path,
    NULL::text AS reference,
    NULL::text AS classification,
    jsonb_build_object('sourceField', 'governingDocuments') AS metadata
   FROM (records
     CROSS JOIN LATERAL jsonb_array_elements(COALESCE((records.record -> 'governingDocuments'::text), '[]'::jsonb)) document(value))
UNION ALL
 SELECT records.component_id,
    'adr'::text AS document_kind,
    COALESCE((document.value ->> 'documentPath'::text), (document.value #>> '{}'::text[])) AS document_path,
    (document.value ->> 'reference'::text) AS reference,
    (document.value ->> 'classification'::text) AS classification,
    document.value AS metadata
   FROM (records
     CROSS JOIN LATERAL jsonb_array_elements(COALESCE((records.record -> 'adrsLinked'::text), '[]'::jsonb)) document(value))
UNION ALL
 SELECT records.component_id,
    'requirement'::text AS document_kind,
    COALESCE((document.value ->> 'documentPath'::text), (document.value #>> '{}'::text[])) AS document_path,
    (document.value ->> 'reference'::text) AS reference,
    (document.value ->> 'classification'::text) AS classification,
    document.value AS metadata
   FROM (records
     CROSS JOIN LATERAL jsonb_array_elements(COALESCE((records.record -> 'requirementsLinked'::text), '[]'::jsonb)) document(value))
UNION ALL
 SELECT records.component_id,
    'runtimeEvidence'::text AS document_kind,
    COALESCE((document.value ->> 'documentPath'::text), (document.value #>> '{}'::text[])) AS document_path,
    (document.value ->> 'reference'::text) AS reference,
    (document.value ->> 'classification'::text) AS classification,
    document.value AS metadata
   FROM (records
     CROSS JOIN LATERAL jsonb_array_elements(COALESCE((records.record -> 'runtimeEvidence'::text), '[]'::jsonb)) document(value));


--
-- Name: component_engineering_file_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.component_engineering_file_query AS
 SELECT component_id,
    path AS file_path,
        CASE
            WHEN (path ~* '(^|/)(test|tests|__tests__)/|(\.test|\.spec|\.architecture\.test)\.[cm]?[jt]sx?$'::text) THEN 'test'::text
            ELSE 'owned'::text
        END AS file_role,
    source_path,
    source_content_sha256
   FROM planning_query_store.governance_component_files;


--
-- Name: component_engineering_file_rollup_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.component_engineering_file_rollup_query AS
 SELECT component_id,
    COALESCE(jsonb_agg(file_path ORDER BY file_path) FILTER (WHERE (file_role = 'owned'::text)), '[]'::jsonb) AS owned_files,
    COALESCE(jsonb_agg(file_path ORDER BY file_path) FILTER (WHERE (file_role = 'test'::text)), '[]'::jsonb) AS test_files
   FROM planning_query_store.component_engineering_file_query
  GROUP BY component_id;


--
-- Name: component_engineering_gap_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.component_engineering_gap_query AS
 WITH records AS (
         SELECT governance_component_engineering_record_query.component_id,
            governance_component_engineering_record_query.record
           FROM planning_query_store.governance_component_engineering_record_query
        ), base_gaps AS (
         SELECT records.component_id,
            (gap.value #>> '{}'::text[]) AS gap_code,
            'v1'::text AS gap_source
           FROM (records
             CROSS JOIN LATERAL jsonb_array_elements(COALESCE((records.record -> 'completenessGaps'::text), '[]'::jsonb)) gap(value))
        ), v2_gaps AS (
         SELECT records.component_id,
            gap.gap_code,
            'v2'::text AS gap_source
           FROM (records
             CROSS JOIN LATERAL ( VALUES ('missing_contract_index'::text), ('missing_capability_index'::text), ('missing_dependency_classification_index'::text), ('missing_runtime_profile_index'::text), ('missing_failure_mode_index'::text), ('missing_cost_model_index'::text), ('missing_code_symbol_index'::text), ('missing_component_connection_index'::text)) gap(gap_code))
        )
 SELECT DISTINCT component_id,
    gap_code,
    gap_source
   FROM ( SELECT base_gaps.component_id,
            base_gaps.gap_code,
            base_gaps.gap_source
           FROM base_gaps
        UNION ALL
         SELECT v2_gaps.component_id,
            v2_gaps.gap_code,
            v2_gaps.gap_source
           FROM v2_gaps) gaps;


--
-- Name: component_engineering_quality_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.component_engineering_quality_query AS
 WITH unit_children AS (
         SELECT parent.unit_id,
            (count(child.unit_id))::integer AS children_count
           FROM (planning_query_store.governance_unit_query parent
             LEFT JOIN planning_query_store.governance_unit_query child ON ((child.parent_id = parent.unit_id)))
          GROUP BY parent.unit_id
        ), unit_tests AS (
         SELECT file_owner.leaf_component_id AS component_id,
            (count(*))::integer AS test_file_count
           FROM planning_query_store.component_engineering_file_ownership_projection file_owner
          WHERE (file_owner.file_role = 'test'::text)
          GROUP BY file_owner.leaf_component_id
        ), unit_rule_summary AS (
         SELECT evaluation.subject_id AS component_id,
            (count(*))::integer AS rule_count,
            (count(*) FILTER (WHERE (evaluation.evaluation_state = 'fail'::text)))::integer AS failing_rule_count,
            (count(*) FILTER (WHERE ((evaluation.evaluation_state = 'fail'::text) AND (evaluation.severity = 'error'::text))))::integer AS error_count,
            (count(*) FILTER (WHERE ((evaluation.evaluation_state = 'fail'::text) AND (evaluation.severity = 'warning'::text))))::integer AS warning_count,
            COALESCE(array_agg(DISTINCT evaluation.drift_code ORDER BY evaluation.drift_code) FILTER (WHERE ((evaluation.evaluation_state = 'fail'::text) AND (evaluation.drift_code IS NOT NULL))), ARRAY[]::text[]) AS drift_codes
           FROM planning_query_store.component_engineering_rule_evaluation_projection evaluation
          GROUP BY evaluation.subject_id
        )
 SELECT unit.unit_id AS component_id,
    unit.name,
    unit.level AS component_level,
    unit.parent_id AS parent_component_id,
    unit.governance_state,
        CASE
            WHEN (COALESCE(rule_summary.error_count, 0) > 0) THEN 'fail'::text
            WHEN (COALESCE(rule_summary.warning_count, 0) > 0) THEN 'warn'::text
            ELSE 'pass'::text
        END AS quality_state,
    unit.direct_file_count,
    unit.descendant_file_count,
    COALESCE(children.children_count, 0) AS children_count,
    COALESCE(tests.test_file_count, 0) AS test_file_count,
    COALESCE(rule_summary.rule_count, 0) AS rule_count,
    COALESCE(rule_summary.failing_rule_count, 0) AS failing_rule_count,
    COALESCE(rule_summary.error_count, 0) AS error_count,
    COALESCE(rule_summary.warning_count, 0) AS warning_count,
    COALESCE(rule_summary.drift_codes, ARRAY[]::text[]) AS drift_codes
   FROM (((planning_query_store.governance_unit_query unit
     LEFT JOIN unit_children children ON ((children.unit_id = unit.unit_id)))
     LEFT JOIN unit_tests tests ON ((tests.component_id = unit.unit_id)))
     LEFT JOIN unit_rule_summary rule_summary ON ((rule_summary.component_id = unit.unit_id)));


--
-- Name: component_engineering_relation_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.component_engineering_relation_query AS
 SELECT component_engineering_component_query.component_id AS source_component_id,
    'parent'::text AS relation_type,
    'component'::text AS target_kind,
    component_engineering_component_query.parent_id AS target_id,
    jsonb_build_object('source', 'component.parent_id') AS metadata
   FROM planning_query_store.component_engineering_component_query
  WHERE (component_engineering_component_query.parent_id IS NOT NULL)
UNION ALL
 SELECT component_engineering_component_query.parent_id AS source_component_id,
    'child'::text AS relation_type,
    'component'::text AS target_kind,
    component_engineering_component_query.component_id AS target_id,
    jsonb_build_object('source', 'component.parent_id') AS metadata
   FROM planning_query_store.component_engineering_component_query
  WHERE (component_engineering_component_query.parent_id IS NOT NULL)
UNION ALL
 SELECT component_engineering_file_query.component_id AS source_component_id,
    'ownsFile'::text AS relation_type,
    'file'::text AS target_kind,
    component_engineering_file_query.file_path AS target_id,
    jsonb_build_object('fileRole', component_engineering_file_query.file_role) AS metadata
   FROM planning_query_store.component_engineering_file_query
  WHERE (component_engineering_file_query.file_role = 'owned'::text)
UNION ALL
 SELECT component_engineering_file_query.component_id AS source_component_id,
    'testedBy'::text AS relation_type,
    'file'::text AS target_kind,
    component_engineering_file_query.file_path AS target_id,
    jsonb_build_object('fileRole', component_engineering_file_query.file_role) AS metadata
   FROM planning_query_store.component_engineering_file_query
  WHERE (component_engineering_file_query.file_role = 'test'::text)
UNION ALL
 SELECT component_engineering_document_query.component_id AS source_component_id,
    'governedBy'::text AS relation_type,
    'document'::text AS target_kind,
    component_engineering_document_query.document_path AS target_id,
    jsonb_build_object('documentKind', component_engineering_document_query.document_kind, 'reference', component_engineering_document_query.reference, 'classification', component_engineering_document_query.classification) AS metadata
   FROM planning_query_store.component_engineering_document_query
  WHERE (component_engineering_document_query.document_path IS NOT NULL);


--
-- Name: component_integrity_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.component_integrity_query AS
 WITH architecture_components AS MATERIALIZED (
         SELECT component_query.component_id,
            component_query.name,
            component_query.status,
            component_query.repo_path
           FROM architecture.component_query
        ), component_tree AS MATERIALIZED (
         SELECT component_engineering_component_tree_query.component_id,
            component_engineering_component_tree_query.name,
            component_engineering_component_tree_query.component_level,
            component_engineering_component_tree_query.status,
            component_engineering_component_tree_query.ddd_owner,
            component_engineering_component_tree_query.cq_rails,
            component_engineering_component_tree_query.direct_file_count,
            component_engineering_component_tree_query.descendant_file_count
           FROM planning_query_store.component_engineering_component_tree_query
        ), component_definitions AS MATERIALIZED (
         SELECT governance_component_definition_query.component_id,
            governance_component_definition_query.owned_concern,
            governance_component_definition_query.public_api AS declared_public_api,
            governance_component_definition_query.invariants,
            governance_component_definition_query.transitions,
            governance_component_definition_query.consumers
           FROM planning_query_store.governance_component_definition_query
        ), file_ownership AS MATERIALIZED (
         SELECT component_engineering_file_ownership_projection.file_path,
            component_engineering_file_ownership_projection.leaf_component_id,
            component_engineering_file_ownership_projection.owning_unit,
            component_engineering_file_ownership_projection.file_role,
            component_engineering_file_ownership_projection.governance_state
           FROM planning_query_store.component_engineering_file_ownership_projection
        ), component_test_file_counts AS MATERIALIZED (
         SELECT file_ownership.leaf_component_id AS component_id,
            (count(*) FILTER (WHERE (file_ownership.file_role = 'test'::text)))::integer AS test_file_count
           FROM file_ownership
          WHERE (file_ownership.leaf_component_id IS NOT NULL)
          GROUP BY file_ownership.leaf_component_id
        ), engineering_projection AS MATERIALIZED (
         SELECT tree.component_id,
            tree.name,
            tree.component_level,
            tree.status,
            tree.ddd_owner,
            tree.direct_file_count,
            tree.descendant_file_count,
            COALESCE(test_counts.test_file_count, 0) AS test_file_count,
                CASE
                    WHEN (COALESCE(test_counts.test_file_count, 0) > 0) THEN 'has_tests'::text
                    ELSE 'no_tests'::text
                END AS quality_state,
            definition.owned_concern,
                CASE
                    WHEN (jsonb_array_length(COALESCE(definition.declared_public_api, '[]'::jsonb)) > 0) THEN definition.declared_public_api
                    WHEN ((NULLIF(btrim(COALESCE(tree.cq_rails, ''::text)), ''::text) IS NOT NULL) AND (tree.cq_rails !~* '^none(\s|$|-)'::text)) THEN jsonb_build_array(tree.cq_rails)
                    ELSE '[]'::jsonb
                END AS public_api,
            COALESCE(definition.invariants, '[]'::jsonb) AS invariants,
            COALESCE(definition.transitions, '[]'::jsonb) AS transitions,
            COALESCE(definition.consumers, '[]'::jsonb) AS consumers
           FROM ((component_tree tree
             LEFT JOIN component_definitions definition ON ((definition.component_id = tree.component_id)))
             LEFT JOIN component_test_file_counts test_counts ON ((test_counts.component_id = tree.component_id)))
        ), engineering_components AS MATERIALIZED (
         SELECT engineering_projection.component_id,
            engineering_projection.name,
            engineering_projection.component_level,
            engineering_projection.status,
            engineering_projection.ddd_owner,
            engineering_projection.direct_file_count,
            engineering_projection.descendant_file_count,
            engineering_projection.test_file_count,
            engineering_projection.quality_state,
                CASE
                    WHEN ((engineering_projection.owned_concern IS NOT NULL) AND (jsonb_array_length(engineering_projection.public_api) > 0) AND (jsonb_array_length(engineering_projection.invariants) > 0) AND (jsonb_array_length(engineering_projection.transitions) > 0) AND (jsonb_array_length(engineering_projection.consumers) > 0)) THEN 'declared'::text
                    ELSE 'incomplete'::text
                END AS metadata_state
           FROM engineering_projection
        ), architecture_test_evidence AS MATERIALIZED (
         SELECT component_test.component_id,
            (count(*))::integer AS architecture_test_count
           FROM architecture.component_test
          WHERE component_test.required
          GROUP BY component_test.component_id
        ), architecture_maturity_evidence AS MATERIALIZED (
         SELECT component_maturity_query.component_id,
            component_maturity_query.name,
            component_maturity_query.maturity_score,
            component_maturity_query.missing_reasons
           FROM architecture.component_maturity_query
        ), fitness_gaps AS (
         SELECT 'fitness_gap'::text AS finding_kind,
            gap.severity,
            COALESCE(gap.source_component_id, gap.target_component_id, '-'::text) AS component_id,
            COALESCE(component.name, '-'::text) AS component_name,
            gap.fitness_state AS finding_state,
            gap.sample_source_path AS path,
                CASE
                    WHEN (gap.source_component_id IS NOT NULL) THEN gap.target_component_id
                    ELSE gap.source_component_id
                END AS related_component_id,
            NULL::text AS relation_id,
            gap.observation_count AS evidence_count,
            gap.action_hint,
            'architecture.component_fitness_gap_summary_query'::text AS source_view,
            jsonb_build_object('designId', gap.design_id, 'scanId', gap.scan_id, 'gapKind', gap.gap_kind, 'sourcePrefix', gap.source_prefix, 'targetPrefix', gap.target_prefix, 'relationType', gap.relation_type, 'testObservationCount', gap.test_observation_count, 'sampleImportLiteral', gap.sample_import_literal) AS metadata
           FROM (architecture.component_fitness_gap_summary_query gap
             LEFT JOIN architecture_components component ON ((component.component_id = COALESCE(gap.source_component_id, gap.target_component_id))))
        ), architecture_drift AS (
         SELECT 'architecture_drift'::text AS finding_kind,
            drift.severity,
                CASE
                    WHEN (drift.subject_kind = 'component'::text) THEN drift.subject_id
                    WHEN (drift.subject_kind = 'relation'::text) THEN relation.source_component_id
                    ELSE COALESCE(contract.component_id, '-'::text)
                END AS component_id,
            COALESCE(component.name, contract.component_name, '-'::text) AS component_name,
            'fail'::text AS finding_state,
            NULL::text AS path,
                CASE
                    WHEN (drift.subject_kind = 'relation'::text) THEN relation.target_component_id
                    ELSE NULL::text
                END AS related_component_id,
                CASE
                    WHEN (drift.subject_kind = 'relation'::text) THEN drift.subject_id
                    ELSE NULL::text
                END AS relation_id,
            1 AS evidence_count,
            'Resolve architecture drift or retire the affected subject explicitly.'::text AS action_hint,
            'architecture.component_drift_query'::text AS source_view,
            drift.metadata
           FROM (((architecture.component_drift_query drift
             LEFT JOIN architecture.component_relation_query relation ON ((relation.relation_id = drift.subject_id)))
             LEFT JOIN architecture.component_contract_query contract ON ((contract.contract_id = drift.subject_id)))
             LEFT JOIN architecture_components component ON ((component.component_id =
                CASE
                    WHEN (drift.subject_kind = 'component'::text) THEN drift.subject_id
                    WHEN (drift.subject_kind = 'relation'::text) THEN relation.source_component_id
                    ELSE contract.component_id
                END)))
        ), maturity_gaps AS (
         SELECT 'missing_maturity_evidence'::text AS finding_kind,
                CASE
                    WHEN (('missing_required_test'::text = ANY (maturity.missing_reasons)) OR ('missing_relation'::text = ANY (maturity.missing_reasons))) THEN 'error'::text
                    ELSE 'warning'::text
                END AS severity,
            maturity.component_id,
            maturity.name AS component_name,
            'warning'::text AS finding_state,
            component.repo_path AS path,
            NULL::text AS related_component_id,
            NULL::text AS relation_id,
            COALESCE(array_length(maturity.missing_reasons, 1), 0) AS evidence_count,
            'Complete component responsibility, relation, test, observability, and contract evidence.'::text AS action_hint,
            'architecture.component_maturity_query'::text AS source_view,
            jsonb_build_object('maturityScore', maturity.maturity_score, 'missingReasons', to_jsonb(maturity.missing_reasons)) AS metadata
           FROM (architecture_maturity_evidence maturity
             JOIN architecture_components component ON ((component.component_id = maturity.component_id)))
          WHERE ((COALESCE(array_length(maturity.missing_reasons, 1), 0) > 0) AND (component.status = ANY (ARRAY['approved'::text, 'implemented'::text, 'drift'::text])))
        ), duplicate_repo_paths AS (
         SELECT 'duplicate_repo_path'::text AS finding_kind,
            'warning'::text AS severity,
            component.component_id,
            component.name AS component_name,
            'warning'::text AS finding_state,
            component.repo_path AS path,
            NULL::text AS related_component_id,
            NULL::text AS relation_id,
            rollup.component_count AS evidence_count,
            'Split overlapping component ownership or choose one canonical component for the repo path.'::text AS action_hint,
            'architecture.component_query'::text AS source_view,
            jsonb_build_object('repoPath', component.repo_path, 'componentIds', rollup.component_ids) AS metadata
           FROM (architecture_components component
             JOIN ( SELECT architecture_components.repo_path,
                    (count(*))::integer AS component_count,
                    jsonb_agg(architecture_components.component_id ORDER BY architecture_components.component_id) AS component_ids
                   FROM architecture_components
                  WHERE ((architecture_components.status <> ALL (ARRAY['deprecated'::text, 'drift'::text])) AND (NULLIF(btrim(architecture_components.repo_path), ''::text) IS NOT NULL) AND (architecture_components.repo_path <> '.'::text))
                  GROUP BY architecture_components.repo_path
                 HAVING (count(*) > 1)) rollup ON ((rollup.repo_path = component.repo_path)))
        ), component_paths_without_files AS (
         SELECT 'component_path_without_files'::text AS finding_kind,
            'warning'::text AS severity,
            component.component_id,
            component.name AS component_name,
            'warning'::text AS finding_state,
            component.repo_path AS path,
            NULL::text AS related_component_id,
            NULL::text AS relation_id,
            0 AS evidence_count,
            'Remap the component path, retire the phantom component, or justify the virtual boundary explicitly.'::text AS action_hint,
            'architecture.component_query'::text AS source_view,
            jsonb_build_object('repoPath', component.repo_path, 'status', component.status) AS metadata
           FROM architecture_components component
          WHERE ((component.status <> ALL (ARRAY['deprecated'::text, 'drift'::text])) AND (NULLIF(btrim(component.repo_path), ''::text) IS NOT NULL) AND (component.repo_path <> '.'::text) AND (NOT (EXISTS ( SELECT 1
                   FROM planning_query_store.component_engineering_file_ownership_projection ownership
                  WHERE (ownership.file_path = component.repo_path)))) AND (NOT (EXISTS ( SELECT 1
                   FROM planning_query_store.component_engineering_file_ownership_projection ownership
                  WHERE (ownership.file_path ~~ (component.repo_path || '/%'::text))))))
        ), filesystem_coverage AS (
         SELECT 'filesystem_coverage'::text AS finding_kind,
            'blocker'::text AS severity,
            COALESCE(ownership.leaf_component_id, ownership.owning_unit, '-'::text) AS component_id,
            COALESCE(engineering.name, '-'::text) AS component_name,
            'fail'::text AS finding_state,
            ownership.file_path AS path,
            NULL::text AS related_component_id,
            NULL::text AS relation_id,
            1 AS evidence_count,
            'Assign the tracked file to one canonical component owner through Planning DB component ownership.'::text AS action_hint,
            'planning_query_store.component_engineering_file_ownership_query'::text AS source_view,
            jsonb_build_object('owningUnit', ownership.owning_unit, 'leafComponentId', ownership.leaf_component_id, 'fileRole', ownership.file_role, 'governanceState', ownership.governance_state) AS metadata
           FROM (file_ownership ownership
             LEFT JOIN engineering_components engineering ON ((engineering.component_id = COALESCE(ownership.leaf_component_id, ownership.owning_unit))))
          WHERE ((ownership.leaf_component_id IS NULL) OR (ownership.owning_unit IS NULL))
        ), missing_architecture_components AS (
         SELECT 'component_missing_architecture_authority'::text AS finding_kind,
                CASE
                    WHEN (engineering.component_level = ANY (ARRAY['system'::text, 'domain'::text])) THEN 'error'::text
                    ELSE 'warning'::text
                END AS severity,
            engineering.component_id,
            engineering.name AS component_name,
            'warning'::text AS finding_state,
            NULL::text AS path,
            NULL::text AS related_component_id,
            NULL::text AS relation_id,
            COALESCE(engineering.descendant_file_count, engineering.direct_file_count, 0) AS evidence_count,
            'Create, merge, or retire the architecture.component authority row for this governed component.'::text AS action_hint,
            'planning_query_store.component_engineering_component_tree_query'::text AS source_view,
            jsonb_build_object('componentLevel', engineering.component_level, 'dddOwner', engineering.ddd_owner, 'metadataState', engineering.metadata_state, 'qualityState', engineering.quality_state) AS metadata
           FROM (engineering_components engineering
             LEFT JOIN architecture_components component ON ((component.component_id = engineering.component_id)))
          WHERE ((component.component_id IS NULL) AND (engineering.status <> ALL (ARRAY['superseded'::text, 'legacy'::text])))
        ), component_evidence_gaps AS (
         SELECT 'component_evidence_gap'::text AS finding_kind,
            'warning'::text AS severity,
            engineering.component_id,
            engineering.name AS component_name,
            engineering.metadata_state AS finding_state,
            NULL::text AS path,
            NULL::text AS related_component_id,
            NULL::text AS relation_id,
            (COALESCE(engineering.test_file_count, 0) + COALESCE(architecture_test_evidence.architecture_test_count, 0)) AS evidence_count,
            'Connect tests, docs, public API, invariants, transitions, and consumers to the component profile.'::text AS action_hint,
            'planning_query_store.component_engineering_component_tree_query'::text AS source_view,
            jsonb_build_object('metadataState', engineering.metadata_state, 'testFileCount', engineering.test_file_count, 'architectureTestCount', COALESCE(architecture_test_evidence.architecture_test_count, 0), 'architectureMaturityScore', architecture_maturity_evidence.maturity_score, 'architectureMissingReasons', to_jsonb(architecture_maturity_evidence.missing_reasons), 'sourceSummary', jsonb_build_object('directFileCount', engineering.direct_file_count, 'descendantFileCount', engineering.descendant_file_count)) AS metadata
           FROM ((engineering_components engineering
             LEFT JOIN architecture_test_evidence ON ((architecture_test_evidence.component_id = engineering.component_id)))
             LEFT JOIN architecture_maturity_evidence ON ((architecture_maturity_evidence.component_id = engineering.component_id)))
          WHERE ((engineering.status <> ALL (ARRAY['superseded'::text, 'legacy'::text])) AND (NOT ((architecture_maturity_evidence.component_id IS NOT NULL) AND (COALESCE(array_length(architecture_maturity_evidence.missing_reasons, 1), 0) = 0))) AND ((engineering.metadata_state <> 'declared'::text) OR ((COALESCE(engineering.test_file_count, 0) + COALESCE(architecture_test_evidence.architecture_test_count, 0)) = 0)))
        )
 SELECT fitness_gaps.finding_kind,
    fitness_gaps.severity,
    fitness_gaps.component_id,
    fitness_gaps.component_name,
    fitness_gaps.finding_state,
    fitness_gaps.path,
    fitness_gaps.related_component_id,
    fitness_gaps.relation_id,
    fitness_gaps.evidence_count,
    fitness_gaps.action_hint,
    fitness_gaps.source_view,
    fitness_gaps.metadata
   FROM fitness_gaps
UNION ALL
 SELECT architecture_drift.finding_kind,
    architecture_drift.severity,
    architecture_drift.component_id,
    architecture_drift.component_name,
    architecture_drift.finding_state,
    architecture_drift.path,
    architecture_drift.related_component_id,
    architecture_drift.relation_id,
    architecture_drift.evidence_count,
    architecture_drift.action_hint,
    architecture_drift.source_view,
    architecture_drift.metadata
   FROM architecture_drift
UNION ALL
 SELECT maturity_gaps.finding_kind,
    maturity_gaps.severity,
    maturity_gaps.component_id,
    maturity_gaps.component_name,
    maturity_gaps.finding_state,
    maturity_gaps.path,
    maturity_gaps.related_component_id,
    maturity_gaps.relation_id,
    maturity_gaps.evidence_count,
    maturity_gaps.action_hint,
    maturity_gaps.source_view,
    maturity_gaps.metadata
   FROM maturity_gaps
UNION ALL
 SELECT duplicate_repo_paths.finding_kind,
    duplicate_repo_paths.severity,
    duplicate_repo_paths.component_id,
    duplicate_repo_paths.component_name,
    duplicate_repo_paths.finding_state,
    duplicate_repo_paths.path,
    duplicate_repo_paths.related_component_id,
    duplicate_repo_paths.relation_id,
    duplicate_repo_paths.evidence_count,
    duplicate_repo_paths.action_hint,
    duplicate_repo_paths.source_view,
    duplicate_repo_paths.metadata
   FROM duplicate_repo_paths
UNION ALL
 SELECT component_paths_without_files.finding_kind,
    component_paths_without_files.severity,
    component_paths_without_files.component_id,
    component_paths_without_files.component_name,
    component_paths_without_files.finding_state,
    component_paths_without_files.path,
    component_paths_without_files.related_component_id,
    component_paths_without_files.relation_id,
    component_paths_without_files.evidence_count,
    component_paths_without_files.action_hint,
    component_paths_without_files.source_view,
    component_paths_without_files.metadata
   FROM component_paths_without_files
UNION ALL
 SELECT filesystem_coverage.finding_kind,
    filesystem_coverage.severity,
    filesystem_coverage.component_id,
    filesystem_coverage.component_name,
    filesystem_coverage.finding_state,
    filesystem_coverage.path,
    filesystem_coverage.related_component_id,
    filesystem_coverage.relation_id,
    filesystem_coverage.evidence_count,
    filesystem_coverage.action_hint,
    filesystem_coverage.source_view,
    filesystem_coverage.metadata
   FROM filesystem_coverage
UNION ALL
 SELECT missing_architecture_components.finding_kind,
    missing_architecture_components.severity,
    missing_architecture_components.component_id,
    missing_architecture_components.component_name,
    missing_architecture_components.finding_state,
    missing_architecture_components.path,
    missing_architecture_components.related_component_id,
    missing_architecture_components.relation_id,
    missing_architecture_components.evidence_count,
    missing_architecture_components.action_hint,
    missing_architecture_components.source_view,
    missing_architecture_components.metadata
   FROM missing_architecture_components
UNION ALL
 SELECT component_evidence_gaps.finding_kind,
    component_evidence_gaps.severity,
    component_evidence_gaps.component_id,
    component_evidence_gaps.component_name,
    component_evidence_gaps.finding_state,
    component_evidence_gaps.path,
    component_evidence_gaps.related_component_id,
    component_evidence_gaps.relation_id,
    component_evidence_gaps.evidence_count,
    component_evidence_gaps.action_hint,
    component_evidence_gaps.source_view,
    component_evidence_gaps.metadata
   FROM component_evidence_gaps;
