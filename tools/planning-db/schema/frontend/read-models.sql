--
-- Name: frontend_component_effective_component_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.frontend_component_effective_component_query AS
 SELECT imported.component_id,
    imported.component_name,
    imported.component_kind,
    imported.component_status,
    imported.reuse_decision,
    imported.frontend_owner,
    imported.responsibility,
    imported.package_name,
    imported.route_scope,
    imported.plugin_scope,
    imported.capability_gaps,
    imported.evidence_refs,
    imported.source_path,
    imported.source_content_sha256,
    imported.raw_component,
    imported.imported_at
   FROM planning_query_store.frontend_components imported
  WHERE (NOT (EXISTS ( SELECT 1
           FROM planning_query_store.frontend_component_local_components local_component
          WHERE (local_component.component_id = imported.component_id))))
UNION ALL
 SELECT local_component.component_id,
    local_component.component_name,
    local_component.component_kind,
    local_component.component_status,
    local_component.reuse_decision,
    local_component.frontend_owner,
    local_component.responsibility,
    local_component.package_name,
    local_component.route_scope,
    local_component.plugin_scope,
    local_component.capability_gaps,
    local_component.evidence_refs,
    local_component.source_path,
    local_component.source_content_sha256,
    local_component.raw_component,
    local_component.created_at AS imported_at
   FROM planning_query_store.frontend_component_local_components local_component;


--
-- Name: frontend_component_file_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.frontend_component_file_query AS
 WITH effective_files AS (
         SELECT imported.component_id,
            imported.file_path,
            imported.file_role,
            imported.exported_symbol,
            imported.raw_file,
            NULL::text AS source_path,
            NULL::text AS source_content_sha256
           FROM planning_query_store.frontend_component_files imported
          WHERE (NOT (EXISTS ( SELECT 1
                   FROM planning_query_store.frontend_component_local_files local_file
                  WHERE ((local_file.component_id = imported.component_id) AND (local_file.file_path = imported.file_path) AND (local_file.file_role = imported.file_role)))))
        UNION ALL
         SELECT local_file.component_id,
            local_file.file_path,
            local_file.file_role,
            local_file.exported_symbol,
            local_file.raw_file,
            local_file.source_path,
            local_file.source_content_sha256
           FROM planning_query_store.frontend_component_local_files local_file
        )
 SELECT file_ref.component_id,
    component.component_name,
    file_ref.file_path,
    file_ref.file_role,
    file_ref.exported_symbol,
    component.component_status,
    COALESCE(file_ref.source_path, component.source_path) AS source_path,
    COALESCE(file_ref.source_content_sha256, component.source_content_sha256) AS source_content_sha256
   FROM (effective_files file_ref
     JOIN planning_query_store.frontend_component_effective_component_query component ON ((component.component_id = file_ref.component_id)))
  WHERE ((NOT COALESCE(((file_ref.raw_file ->> 'retiredForContextActionCatalog'::text))::boolean, false)) AND (NOT COALESCE(((file_ref.raw_file ->> 'retiredForPresentationOwnership'::text))::boolean, false)) AND (NOT COALESCE(((file_ref.raw_file ->> 'retiredForEdgeAuthoringOwnership'::text))::boolean, false)) AND (NOT COALESCE(((file_ref.raw_file ->> 'retiredForSourceImportCatalogOwnership'::text))::boolean, false)) AND (NOT COALESCE(((file_ref.raw_file ->> 'retiredForSourceImportStepOwnership'::text))::boolean, false)) AND (NOT COALESCE(((file_ref.raw_file ->> 'retiredForSourceImportSharedOwnership'::text))::boolean, false)));


--
-- Name: frontend_component_capability_gap_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.frontend_component_capability_gap_query AS
 SELECT gap.component_id,
    component.component_name,
    gap.gap_id,
    gap.gap_kind,
    gap.gap_status,
    gap.description,
    gap.owning_task_id,
    gap.source_path,
    gap.source_content_sha256
   FROM (planning_query_store.frontend_component_capability_gaps gap
     LEFT JOIN planning_query_store.frontend_component_effective_component_query component ON ((component.component_id = gap.component_id)));


