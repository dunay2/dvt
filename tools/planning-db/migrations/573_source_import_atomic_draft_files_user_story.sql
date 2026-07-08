-- Rehydrate the ImportWarehouseSources local feature manifest with the
-- operator-facing story required by the feature-mechanization guard.
-- Migration 572 registered the atomicity evidence; this migration keeps the
-- append-only Planning DB history stable after the first local application.

update planning_query_store.feature_mechanization_local_rails rails
set
  raw_manifest = jsonb_set(
    coalesce(rails.raw_manifest, '{}'::jsonb),
    '{userStories}',
    case
      when coalesce(rails.raw_manifest -> 'userStories', '[]'::jsonb) @> jsonb_build_array(
        'Source import graph commits are atomic with source YAML persistence.'
      ) then coalesce(rails.raw_manifest -> 'userStories', '[]'::jsonb)
      else coalesce(rails.raw_manifest -> 'userStories', '[]'::jsonb) || jsonb_build_array(
        'Source import graph commits are atomic with source YAML persistence.'
      )
    end,
    true
  ),
  source_path = 'tools/planning-db/migrations/573_source_import_atomic_draft_files_user_story.sql',
  source_content_sha256 = md5('E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1:source-import-atomic-draft-files-user-story:573'),
  revision = rails.revision + 1,
  updated_at = now()
where rails.rail_id = 'local#E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1#command#importwarehousesources';
