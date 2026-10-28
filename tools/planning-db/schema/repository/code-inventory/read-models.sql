--
-- Name: code_symbol_inventory_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.code_symbol_inventory_query AS
 SELECT symbol.symbol_id,
    symbol.source_path,
    symbol.source_content_sha256,
    symbol.file_path,
    COALESCE(ownership.leaf_component_id, symbol.component_id) AS component_id,
    COALESCE(ownership.owning_unit, symbol.owning_unit) AS owning_unit,
    COALESCE(ownership.root_unit, symbol.root_unit) AS root_unit,
    COALESCE(ownership.domain_unit, symbol.domain_unit) AS domain_unit,
    symbol.symbol_name,
    symbol.symbol_kind,
    symbol.export_kind,
    symbol.signature,
    symbol.signature_sha256,
    symbol.start_line,
    symbol.end_line,
    symbol.body_sha256,
    symbol.normalized_body_length,
    symbol.import_refs,
    (symbol.metadata || jsonb_build_object('importedComponentId', symbol.component_id, 'effectiveComponentId', COALESCE(ownership.leaf_component_id, symbol.component_id), 'effectiveOwningUnit', COALESCE(ownership.owning_unit, symbol.owning_unit), 'ownershipSource',
        CASE
            WHEN (ownership.file_path IS NOT NULL) THEN 'planning_query_store.component_engineering_file_ownership_query'::text
            ELSE 'planning_query_store.code_symbols'::text
        END)) AS metadata,
    symbol.raw_symbol,
    symbol.imported_at
   FROM (planning_query_store.code_symbols symbol
     LEFT JOIN planning_query_store.component_engineering_file_ownership_query ownership ON ((ownership.file_path = symbol.file_path)));


--
-- Name: code_symbol_effective_inventory_projection; Type: MATERIALIZED VIEW; Schema: planning_query_store; Owner: -
--

CREATE MATERIALIZED VIEW planning_query_store.code_symbol_effective_inventory_projection AS
 SELECT symbol.symbol_id,
    symbol.source_path,
    symbol.source_content_sha256,
    symbol.file_path,
    symbol.component_id,
    symbol.owning_unit,
    symbol.root_unit,
    symbol.domain_unit,
    symbol.symbol_name,
    symbol.symbol_kind,
    symbol.export_kind,
    symbol.signature,
    symbol.signature_sha256,
    symbol.start_line,
    symbol.end_line,
    symbol.body_sha256,
    symbol.normalized_body_length,
    symbol.import_refs,
    symbol.metadata,
    symbol.raw_symbol,
    symbol.imported_at,
    COALESCE(definition.status, 'unknown'::text) AS component_definition_status,
    COALESCE(component.status, 'unknown'::text) AS architecture_component_status,
    ((COALESCE(definition.status, ''::text) = ANY (ARRAY['legacy'::text, 'superseded'::text])) OR (COALESCE(component.status, ''::text) = 'deprecated'::text)) AS is_legacy_or_deprecated_component
   FROM ((planning_query_store.code_symbol_inventory_query symbol
     LEFT JOIN planning_query_store.governance_component_definition_query definition ON ((definition.component_id = symbol.component_id)))
     LEFT JOIN architecture.component component ON ((component.component_id = symbol.component_id)))
  WITH NO DATA;


