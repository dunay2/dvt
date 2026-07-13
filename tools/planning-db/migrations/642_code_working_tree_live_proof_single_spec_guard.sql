-- Harden the existing delivery proof command so one invocation can select
-- exactly one literal governed Cypress spec. Lists and glob expressions must
-- fail before the protected runtime starts.

update planning_query_store.feature_mechanization_local_rails rails
set
  raw_rail = jsonb_set(
    coalesce(rails.raw_rail, '{}'::jsonb),
    '{negativeTests}',
    (
      select jsonb_agg(distinct negative_test order by negative_test)
      from jsonb_array_elements_text(
        coalesce(rails.raw_rail -> 'negativeTests', '[]'::jsonb)
          || jsonb_build_array(
            'reject comma-separated Cypress spec lists before runtime startup',
            'reject Cypress glob expressions before runtime startup'
          )
      ) negative_tests(negative_test)
    ),
    true
  ),
  architecture_guards = (
    select jsonb_agg(distinct guard order by guard)
    from jsonb_array_elements_text(
      coalesce(rails.architecture_guards, '[]'::jsonb)
        || jsonb_build_array(
          'one literal Cypress spec per protected runtime invocation',
          'node --test scripts/run-selected-closure-live-proof.test.cjs'
        )
    ) guards(guard)
  ),
  raw_manifest = jsonb_set(
    coalesce(rails.raw_manifest, '{}'::jsonb),
    '{redGreenCycles}',
    coalesce(rails.raw_manifest -> 'redGreenCycles', '[]'::jsonb)
      || jsonb_build_array(
        jsonb_build_object(
          'id', 'code-working-tree-live-single-spec-review-hardening',
          'redTest', 'node --test scripts/run-selected-closure-live-proof.test.cjs',
          'expectedFailure', 'Comma-separated lists and glob expressions reach Cypress instead of failing before runtime startup.',
          'patchSurfaces', jsonb_build_array(
            'scripts/run-selected-closure-live-proof.cjs',
            'scripts/run-selected-closure-live-proof.test.cjs'
          ),
          'greenTest', 'node --test scripts/run-selected-closure-live-proof.test.cjs'
        )
      ),
    true
  ),
  source_path = 'tools/planning-db/migrations/642_code_working_tree_live_proof_single_spec_guard.sql',
  source_content_sha256 = repeat(md5('RunDbtAuthorCodeRunLiveProof:single-spec:642'), 2),
  revision = rails.revision + 1,
  updated_at = now()
where rails.rail_id = 'local#E-DBT-CODE-WORKING-TREE-SYNC-20260712#command#rundbtauthorcoderunliveproof';

update planning_query_store.frontend_component_local_evidence
set
  raw_evidence = coalesce(raw_evidence, '{}'::jsonb) || jsonb_build_object(
    'singleLiteralSpecOnly', true,
    'rejectedSelectors', jsonb_build_array('comma-separated list', 'glob expression')
  ),
  source_path = 'tools/planning-db/migrations/642_code_working_tree_live_proof_single_spec_guard.sql',
  source_content_sha256 = md5('EV-CODE-WORKING-TREE-LIVE-VERTICAL:single-spec:642'),
  updated_at = now()
where evidence_id = 'EV-CODE-WORKING-TREE-LIVE-VERTICAL';
