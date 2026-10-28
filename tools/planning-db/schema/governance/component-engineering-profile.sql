--
-- Name: governance_component_engineering_record_v2_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.governance_component_engineering_record_v2_query AS
 WITH components AS (
         SELECT component_engineering_component_query.component_id,
            component_engineering_component_query.name,
            component_engineering_component_query.level,
            component_engineering_component_query.parent_id,
            component_engineering_component_query.root_unit,
            component_engineering_component_query.domain_unit,
            component_engineering_component_query.status,
            component_engineering_component_query.governance_state,
            component_engineering_component_query.canonical_role,
            component_engineering_component_query.evidence_state,
            component_engineering_component_query.is_drift,
            component_engineering_component_query.is_legacy,
            component_engineering_component_query.children_required,
            component_engineering_component_query.file_count,
            component_engineering_component_query.ddd_owner,
            component_engineering_component_query.cq_rails,
            component_engineering_component_query.source_path,
            component_engineering_component_query.source_content_sha256
           FROM planning_query_store.component_engineering_component_query
        ), component_documents AS (
         SELECT component_engineering_document_query.component_id,
            COALESCE(jsonb_agg(component_engineering_document_query.document_path ORDER BY component_engineering_document_query.document_path) FILTER (WHERE (component_engineering_document_query.document_kind = 'governing'::text)), '[]'::jsonb) AS governing_documents,
            COALESCE(jsonb_agg(component_engineering_document_query.metadata ORDER BY component_engineering_document_query.document_path, component_engineering_document_query.reference) FILTER (WHERE (component_engineering_document_query.document_kind = 'adr'::text)), '[]'::jsonb) AS adrs,
            COALESCE(jsonb_agg(component_engineering_document_query.metadata ORDER BY component_engineering_document_query.document_path, component_engineering_document_query.reference) FILTER (WHERE (component_engineering_document_query.document_kind = 'requirement'::text)), '[]'::jsonb) AS requirements,
            COALESCE(jsonb_agg(component_engineering_document_query.metadata ORDER BY component_engineering_document_query.document_path, component_engineering_document_query.reference) FILTER (WHERE (component_engineering_document_query.document_kind = 'runtimeEvidence'::text)), '[]'::jsonb) AS runtime_evidence
           FROM planning_query_store.component_engineering_document_query
          GROUP BY component_engineering_document_query.component_id
        ), component_children AS (
         SELECT component_engineering_relation_query.source_component_id AS component_id,
            COALESCE(jsonb_agg(component_engineering_relation_query.target_id ORDER BY component_engineering_relation_query.target_id), '[]'::jsonb) AS child_component_ids
           FROM planning_query_store.component_engineering_relation_query
          WHERE (component_engineering_relation_query.relation_type = 'child'::text)
          GROUP BY component_engineering_relation_query.source_component_id
        ), component_contracts AS (
         SELECT component_engineering_contract_query.component_id,
            COALESCE(jsonb_agg(component_engineering_contract_query.contract_name ORDER BY component_engineering_contract_query.contract_name) FILTER (WHERE (component_engineering_contract_query.contract_kind = 'commandQueryRail'::text)), '[]'::jsonb) AS api_surface
           FROM planning_query_store.component_engineering_contract_query
          GROUP BY component_engineering_contract_query.component_id
        ), component_gaps AS (
         SELECT component_engineering_gap_query.component_id,
            COALESCE(jsonb_agg(component_engineering_gap_query.gap_code ORDER BY component_engineering_gap_query.gap_code), '[]'::jsonb) AS completeness_gaps
           FROM planning_query_store.component_engineering_gap_query
          GROUP BY component_engineering_gap_query.component_id
        ), base_records AS (
         SELECT governance_component_engineering_record_query.component_id,
            governance_component_engineering_record_query.record
           FROM planning_query_store.governance_component_engineering_record_query
        )
 SELECT components.component_id,
    (base_records.record || jsonb_build_object('schemaVersion', 'v2', 'relatedDocuments', jsonb_build_object('governing', COALESCE(component_documents.governing_documents, '[]'::jsonb), 'adrs', COALESCE(component_documents.adrs, '[]'::jsonb), 'requirements', COALESCE(component_documents.requirements, '[]'::jsonb), 'runtimeEvidence', COALESCE(component_documents.runtime_evidence, '[]'::jsonb)), 'domain', jsonb_build_object('rootUnit', components.root_unit, 'domainUnit', components.domain_unit, 'unitPath', COALESCE((base_records.record #> '{identity,unitPath}'::text[]), '[]'::jsonb), 'dddOwner', components.ddd_owner, 'canonicalRole', components.canonical_role), 'composition', jsonb_build_object('parentComponentId', components.parent_id, 'children', COALESCE((base_records.record -> 'subcomponents'::text), '[]'::jsonb), 'childComponentIds', COALESCE(component_children.child_component_ids, '[]'::jsonb), 'level', components.level), 'contracts', jsonb_build_object('indexed', false, 'provides', '[]'::jsonb, 'consumes', '[]'::jsonb, 'eventsEmitted', '[]'::jsonb, 'eventsConsumed', '[]'::jsonb, 'apiSurface', COALESCE(component_contracts.api_surface, '[]'::jsonb), 'gaps', jsonb_build_array('missing_contract_index')), 'codeSurface', jsonb_build_object('indexed', false, 'ownedFiles', COALESCE(component_files.owned_files, '[]'::jsonb), 'testFiles', COALESCE(component_files.test_files, '[]'::jsonb), 'interfaces', '[]'::jsonb, 'methods', '[]'::jsonb, 'gaps', jsonb_build_array('missing_code_symbol_index')), 'connections', jsonb_build_object('indexed', false, 'parentComponentId', components.parent_id, 'childComponentIds', COALESCE(component_children.child_component_ids, '[]'::jsonb), 'commandQueryRails', COALESCE(component_contracts.api_surface, '[]'::jsonb), 'gaps', jsonb_build_array('missing_component_connection_index')), 'capabilities', jsonb_build_object('indexed', false, 'items', '[]'::jsonb, 'gaps', jsonb_build_array('missing_capability_index')), 'invariants', jsonb_build_object('indexed', false, 'architecture', '[]'::jsonb, 'gaps', jsonb_build_array('missing_invariants_index')), 'dependencies', jsonb_build_object('indexed', false, 'runtime', '[]'::jsonb, 'build', '[]'::jsonb, 'external', '[]'::jsonb, 'forbidden', '[]'::jsonb, 'ownedPaths', COALESCE((base_records.record #> '{dependencies,owns}'::text[]), '[]'::jsonb), 'excludedPaths', COALESCE((base_records.record #> '{dependencies,excludes}'::text[]), '[]'::jsonb), 'gaps', jsonb_build_array('missing_dependency_classification_index')), 'configuration', jsonb_build_object('indexed', false, 'required', '[]'::jsonb, 'optional', '[]'::jsonb, 'secrets', '[]'::jsonb, 'gaps', jsonb_build_array('missing_configuration_index')), 'runtime', jsonb_build_object('indexed', false, 'deployable', NULL::unknown, 'runtimeType', NULL::unknown, 'stateless', NULL::unknown, 'statefulResources', '[]'::jsonb, 'scalingModel', NULL::unknown, 'gaps', jsonb_build_array('missing_runtime_profile_index')), 'observability', jsonb_build_object('indexed', false, 'logs', '[]'::jsonb, 'metrics', '[]'::jsonb, 'traces', '[]'::jsonb, 'gaps', jsonb_build_array('missing_observability_index')), 'failureModes', jsonb_build_object('indexed', false, 'modes', '[]'::jsonb, 'recovery', '[]'::jsonb, 'gaps', jsonb_build_array('missing_failure_mode_index')), 'costModel', jsonb_build_object('indexed', false, 'cpuWeight', NULL::unknown, 'memoryMb', NULL::unknown, 'ioWeight', NULL::unknown, 'networkWeight', NULL::unknown, 'estimatedCostPerRun', NULL::unknown, 'gaps', jsonb_build_array('missing_cost_model_index')), 'completenessGaps', COALESCE(component_gaps.completeness_gaps, '[]'::jsonb))) AS record
   FROM ((((((components
     JOIN base_records ON ((base_records.component_id = components.component_id)))
     LEFT JOIN component_documents ON ((component_documents.component_id = components.component_id)))
     LEFT JOIN planning_query_store.component_engineering_file_rollup_query component_files ON ((component_files.component_id = components.component_id)))
     LEFT JOIN component_children ON ((component_children.component_id = components.component_id)))
     LEFT JOIN component_contracts ON ((component_contracts.component_id = components.component_id)))
     LEFT JOIN component_gaps ON ((component_gaps.component_id = components.component_id)));
