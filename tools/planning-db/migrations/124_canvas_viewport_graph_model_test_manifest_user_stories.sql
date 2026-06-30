-- Repair the DB-first feature mechanization manifest for the Canvas viewport
-- graph-model test modularization rail. The imported local rail already owns
-- the component-test split, but its effective raw manifest missed userStories,
-- which makes the feature-mechanization checker fail closed.

update planning_query_store.feature_mechanization_local_rails
set
  raw_manifest =
    raw_manifest
    || jsonb_build_object(
      'userStories',
      jsonb_build_array(
        'Canvas viewport graph-model tests remain focused by component behavior instead of one oversized integration fixture.',
        'Retired or repointed Canvas graph-model test paths remain explicit DB evidence rather than being recreated as empty files.'
      ),
      'allowedImplementationSurfaces',
      coalesce(raw_manifest->'allowedImplementationSurfaces', '[]'::jsonb)
        || jsonb_build_array(
          'tools/planning-db/migrations/124_canvas_viewport_graph_model_test_manifest_user_stories.sql'
        ),
      'redGreenCycles',
      coalesce(raw_manifest->'redGreenCycles', '[]'::jsonb)
        || jsonb_build_array(
          jsonb_build_object(
            'id',
            'validatecanvasviewportgraphmodelcomponenttests-user-stories-repair',
            'redTest',
            'pnpm docs:feature-mechanization:implementation',
            'expectedFailure',
            'The DB-local Canvas viewport graph-model component-test rail raw manifest is missing userStories.',
            'patchSurfaces',
            jsonb_build_array(
              'tools/planning-db/migrations/124_canvas_viewport_graph_model_test_manifest_user_stories.sql'
            ),
            'greenTest',
            'pnpm docs:feature-mechanization:implementation'
          )
        )
    ),
  completion_gate =
    completion_gate
    || jsonb_build_array(
      'pnpm docs:feature-mechanization:implementation'
    ),
  updated_at = now(),
  revision = revision + 1
where rail_id = 'local#CANVAS-VIEWPORT-GRAPH-MODEL-TEST-MODULARIZATION-20260618#command#validatecanvasviewportgraphmodelcomponenttests';
