--
-- Name: component_engineering_rule_catalog_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.component_engineering_rule_catalog_query AS
 SELECT rule_id,
    name,
    category,
    severity,
    subject_level,
    subject_scope,
    predicate_owner,
    evaluation_view,
    drift_code,
    governing_doc,
    remediation,
    validation_command
   FROM ( VALUES ('CEI-ID-002'::text,'Every unit parent resolves in the full governance unit tree'::text,'identity'::text,'error'::text,'unit'::text,'governance_unit_query'::text,'planning_query_store'::text,'component_engineering_rule_evaluation_query'::text,'unresolved_parent'::text,'docs/architecture/components/ci-governance/component-engineering-invariants.md'::text,'Add the missing parent unit or correct the child parent path in the governance unit index.'::text,'pnpm planning:db:query component-rule-evaluations --kind CEI-ID-002 --state fail'::text), ('CEI-ID-006'::text,'Component tree parents may be assemblies from the full unit tree'::text,'identity'::text,'error'::text,'component'::text,'component_engineering_component_tree_query'::text,'planning_query_store'::text,'component_engineering_rule_evaluation_query'::text,'component_parent_missing_from_unit_tree'::text,'docs/architecture/components/ci-governance/component-engineering-invariants.md'::text,'Keep component parent validation against governance_unit_query instead of the component-only tree.'::text,'pnpm planning:db:query component-rule-evaluations --kind CEI-ID-006 --state fail'::text), ('CEI-RESP-001'::text,'Canonical components declare an owned concern'::text,'responsibility'::text,'error'::text,'component'::text,'governance_unit_query.raw_units'::text,'planning_query_store'::text,'component_engineering_rule_evaluation_query'::text,'missing_owned_concern'::text,'docs/architecture/components/ci-governance/component-engineering-invariants.md'::text,'Add ownedConcern metadata to the component unit that owns the responsibility.'::text,'pnpm planning:db:query component-rule-evaluations --kind CEI-RESP-001 --state fail'::text), ('CEI-API-001'::text,'Canonical components expose a public API or command/query rail'::text,'interface'::text,'error'::text,'component'::text,'governance_unit_query.raw_units'::text,'planning_query_store'::text,'component_engineering_rule_evaluation_query'::text,'missing_public_api'::text,'docs/architecture/components/ci-governance/component-engineering-invariants.md'::text,'Add publicApi metadata or bind the component to a specific command/query rail.'::text,'pnpm planning:db:query component-rule-evaluations --kind CEI-API-001 --state fail'::text), ('CEI-SIZE-005'::text,'Assemblies that require children have at least one governed child'::text,'size'::text,'error'::text,'unit'::text,'governance_unit_query'::text,'planning_query_store'::text,'component_engineering_rule_evaluation_query'::text,'children_required_without_children'::text,'docs/architecture/components/ci-governance/component-engineering-invariants.md'::text,'Split the assembly into child units or mark childrenRequired false only when it is genuinely a leaf.'::text,'pnpm planning:db:query component-rule-evaluations --kind CEI-SIZE-005 --state fail'::text), ('CEI-SRC-004'::text,'Tracked files resolve to a leaf component owner'::text,'source'::text,'error'::text,'file'::text,'component_engineering_file_ownership_query'::text,'planning_query_store'::text,'component_engineering_rule_evaluation_query'::text,'file_without_leaf_component'::text,'docs/architecture/components/ci-governance/component-engineering-invariants.md'::text,'Move the file ownership to a leaf component or add the missing child component before assigning files.'::text,'pnpm planning:db:query component-rule-evaluations --kind CEI-SRC-004 --state fail'::text)) rule_catalog(rule_id, name, category, severity, subject_level, subject_scope, predicate_owner, evaluation_view, drift_code, governing_doc, remediation, validation_command);


