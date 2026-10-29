--
-- Name: component_dependency_observation component_dependency_observation_pkey; Type: CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_dependency_observation
    ADD CONSTRAINT component_dependency_observation_pkey PRIMARY KEY (observation_id);


--
-- Name: component_dependency_scan component_dependency_scan_pkey; Type: CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_dependency_scan
    ADD CONSTRAINT component_dependency_scan_pkey PRIMARY KEY (scan_id);


--
-- Name: component_event_io component_event_io_pkey; Type: CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_event_io
    ADD CONSTRAINT component_event_io_pkey PRIMARY KEY (event_io_id);


--
-- Name: component_fitness_evaluation component_fitness_evaluation_pkey; Type: CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_fitness_evaluation
    ADD CONSTRAINT component_fitness_evaluation_pkey PRIMARY KEY (evaluation_id);


--
-- Name: component_flow component_flow_pkey; Type: CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_flow
    ADD CONSTRAINT component_flow_pkey PRIMARY KEY (flow_id);


--
-- Name: component_flow_step component_flow_step_pkey; Type: CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_flow_step
    ADD CONSTRAINT component_flow_step_pkey PRIMARY KEY (flow_id, step_order);


--
-- Name: component_health_check component_health_check_pkey; Type: CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_health_check
    ADD CONSTRAINT component_health_check_pkey PRIMARY KEY (check_id);


--
-- Name: component_metric component_metric_pkey; Type: CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_metric
    ADD CONSTRAINT component_metric_pkey PRIMARY KEY (metric_id);


--
-- Name: component_observability component_observability_pkey; Type: CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_observability
    ADD CONSTRAINT component_observability_pkey PRIMARY KEY (observability_id);


--
-- Name: component component_pkey; Type: CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component
    ADD CONSTRAINT component_pkey PRIMARY KEY (component_id);


--
-- Name: component_port component_port_pkey; Type: CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_port
    ADD CONSTRAINT component_port_pkey PRIMARY KEY (port_id);


--
-- Name: component_relation component_relation_pkey; Type: CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_relation
    ADD CONSTRAINT component_relation_pkey PRIMARY KEY (relation_id);


--
-- Name: component_responsibility component_responsibility_pkey; Type: CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_responsibility
    ADD CONSTRAINT component_responsibility_pkey PRIMARY KEY (responsibility_id);


--
-- Name: component_storage_io component_storage_io_pkey; Type: CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_storage_io
    ADD CONSTRAINT component_storage_io_pkey PRIMARY KEY (storage_io_id);


--
-- Name: component_test component_test_pkey; Type: CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_test
    ADD CONSTRAINT component_test_pkey PRIMARY KEY (test_id);


--
-- Name: component_transformation component_transformation_pkey; Type: CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.component_transformation
    ADD CONSTRAINT component_transformation_pkey PRIMARY KEY (transformation_id);


--
-- Name: contract contract_pkey; Type: CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.contract
    ADD CONSTRAINT contract_pkey PRIMARY KEY (contract_id);


--
-- Name: decision decision_pkey; Type: CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.decision
    ADD CONSTRAINT decision_pkey PRIMARY KEY (decision_id);


--
-- Name: design_operations design_operations_idempotency_key_key; Type: CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.design_operations
    ADD CONSTRAINT design_operations_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: design_operations design_operations_pkey; Type: CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.design_operations
    ADD CONSTRAINT design_operations_pkey PRIMARY KEY (operation_id);


--
-- Name: design design_pkey; Type: CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.design
    ADD CONSTRAINT design_pkey PRIMARY KEY (design_id);


--
-- Name: design_scope design_scope_pkey; Type: CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.design_scope
    ADD CONSTRAINT design_scope_pkey PRIMARY KEY (design_id, subject_kind, subject_id, scope_kind);


--
-- Name: evidence evidence_pkey; Type: CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.evidence
    ADD CONSTRAINT evidence_pkey PRIMARY KEY (evidence_id);


--
-- Name: risk risk_pkey; Type: CONSTRAINT; Schema: architecture; Owner: -
--

ALTER TABLE ONLY architecture.risk
    ADD CONSTRAINT risk_pkey PRIMARY KEY (risk_id);
