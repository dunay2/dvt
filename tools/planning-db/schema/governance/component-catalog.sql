--
-- Name: governance_component_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.governance_component_query AS
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
    source_content_sha256,
    unit_path,
    owns,
    excludes,
    governance_refs,
    fowler_signals,
    raw_component
   FROM planning_query_store.governance_components;


--
-- Name: governance_component_reparent_override_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.governance_component_reparent_override_query AS
 SELECT component_id,
    parent_id,
    root_unit,
    domain_unit,
    unit_path,
    raw_component,
    source_path,
    source_content_sha256,
    revision,
    updated_by,
    updated_at
   FROM planning_query_store.governance_component_reparent_overrides;
