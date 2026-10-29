--
-- Name: component_flow_query _RETURN; Type: RULE; Schema: architecture; Owner: -
--

CREATE OR REPLACE VIEW architecture.component_flow_query AS
 SELECT flow.flow_id,
    flow.name,
    flow.entry_component_id,
    entry_component.name AS entry_component_name,
    flow.exit_component_id,
    exit_component.name AS exit_component_name,
    flow.flow_kind,
    flow.status,
    flow.criticality,
    (count(step.step_order))::integer AS step_count,
    flow.created_at,
    flow.updated_at
   FROM (((architecture.component_flow flow
     JOIN architecture.component entry_component ON ((entry_component.component_id = flow.entry_component_id)))
     JOIN architecture.component exit_component ON ((exit_component.component_id = flow.exit_component_id)))
     LEFT JOIN architecture.component_flow_step step ON ((step.flow_id = flow.flow_id)))
  GROUP BY flow.flow_id, entry_component.name, exit_component.name;