--
-- Name: code_symbol_exact_duplicate_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.code_symbol_exact_duplicate_query AS
 WITH duplicate_bodies AS (
         SELECT code_symbol_effective_inventory_projection.body_sha256,
            (count(*))::integer AS duplicate_count,
            (count(DISTINCT code_symbol_effective_inventory_projection.file_path))::integer AS duplicate_file_count,
            (count(DISTINCT COALESCE(code_symbol_effective_inventory_projection.component_id, 'unknown'::text)))::integer AS duplicate_component_count,
            count(DISTINCT COALESCE(code_symbol_effective_inventory_projection.component_id, 'unknown'::text)) FILTER (WHERE (NOT code_symbol_effective_inventory_projection.is_legacy_or_deprecated_component)) AS active_component_count,
            count(DISTINCT COALESCE(code_symbol_effective_inventory_projection.component_id, 'unknown'::text)) FILTER (WHERE code_symbol_effective_inventory_projection.is_legacy_or_deprecated_component) AS legacy_or_deprecated_component_count,
            jsonb_agg(DISTINCT code_symbol_effective_inventory_projection.file_path ORDER BY code_symbol_effective_inventory_projection.file_path) AS duplicate_files,
            jsonb_agg(DISTINCT COALESCE(code_symbol_effective_inventory_projection.component_id, 'unknown'::text) ORDER BY COALESCE(code_symbol_effective_inventory_projection.component_id, 'unknown'::text)) AS duplicate_components,
            jsonb_agg(DISTINCT COALESCE(code_symbol_effective_inventory_projection.component_id, 'unknown'::text) ORDER BY COALESCE(code_symbol_effective_inventory_projection.component_id, 'unknown'::text)) FILTER (WHERE (NOT code_symbol_effective_inventory_projection.is_legacy_or_deprecated_component)) AS active_components,
            jsonb_agg(DISTINCT COALESCE(code_symbol_effective_inventory_projection.component_id, 'unknown'::text) ORDER BY COALESCE(code_symbol_effective_inventory_projection.component_id, 'unknown'::text)) FILTER (WHERE code_symbol_effective_inventory_projection.is_legacy_or_deprecated_component) AS legacy_or_deprecated_components
           FROM planning_query_store.code_symbol_effective_inventory_projection
          WHERE (code_symbol_effective_inventory_projection.normalized_body_length >= 80)
          GROUP BY code_symbol_effective_inventory_projection.body_sha256
         HAVING (count(DISTINCT code_symbol_effective_inventory_projection.file_path) > 1)
        )
 SELECT 'exact_body_duplicate'::text AS finding_kind,
        CASE
            WHEN ((duplicate_bodies.active_component_count <= 1) AND (duplicate_bodies.legacy_or_deprecated_component_count > 0)) THEN 'info'::text
            ELSE 'warning'::text
        END AS severity,
    concat('body:', symbol.body_sha256) AS duplicate_key,
    symbol.symbol_id,
    symbol.symbol_name,
    symbol.symbol_kind,
    symbol.component_id,
    symbol.file_path AS source_path,
    symbol.start_line,
    duplicate_bodies.duplicate_count,
        CASE
            WHEN ((duplicate_bodies.active_component_count <= 1) AND (duplicate_bodies.legacy_or_deprecated_component_count > 0)) THEN 'Keep the active implementation canonical and retire or wrap the legacy duplicate path.'::text
            ELSE 'Extract one canonical helper or document why local duplication is intentional.'::text
        END AS action_hint,
    jsonb_build_object('bodySha256', symbol.body_sha256, 'duplicateFileCount', duplicate_bodies.duplicate_file_count, 'duplicateComponentCount', duplicate_bodies.duplicate_component_count, 'activeComponentCount', duplicate_bodies.active_component_count, 'legacyOrDeprecatedComponentCount', duplicate_bodies.legacy_or_deprecated_component_count, 'duplicateFiles', duplicate_bodies.duplicate_files, 'duplicateComponents', duplicate_bodies.duplicate_components, 'activeComponents', COALESCE(duplicate_bodies.active_components, '[]'::jsonb), 'legacyOrDeprecatedComponents', COALESCE(duplicate_bodies.legacy_or_deprecated_components, '[]'::jsonb), 'duplicateDisposition',
        CASE
            WHEN ((duplicate_bodies.active_component_count <= 1) AND (duplicate_bodies.legacy_or_deprecated_component_count > 0)) THEN 'legacy_or_deprecated_counterpart'::text
            ELSE 'active_duplicate'::text
        END, 'componentDefinitionStatus', symbol.component_definition_status, 'architectureComponentStatus', symbol.architecture_component_status, 'normalizedBodyLength', symbol.normalized_body_length, 'ownershipSource', 'planning_query_store.component_engineering_file_ownership_query') AS metadata
   FROM (planning_query_store.code_symbol_effective_inventory_projection symbol
     JOIN duplicate_bodies ON ((duplicate_bodies.body_sha256 = symbol.body_sha256)));


--
-- Name: code_symbol_name_duplicate_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.code_symbol_name_duplicate_query AS
 WITH duplicate_names AS (
         SELECT lower(code_symbol_effective_inventory_projection.symbol_name) AS normalized_symbol_name,
            code_symbol_effective_inventory_projection.symbol_kind,
            (count(*))::integer AS duplicate_count,
            (count(DISTINCT code_symbol_effective_inventory_projection.file_path))::integer AS duplicate_file_count,
            jsonb_agg(DISTINCT code_symbol_effective_inventory_projection.file_path ORDER BY code_symbol_effective_inventory_projection.file_path) AS duplicate_files
           FROM planning_query_store.code_symbol_effective_inventory_projection
          GROUP BY (lower(code_symbol_effective_inventory_projection.symbol_name)), code_symbol_effective_inventory_projection.symbol_kind
         HAVING (count(DISTINCT code_symbol_effective_inventory_projection.file_path) > 1)
        )
 SELECT 'same_name_duplicate'::text AS finding_kind,
    'info'::text AS severity,
    concat('name:', duplicate_names.normalized_symbol_name, ':', duplicate_names.symbol_kind) AS duplicate_key,
    symbol.symbol_id,
    symbol.symbol_name,
    symbol.symbol_kind,
    symbol.component_id,
    symbol.file_path AS source_path,
    symbol.start_line,
    duplicate_names.duplicate_count,
    'Review whether repeated symbol names express one reusable concept or separate bounded-context intent.'::text AS action_hint,
    jsonb_build_object('duplicateFileCount', duplicate_names.duplicate_file_count, 'duplicateFiles', duplicate_names.duplicate_files, 'ownershipSource', 'planning_query_store.component_engineering_file_ownership_query') AS metadata
   FROM (planning_query_store.code_symbol_effective_inventory_projection symbol
     JOIN duplicate_names ON (((duplicate_names.normalized_symbol_name = lower(symbol.symbol_name)) AND (duplicate_names.symbol_kind = symbol.symbol_kind))));


