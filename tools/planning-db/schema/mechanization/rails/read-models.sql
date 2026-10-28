--
-- Name: command_query_rail_manifest_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.command_query_rail_manifest_query AS
 WITH imported_rails AS (
         SELECT command_query_rails.rail_id,
            command_query_rails.feature_id,
            command_query_rails.mechanization_status,
            command_query_rails.rail_name,
            command_query_rails.normalized_rail_name,
            command_query_rails.rail_type,
            command_query_rails.ddd_owner,
            command_query_rails.rail_status,
            command_query_rails.symbol_refs,
            command_query_rails.implementation_refs,
            command_query_rails.documentation_refs,
            command_query_rails.governing_sources,
            command_query_rails.allowed_implementation_surfaces,
            command_query_rails.architecture_guards,
            command_query_rails.completion_gate,
            command_query_rails.source_path,
            COALESCE(source.content_hash, command_query_rails.source_content_sha256) AS source_content_sha256,
            command_query_rails.raw_rail,
            command_query_rails.raw_manifest,
            command_query_rails.imported_at,
            'imported'::text AS rail_source,
            1 AS source_priority
           FROM (planning_query_store.command_query_rails
             LEFT JOIN planning_query_store.governance_file_query source ON ((source.path = command_query_rails.source_path)))
        ), local_rails AS (
         SELECT feature_mechanization_local_rails.rail_id,
            feature_mechanization_local_rails.feature_id,
            feature_mechanization_local_rails.mechanization_status,
            feature_mechanization_local_rails.rail_name,
            feature_mechanization_local_rails.normalized_rail_name,
            feature_mechanization_local_rails.rail_type,
            feature_mechanization_local_rails.ddd_owner,
            feature_mechanization_local_rails.rail_status,
            feature_mechanization_local_rails.symbol_refs,
            feature_mechanization_local_rails.implementation_refs,
            feature_mechanization_local_rails.documentation_refs,
            feature_mechanization_local_rails.governing_sources,
            feature_mechanization_local_rails.allowed_implementation_surfaces,
            feature_mechanization_local_rails.architecture_guards,
            feature_mechanization_local_rails.completion_gate,
            feature_mechanization_local_rails.source_path,
            COALESCE(source.content_hash, feature_mechanization_local_rails.source_content_sha256) AS source_content_sha256,
            feature_mechanization_local_rails.raw_rail,
            feature_mechanization_local_rails.raw_manifest,
            feature_mechanization_local_rails.updated_at AS imported_at,
            'local'::text AS rail_source,
            0 AS source_priority
           FROM (planning_query_store.feature_mechanization_local_rails
             LEFT JOIN planning_query_store.governance_file_query source ON ((source.path = feature_mechanization_local_rails.source_path)))
        ), ranked_rails AS (
         SELECT combined_rails.rail_id,
            combined_rails.feature_id,
            combined_rails.mechanization_status,
            combined_rails.rail_name,
            combined_rails.normalized_rail_name,
            combined_rails.rail_type,
            combined_rails.ddd_owner,
            combined_rails.rail_status,
            combined_rails.symbol_refs,
            combined_rails.implementation_refs,
            combined_rails.documentation_refs,
            combined_rails.governing_sources,
            combined_rails.allowed_implementation_surfaces,
            combined_rails.architecture_guards,
            combined_rails.completion_gate,
            combined_rails.source_path,
            combined_rails.source_content_sha256,
            combined_rails.raw_rail,
            combined_rails.raw_manifest,
            combined_rails.imported_at,
            combined_rails.rail_source,
            combined_rails.source_priority,
            row_number() OVER (PARTITION BY combined_rails.feature_id, combined_rails.rail_type, combined_rails.normalized_rail_name ORDER BY combined_rails.source_priority, combined_rails.imported_at DESC, combined_rails.rail_id) AS source_rank
           FROM ( SELECT imported_rails.rail_id,
                    imported_rails.feature_id,
                    imported_rails.mechanization_status,
                    imported_rails.rail_name,
                    imported_rails.normalized_rail_name,
                    imported_rails.rail_type,
                    imported_rails.ddd_owner,
                    imported_rails.rail_status,
                    imported_rails.symbol_refs,
                    imported_rails.implementation_refs,
                    imported_rails.documentation_refs,
                    imported_rails.governing_sources,
                    imported_rails.allowed_implementation_surfaces,
                    imported_rails.architecture_guards,
                    imported_rails.completion_gate,
                    imported_rails.source_path,
                    imported_rails.source_content_sha256,
                    imported_rails.raw_rail,
                    imported_rails.raw_manifest,
                    imported_rails.imported_at,
                    imported_rails.rail_source,
                    imported_rails.source_priority
                   FROM imported_rails
                UNION ALL
                 SELECT local_rails.rail_id,
                    local_rails.feature_id,
                    local_rails.mechanization_status,
                    local_rails.rail_name,
                    local_rails.normalized_rail_name,
                    local_rails.rail_type,
                    local_rails.ddd_owner,
                    local_rails.rail_status,
                    local_rails.symbol_refs,
                    local_rails.implementation_refs,
                    local_rails.documentation_refs,
                    local_rails.governing_sources,
                    local_rails.allowed_implementation_surfaces,
                    local_rails.architecture_guards,
                    local_rails.completion_gate,
                    local_rails.source_path,
                    local_rails.source_content_sha256,
                    local_rails.raw_rail,
                    local_rails.raw_manifest,
                    local_rails.imported_at,
                    local_rails.rail_source,
                    local_rails.source_priority
                   FROM local_rails) combined_rails
        ), effective_manifest_rails AS (
         SELECT ranked_rails.rail_id,
            ranked_rails.feature_id,
            ranked_rails.mechanization_status,
            ranked_rails.rail_name,
            ranked_rails.normalized_rail_name,
            ranked_rails.rail_type,
            ranked_rails.ddd_owner,
            ranked_rails.rail_status,
            ranked_rails.symbol_refs,
            ranked_rails.implementation_refs,
            ranked_rails.documentation_refs,
            ranked_rails.governing_sources,
            ranked_rails.allowed_implementation_surfaces,
            ranked_rails.architecture_guards,
            ranked_rails.completion_gate,
            ranked_rails.source_path,
            ranked_rails.source_content_sha256,
            ranked_rails.raw_rail,
            ranked_rails.raw_manifest,
            ranked_rails.imported_at,
            ranked_rails.rail_source,
            ranked_rails.source_priority,
            ranked_rails.source_rank
           FROM ranked_rails
          WHERE (ranked_rails.source_rank = 1)
        )
 SELECT rail_id,
    feature_id,
    mechanization_status,
    rail_name,
    normalized_rail_name,
    rail_type,
    ddd_owner,
    rail_status,
    symbol_refs,
    implementation_refs,
    documentation_refs,
    jsonb_array_length(implementation_refs) AS implementation_ref_count,
    jsonb_array_length(documentation_refs) AS documentation_ref_count,
    governing_sources,
    allowed_implementation_surfaces,
    architecture_guards,
    completion_gate,
    ((rail_status ~* '^(missing|planned|unimplemented|not-implemented)'::text) OR (jsonb_array_length(implementation_refs) = 0)) AS is_gap,
    count(*) OVER (PARTITION BY rail_type, normalized_rail_name) AS reference_count,
    count(*) OVER (PARTITION BY rail_type, normalized_rail_name) AS duplicate_count,
    (count(*) OVER (PARTITION BY rail_type, normalized_rail_name) > 1) AS is_duplicate,
    source_path,
    source_content_sha256,
    raw_rail,
    raw_manifest,
    rail_source,
    imported_at,
    (SELECT COALESCE(jsonb_agg(
        CASE WHEN resolution.resolution_key IS NULL THEN guide.value
          ELSE resolution.raw_resolution #>> '{canonicalSource,targetPath}' END
        ORDER BY guide.ordinality), '[]'::jsonb)
      FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(raw_manifest->'componentGuides')='array'
        THEN raw_manifest->'componentGuides' ELSE '[]'::jsonb END) WITH ORDINALITY guide(value, ordinality)
      LEFT JOIN planning_query_store.knowledge_documents original ON original.document_path=guide.value
      LEFT JOIN planning_query_store.doc_resolution_overlays resolution
        ON resolution.resolution_scope='docs_disposition' AND resolution.issue_kind='canonical_document_relocation'
        AND resolution.resolution_status='linked' AND resolution.reference_text IS NULL
        AND resolution.document_path=original.document_path
        AND resolution.source_content_sha256=original.source_content_sha256
        AND resolution.raw_resolution #>> '{canonicalSource,sourceDocumentId}'=original.document_id
        AND resolution.raw_resolution #>> '{canonicalSource,expectedSourceContentSha256}'=original.source_content_sha256
        AND resolution.raw_resolution #>> '{canonicalSource,targetPath}' IS NOT NULL
    ) AS effective_component_guides
   FROM effective_manifest_rails;


