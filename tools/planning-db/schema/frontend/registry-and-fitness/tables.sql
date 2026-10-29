--
-- Name: frontend_component_local_components; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.frontend_component_local_components (
    component_id text NOT NULL,
    component_name text NOT NULL,
    component_kind text NOT NULL,
    component_status text NOT NULL,
    reuse_decision text NOT NULL,
    frontend_owner text NOT NULL,
    responsibility text NOT NULL,
    package_name text DEFAULT '@dvt/web'::text NOT NULL,
    route_scope text,
    plugin_scope text,
    capability_gaps jsonb DEFAULT '[]'::jsonb NOT NULL,
    evidence_refs jsonb DEFAULT '[]'::jsonb NOT NULL,
    source_path text NOT NULL,
    source_content_sha256 text NOT NULL,
    raw_component jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT frontend_component_local_components_kind_check CHECK ((component_kind = ANY (ARRAY['shell-frame'::text, 'shell-bar'::text, 'navigation'::text, 'health-banner'::text, 'console-drawer'::text, 'route-workbench'::text, 'route-toolbar'::text, 'state-view'::text, 'canvas-viewport'::text, 'canvas-explorer'::text, 'canvas-inspector'::text, 'modal'::text, 'form'::text, 'query-view'::text, 'table'::text, 'tab-strip'::text, 'primary-surface'::text, 'context-panel'::text, 'icon-wrapper'::text]))),
    CONSTRAINT frontend_component_local_components_reuse_decision_check CHECK ((reuse_decision = ANY (ARRAY['reuse'::text, 'extract'::text, 'create'::text, 'harden'::text, 'standardize'::text, 'retire'::text]))),
    CONSTRAINT frontend_component_local_components_status_check CHECK ((component_status = ANY (ARRAY['current'::text, 'needed'::text, 'planned'::text, 'partial'::text, 'experimental'::text, 'retire'::text])))
);


--
-- Name: frontend_components; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.frontend_components (
    component_id text NOT NULL,
    component_name text NOT NULL,
    component_kind text NOT NULL,
    component_status text NOT NULL,
    reuse_decision text NOT NULL,
    frontend_owner text NOT NULL,
    responsibility text NOT NULL,
    package_name text DEFAULT '@dvt/web'::text NOT NULL,
    route_scope text,
    plugin_scope text,
    capability_gaps jsonb DEFAULT '[]'::jsonb NOT NULL,
    evidence_refs jsonb DEFAULT '[]'::jsonb NOT NULL,
    source_path text NOT NULL,
    source_content_sha256 text NOT NULL,
    raw_component jsonb DEFAULT '{}'::jsonb NOT NULL,
    imported_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT frontend_components_kind_check CHECK ((component_kind = ANY (ARRAY['shell-frame'::text, 'shell-bar'::text, 'navigation'::text, 'health-banner'::text, 'console-drawer'::text, 'operational-drawer'::text, 'route-workbench'::text, 'route-toolbar'::text, 'state-view'::text, 'canvas-viewport'::text, 'canvas-explorer'::text, 'canvas-inspector'::text, 'modal'::text, 'form'::text, 'query-view'::text, 'table'::text, 'tab-strip'::text, 'primary-surface'::text, 'context-panel'::text, 'icon-wrapper'::text]))),
    CONSTRAINT frontend_components_reuse_decision_check CHECK ((reuse_decision = ANY (ARRAY['reuse'::text, 'extract'::text, 'create'::text, 'harden'::text, 'standardize'::text, 'retire'::text]))),
    CONSTRAINT frontend_components_status_check CHECK ((component_status = ANY (ARRAY['current'::text, 'needed'::text, 'planned'::text, 'partial'::text, 'experimental'::text, 'retire'::text])))
);


--
-- Name: frontend_component_files; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.frontend_component_files (
    component_id text NOT NULL,
    file_path text NOT NULL,
    file_role text NOT NULL,
    exported_symbol text,
    raw_file jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT frontend_component_files_role_check CHECK ((file_role = ANY (ARRAY['component'::text, 'view'::text, 'hook'::text, 'store'::text, 'port'::text, 'adapter'::text, 'query'::text, 'model'::text, 'view-model'::text, 'tokens'::text, 'test'::text, 'architecture-test'::text, 'e2e-test'::text, 'documentation'::text])))
);


