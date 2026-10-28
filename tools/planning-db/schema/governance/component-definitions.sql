--
-- Name: governance_component_local_metadata_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.governance_component_local_metadata_query AS
 WITH local_ownership AS (
         SELECT pattern.component_id,
            COALESCE(jsonb_agg(pattern.pattern ORDER BY pattern.pattern_order, pattern.pattern) FILTER (WHERE (pattern.pattern_kind = 'owns'::text)), '[]'::jsonb) AS owns,
            COALESCE(jsonb_agg(pattern.pattern ORDER BY pattern.pattern_order, pattern.pattern) FILTER (WHERE (pattern.pattern_kind = 'excludes'::text)), '[]'::jsonb) AS excludes
           FROM planning_query_store.governance_component_local_ownership_patterns pattern
          GROUP BY pattern.component_id
        ), local_semantic_items AS (
         SELECT item.component_id,
            COALESCE(jsonb_agg(item.item_value ORDER BY item.item_order, item.item_value) FILTER (WHERE (item.item_kind = 'responsibility'::text)), '[]'::jsonb) AS responsibilities,
            COALESCE(jsonb_agg(item.item_value ORDER BY item.item_order, item.item_value) FILTER (WHERE (item.item_kind = 'non_goal'::text)), '[]'::jsonb) AS non_goals,
            COALESCE(jsonb_agg(item.item_value ORDER BY item.item_order, item.item_value) FILTER (WHERE (item.item_kind = 'reason_to_change'::text)), '[]'::jsonb) AS reasons_to_change,
            COALESCE(jsonb_agg(item.item_value ORDER BY item.item_order, item.item_value) FILTER (WHERE (item.item_kind = 'public_api'::text)), '[]'::jsonb) AS public_api,
            COALESCE(jsonb_agg(item.item_value ORDER BY item.item_order, item.item_value) FILTER (WHERE (item.item_kind = 'invariant'::text)), '[]'::jsonb) AS invariants,
            COALESCE(jsonb_agg(item.item_value ORDER BY item.item_order, item.item_value) FILTER (WHERE (item.item_kind = 'transition'::text)), '[]'::jsonb) AS transitions,
            COALESCE(jsonb_agg(item.item_value ORDER BY item.item_order, item.item_value) FILTER (WHERE (item.item_kind = 'consumer'::text)), '[]'::jsonb) AS consumers,
            COALESCE(jsonb_agg(item.item_value ORDER BY item.item_order, item.item_value) FILTER (WHERE (item.item_kind = 'governance_ref'::text)), '[]'::jsonb) AS governance_refs,
            COALESCE(jsonb_agg(item.item_value ORDER BY item.item_order, item.item_value) FILTER (WHERE (item.item_kind = 'fowler_signal'::text)), '[]'::jsonb) AS fowler_signals
           FROM planning_query_store.governance_component_local_semantic_items item
          GROUP BY item.component_id
        ), local_fields AS (
         SELECT definition.component_id,
            definition.source_path,
            definition.source_content_sha256,
            definition.revision,
            definition.name,
            definition.level,
            definition.parent_id,
            definition.root_unit,
            definition.domain_unit,
            definition.status,
            definition.children_required,
            0 AS file_count,
            COALESCE(local_ownership.owns, '[]'::jsonb) AS owns,
            COALESCE(local_ownership.excludes, '[]'::jsonb) AS excludes,
            definition.owned_concern,
            COALESCE(local_semantic_items.responsibilities, '[]'::jsonb) AS responsibilities,
            COALESCE(local_semantic_items.non_goals, '[]'::jsonb) AS non_goals,
            COALESCE(local_semantic_items.reasons_to_change, '[]'::jsonb) AS reasons_to_change,
            definition.ddd_owner,
            definition.cq_rails,
            COALESCE(local_semantic_items.public_api, '[]'::jsonb) AS public_api,
            COALESCE(local_semantic_items.invariants, '[]'::jsonb) AS invariants,
            COALESCE(local_semantic_items.transitions, '[]'::jsonb) AS transitions,
            COALESCE(local_semantic_items.consumers, '[]'::jsonb) AS consumers,
            COALESCE(local_semantic_items.governance_refs, '[]'::jsonb) AS governance_refs,
            COALESCE(local_semantic_items.fowler_signals, '[]'::jsonb) AS fowler_signals,
            definition.created_by,
            definition.created_at
           FROM ((planning_query_store.governance_component_local_definitions definition
             LEFT JOIN local_ownership ON ((local_ownership.component_id = definition.component_id)))
             LEFT JOIN local_semantic_items ON ((local_semantic_items.component_id = definition.component_id)))
        )
 SELECT component_id,
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
    jsonb_build_object('id', component_id, 'name', name, 'level', level, 'parent', parent_id, 'status', status, 'childrenRequired', children_required, 'dddOwner', ddd_owner, 'cqRails', cq_rails, 'ownedConcern', owned_concern, 'owns', owns, 'excludes', excludes, 'responsibilities', responsibilities, 'nonGoals', non_goals, 'reasonsToChange', reasons_to_change, 'publicApi', public_api, 'invariants', invariants, 'transitions', transitions, 'consumers', consumers, 'governance', governance_refs, 'fowlerSignals', fowler_signals) AS raw_unit
   FROM local_fields fields;


