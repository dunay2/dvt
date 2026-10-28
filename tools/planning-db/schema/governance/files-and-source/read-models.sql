--
-- Name: governance_file_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.governance_file_query AS
 SELECT imported.path,
    imported.file_id,
    imported.shard_id,
    imported.path_hash,
    COALESCE(current_content.content_hash, imported.content_hash) AS content_hash,
    imported.governance_hash,
    COALESCE(current_content.state_fingerprint, imported.state_fingerprint) AS state_fingerprint,
    imported.owning_unit,
    imported.root_unit,
    imported.domain_unit,
    imported.component_unit,
    imported.owner_level,
    imported.unit_status,
    imported.governance_state,
    imported.canonical_role,
    imported.evidence_state,
    imported.is_drift,
    imported.is_legacy,
    imported.ddd_owner,
    imported.cq_rails,
    imported.source_path,
    imported.source_content_sha256,
    imported.governance_refs,
    jsonb_set(jsonb_set(imported.raw_file, '{contentHash}'::text[], to_jsonb(COALESCE(current_content.content_hash, imported.content_hash))), '{stateFingerprint}'::text[], to_jsonb(COALESCE(current_content.state_fingerprint, imported.state_fingerprint))) AS raw_file,
    current_content.source_commit_sha AS current_source_commit_sha,
    current_content.source_blob_sha AS current_source_blob_sha,
    current_content.revision AS current_content_revision,
    current_content.updated_by AS current_content_updated_by,
    current_content.updated_at AS current_content_updated_at
   FROM (planning_query_store.governance_files imported
     LEFT JOIN planning_query_store.governed_source_content_overrides current_content ON ((current_content.path = imported.path)));


--
-- Name: governance_file_hash_projection; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.governance_file_hash_projection AS
 WITH base AS (
         SELECT gf.path,
            gf.file_id AS stored_file_id,
            gf.path_hash AS stored_path_hash,
            gf.content_hash,
            gf.governance_hash AS stored_governance_hash,
            gf.state_fingerprint AS stored_state_fingerprint,
            gf.owning_unit,
            gf.root_unit,
            gf.domain_unit,
            gf.component_unit,
            gf.owner_level,
            gf.unit_status,
            gf.governance_state,
            gf.canonical_role,
            gf.evidence_state,
            gf.is_drift,
            gf.is_legacy,
            gf.ddd_owner,
            gf.cq_rails,
            gf.governance_refs,
            gf.raw_file,
            gf.source_path,
            gf.source_content_sha256,
            planning_query_store.sha256_text(('dvt:file-path:v1:'::text || gf.path)) AS derived_path_hash,
            ('F-'::text || upper(substr(planning_query_store.sha256_text(('dvt:file:v1:'::text || gf.path)), 1, 12))) AS derived_file_id
           FROM planning_query_store.governance_files gf
        ), payloads AS (
         SELECT base.path,
            base.stored_file_id,
            base.stored_path_hash,
            base.content_hash,
            base.stored_governance_hash,
            base.stored_state_fingerprint,
            base.owning_unit,
            base.root_unit,
            base.domain_unit,
            base.component_unit,
            base.owner_level,
            base.unit_status,
            base.governance_state,
            base.canonical_role,
            base.evidence_state,
            base.is_drift,
            base.is_legacy,
            base.ddd_owner,
            base.cq_rails,
            base.governance_refs,
            base.raw_file,
            base.source_path,
            base.source_content_sha256,
            base.derived_path_hash,
            base.derived_file_id,
            planning_query_store.stable_jsonb_text(jsonb_build_object('canonicalRole', base.canonical_role, 'componentUnit', base.component_unit, 'cqRails', base.cq_rails, 'dddOwner', base.ddd_owner, 'domainUnit', base.domain_unit, 'evidenceState', base.evidence_state, 'governance', base.governance_refs, 'governanceState', base.governance_state, 'isDrift', base.is_drift, 'isLegacy', base.is_legacy, 'ownerLevel', base.owner_level, 'owningUnit', base.owning_unit, 'rootUnit', base.root_unit, 'unitPath', COALESCE((base.raw_file -> 'unitPath'::text), '[]'::jsonb), 'unitStatus', base.unit_status)) AS governance_payload_text
           FROM base
        ), derived AS (
         SELECT payloads.path,
            payloads.stored_file_id,
            payloads.stored_path_hash,
            payloads.content_hash,
            payloads.stored_governance_hash,
            payloads.stored_state_fingerprint,
            payloads.owning_unit,
            payloads.root_unit,
            payloads.domain_unit,
            payloads.component_unit,
            payloads.owner_level,
            payloads.unit_status,
            payloads.governance_state,
            payloads.canonical_role,
            payloads.evidence_state,
            payloads.is_drift,
            payloads.is_legacy,
            payloads.ddd_owner,
            payloads.cq_rails,
            payloads.governance_refs,
            payloads.raw_file,
            payloads.source_path,
            payloads.source_content_sha256,
            payloads.derived_path_hash,
            payloads.derived_file_id,
            payloads.governance_payload_text,
            planning_query_store.sha256_text(payloads.governance_payload_text) AS derived_governance_hash
           FROM payloads
        )
 SELECT path,
    stored_file_id,
    derived_file_id,
    stored_path_hash,
    derived_path_hash,
    content_hash,
    stored_governance_hash,
    derived_governance_hash,
    stored_state_fingerprint,
    planning_query_store.sha256_text(planning_query_store.stable_jsonb_text(jsonb_build_object('contentHash', content_hash, 'governanceHash', derived_governance_hash, 'pathHash', derived_path_hash))) AS derived_state_fingerprint,
    owning_unit,
    root_unit,
    domain_unit,
    component_unit,
    source_path,
    source_content_sha256
   FROM derived;


