--
-- Name: governance_component_local_definitions governance_component_local_definitions_invariants; Type: TRIGGER; Schema: planning_query_store; Owner: -
--

CREATE CONSTRAINT TRIGGER governance_component_local_definitions_invariants AFTER INSERT OR DELETE OR UPDATE ON planning_query_store.governance_component_local_definitions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION planning_query_store.check_governance_component_local_definition_invariants();


--
-- Name: governance_component_local_ownership_patterns governance_component_local_ownership_patterns_invariants; Type: TRIGGER; Schema: planning_query_store; Owner: -
--

CREATE CONSTRAINT TRIGGER governance_component_local_ownership_patterns_invariants AFTER INSERT OR DELETE OR UPDATE ON planning_query_store.governance_component_local_ownership_patterns DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION planning_query_store.check_governance_component_local_definition_invariants();


--
-- Name: governance_component_local_semantic_items governance_component_local_semantic_items_invariants; Type: TRIGGER; Schema: planning_query_store; Owner: -
--

CREATE CONSTRAINT TRIGGER governance_component_local_semantic_items_invariants AFTER INSERT OR DELETE OR UPDATE ON planning_query_store.governance_component_local_semantic_items DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION planning_query_store.check_governance_component_local_definition_invariants();
