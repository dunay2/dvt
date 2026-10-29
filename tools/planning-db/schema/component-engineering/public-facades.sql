--
-- Name: component_definition_query; Type: VIEW; Schema: component_engineering; Owner: -
--

CREATE VIEW component_engineering.component_definition_query AS
 SELECT component_id,
    definition_source,
    source_path,
    source_content_sha256,
    revision,
    name,
    level,
    parent_id,
    root_unit,
    domain_unit,
    status,
    children_required,
    file_count,
    owns,
    excludes,
    owned_concern,
    responsibilities,
    non_goals,
    reasons_to_change,
    ddd_owner,
    cq_rails,
    public_api,
    invariants,
    transitions,
    consumers,
    governance_refs,
    fowler_signals,
    created_by,
    created_at,
    raw_unit
   FROM planning_query_store.governance_component_definition_query;


--
-- Name: component_drift_query; Type: VIEW; Schema: component_engineering; Owner: -
--

CREATE VIEW component_engineering.component_drift_query AS
 SELECT component_id,
    drift_code,
    metadata
   FROM planning_query_store.component_engineering_drift_query;


--
-- Name: component_tree_query; Type: VIEW; Schema: component_engineering; Owner: -
--

CREATE VIEW component_engineering.component_tree_query AS
 SELECT component_id,
    name,
    component_level,
    parent_component_id,
    root_unit,
    domain_unit,
    status,
    governance_state,
    canonical_role,
    evidence_state,
    is_drift,
    is_legacy,
    children_required,
    direct_file_count,
    descendant_component_count,
    descendant_file_count,
    ddd_owner,
    cq_rails,
    is_materialized_component,
    has_children,
    is_leaf_component,
    raw_units
   FROM planning_query_store.component_engineering_component_tree_projection;


--
-- Name: file_ownership_query; Type: VIEW; Schema: component_engineering; Owner: -
--

CREATE VIEW component_engineering.file_ownership_query AS
 SELECT ownership.file_path,
    ownership.leaf_component_id,
    ownership.owning_unit,
    ownership.root_unit,
    ownership.domain_unit,
    ownership.owner_level,
    ownership.governance_state,
    ownership.canonical_role,
    ownership.evidence_state,
    ownership.is_drift,
    ownership.is_legacy,
    ownership.ddd_owner,
    ownership.cq_rails,
    ownership.file_role,
    tree.parent_component_id,
    tree.component_level,
    tree.is_leaf_component,
    ownership.source_path,
    ownership.source_content_sha256
   FROM (planning_query_store.component_engineering_file_ownership_projection ownership
     LEFT JOIN component_engineering.component_tree_query tree ON ((tree.component_id = ownership.leaf_component_id)));


--
-- Name: component_quality_query; Type: VIEW; Schema: component_engineering; Owner: -
--

