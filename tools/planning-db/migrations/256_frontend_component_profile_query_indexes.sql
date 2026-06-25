-- Keep frontend component profile reads bounded to indexed component lookups.
-- This applies to databases that already ran migration 255 before the local
-- overlay profile index was added.

create index if not exists frontend_component_evidence_component_idx
  on planning_query_store.frontend_component_evidence (component_id, evidence_id);

