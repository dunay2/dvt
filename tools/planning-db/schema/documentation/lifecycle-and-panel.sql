--
-- Name: documentation_lifecycle_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.documentation_lifecycle_query AS
 WITH canonical_relocations AS (
         SELECT original.document_path,
            resolution.raw_resolution #>> '{canonicalSource,targetPath}' AS canonical_target_path
           FROM planning_query_store.knowledge_documents original
           JOIN planning_query_store.doc_resolution_overlays resolution
             ON resolution.document_path=original.document_path
            AND resolution.resolution_scope='docs_disposition'
            AND resolution.issue_kind='canonical_document_relocation'
            AND resolution.resolution_status='linked' AND resolution.reference_text IS NULL
            AND resolution.source_content_sha256=original.source_content_sha256
            AND resolution.raw_resolution #>> '{canonicalSource,sourceDocumentId}'=original.document_id
            AND resolution.raw_resolution #>> '{canonicalSource,expectedSourceContentSha256}'=original.source_content_sha256
            AND resolution.raw_resolution #>> '{canonicalSource,targetPath}' IS NOT NULL
        ), accepted_db_authority_dispositions AS (
         SELECT disposition.document_path,
            disposition.disposition_kind,
            disposition.source_content_sha256
           FROM planning_query_store.fowler_analysis_dispositions disposition
          WHERE ((disposition.disposition_status = 'accepted'::text) AND (disposition.disposition_kind = 'db_authority_historical'::text))
        ), action_counts AS (
         SELECT action.source_document_id AS document_id,
            (count(*))::integer AS action_count,
            (count(*) FILTER (WHERE (lower(COALESCE(action.status, ''::text)) <> ALL (ARRAY['deferred'::text, 'done'::text, 'rejected'::text, 'resolved'::text, 'superseded'::text]))))::integer AS open_action_count
           FROM planning_query_store.knowledge_action_items action
          GROUP BY action.source_document_id
        ), knowledge_reference_counts AS (
         SELECT link.to_document_id AS document_id,
            (count(*))::integer AS inbound_knowledge_reference_count
           FROM planning_query_store.knowledge_document_links link
          GROUP BY link.to_document_id
        ), repository_reference_counts AS (
         SELECT document.document_id,
            (count(reference.reference_id))::integer AS inbound_repository_reference_count
           FROM (planning_query_store.knowledge_documents document
             JOIN planning_query_store.knowledge_intake_repository_references reference ON ((reference.target_document_path = document.document_path)))
          WHERE (reference.source_path !~~ 'buzon/%'::text)
          GROUP BY document.document_id
        ), classified AS (
         SELECT document.document_id,
            document.document_path,
            document.document_type,
            document.title,
            document.status,
            document.planning_type,
            document.owner,
            document.mandatory,
            COALESCE(disposition.disposition_kind, NULLIF(COALESCE((document.raw_frontmatter ->> 'canonical_disposition'::text), (document.raw_frontmatter ->> 'canonicalDisposition'::text)), ''::text)) AS canonical_disposition,
            disposition.disposition_kind AS db_disposition_kind,
            planning_query_store.documentation_subject_key(document.title) AS subject_key,
                CASE
                    WHEN (document.document_path ~~ 'buzon/%'::text) THEN 'intake'::text
                    WHEN (document.document_path ~~ 'docs/archive/%'::text) THEN 'archive'::text
                    WHEN (document.document_path ~~ 'docs/planning/proposals/%'::text) THEN 'proposal'::text
                    WHEN (document.document_type = 'closeout'::text) THEN 'closeout'::text
                    WHEN (document.document_type = 'architecture_user_stories'::text) THEN 'supporting'::text
                    WHEN (document.document_type = ANY (ARRAY['adr'::text, 'architecture'::text, 'architecture_component'::text, 'concept'::text, 'contract'::text, 'guide'::text, 'runbook'::text])) THEN 'canonical'::text
                    ELSE 'indexed'::text
                END AS canonicality,
            COALESCE(action_counts.action_count, 0) AS action_count,
            COALESCE(action_counts.open_action_count, 0) AS open_action_count,
            COALESCE(reference_counts.inbound_knowledge_reference_count, 0) AS inbound_knowledge_reference_count,
            COALESCE(repository_counts.inbound_repository_reference_count, 0) AS inbound_repository_reference_count,
            document.source_content_sha256,
            relocation.canonical_target_path
           FROM ((((planning_query_store.knowledge_documents document
             LEFT JOIN action_counts ON ((action_counts.document_id = document.document_id)))
             LEFT JOIN knowledge_reference_counts reference_counts ON ((reference_counts.document_id = document.document_id)))
             LEFT JOIN repository_reference_counts repository_counts ON ((repository_counts.document_id = document.document_id)))
             LEFT JOIN accepted_db_authority_dispositions disposition ON (((disposition.document_path = document.document_path) AND (disposition.source_content_sha256 = document.source_content_sha256))))
             LEFT JOIN canonical_relocations relocation ON relocation.document_path=document.document_path
        ), stateful AS (
         SELECT classified.document_id,
            classified.document_path,
            classified.document_type,
            classified.title,
            classified.status,
            classified.planning_type,
            classified.owner,
            classified.mandatory,
            classified.canonical_disposition,
            classified.db_disposition_kind,
            classified.subject_key,
            classified.canonicality,
            classified.action_count,
            classified.open_action_count,
            classified.inbound_knowledge_reference_count,
            classified.inbound_repository_reference_count,
            classified.source_content_sha256,
            classified.canonical_target_path,
                CASE
                    WHEN classified.canonical_target_path IS NOT NULL THEN 'superseded'::text
                    WHEN (classified.db_disposition_kind = 'db_authority_historical'::text) THEN 'superseded'::text
                    WHEN ((lower(COALESCE(classified.status, ''::text)) = ANY (ARRAY['rejected'::text, 'discarded'::text, 'disposable'::text])) OR (classified.document_path ~~ 'docs/planning/proposals/disposable/%'::text)) THEN 'discarded'::text
                    WHEN ((lower(COALESCE(classified.status, ''::text)) = 'superseded'::text) OR (classified.document_path ~~ 'docs/planning/proposals/superseded/%'::text)) THEN 'superseded'::text
                    WHEN (classified.document_path ~~ 'docs/archive/%'::text) THEN 'archived'::text
                    WHEN ((classified.canonicality = 'intake'::text) AND (classified.canonical_disposition IS NOT NULL)) THEN 'canonized'::text
                    WHEN ((classified.canonicality = 'intake'::text) AND (classified.open_action_count > 0)) THEN 'open-actions'::text
                    WHEN ((classified.canonicality = 'intake'::text) AND ((classified.inbound_knowledge_reference_count > 0) OR (classified.inbound_repository_reference_count > 0))) THEN 'referenced'::text
                    WHEN (classified.canonicality = 'intake'::text) THEN 'unclassified'::text
                    WHEN (classified.canonicality = 'closeout'::text) THEN 'closed'::text
                    WHEN ((classified.canonicality = 'proposal'::text) AND (lower(COALESCE(classified.status, ''::text)) = ANY (ARRAY['accepted'::text, 'implemented'::text, 'closed'::text]))) THEN 'implemented'::text
                    WHEN (classified.canonicality = 'proposal'::text) THEN 'proposed'::text
                    WHEN (classified.canonicality = ANY (ARRAY['canonical'::text, 'supporting'::text])) THEN 'active'::text
                    ELSE 'indexed'::text
                END AS lifecycle_state
           FROM classified
        ), peer_counts AS (
         SELECT stateful_1.subject_key,
            (count(*))::integer AS subject_document_count,
            (count(*) FILTER (WHERE (stateful_1.canonicality = 'canonical'::text)))::integer AS canonical_counterpart_count,
            (count(*) FILTER (WHERE (stateful_1.canonicality = 'proposal'::text)))::integer AS proposal_counterpart_count,
            (count(*) FILTER (WHERE (stateful_1.canonicality = 'closeout'::text)))::integer AS closeout_counterpart_count,
            (count(*) FILTER (WHERE (stateful_1.canonicality = 'intake'::text)))::integer AS intake_counterpart_count
           FROM stateful stateful_1
          WHERE ((stateful_1.subject_key IS NOT NULL) AND (stateful_1.lifecycle_state <> ALL (ARRAY['archived'::text, 'discarded'::text, 'superseded'::text])))
          GROUP BY stateful_1.subject_key
        )
 SELECT stateful.document_id,
    stateful.document_path,
    stateful.document_type,
    stateful.title,
    stateful.status,
    stateful.planning_type,
    stateful.owner,
    stateful.mandatory,
    stateful.canonicality,
    stateful.lifecycle_state,
    COALESCE(stateful.canonical_disposition, ''::text) AS canonical_disposition,
    stateful.subject_key,
    COALESCE(peer_counts.subject_document_count, 1) AS subject_document_count,
    GREATEST((COALESCE(peer_counts.subject_document_count, 1) - 1), 0) AS duplicate_count,
    (COALESCE(peer_counts.subject_document_count, 1) > 1) AS is_duplicate,
    COALESCE(peer_counts.canonical_counterpart_count, 0) AS canonical_counterpart_count,
    COALESCE(peer_counts.proposal_counterpart_count, 0) AS proposal_counterpart_count,
    COALESCE(peer_counts.closeout_counterpart_count, 0) AS closeout_counterpart_count,
    COALESCE(peer_counts.intake_counterpart_count, 0) AS intake_counterpart_count,
    stateful.action_count,
    stateful.open_action_count,
    stateful.inbound_knowledge_reference_count,
    stateful.inbound_repository_reference_count,
        CASE
            WHEN ((stateful.canonicality = 'proposal'::text) AND (stateful.lifecycle_state <> ALL (ARRAY['discarded'::text, 'superseded'::text, 'archived'::text])) AND (COALESCE(peer_counts.canonical_counterpart_count, 0) = 0)) THEN 'proposal_missing_canonical'::text
            WHEN ((stateful.canonicality = 'proposal'::text) AND (stateful.lifecycle_state = 'implemented'::text) AND (COALESCE(peer_counts.closeout_counterpart_count, 0) = 0)) THEN 'implemented_proposal_missing_closeout'::text
            WHEN ((stateful.canonicality = 'intake'::text) AND (stateful.lifecycle_state = 'unclassified'::text)) THEN 'intake_unclassified'::text
            WHEN (COALESCE(peer_counts.canonical_counterpart_count, 0) > 1) THEN 'canonical_duplicate'::text
            ELSE 'none'::text
        END AS lifecycle_gap_kind,
    (('pnpm planning:db:query documentation-lifecycle --path '::text || quote_literal(stateful.document_path)) || ' --limit 30'::text) AS suggested_query,
    stateful.source_content_sha256,
    stateful.canonical_target_path
   FROM (stateful
     LEFT JOIN peer_counts ON ((peer_counts.subject_key = stateful.subject_key)));


