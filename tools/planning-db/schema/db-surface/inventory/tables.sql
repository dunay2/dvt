--
-- Name: db_governance_surface_operations; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.db_governance_surface_operations (
    operation_id text NOT NULL,
    idempotency_key text NOT NULL,
    operation_type text NOT NULL,
    actor text NOT NULL,
    surface_name text NOT NULL,
    source_ref text NOT NULL,
    source_content_sha256 text NOT NULL,
    previous_revision integer NOT NULL,
    resulting_revision integer NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT db_governance_surface_operations_operation_type_check CHECK ((operation_type = 'db_surface_upsert'::text)),
    CONSTRAINT db_governance_surface_operations_previous_revision_check CHECK ((previous_revision >= 0)),
    CONSTRAINT db_governance_surface_operations_resulting_revision_check CHECK ((resulting_revision >= 0)),
    CONSTRAINT db_governance_surface_operations_source_content_sha256_check CHECK ((source_content_sha256 ~ '^[a-f0-9]{64}$'::text))
);


--
-- Name: db_governance_surfaces; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.db_governance_surfaces (
    surface_name text NOT NULL,
    canonical_source text NOT NULL,
    write_rail text NOT NULL,
    write_rail_kind text NOT NULL,
    read_query_rail text NOT NULL,
    projection text NOT NULL,
    validation text NOT NULL,
    authority_mode text NOT NULL,
    source_ref text NOT NULL,
    source_content_sha256 text NOT NULL,
    revision integer DEFAULT 0 NOT NULL,
    updated_by text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    raw_surface jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT db_governance_surfaces_authority_mode_check CHECK ((authority_mode = ANY (ARRAY['repository-export'::text, 'database'::text, 'generated'::text, 'git-indexed'::text, 'hybrid-indexed'::text]))),
    CONSTRAINT db_governance_surfaces_database_write_check CHECK (((authority_mode <> 'database'::text) OR (write_rail_kind = 'db_command'::text))),
    CONSTRAINT db_governance_surfaces_revision_check CHECK ((revision >= 0)),
    CONSTRAINT db_governance_surfaces_source_content_sha256_check CHECK ((source_content_sha256 ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT db_governance_surfaces_write_rail_kind_check CHECK ((write_rail_kind = ANY (ARRAY['db_command'::text, 'import'::text, 'git_edit'::text, 'generated'::text, 'none'::text, 'bootstrap_export'::text])))
);