--
-- Name: frontend_component_rail_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.frontend_component_rail_query AS
 WITH effective_rails AS (
         SELECT imported.component_id,
            imported.rail_name,
            imported.rail_kind,
            imported.rail_status,
            imported.raw_rail,
            NULL::text AS source_path,
            NULL::text AS source_content_sha256
           FROM planning_query_store.frontend_component_cq_rails imported
          WHERE (NOT (EXISTS ( SELECT 1
                   FROM planning_query_store.frontend_component_local_cq_rails local_rail
                  WHERE ((local_rail.component_id = imported.component_id) AND (local_rail.rail_name = imported.rail_name)))))
        UNION ALL
         SELECT local_rail.component_id,
            local_rail.rail_name,
            local_rail.rail_kind,
            local_rail.rail_status,
            local_rail.raw_rail,
            local_rail.source_path,
            local_rail.source_content_sha256
           FROM planning_query_store.frontend_component_local_cq_rails local_rail
        )
 SELECT rail.component_id,
    component.component_name,
    rail.rail_name,
    rail.rail_kind,
    rail.rail_status,
    component.component_status,
    COALESCE(rail.source_path, component.source_path) AS source_path,
    COALESCE(rail.source_content_sha256, component.source_content_sha256) AS source_content_sha256
   FROM (effective_rails rail
     JOIN planning_query_store.frontend_component_effective_component_query component ON ((component.component_id = rail.component_id)))
  WHERE (NOT COALESCE(((rail.raw_rail ->> 'retiredForContextActionCatalog'::text))::boolean, false));


--
-- Name: frontend_component_context_action_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.frontend_component_context_action_query AS
 WITH canonical_rails AS (
         SELECT DISTINCT ON (rail_1.normalized_rail_name) rail_1.normalized_rail_name,
            rail_1.rail_name,
            rail_1.rail_type,
            rail_1.rail_status,
            rail_1.ddd_owner,
            rail_1.source_path,
            rail_1.source_content_sha256
           FROM planning_query_store.command_query_rail_query rail_1
          WHERE (lower(COALESCE(rail_1.rail_status, ''::text)) <> ALL (ARRAY['deprecated'::text, 'retired'::text]))
          ORDER BY rail_1.normalized_rail_name,
                CASE lower(COALESCE(rail_1.rail_status, ''::text))
                    WHEN 'implemented'::text THEN 0
                    WHEN 'accepted'::text THEN 1
                    WHEN 'declared'::text THEN 2
                    ELSE 3
                END,
                CASE
                    WHEN (rail_1.rail_source = 'local'::text) THEN 0
                    ELSE 1
                END, rail_1.source_path
        )
 SELECT action.component_id,
    component.component_name,
    action.context_id,
    context.context_kind,
    action.action_id,
    action.action_label,
    action.action_kind,
    action.action_status,
    action.rail_name,
    COALESCE(rail.rail_kind, canonical_rail.rail_type) AS frontend_rail_kind,
    COALESCE(rail.rail_status, canonical_rail.rail_status) AS frontend_rail_status,
    action.action_order,
    action.source_path,
    action.source_content_sha256,
    canonical_rail.rail_name AS canonical_rail_name,
    canonical_rail.ddd_owner AS canonical_rail_owner
   FROM ((((planning_query_store.frontend_component_context_actions action
     LEFT JOIN planning_query_store.frontend_component_effective_component_query component ON ((component.component_id = action.component_id)))
     LEFT JOIN planning_query_store.frontend_component_contexts context ON (((context.component_id = action.component_id) AND (context.context_id = action.context_id))))
     LEFT JOIN planning_query_store.frontend_component_rail_query rail ON (((rail.component_id = action.component_id) AND (rail.rail_name = action.rail_name))))
     LEFT JOIN canonical_rails canonical_rail ON ((canonical_rail.normalized_rail_name = lower(COALESCE(action.rail_name, ''::text)))));


