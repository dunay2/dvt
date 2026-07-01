-- Repair source drift left by the DBT warehouse-source preview/run review
-- manifest. Feature mechanization rows must point to tracked repository
-- sources, not ephemeral agent-prompt identifiers.

update planning_query_store.feature_mechanization_local_rails
set
  source_path = 'tools/planning-db/migrations/402_repoint_dbt_warehouse_source_preview_run_review.sql',
  source_content_sha256 = md5('E-DBT-AUTHOR-RUN-20260526:warehouse-source-preview-run-review:402'),
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'sourceDriftRepair',
      jsonb_build_object(
        'status',
        'implemented',
        'previousSourcePath',
        'agent-prompt:dbt-warehouse-source-preview-run-review-20260701',
        'reason',
        'Feature mechanization source paths must resolve to tracked repository files.'
      )
    ),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-DBT-AUTHOR-RUN-20260526'
  and rail_name in ('GenerateDbtWorkspaceArtifacts', 'SelectDbtModelOrigin')
  and source_path = 'agent-prompt:dbt-warehouse-source-preview-run-review-20260701';