--
-- Name: command_query_rail_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.command_query_rail_query AS
 WITH manifest_rails AS (
         SELECT rail_1.rail_id,
            rail_1.feature_id,
            rail_1.mechanization_status,
            rail_1.rail_name,
            rail_1.normalized_rail_name,
            rail_1.rail_type,
            rail_1.ddd_owner,
            rail_1.rail_status,
            rail_1.symbol_refs,
            rail_1.implementation_refs,
            rail_1.documentation_refs,
            rail_1.implementation_ref_count,
            rail_1.documentation_ref_count,
            rail_1.governing_sources,
            rail_1.allowed_implementation_surfaces,
            rail_1.architecture_guards,
            rail_1.completion_gate,
            rail_1.is_gap,
            rail_1.reference_count,
            rail_1.duplicate_count,
            rail_1.is_duplicate,
            rail_1.source_path,
            rail_1.source_content_sha256,
            rail_1.raw_rail,
            rail_1.raw_manifest,
            rail_1.rail_source,
            rail_1.imported_at,
            (rail_1.raw_rail @> '{"referenceOnly": true}'::jsonb) AS is_reference,
            ((((rail_1.rail_type || ':'::text) || rail_1.normalized_rail_name) || ':'::text) || COALESCE(NULLIF(rail_1.ddd_owner, ''::text), '-'::text)) AS canonical_declaration_key,
                CASE
                    WHEN (rail_1.source_path ~~ 'docs/archive/%'::text) THEN 5
                    WHEN (rail_1.rail_source = 'local'::text) THEN 0
                    WHEN (rail_1.feature_id = 'DOCUMENTED-COMMAND-QUERY-RAIL-CATALOG'::text) THEN 1
                    WHEN (rail_1.source_path ~~ 'docs/architecture/components/%command-query-catalog.md'::text) THEN 1
                    WHEN (rail_1.source_path ~~ 'docs/architecture/components/%'::text) THEN 2
                    WHEN (rail_1.mechanization_status = ANY (ARRAY['implemented'::text, 'closed'::text])) THEN 3
                    ELSE 4
                END AS authority_priority
           FROM planning_query_store.command_query_rail_manifest_query rail_1
        ), rail_group AS (
         SELECT manifest_rails.rail_type,
            manifest_rails.normalized_rail_name,
            bool_or(((NOT manifest_rails.is_reference) AND (lower(COALESCE(manifest_rails.rail_status, ''::text)) <> ALL (ARRAY['deprecated'::text, 'retired'::text])) AND (NOT manifest_rails.is_gap))) AS has_active_non_gap,
            bool_or(((NOT manifest_rails.is_reference) AND (manifest_rails.rail_source = 'local'::text) AND (lower(COALESCE(manifest_rails.rail_status, ''::text)) <> ALL (ARRAY['deprecated'::text, 'retired'::text])) AND (NOT manifest_rails.is_gap))) AS has_active_local_non_gap
           FROM manifest_rails
          GROUP BY manifest_rails.rail_type, manifest_rails.normalized_rail_name
        ), reference_rollup AS MATERIALIZED (
         SELECT rail_1.rail_type,
            rail_1.normalized_rail_name,
            (count(*))::integer AS reference_count,
            (count(DISTINCT
                CASE
                    WHEN (rail_1.rail_source = 'local'::text) THEN rail_1.canonical_declaration_key
                    ELSE ((rail_1.canonical_declaration_key || ':'::text) || rail_1.rail_id)
                END) FILTER (WHERE ((NOT rail_1.is_reference) AND (rail_1.authority_priority <= 2) AND (lower(COALESCE(rail_1.rail_status, ''::text)) <> ALL (ARRAY['deprecated'::text, 'retired'::text])) AND (NOT (rail_group.has_active_non_gap AND rail_1.is_gap)) AND (NOT (rail_group.has_active_local_non_gap AND (rail_1.rail_source <> 'local'::text))))))::integer AS canonical_candidate_count,
            jsonb_agg(DISTINCT rail_1.feature_id ORDER BY rail_1.feature_id) AS related_feature_ids,
            jsonb_agg(DISTINCT rail_1.source_path ORDER BY rail_1.source_path) AS related_source_paths
           FROM (manifest_rails rail_1
             JOIN rail_group ON (((rail_group.rail_type = rail_1.rail_type) AND (rail_group.normalized_rail_name = rail_1.normalized_rail_name))))
          GROUP BY rail_1.rail_type, rail_1.normalized_rail_name
        ), ranked_canonical_rails AS (
         SELECT rail_1.rail_id,
            rail_1.feature_id,
            rail_1.mechanization_status,
            rail_1.rail_name,
            rail_1.normalized_rail_name,
            rail_1.rail_type,
            rail_1.ddd_owner,
            rail_1.rail_status,
            rail_1.symbol_refs,
            rail_1.implementation_refs,
            rail_1.documentation_refs,
            rail_1.implementation_ref_count,
            rail_1.documentation_ref_count,
            rail_1.governing_sources,
            rail_1.allowed_implementation_surfaces,
            rail_1.architecture_guards,
            rail_1.completion_gate,
            rail_1.is_gap,
            rail_1.reference_count,
            rail_1.duplicate_count,
            rail_1.is_duplicate,
            rail_1.source_path,
            rail_1.source_content_sha256,
            rail_1.raw_rail,
            rail_1.raw_manifest,
            rail_1.rail_source,
            rail_1.imported_at,
            rail_1.canonical_declaration_key,
            rail_1.authority_priority,
            row_number() OVER (PARTITION BY rail_1.rail_type, rail_1.normalized_rail_name ORDER BY
                CASE
                    WHEN ((NOT rail_group.has_active_non_gap) AND (rail_1.rail_source = 'local'::text) AND (lower(COALESCE(rail_1.rail_status, ''::text)) = ANY (ARRAY['deprecated'::text, 'retired'::text]))) THEN 0
                    WHEN ((lower(COALESCE(rail_1.rail_status, ''::text)) <> ALL (ARRAY['deprecated'::text, 'retired'::text])) AND (NOT rail_1.is_gap)) THEN 1
                    WHEN ((rail_1.rail_source = 'local'::text) AND (lower(COALESCE(rail_1.rail_status, ''::text)) <> ALL (ARRAY['deprecated'::text, 'retired'::text]))) THEN 2
                    WHEN (lower(COALESCE(rail_1.rail_status, ''::text)) <> ALL (ARRAY['deprecated'::text, 'retired'::text])) THEN 3
                    ELSE 4
                END,
                CASE
                    WHEN (rail_1.rail_source = 'local'::text) THEN 0
                    ELSE 1
                END, rail_1.is_gap, rail_1.authority_priority, rail_1.implementation_ref_count DESC, rail_1.documentation_ref_count DESC, rail_1.imported_at DESC, rail_1.rail_id) AS canonical_rank
           FROM (manifest_rails rail_1
             JOIN rail_group ON (((rail_group.rail_type = rail_1.rail_type) AND (rail_group.normalized_rail_name = rail_1.normalized_rail_name))))
          WHERE (NOT rail_1.is_reference)
        )
 SELECT rail.rail_id,
    rail.feature_id,
    rail.mechanization_status,
    rail.rail_name,
    rail.normalized_rail_name,
    rail.rail_type,
    rail.ddd_owner,
    rail.rail_status,
    rail.symbol_refs,
    rail.implementation_refs,
    rail.documentation_refs,
    rail.implementation_ref_count,
    rail.documentation_ref_count,
    rail.governing_sources,
    rail.allowed_implementation_surfaces,
    rail.architecture_guards,
    rail.completion_gate,
    rail.is_gap,
    rollup.reference_count,
    rollup.canonical_candidate_count AS duplicate_count,
    (rollup.canonical_candidate_count > 1) AS is_duplicate,
    rollup.related_feature_ids,
    rollup.related_source_paths,
    rail.source_path,
    rail.source_content_sha256,
    rail.raw_rail,
    rail.raw_manifest,
    rail.rail_source,
    rail.imported_at
   FROM (ranked_canonical_rails rail
     JOIN reference_rollup rollup ON (((rollup.rail_type = rail.rail_type) AND (rollup.normalized_rail_name = rail.normalized_rail_name))))
  WHERE (rail.canonical_rank = 1);


