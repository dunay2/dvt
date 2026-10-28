--
-- Name: db_governance_surface_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.db_governance_surface_query AS
 SELECT surface_name,
    canonical_source,
    write_rail,
    write_rail_kind,
    read_query_rail,
    projection,
    validation,
    authority_mode,
    source_ref,
    source_content_sha256,
    revision,
    updated_by,
    updated_at,
    raw_surface,
    ((authority_mode = 'database'::text) AND (write_rail_kind = 'db_command'::text)) AS database_write_eligible,
        CASE
            WHEN (authority_mode <> 'database'::text) THEN NULL::text
            WHEN (write_rail_kind = 'db_command'::text) THEN NULL::text
            ELSE 'Database authority requires write_rail_kind=db_command'::text
        END AS database_write_blocker
   FROM planning_query_store.db_governance_surfaces;
