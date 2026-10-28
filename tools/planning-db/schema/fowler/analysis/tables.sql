--
-- Name: fowler_analysis_dispositions; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.fowler_analysis_dispositions (
    document_path text NOT NULL,
    disposition_status text NOT NULL,
    disposition_kind text NOT NULL,
    canonical_target_path text,
    reason text NOT NULL,
    source_content_sha256 text NOT NULL,
    recorded_by text NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    raw_disposition jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT fowler_analysis_dispositions_status_check CHECK ((disposition_status = ANY (ARRAY['proposed'::text, 'accepted'::text, 'rejected'::text, 'superseded'::text])))
);


--
-- Name: fowler_analysis_canonical_targets; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.fowler_analysis_canonical_targets (
    document_path text NOT NULL,
    target_path text NOT NULL,
    target_kind text DEFAULT 'canonical_document'::text NOT NULL,
    target_status text NOT NULL,
    reason text NOT NULL,
    source_content_sha256 text NOT NULL,
    linked_by text NOT NULL,
    linked_at timestamp with time zone DEFAULT now() NOT NULL,
    raw_target jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT fowler_analysis_canonical_targets_status_check CHECK ((target_status = ANY (ARRAY['proposed'::text, 'accepted'::text, 'rejected'::text, 'superseded'::text])))
);


--
-- Name: fowler_analysis_reference_resolutions; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.fowler_analysis_reference_resolutions (
    document_path text NOT NULL,
    reference_path text NOT NULL,
    relation_type text NOT NULL,
    resolution_status text NOT NULL,
    canonical_target_path text,
    reason text NOT NULL,
    source_content_sha256 text NOT NULL,
    resolved_by text NOT NULL,
    resolved_at timestamp with time zone DEFAULT now() NOT NULL,
    raw_resolution jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT fowler_analysis_reference_resolutions_status_check CHECK ((resolution_status = ANY (ARRAY['resolved'::text, 'obsolete'::text, 'replaced'::text, 'blocked'::text, 'ignored'::text])))
);


--
-- Name: fowler_analysis_retirement_decisions; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.fowler_analysis_retirement_decisions (
    document_path text NOT NULL,
    decision_status text NOT NULL,
    reason text NOT NULL,
    source_content_sha256 text NOT NULL,
    decided_by text NOT NULL,
    decided_at timestamp with time zone DEFAULT now() NOT NULL,
    raw_decision jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT fowler_analysis_retirement_decisions_status_check CHECK ((decision_status = ANY (ARRAY['approved'::text, 'rejected'::text, 'blocked'::text])))
);


--
-- Name: fowler_analysis_operations; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.fowler_analysis_operations (
    operation_id text NOT NULL,
    idempotency_key text NOT NULL,
    operation_type text NOT NULL,
    actor text NOT NULL,
    document_path text NOT NULL,
    target_path text,
    reference_path text,
    relation_type text,
    source_content_sha256 text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT fowler_analysis_operations_type_check CHECK ((operation_type = ANY (ARRAY['fowler_analysis_disposition_record'::text, 'fowler_analysis_canonical_target_link'::text, 'fowler_analysis_reference_resolve'::text, 'fowler_analysis_retirement_approve'::text])))
);
