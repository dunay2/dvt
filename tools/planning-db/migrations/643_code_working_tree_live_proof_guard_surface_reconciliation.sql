-- Keep the review-hardening migrations inside the explicit implementation
-- boundary of the existing live proof command.

update planning_query_store.feature_mechanization_local_rails rails
set
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct surface order by surface)
    from jsonb_array_elements_text(
      coalesce(rails.allowed_implementation_surfaces, '[]'::jsonb)
        || jsonb_build_array(
          'tools/planning-db/migrations/642_code_working_tree_live_proof_single_spec_guard.sql',
          'tools/planning-db/migrations/643_code_working_tree_live_proof_guard_surface_reconciliation.sql'
        )
    ) surfaces(surface)
  ),
  raw_manifest = jsonb_set(
    coalesce(rails.raw_manifest, '{}'::jsonb),
    '{allowedImplementationSurfaces}',
    (
      select jsonb_agg(distinct surface order by surface)
      from jsonb_array_elements_text(
        coalesce(rails.raw_manifest -> 'allowedImplementationSurfaces', '[]'::jsonb)
          || jsonb_build_array(
            'tools/planning-db/migrations/642_code_working_tree_live_proof_single_spec_guard.sql',
            'tools/planning-db/migrations/643_code_working_tree_live_proof_guard_surface_reconciliation.sql'
          )
      ) surfaces(surface)
    ),
    true
  ),
  source_path = 'tools/planning-db/migrations/643_code_working_tree_live_proof_guard_surface_reconciliation.sql',
  source_content_sha256 = repeat(md5('RunDbtAuthorCodeRunLiveProof:guard-surfaces:643'), 2),
  revision = rails.revision + 1,
  updated_at = now()
where rails.rail_id = 'local#E-DBT-CODE-WORKING-TREE-SYNC-20260712#command#rundbtauthorcoderunliveproof';