--
-- Name: frontend_component_context_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.frontend_component_context_query AS
 SELECT context.component_id,
    component.component_name,
    context.context_id,
    context.context_kind,
    context.context_status,
    context.responsibility,
    context.source_path,
    context.source_content_sha256
   FROM (planning_query_store.frontend_component_contexts context
     LEFT JOIN planning_query_store.frontend_component_effective_component_query component ON ((component.component_id = context.component_id)));


--
-- Name: frontend_component_plugin_scope_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.frontend_component_plugin_scope_query AS
 SELECT scope.component_id,
    component.component_name,
    scope.plugin_id,
    scope.scope_status,
    scope.source_path,
    scope.source_content_sha256
   FROM (planning_query_store.frontend_component_plugin_scopes scope
     LEFT JOIN planning_query_store.frontend_component_effective_component_query component ON ((component.component_id = scope.component_id)));


--
-- Name: frontend_component_surface_link_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.frontend_component_surface_link_query AS
 WITH effective_links AS (
         SELECT imported.component_id,
            imported.surface_id,
            imported.route_path,
            imported.placement_kind,
            imported.placement_order,
            imported.raw_link,
            NULL::text AS source_path,
            NULL::text AS source_content_sha256
           FROM planning_query_store.frontend_surface_component_links imported
          WHERE (NOT (EXISTS ( SELECT 1
                   FROM planning_query_store.frontend_component_local_surface_links local_link
                  WHERE ((local_link.component_id = imported.component_id) AND (local_link.surface_id = imported.surface_id) AND (local_link.placement_kind = imported.placement_kind)))))
        UNION ALL
         SELECT local_link.component_id,
            local_link.surface_id,
            local_link.route_path,
            local_link.placement_kind,
            local_link.placement_order,
            local_link.raw_link,
            local_link.source_path,
            local_link.source_content_sha256
           FROM planning_query_store.frontend_component_local_surface_links local_link
        )
 SELECT link.component_id,
    component.component_name,
    link.surface_id,
    link.route_path,
    link.placement_kind,
    link.placement_order,
    component.component_status,
    COALESCE(link.source_path, component.source_path) AS source_path,
    COALESCE(link.source_content_sha256, component.source_content_sha256) AS source_content_sha256
   FROM (effective_links link
     JOIN planning_query_store.frontend_component_effective_component_query component ON ((component.component_id = link.component_id)));


--
-- Name: frontend_component_validation_evidence_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.frontend_component_validation_evidence_query AS
 SELECT evidence.component_id,
    component.component_name,
    evidence.evidence_id,
    evidence.evidence_kind,
    evidence.evidence_status,
    evidence.evidence_ref,
    evidence.rail_name,
    evidence.context_id,
    evidence.proves,
    evidence.source_path,
    evidence.source_content_sha256
   FROM (planning_query_store.frontend_component_validation_evidence evidence
     LEFT JOIN planning_query_store.frontend_component_effective_component_query component ON ((component.component_id = evidence.component_id)));


--
-- Name: frontend_mechanical_truth_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.frontend_mechanical_truth_query AS
 SELECT surface_id,
    surface_kind,
    route_path,
    screen_state,
    frontend_owner,
    registered_plugins,
    consumed_endpoints,
    zustand_stores,
    tanstack_queries,
    visible_no_backend_affordances,
    capability_gaps,
    evidence_refs,
    jsonb_array_length(registered_plugins) AS registered_plugin_count,
    jsonb_array_length(consumed_endpoints) AS consumed_endpoint_count,
    jsonb_array_length(zustand_stores) AS zustand_store_count,
    jsonb_array_length(tanstack_queries) AS tanstack_query_count,
    jsonb_array_length(visible_no_backend_affordances) AS no_backend_affordance_count,
    jsonb_array_length(capability_gaps) AS capability_gap_count,
    jsonb_array_length(evidence_refs) AS evidence_ref_count,
    source_path,
    source_content_sha256,
    imported_at
   FROM planning_query_store.frontend_mechanical_truth_surfaces;