--
-- Name: governance_component_definition_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.governance_component_definition_query AS
 WITH imported_components AS (
         SELECT component.component_id,
                CASE
                    WHEN (local_metadata.component_id IS NOT NULL) THEN 'local_import_override'::text
                    ELSE 'imported'::text
                END AS definition_source,
            COALESCE(local_metadata.source_path, component.source_path) AS source_path,
            COALESCE(local_metadata.source_content_sha256, component.source_content_sha256) AS source_content_sha256,
            COALESCE(local_metadata.revision, 0) AS revision,
            COALESCE(local_metadata.name, component.name) AS name,
            COALESCE(local_metadata.level, component.level) AS level,
            COALESCE(local_metadata.parent_id, component.parent_id) AS parent_id,
            COALESCE(local_metadata.root_unit, component.root_unit) AS root_unit,
            COALESCE(local_metadata.domain_unit, component.domain_unit) AS domain_unit,
            COALESCE(local_metadata.status, component.status) AS status,
            COALESCE(local_metadata.children_required, component.children_required) AS children_required,
            GREATEST(component.file_count, COALESCE(local_metadata.file_count, 0)) AS file_count,
            COALESCE(local_metadata.owns, component.owns) AS owns,
            COALESCE(local_metadata.excludes, component.excludes) AS excludes,
            COALESCE(local_metadata.owned_concern, NULLIF((component.raw_component ->> 'ownedConcern'::text), ''::text)) AS owned_concern,
            COALESCE(local_metadata.responsibilities, COALESCE((component.raw_component -> 'responsibilities'::text), '[]'::jsonb)) AS responsibilities,
            COALESCE(local_metadata.non_goals, COALESCE((component.raw_component -> 'nonGoals'::text), '[]'::jsonb)) AS non_goals,
            COALESCE(local_metadata.reasons_to_change, COALESCE((component.raw_component -> 'reasonsToChange'::text), '[]'::jsonb)) AS reasons_to_change,
            COALESCE(local_metadata.ddd_owner, component.ddd_owner) AS ddd_owner,
            COALESCE(local_metadata.cq_rails, component.cq_rails) AS cq_rails,
            COALESCE(local_metadata.public_api, COALESCE((component.raw_component -> 'publicApi'::text), '[]'::jsonb)) AS public_api,
            COALESCE(local_metadata.invariants, COALESCE((component.raw_component -> 'invariants'::text), '[]'::jsonb)) AS invariants,
            COALESCE(local_metadata.transitions, COALESCE((component.raw_component -> 'transitions'::text), '[]'::jsonb)) AS transitions,
            COALESCE(local_metadata.consumers, COALESCE((component.raw_component -> 'consumers'::text), '[]'::jsonb)) AS consumers,
            COALESCE(local_metadata.governance_refs, component.governance_refs) AS governance_refs,
            COALESCE(local_metadata.fowler_signals, component.fowler_signals) AS fowler_signals,
            local_metadata.created_by,
            local_metadata.created_at,
            COALESCE(local_metadata.raw_unit, ( SELECT unit_ref.value
                   FROM jsonb_array_elements(COALESCE((component.raw_component -> 'unitReferences'::text), '[]'::jsonb)) unit_ref(value)
                  WHERE ((unit_ref.value ->> 'id'::text) = component.component_id)
                 LIMIT 1), component.raw_component) AS raw_unit
           FROM (planning_query_store.governance_components component
             LEFT JOIN planning_query_store.governance_component_local_metadata_query local_metadata ON ((local_metadata.component_id = component.component_id)))
        ), local_components AS (
         SELECT local_metadata.component_id,
            'local_command'::text AS definition_source,
            local_metadata.source_path,
            local_metadata.source_content_sha256,
            local_metadata.revision,
            local_metadata.name,
            local_metadata.level,
            local_metadata.parent_id,
            local_metadata.root_unit,
            local_metadata.domain_unit,
            local_metadata.status,
            local_metadata.children_required,
            local_metadata.file_count,
            local_metadata.owns,
            local_metadata.excludes,
            local_metadata.owned_concern,
            local_metadata.responsibilities,
            local_metadata.non_goals,
            local_metadata.reasons_to_change,
            local_metadata.ddd_owner,
            local_metadata.cq_rails,
            local_metadata.public_api,
            local_metadata.invariants,
            local_metadata.transitions,
            local_metadata.consumers,
            local_metadata.governance_refs,
            local_metadata.fowler_signals,
            local_metadata.created_by,
            local_metadata.created_at,
            local_metadata.raw_unit
           FROM planning_query_store.governance_component_local_metadata_query local_metadata
          WHERE (NOT (EXISTS ( SELECT 1
                   FROM planning_query_store.governance_components imported
                  WHERE (imported.component_id = local_metadata.component_id))))
        )
 SELECT imported_components.component_id,
    imported_components.definition_source,
    imported_components.source_path,
    imported_components.source_content_sha256,
    imported_components.revision,
    imported_components.name,
    imported_components.level,
    imported_components.parent_id,
    imported_components.root_unit,
    imported_components.domain_unit,
    imported_components.status,
    imported_components.children_required,
    imported_components.file_count,
    imported_components.owns,
    imported_components.excludes,
    imported_components.owned_concern,
    imported_components.responsibilities,
    imported_components.non_goals,
    imported_components.reasons_to_change,
    imported_components.ddd_owner,
    imported_components.cq_rails,
    imported_components.public_api,
    imported_components.invariants,
    imported_components.transitions,
    imported_components.consumers,
    imported_components.governance_refs,
    imported_components.fowler_signals,
    imported_components.created_by,
    imported_components.created_at,
    imported_components.raw_unit
   FROM imported_components
UNION ALL
 SELECT local_components.component_id,
    local_components.definition_source,
    local_components.source_path,
    local_components.source_content_sha256,
    local_components.revision,
    local_components.name,
    local_components.level,
    local_components.parent_id,
    local_components.root_unit,
    local_components.domain_unit,
    local_components.status,
    local_components.children_required,
    local_components.file_count,
    local_components.owns,
    local_components.excludes,
    local_components.owned_concern,
    local_components.responsibilities,
    local_components.non_goals,
    local_components.reasons_to_change,
    local_components.ddd_owner,
    local_components.cq_rails,
    local_components.public_api,
    local_components.invariants,
    local_components.transitions,
    local_components.consumers,
    local_components.governance_refs,
    local_components.fowler_signals,
    local_components.created_by,
    local_components.created_at,
    local_components.raw_unit
   FROM local_components;