--
-- Name: command_query_rail_vocabulary_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.command_query_rail_vocabulary_query AS
 WITH rail_base AS (
         SELECT rail.rail_id,
            rail.feature_id,
            rail.mechanization_status,
            rail.rail_name,
            rail.normalized_rail_name,
            rail.rail_type,
            rail.ddd_owner,
            rail.rail_status,
            rail.symbol_refs,
            rail.implementation_refs,
            rail.documentation_refs,
            rail.implementation_ref_count,
            rail.documentation_ref_count,
            rail.governing_sources,
            rail.allowed_implementation_surfaces,
            rail.architecture_guards,
            rail.completion_gate,
            rail.is_gap,
            rail.reference_count,
            rail.duplicate_count,
            rail.is_duplicate,
            rail.related_feature_ids,
            rail.related_source_paths,
            rail.source_path,
            rail.source_content_sha256,
            rail.raw_rail,
            rail.raw_manifest,
            rail.rail_source,
            rail.imported_at,
                CASE
                    WHEN (lower(COALESCE(rail.rail_status, ''::text)) = ANY (ARRAY['deprecated'::text, 'retired'::text])) THEN lower(rail.rail_status)
                    WHEN rail.is_gap THEN 'gap'::text
                    ELSE 'active'::text
                END AS vocabulary_state,
            COALESCE(NULLIF(btrim(split_part(COALESCE(rail.ddd_owner, ''::text), '/'::text, 1)), ''::text), 'unknown'::text) AS bounded_context,
            lower(regexp_replace(regexp_replace(regexp_replace(COALESCE(rail.rail_name, ''::text), '^(api|ui|cli|worker|adapter)'::text, ''::text, 'i'::text), '(command|query)$'::text, ''::text, 'i'::text), '[^a-zA-Z0-9]+'::text, ''::text, 'g'::text)) AS semantic_key
           FROM planning_query_store.command_query_rail_query rail
        ), semantic_rollup AS MATERIALIZED (
         SELECT rail_base.rail_type,
            rail_base.semantic_key,
            (count(*))::integer AS duplicate_count,
            min(rail_base.rail_name) AS canonical_name,
            jsonb_agg(rail_base.rail_name ORDER BY rail_base.rail_name) AS rail_names,
            jsonb_agg(DISTINCT rail_base.source_path ORDER BY rail_base.source_path) AS source_paths
           FROM rail_base
          WHERE ((rail_base.vocabulary_state = 'active'::text) AND (rail_base.semantic_key <> ''::text))
          GROUP BY rail_base.rail_type, rail_base.semantic_key
        ), exact_duplicates AS (
         SELECT 'exact_duplicate'::text AS finding_kind,
            'error'::text AS severity,
            rail.rail_type,
            rail.rail_name,
            rail.rail_name AS canonical_name,
            rail.semantic_key,
            rail.bounded_context,
            rail.ddd_owner,
            rail.rail_status,
            rail.vocabulary_state,
            rail.duplicate_count,
            'Choose one canonical rail declaration and deprecate, alias, or retire duplicate declarations.'::text AS action_hint,
            rail.source_path,
            jsonb_build_object('normalizedRailName', rail.normalized_rail_name, 'relatedFeatureIds', rail.related_feature_ids, 'relatedSourcePaths', rail.related_source_paths) AS metadata
           FROM rail_base rail
          WHERE rail.is_duplicate
        ), semantic_duplicates AS (
         SELECT 'semantic_duplicate'::text AS finding_kind,
            'error'::text AS severity,
            rail.rail_type,
            rail.rail_name,
            rollup.canonical_name,
            rail.semantic_key,
            rail.bounded_context,
            rail.ddd_owner,
            rail.rail_status,
            rail.vocabulary_state,
            rollup.duplicate_count,
            'Choose one canonical rail name and deprecate aliases for the same product intent.'::text AS action_hint,
            rail.source_path,
            jsonb_build_object('railNames', rollup.rail_names, 'sourcePaths', rollup.source_paths) AS metadata
           FROM (rail_base rail
             JOIN semantic_rollup rollup ON (((rollup.rail_type = rail.rail_type) AND (rollup.semantic_key = rail.semantic_key))))
          WHERE (rollup.duplicate_count > 1)
        ), surface_named_rails AS (
         SELECT 'surface_named_rail'::text AS finding_kind,
            'warning'::text AS severity,
            rail.rail_type,
            rail.rail_name,
            rail.rail_name AS canonical_name,
            rail.semantic_key,
            rail.bounded_context,
            rail.ddd_owner,
            rail.rail_status,
            rail.vocabulary_state,
            1 AS duplicate_count,
            'Rename the rail by domain/system intent; keep API/UI/CLI/worker/adapter as implementation surfaces.'::text AS action_hint,
            rail.source_path,
            jsonb_build_object('surfacePrefixRule', 'api|ui|cli|worker|adapter', 'vocabularyState', rail.vocabulary_state) AS metadata
           FROM rail_base rail
          WHERE ((rail.vocabulary_state = ANY (ARRAY['active'::text, 'gap'::text])) AND (rail.rail_name ~* '^(api|ui|cli|worker|adapter)'::text))
        ), missing_owners AS (
         SELECT 'missing_ddd_owner'::text AS finding_kind,
            'error'::text AS severity,
            rail.rail_type,
            rail.rail_name,
            rail.rail_name AS canonical_name,
            rail.semantic_key,
            rail.bounded_context,
            rail.ddd_owner,
            rail.rail_status,
            rail.vocabulary_state,
            1 AS duplicate_count,
            'Declare the bounded context and DDD owner or read model for the rail.'::text AS action_hint,
            rail.source_path,
            jsonb_build_object('railId', rail.rail_id, 'featureId', rail.feature_id) AS metadata
           FROM rail_base rail
          WHERE ((rail.vocabulary_state = 'active'::text) AND ((NULLIF(btrim(COALESCE(rail.ddd_owner, ''::text)), ''::text) IS NULL) OR (lower(btrim(COALESCE(rail.ddd_owner, ''::text))) = ANY (ARRAY['-'::text, 'none'::text, 'unknown'::text]))))
        ), gap_rails AS (
         SELECT 'gap_rail'::text AS finding_kind,
            'warning'::text AS severity,
            rail.rail_type,
            rail.rail_name,
            rail.rail_name AS canonical_name,
            rail.semantic_key,
            rail.bounded_context,
            rail.ddd_owner,
            rail.rail_status,
            rail.vocabulary_state,
            1 AS duplicate_count,
            'Implement the rail or mark it deprecated/retired with explicit rationale.'::text AS action_hint,
            rail.source_path,
            jsonb_build_object('implementationRefCount', rail.implementation_ref_count, 'documentationRefCount', rail.documentation_ref_count, 'featureId', rail.feature_id) AS metadata
           FROM rail_base rail
          WHERE ((rail.vocabulary_state = 'gap'::text) AND (rail.rail_name !~* '^(api|ui|cli|worker|adapter)'::text))
        )
 SELECT exact_duplicates.finding_kind,
    exact_duplicates.severity,
    exact_duplicates.rail_type,
    exact_duplicates.rail_name,
    exact_duplicates.canonical_name,
    exact_duplicates.semantic_key,
    exact_duplicates.bounded_context,
    exact_duplicates.ddd_owner,
    exact_duplicates.rail_status,
    exact_duplicates.vocabulary_state,
    exact_duplicates.duplicate_count,
    exact_duplicates.action_hint,
    exact_duplicates.source_path,
    exact_duplicates.metadata
   FROM exact_duplicates
