-- Complete the DB-authored Canvas viewport graph-model test mechanization
-- manifest for fresh CI databases. Migration 124 reconciles the rail source to
-- split tests; this follow-up adds the required user story evidence without
-- editing the already-applied migration history.

update planning_query_store.feature_mechanization_local_rails
set
  raw_manifest = raw_manifest || jsonb_build_object(
    'userStories',
    jsonb_build_array(
      'As a Canvas maintainer, I can validate viewport graph-model edges, node data, and layout behavior through focused split tests.',
      'As a Planning DB reviewer, I can see removed monolithic viewport tests as deprecated evidence instead of active source paths.'
    )
  ),
  updated_at = now()
where rail_id =
  'local#CANVAS-VIEWPORT-GRAPH-MODEL-TEST-MODULARIZATION-20260618#command#validatecanvasviewportgraphmodelcomponenttests'
  and not raw_manifest ? 'userStories';
