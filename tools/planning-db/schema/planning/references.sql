--
-- Name: db_governance_surface_operations db_governance_surface_operations_surface_name_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.db_governance_surface_operations
    ADD CONSTRAINT db_governance_surface_operations_surface_name_fkey FOREIGN KEY (surface_name) REFERENCES planning_query_store.db_governance_surfaces(surface_name);


--
-- Name: dbt_project_roundtrip_phase_rail_evidence dbt_project_roundtrip_phase_rail_evidence_phase_id_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.dbt_project_roundtrip_phase_rail_evidence
    ADD CONSTRAINT dbt_project_roundtrip_phase_rail_evidence_phase_id_fkey FOREIGN KEY (phase_id) REFERENCES planning_query_store.dbt_project_roundtrip_phases(phase_id) ON DELETE RESTRICT;


--
-- Name: doc_disposition_actions doc_disposition_actions_document_path_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.doc_disposition_actions
    ADD CONSTRAINT doc_disposition_actions_document_path_fkey FOREIGN KEY (document_path) REFERENCES planning_query_store.doc_disposition_documents(document_path) ON DELETE CASCADE;


--
-- Name: doc_disposition_markers doc_disposition_markers_document_path_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.doc_disposition_markers
    ADD CONSTRAINT doc_disposition_markers_document_path_fkey FOREIGN KEY (document_path) REFERENCES planning_query_store.doc_disposition_documents(document_path) ON DELETE CASCADE;


--
-- Name: doc_task_like_references doc_task_like_references_document_path_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.doc_task_like_references
    ADD CONSTRAINT doc_task_like_references_document_path_fkey FOREIGN KEY (document_path) REFERENCES planning_query_store.doc_disposition_documents(document_path) ON DELETE CASCADE;


--
-- Name: frontend_component_cq_rails frontend_component_cq_rails_component_id_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.frontend_component_cq_rails
    ADD CONSTRAINT frontend_component_cq_rails_component_id_fkey FOREIGN KEY (component_id) REFERENCES planning_query_store.frontend_components(component_id) ON DELETE CASCADE;


--
-- Name: frontend_component_evidence frontend_component_evidence_component_id_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.frontend_component_evidence
    ADD CONSTRAINT frontend_component_evidence_component_id_fkey FOREIGN KEY (component_id) REFERENCES planning_query_store.frontend_components(component_id) ON DELETE CASCADE;


--
-- Name: frontend_component_files frontend_component_files_component_id_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.frontend_component_files
    ADD CONSTRAINT frontend_component_files_component_id_fkey FOREIGN KEY (component_id) REFERENCES planning_query_store.frontend_components(component_id) ON DELETE CASCADE;


--
-- Name: frontend_surface_component_links frontend_surface_component_links_component_id_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.frontend_surface_component_links
    ADD CONSTRAINT frontend_surface_component_links_component_id_fkey FOREIGN KEY (component_id) REFERENCES planning_query_store.frontend_components(component_id) ON DELETE CASCADE;


--
-- Name: frontend_surface_component_links frontend_surface_component_links_surface_id_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.frontend_surface_component_links
    ADD CONSTRAINT frontend_surface_component_links_surface_id_fkey FOREIGN KEY (surface_id) REFERENCES planning_query_store.frontend_mechanical_truth_surfaces(surface_id) ON DELETE CASCADE;


--
-- Name: governance_component_file_shards governance_component_file_shards_component_id_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_component_file_shards
    ADD CONSTRAINT governance_component_file_shards_component_id_fkey FOREIGN KEY (component_id) REFERENCES planning_query_store.governance_components(component_id) ON DELETE CASCADE;


--
-- Name: governance_component_file_shards governance_component_file_shards_source_path_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_component_file_shards
    ADD CONSTRAINT governance_component_file_shards_source_path_fkey FOREIGN KEY (source_path) REFERENCES planning_query_store.governance_sources(source_path) ON DELETE CASCADE;


--
-- Name: governance_component_files governance_component_files_component_id_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_component_files
    ADD CONSTRAINT governance_component_files_component_id_fkey FOREIGN KEY (component_id) REFERENCES planning_query_store.governance_component_file_shards(component_id) ON DELETE CASCADE;


--
-- Name: governance_component_files governance_component_files_path_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_component_files
    ADD CONSTRAINT governance_component_files_path_fkey FOREIGN KEY (path) REFERENCES planning_query_store.governance_files(path) ON DELETE CASCADE;


--
-- Name: governance_component_files governance_component_files_source_path_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_component_files
    ADD CONSTRAINT governance_component_files_source_path_fkey FOREIGN KEY (source_path) REFERENCES planning_query_store.governance_sources(source_path) ON DELETE CASCADE;


--
-- Name: governance_component_local_ownership_patterns governance_component_local_ownership_patterns_component_id_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_component_local_ownership_patterns
    ADD CONSTRAINT governance_component_local_ownership_patterns_component_id_fkey FOREIGN KEY (component_id) REFERENCES planning_query_store.governance_component_local_definitions(component_id) ON DELETE CASCADE;


--
-- Name: governance_component_local_semantic_items governance_component_local_semantic_items_component_id_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_component_local_semantic_items
    ADD CONSTRAINT governance_component_local_semantic_items_component_id_fkey FOREIGN KEY (component_id) REFERENCES planning_query_store.governance_component_local_definitions(component_id) ON DELETE CASCADE;


--
-- Name: governance_components governance_components_source_path_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_components
    ADD CONSTRAINT governance_components_source_path_fkey FOREIGN KEY (source_path) REFERENCES planning_query_store.governance_sources(source_path) ON DELETE CASCADE;


