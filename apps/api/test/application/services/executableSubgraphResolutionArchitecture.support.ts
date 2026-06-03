/**
 * Owned concern: declare executable-subgraph resolution component artifacts
 * for architecture tests.
 */
import { join } from 'node:path';

import { defineArtifact } from './applicationArchitectureAst.artifacts.js';

const APPLICATION_ROOT = join(import.meta.dirname, '../../../src/application');
const DOCS_ROOT = join(import.meta.dirname, '../../../docs');
const ENTRYPOINTS_HTTP_ROOT = join(import.meta.dirname, '../../../src/entrypoints/http');
const MODULES_ROOT = join(import.meta.dirname, '../../../src/modules');

export const EXECUTABLE_SUBGRAPH_RESOLUTION_COMPONENT = {
  artifacts: {
    componentGuide: defineArtifact(DOCS_ROOT, 'executable-subgraph-resolution-component.md'),
    plannerBackedUseCase: defineArtifact(
      APPLICATION_ROOT,
      'services/PlannerBackedStartRunUseCase.ts'
    ),
    previewUseCase: defineArtifact(APPLICATION_ROOT, 'services/PreviewPlanUseCase.ts'),
    resolverService: defineArtifact(
      APPLICATION_ROOT,
      'services/resolveAuthorizedExecutableSubgraph.ts'
    ),
    routeDependencies: defineArtifact(
      ENTRYPOINTS_HTTP_ROOT,
      'protectedRuntimeRouteDependencies.ts'
    ),
    startRunRuntimeBuilder: defineArtifact(
      MODULES_ROOT,
      'startRun/buildProtectedStartRunRuntime.ts'
    ),
  },
  contracts: {
    canonicalBoundaryModule: '@dvt/contracts',
    workspaceGraphDraftPortsModule: '../ports/workspaceGraphDraft.js',
  },
} as const;
