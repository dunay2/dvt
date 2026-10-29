--
-- Name: code_symbol_effective_inventory_projection_body_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX code_symbol_effective_inventory_projection_body_idx ON planning_query_store.code_symbol_effective_inventory_projection USING btree (body_sha256, file_path) WHERE (normalized_body_length >= 80);


--
-- Name: code_symbol_effective_inventory_projection_component_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX code_symbol_effective_inventory_projection_component_idx ON planning_query_store.code_symbol_effective_inventory_projection USING btree (component_id, file_path);


--
-- Name: code_symbol_effective_inventory_projection_name_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX code_symbol_effective_inventory_projection_name_idx ON planning_query_store.code_symbol_effective_inventory_projection USING btree (lower(symbol_name), symbol_kind, file_path);


--
-- Name: code_symbol_effective_inventory_projection_symbol_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE UNIQUE INDEX code_symbol_effective_inventory_projection_symbol_idx ON planning_query_store.code_symbol_effective_inventory_projection USING btree (symbol_id);


--
-- Name: code_symbols_body_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX code_symbols_body_idx ON planning_query_store.code_symbols USING btree (body_sha256);


--
-- Name: code_symbols_component_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX code_symbols_component_idx ON planning_query_store.code_symbols USING btree (component_id);


--
-- Name: code_symbols_file_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX code_symbols_file_idx ON planning_query_store.code_symbols USING btree (file_path);


--
-- Name: code_symbols_name_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX code_symbols_name_idx ON planning_query_store.code_symbols USING btree (lower(symbol_name), symbol_kind);


--
-- Name: command_query_rails_owner_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX command_query_rails_owner_idx ON planning_query_store.command_query_rails USING btree (ddd_owner);


--
-- Name: command_query_rails_raw_manifest_gin_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX command_query_rails_raw_manifest_gin_idx ON planning_query_store.command_query_rails USING gin (raw_manifest jsonb_path_ops);


--
-- Name: command_query_rails_source_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX command_query_rails_source_idx ON planning_query_store.command_query_rails USING btree (source_path);


--
-- Name: command_query_rails_status_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX command_query_rails_status_idx ON planning_query_store.command_query_rails USING btree (rail_status);


--
-- Name: command_query_rails_type_name_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX command_query_rails_type_name_idx ON planning_query_store.command_query_rails USING btree (rail_type, normalized_rail_name);


--
-- Name: component_engineering_component_tree_projection_id_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE UNIQUE INDEX component_engineering_component_tree_projection_id_idx ON planning_query_store.component_engineering_component_tree_projection USING btree (component_id);


--
-- Name: component_engineering_component_tree_projection_parent_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX component_engineering_component_tree_projection_parent_idx ON planning_query_store.component_engineering_component_tree_projection USING btree (parent_component_id, component_id);


--
-- Name: component_engineering_component_tree_projection_scope_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX component_engineering_component_tree_projection_scope_idx ON planning_query_store.component_engineering_component_tree_projection USING btree (root_unit, domain_unit, governance_state, component_id);


--
-- Name: component_engineering_file_ownership_projection_component_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX component_engineering_file_ownership_projection_component_idx ON planning_query_store.component_engineering_file_ownership_projection USING btree (leaf_component_id, file_role, file_path);


--
-- Name: component_engineering_file_ownership_projection_file_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE UNIQUE INDEX component_engineering_file_ownership_projection_file_idx ON planning_query_store.component_engineering_file_ownership_projection USING btree (file_path);


--
-- Name: component_engineering_file_ownership_projection_owner_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX component_engineering_file_ownership_projection_owner_idx ON planning_query_store.component_engineering_file_ownership_projection USING btree (owning_unit, file_path);


--
-- Name: component_engineering_file_ownership_projection_path_prefix_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX component_engineering_file_ownership_projection_path_prefix_idx ON planning_query_store.component_engineering_file_ownership_projection USING btree (file_path text_pattern_ops);


