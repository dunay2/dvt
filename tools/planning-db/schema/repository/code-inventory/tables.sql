--
-- Name: code_symbols; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.code_symbols (
    symbol_id text NOT NULL,
    source_path text NOT NULL,
    source_content_sha256 text NOT NULL,
    file_path text NOT NULL,
    component_id text,
    owning_unit text,
    root_unit text,
    domain_unit text,
    symbol_name text NOT NULL,
    symbol_kind text NOT NULL,
    export_kind text DEFAULT 'internal'::text NOT NULL,
    signature text NOT NULL,
    signature_sha256 text NOT NULL,
    start_line integer NOT NULL,
    end_line integer NOT NULL,
    body_sha256 text NOT NULL,
    normalized_body_length integer NOT NULL,
    import_refs jsonb DEFAULT '[]'::jsonb NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    raw_symbol jsonb DEFAULT '{}'::jsonb NOT NULL,
    imported_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: repository_commands; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.repository_commands (
    command_id text NOT NULL,
    command_type text NOT NULL,
    command_name text,
    command_path text,
    command_text text,
    domain text NOT NULL,
    sensitivity text NOT NULL,
    runtime_fanout boolean DEFAULT false NOT NULL,
    changed_file_validation_relevant boolean DEFAULT true NOT NULL,
    referenced_files jsonb DEFAULT '[]'::jsonb NOT NULL,
    source_path text NOT NULL,
    source_content_sha256 text NOT NULL,
    raw_command jsonb NOT NULL,
    imported_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT repository_commands_command_type_check CHECK ((command_type = ANY (ARRAY['package_script'::text, 'command_file'::text])))
);
