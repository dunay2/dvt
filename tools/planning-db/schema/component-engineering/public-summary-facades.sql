--
-- Name: component_roadmap_query; Type: VIEW; Schema: component_engineering; Owner: -
--

CREATE VIEW component_engineering.component_roadmap_query AS
 SELECT component_key,
    component_id,
    component_ref,
    component_name,
    implementation_state,
    planning_state,
    gap_kind,
    is_gap,
    architecture_status,
    engineering_quality_state,
    planned_feature_count,
    implemented_feature_count,
    source_path,
    source_content_sha256
   FROM planning_query_store.component_roadmap_query;


--
-- Name: documentation_panel_query; Type: VIEW; Schema: component_engineering; Owner: -
--

CREATE VIEW component_engineering.documentation_panel_query AS
 SELECT panel_id,
    panel_surface,
    panel_order,
    entity_kind,
    entity_id,
    entity_label,
    component_id,
    source_path,
    section_kind,
    section_order,
    field_key,
    field_value,
    value_kind,
    field_order,
    panel_state,
    gap_kind,
    is_gap,
    source_content_sha256
   FROM planning_query_store.documentation_panel_query;