--
-- Name: component_engineering_file_ownership_projection_state_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX component_engineering_file_ownership_projection_state_idx ON planning_query_store.component_engineering_file_ownership_projection USING btree (governance_state, file_role);


--
-- Name: component_engineering_rule_evaluation_projection_rule_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX component_engineering_rule_evaluation_projection_rule_idx ON planning_query_store.component_engineering_rule_evaluation_projection USING btree (rule_id, evaluation_state, subject_id);


--
-- Name: component_engineering_rule_evaluation_projection_state_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX component_engineering_rule_evaluation_projection_state_idx ON planning_query_store.component_engineering_rule_evaluation_projection USING btree (evaluation_state, drift_code, subject_id);


--
-- Name: component_engineering_rule_evaluation_projection_subject_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX component_engineering_rule_evaluation_projection_subject_idx ON planning_query_store.component_engineering_rule_evaluation_projection USING btree (subject_id, evaluation_state);


--
-- Name: db_governance_surface_operations_surface_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX db_governance_surface_operations_surface_idx ON planning_query_store.db_governance_surface_operations USING btree (surface_name, created_at);


--
-- Name: db_governance_surfaces_authority_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX db_governance_surfaces_authority_idx ON planning_query_store.db_governance_surfaces USING btree (authority_mode, surface_name);


--
-- Name: db_governance_surfaces_write_rail_kind_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX db_governance_surfaces_write_rail_kind_idx ON planning_query_store.db_governance_surfaces USING btree (write_rail_kind, surface_name);


--
-- Name: doc_disposition_actions_document_path_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX doc_disposition_actions_document_path_idx ON planning_query_store.doc_disposition_actions USING btree (document_path);


--
-- Name: doc_disposition_actions_kind_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX doc_disposition_actions_kind_idx ON planning_query_store.doc_disposition_actions USING btree (action_kind);


--
-- Name: doc_disposition_actions_priority_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX doc_disposition_actions_priority_idx ON planning_query_store.doc_disposition_actions USING btree (priority);


--
-- Name: doc_disposition_markers_document_path_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX doc_disposition_markers_document_path_idx ON planning_query_store.doc_disposition_markers USING btree (document_path);


--
-- Name: doc_disposition_markers_marker_kind_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX doc_disposition_markers_marker_kind_idx ON planning_query_store.doc_disposition_markers USING btree (marker_kind);


--
-- Name: doc_resolution_operations_scope_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX doc_resolution_operations_scope_idx ON planning_query_store.doc_resolution_operations USING btree (resolution_scope, issue_kind, document_path, lane_id, task_id, created_at);


--
-- Name: doc_resolution_overlays_scope_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX doc_resolution_overlays_scope_idx ON planning_query_store.doc_resolution_overlays USING btree (resolution_scope, issue_kind, document_path);


--
-- Name: doc_resolution_overlays_source_hash_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX doc_resolution_overlays_source_hash_idx ON planning_query_store.doc_resolution_overlays USING btree (source_content_sha256);


--
-- Name: doc_task_like_references_classification_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX doc_task_like_references_classification_idx ON planning_query_store.doc_task_like_references USING btree (classification);


--
-- Name: doc_task_like_references_document_path_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX doc_task_like_references_document_path_idx ON planning_query_store.doc_task_like_references USING btree (document_path);


--
-- Name: doc_task_like_references_prefix_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX doc_task_like_references_prefix_idx ON planning_query_store.doc_task_like_references USING btree (reference_prefix);


--
-- Name: feature_mechanization_local_operations_rail_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX feature_mechanization_local_operations_rail_idx ON planning_query_store.feature_mechanization_local_operations USING btree (rail_id, created_at DESC);


--
-- Name: feature_mechanization_local_rails_feature_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX feature_mechanization_local_rails_feature_idx ON planning_query_store.feature_mechanization_local_rails USING btree (feature_id);


