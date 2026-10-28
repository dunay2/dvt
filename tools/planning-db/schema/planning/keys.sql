--
-- Name: canvas_uxdb_specification_records canvas_uxdb_specification_records_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.canvas_uxdb_specification_records
    ADD CONSTRAINT canvas_uxdb_specification_records_pkey PRIMARY KEY (record_id);


--
-- Name: code_symbols code_symbols_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.code_symbols
    ADD CONSTRAINT code_symbols_pkey PRIMARY KEY (symbol_id);


--
-- Name: command_query_rails command_query_rails_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.command_query_rails
    ADD CONSTRAINT command_query_rails_pkey PRIMARY KEY (rail_id);


--
-- Name: db_governance_surface_operations db_governance_surface_operations_idempotency_key_key; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.db_governance_surface_operations
    ADD CONSTRAINT db_governance_surface_operations_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: db_governance_surface_operations db_governance_surface_operations_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.db_governance_surface_operations
    ADD CONSTRAINT db_governance_surface_operations_pkey PRIMARY KEY (operation_id);


--
-- Name: db_governance_surfaces db_governance_surfaces_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.db_governance_surfaces
    ADD CONSTRAINT db_governance_surfaces_pkey PRIMARY KEY (surface_name);


--
-- Name: dbt_project_roundtrip_phase_rail_evidence dbt_project_roundtrip_phase_rail_evidence_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.dbt_project_roundtrip_phase_rail_evidence
    ADD CONSTRAINT dbt_project_roundtrip_phase_rail_evidence_pkey PRIMARY KEY (evidence_id);


--
-- Name: dbt_project_roundtrip_phase_rail_evidence dbt_project_roundtrip_phase_rail_unique; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.dbt_project_roundtrip_phase_rail_evidence
    ADD CONSTRAINT dbt_project_roundtrip_phase_rail_unique UNIQUE (phase_id, rail_name);


--
-- Name: dbt_project_roundtrip_phases dbt_project_roundtrip_phases_phase_order_key; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.dbt_project_roundtrip_phases
    ADD CONSTRAINT dbt_project_roundtrip_phases_phase_order_key UNIQUE (phase_order);


--
-- Name: dbt_project_roundtrip_phases dbt_project_roundtrip_phases_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.dbt_project_roundtrip_phases
    ADD CONSTRAINT dbt_project_roundtrip_phases_pkey PRIMARY KEY (phase_id);


--
-- Name: doc_disposition_actions doc_disposition_actions_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.doc_disposition_actions
    ADD CONSTRAINT doc_disposition_actions_pkey PRIMARY KEY (action_id);


--
-- Name: doc_disposition_documents doc_disposition_documents_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.doc_disposition_documents
    ADD CONSTRAINT doc_disposition_documents_pkey PRIMARY KEY (document_path);


--
-- Name: doc_disposition_markers doc_disposition_markers_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.doc_disposition_markers
    ADD CONSTRAINT doc_disposition_markers_pkey PRIMARY KEY (marker_id);


--
-- Name: doc_resolution_operations doc_resolution_operations_idempotency_key_key; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.doc_resolution_operations
    ADD CONSTRAINT doc_resolution_operations_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: doc_resolution_operations doc_resolution_operations_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.doc_resolution_operations
    ADD CONSTRAINT doc_resolution_operations_pkey PRIMARY KEY (operation_id);


--
-- Name: doc_resolution_overlays doc_resolution_overlays_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.doc_resolution_overlays
    ADD CONSTRAINT doc_resolution_overlays_pkey PRIMARY KEY (resolution_key);


--
-- Name: doc_task_like_references doc_task_like_references_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.doc_task_like_references
    ADD CONSTRAINT doc_task_like_references_pkey PRIMARY KEY (reference_id);


--
-- Name: feature_mechanization_local_operations feature_mechanization_local_operations_idempotency_key_key; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.feature_mechanization_local_operations
    ADD CONSTRAINT feature_mechanization_local_operations_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: feature_mechanization_local_operations feature_mechanization_local_operations_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.feature_mechanization_local_operations
    ADD CONSTRAINT feature_mechanization_local_operations_pkey PRIMARY KEY (operation_id);


--
-- Name: feature_mechanization_local_rails feature_mechanization_local_rails_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.feature_mechanization_local_rails
    ADD CONSTRAINT feature_mechanization_local_rails_pkey PRIMARY KEY (rail_id);


--
-- Name: fowler_analysis_canonical_targets fowler_analysis_canonical_targets_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.fowler_analysis_canonical_targets
    ADD CONSTRAINT fowler_analysis_canonical_targets_pkey PRIMARY KEY (document_path, target_path);


--
-- Name: fowler_analysis_dispositions fowler_analysis_dispositions_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.fowler_analysis_dispositions
    ADD CONSTRAINT fowler_analysis_dispositions_pkey PRIMARY KEY (document_path);


--
-- Name: fowler_analysis_operations fowler_analysis_operations_idempotency_key_key; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.fowler_analysis_operations
    ADD CONSTRAINT fowler_analysis_operations_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: fowler_analysis_operations fowler_analysis_operations_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.fowler_analysis_operations
    ADD CONSTRAINT fowler_analysis_operations_pkey PRIMARY KEY (operation_id);