--
-- Name: code_symbol_semantic_candidate_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.code_symbol_semantic_candidate_query AS
 WITH semantic_candidates AS (
         SELECT code_symbol_effective_inventory_projection.body_sha256,
            (count(*))::integer AS duplicate_count,
            (count(DISTINCT code_symbol_effective_inventory_projection.symbol_name))::integer AS distinct_symbol_name_count,
            jsonb_agg(DISTINCT code_symbol_effective_inventory_projection.symbol_name ORDER BY code_symbol_effective_inventory_projection.symbol_name) AS symbol_names,
            jsonb_agg(DISTINCT code_symbol_effective_inventory_projection.file_path ORDER BY code_symbol_effective_inventory_projection.file_path) AS duplicate_files
           FROM planning_query_store.code_symbol_effective_inventory_projection
          WHERE (code_symbol_effective_inventory_projection.normalized_body_length >= 80)
          GROUP BY code_symbol_effective_inventory_projection.body_sha256
         HAVING ((count(DISTINCT code_symbol_effective_inventory_projection.file_path) > 1) AND (count(DISTINCT code_symbol_effective_inventory_projection.symbol_name) > 1))
        )
 SELECT 'semantic_duplicate_candidate'::text AS finding_kind,
    'warning'::text AS severity,
    concat('semantic-body:', symbol.body_sha256) AS duplicate_key,
    symbol.symbol_id,
    symbol.symbol_name,
    symbol.symbol_kind,
    symbol.component_id,
    symbol.file_path AS source_path,
    symbol.start_line,
    semantic_candidates.duplicate_count,
    'Decide whether differently named symbols are one canonical behavior before adding another local helper.'::text AS action_hint,
    jsonb_build_object('symbolNames', semantic_candidates.symbol_names, 'duplicateFiles', semantic_candidates.duplicate_files, 'distinctSymbolNameCount', semantic_candidates.distinct_symbol_name_count, 'normalizedBodyLength', symbol.normalized_body_length, 'ownershipSource', 'planning_query_store.component_engineering_file_ownership_query') AS metadata
   FROM (planning_query_store.code_symbol_effective_inventory_projection symbol
     JOIN semantic_candidates ON ((semantic_candidates.body_sha256 = symbol.body_sha256)));


--
-- Name: code_symbol_problem_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.code_symbol_problem_query AS
 SELECT code_symbol_exact_duplicate_query.finding_kind,
    code_symbol_exact_duplicate_query.severity,
    code_symbol_exact_duplicate_query.duplicate_key,
    code_symbol_exact_duplicate_query.symbol_id,
    code_symbol_exact_duplicate_query.symbol_name,
    code_symbol_exact_duplicate_query.symbol_kind,
    code_symbol_exact_duplicate_query.component_id,
    code_symbol_exact_duplicate_query.source_path,
    code_symbol_exact_duplicate_query.start_line,
    code_symbol_exact_duplicate_query.duplicate_count,
    code_symbol_exact_duplicate_query.action_hint,
    code_symbol_exact_duplicate_query.metadata
   FROM planning_query_store.code_symbol_exact_duplicate_query
UNION ALL
 SELECT code_symbol_name_duplicate_query.finding_kind,
    code_symbol_name_duplicate_query.severity,
    code_symbol_name_duplicate_query.duplicate_key,
    code_symbol_name_duplicate_query.symbol_id,
    code_symbol_name_duplicate_query.symbol_name,
    code_symbol_name_duplicate_query.symbol_kind,
    code_symbol_name_duplicate_query.component_id,
    code_symbol_name_duplicate_query.source_path,
    code_symbol_name_duplicate_query.start_line,
    code_symbol_name_duplicate_query.duplicate_count,
    code_symbol_name_duplicate_query.action_hint,
    code_symbol_name_duplicate_query.metadata
   FROM planning_query_store.code_symbol_name_duplicate_query
UNION ALL
 SELECT code_symbol_semantic_candidate_query.finding_kind,
    code_symbol_semantic_candidate_query.severity,
    code_symbol_semantic_candidate_query.duplicate_key,
    code_symbol_semantic_candidate_query.symbol_id,
    code_symbol_semantic_candidate_query.symbol_name,
    code_symbol_semantic_candidate_query.symbol_kind,
    code_symbol_semantic_candidate_query.component_id,
    code_symbol_semantic_candidate_query.source_path,
    code_symbol_semantic_candidate_query.start_line,
    code_symbol_semantic_candidate_query.duplicate_count,
    code_symbol_semantic_candidate_query.action_hint,
    code_symbol_semantic_candidate_query.metadata
   FROM planning_query_store.code_symbol_semantic_candidate_query;


--
-- Name: repository_command_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.repository_command_query AS
 SELECT command_id,
    command_type,
    command_name,
    command_path,
    command_text,
    domain,
    sensitivity,
    runtime_fanout,
    changed_file_validation_relevant,
    referenced_files,
    jsonb_array_length(referenced_files) AS referenced_file_count,
    source_path,
    source_content_sha256,
    imported_at
   FROM planning_query_store.repository_commands;