--
-- Name: feature_mechanization_local_rails_raw_manifest_gin_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX feature_mechanization_local_rails_raw_manifest_gin_idx ON planning_query_store.feature_mechanization_local_rails USING gin (raw_manifest jsonb_path_ops);


--
-- Name: feature_mechanization_local_rails_type_name_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX feature_mechanization_local_rails_type_name_idx ON planning_query_store.feature_mechanization_local_rails USING btree (rail_type, normalized_rail_name);


--
-- Name: fowler_analysis_operations_document_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX fowler_analysis_operations_document_idx ON planning_query_store.fowler_analysis_operations USING btree (document_path);


--
-- Name: fowler_analysis_reference_resolutions_document_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX fowler_analysis_reference_resolutions_document_idx ON planning_query_store.fowler_analysis_reference_resolutions USING btree (document_path);


--
-- Name: fowler_analysis_reference_resolutions_lookup_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX fowler_analysis_reference_resolutions_lookup_idx ON planning_query_store.fowler_analysis_reference_resolutions USING btree (document_path, reference_path, relation_type);


--
-- Name: fowler_analysis_targets_document_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX fowler_analysis_targets_document_idx ON planning_query_store.fowler_analysis_canonical_targets USING btree (document_path);


--
-- Name: fowler_analysis_targets_target_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX fowler_analysis_targets_target_idx ON planning_query_store.fowler_analysis_canonical_targets USING btree (target_path);


--
-- Name: frontend_component_capability_gaps_status_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX frontend_component_capability_gaps_status_idx ON planning_query_store.frontend_component_capability_gaps USING btree (gap_status, component_id);


--
-- Name: frontend_component_context_actions_rail_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX frontend_component_context_actions_rail_idx ON planning_query_store.frontend_component_context_actions USING btree (rail_name, context_id);


--
-- Name: frontend_component_context_actions_status_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX frontend_component_context_actions_status_idx ON planning_query_store.frontend_component_context_actions USING btree (action_status, context_id);


--
-- Name: frontend_component_contexts_context_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX frontend_component_contexts_context_idx ON planning_query_store.frontend_component_contexts USING btree (context_id, context_kind);


--
-- Name: frontend_component_cq_rails_component_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX frontend_component_cq_rails_component_idx ON planning_query_store.frontend_component_cq_rails USING btree (component_id, rail_name);


--
-- Name: frontend_component_cq_rails_status_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX frontend_component_cq_rails_status_idx ON planning_query_store.frontend_component_cq_rails USING btree (rail_status);


--
-- Name: frontend_component_evidence_component_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX frontend_component_evidence_component_idx ON planning_query_store.frontend_component_evidence USING btree (component_id, evidence_id);


--
-- Name: frontend_component_files_component_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX frontend_component_files_component_idx ON planning_query_store.frontend_component_files USING btree (component_id, file_path, file_role);


--
-- Name: frontend_component_files_path_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX frontend_component_files_path_idx ON planning_query_store.frontend_component_files USING btree (file_path);


--
-- Name: frontend_component_local_components_kind_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX frontend_component_local_components_kind_idx ON planning_query_store.frontend_component_local_components USING btree (component_kind);


--
-- Name: frontend_component_local_components_owner_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX frontend_component_local_components_owner_idx ON planning_query_store.frontend_component_local_components USING btree (frontend_owner);


--
-- Name: frontend_component_local_components_source_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX frontend_component_local_components_source_idx ON planning_query_store.frontend_component_local_components USING btree (source_path, component_id);


--
-- Name: frontend_component_local_components_status_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX frontend_component_local_components_status_idx ON planning_query_store.frontend_component_local_components USING btree (component_status);


--
-- Name: frontend_component_local_cq_rails_component_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX frontend_component_local_cq_rails_component_idx ON planning_query_store.frontend_component_local_cq_rails USING btree (component_id, rail_name);


--
-- Name: frontend_component_local_evidence_component_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX frontend_component_local_evidence_component_idx ON planning_query_store.frontend_component_local_evidence USING btree (component_id, evidence_id);