--
-- Name: governance_file_hash_drift; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.governance_file_hash_drift AS
 SELECT path,
    stored_file_id,
    derived_file_id,
    stored_path_hash,
    derived_path_hash,
    content_hash,
    stored_governance_hash,
    derived_governance_hash,
    stored_state_fingerprint,
    derived_state_fingerprint,
    owning_unit,
    root_unit,
    domain_unit,
    component_unit,
    source_path,
    source_content_sha256
   FROM planning_query_store.governance_file_hash_projection
  WHERE ((stored_file_id IS DISTINCT FROM derived_file_id) OR (stored_path_hash IS DISTINCT FROM derived_path_hash) OR (stored_governance_hash IS DISTINCT FROM derived_governance_hash) OR (stored_state_fingerprint IS DISTINCT FROM derived_state_fingerprint));


--
-- Name: governed_source_drift_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.governed_source_drift_query AS
 WITH governed_sources AS (
         SELECT command_query_rails.source_path,
            'planning_query_store.command_query_rails'::text AS source_table,
            (count(*))::integer AS reference_count
           FROM planning_query_store.command_query_rails
          WHERE (NULLIF(btrim(command_query_rails.source_path), ''::text) IS NOT NULL)
          GROUP BY command_query_rails.source_path
        UNION ALL
         SELECT feature_mechanization_local_rails.source_path,
            'planning_query_store.feature_mechanization_local_rails'::text AS source_table,
            (count(*))::integer AS reference_count
           FROM planning_query_store.feature_mechanization_local_rails
          WHERE (NULLIF(btrim(feature_mechanization_local_rails.source_path), ''::text) IS NOT NULL)
          GROUP BY feature_mechanization_local_rails.source_path
        ), missing_sources AS (
         SELECT governed_sources.source_path,
            governed_sources.source_table,
            governed_sources.reference_count
           FROM (governed_sources
             LEFT JOIN planning_query_store.governance_files file_ref ON ((file_ref.path = governed_sources.source_path)))
          WHERE ((file_ref.path IS NULL) AND (governed_sources.source_path !~ '^\.generated-docs/'::text) AND (governed_sources.source_path !~* '^https?://'::text))
        )
 SELECT 'missing_source_file'::text AS finding_kind,
        CASE
            WHEN (source_path ~~ 'buzon/%'::text) THEN 'error'::text
            ELSE 'warning'::text
        END AS severity,
    source_path,
    source_table,
    reference_count,
    'Repoint the governed source or retire the stale row explicitly.'::text AS action_hint,
    jsonb_build_object('sourcePath', source_path, 'sourceTable', source_table, 'referenceCount', reference_count) AS metadata
   FROM missing_sources;


--
-- Name: risk_debt_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.risk_debt_query AS
 SELECT risk_id,
    source_path,
    title,
    status,
    owners,
    severity,
    probability,
    priority,
    component_unit,
    root_unit,
    domain_unit,
    ddd_owner,
    cq_rails,
    (lower(COALESCE(status, ''::text)) <> ALL (ARRAY['accepted'::text, 'closed'::text, 'done'::text, 'mitigated'::text, 'resolved'::text, 'superseded'::text])) AS is_open,
    source_content_sha256
   FROM planning_query_store.risk_debt_items;
