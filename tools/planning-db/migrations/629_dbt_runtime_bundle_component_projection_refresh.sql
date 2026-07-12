-- Publish the StartRun rail and focused test ownership changes recorded by
-- migration 628 through the materialized component-profile read model.

refresh materialized view planning_query_store.component_engineering_component_tree_projection;
