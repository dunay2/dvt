--
-- Name: doc_task_reference_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.doc_task_reference_query AS
 SELECT reference_id,
    document_path,
    reference_text,
    reference_prefix,
    classification,
    occurrence_count,
    sample_lines,
    source_content_sha256,
    raw_reference,
    imported_at
   FROM planning_query_store.doc_task_like_references;


--
-- Name: doc_disposition_action_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.doc_disposition_action_query AS
 SELECT action.action_id,
    action.priority,
    action.action_kind,
    action.document_path,
    document.status AS document_status,
    document.planning_type,
    document.is_active,
    action.reference_text,
    action.reason,
    action.blocking,
    action.evidence,
    action.source_content_sha256,
    action.raw_action,
    action.imported_at,
    COALESCE(resolution.resolution_status, 'pending'::text) AS resolution_status,
    resolution.resolved_by,
    resolution.resolved_at,
    resolution.reason AS resolution_reason
   FROM ((planning_query_store.doc_disposition_actions action
     JOIN planning_query_store.doc_disposition_documents document ON ((document.document_path = action.document_path)))
     LEFT JOIN planning_query_store.doc_resolution_overlays resolution ON (((resolution.resolution_scope = 'docs_disposition'::text) AND (resolution.issue_kind = action.action_kind) AND (COALESCE(resolution.document_path, ''::text) = COALESCE(action.document_path, ''::text)) AND (COALESCE(resolution.reference_text, ''::text) = COALESCE(action.reference_text, ''::text)) AND (resolution.source_content_sha256 = action.source_content_sha256))));


--
-- Name: doc_disposition_document_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.doc_disposition_document_query AS
 SELECT document_path,
    title,
    status,
    planning_type,
    owner,
    is_active,
    is_archive,
    pending_marker_count,
    task_like_reference_count,
    source_content_sha256,
    raw_frontmatter,
    raw_document,
    imported_at
   FROM planning_query_store.doc_disposition_documents;


--
-- Name: knowledge_action_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.knowledge_action_query AS
 SELECT action.action_id,
    document.document_path,
    document.document_type,
    document.mandatory,
    action.summary,
    action.status,
    action.required,
    action.line_number,
    COALESCE(jsonb_agg(jsonb_build_object('targetType', link.target_type, 'targetId', link.target_id, 'relationType', link.relation_type) ORDER BY link.target_type, link.target_id) FILTER (WHERE (link.action_id IS NOT NULL)), '[]'::jsonb) AS links,
    document.source_content_sha256
   FROM ((planning_query_store.knowledge_action_items action
     JOIN planning_query_store.knowledge_documents document ON ((document.document_id = action.source_document_id)))
     LEFT JOIN planning_query_store.knowledge_action_links link ON ((link.action_id = action.action_id)))
  GROUP BY action.action_id, document.document_path, document.document_type, document.mandatory, action.summary, action.status, action.required, action.line_number, document.source_content_sha256;


--
-- Name: knowledge_document_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.knowledge_document_query AS
 SELECT document_id,
    document_path,
    document_type,
    title,
    status,
    planning_type,
    owner,
    mandatory,
    source_content_sha256
   FROM planning_query_store.knowledge_documents;


--
-- Name: knowledge_intake_repository_reference_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.knowledge_intake_repository_reference_query AS
 SELECT target_document.document_path,
    reference.relation_type,
    reference.source_path AS reference_path,
    ownership.leaf_component_id AS reference_component_id,
    ownership.file_role AS reference_file_role,
    COALESCE(NULLIF(source_document.title, ''::text), reference.source_path) AS reference_title,
    COALESCE(source_document.document_type, 'repository_file'::text) AS reference_document_type,
    COALESCE(source_document.source_content_sha256, reference.source_content_sha256) AS reference_source_content_sha256,
    reference.line_number,
    reference.sample_text
   FROM (((planning_query_store.knowledge_intake_repository_references reference
     JOIN planning_query_store.knowledge_documents target_document ON ((target_document.document_path = reference.target_document_path)))
     LEFT JOIN planning_query_store.knowledge_documents source_document ON ((source_document.document_path = reference.source_path)))
     LEFT JOIN planning_query_store.component_engineering_file_ownership_query ownership ON ((ownership.file_path = reference.source_path)))
  WHERE (reference.source_path !~~ 'buzon/%'::text);