CREATE VIEW component_engineering.component_quality_query AS
 WITH RECURSIVE component_descendants AS (
         SELECT tree_1.component_id AS ancestor_component_id,
            tree_1.component_id AS descendant_component_id,
            ARRAY[tree_1.component_id] AS visited
           FROM component_engineering.component_tree_query tree_1
        UNION ALL
         SELECT closure.ancestor_component_id,
            child.component_id AS descendant_component_id,
            (closure.visited || child.component_id)
           FROM (component_descendants closure
             JOIN component_engineering.component_tree_query child ON ((child.parent_component_id = closure.descendant_component_id)))
          WHERE (NOT (child.component_id = ANY (closure.visited)))
        ), effective_file_counts AS (
         SELECT tree_1.component_id,
            (count(file_owner.file_path) FILTER (WHERE (file_owner.leaf_component_id = tree_1.component_id)))::integer AS direct_file_count,
            (count(file_owner.file_path) FILTER (WHERE (closure.descendant_component_id IS NOT NULL)))::integer AS descendant_file_count,
            (count(file_owner.file_path) FILTER (WHERE ((file_owner.leaf_component_id = tree_1.component_id) AND (file_owner.file_role = 'test'::text))))::integer AS test_file_count
           FROM ((component_engineering.component_tree_query tree_1
             LEFT JOIN component_descendants closure ON ((closure.ancestor_component_id = tree_1.component_id)))
             LEFT JOIN component_engineering.file_ownership_query file_owner ON ((file_owner.leaf_component_id = closure.descendant_component_id)))
          GROUP BY tree_1.component_id
        ), rule_rollup AS (
         SELECT rule_eval.subject_id AS component_id,
            (count(*))::integer AS rule_count,
            (count(*) FILTER (WHERE (rule_eval.evaluation_state <> 'pass'::text)))::integer AS failing_rule_count,
            (count(*) FILTER (WHERE ((rule_eval.evaluation_state <> 'pass'::text) AND (rule_eval.severity = 'error'::text))))::integer AS error_count,
            (count(*) FILTER (WHERE ((rule_eval.evaluation_state <> 'pass'::text) AND (rule_eval.severity = 'warning'::text))))::integer AS warning_count,
            COALESCE(array_agg(DISTINCT rule_eval.drift_code) FILTER (WHERE ((rule_eval.evaluation_state <> 'pass'::text) AND (rule_eval.drift_code IS NOT NULL))), ARRAY[]::text[]) AS drift_codes
           FROM planning_query_store.component_engineering_rule_evaluation_query rule_eval
          GROUP BY rule_eval.subject_id
        ), children AS (
         SELECT component_tree_query.parent_component_id AS component_id,
            (count(*))::integer AS children_count
           FROM component_engineering.component_tree_query
          WHERE ((component_tree_query.parent_component_id IS NOT NULL) AND (component_tree_query.component_level = 'component'::text))
          GROUP BY component_tree_query.parent_component_id
        )
 SELECT tree.component_id,
    tree.name,
    tree.component_level,
    tree.parent_component_id,
    tree.governance_state,
        CASE
            WHEN (COALESCE(rule_rollup.error_count, 0) > 0) THEN 'fail'::text
            WHEN (COALESCE(rule_rollup.warning_count, 0) > 0) THEN 'warn'::text
            ELSE 'pass'::text
        END AS quality_state,
    COALESCE(effective_file_counts.direct_file_count, 0) AS direct_file_count,
    COALESCE(effective_file_counts.descendant_file_count, 0) AS descendant_file_count,
    COALESCE(children.children_count, 0) AS children_count,
    COALESCE(effective_file_counts.test_file_count, 0) AS test_file_count,
    COALESCE(rule_rollup.rule_count, 0) AS rule_count,
    COALESCE(rule_rollup.failing_rule_count, 0) AS failing_rule_count,
    COALESCE(rule_rollup.error_count, 0) AS error_count,
    COALESCE(rule_rollup.warning_count, 0) AS warning_count,
    COALESCE(rule_rollup.drift_codes, ARRAY[]::text[]) AS drift_codes
   FROM (((component_engineering.component_tree_query tree
     LEFT JOIN effective_file_counts ON ((effective_file_counts.component_id = tree.component_id)))
     LEFT JOIN rule_rollup ON ((rule_rollup.component_id = tree.component_id)))
     LEFT JOIN children ON ((children.component_id = tree.component_id)));


--
-- Name: component_metadata_query; Type: VIEW; Schema: component_engineering; Owner: -
--