--
-- Name: component_engineering_rule_evaluation_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.component_engineering_rule_evaluation_query AS
 WITH semantic_component_units AS (
         SELECT unit.unit_id,
            unit.name,
            unit.level,
            unit.parent_id,
            unit.root_unit,
            unit.domain_unit,
            unit.status,
            unit.governance_state,
            unit.canonical_role,
            unit.evidence_state,
            unit.is_drift,
            unit.is_legacy,
            unit.children_required,
            unit.direct_file_count,
            unit.descendant_component_count,
            unit.descendant_file_count,
            unit.ddd_owner,
            unit.cq_rails,
            unit.is_materialized_component,
            unit.direct_source_path,
            unit.direct_source_content_sha256,
            unit.source_paths,
            unit.source_content_sha256_values,
            unit.raw_units
           FROM planning_query_store.governance_unit_query unit
          WHERE ((unit.level = 'component'::text) AND (COALESCE(unit.status, unit.governance_state) = ANY (ARRAY['canonical'::text, 'review'::text])))
        ), component_semantics AS (
         SELECT unit.unit_id,
            (EXISTS ( SELECT 1
                   FROM jsonb_array_elements(COALESCE(unit.raw_units, '[]'::jsonb)) raw_unit(value)
                  WHERE (NULLIF(btrim((raw_unit.value ->> 'ownedConcern'::text)), ''::text) IS NOT NULL))) AS has_owned_concern,
            (EXISTS ( SELECT 1
                   FROM jsonb_array_elements(COALESCE(unit.raw_units, '[]'::jsonb)) raw_unit(value)
                  WHERE (NULLIF(btrim((raw_unit.value ->> 'publicApi'::text)), ''::text) IS NOT NULL))) AS has_public_api,
            ((NULLIF(btrim(COALESCE(unit.cq_rails, ''::text)), ''::text) IS NOT NULL) AND (unit.cq_rails !~* '^none(\s|$|-)'::text)) AS has_command_query_rail
           FROM semantic_component_units unit
        )
 SELECT rule.rule_id,
    rule.name AS rule_name,
    rule.category,
    rule.severity,
    unit.unit_id AS subject_id,
    unit.level AS subject_level,
    unit.name AS subject_name,
        CASE
            WHEN (parent.unit_id IS NULL) THEN 'fail'::text
            ELSE 'pass'::text
        END AS evaluation_state,
        CASE
            WHEN (parent.unit_id IS NULL) THEN rule.drift_code
            ELSE NULL::text
        END AS drift_code,
        CASE
            WHEN (parent.unit_id IS NULL) THEN 'Parent unit is absent from governance_unit_query.'::text
            ELSE 'Parent unit resolves in governance_unit_query.'::text
        END AS evidence,
    rule.remediation,
    jsonb_build_object('parentId', unit.parent_id, 'parentLevel', parent.level, 'sourceView', 'governance_unit_query') AS metadata
   FROM ((planning_query_store.governance_unit_query unit
     JOIN planning_query_store.component_engineering_rule_catalog_query rule ON ((rule.rule_id = 'CEI-ID-002'::text)))
     LEFT JOIN planning_query_store.governance_unit_query parent ON ((parent.unit_id = unit.parent_id)))
  WHERE (unit.parent_id IS NOT NULL)
UNION ALL
 SELECT rule.rule_id,
    rule.name AS rule_name,
    rule.category,
    rule.severity,
    component.component_id AS subject_id,
    component.component_level AS subject_level,
    component.name AS subject_name,
        CASE
            WHEN (parent.unit_id IS NULL) THEN 'fail'::text
            ELSE 'pass'::text
        END AS evaluation_state,
        CASE
            WHEN (parent.unit_id IS NULL) THEN rule.drift_code
            ELSE NULL::text
        END AS drift_code,
        CASE
            WHEN (parent.unit_id IS NULL) THEN 'Component parent is absent from the full governance unit tree.'::text
            ELSE 'Component parent resolves in the full governance unit tree.'::text
        END AS evidence,
    rule.remediation,
    jsonb_build_object('parentComponentId', component.parent_component_id, 'parentLevel', parent.level, 'sourceView', 'component_engineering_component_tree_query') AS metadata
   FROM ((planning_query_store.component_engineering_component_tree_query component
     JOIN planning_query_store.component_engineering_rule_catalog_query rule ON ((rule.rule_id = 'CEI-ID-006'::text)))
     LEFT JOIN planning_query_store.governance_unit_query parent ON ((parent.unit_id = component.parent_component_id)))
  WHERE (component.parent_component_id IS NOT NULL)
UNION ALL
 SELECT rule.rule_id,
    rule.name AS rule_name,
    rule.category,
    rule.severity,
    unit.unit_id AS subject_id,
    unit.level AS subject_level,
    unit.name AS subject_name,
        CASE
            WHEN semantic.has_owned_concern THEN 'pass'::text
            ELSE 'fail'::text
        END AS evaluation_state,
        CASE
            WHEN semantic.has_owned_concern THEN NULL::text
            ELSE rule.drift_code
        END AS drift_code,
        CASE
            WHEN semantic.has_owned_concern THEN 'ownedConcern metadata is present.'::text
            ELSE 'ownedConcern metadata is missing.'::text
        END AS evidence,
    rule.remediation,
    jsonb_build_object('requiredField', 'ownedConcern', 'sourceView', 'governance_unit_query.raw_units') AS metadata
   FROM ((semantic_component_units unit
     JOIN component_semantics semantic ON ((semantic.unit_id = unit.unit_id)))
     JOIN planning_query_store.component_engineering_rule_catalog_query rule ON ((rule.rule_id = 'CEI-RESP-001'::text)))