--
-- Name: frontend_component_local_files; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.frontend_component_local_files (
    component_id text NOT NULL,
    file_path text NOT NULL,
    file_role text NOT NULL,
    exported_symbol text,
    raw_file jsonb DEFAULT '{}'::jsonb NOT NULL,
    source_path text NOT NULL,
    source_content_sha256 text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: canvas_uxdb_specification_records; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.canvas_uxdb_specification_records (
    record_id text NOT NULL,
    record_type text NOT NULL,
    record_title text NOT NULL,
    canonical_task_id text NOT NULL,
    component_id text NOT NULL,
    rail_name text NOT NULL,
    spec_state text NOT NULL,
    legacy_posture text NOT NULL,
    source_path text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: frontend_component_capability_gaps; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.frontend_component_capability_gaps (
    component_id text NOT NULL,
    gap_id text NOT NULL,
    gap_kind text NOT NULL,
    gap_status text NOT NULL,
    description text NOT NULL,
    owning_task_id text,
    raw_gap jsonb DEFAULT '{}'::jsonb NOT NULL,
    source_path text NOT NULL,
    source_content_sha256 text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT frontend_component_capability_gaps_status_check CHECK ((gap_status = ANY (ARRAY['open'::text, 'planned'::text, 'closed'::text, 'moved'::text])))
);


--
-- Name: frontend_component_context_actions; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.frontend_component_context_actions (
    component_id text NOT NULL,
    context_id text NOT NULL,
    action_id text NOT NULL,
    action_label text NOT NULL,
    action_kind text NOT NULL,
    action_status text NOT NULL,
    rail_name text,
    action_order integer DEFAULT 0 NOT NULL,
    raw_action jsonb DEFAULT '{}'::jsonb NOT NULL,
    source_path text NOT NULL,
    source_content_sha256 text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT frontend_component_context_actions_kind_check CHECK ((action_kind = ANY (ARRAY['host-render'::text, 'authoring'::text, 'import'::text, 'validation'::text, 'settings'::text, 'edge-mutation'::text, 'node-workbench'::text, 'selection-operation'::text, 'run-preview'::text]))),
    CONSTRAINT frontend_component_context_actions_status_check CHECK ((action_status = ANY (ARRAY['valid'::text, 'planned'::text, 'gap'::text, 'moved-to-add-node-catalog'::text, 'moved-to-run-preview'::text, 'retired'::text])))
);


--
-- Name: frontend_component_contexts; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.frontend_component_contexts (
    component_id text NOT NULL,
    context_id text NOT NULL,
    context_kind text NOT NULL,
    context_status text NOT NULL,
    responsibility text NOT NULL,
    raw_context jsonb DEFAULT '{}'::jsonb NOT NULL,
    source_path text NOT NULL,
    source_content_sha256 text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT frontend_component_contexts_kind_check CHECK ((context_kind = ANY (ARRAY['host'::text, 'canvas-background'::text, 'add-node-catalog'::text, 'edge'::text, 'node'::text, 'selection'::text, 'run-preview'::text]))),
    CONSTRAINT frontend_component_contexts_status_check CHECK ((context_status = ANY (ARRAY['current'::text, 'planned'::text, 'partial'::text, 'retired'::text, 'moved'::text])))
);


--
-- Name: frontend_component_cq_rails; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.frontend_component_cq_rails (
    component_id text NOT NULL,
    rail_name text NOT NULL,
    rail_kind text NOT NULL,
    rail_status text NOT NULL,
    raw_rail jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT frontend_component_cq_rails_kind_check CHECK ((rail_kind = ANY (ARRAY['command'::text, 'query'::text, 'projection'::text, 'local-command'::text, 'local-query'::text, 'command-probe'::text]))),
    CONSTRAINT frontend_component_cq_rails_status_check CHECK ((rail_status = ANY (ARRAY['implemented-api'::text, 'implemented-local'::text, 'implemented-projection'::text, 'partial-ui'::text, 'fail-closed'::text, 'gap-needed'::text, 'not-front-default'::text])))
);


--
-- Name: frontend_component_local_cq_rails; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.frontend_component_local_cq_rails (
    component_id text NOT NULL,
    rail_name text NOT NULL,
    rail_kind text NOT NULL,
    rail_status text NOT NULL,
    raw_rail jsonb DEFAULT '{}'::jsonb NOT NULL,
    source_path text NOT NULL,
    source_content_sha256 text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: frontend_component_evidence; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.frontend_component_evidence (
    evidence_id text NOT NULL,
    component_id text NOT NULL,
    evidence_kind text NOT NULL,
    evidence_ref text NOT NULL,
    evidence_status text NOT NULL,
    raw_evidence jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: frontend_component_local_evidence; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.frontend_component_local_evidence (
    evidence_id text NOT NULL,
    component_id text NOT NULL,
    evidence_kind text NOT NULL,
    evidence_ref text NOT NULL,
    evidence_status text NOT NULL,
    raw_evidence jsonb DEFAULT '{}'::jsonb NOT NULL,
    source_path text NOT NULL,
    source_content_sha256 text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: frontend_component_local_surface_links; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.frontend_component_local_surface_links (
    component_id text NOT NULL,
    surface_id text NOT NULL,
    route_path text,
    placement_kind text NOT NULL,
    placement_order integer,
    raw_link jsonb DEFAULT '{}'::jsonb NOT NULL,
    source_path text NOT NULL,
    source_content_sha256 text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: frontend_component_plugin_scopes; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.frontend_component_plugin_scopes (
    component_id text NOT NULL,
    plugin_id text NOT NULL,
    scope_status text NOT NULL,
    raw_scope jsonb DEFAULT '{}'::jsonb NOT NULL,
    source_path text NOT NULL,
    source_content_sha256 text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT frontend_component_plugin_scopes_status_check CHECK ((scope_status = ANY (ARRAY['current'::text, 'planned'::text, 'retired'::text])))
);


--
-- Name: frontend_surface_component_links; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.frontend_surface_component_links (
    component_id text NOT NULL,
    surface_id text NOT NULL,
    route_path text,
    placement_kind text NOT NULL,
    placement_order integer,
    raw_link jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: frontend_component_validation_evidence; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.frontend_component_validation_evidence (
    component_id text NOT NULL,
    evidence_id text NOT NULL,
    evidence_kind text NOT NULL,
    evidence_status text NOT NULL,
    evidence_ref text NOT NULL,
    rail_name text,
    context_id text,
    proves text NOT NULL,
    raw_evidence jsonb DEFAULT '{}'::jsonb NOT NULL,
    source_path text NOT NULL,
    source_content_sha256 text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT frontend_component_validation_evidence_kind_check CHECK ((evidence_kind = ANY (ARRAY['unit-test'::text, 'presentation-test'::text, 'architecture-test'::text, 'integration-test'::text, 'e2e-test'::text]))),
    CONSTRAINT frontend_component_validation_evidence_status_check CHECK ((evidence_status = ANY (ARRAY['current'::text, 'stale'::text, 'gap'::text])))
);


--
-- Name: frontend_mechanical_truth_surfaces; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.frontend_mechanical_truth_surfaces (
    surface_id text NOT NULL,
    surface_kind text NOT NULL,
    route_path text NOT NULL,
    screen_state text NOT NULL,
    frontend_owner text NOT NULL,
    registered_plugins jsonb DEFAULT '[]'::jsonb NOT NULL,
    consumed_endpoints jsonb DEFAULT '[]'::jsonb NOT NULL,
    zustand_stores jsonb DEFAULT '[]'::jsonb NOT NULL,
    tanstack_queries jsonb DEFAULT '[]'::jsonb NOT NULL,
    visible_no_backend_affordances jsonb DEFAULT '[]'::jsonb NOT NULL,
    capability_gaps jsonb DEFAULT '[]'::jsonb NOT NULL,
    evidence_refs jsonb DEFAULT '[]'::jsonb NOT NULL,
    source_path text NOT NULL,
    source_content_sha256 text NOT NULL,
    raw_surface jsonb NOT NULL,
    imported_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT frontend_mechanical_truth_surfaces_kind_check CHECK ((surface_kind = ANY (ARRAY['route'::text, 'plugin'::text, 'affordance'::text]))),
    CONSTRAINT frontend_mechanical_truth_surfaces_state_check CHECK ((screen_state = ANY (ARRAY['operational-product'::text, 'preview'::text, 'disabled-unsupported'::text, 'experimental'::text])))
);
