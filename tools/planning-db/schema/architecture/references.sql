--
-- Name: component_dependency_observation component_dependency_observation_scan_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_dependency_observation
    ADD CONSTRAINT component_dependency_observation_scan_id_fkey FOREIGN KEY (scan_id) REFERENCES architecture.component_dependency_scan(scan_id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_dependency_observation component_dependency_observation_source_component_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_dependency_observation
    ADD CONSTRAINT component_dependency_observation_source_component_id_fkey FOREIGN KEY (source_component_id) REFERENCES architecture.component(component_id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_dependency_observation component_dependency_observation_target_component_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_dependency_observation
    ADD CONSTRAINT component_dependency_observation_target_component_id_fkey FOREIGN KEY (target_component_id) REFERENCES architecture.component(component_id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_dependency_scan component_dependency_scan_design_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_dependency_scan
    ADD CONSTRAINT component_dependency_scan_design_id_fkey FOREIGN KEY (design_id) REFERENCES architecture.design(design_id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_event_io component_event_io_component_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_event_io
    ADD CONSTRAINT component_event_io_component_id_fkey FOREIGN KEY (component_id) REFERENCES architecture.component(component_id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_event_io component_event_io_contract_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_event_io
    ADD CONSTRAINT component_event_io_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES architecture.contract(contract_id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_fitness_evaluation component_fitness_evaluation_scan_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_fitness_evaluation
    ADD CONSTRAINT component_fitness_evaluation_scan_id_fkey FOREIGN KEY (scan_id) REFERENCES architecture.component_dependency_scan(scan_id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_flow component_flow_entry_component_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_flow
    ADD CONSTRAINT component_flow_entry_component_id_fkey FOREIGN KEY (entry_component_id) REFERENCES architecture.component(component_id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_flow component_flow_exit_component_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_flow
    ADD CONSTRAINT component_flow_exit_component_id_fkey FOREIGN KEY (exit_component_id) REFERENCES architecture.component(component_id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_flow_step component_flow_step_component_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_flow_step
    ADD CONSTRAINT component_flow_step_component_id_fkey FOREIGN KEY (component_id) REFERENCES architecture.component(component_id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_flow_step component_flow_step_flow_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_flow_step
    ADD CONSTRAINT component_flow_step_flow_id_fkey FOREIGN KEY (flow_id) REFERENCES architecture.component_flow(flow_id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_flow_step component_flow_step_input_contract_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_flow_step
    ADD CONSTRAINT component_flow_step_input_contract_id_fkey FOREIGN KEY (input_contract_id) REFERENCES architecture.contract(contract_id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_flow_step component_flow_step_output_contract_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_flow_step
    ADD CONSTRAINT component_flow_step_output_contract_id_fkey FOREIGN KEY (output_contract_id) REFERENCES architecture.contract(contract_id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_flow_step component_flow_step_relation_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_flow_step
    ADD CONSTRAINT component_flow_step_relation_id_fkey FOREIGN KEY (relation_id) REFERENCES architecture.component_relation(relation_id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_flow_step component_flow_step_transformation_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_flow_step
    ADD CONSTRAINT component_flow_step_transformation_id_fkey FOREIGN KEY (transformation_id) REFERENCES architecture.component_transformation(transformation_id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_metric component_metric_component_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_metric
    ADD CONSTRAINT component_metric_component_id_fkey FOREIGN KEY (component_id) REFERENCES architecture.component(component_id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_observability component_observability_component_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_observability
    ADD CONSTRAINT component_observability_component_id_fkey FOREIGN KEY (component_id) REFERENCES architecture.component(component_id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component component_parent_component_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component
    ADD CONSTRAINT component_parent_component_id_fkey FOREIGN KEY (parent_component_id) REFERENCES architecture.component(component_id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_port component_port_component_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_port
    ADD CONSTRAINT component_port_component_id_fkey FOREIGN KEY (component_id) REFERENCES architecture.component(component_id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_port component_port_input_contract_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_port
    ADD CONSTRAINT component_port_input_contract_id_fkey FOREIGN KEY (input_contract_id) REFERENCES architecture.contract(contract_id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_port component_port_output_contract_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_port
    ADD CONSTRAINT component_port_output_contract_id_fkey FOREIGN KEY (output_contract_id) REFERENCES architecture.contract(contract_id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_relation component_relation_contract_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_relation
    ADD CONSTRAINT component_relation_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES architecture.contract(contract_id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_relation component_relation_source_component_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_relation
    ADD CONSTRAINT component_relation_source_component_id_fkey FOREIGN KEY (source_component_id) REFERENCES architecture.component(component_id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_relation component_relation_target_component_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_relation
    ADD CONSTRAINT component_relation_target_component_id_fkey FOREIGN KEY (target_component_id) REFERENCES architecture.component(component_id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_responsibility component_responsibility_component_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_responsibility
    ADD CONSTRAINT component_responsibility_component_id_fkey FOREIGN KEY (component_id) REFERENCES architecture.component(component_id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_storage_io component_storage_io_component_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_storage_io
    ADD CONSTRAINT component_storage_io_component_id_fkey FOREIGN KEY (component_id) REFERENCES architecture.component(component_id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_storage_io component_storage_io_contract_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_storage_io
    ADD CONSTRAINT component_storage_io_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES architecture.contract(contract_id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_test component_test_component_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_test
    ADD CONSTRAINT component_test_component_id_fkey FOREIGN KEY (component_id) REFERENCES architecture.component(component_id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_transformation component_transformation_component_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_transformation
    ADD CONSTRAINT component_transformation_component_id_fkey FOREIGN KEY (component_id) REFERENCES architecture.component(component_id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_transformation component_transformation_input_contract_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_transformation
    ADD CONSTRAINT component_transformation_input_contract_id_fkey FOREIGN KEY (input_contract_id) REFERENCES architecture.contract(contract_id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;


--
-- Name: component_transformation component_transformation_output_contract_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_transformation
    ADD CONSTRAINT component_transformation_output_contract_id_fkey FOREIGN KEY (output_contract_id) REFERENCES architecture.contract(contract_id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;


--
-- Name: contract contract_owner_component_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.contract
    ADD CONSTRAINT contract_owner_component_id_fkey FOREIGN KEY (owner_component_id) REFERENCES architecture.component(component_id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;


--
-- Name: design_operations design_operations_design_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.design_operations
    ADD CONSTRAINT design_operations_design_id_fkey FOREIGN KEY (design_id) REFERENCES architecture.design(design_id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;


--
-- Name: design_scope design_scope_design_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.design_scope
    ADD CONSTRAINT design_scope_design_id_fkey FOREIGN KEY (design_id) REFERENCES architecture.design(design_id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;


--
-- Name: evidence evidence_design_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.evidence
    ADD CONSTRAINT evidence_design_id_fkey FOREIGN KEY (design_id) REFERENCES architecture.design(design_id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;


--
-- Name: design design_supersedes_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.design
    ADD CONSTRAINT design_supersedes_id_fkey FOREIGN KEY (supersedes_id) REFERENCES architecture.design(design_id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: risk risk_component_id_fkey; Type: FK CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.risk
    ADD CONSTRAINT risk_component_id_fkey FOREIGN KEY (component_id) REFERENCES architecture.component(component_id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