--
-- Name: frontend_component_local_files_component_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX frontend_component_local_files_component_idx ON planning_query_store.frontend_component_local_files USING btree (component_id, file_path);


--
-- Name: frontend_component_local_surface_links_surface_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX frontend_component_local_surface_links_surface_idx ON planning_query_store.frontend_component_local_surface_links USING btree (surface_id, component_id);


--
-- Name: frontend_component_plugin_scopes_plugin_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX frontend_component_plugin_scopes_plugin_idx ON planning_query_store.frontend_component_plugin_scopes USING btree (plugin_id, component_id);


--
-- Name: frontend_component_validation_evidence_rail_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX frontend_component_validation_evidence_rail_idx ON planning_query_store.frontend_component_validation_evidence USING btree (rail_name, context_id);


--
-- Name: frontend_components_kind_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX frontend_components_kind_idx ON planning_query_store.frontend_components USING btree (component_kind);


--
-- Name: frontend_components_owner_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX frontend_components_owner_idx ON planning_query_store.frontend_components USING btree (frontend_owner);


--
-- Name: frontend_components_status_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX frontend_components_status_idx ON planning_query_store.frontend_components USING btree (component_status);


--
-- Name: frontend_mechanical_truth_surfaces_kind_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX frontend_mechanical_truth_surfaces_kind_idx ON planning_query_store.frontend_mechanical_truth_surfaces USING btree (surface_kind);


--
-- Name: frontend_mechanical_truth_surfaces_owner_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX frontend_mechanical_truth_surfaces_owner_idx ON planning_query_store.frontend_mechanical_truth_surfaces USING btree (frontend_owner);


--
-- Name: frontend_mechanical_truth_surfaces_route_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX frontend_mechanical_truth_surfaces_route_idx ON planning_query_store.frontend_mechanical_truth_surfaces USING btree (route_path);


--
-- Name: frontend_mechanical_truth_surfaces_source_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX frontend_mechanical_truth_surfaces_source_idx ON planning_query_store.frontend_mechanical_truth_surfaces USING btree (source_path);


--
-- Name: frontend_mechanical_truth_surfaces_state_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX frontend_mechanical_truth_surfaces_state_idx ON planning_query_store.frontend_mechanical_truth_surfaces USING btree (screen_state);


--
-- Name: frontend_surface_component_links_surface_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX frontend_surface_component_links_surface_idx ON planning_query_store.frontend_surface_component_links USING btree (surface_id);


--
-- Name: governance_component_files_drift_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX governance_component_files_drift_idx ON planning_query_store.governance_component_files USING btree (is_drift, component_id) WHERE (is_drift = true);


--
-- Name: governance_component_files_path_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX governance_component_files_path_idx ON planning_query_store.governance_component_files USING btree (path);


--
-- Name: governance_component_local_definitions_parent_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX governance_component_local_definitions_parent_idx ON planning_query_store.governance_component_local_definitions USING btree (parent_id, component_id);


--
-- Name: governance_component_local_operations_component_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX governance_component_local_operations_component_idx ON planning_query_store.governance_component_local_operations USING btree (component_id, created_at);


--
-- Name: governance_component_local_ownership_patterns_component_kind_or; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX governance_component_local_ownership_patterns_component_kind_or ON planning_query_store.governance_component_local_ownership_patterns USING btree (component_id, pattern_kind, pattern_order);


--
-- Name: governance_component_local_ownership_patterns_kind_pattern_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX governance_component_local_ownership_patterns_kind_pattern_idx ON planning_query_store.governance_component_local_ownership_patterns USING btree (pattern_kind, pattern);


--
-- Name: governance_component_local_semantic_items_component_kind_order_; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX governance_component_local_semantic_items_component_kind_order_ ON planning_query_store.governance_component_local_semantic_items USING btree (component_id, item_kind, item_order);


--
-- Name: governance_component_local_semantic_items_kind_value_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX governance_component_local_semantic_items_kind_value_idx ON planning_query_store.governance_component_local_semantic_items USING btree (item_kind, item_value);