--
-- Name: knowledge_intake_retirement_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.knowledge_intake_retirement_query AS
 WITH intake_documents AS (
         SELECT knowledge_documents.document_id,
            knowledge_documents.document_path,
            knowledge_documents.document_type,
            knowledge_documents.title,
            knowledge_documents.status,
            knowledge_documents.planning_type,
            knowledge_documents.owner,
            NULLIF(COALESCE((knowledge_documents.raw_frontmatter ->> 'canonical_disposition'::text), (knowledge_documents.raw_frontmatter ->> 'canonicalDisposition'::text)), ''::text) AS canonical_disposition,
            knowledge_documents.source_content_sha256
           FROM planning_query_store.knowledge_documents
          WHERE (knowledge_documents.document_path ~~ 'buzon/%'::text)
        ), reference_counts AS (
         SELECT document.document_id,
            (count(reference.reference_id))::integer AS inbound_reference_count
           FROM (intake_documents document
             JOIN planning_query_store.knowledge_intake_repository_references reference ON ((reference.target_document_path = document.document_path)))
          WHERE (reference.source_path !~~ 'buzon/%'::text)
          GROUP BY document.document_id
        ), action_counts AS (
         SELECT action.source_document_id AS document_id,
            (count(*))::integer AS action_count,
            (count(*) FILTER (WHERE (lower(COALESCE(action.status, ''::text)) <> ALL (ARRAY['deferred'::text, 'done'::text, 'rejected'::text, 'resolved'::text, 'superseded'::text]))))::integer AS open_action_count
           FROM planning_query_store.knowledge_action_items action
          GROUP BY action.source_document_id
        ), classified AS (
         SELECT document.document_id,
            document.document_path,
            document.document_type,
            document.title,
            document.status,
            document.planning_type,
            document.owner,
            document.canonical_disposition,
            COALESCE(reference_counts.inbound_reference_count, 0) AS inbound_reference_count,
            COALESCE(action_counts.action_count, 0) AS action_count,
            COALESCE(action_counts.open_action_count, 0) AS open_action_count,
                CASE
                    WHEN (document.canonical_disposition IS NOT NULL) THEN 'canonized'::text
                    WHEN (COALESCE(action_counts.open_action_count, 0) > 0) THEN 'open-actions'::text
                    WHEN (COALESCE(reference_counts.inbound_reference_count, 0) > 0) THEN 'referenced'::text
                    ELSE 'unclassified'::text
                END AS retirement_state,
            document.source_content_sha256
           FROM ((intake_documents document
             LEFT JOIN reference_counts ON ((reference_counts.document_id = document.document_id)))
             LEFT JOIN action_counts ON ((action_counts.document_id = document.document_id)))
        )
 SELECT document_id,
    document_path,
    document_type,
    title,
    status,
    planning_type,
    owner,
    canonical_disposition,
    inbound_reference_count,
    action_count,
    open_action_count,
    retirement_state,
    (((('pnpm planning:db:query knowledge-intake --state '::text || quote_literal(retirement_state)) || ' --path '::text) || quote_literal(document_path)) || ' --limit 30'::text) AS suggested_query,
    source_content_sha256
   FROM classified;


--
-- Name: knowledge_mandatory_proposal_binding_gap; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.knowledge_mandatory_proposal_binding_gap AS
 SELECT proposal.proposal_id,
    document.document_path,
    document.title,
    document.status,
    (count(DISTINCT action.action_id))::integer AS required_action_count,
    (count(DISTINCT task_link.action_id))::integer AS linked_task_count,
        CASE
            WHEN (count(DISTINCT action.action_id) = 0) THEN 'mandatory_proposal_without_action'::text
            ELSE 'mandatory_proposal_action_without_task'::text
        END AS gap_kind
   FROM (((planning_query_store.knowledge_proposals proposal
     JOIN planning_query_store.knowledge_documents document ON ((document.document_id = proposal.document_id)))
     LEFT JOIN planning_query_store.knowledge_action_items action ON (((action.source_document_id = document.document_id) AND (action.required = true) AND (action.status <> ALL (ARRAY['deferred'::text, 'rejected'::text, 'superseded'::text, 'done'::text])))))
     LEFT JOIN planning_query_store.knowledge_action_links task_link ON (((task_link.action_id = action.action_id) AND (task_link.target_type = 'task'::text))))
  WHERE (proposal.mandatory = true)
  GROUP BY proposal.proposal_id, document.document_path, document.title, document.status
 HAVING ((count(DISTINCT action.action_id) = 0) OR (count(DISTINCT action.action_id) > count(DISTINCT task_link.action_id)));