CREATE VIEW component_engineering.component_metadata_query AS
 WITH component_base AS (
         SELECT tree.component_id,
            tree.name,
            tree.component_level,
            tree.parent_component_id,
            tree.root_unit,
            tree.domain_unit,
            tree.status,
            tree.governance_state,
            tree.canonical_role,
            tree.evidence_state,
            tree.is_drift,
            tree.is_legacy,
            tree.children_required,
            tree.direct_file_count,
            tree.descendant_component_count,
            tree.descendant_file_count,
            tree.ddd_owner,
            tree.cq_rails,
            tree.is_materialized_component,
            tree.has_children,
            tree.is_leaf_component,
            unit.source_paths,
            unit.source_content_sha256_values
           FROM (component_engineering.component_tree_query tree
             LEFT JOIN planning_query_store.governance_unit_query unit ON ((unit.unit_id = tree.component_id)))
        ), definition_fields AS (
         SELECT definition.component_id,
            definition.owned_concern,
            definition.responsibilities,
            definition.non_goals,
            definition.reasons_to_change,
            definition.public_api AS declared_public_api,
            definition.invariants,
            definition.transitions,
            definition.consumers
           FROM planning_query_store.governance_component_definition_query definition
        ), metadata_projection AS (
         SELECT base.component_id,
            base.name,
            base.component_level,
            base.parent_component_id,
            base.root_unit,
            base.domain_unit,
            base.status,
            base.governance_state,
            base.ddd_owner,
            definition_fields.owned_concern,
            COALESCE(definition_fields.responsibilities, '[]'::jsonb) AS responsibilities,
            COALESCE(definition_fields.non_goals, '[]'::jsonb) AS non_goals,
            COALESCE(definition_fields.reasons_to_change, '[]'::jsonb) AS reasons_to_change,
                CASE
                    WHEN (jsonb_array_length(COALESCE(definition_fields.declared_public_api, '[]'::jsonb)) > 0) THEN definition_fields.declared_public_api
                    WHEN ((NULLIF(btrim(COALESCE(base.cq_rails, ''::text)), ''::text) IS NOT NULL) AND (base.cq_rails !~* '^none(\s|$|-)'::text)) THEN jsonb_build_array(base.cq_rails)
                    ELSE '[]'::jsonb
                END AS public_api,
            COALESCE(definition_fields.invariants, '[]'::jsonb) AS invariants,
            COALESCE(definition_fields.transitions, '[]'::jsonb) AS transitions,
            COALESCE(definition_fields.consumers, '[]'::jsonb) AS consumers,
            base.direct_file_count,
            base.descendant_component_count,
            base.descendant_file_count,
            COALESCE(quality.children_count, 0) AS children_count,
            COALESCE(quality.test_file_count, 0) AS test_file_count,
            COALESCE(quality.quality_state, 'not_indexed'::text) AS quality_state,
            COALESCE(quality.drift_codes, ARRAY[]::text[]) AS drift_codes,
            COALESCE(base.source_paths, '[]'::jsonb) AS source_paths,
            COALESCE(base.source_content_sha256_values, '[]'::jsonb) AS source_content_sha256_values
           FROM ((component_base base
             LEFT JOIN definition_fields ON ((definition_fields.component_id = base.component_id)))
             LEFT JOIN component_engineering.component_quality_query quality ON ((quality.component_id = base.component_id)))
        )
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
        CASE
            WHEN ((owned_concern IS NOT NULL) AND (jsonb_array_length(public_api) > 0) AND (jsonb_array_length(invariants) > 0) AND (jsonb_array_length(transitions) > 0) AND (jsonb_array_length(consumers) > 0)) THEN 'declared'::text
            ELSE 'incomplete'::text
        END AS metadata_state,
    source_paths,
    source_content_sha256_values
   FROM metadata_projection;


--
-- Name: rule_catalog_query; Type: VIEW; Schema: component_engineering; Owner: -
--

CREATE VIEW component_engineering.rule_catalog_query AS
 SELECT rule_id,
    name,
    category,
    severity,
    subject_level,
    subject_scope,
    predicate_owner,
        CASE
            WHEN (evaluation_view = 'component_engineering_rule_evaluation_query'::text) THEN 'component_engineering.rule_evaluation_query'::text
            ELSE evaluation_view
        END AS evaluation_view,
    drift_code,
    governing_doc,
    remediation,
    validation_command
   FROM planning_query_store.component_engineering_rule_catalog_query;


--
-- Name: rule_evaluation_query; Type: VIEW; Schema: component_engineering; Owner: -
--

CREATE VIEW component_engineering.rule_evaluation_query AS
 SELECT rule_id,
    rule_name,
    category,
    severity,
    subject_id,
    subject_level,
    subject_name,
    evaluation_state,
    drift_code,
    evidence,
    remediation,
    metadata
   FROM planning_query_store.component_engineering_rule_evaluation_projection;