--
-- Name: documentation_panel_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.documentation_panel_query AS
 WITH document_panels AS (
         SELECT (('document:'::text || lifecycle.document_path) || ':metadata'::text) AS panel_id,
            'metadata'::text AS panel_surface,
            10 AS panel_order,
            'document'::text AS entity_kind,
            lifecycle.document_path AS entity_id,
            lifecycle.title AS entity_label,
            ''::text AS component_id,
            lifecycle.document_path AS source_path,
            'frontmatter'::text AS section_kind,
            10 AS section_order,
            field.field_key,
            field.field_value,
            'text'::text AS value_kind,
            field.field_order,
                CASE
                    WHEN (lifecycle.lifecycle_gap_kind = 'none'::text) THEN 'ready'::text
                    ELSE 'blocked'::text
                END AS panel_state,
            lifecycle.lifecycle_gap_kind AS gap_kind,
            lifecycle.source_content_sha256
           FROM (planning_query_store.documentation_lifecycle_query lifecycle
             CROSS JOIN LATERAL ( VALUES ('title'::text,lifecycle.title,10), ('document_type'::text,lifecycle.document_type,20), ('status'::text,COALESCE(lifecycle.status, ''::text),30), ('canonicality'::text,lifecycle.canonicality,40), ('lifecycle_state'::text,lifecycle.lifecycle_state,50), ('subject_key'::text,COALESCE(lifecycle.subject_key, ''::text),60), ('owner'::text,COALESCE(lifecycle.owner, ''::text),70)) field(field_key, field_value, field_order))
        ), document_section_panels AS (
         SELECT (('document:'::text || document.document_path) || ':sections'::text) AS panel_id,
            'sections'::text AS panel_surface,
            20 AS panel_order,
            'document'::text AS entity_kind,
            document.document_path AS entity_id,
            document.title AS entity_label,
            ''::text AS component_id,
            document.document_path AS source_path,
            'section'::text AS section_kind,
            section.ordinal AS section_order,
            'heading'::text AS field_key,
            section.heading AS field_value,
            'text'::text AS value_kind,
            10 AS field_order,
            'ready'::text AS panel_state,
            'none'::text AS gap_kind,
            document.source_content_sha256
           FROM (planning_query_store.knowledge_document_sections section
             JOIN planning_query_store.knowledge_documents document ON ((document.document_id = section.document_id)))
        ), component_panels AS (
         SELECT (('component:'::text || roadmap.component_id) || ':properties'::text) AS panel_id,
            'properties'::text AS panel_surface,
            30 AS panel_order,
            'component'::text AS entity_kind,
            roadmap.component_id AS entity_id,
            roadmap.component_name AS entity_label,
            roadmap.component_id,
            roadmap.source_path,
            'overview'::text AS section_kind,
            10 AS section_order,
            field.field_key,
            field.field_value,
            'text'::text AS value_kind,
            field.field_order,
                CASE
                    WHEN (roadmap.gap_kind = 'none'::text) THEN 'ready'::text
                    ELSE 'blocked'::text
                END AS panel_state,
            roadmap.gap_kind,
            roadmap.source_content_sha256
           FROM (planning_query_store.component_roadmap_query roadmap
             CROSS JOIN LATERAL ( VALUES ('component_name'::text,roadmap.component_name,10), ('implementation_state'::text,roadmap.implementation_state,20), ('planning_state'::text,roadmap.planning_state,30), ('architecture_status'::text,roadmap.architecture_status,40), ('engineering_quality_state'::text,roadmap.engineering_quality_state,50), ('planned_feature_count'::text,(roadmap.planned_feature_count)::text,60), ('implemented_feature_count'::text,(roadmap.implemented_feature_count)::text,70)) field(field_key, field_value, field_order))
        ), required_section_gaps AS (
         SELECT (('document:'::text || lifecycle.document_path) || ':gaps'::text) AS panel_id,
            'gaps'::text AS panel_surface,
            40 AS panel_order,
            'document'::text AS entity_kind,
            lifecycle.document_path AS entity_id,
            lifecycle.title AS entity_label,
            ''::text AS component_id,
            lifecycle.document_path AS source_path,
            required.section_kind,
            required.section_order,
            'required_section'::text AS field_key,
            required.section_kind AS field_value,
            'text'::text AS value_kind,
            10 AS field_order,
            'blocked'::text AS panel_state,
            'missing_required_section'::text AS gap_kind,
            lifecycle.source_content_sha256
           FROM (((planning_query_store.documentation_lifecycle_query lifecycle
             CROSS JOIN ( VALUES ('overview'::text,10), ('responsibilities'::text,20), ('command-query-rails'::text,30), ('validation'::text,40)) required(section_kind, section_order))
             LEFT JOIN planning_query_store.knowledge_documents document ON ((document.document_path = lifecycle.document_path)))
             LEFT JOIN planning_query_store.knowledge_document_sections section ON (((section.document_id = document.document_id) AND (planning_query_store.documentation_subject_key(section.heading) = required.section_kind))))
          WHERE (((lifecycle.document_path ~~ 'docs/architecture/components/%'::text) OR (lifecycle.document_path ~~ 'docs/planning/proposals/%'::text)) AND (section.section_id IS NULL))
        ), panel_rows AS (
         SELECT document_panels.panel_id,
            document_panels.panel_surface,
            document_panels.panel_order,
            document_panels.entity_kind,
            document_panels.entity_id,
            document_panels.entity_label,
            document_panels.component_id,
            document_panels.source_path,
            document_panels.section_kind,
            document_panels.section_order,
            document_panels.field_key,
            document_panels.field_value,
            document_panels.value_kind,
            document_panels.field_order,
            document_panels.panel_state,
            document_panels.gap_kind,
            document_panels.source_content_sha256
           FROM document_panels
        UNION ALL
         SELECT document_section_panels.panel_id,
            document_section_panels.panel_surface,
            document_section_panels.panel_order,
            document_section_panels.entity_kind,
            document_section_panels.entity_id,
            document_section_panels.entity_label,
            document_section_panels.component_id,
            document_section_panels.source_path,
            document_section_panels.section_kind,
            document_section_panels.section_order,
            document_section_panels.field_key,
            document_section_panels.field_value,
            document_section_panels.value_kind,
            document_section_panels.field_order,
            document_section_panels.panel_state,
            document_section_panels.gap_kind,
            document_section_panels.source_content_sha256
           FROM document_section_panels
        UNION ALL
         SELECT component_panels.panel_id,
            component_panels.panel_surface,
            component_panels.panel_order,
            component_panels.entity_kind,
            component_panels.entity_id,
            component_panels.entity_label,
            component_panels.component_id,
            component_panels.source_path,
            component_panels.section_kind,
            component_panels.section_order,
            component_panels.field_key,
            component_panels.field_value,
            component_panels.value_kind,
            component_panels.field_order,
            component_panels.panel_state,
            component_panels.gap_kind,
            component_panels.source_content_sha256
           FROM component_panels
        UNION ALL
         SELECT required_section_gaps.panel_id,
            required_section_gaps.panel_surface,
            required_section_gaps.panel_order,
            required_section_gaps.entity_kind,
            required_section_gaps.entity_id,
            required_section_gaps.entity_label,
            required_section_gaps.component_id,
            required_section_gaps.source_path,
            required_section_gaps.section_kind,
            required_section_gaps.section_order,
            required_section_gaps.field_key,
            required_section_gaps.field_value,
            required_section_gaps.value_kind,
            required_section_gaps.field_order,
            required_section_gaps.panel_state,
            required_section_gaps.gap_kind,
            required_section_gaps.source_content_sha256
           FROM required_section_gaps
        )
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
    COALESCE(field_value, ''::text) AS field_value,
    value_kind,
    field_order,
    panel_state,
    gap_kind,
    (gap_kind <> 'none'::text) AS is_gap,
    source_content_sha256
   FROM panel_rows;