UNION ALL
 SELECT rule.rule_id,
    rule.name AS rule_name,
    rule.category,
    rule.severity,
    unit.unit_id AS subject_id,
    unit.level AS subject_level,
    unit.name AS subject_name,
        CASE
            WHEN (semantic.has_public_api OR semantic.has_command_query_rail) THEN 'pass'::text
            ELSE 'fail'::text
        END AS evaluation_state,
        CASE
            WHEN (semantic.has_public_api OR semantic.has_command_query_rail) THEN NULL::text
            ELSE rule.drift_code
        END AS drift_code,
        CASE
            WHEN (semantic.has_public_api OR semantic.has_command_query_rail) THEN 'publicApi metadata or command/query rail is present.'::text
            ELSE 'publicApi metadata and command/query rail are missing.'::text
        END AS evidence,
    rule.remediation,
    jsonb_build_object('requiredField', 'publicApi', 'cqRails', unit.cq_rails, 'sourceView', 'governance_unit_query.raw_units') AS metadata
   FROM ((semantic_component_units unit
     JOIN component_semantics semantic ON ((semantic.unit_id = unit.unit_id)))
     JOIN planning_query_store.component_engineering_rule_catalog_query rule ON ((rule.rule_id = 'CEI-API-001'::text)))
UNION ALL
 SELECT rule.rule_id,
    rule.name AS rule_name,
    rule.category,
    rule.severity,
    unit.unit_id AS subject_id,
    unit.level AS subject_level,
    unit.name AS subject_name,
        CASE
            WHEN (EXISTS ( SELECT 1
               FROM planning_query_store.governance_unit_query child
              WHERE (child.parent_id = unit.unit_id))) THEN 'pass'::text
            ELSE 'fail'::text
        END AS evaluation_state,
        CASE
            WHEN (EXISTS ( SELECT 1
               FROM planning_query_store.governance_unit_query child
              WHERE (child.parent_id = unit.unit_id))) THEN NULL::text
            ELSE rule.drift_code
        END AS drift_code,
        CASE
            WHEN (EXISTS ( SELECT 1
               FROM planning_query_store.governance_unit_query child
              WHERE (child.parent_id = unit.unit_id))) THEN 'Unit that requires children has at least one governed child.'::text
            ELSE 'Unit requires children but has no governed child.'::text
        END AS evidence,
    rule.remediation,
    jsonb_build_object('childrenRequired', unit.children_required, 'sourceView', 'governance_unit_query') AS metadata
   FROM (planning_query_store.governance_unit_query unit
     JOIN planning_query_store.component_engineering_rule_catalog_query rule ON ((rule.rule_id = 'CEI-SIZE-005'::text)))
  WHERE (unit.children_required = true)
UNION ALL
 SELECT rule.rule_id,
    rule.name AS rule_name,
    rule.category,
    rule.severity,
    COALESCE(file_owner.leaf_component_id, file_owner.owning_unit, file_owner.file_path) AS subject_id,
    'file'::text AS subject_level,
    file_owner.file_path AS subject_name,
        CASE
            WHEN ((file_owner.leaf_component_id IS NOT NULL) AND (file_owner.is_leaf_component IS TRUE)) THEN 'pass'::text
            ELSE 'fail'::text
        END AS evaluation_state,
        CASE
            WHEN ((file_owner.leaf_component_id IS NOT NULL) AND (file_owner.is_leaf_component IS TRUE)) THEN NULL::text
            ELSE rule.drift_code
        END AS drift_code,
        CASE
            WHEN ((file_owner.leaf_component_id IS NOT NULL) AND (file_owner.is_leaf_component IS TRUE)) THEN 'File resolves to a leaf component.'::text
            ELSE 'File does not resolve to a leaf component.'::text
        END AS evidence,
    rule.remediation,
    jsonb_build_object('filePath', file_owner.file_path, 'leafComponentId', file_owner.leaf_component_id, 'owningUnit', file_owner.owning_unit, 'fileRole', file_owner.file_role, 'sourceView', 'component_engineering_file_ownership_query') AS metadata
   FROM (planning_query_store.component_engineering_file_ownership_query file_owner
     JOIN planning_query_store.component_engineering_rule_catalog_query rule ON ((rule.rule_id = 'CEI-SRC-004'::text)));


--
-- Name: component_engineering_rule_evaluation_projection; Type: MATERIALIZED VIEW; Schema: planning_query_store; Owner: -
--

CREATE MATERIALIZED VIEW planning_query_store.component_engineering_rule_evaluation_projection AS
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
   FROM planning_query_store.component_engineering_rule_evaluation_query
  WITH NO DATA;


--
-- Name: component_engineering_drift_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.component_engineering_drift_query AS
 SELECT subject_id AS component_id,
    drift_code,
    metadata
   FROM planning_query_store.component_engineering_rule_evaluation_projection evaluation
  WHERE ((evaluation_state = 'fail'::text) AND (drift_code IS NOT NULL));
