-- Migration 390 modeled InspectorVisualTokens as if it owned a separate
-- InspectCanvasNodeProperties rail. That creates an exact command/query rail
-- duplicate. The tokens support the existing node-properties query; move their
-- mechanization symbols onto the canonical rail and delete the duplicate local
-- rail declaration.

update planning_query_store.feature_mechanization_local_rails
set
  symbol_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(symbol_refs, '[]'::jsonb))
      union all
      values
        ('apps/web/src/app/components/inspector/inspectorVisualTokens.ts#inspectorVisualClasses'),
        ('apps/web/src/app/components/inspector/inspectorVisualTokens.ts#inspectorStatusDotClasses')
    ) refs(value)
  ),
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(implementation_refs, '[]'::jsonb))
      union all
      values
        ('apps/web/src/app/components/inspector/inspectorVisualTokens.ts'),
        ('apps/web/src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts'),
        ('tools/planning-db/migrations/389_inspector_visual_tokens_component_boundary.sql'),
        ('tools/planning-db/migrations/390_inspector_visual_tokens_feature_mechanization_symbols.sql'),
        ('tools/planning-db/migrations/392_inspector_visual_tokens_rail_duplicate_reconcile.sql')
    ) refs(value)
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(allowed_implementation_surfaces, '[]'::jsonb))
      union all
      values
        ('apps/web/src/app/components/inspector/inspectorVisualTokens.ts'),
        ('apps/web/src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts'),
        ('tools/planning-db/migrations/389_inspector_visual_tokens_component_boundary.sql'),
        ('tools/planning-db/migrations/390_inspector_visual_tokens_feature_mechanization_symbols.sql'),
        ('tools/planning-db/migrations/392_inspector_visual_tokens_rail_duplicate_reconcile.sql')
    ) refs(value)
  ),
  raw_manifest = jsonb_set(
    jsonb_set(
      coalesce(raw_manifest, '{}'::jsonb)
        || jsonb_build_object(
          'inspectorVisualTokenRailDuplicateReconcile',
          jsonb_build_object(
            'status', 'implemented',
            'canonicalRail', 'InspectCanvasNodeProperties',
            'canonicalRailId', 'local#CANVAS-NODE-CONTEXT-PROPERTIES-PANEL-20260604#query#inspectcanvasnodeproperties',
            'retiredDuplicateRailId', 'local#E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1#query#inspectcanvasnodeproperties-inspector-visual-tokens',
            'rail_vocabulary_exact_duplicate_reconciled', true
          )
        ),
      '{symbols}',
      coalesce(raw_manifest->'symbols', '[]'::jsonb)
        || jsonb_build_array(
          jsonb_build_object(
            'name', 'inspectorVisualClasses',
            'path', 'apps/web/src/app/components/inspector/inspectorVisualTokens.ts',
            'dddOwner', 'InspectorVisualTokens',
            'cqRails', jsonb_build_array('InspectCanvasNodeProperties'),
            'fowlerSignals', jsonb_build_array('presentation_token_contract', 'canonical_rail_support'),
            'architectureGuard', 'apps/web/src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts',
            'cypressCoverage', 'not_applicable:presentation_token_boundary_only',
            'unitTests', jsonb_build_array(
              'apps/web/src/app/components/InspectorPanel.test.tsx',
              'apps/web/src/app/components/inspector/NodePropertiesTabs.primarySections.test.tsx',
              'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx'
            )
          ),
          jsonb_build_object(
            'name', 'inspectorStatusDotClasses',
            'path', 'apps/web/src/app/components/inspector/inspectorVisualTokens.ts',
            'dddOwner', 'InspectorVisualTokens',
            'cqRails', jsonb_build_array('InspectCanvasNodeProperties'),
            'fowlerSignals', jsonb_build_array('presentation_token_contract', 'canonical_rail_support'),
            'architectureGuard', 'apps/web/src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts',
            'cypressCoverage', 'not_applicable:presentation_token_boundary_only',
            'unitTests', jsonb_build_array(
              'apps/web/src/app/components/InspectorPanel.test.tsx',
              'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx'
            )
          )
        ),
      true
    ),
    '{allowedImplementationSurfaces}',
    coalesce(raw_manifest->'allowedImplementationSurfaces', '[]'::jsonb)
      || jsonb_build_array(
        'apps/web/src/app/components/inspector/inspectorVisualTokens.ts',
        'apps/web/src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts',
        'tools/planning-db/migrations/389_inspector_visual_tokens_component_boundary.sql',
        'tools/planning-db/migrations/390_inspector_visual_tokens_feature_mechanization_symbols.sql',
        'tools/planning-db/migrations/392_inspector_visual_tokens_rail_duplicate_reconcile.sql'
      ),
    true
  ),
  source_path = 'tools/planning-db/migrations/392_inspector_visual_tokens_rail_duplicate_reconcile.sql',
  source_content_sha256 = md5(
    'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:InspectorVisualTokens:rail-duplicate-reconcile:392'
  ),
  revision = revision + 1,
  updated_at = now()
where rail_id = 'local#CANVAS-NODE-CONTEXT-PROPERTIES-PANEL-20260604#query#inspectcanvasnodeproperties';

delete from planning_query_store.feature_mechanization_local_rails
where rail_id = 'local#E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1#query#inspectcanvasnodeproperties-inspector-visual-tokens';
