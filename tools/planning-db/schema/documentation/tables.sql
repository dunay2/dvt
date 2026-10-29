--
-- Name: doc_resolution_overlays; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.doc_resolution_overlays (
    resolution_key text NOT NULL,
    resolution_scope text NOT NULL,
    issue_kind text NOT NULL,
    document_path text,
    reference_text text,
    resolution_status text NOT NULL,
    resolved_by text NOT NULL,
    resolved_at timestamp with time zone DEFAULT now() NOT NULL,
    reason text NOT NULL,
    source_content_sha256 text,
    raw_resolution jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT doc_resolution_overlays_resolution_scope_check CHECK ((resolution_scope = 'docs_disposition'::text)),
    CONSTRAINT doc_resolution_overlays_resolution_status_check CHECK ((resolution_status = ANY (ARRAY['resolved'::text, 'accepted'::text, 'ignored'::text, 'linked'::text]))),
    CONSTRAINT doc_resolution_overlays_source_content_sha256_check CHECK (((source_content_sha256 IS NULL) OR (source_content_sha256 ~ '^[a-f0-9]{64}$'::text)))
);


--
-- Name: knowledge_documents; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.knowledge_documents (
    document_id text NOT NULL,
    document_path text NOT NULL,
    document_type text NOT NULL,
    title text NOT NULL,
    status text,
    planning_type text,
    owner text,
    mandatory boolean DEFAULT false NOT NULL,
    source_content_sha256 text NOT NULL,
    raw_frontmatter jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: knowledge_action_items; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.knowledge_action_items (
    action_id text NOT NULL,
    source_document_id text NOT NULL,
    source_section_id text,
    summary text NOT NULL,
    status text NOT NULL,
    required boolean DEFAULT false NOT NULL,
    line_number integer
);


--
-- Name: knowledge_document_links; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.knowledge_document_links (
    from_document_id text NOT NULL,
    to_document_id text NOT NULL,
    relation_type text NOT NULL
);


--
-- Name: knowledge_intake_repository_references; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.knowledge_intake_repository_references (
    reference_id text NOT NULL,
    target_document_path text NOT NULL,
    source_path text NOT NULL,
    relation_type text NOT NULL,
    line_number integer NOT NULL,
    sample_text text NOT NULL,
    source_content_sha256 text NOT NULL,
    raw_reference jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: knowledge_document_sections; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.knowledge_document_sections (
    section_id text NOT NULL,
    document_id text NOT NULL,
    heading text NOT NULL,
    heading_level integer NOT NULL,
    ordinal integer NOT NULL,
    anchor text NOT NULL,
    start_line integer NOT NULL
);


--
-- Name: doc_task_like_references; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.doc_task_like_references (
    reference_id text NOT NULL,
    document_path text NOT NULL,
    reference_text text NOT NULL,
    reference_prefix text NOT NULL,
    classification text NOT NULL,
    occurrence_count integer NOT NULL,
    sample_lines jsonb DEFAULT '[]'::jsonb NOT NULL,
    source_content_sha256 text NOT NULL,
    raw_reference jsonb NOT NULL,
    imported_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: doc_disposition_actions; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.doc_disposition_actions (
    action_id text NOT NULL,
    priority text NOT NULL,
    action_kind text NOT NULL,
    document_path text NOT NULL,
    reference_text text,
    reason text NOT NULL,
    blocking boolean DEFAULT false NOT NULL,
    evidence jsonb DEFAULT '{}'::jsonb NOT NULL,
    source_content_sha256 text NOT NULL,
    raw_action jsonb NOT NULL,
    imported_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: doc_disposition_documents; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.doc_disposition_documents (
    document_path text NOT NULL,
    title text,
    status text,
    planning_type text,
    owner text,
    is_active boolean NOT NULL,
    is_archive boolean NOT NULL,
    pending_marker_count integer DEFAULT 0 NOT NULL,
    task_like_reference_count integer DEFAULT 0 NOT NULL,
    source_content_sha256 text NOT NULL,
    raw_frontmatter jsonb DEFAULT '{}'::jsonb NOT NULL,
    raw_document jsonb NOT NULL,
    imported_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: doc_disposition_markers; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.doc_disposition_markers (
    marker_id text NOT NULL,
    document_path text NOT NULL,
    marker_kind text NOT NULL,
    occurrence_count integer NOT NULL,
    sample_lines jsonb DEFAULT '[]'::jsonb NOT NULL,
    source_content_sha256 text NOT NULL,
    raw_marker jsonb NOT NULL,
    imported_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: doc_resolution_operations; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.doc_resolution_operations (
    operation_id text NOT NULL,
    idempotency_key text NOT NULL,
    operation_type text NOT NULL,
    actor text NOT NULL,
    resolution_key text NOT NULL,
    resolution_scope text NOT NULL,
    issue_kind text NOT NULL,
    document_path text,
    reference_text text,
    lane_id text,
    task_id text,
    resolution_status text NOT NULL,
    source_content_sha256 text,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT doc_resolution_operations_operation_type_check CHECK ((operation_type = 'docs_disposition_resolve'::text)),
    CONSTRAINT doc_resolution_operations_resolution_scope_check CHECK ((resolution_scope = 'docs_disposition'::text)),
    CONSTRAINT doc_resolution_operations_resolution_status_check CHECK ((resolution_status = ANY (ARRAY['resolved'::text, 'accepted'::text, 'ignored'::text, 'linked'::text]))),
    CONSTRAINT doc_resolution_operations_source_content_sha256_check CHECK (((source_content_sha256 IS NULL) OR (source_content_sha256 ~ '^[a-f0-9]{64}$'::text)))
);


--
-- Name: knowledge_action_links; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.knowledge_action_links (
    action_id text NOT NULL,
    target_type text NOT NULL,
    target_id text NOT NULL,
    relation_type text NOT NULL
);


--
-- Name: knowledge_findings; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.knowledge_findings (
    finding_id text NOT NULL,
    document_id text NOT NULL,
    section_id text,
    severity text,
    summary text NOT NULL,
    rationale text,
    status text DEFAULT 'open'::text NOT NULL
);


--
-- Name: knowledge_proposals; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.knowledge_proposals (
    proposal_id text NOT NULL,
    document_id text NOT NULL,
    proposal_status text NOT NULL,
    mandatory boolean DEFAULT false NOT NULL,
    decision_state text NOT NULL
);
