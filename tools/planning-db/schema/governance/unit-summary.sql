--
-- Name: governance_unit_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.governance_unit_query AS
 WITH RECURSIVE local_metadata AS (
         SELECT governance_component_local_metadata_query.component_id,
            governance_component_local_metadata_query.source_path,
            governance_component_local_metadata_query.source_content_sha256,
            governance_component_local_metadata_query.revision,
            governance_component_local_metadata_query.name,
            governance_component_local_metadata_query.level,
            governance_component_local_metadata_query.parent_id,
            governance_component_local_metadata_query.root_unit,
            governance_component_local_metadata_query.domain_unit,
            governance_component_local_metadata_query.status,
            governance_component_local_metadata_query.children_required,
            governance_component_local_metadata_query.file_count,
            governance_component_local_metadata_query.owns,
            governance_component_local_metadata_query.excludes,
            governance_component_local_metadata_query.owned_concern,
            governance_component_local_metadata_query.responsibilities,
            governance_component_local_metadata_query.non_goals,
            governance_component_local_metadata_query.reasons_to_change,
            governance_component_local_metadata_query.ddd_owner,
            governance_component_local_metadata_query.cq_rails,
            governance_component_local_metadata_query.public_api,
            governance_component_local_metadata_query.invariants,
            governance_component_local_metadata_query.transitions,
            governance_component_local_metadata_query.consumers,
            governance_component_local_metadata_query.governance_refs,
            governance_component_local_metadata_query.fowler_signals,
            governance_component_local_metadata_query.created_by,
            governance_component_local_metadata_query.created_at,
            governance_component_local_metadata_query.raw_unit
           FROM planning_query_store.governance_component_local_metadata_query
        ), base_component_unit_refs AS (
         SELECT component_1.component_id AS descendant_component_id,
            component_1.file_count AS descendant_file_count,
            COALESCE(local_unit.root_unit, component_1.root_unit) AS root_unit,
            COALESCE(local_unit.domain_unit, component_1.domain_unit) AS domain_unit,
            COALESCE(local_unit.source_path, component_1.source_path) AS source_path,
            COALESCE(local_unit.source_content_sha256, component_1.source_content_sha256) AS source_content_sha256,
            COALESCE(local_unit.raw_unit, ref.value) AS raw_unit,
            (ref.value ->> 'id'::text) AS unit_id,
            COALESCE(local_unit.name, (ref.value ->> 'name'::text)) AS name,
            COALESCE(local_unit.level, (ref.value ->> 'level'::text)) AS level,
            COALESCE(local_unit.status, (ref.value ->> 'status'::text)) AS status,
            unit_position.unit_order,
            COALESCE(local_unit.parent_id, parent_unit.parent_id) AS parent_id
           FROM ((((planning_query_store.governance_components component_1
             CROSS JOIN LATERAL jsonb_array_elements(COALESCE((component_1.raw_component -> 'unitReferences'::text), '[]'::jsonb)) ref(value))
             LEFT JOIN local_metadata local_unit ON ((local_unit.component_id = (ref.value ->> 'id'::text))))
             LEFT JOIN LATERAL ( SELECT (unit_path.ordinality)::integer AS unit_order
                   FROM jsonb_array_elements_text(component_1.unit_path) WITH ORDINALITY unit_path(value, ordinality)
                  WHERE (unit_path.value = (ref.value ->> 'id'::text))
                  ORDER BY unit_path.ordinality
                 LIMIT 1) unit_position ON (true))
             LEFT JOIN LATERAL ( SELECT unit_path.value AS parent_id
                   FROM jsonb_array_elements_text(component_1.unit_path) WITH ORDINALITY unit_path(value, ordinality)
                  WHERE ((unit_position.unit_order IS NOT NULL) AND (unit_path.ordinality = (unit_position.unit_order - 1)))
                 LIMIT 1) parent_unit ON (true))
          WHERE (ref.value ? 'id'::text)
        ), base_unit_rollup AS (
         SELECT base_component_unit_refs.unit_id,
            (array_agg(DISTINCT base_component_unit_refs.name ORDER BY base_component_unit_refs.name))[1] AS name,
            (array_agg(DISTINCT base_component_unit_refs.level ORDER BY base_component_unit_refs.level))[1] AS level,
            (array_agg(DISTINCT base_component_unit_refs.parent_id ORDER BY base_component_unit_refs.parent_id) FILTER (WHERE (base_component_unit_refs.parent_id IS NOT NULL)))[1] AS parent_id,
            (array_agg(DISTINCT base_component_unit_refs.root_unit ORDER BY base_component_unit_refs.root_unit))[1] AS root_unit,
            (array_agg(DISTINCT base_component_unit_refs.domain_unit ORDER BY base_component_unit_refs.domain_unit))[1] AS domain_unit,
            (array_agg(DISTINCT base_component_unit_refs.status ORDER BY base_component_unit_refs.status))[1] AS status,
            COALESCE(jsonb_agg(DISTINCT base_component_unit_refs.raw_unit), '[]'::jsonb) AS raw_units
           FROM base_component_unit_refs
          GROUP BY base_component_unit_refs.unit_id
        ), local_units AS (
         SELECT local_unit.component_id AS unit_id,
            local_unit.name,
            local_unit.level,
            local_unit.parent_id,
            local_unit.root_unit,
            local_unit.domain_unit,
            local_unit.status,
            local_unit.source_path,
            local_unit.source_content_sha256,
            local_unit.raw_unit
           FROM local_metadata local_unit
          WHERE (NOT (EXISTS ( SELECT 1
                   FROM base_unit_rollup base_unit
                  WHERE (base_unit.unit_id = local_unit.component_id))))
        ), parent_lookup AS (
         SELECT base_unit_rollup.unit_id,
            base_unit_rollup.name,
            base_unit_rollup.level,
            base_unit_rollup.parent_id,
            base_unit_rollup.root_unit,
            base_unit_rollup.domain_unit,
            base_unit_rollup.status,
            (base_unit_rollup.raw_units -> 0) AS raw_unit
           FROM base_unit_rollup
        UNION ALL
         SELECT local_units.unit_id,
            local_units.name,
            local_units.level,
            local_units.parent_id,
            local_units.root_unit,
            local_units.domain_unit,
            local_units.status,
            local_units.raw_unit
           FROM local_units
        ), local_component_unit_refs(descendant_component_id, descendant_file_count, root_unit, domain_unit, source_path, source_content_sha256, raw_unit, unit_id, name, level, status, unit_order, parent_id, visited) AS (
         SELECT local_unit.unit_id AS descendant_component_id,
            0 AS descendant_file_count,
            local_unit.root_unit,
            local_unit.domain_unit,
            local_unit.source_path,
            local_unit.source_content_sha256,
            local_unit.raw_unit,
            local_unit.unit_id,
            local_unit.name,
            local_unit.level,
            local_unit.status,
            1000000 AS unit_order,
            local_unit.parent_id,
            ARRAY[local_unit.unit_id] AS visited
           FROM local_units local_unit
        UNION ALL
         SELECT child.descendant_component_id,
            0 AS descendant_file_count,
            child.root_unit,
            child.domain_unit,
            child.source_path,
            child.source_content_sha256,
            parent.raw_unit,
            parent.unit_id,
            parent.name,
            parent.level,
            parent.status,
            (child.unit_order - 1),
            parent.parent_id,
            (child.visited || parent.unit_id)
           FROM (local_component_unit_refs child
             JOIN parent_lookup parent ON ((parent.unit_id = child.parent_id)))
          WHERE (NOT (parent.unit_id = ANY (child.visited)))
        ), component_unit_refs AS (
         SELECT base_component_unit_refs.descendant_component_id,
            base_component_unit_refs.descendant_file_count,
            base_component_unit_refs.root_unit,
            base_component_unit_refs.domain_unit,
            base_component_unit_refs.source_path,
            base_component_unit_refs.source_content_sha256,
            base_component_unit_refs.raw_unit,
            base_component_unit_refs.unit_id,
            base_component_unit_refs.name,
            base_component_unit_refs.level,
            base_component_unit_refs.status,
            base_component_unit_refs.unit_order,
            base_component_unit_refs.parent_id
           FROM base_component_unit_refs
        UNION ALL
         SELECT local_component_unit_refs.descendant_component_id,
            local_component_unit_refs.descendant_file_count,
            local_component_unit_refs.root_unit,
            local_component_unit_refs.domain_unit,
            local_component_unit_refs.source_path,
            local_component_unit_refs.source_content_sha256,
            local_component_unit_refs.raw_unit,
            local_component_unit_refs.unit_id,
            local_component_unit_refs.name,
            local_component_unit_refs.level,
            local_component_unit_refs.status,
            local_component_unit_refs.unit_order,
            local_component_unit_refs.parent_id
           FROM local_component_unit_refs
        ), unit_rollup AS (
         SELECT component_unit_refs.unit_id,
            (array_agg(DISTINCT component_unit_refs.name ORDER BY component_unit_refs.name))[1] AS name,
            (array_agg(DISTINCT component_unit_refs.level ORDER BY component_unit_refs.level))[1] AS level,
            (array_agg(DISTINCT component_unit_refs.parent_id ORDER BY component_unit_refs.parent_id) FILTER (WHERE (component_unit_refs.parent_id IS NOT NULL)))[1] AS parent_id,
            (array_agg(DISTINCT component_unit_refs.root_unit ORDER BY component_unit_refs.root_unit))[1] AS root_unit,
            (array_agg(DISTINCT component_unit_refs.domain_unit ORDER BY component_unit_refs.domain_unit))[1] AS domain_unit,
            (array_agg(DISTINCT component_unit_refs.status ORDER BY component_unit_refs.status))[1] AS status,
            (count(DISTINCT component_unit_refs.descendant_component_id))::integer AS descendant_component_count,
            (COALESCE(sum(component_unit_refs.descendant_file_count), (0)::bigint))::integer AS descendant_file_count,
            COALESCE(jsonb_agg(DISTINCT component_unit_refs.source_path ORDER BY component_unit_refs.source_path), '[]'::jsonb) AS source_paths,
            COALESCE(jsonb_agg(DISTINCT component_unit_refs.source_content_sha256 ORDER BY component_unit_refs.source_content_sha256), '[]'::jsonb) AS source_content_sha256_values,
            COALESCE(jsonb_agg(DISTINCT component_unit_refs.raw_unit), '[]'::jsonb) AS raw_units
           FROM component_unit_refs
          GROUP BY component_unit_refs.unit_id
        ), direct_components AS (
         SELECT component_1.component_id,
            COALESCE(local_unit.status, component_1.status) AS status,
            COALESCE(
                CASE
                    WHEN (local_unit.status = 'canonical'::text) THEN 'governed'::text
                    WHEN (local_unit.status IS NOT NULL) THEN local_unit.status
                    ELSE NULL::text
                END, component_1.governance_state) AS governance_state,
            COALESCE(
                CASE
                    WHEN (local_unit.status = 'canonical'::text) THEN 'implementation-owner'::text
                    WHEN (local_unit.status IS NOT NULL) THEN 'none'::text
                    ELSE NULL::text
                END, component_1.canonical_role) AS canonical_role,
            COALESCE(
                CASE
                    WHEN (local_unit.status = 'canonical'::text) THEN 'classification-only'::text
                    WHEN (local_unit.status = 'coverage-required'::text) THEN 'coverage-required'::text
                    WHEN (local_unit.status = ANY (ARRAY['drift'::text, 'legacy'::text])) THEN 'remediation-required'::text
                    WHEN (local_unit.status = 'review'::text) THEN 'review-required'::text
                    WHEN (local_unit.status = 'superseded'::text) THEN 'retired'::text
                    ELSE NULL::text
                END, component_1.evidence_state) AS evidence_state,
            COALESCE((local_unit.status = 'drift'::text), component_1.is_drift) AS is_drift,
            COALESCE((local_unit.status = 'legacy'::text), component_1.is_legacy) AS is_legacy,
            COALESCE(local_unit.children_required, component_1.children_required) AS children_required,
            component_1.file_count,
            COALESCE(local_unit.ddd_owner, component_1.ddd_owner) AS ddd_owner,
            COALESCE(local_unit.cq_rails, component_1.cq_rails) AS cq_rails,
            COALESCE(local_unit.source_path, component_1.source_path) AS source_path,
            COALESCE(local_unit.source_content_sha256, component_1.source_content_sha256) AS source_content_sha256
           FROM (planning_query_store.governance_components component_1
             LEFT JOIN local_metadata local_unit ON ((local_unit.component_id = component_1.component_id)))
        UNION ALL
         SELECT local_unit.component_id,
            local_unit.status,
                CASE
                    WHEN (local_unit.status = 'canonical'::text) THEN 'governed'::text
                    ELSE local_unit.status
                END AS governance_state,
                CASE
                    WHEN (local_unit.status = 'canonical'::text) THEN 'implementation-owner'::text
                    ELSE 'none'::text
                END AS canonical_role,
                CASE
                    WHEN (local_unit.status = 'canonical'::text) THEN 'classification-only'::text
                    WHEN (local_unit.status = 'coverage-required'::text) THEN 'coverage-required'::text
                    WHEN (local_unit.status = ANY (ARRAY['drift'::text, 'legacy'::text])) THEN 'remediation-required'::text
                    WHEN (local_unit.status = 'review'::text) THEN 'review-required'::text
                    WHEN (local_unit.status = 'superseded'::text) THEN 'retired'::text
                    ELSE 'remediation-required'::text
                END AS evidence_state,
            (local_unit.status = 'drift'::text) AS is_drift,
            (local_unit.status = 'legacy'::text) AS is_legacy,
            local_unit.children_required,
            local_unit.file_count,
            local_unit.ddd_owner,
            local_unit.cq_rails,
            local_unit.source_path,
            local_unit.source_content_sha256
           FROM local_metadata local_unit
          WHERE (NOT (EXISTS ( SELECT 1
                   FROM planning_query_store.governance_components imported
                  WHERE (imported.component_id = local_unit.component_id))))
        )
 SELECT unit.unit_id,
    unit.name,
    unit.level,
    unit.parent_id,
    unit.root_unit,
    unit.domain_unit,
    COALESCE(component.status, unit.status) AS status,
    COALESCE(component.governance_state, unit.status) AS governance_state,
    COALESCE(component.canonical_role, 'none'::text) AS canonical_role,
    COALESCE(component.evidence_state,
        CASE
            WHEN (unit.status = 'review'::text) THEN 'review-required'::text
            ELSE unit.status
        END) AS evidence_state,
    COALESCE(component.is_drift, false) AS is_drift,
    COALESCE(component.is_legacy, false) AS is_legacy,
    COALESCE(component.children_required, false) AS children_required,
    COALESCE(component.file_count, 0) AS direct_file_count,
    unit.descendant_component_count,
    unit.descendant_file_count,
    component.ddd_owner,
    component.cq_rails,
    (component.component_id IS NOT NULL) AS is_materialized_component,
    component.source_path AS direct_source_path,
    component.source_content_sha256 AS direct_source_content_sha256,
    unit.source_paths,
    unit.source_content_sha256_values,
    unit.raw_units
   FROM (unit_rollup unit
     LEFT JOIN direct_components component ON ((component.component_id = unit.unit_id)));
