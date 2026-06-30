-- Repoint the local retired contextual card read-model duplicate to the
-- governed execution prompt after the prompt moved out of retired buzon intake.

update planning_query_store.feature_mechanization_local_rails
set
  source_path = 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-coherence-prompt-20260615.md',
  source_content_sha256 = '154ff0acdea4ae3f9d998586b719e38c784ddd20d97867b5a8c2842f3373e760',
  revision = greatest(revision, 7),
  updated_at = now()
where feature_id = 'CANVAS-CONTEXTUAL-UX-DB-FIRST-MAPPING-1'
  and rail_type = 'query'
  and normalized_rail_name = 'projectgraphnodecardreadmodel'
  and rail_status = 'retired'
  and source_path in (
    'buzon/TAREA.TXT',
    'buzon/planning-db-component-coherence-prompt-20260615.md',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-coherence-prompt-20260615.md'
  );
