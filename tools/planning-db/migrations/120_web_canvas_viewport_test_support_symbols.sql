-- Register the Canvas viewport graph-model test helper exports as DB-first
-- feature-mechanization symbols. The prepush guard rejects new exported symbols
-- unless the Planning DB owns their feature manifest.

insert into planning_query_store.feature_mechanization_local_rails (
  rail_id,
  feature_id,
  mechanization_status,
  rail_name,
  normalized_rail_name,
  rail_type,
  ddd_owner,
  rail_status,
  symbol_refs,
  implementation_refs,
  documentation_refs,
  governing_sources,
  allowed_implementation_surfaces,
  architecture_guards,
  completion_gate,
  source_path,
  source_content_sha256,
  raw_rail,
  raw_manifest,
  revision,
  created_by
)
values (
  'local#CANVAS-VIEWPORT-GRAPH-MODEL-TEST-MODULARIZATION-20260618#command#validatecanvasviewportgraphmodelcomponenttests',
  'CANVAS-VIEWPORT-GRAPH-MODEL-TEST-MODULARIZATION-20260618',
  'implemented',
  'ValidateCanvasViewportGraphModelComponentTests',
  'validatecanvasviewportgraphmodelcomponenttests',
  'command',
  'CanvasGraphViewportPresentation',
  'implemented',
  '[
    "apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.support.ts#ViewportGraphModelArgs",
    "apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.support.ts#ViewportGraphModelState",
    "apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.support.ts#buildCanonicalNode",
    "apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.support.ts#buildViewportGraphModelArgs",
    "apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.support.ts#renderViewportGraphModel"
  ]'::jsonb,
  '[
    "apps/web/src/app/views/canvas/useCanvasViewportGraphModel.edges.test.tsx",
    "apps/web/src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx",
    "apps/web/src/app/views/canvas/useCanvasViewportGraphModel.layout.test.tsx",
    "apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.support.ts#ViewportGraphModelArgs",
    "apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.support.ts#ViewportGraphModelState",
    "apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.support.ts#buildCanonicalNode",
    "apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.support.ts#buildViewportGraphModelArgs",
    "apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.support.ts#renderViewportGraphModel"
  ]'::jsonb,
  '[
    "docs/architecture/components/web/graph/canvas-layout-persistence-component.md",
    "docs/architecture/components/web/graph/canvas-startup-and-draft-recovery-user-stories.md",
    "docs/architecture/components/web/graph/canvas-workspace-explorer-user-stories.md",
    "docs/planning/status/canonical-doc-code-matrix.md"
  ]'::jsonb,
  '[
    "docs/planning/status/governance-document-rule-inventory.md",
    "docs/guides/ai-work-protocol.md",
    "docs/architecture/command-query-rail-governance.md",
    "docs/architecture/fowler-opportunity-planning-governance.md",
    "buzon/TAREA.TXT"
  ]'::jsonb,
  '[
    "apps/web/src/app/views/canvas/useCanvasViewportGraphModel.edges.test.tsx",
    "apps/web/src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx",
    "apps/web/src/app/views/canvas/useCanvasViewportGraphModel.layout.test.tsx",
    "apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.support.ts",
    "tools/planning-db/migrations/119_web_canvas_test_modularization.sql",
    "tools/planning-db/migrations/120_web_canvas_viewport_test_support_symbols.sql"
  ]'::jsonb,
  '[
    "apps/web/src/app/views/canvas/useCanvasViewportGraphModel.architecture.test.ts",
    "apps/web/src/testing/vitestSuites.architecture.test.ts"
  ]'::jsonb,
  '[
    "pnpm --filter @dvt/web exec vitest run --config vitest.config.ts src/app/views/canvas/useCanvasViewportGraphModel.edges.test.tsx src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx src/app/views/canvas/useCanvasViewportGraphModel.layout.test.tsx",
    "pnpm --filter @dvt/web lint",
    "pnpm --filter @dvt/web typecheck",
    "pnpm docs:feature-mechanization:implementation",
    "pnpm verify:prepush"
  ]'::jsonb,
  'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.support.ts',
  '3fe92aa9e7c9f358921d1409acc2e914e9acadee8d9d35a01931d0fb1fd00961',
  '{
    "name": "ValidateCanvasViewportGraphModelComponentTests",
    "type": "command",
    "dddOwner": "CanvasGraphViewportPresentation",
    "status": "implemented"
  }'::jsonb,
  '{
    "version": 1,
    "featureId": "CANVAS-VIEWPORT-GRAPH-MODEL-TEST-MODULARIZATION-20260618",
    "mechanizationStatus": "implemented",
    "noHumanDecisionsRemaining": true,
    "implementationPlan": "DB-first Canvas viewport graph-model test modularization splits one oversized hook test into edge, node-data, and layout component checks while retiring duplicate legacy guide DOM assertions.",
    "componentGuides": [
      "docs/architecture/components/web/graph/canvas-layout-persistence-component.md",
      "docs/architecture/components/web/graph/canvas-startup-and-draft-recovery-user-stories.md",
      "docs/architecture/components/web/graph/canvas-workspace-explorer-user-stories.md"
    ],
    "userStories": [
      "Canvas viewport graph-model tests remain focused by component behavior instead of one oversized fixture.",
      "Retired Canvas guide assertions remain covered by architecture import guards instead of duplicate DOM absence tests."
    ],
    "governingSources": [
      "docs/planning/status/governance-document-rule-inventory.md",
      "docs/guides/ai-work-protocol.md",
      "docs/architecture/command-query-rail-governance.md",
      "docs/architecture/fowler-opportunity-planning-governance.md",
      "buzon/TAREA.TXT"
    ],
    "allowedImplementationSurfaces": [
      "apps/web/src/app/views/canvas/useCanvasViewportGraphModel.edges.test.tsx",
      "apps/web/src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx",
      "apps/web/src/app/views/canvas/useCanvasViewportGraphModel.layout.test.tsx",
      "apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.support.ts",
      "tools/planning-db/migrations/119_web_canvas_test_modularization.sql",
      "tools/planning-db/migrations/120_web_canvas_viewport_test_support_symbols.sql"
    ],
    "forbiddenImplementationSurfaces": [
      "apps/web/src/app/views/canvas/useCanvasViewportGraphModel.ts",
      "apps/web/src/app/views/canvas/CanvasViewport.tsx"
    ],
    "domainObjects": [
      "CanvasGraphViewportPresentation",
      "CanvasViewportGraphModelTestHarness"
    ],
    "fowlerSignals": [
      "test_harness_overload",
      "evidence_duplication"
    ],
    "architectureGuards": [
      "apps/web/src/app/views/canvas/useCanvasViewportGraphModel.architecture.test.ts"
    ],
    "cypressFlows": [
      "not_applicable:component_test_modularization"
    ],
    "completionGate": [
      "pnpm --filter @dvt/web exec vitest run --config vitest.config.ts src/app/views/canvas/useCanvasViewportGraphModel.edges.test.tsx src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx src/app/views/canvas/useCanvasViewportGraphModel.layout.test.tsx",
      "pnpm --filter @dvt/web lint",
      "pnpm --filter @dvt/web typecheck",
      "pnpm docs:feature-mechanization:implementation",
      "pnpm verify:prepush"
    ],
    "commandQueryRails": [
      {
        "name": "ValidateCanvasViewportGraphModelComponentTests",
        "type": "command",
        "dddOwner": "CanvasGraphViewportPresentation",
        "status": "implemented"
      }
    ],
    "redGreenCycles": [
      {
        "id": "validatecanvasviewportgraphmodelcomponenttests-record",
        "redTest": "pnpm docs:feature-mechanization:implementation",
        "expectedFailure": "New exported symbols in useCanvasViewportGraphModel.test.support.ts are rejected until the Planning DB manifest declares them.",
        "patchSurfaces": [
          "tools/planning-db/migrations/120_web_canvas_viewport_test_support_symbols.sql"
        ],
        "greenTest": "pnpm docs:feature-mechanization:implementation"
      }
    ],
    "symbols": [
      {
        "name": "ViewportGraphModelArgs",
        "path": "apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.support.ts",
        "dddOwner": "CanvasGraphViewportPresentation",
        "cqRails": ["ValidateCanvasViewportGraphModelComponentTests"],
        "fowlerSignals": ["test_harness_overload", "evidence_duplication"],
        "architectureGuard": "apps/web/src/app/views/canvas/useCanvasViewportGraphModel.architecture.test.ts",
        "cypressCoverage": "not_applicable:component_test_modularization",
        "unitTests": [
          "apps/web/src/app/views/canvas/useCanvasViewportGraphModel.edges.test.tsx",
          "apps/web/src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx",
          "apps/web/src/app/views/canvas/useCanvasViewportGraphModel.layout.test.tsx"
        ]
      },
      {
        "name": "ViewportGraphModelState",
        "path": "apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.support.ts",
        "dddOwner": "CanvasGraphViewportPresentation",
        "cqRails": ["ValidateCanvasViewportGraphModelComponentTests"],
        "fowlerSignals": ["test_harness_overload", "evidence_duplication"],
        "architectureGuard": "apps/web/src/app/views/canvas/useCanvasViewportGraphModel.architecture.test.ts",
        "cypressCoverage": "not_applicable:component_test_modularization",
        "unitTests": [
          "apps/web/src/app/views/canvas/useCanvasViewportGraphModel.edges.test.tsx",
          "apps/web/src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx",
          "apps/web/src/app/views/canvas/useCanvasViewportGraphModel.layout.test.tsx"
        ]
      },
      {
        "name": "buildCanonicalNode",
        "path": "apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.support.ts",
        "dddOwner": "CanvasGraphViewportPresentation",
        "cqRails": ["ValidateCanvasViewportGraphModelComponentTests"],
        "fowlerSignals": ["test_harness_overload", "evidence_duplication"],
        "architectureGuard": "apps/web/src/app/views/canvas/useCanvasViewportGraphModel.architecture.test.ts",
        "cypressCoverage": "not_applicable:component_test_modularization",
        "unitTests": [
          "apps/web/src/app/views/canvas/useCanvasViewportGraphModel.edges.test.tsx",
          "apps/web/src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx",
          "apps/web/src/app/views/canvas/useCanvasViewportGraphModel.layout.test.tsx"
        ]
      },
      {
        "name": "buildViewportGraphModelArgs",
        "path": "apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.support.ts",
        "dddOwner": "CanvasGraphViewportPresentation",
        "cqRails": ["ValidateCanvasViewportGraphModelComponentTests"],
        "fowlerSignals": ["test_harness_overload", "evidence_duplication"],
        "architectureGuard": "apps/web/src/app/views/canvas/useCanvasViewportGraphModel.architecture.test.ts",
        "cypressCoverage": "not_applicable:component_test_modularization",
        "unitTests": [
          "apps/web/src/app/views/canvas/useCanvasViewportGraphModel.edges.test.tsx",
          "apps/web/src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx",
          "apps/web/src/app/views/canvas/useCanvasViewportGraphModel.layout.test.tsx"
        ]
      },
      {
        "name": "renderViewportGraphModel",
        "path": "apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.support.ts",
        "dddOwner": "CanvasGraphViewportPresentation",
        "cqRails": ["ValidateCanvasViewportGraphModelComponentTests"],
        "fowlerSignals": ["test_harness_overload", "evidence_duplication"],
        "architectureGuard": "apps/web/src/app/views/canvas/useCanvasViewportGraphModel.architecture.test.ts",
        "cypressCoverage": "not_applicable:component_test_modularization",
        "unitTests": [
          "apps/web/src/app/views/canvas/useCanvasViewportGraphModel.edges.test.tsx",
          "apps/web/src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx",
          "apps/web/src/app/views/canvas/useCanvasViewportGraphModel.layout.test.tsx"
        ]
      }
    ]
  }'::jsonb,
  0,
  'codex'
)
on conflict (rail_id) do update set
  mechanization_status = excluded.mechanization_status,
  rail_status = excluded.rail_status,
  symbol_refs = excluded.symbol_refs,
  implementation_refs = excluded.implementation_refs,
  documentation_refs = excluded.documentation_refs,
  governing_sources = excluded.governing_sources,
  allowed_implementation_surfaces = excluded.allowed_implementation_surfaces,
  architecture_guards = excluded.architecture_guards,
  completion_gate = excluded.completion_gate,
  source_content_sha256 = excluded.source_content_sha256,
  raw_rail = excluded.raw_rail,
  raw_manifest = excluded.raw_manifest,
  updated_at = now();