--
-- Name: fowler_analysis_reference_resolutions fowler_analysis_reference_resolutions_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.fowler_analysis_reference_resolutions
    ADD CONSTRAINT fowler_analysis_reference_resolutions_pkey PRIMARY KEY (document_path, reference_path, relation_type);


--
-- Name: fowler_analysis_retirement_decisions fowler_analysis_retirement_decisions_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.fowler_analysis_retirement_decisions
    ADD CONSTRAINT fowler_analysis_retirement_decisions_pkey PRIMARY KEY (document_path);


--
-- Name: frontend_component_capability_gaps frontend_component_capability_gaps_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.frontend_component_capability_gaps
    ADD CONSTRAINT frontend_component_capability_gaps_pkey PRIMARY KEY (component_id, gap_id);


--
-- Name: frontend_component_context_actions frontend_component_context_actions_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.frontend_component_context_actions
    ADD CONSTRAINT frontend_component_context_actions_pkey PRIMARY KEY (component_id, context_id, action_id);


--
-- Name: frontend_component_contexts frontend_component_contexts_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.frontend_component_contexts
    ADD CONSTRAINT frontend_component_contexts_pkey PRIMARY KEY (component_id, context_id);


--
-- Name: frontend_component_cq_rails frontend_component_cq_rails_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.frontend_component_cq_rails
    ADD CONSTRAINT frontend_component_cq_rails_pkey PRIMARY KEY (component_id, rail_name);


--
-- Name: frontend_component_evidence frontend_component_evidence_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.frontend_component_evidence
    ADD CONSTRAINT frontend_component_evidence_pkey PRIMARY KEY (evidence_id);


--
-- Name: frontend_component_files frontend_component_files_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.frontend_component_files
    ADD CONSTRAINT frontend_component_files_pkey PRIMARY KEY (component_id, file_path, file_role);


--
-- Name: frontend_component_local_components frontend_component_local_components_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.frontend_component_local_components
    ADD CONSTRAINT frontend_component_local_components_pkey PRIMARY KEY (component_id);


--
-- Name: frontend_component_local_cq_rails frontend_component_local_cq_rails_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.frontend_component_local_cq_rails
    ADD CONSTRAINT frontend_component_local_cq_rails_pkey PRIMARY KEY (component_id, rail_name);


--
-- Name: frontend_component_local_evidence frontend_component_local_evidence_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.frontend_component_local_evidence
    ADD CONSTRAINT frontend_component_local_evidence_pkey PRIMARY KEY (evidence_id);


--
-- Name: frontend_component_local_files frontend_component_local_files_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.frontend_component_local_files
    ADD CONSTRAINT frontend_component_local_files_pkey PRIMARY KEY (component_id, file_path, file_role);


--
-- Name: frontend_component_local_surface_links frontend_component_local_surface_links_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.frontend_component_local_surface_links
    ADD CONSTRAINT frontend_component_local_surface_links_pkey PRIMARY KEY (component_id, surface_id, placement_kind);


--
-- Name: frontend_component_plugin_scopes frontend_component_plugin_scopes_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.frontend_component_plugin_scopes
    ADD CONSTRAINT frontend_component_plugin_scopes_pkey PRIMARY KEY (component_id, plugin_id);


--
-- Name: frontend_component_validation_evidence frontend_component_validation_evidence_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.frontend_component_validation_evidence
    ADD CONSTRAINT frontend_component_validation_evidence_pkey PRIMARY KEY (component_id, evidence_id);


--
-- Name: frontend_components frontend_components_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.frontend_components
    ADD CONSTRAINT frontend_components_pkey PRIMARY KEY (component_id);


--
-- Name: frontend_mechanical_truth_surfaces frontend_mechanical_truth_surfaces_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.frontend_mechanical_truth_surfaces
    ADD CONSTRAINT frontend_mechanical_truth_surfaces_pkey PRIMARY KEY (surface_id);


--
-- Name: frontend_surface_component_links frontend_surface_component_links_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.frontend_surface_component_links
    ADD CONSTRAINT frontend_surface_component_links_pkey PRIMARY KEY (component_id, surface_id, placement_kind);


--
-- Name: governance_component_file_shards governance_component_file_shards_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_component_file_shards
    ADD CONSTRAINT governance_component_file_shards_pkey PRIMARY KEY (component_id);


--
-- Name: governance_component_files governance_component_files_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_component_files
    ADD CONSTRAINT governance_component_files_pkey PRIMARY KEY (component_id, path);


--
-- Name: governance_component_local_definitions governance_component_local_definitions_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_component_local_definitions
    ADD CONSTRAINT governance_component_local_definitions_pkey PRIMARY KEY (component_id);


--
-- Name: governance_component_local_operations governance_component_local_operations_idempotency_key_key; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_component_local_operations
    ADD CONSTRAINT governance_component_local_operations_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: governance_component_local_operations governance_component_local_operations_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_component_local_operations
    ADD CONSTRAINT governance_component_local_operations_pkey PRIMARY KEY (operation_id);


