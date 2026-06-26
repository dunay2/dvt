-- Repoint the DBT test semantics Node Workbench feature rail away from raw
-- intake files. The rail owner is the governed Canvas Node Workbench panel;
-- semantic presenter files remain implementation refs, not source authority.

update planning_query_store.feature_mechanization_local_rails
set
  source_path = 'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
  source_content_sha256 =
    md5('E-CANVAS-DBT-TEST-SEMANTICS-WORKBENCH-1:CanvasNodeWorkbenchPanel:308')
    || md5('InspectCanvasNodeProperties:dbt-test-semantics'),
  symbol_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(symbol_refs, '[]'::jsonb)) current_refs(value)
      union all
      values
        ('apps/web/src/app/components/inspector/dbtTestSemanticsPresenter.ts#projectDbtTestSemantics'),
        ('apps/web/src/app/components/inspector/nodePropertiesReadModel.ts#buildNodePropertiesReadModel'),
        ('apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx#CanvasNodeWorkbenchPanel')
    ) next_refs
  ),
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(implementation_refs, '[]'::jsonb)) current_refs(value)
      union all
      values
        ('apps/web/src/app/components/inspector/dbtTestSemanticsPresenter.ts#projectDbtTestSemantics'),
        ('apps/web/src/app/components/inspector/nodePropertiesReadModel.ts#buildNodePropertiesReadModel'),
        ('apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx#CanvasNodeWorkbenchPanel')
    ) next_refs
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(allowed_implementation_surfaces, '[]'::jsonb)) current_refs(value)
      union all
      values
        ('apps/web/src/app/components/inspector/dbtTestSemanticsPresenter.ts'),
        ('apps/web/src/app/components/inspector/nodePropertiesReadModel.ts'),
        ('apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx')
    ) next_refs
  ),
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'version', 1,
      'featureId', 'E-CANVAS-DBT-TEST-SEMANTICS-WORKBENCH-1',
      'mechanizationStatus', 'implemented',
      'implementationPlan',
      'planning-db://canvas-uxdb-specification/component.node-workbench.tests',
      'userStories',
      jsonb_build_array('planning-db://canvas-uxdb-specification/TEST-UX-016'),
      'currentImplementationSourcePath',
      'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
      'allowedImplementationSurfaces',
      jsonb_build_array(
        'apps/web/src/app/components/inspector/dbtTestSemanticsPresenter.ts',
        'apps/web/src/app/components/inspector/nodePropertiesReadModel.ts',
        'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx'
      ),
      'forbiddenSurfaces', jsonb_build_array('buzon/**'),
      'postImportFeatureManifestReconciledBy',
      '308_repoint_dbt_test_semantics_workbench_rail_source'
    ),
  raw_rail = coalesce(raw_rail, '{}'::jsonb)
    || jsonb_build_object(
      'name', 'InspectCanvasNodeProperties',
      'type', 'query',
      'dddOwner', 'CanvasNodeWorkbenchPanel',
      'status', 'implemented',
      'sourcePath', 'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx'
    ),
  revision = revision + 1,
  updated_at = now()
where rail_id = 'local#E-CANVAS-DBT-TEST-SEMANTICS-WORKBENCH-1#query#inspectcanvasnodeproperties';