UNION ALL
 SELECT semantic_duplicates.finding_kind,
    semantic_duplicates.severity,
    semantic_duplicates.rail_type,
    semantic_duplicates.rail_name,
    semantic_duplicates.canonical_name,
    semantic_duplicates.semantic_key,
    semantic_duplicates.bounded_context,
    semantic_duplicates.ddd_owner,
    semantic_duplicates.rail_status,
    semantic_duplicates.vocabulary_state,
    semantic_duplicates.duplicate_count,
    semantic_duplicates.action_hint,
    semantic_duplicates.source_path,
    semantic_duplicates.metadata
   FROM semantic_duplicates
UNION ALL
 SELECT surface_named_rails.finding_kind,
    surface_named_rails.severity,
    surface_named_rails.rail_type,
    surface_named_rails.rail_name,
    surface_named_rails.canonical_name,
    surface_named_rails.semantic_key,
    surface_named_rails.bounded_context,
    surface_named_rails.ddd_owner,
    surface_named_rails.rail_status,
    surface_named_rails.vocabulary_state,
    surface_named_rails.duplicate_count,
    surface_named_rails.action_hint,
    surface_named_rails.source_path,
    surface_named_rails.metadata
   FROM surface_named_rails
UNION ALL
 SELECT missing_owners.finding_kind,
    missing_owners.severity,
    missing_owners.rail_type,
    missing_owners.rail_name,
    missing_owners.canonical_name,
    missing_owners.semantic_key,
    missing_owners.bounded_context,
    missing_owners.ddd_owner,
    missing_owners.rail_status,
    missing_owners.vocabulary_state,
    missing_owners.duplicate_count,
    missing_owners.action_hint,
    missing_owners.source_path,
    missing_owners.metadata
   FROM missing_owners