--
-- Name: governance_component_local_ownership_patterns governance_component_local_ownership_patterns_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_component_local_ownership_patterns
    ADD CONSTRAINT governance_component_local_ownership_patterns_pkey PRIMARY KEY (component_id, pattern_kind, pattern);


--
-- Name: governance_component_local_semantic_items governance_component_local_semantic_items_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_component_local_semantic_items
    ADD CONSTRAINT governance_component_local_semantic_items_pkey PRIMARY KEY (component_id, item_kind, item_value);


--
-- Name: governance_component_reparent_overrides governance_component_reparent_overrides_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_component_reparent_overrides
    ADD CONSTRAINT governance_component_reparent_overrides_pkey PRIMARY KEY (component_id);


--
-- Name: governance_components governance_components_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_components
    ADD CONSTRAINT governance_components_pkey PRIMARY KEY (component_id);


--
-- Name: governance_coverage governance_coverage_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_coverage
    ADD CONSTRAINT governance_coverage_pkey PRIMARY KEY (coverage_id);


--
-- Name: governance_file_shards governance_file_shards_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_file_shards
    ADD CONSTRAINT governance_file_shards_pkey PRIMARY KEY (shard_id);


--
-- Name: governance_files governance_files_file_id_key; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_files
    ADD CONSTRAINT governance_files_file_id_key UNIQUE (file_id);


--
-- Name: governance_files governance_files_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_files
    ADD CONSTRAINT governance_files_pkey PRIMARY KEY (path);


--
-- Name: governance_fingerprints governance_fingerprints_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_fingerprints
    ADD CONSTRAINT governance_fingerprints_pkey PRIMARY KEY (path);


--
-- Name: governance_refresh_run_operations governance_refresh_run_operations_idempotency_key_key; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_refresh_run_operations
    ADD CONSTRAINT governance_refresh_run_operations_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: governance_refresh_run_operations governance_refresh_run_operations_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_refresh_run_operations
    ADD CONSTRAINT governance_refresh_run_operations_pkey PRIMARY KEY (operation_id);


--
-- Name: governance_refresh_runs governance_refresh_runs_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_refresh_runs
    ADD CONSTRAINT governance_refresh_runs_pkey PRIMARY KEY (run_id);


--
-- Name: governance_refresh_stage_runs governance_refresh_stage_runs_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_refresh_stage_runs
    ADD CONSTRAINT governance_refresh_stage_runs_pkey PRIMARY KEY (stage_run_id);


--
-- Name: governance_remediation governance_remediation_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_remediation
    ADD CONSTRAINT governance_remediation_pkey PRIMARY KEY (task_id);


--
-- Name: governance_sources governance_sources_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_sources
    ADD CONSTRAINT governance_sources_pkey PRIMARY KEY (source_path);


--
-- Name: knowledge_action_items knowledge_action_items_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.knowledge_action_items
    ADD CONSTRAINT knowledge_action_items_pkey PRIMARY KEY (action_id);


--
-- Name: knowledge_action_links knowledge_action_links_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.knowledge_action_links
    ADD CONSTRAINT knowledge_action_links_pkey PRIMARY KEY (action_id, target_type, target_id, relation_type);


--
-- Name: knowledge_document_links knowledge_document_links_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.knowledge_document_links
    ADD CONSTRAINT knowledge_document_links_pkey PRIMARY KEY (from_document_id, to_document_id, relation_type);


--
-- Name: knowledge_document_sections knowledge_document_sections_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.knowledge_document_sections
    ADD CONSTRAINT knowledge_document_sections_pkey PRIMARY KEY (section_id);


--
-- Name: knowledge_documents knowledge_documents_document_path_key; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.knowledge_documents
    ADD CONSTRAINT knowledge_documents_document_path_key UNIQUE (document_path);


--
-- Name: knowledge_documents knowledge_documents_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.knowledge_documents
    ADD CONSTRAINT knowledge_documents_pkey PRIMARY KEY (document_id);


--
-- Name: knowledge_findings knowledge_findings_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.knowledge_findings
    ADD CONSTRAINT knowledge_findings_pkey PRIMARY KEY (finding_id);


--
-- Name: knowledge_intake_repository_references knowledge_intake_repository_references_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.knowledge_intake_repository_references
    ADD CONSTRAINT knowledge_intake_repository_references_pkey PRIMARY KEY (reference_id);


--
-- Name: knowledge_proposals knowledge_proposals_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.knowledge_proposals
    ADD CONSTRAINT knowledge_proposals_pkey PRIMARY KEY (proposal_id);


--
-- Name: pr_readiness_checks pr_readiness_checks_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.pr_readiness_checks
    ADD CONSTRAINT pr_readiness_checks_pkey PRIMARY KEY (readiness_id);


--
-- Name: repository_commands repository_commands_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.repository_commands
    ADD CONSTRAINT repository_commands_pkey PRIMARY KEY (command_id);


--
-- Name: risk_debt_items risk_debt_items_pkey; Type: CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.risk_debt_items
    ADD CONSTRAINT risk_debt_items_pkey PRIMARY KEY (risk_id);