--
-- Name: governance_coverage governance_coverage_source_path_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_coverage
    ADD CONSTRAINT governance_coverage_source_path_fkey FOREIGN KEY (source_path) REFERENCES planning_query_store.governance_sources(source_path) ON DELETE CASCADE;


--
-- Name: governance_file_shards governance_file_shards_source_path_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_file_shards
    ADD CONSTRAINT governance_file_shards_source_path_fkey FOREIGN KEY (source_path) REFERENCES planning_query_store.governance_sources(source_path) ON DELETE CASCADE;


--
-- Name: governance_files governance_files_shard_id_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_files
    ADD CONSTRAINT governance_files_shard_id_fkey FOREIGN KEY (shard_id) REFERENCES planning_query_store.governance_file_shards(shard_id) ON DELETE CASCADE;


--
-- Name: governed_source_content_overrides governed_source_content_overrides_path_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governed_source_content_overrides
    ADD CONSTRAINT governed_source_content_overrides_path_fkey FOREIGN KEY (path) REFERENCES planning_query_store.governance_files(path) ON DELETE CASCADE;


--
-- Name: governance_fingerprints governance_fingerprints_path_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_fingerprints
    ADD CONSTRAINT governance_fingerprints_path_fkey FOREIGN KEY (path) REFERENCES planning_query_store.governance_files(path) ON DELETE CASCADE;


--
-- Name: governance_fingerprints governance_fingerprints_source_path_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_fingerprints
    ADD CONSTRAINT governance_fingerprints_source_path_fkey FOREIGN KEY (source_path) REFERENCES planning_query_store.governance_sources(source_path) ON DELETE CASCADE;


--
-- Name: governance_refresh_run_operations governance_refresh_run_operations_run_id_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_refresh_run_operations
    ADD CONSTRAINT governance_refresh_run_operations_run_id_fkey FOREIGN KEY (run_id) REFERENCES planning_query_store.governance_refresh_runs(run_id) ON DELETE CASCADE;


--
-- Name: governance_refresh_stage_runs governance_refresh_stage_runs_run_id_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_refresh_stage_runs
    ADD CONSTRAINT governance_refresh_stage_runs_run_id_fkey FOREIGN KEY (run_id) REFERENCES planning_query_store.governance_refresh_runs(run_id) ON DELETE CASCADE;


--
-- Name: governance_remediation governance_remediation_source_path_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.governance_remediation
    ADD CONSTRAINT governance_remediation_source_path_fkey FOREIGN KEY (source_path) REFERENCES planning_query_store.governance_sources(source_path) ON DELETE CASCADE;


--
-- Name: knowledge_action_items knowledge_action_items_source_document_id_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.knowledge_action_items
    ADD CONSTRAINT knowledge_action_items_source_document_id_fkey FOREIGN KEY (source_document_id) REFERENCES planning_query_store.knowledge_documents(document_id) ON DELETE CASCADE;


--
-- Name: knowledge_action_items knowledge_action_items_source_section_id_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.knowledge_action_items
    ADD CONSTRAINT knowledge_action_items_source_section_id_fkey FOREIGN KEY (source_section_id) REFERENCES planning_query_store.knowledge_document_sections(section_id) ON DELETE SET NULL;


--
-- Name: knowledge_action_links knowledge_action_links_action_id_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.knowledge_action_links
    ADD CONSTRAINT knowledge_action_links_action_id_fkey FOREIGN KEY (action_id) REFERENCES planning_query_store.knowledge_action_items(action_id) ON DELETE CASCADE;


--
-- Name: knowledge_document_links knowledge_document_links_from_document_id_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.knowledge_document_links
    ADD CONSTRAINT knowledge_document_links_from_document_id_fkey FOREIGN KEY (from_document_id) REFERENCES planning_query_store.knowledge_documents(document_id) ON DELETE CASCADE;


--
-- Name: knowledge_document_links knowledge_document_links_to_document_id_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.knowledge_document_links
    ADD CONSTRAINT knowledge_document_links_to_document_id_fkey FOREIGN KEY (to_document_id) REFERENCES planning_query_store.knowledge_documents(document_id) ON DELETE CASCADE;


--
-- Name: knowledge_document_sections knowledge_document_sections_document_id_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.knowledge_document_sections
    ADD CONSTRAINT knowledge_document_sections_document_id_fkey FOREIGN KEY (document_id) REFERENCES planning_query_store.knowledge_documents(document_id) ON DELETE CASCADE;


--
-- Name: knowledge_findings knowledge_findings_document_id_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.knowledge_findings
    ADD CONSTRAINT knowledge_findings_document_id_fkey FOREIGN KEY (document_id) REFERENCES planning_query_store.knowledge_documents(document_id) ON DELETE CASCADE;


--
-- Name: knowledge_findings knowledge_findings_section_id_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.knowledge_findings
    ADD CONSTRAINT knowledge_findings_section_id_fkey FOREIGN KEY (section_id) REFERENCES planning_query_store.knowledge_document_sections(section_id) ON DELETE SET NULL;


--
-- Name: knowledge_proposals knowledge_proposals_document_id_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.knowledge_proposals
    ADD CONSTRAINT knowledge_proposals_document_id_fkey FOREIGN KEY (document_id) REFERENCES planning_query_store.knowledge_documents(document_id) ON DELETE CASCADE;


--
-- Name: risk_debt_items risk_debt_items_source_path_fkey; Type: FK CONSTRAINT; Schema: planning_query_store; Owner: -
--

ALTER TABLE ONLY planning_query_store.risk_debt_items
    ADD CONSTRAINT risk_debt_items_source_path_fkey FOREIGN KEY (source_path) REFERENCES planning_query_store.governance_files(path) ON DELETE CASCADE;
