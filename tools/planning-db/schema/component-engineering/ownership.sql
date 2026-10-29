--
-- Name: component_engineering_component_tree_projection; Type: MATERIALIZED VIEW; Schema: planning_query_store; Owner: -
--

CREATE MATERIALIZED VIEW planning_query_store.component_engineering_component_tree_projection AS
 SELECT unit_id AS component_id,
    name,
    level AS component_level,
    parent_id AS parent_component_id,
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
    (EXISTS ( SELECT 1
           FROM planning_query_store.governance_unit_query child
          WHERE ((child.parent_id = unit.unit_id) AND (child.level = 'component'::text)))) AS has_children,
    (NOT (EXISTS ( SELECT 1
           FROM planning_query_store.governance_unit_query child
          WHERE ((child.parent_id = unit.unit_id) AND (child.level = 'component'::text))))) AS is_leaf_component,
    raw_units
   FROM planning_query_store.governance_unit_query unit
  WHERE (level = 'component'::text)
  WITH NO DATA;


--
-- Name: component_engineering_component_tree_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.component_engineering_component_tree_query AS
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
-- Name: component_engineering_file_ownership_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.component_engineering_file_ownership_query AS
 WITH RECURSIVE base_files AS (
         SELECT governance_file.path AS file_path,
            governance_file.component_unit AS imported_component_id,
            governance_file.owning_unit AS imported_owning_unit,
            governance_file.root_unit AS imported_root_unit,
            governance_file.domain_unit AS imported_domain_unit,
            governance_file.owner_level AS imported_owner_level,
            governance_file.governance_state AS imported_governance_state,
            governance_file.canonical_role AS imported_canonical_role,
            governance_file.evidence_state AS imported_evidence_state,
            governance_file.is_drift AS imported_is_drift,
            governance_file.is_legacy AS imported_is_legacy,
            governance_file.ddd_owner AS imported_ddd_owner,
            governance_file.cq_rails AS imported_cq_rails,
            governance_file.source_path AS imported_source_path,
            governance_file.source_content_sha256 AS imported_source_content_sha256
           FROM planning_query_store.governance_file_query governance_file
        ), active_local_components AS (
         SELECT local_metadata.component_id,
            local_metadata.level,
            local_metadata.root_unit,
            local_metadata.domain_unit,
            local_metadata.status,
            local_metadata.ddd_owner,
            local_metadata.cq_rails,
            local_metadata.source_path,
            local_metadata.source_content_sha256
           FROM planning_query_store.governance_component_local_metadata_query local_metadata
          WHERE (local_metadata.status <> 'superseded'::text)
        ), component_depth(unit_id, parent_id, depth, visited) AS (
         SELECT unit.unit_id,
            unit.parent_id,
            0 AS depth,
            ARRAY[unit.unit_id] AS visited
           FROM planning_query_store.governance_unit_query unit
          WHERE (unit.parent_id IS NULL)
        UNION ALL
         SELECT child.unit_id,
            child.parent_id,
            (parent.depth + 1),
            (parent.visited || child.unit_id)
           FROM (planning_query_store.governance_unit_query child
             JOIN component_depth parent ON ((parent.unit_id = child.parent_id)))
          WHERE (NOT (child.unit_id = ANY (parent.visited)))
        ), component_depth_rollup AS (
         SELECT component_depth.unit_id,
            max(component_depth.depth) AS depth
           FROM component_depth
          GROUP BY component_depth.unit_id
        ), local_file_claims AS (
         SELECT matched_file.file_path,
            matched_file.component_id,
            matched_file.level,
            matched_file.root_unit,
            matched_file.domain_unit,
            matched_file.status,
            matched_file.ddd_owner,
            matched_file.cq_rails,
            matched_file.source_path,
            matched_file.source_content_sha256,
            row_number() OVER (PARTITION BY matched_file.file_path ORDER BY matched_file.claim_depth DESC, matched_file.is_leaf_component DESC, matched_file.exact_match DESC, (length(matched_file.own_pattern)) DESC, matched_file.component_id) AS claim_rank
           FROM ( SELECT base_file_1.file_path,
                    local_component.component_id,
                    local_component.level,
                    local_component.root_unit,
                    local_component.domain_unit,
                    local_component.status,
                    local_component.ddd_owner,
                    local_component.cq_rails,
                    local_component.source_path,
                    local_component.source_content_sha256,
                    own_pattern.pattern AS own_pattern,
                    (base_file_1.file_path = own_pattern.pattern) AS exact_match,
                    COALESCE(component_depth_rollup.depth, 0) AS claim_depth,
                    COALESCE(claim_tree.is_leaf_component, false) AS is_leaf_component
                   FROM ((((base_files base_file_1
                     JOIN active_local_components local_component ON (true))
                     JOIN planning_query_store.governance_component_local_ownership_patterns own_pattern ON (((own_pattern.component_id = local_component.component_id) AND (own_pattern.pattern_kind = 'owns'::text))))
                     LEFT JOIN component_depth_rollup ON ((component_depth_rollup.unit_id = local_component.component_id)))
                     LEFT JOIN planning_query_store.component_engineering_component_tree_query claim_tree ON ((claim_tree.component_id = local_component.component_id)))
                  WHERE (((base_file_1.file_path = own_pattern.pattern) OR (base_file_1.file_path ~~ replace(replace(own_pattern.pattern, '**'::text, '%'::text), '*'::text, '%'::text))) AND (NOT (EXISTS ( SELECT 1
                           FROM planning_query_store.governance_component_local_ownership_patterns exclude_pattern
                          WHERE ((exclude_pattern.component_id = local_component.component_id) AND (exclude_pattern.pattern_kind = 'excludes'::text) AND ((base_file_1.file_path = exclude_pattern.pattern) OR (base_file_1.file_path ~~ replace(replace(exclude_pattern.pattern, '**'::text, '%'::text), '*'::text, '%'::text))))))))) matched_file
        )
 SELECT base_file.file_path,
    COALESCE(local_claim.component_id, base_file.imported_component_id) AS leaf_component_id,
    COALESCE(local_claim.component_id, base_file.imported_owning_unit) AS owning_unit,
    COALESCE(local_claim.root_unit, base_file.imported_root_unit) AS root_unit,
    COALESCE(local_claim.domain_unit, base_file.imported_domain_unit) AS domain_unit,
    COALESCE(local_claim.level, base_file.imported_owner_level) AS owner_level,
    COALESCE(
        CASE
            WHEN (local_claim.status = 'canonical'::text) THEN 'governed'::text
            ELSE local_claim.status
        END, base_file.imported_governance_state) AS governance_state,
    COALESCE(
        CASE
            WHEN (local_claim.status = 'canonical'::text) THEN 'implementation-owner'::text
            WHEN (local_claim.status IS NOT NULL) THEN 'none'::text
            ELSE NULL::text
        END, base_file.imported_canonical_role) AS canonical_role,
    COALESCE(
        CASE
            WHEN (local_claim.status = 'canonical'::text) THEN 'classification-only'::text
            WHEN (local_claim.status = 'coverage-required'::text) THEN 'coverage-required'::text
            WHEN (local_claim.status = ANY (ARRAY['drift'::text, 'legacy'::text])) THEN 'remediation-required'::text
            WHEN (local_claim.status = 'review'::text) THEN 'review-required'::text
            WHEN (local_claim.status = 'superseded'::text) THEN 'retired'::text
            ELSE NULL::text
        END, base_file.imported_evidence_state) AS evidence_state,
    COALESCE((local_claim.status = 'drift'::text), base_file.imported_is_drift) AS is_drift,
    COALESCE((local_claim.status = 'legacy'::text), base_file.imported_is_legacy) AS is_legacy,
    COALESCE(local_claim.ddd_owner, base_file.imported_ddd_owner) AS ddd_owner,
    COALESCE(local_claim.cq_rails, base_file.imported_cq_rails) AS cq_rails,
        CASE
            WHEN (base_file.file_path ~* '(^|/)(test|tests|__tests__)/|(\.test|\.spec|\.architecture\.test)\.[cm]?[jt]sx?$'::text) THEN 'test'::text
            WHEN (base_file.file_path ~* '(^|/)docs/|\.md$'::text) THEN 'doc'::text
            WHEN (base_file.file_path ~* '(^|/)(fixtures|vectors)/'::text) THEN 'fixture'::text
            WHEN (base_file.file_path ~* '(^|/)\.github/workflows/|(^|/)scripts/|(^|/)tools/'::text) THEN 'governance-tooling'::text
            ELSE 'source'::text
        END AS file_role,
    tree.parent_component_id,
    tree.component_level,
    tree.is_leaf_component,
    COALESCE(local_claim.source_path, base_file.imported_source_path) AS source_path,
    COALESCE(local_claim.source_content_sha256, base_file.imported_source_content_sha256) AS source_content_sha256
   FROM ((base_files base_file
     LEFT JOIN local_file_claims local_claim ON (((local_claim.file_path = base_file.file_path) AND (local_claim.claim_rank = 1))))
     LEFT JOIN planning_query_store.component_engineering_component_tree_query tree ON ((tree.component_id = COALESCE(local_claim.component_id, base_file.imported_component_id))));


--
-- Name: component_engineering_file_ownership_projection; Type: MATERIALIZED VIEW; Schema: planning_query_store; Owner: -
--

CREATE MATERIALIZED VIEW planning_query_store.component_engineering_file_ownership_projection AS
 SELECT file_path,
    leaf_component_id,
    owning_unit,
    root_unit,
    domain_unit,
    owner_level,
    governance_state,
    canonical_role,
    evidence_state,
    is_drift,
    is_legacy,
    ddd_owner,
    cq_rails,
    file_role,
    source_path,
    source_content_sha256
   FROM planning_query_store.component_engineering_file_ownership_query
  WITH NO DATA;