UNION ALL
 SELECT gap_rails.finding_kind,
    gap_rails.severity,
    gap_rails.rail_type,
    gap_rails.rail_name,
    gap_rails.canonical_name,
    gap_rails.semantic_key,
    gap_rails.bounded_context,
    gap_rails.ddd_owner,
    gap_rails.rail_status,
    gap_rails.vocabulary_state,
    gap_rails.duplicate_count,
    gap_rails.action_hint,
    gap_rails.source_path,
    gap_rails.metadata
   FROM gap_rails;


--
-- Name: dbt_project_roundtrip_capability_status_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.dbt_project_roundtrip_capability_status_query AS
 WITH phase_counts AS (
         SELECT phase_1.phase_id,
            (count(evidence_1.evidence_id))::integer AS actual_rail_count
           FROM (planning_query_store.dbt_project_roundtrip_phases phase_1
             LEFT JOIN planning_query_store.dbt_project_roundtrip_phase_rail_evidence evidence_1 ON ((evidence_1.phase_id = phase_1.phase_id)))
          GROUP BY phase_1.phase_id
        )
 SELECT phase.phase_id,
    phase.phase_order,
    phase.phase_name,
    phase.expected_rail_count AS phase_expected_rail_count,
    phase_counts.actual_rail_count AS phase_actual_rail_count,
    evidence.expected_rail_type AS rail_type,
    evidence.rail_name,
    rail.ddd_owner,
    evidence.expected_rail_status,
    rail.rail_status,
    evidence.expected_mechanization_status,
    rail.mechanization_status,
    evidence.expected_is_gap,
    rail.is_gap,
    evidence.expected_implemented,
    rail.implementation_ref_count,
    rail.is_duplicate,
        CASE
            WHEN (phase_counts.actual_rail_count <> phase.expected_rail_count) THEN 'evidence_gap'::text
            WHEN (evidence.evidence_id IS NULL) THEN 'evidence_gap'::text
            WHEN (rail.rail_id IS NULL) THEN 'rail_missing'::text
            WHEN rail.is_duplicate THEN 'duplicate_rail'::text
            WHEN (rail.rail_type <> evidence.expected_rail_type) THEN 'rail_type_drift'::text
            WHEN (rail.rail_status <> evidence.expected_rail_status) THEN 'rail_status_drift'::text
            WHEN (rail.mechanization_status <> evidence.expected_mechanization_status) THEN 'mechanization_status_drift'::text
            WHEN (rail.is_gap <> evidence.expected_is_gap) THEN 'gap_posture_drift'::text
            WHEN ((rail.implementation_ref_count > 0) <> evidence.expected_implemented) THEN 'implementation_evidence_drift'::text
            ELSE 'current'::text
        END AS projection_state,
    evidence.reviewed_pr_url,
    evidence.reviewed_commit_sha,
    evidence.evidence_summary,
    evidence.source_path
   FROM (((planning_query_store.dbt_project_roundtrip_phases phase
     JOIN phase_counts USING (phase_id))
     LEFT JOIN planning_query_store.dbt_project_roundtrip_phase_rail_evidence evidence ON ((evidence.phase_id = phase.phase_id)))
     LEFT JOIN planning_query_store.command_query_rail_query rail ON ((rail.rail_name = evidence.rail_name)));