--
-- Name: governance_component_reparent_overrides_parent_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX governance_component_reparent_overrides_parent_idx ON planning_query_store.governance_component_reparent_overrides USING btree (parent_id, component_id);


--
-- Name: governance_components_state_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX governance_components_state_idx ON planning_query_store.governance_components USING btree (governance_state, component_id);


--
-- Name: governance_coverage_component_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX governance_coverage_component_idx ON planning_query_store.governance_coverage USING btree (component_id) WHERE (component_id IS NOT NULL);


--
-- Name: governance_coverage_kind_name_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX governance_coverage_kind_name_idx ON planning_query_store.governance_coverage USING btree (coverage_kind, name);


--
-- Name: governance_files_component_state_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX governance_files_component_state_idx ON planning_query_store.governance_files USING btree (component_unit, governance_state, path);


--
-- Name: governance_files_content_hash_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX governance_files_content_hash_idx ON planning_query_store.governance_files USING btree (content_hash);


--
-- Name: governance_files_drift_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX governance_files_drift_idx ON planning_query_store.governance_files USING btree (is_drift, component_unit) WHERE (is_drift = true);


--
-- Name: governance_fingerprints_component_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX governance_fingerprints_component_idx ON planning_query_store.governance_fingerprints USING btree (component_unit, state_fingerprint);


--
-- Name: governance_refresh_run_operations_run_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX governance_refresh_run_operations_run_idx ON planning_query_store.governance_refresh_run_operations USING btree (run_id, created_at DESC);


--
-- Name: governance_refresh_runs_state_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX governance_refresh_runs_state_idx ON planning_query_store.governance_refresh_runs USING btree (run_state, started_at DESC);


--
-- Name: governance_refresh_stage_runs_run_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX governance_refresh_stage_runs_run_idx ON planning_query_store.governance_refresh_stage_runs USING btree (run_id, stage_group, pass_number, stage_index);


--
-- Name: governance_remediation_component_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX governance_remediation_component_idx ON planning_query_store.governance_remediation USING btree (component_unit);


--
-- Name: governance_remediation_priority_type_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX governance_remediation_priority_type_idx ON planning_query_store.governance_remediation USING btree (priority, task_type, component_unit);


--
-- Name: governance_sources_type_hash_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX governance_sources_type_hash_idx ON planning_query_store.governance_sources USING btree (source_type, content_sha256);


--
-- Name: knowledge_document_links_to_from_lookup_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX knowledge_document_links_to_from_lookup_idx ON planning_query_store.knowledge_document_links USING btree (to_document_id, from_document_id, relation_type);


--
-- Name: knowledge_intake_repository_references_source_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX knowledge_intake_repository_references_source_idx ON planning_query_store.knowledge_intake_repository_references USING btree (source_path);


--
-- Name: knowledge_intake_repository_references_target_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX knowledge_intake_repository_references_target_idx ON planning_query_store.knowledge_intake_repository_references USING btree (target_document_path);


--
-- Name: knowledge_intake_repository_references_target_lookup_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX knowledge_intake_repository_references_target_lookup_idx ON planning_query_store.knowledge_intake_repository_references USING btree (target_document_path, source_path, relation_type);


--
-- Name: repository_commands_domain_type_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX repository_commands_domain_type_idx ON planning_query_store.repository_commands USING btree (domain, command_type);


--
-- Name: repository_commands_runtime_fanout_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX repository_commands_runtime_fanout_idx ON planning_query_store.repository_commands USING btree (runtime_fanout);


--
-- Name: risk_debt_items_component_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX risk_debt_items_component_idx ON planning_query_store.risk_debt_items USING btree (component_unit);


--
-- Name: risk_debt_items_priority_idx; Type: INDEX; Schema: planning_query_store; Owner: -
--

CREATE INDEX risk_debt_items_priority_idx ON planning_query_store.risk_debt_items USING btree (priority, status);
