--
-- Name: architecture_component_dependency_observation_scan_idx; Type: INDEX; Schema: architecture; Owner: -
--

CREATE INDEX architecture_component_dependency_observation_scan_idx ON architecture.component_dependency_observation USING btree (scan_id, source_path);


--
-- Name: architecture_component_dependency_observation_source_component_; Type: INDEX; Schema: architecture; Owner: -
--

CREATE INDEX architecture_component_dependency_observation_source_component_ ON architecture.component_dependency_observation USING btree (source_component_id, relation_type);


--
-- Name: architecture_component_dependency_observation_target_component_; Type: INDEX; Schema: architecture; Owner: -
--

CREATE INDEX architecture_component_dependency_observation_target_component_ ON architecture.component_dependency_observation USING btree (target_component_id, relation_type);


--
-- Name: architecture_component_dependency_scan_design_idx; Type: INDEX; Schema: architecture; Owner: -
--

CREATE INDEX architecture_component_dependency_scan_design_idx ON architecture.component_dependency_scan USING btree (design_id, scan_state, scanned_at DESC);


--
-- Name: architecture_component_fitness_evaluation_scan_idx; Type: INDEX; Schema: architecture; Owner: -
--

CREATE INDEX architecture_component_fitness_evaluation_scan_idx ON architecture.component_fitness_evaluation USING btree (scan_id, fitness_rule_id, result_state);


--
-- Name: architecture_component_owner_idx; Type: INDEX; Schema: architecture; Owner: -
--

CREATE INDEX architecture_component_owner_idx ON architecture.component USING btree (owner, layer, kind);


--
-- Name: architecture_component_parent_idx; Type: INDEX; Schema: architecture; Owner: -
--

CREATE INDEX architecture_component_parent_idx ON architecture.component USING btree (parent_component_id);


--
-- Name: architecture_component_repo_path_idx; Type: INDEX; Schema: architecture; Owner: -
--

CREATE INDEX architecture_component_repo_path_idx ON architecture.component USING btree (repo_path);


--
-- Name: architecture_contract_owner_idx; Type: INDEX; Schema: architecture; Owner: -
--

CREATE INDEX architecture_contract_owner_idx ON architecture.contract USING btree (owner_component_id, contract_kind);


--
-- Name: architecture_design_operations_design_idx; Type: INDEX; Schema: architecture; Owner: -
--

CREATE INDEX architecture_design_operations_design_idx ON architecture.design_operations USING btree (design_id, created_at);


--
-- Name: architecture_design_operations_source_idx; Type: INDEX; Schema: architecture; Owner: -
--

CREATE INDEX architecture_design_operations_source_idx ON architecture.design_operations USING btree (source_ref, source_content_sha256);


--
-- Name: architecture_design_scope_subject_idx; Type: INDEX; Schema: architecture; Owner: -
--

CREATE INDEX architecture_design_scope_subject_idx ON architecture.design_scope USING btree (subject_kind, subject_id, scope_kind);


--
-- Name: architecture_design_work_item_idx; Type: INDEX; Schema: architecture; Owner: -
--

CREATE INDEX architecture_design_work_item_idx ON architecture.design USING btree (work_item_id, status);


--
-- Name: architecture_event_io_component_idx; Type: INDEX; Schema: architecture; Owner: -
--

CREATE INDEX architecture_event_io_component_idx ON architecture.component_event_io USING btree (component_id, direction);


--
-- Name: architecture_evidence_subject_idx; Type: INDEX; Schema: architecture; Owner: -
--

CREATE INDEX architecture_evidence_subject_idx ON architecture.evidence USING btree (subject_kind, subject_id, result_state);


--
-- Name: architecture_flow_step_component_idx; Type: INDEX; Schema: architecture; Owner: -
--

CREATE INDEX architecture_flow_step_component_idx ON architecture.component_flow_step USING btree (component_id);


--
-- Name: architecture_health_check_subject_idx; Type: INDEX; Schema: architecture; Owner: -
--

CREATE INDEX architecture_health_check_subject_idx ON architecture.component_health_check USING btree (subject_kind, subject_id, severity, status);


--
-- Name: architecture_observability_component_idx; Type: INDEX; Schema: architecture; Owner: -
--

CREATE INDEX architecture_observability_component_idx ON architecture.component_observability USING btree (component_id, required, signal_kind);


--
-- Name: architecture_port_component_idx; Type: INDEX; Schema: architecture; Owner: -
--

CREATE INDEX architecture_port_component_idx ON architecture.component_port USING btree (component_id, direction, port_kind);


--
-- Name: architecture_relation_source_idx; Type: INDEX; Schema: architecture; Owner: -
--

CREATE INDEX architecture_relation_source_idx ON architecture.component_relation USING btree (source_component_id, relation_type);


--
-- Name: architecture_relation_target_idx; Type: INDEX; Schema: architecture; Owner: -
--

CREATE INDEX architecture_relation_target_idx ON architecture.component_relation USING btree (target_component_id, relation_type);


--
-- Name: architecture_risk_component_idx; Type: INDEX; Schema: architecture; Owner: -
--

CREATE INDEX architecture_risk_component_idx ON architecture.risk USING btree (component_id, status, severity);


--
-- Name: architecture_storage_io_component_idx; Type: INDEX; Schema: architecture; Owner: -
--

CREATE INDEX architecture_storage_io_component_idx ON architecture.component_storage_io USING btree (component_id, direction);


--
-- Name: architecture_test_component_idx; Type: INDEX; Schema: architecture; Owner: -
--

CREATE INDEX architecture_test_component_idx ON architecture.component_test USING btree (component_id, required, test_kind);
