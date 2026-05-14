import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { createFailedRouteBootstrapPresentation } from '../../bootstrap/routeBootstrapContract';
import {
  buildWorkspaceGraphDraftEndpoint,
  WORKSPACE_GRAPH_DRAFT_ENDPOINT,
} from '../../services/workspace/workspaceGraphDraftHttp';
import type { CanonicalNode } from '../../types/canonical';
import {
  mapCanonicalNodeToCanvasNode,
  mapDroppedCanonicalNodeToCanvasNode,
} from './canvasNodeMapper';

const REPO_ROOT = path.resolve(import.meta.dirname, '../../../../../..');
const RETIRED_ROUTE_SHIM_TERM_PATTERNS = [
  String.raw`\b${'leg'}${'acy'}\b`,
  String.raw`${'back'}ward ${'compati'}${'bility'}`,
  String.raw`\b${'compati'}${'bility'}\b`,
  String.raw`@${'depre'}${'cated'}`,
];

function readRepoFile(relativePath: string): string {
  return readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
}

function repoFileExists(relativePath: string): boolean {
  return existsSync(path.join(REPO_ROOT, relativePath));
}

function readAppSource(relativePathFromCanvas: string): string {
  return readFileSync(path.resolve(import.meta.dirname, relativePathFromCanvas), 'utf8');
}

function listCanvasSourceFiles(): string[] {
  const canvasRoot = import.meta.dirname;
  const files: string[] = [];

  function visit(directory: string): void {
    for (const entry of readdirSync(directory)) {
      const absolutePath = path.join(directory, entry);
      const stats = statSync(absolutePath);
      if (stats.isDirectory()) {
        visit(absolutePath);
        continue;
      }

      if (!/\.(?:ts|tsx)$/.test(entry)) {
        continue;
      }

      files.push(path.relative(canvasRoot, absolutePath).replace(/\\/g, '/'));
    }
  }

  visit(canvasRoot);
  return files.sort();
}

const ownedConcernModules = [
  {
    label: 'route bootstrap contract',
    path: '../../bootstrap/routeBootstrapContract.ts',
    phrase: 'Owned concern: define route bootstrap presentation statuses',
  },
  {
    label: 'workspace draft HTTP boundary',
    path: '../../services/workspace/workspaceGraphDraftHttp.ts',
    phrase: 'Owned concern: centralize workspace graph draft HTTP endpoint',
  },
  {
    label: 'workspace draft API port adapter',
    path: '../../services/workspace/workspaceGraphDraftAuthoring.api.ts',
    phrase: 'Owned concern: adapt the workspace graph draft authoring port',
  },
  {
    label: 'frontend API auth config',
    path: '../../services/api/apiAuthConfig.ts',
    phrase: 'Owned concern: resolve explicit API bearer-token posture',
  },
  {
    label: 'frontend API client',
    path: '../../services/api/createApiClient.ts',
    phrase: 'Owned concern: create typed frontend API clients',
  },
  {
    label: 'workspace service API snapshot projection',
    path: '../../services/workspace/workspacePorts.api.ts',
    phrase: 'Owned concern: adapt workspace capability ports',
  },
  {
    label: 'workspace draft DBT snapshot projection',
    path: '../../services/workspace/workspaceGraphDraftSnapshotProjection.ts',
    phrase: 'Owned concern: project workspace graph semantic truth into DBT-shaped graph snapshots',
  },
  {
    label: 'canvas node mapper',
    path: 'canvasNodeMapper.ts',
    phrase: 'Owned concern: project canonical graph primitives into React Flow nodes',
  },
  {
    label: 'canvas graph lifecycle node component',
    path: 'canvasGraphLifecycle.node.ts',
    phrase: 'Owned concern: own Canvas node lifecycle transitions',
  },
  {
    label: 'canvas graph lifecycle contracts',
    path: 'canvasGraphLifecycle.types.ts',
    phrase: 'Owned concern: define Canvas graph lifecycle contracts',
  },
  {
    label: 'canvas layout persistence component',
    path: 'useCanvasLayoutPersistence.ts',
    phrase: 'Owned concern: persist Canvas viewport and node-layout observations',
  },
  {
    label: 'canvas draft layout hydration policy',
    path: 'canvasDraftLayoutHydrationPolicy.ts',
    phrase:
      'Owned concern: decide when remote draft coordinates may seed local Canvas layout persistence',
  },
  {
    label: 'canvas viewport graph model',
    path: 'useCanvasViewportGraphModel.ts',
    phrase: 'Owned concern: project semantic authoring truth into React Flow viewport state',
  },
  {
    label: 'canvas tab-strip presenter',
    path: 'useCanvasPlaygroundTabStripPresenter.ts',
    phrase: 'Owned concern: adapt Canvas tab-strip replacement policy',
  },
  {
    label: 'canvas tab-strip replacement model',
    path: 'canvasPlaygroundTabStripModel.ts',
    phrase: 'Owned concern: resolve Canvas playground tab-strip replacement policy',
  },
  {
    label: 'create canvas command policy',
    path: 'canvasCreateCanvasDocumentCommandPolicy.ts',
    phrase: 'Owned concern: decide create-canvas document CAS eligibility',
  },
  {
    label: 'create canvas command save result',
    path: 'canvasCreateCanvasDocumentSaveResult.ts',
    phrase: 'Owned concern: apply authoritative create-canvas save outcomes',
  },
  {
    label: 'canvas tab-strip presentation templates',
    path: 'CanvasPlaygroundTabStrip.templates.tsx',
    phrase: 'Owned concern: render Canvas playground tab-strip presentation templates',
  },
  {
    label: 'canvas playground host templates',
    path: 'CanvasPlaygroundHost.templates.tsx',
    phrase: 'Owned concern: render Canvas playground first-document host templates',
  },
  {
    label: 'canvas recovery banner model',
    path: 'canvasRecoveryBannerModel.ts',
    phrase: 'Owned concern: resolve Canvas recovery-banner state',
  },
  {
    label: 'canvas recovery banner templates',
    path: 'CanvasRecoveryBanner.templates.tsx',
    phrase: 'Owned concern: render Canvas recovery-banner templates',
  },
  {
    label: 'canvas draft auth transport posture',
    path: 'canvasDraftAuthTransportPosture.ts',
    phrase: 'Owned concern: normalize protected Canvas draft query auth transport failures',
  },
  {
    label: 'canvas draft access posture model',
    path: 'canvasDraftAccessPostureModel.ts',
    phrase: 'Owned concern: resolve protected Canvas draft access into one route-visible posture',
  },
  {
    label: 'canvas draft access recovery template',
    path: 'CanvasDraftAccessRecovery.templates.tsx',
    phrase: 'Owned concern: render passive Canvas draft-access recovery actions',
  },
  {
    label: 'canvas draft toolbar state',
    path: 'canvasDraftToolbarState.ts',
    phrase: 'Owned concern: resolve Canvas draft recovery reasons and toolbar labels',
  },
  {
    label: 'DVT node renderer',
    path: '../../components/canvas/DbtNodeComponent.tsx',
    phrase: 'Owned concern: render canonical Canvas nodes',
  },
] as const;

function buildCanonicalNode(id: string): CanonicalNode {
  return {
    id,
    name: id,
    pluginId: 'dvt',
    kind: 'dvt:sql_transform',
    role: 'transform',
    status: 'idle',
    tags: [],
  };
}

describe('canvas startup and draft recovery architecture', () => {
  it('documents the Fowler analysis, user stories, and local component guide for the branch semantics', () => {
    const mailbox = readRepoFile(
      'buzon/20260429-codex-static-analysis-followup-fowler-architecture-review.md'
    );
    const componentGuide = readRepoFile(
      'docs/architecture/components/web/graph/canvas-startup-and-draft-recovery-component.md'
    );
    const userStories = readRepoFile(
      'docs/architecture/components/web/graph/canvas-startup-and-draft-recovery-user-stories.md'
    );

    expect(mailbox).toContain('## Fowler verdict');
    expect(mailbox).toContain('## Comparison with mature systems');
    expect(mailbox).toContain('## Antipatterns detected');
    expect(mailbox).toContain('## Drift fixed');
    expect(mailbox).toContain('## Opportunities');
    expect(mailbox).toContain('## Lessons for future slices');
    expect(mailbox).toContain('## User-story coverage');
    expect(mailbox).toContain('## ADR decision');

    expect(componentGuide).toContain('## Public API');
    expect(componentGuide).toContain('## Invariants');
    expect(componentGuide).toContain('## Transitions');
    expect(componentGuide).toContain('## Consumers');
    expect(componentGuide).toContain('## User-Story Traceability');
    expect(componentGuide).toContain('```mermaid');
    expect(componentGuide).toContain('failed route posture');
    expect(componentGuide).toContain('replace_current');
    expect(componentGuide).toContain('workspace graph draft read-model');
    expect(componentGuide).toContain('whole node drag surface');

    expect(userStories).toContain('## User Stories');
    expect(userStories).toContain('US-CANVAS-BOOTSTRAP-001');
    expect(userStories).toContain('US-CANVAS-BOOTSTRAP-004');
    expect(userStories).toContain('US-CANVAS-DRAFT-003');
    expect(userStories).toContain('US-CANVAS-DRAFT-006');
    expect(userStories).toContain('US-CANVAS-PRESENTATION-002');
    expect(userStories).toContain('US-CANVAS-ARCH-001');
    expect(userStories).toContain('## Scenario Coverage Matrix');
    expect(userStories).toContain('## TDD Traceability');
  });

  it('documents and guards protected-runtime token refresh and layout persistence semantics', () => {
    const mailbox = readRepoFile(
      'buzon/20260429-codex-canvas-operability-auth-and-drag-fowler-review.md'
    );
    const authGuide = readRepoFile('docs/architecture/components/web/api-client-auth-component.md');
    const layoutGuide = readRepoFile(
      'docs/architecture/components/web/graph/canvas-layout-persistence-component.md'
    );
    const userStories = readRepoFile(
      'docs/architecture/components/web/graph/canvas-startup-and-draft-recovery-user-stories.md'
    );

    expect(mailbox).toContain('## Fowler verdict');
    expect(mailbox).toContain('## Pattern improvements');
    expect(mailbox).toContain('## Antipatterns removed or reduced');
    expect(mailbox).toContain('## Drift fixed');
    expect(mailbox).toContain('## ADR decision');

    for (const guide of [authGuide, layoutGuide]) {
      expect(guide).toContain('## Public API');
      expect(guide).toContain('## Invariants');
      expect(guide).toContain('## Transitions');
      expect(guide).toContain('## Consumers');
      expect(guide).toContain('```mermaid');
    }
    expect(authGuide).toContain('VITE_API_BEARER_TOKEN_REFRESH_URL');
    expect(authGuide).toContain('401');
    expect(layoutGuide).toContain('drag-stop event payload');
    expect(layoutGuide).toContain('persistedNodePositions');

    expect(userStories).toContain('US-CANVAS-AUTH-001');
    expect(userStories).toContain('US-CANVAS-AUTH-002');
    expect(userStories).toContain('US-CANVAS-LAYOUT-001');
    expect(userStories).toContain('US-CANVAS-LAYOUT-003');

    const apiAuthSource = readAppSource('../../services/api/apiAuthConfig.ts');
    const apiClientSource = readAppSource('../../services/api/createApiClient.ts');
    const layoutPersistenceSource = readAppSource('useCanvasLayoutPersistence.ts');
    const controllerSource = readAppSource('useCanvasController.ts');

    expect(apiAuthSource).toContain('resolveApiBearerTokenForRequest');
    expect(apiAuthSource).toContain('VITE_API_BEARER_TOKEN_REFRESH_URL');
    expect(apiAuthSource).toContain('isExpiredOrExpiring');
    expect(apiClientSource).toContain('dispatchRequest(true)');
    expect(apiClientSource).toContain('canRetryRequestBody');

    expect(layoutPersistenceSource).toContain('function useCanvasNodePositionPersistence(');
    expect(layoutPersistenceSource).toContain('function useCanvasViewportPersistenceHandler(');
    expect(layoutPersistenceSource).toContain('mergeDraggedNodePosition(allNodes, draggedNode)');
    expect(layoutPersistenceSource).not.toContain('workspaceGraphDraftAuthoringPort');
    expect(layoutPersistenceSource).not.toContain('saveGraphDraft');
    expect(readAppSource('canvasDraftLayoutHydrationPolicy.ts')).toContain(
      'function shouldSeedCanvasLayoutFromRemoteDraft('
    );
    expect(controllerSource).toContain('nodes: graphModel.nodes');
    expect(controllerSource).toContain('persistedNodePositions: store.persistedNodePositions');
  });

  it('keeps TF-E2 parent closure aligned with the Canvas runtime architecture canon', () => {
    const productionPlan = readRepoFile(
      'docs/planning/proposals/mandatory/frontend-and-ux/tf-e2-production-node-authoring-and-persistence-plan-20260416.md'
    );
    const executionPlan = readRepoFile(
      'docs/planning/proposals/mandatory/frontend-and-ux/tf-e2-canvas-target-architecture-execution-plan-20260417.md'
    );
    const runtimeModel = readRepoFile(
      'docs/architecture/components/web/graph/graph-canvas-runtime-model.md'
    );
    const closeout = readRepoFile('docs/planning/closeouts/20260514-tf-e2-parent-closeout.md');

    for (const source of [productionPlan, executionPlan]) {
      expect(source).toContain('status: Implemented');
      expect(source).toContain('## 2026-05-14 Parent Closure');
      expect(source).not.toContain('TF-E2-A must hard-cut');
      expect(source).not.toContain('next TF-E2 closure work');
    }

    expect(runtimeModel).toContain('TF-E2 parent closure is complete');
    expect(runtimeModel).not.toContain('parent TF-E2 still remains open');

    expect(closeout).toContain('## Outcome');
    expect(closeout).toContain('## Fowler Architecture Assessment');
    expect(closeout).toContain('## Drift Removed');
    expect(closeout).toContain('## Validation');
    expect(closeout).toContain('IWorkspaceGraphDraftAuthoringPort');
    expect(closeout).toContain('React Flow is a projection');
  });

  it('keeps owned-concern docblocks on the modules that own the branch behavior', () => {
    for (const module of ownedConcernModules) {
      const source = readAppSource(module.path);
      expect(source.trimStart().startsWith('/** Owned concern:'), module.label).toBe(true);
      expect(source, module.label).toContain(module.phrase);
    }
  });

  it('validates the branch semantics rather than only the file layout', () => {
    expect(createFailedRouteBootstrapPresentation('Route rendered a governed error')).toEqual({
      status: 'failed',
      detail: 'Route rendered a governed error',
      canComplete: true,
    });

    expect(WORKSPACE_GRAPH_DRAFT_ENDPOINT).toBe('/workspace/graph/draft');
    expect(
      buildWorkspaceGraphDraftEndpoint({
        tenantId: 'tenant',
        projectId: 'project',
        environmentId: 'dev',
      })
    ).toBe('/workspace/graph/draft?tenantId=tenant&projectId=project&environmentId=dev');

    const mappedNode = mapCanonicalNodeToCanvasNode({
      canonicalNode: buildCanonicalNode('model_orders'),
      index: 0,
      showColumns: false,
    });
    const droppedNode = mapDroppedCanonicalNodeToCanvasNode(
      buildCanonicalNode('model_customers'),
      { x: 120, y: 80 },
      false
    );
    expect(mappedNode.dragHandle).toBeUndefined();
    expect(droppedNode.dragHandle).toBeUndefined();

    const tabStripSource = readAppSource('CanvasPlaygroundTabStrip.tsx');
    const tabStripModelSource = readAppSource('canvasPlaygroundTabStripModel.ts');
    const tabStripTemplateSource = readAppSource('CanvasPlaygroundTabStrip.templates.tsx');
    const createCommandSource = readAppSource('canvasCreateCanvasDocumentCommand.ts');
    const createCommandPolicySource = readAppSource('canvasCreateCanvasDocumentCommandPolicy.ts');
    const workspaceApiPortsSource = readAppSource('../../services/workspace/workspacePorts.api.ts');

    expect(tabStripSource).toContain('CanvasPlaygroundTabStripTemplate');
    expect(tabStripModelSource).toContain("mode: 'replace_current'");
    expect(tabStripModelSource).toContain('resolveCanvasReplacementActionState');
    expect(tabStripTemplateSource).toContain('AlertDialog');

    expect(createCommandSource).toContain('resolveCreateCanvasDocumentCommandEligibility');
    expect(createCommandPolicySource).toContain("command.mode ?? 'create_first'");
    expect(createCommandPolicySource).toContain("case 'create_first'");
    expect(createCommandPolicySource).toContain("case 'replace_current'");
    expect(createCommandPolicySource).toContain('resolveCreateFirstCanvasDocumentEligibility');
    expect(createCommandPolicySource).toContain('resolveReplaceCurrentCanvasDocumentEligibility');
    expect(createCommandPolicySource).toContain('expectedRevision: existingRecord.revision');

    expect(workspaceApiPortsSource).toContain('requestRaw(endpoint');
    expect(workspaceApiPortsSource).toContain('projectWorkspaceGraphDraftReadResponseSnapshot');
    expect(workspaceApiPortsSource).toContain("from './workspaceGraphDraftSnapshotProjection'");
    expect(workspaceApiPortsSource).not.toContain(
      "getJson<WorkspaceGraphSnapshot>('/workspace/graph'"
    );
  });

  it('guards first-authoring live proof against Cypress draft-boundary shortcuts', () => {
    const proofModelSource = readAppSource('canvasFirstAuthoringLiveProof.ts');
    const proofTypesSource = readAppSource('canvasFirstAuthoringLiveProof.types.ts');
    const firstNodePolicySource = readAppSource('canvasFirstAuthoringFirstNodePolicy.ts');
    const restoredLayoutPolicySource = readAppSource('canvasFirstAuthoringRestoredLayoutPolicy.ts');
    const proofInvariantSource = readAppSource('canvasFirstAuthoringProofInvariant.ts');
    const cypressHelperPath = 'apps/web/cypress/support/canvasFirstAuthoring.ts';
    const cypressSpecPath = 'apps/web/cypress/e2e/canvas/canvas-first-authoring-live.cy.ts';
    const liveRunnerPath = 'scripts/run-canvas-first-authoring-live-proof.cjs';
    const rootPackage = JSON.parse(readRepoFile('package.json')) as {
      scripts: Record<string, string>;
    };
    const webPackage = JSON.parse(readRepoFile('apps/web/package.json')) as {
      scripts: Record<string, string>;
    };
    const implementationPlanSource = readRepoFile(
      'docs/planning/proposals/mandatory/frontend-and-ux/tf-e2-m-c-first-canvas-first-node-live-proof-implementation-plan-20260501.md'
    );
    const componentGuide = readRepoFile(
      'docs/architecture/components/web/graph/canvas-first-authoring-live-proof-component.md'
    );

    expect(proofTypesSource).toContain('Owned concern: name first-authoring proof vocabulary');
    expect(proofTypesSource).toContain('export type CanvasFirstAuthoringLiveProof');
    expect(proofTypesSource).toContain('export type CanvasFirstAuthoringBlockedReason');
    expect(proofTypesSource).not.toContain('| string;');
    expect(proofTypesSource).not.toContain('FIRST_AUTHORING_DEFAULTS');

    expect(firstNodePolicySource).toContain('Owned concern: resolve the expected first node');
    expect(firstNodePolicySource).toContain('FIRST_AUTHORING_DEFAULTS');
    expect(firstNodePolicySource).toContain('export function resolveExpectedFirstNode');
    expect(firstNodePolicySource).toContain('export function matchesExpectedFirstNode');
    expect(firstNodePolicySource).toContain("canvasKind: 'transformation'");
    expect(firstNodePolicySource).toContain("canvasKind: 'dbt'");

    expect(restoredLayoutPolicySource).toContain(
      'Owned concern: decide whether restored route-local layout matches'
    );
    expect(restoredLayoutPolicySource).toContain('export function hasRestoredLayout');

    expect(proofInvariantSource).toContain(
      'Owned concern: assert completed first-authoring proof invariants'
    );
    expect(proofInvariantSource).toContain('export function isCanvasFirstAuthoringProofComplete');
    expect(proofInvariantSource).toContain('export function assertCanvasFirstAuthoringInvariant');

    expect(proofModelSource).toContain('export function deriveCanvasFirstAuthoringLiveProof');
    expect(proofModelSource).not.toContain('FIRST_AUTHORING_DEFAULTS');
    expect(proofModelSource).not.toContain('export type CanvasFirstAuthoringLiveProof');
    expect(proofModelSource).not.toContain('function hasRestoredLayout');

    expect(repoFileExists(cypressHelperPath)).toBe(true);
    expect(repoFileExists(cypressSpecPath)).toBe(true);
    expect(repoFileExists(liveRunnerPath)).toBe(true);

    expect(rootPackage.scripts['test:web:e2e:first-authoring:live']).toBe(
      'pnpm --filter @dvt/web test:e2e:first-authoring:live'
    );
    expect(webPackage.scripts['test:e2e:first-authoring:live']).toBe(
      'node ../../scripts/run-canvas-first-authoring-live-proof.cjs'
    );

    const cypressHelperSource = readRepoFile(cypressHelperPath);
    const cypressSpecSource = readRepoFile(cypressSpecPath);
    const liveRunnerSource = readRepoFile(liveRunnerPath);
    const cypressSources = [cypressHelperSource, cypressSpecSource];

    expect(cypressHelperSource).toContain('resolveLiveFirstAuthoringWorkspaceSession');
    expect(cypressHelperSource).toContain('assertLiveFirstAuthoringDraftScopeIsClean');
    expect(cypressHelperSource).toContain('requireLiveProtectedRuntimeEnv');
    expect(cypressHelperSource).toContain('skipWhenFirstAuthoringLiveEnvIsMissing');
    expect(cypressHelperSource).toContain("Cypress.env('firstAuthoringRunId'");
    expect(cypressHelperSource).toContain("method: 'GET'");
    expect(cypressHelperSource).toContain('workspace_graph_draft_not_found');
    expect(cypressHelperSource).toContain('dvt-web-canvas-interaction');
    expect(cypressHelperSource).toContain('waitForLiveFirstAuthoringLayoutPositionChange');
    expect(cypressSpecSource).toContain('dragSourceNodeFromCardBody');
    expect(cypressSpecSource).toContain('skipWhenFirstAuthoringLiveEnvIsMissing');
    expect(cypressSpecSource).not.toContain('this.skip()');
    expect(cypressSpecSource).toContain('waitForLiveFirstAuthoringLayoutPositionChange');
    expect(cypressSpecSource).not.toContain('waitForLiveFirstAuthoringDraftNodePositionChange');
    expect(cypressSpecSource).toContain('Source 1');
    expect(liveRunnerSource).toContain('CYPRESS_requireLiveProtectedRuntime=1');
    expect(liveRunnerSource).toContain('VITE_PROJECT_OPTIONS');
    expect(liveRunnerSource).toContain('canvas-first-authoring-live.cy.ts');
    expect(implementationPlanSource).toContain(
      'pnpm --filter @dvt/web test:e2e:first-authoring:live'
    );
    expect(componentGuide).toContain('## User Stories');
    expect(componentGuide).toContain('## Scenario Coverage Matrix');
    expect(componentGuide).toContain('## TDD Traceability');
    expect(componentGuide).toContain('US-CANVAS-FIRST-AUTHORING-001');
    expect(componentGuide).toContain('US-CANVAS-FIRST-AUTHORING-008');

    for (const source of cypressSources) {
      expect(source).not.toContain('cy.intercept(');
      expect(source).not.toContain("method: 'PUT'");
      expect(source).not.toContain('method: "PUT"');
      expect(source).not.toContain('seedLiveSelectedClosureDraft');
    }
  });

  it('keeps projection and replacement command decisions behind named semantic helpers', () => {
    const projectionSource = readAppSource(
      '../../services/workspace/workspaceGraphDraftProjection.ts'
    );
    const snapshotProjectionSource = readAppSource(
      '../../services/workspace/workspaceGraphDraftSnapshotProjection.ts'
    );
    const createCommandSource = readAppSource('canvasCreateCanvasDocumentCommand.ts');
    const createCommandPolicySource = readAppSource('canvasCreateCanvasDocumentCommandPolicy.ts');
    const createCommandSaveResultSource = readAppSource('canvasCreateCanvasDocumentSaveResult.ts');

    expect(projectionSource).toContain('function buildCanonicalEdgeProjection(');
    expect(projectionSource).not.toContain('DBT_NODE_TYPE_RULES');
    expect(projectionSource).not.toContain('DbtNodeType');

    expect(snapshotProjectionSource).toContain('const DBT_NODE_TYPE_RULES');
    expect(snapshotProjectionSource).toContain('function matchesDbtNodeTypeRule(');
    expect(snapshotProjectionSource).toContain('function projectCanonicalNodeToDbtNode(');

    expect(createCommandPolicySource).toContain(
      'function resolveCreateCanvasDocumentCommandEligibility('
    );
    expect(createCommandPolicySource).toContain('function buildBlankCanvasDocumentDraftInput(');
    expect(createCommandSaveResultSource).toContain('function applyCanvasDocumentSaveSuccess(');
    expect(createCommandSaveResultSource).toContain('function applyCanvasDocumentSaveConflict(');
    expect(createCommandSource).not.toContain(
      'function resolveCreateCanvasDocumentCommandEligibility('
    );
  });

  it('keeps Canvas authoring draft persistence on aggregate-native types', () => {
    const workspacePortSource = readAppSource('../../ports/workspace.ts');
    const workspacePortsSource = readAppSource('../../services/workspace/workspacePorts.ts');
    const repositorySource = readAppSource('canvasDraftRepository.ts');
    const authoringSource = readAppSource('canvasDraftAuthoring.ts');
    const structuralSignatureSource = readAppSource('canvasDraftStructuralSignature.ts');

    for (const retiredExport of [
      'export type WorkspaceGraphDraft',
      'export type WorkspaceGraphDraftRecord',
      'export type SaveWorkspaceGraphDraftInput',
      'export type SaveWorkspaceGraphDraftResult',
    ]) {
      expect(workspacePortSource).not.toContain(retiredExport);
      expect(workspacePortsSource).not.toContain(retiredExport.replace('export type ', ''));
    }

    expect(repositorySource).toContain('draft: WorkspaceGraphAuthoringDraft');
    expect(repositorySource).not.toContain('CanvasDraftAuthoringPayload');
    expect(repositorySource).not.toContain('buildCanvasDraftAuthoringGraph');
    expect(repositorySource).not.toContain('projectedDraft');

    expect(authoringSource).not.toContain('CanvasDraftAuthoringPayload');
    expect(authoringSource).not.toContain('projectedDraft');
    expect(authoringSource).not.toContain("from '../../ports/workspace'");
    expect(structuralSignatureSource).toContain('WorkspaceGraphAuthoringDraft');
    expect(structuralSignatureSource).not.toContain('WorkspaceGraphDraft');

    const bannedWorkspaceDraftImport =
      /import\s+type\s+\{[^}]*\b(?:WorkspaceGraphDraft|WorkspaceGraphDraftRecord)\b[^}]*\}\s+from\s+['"]\.\.\/\.\.\/ports\/workspace['"]/;
    for (const relativePath of listCanvasSourceFiles()) {
      const source = readAppSource(relativePath);
      expect(source, relativePath).not.toMatch(bannedWorkspaceDraftImport);
    }

    const allowedDesignGraphDraftFiles = new Set([
      'previewDesignGraphArtifact.ts',
      'previewGraphNodePayloads.ts',
    ]);
    const designGraphDraftContractImport =
      /import\s+type\s+\{[^}]*\bDesignGraphDraft\b[^}]*\}\s+from\s+['"]@dvt\/contracts['"]/;
    for (const relativePath of listCanvasSourceFiles()) {
      const source = readAppSource(relativePath);
      if (!designGraphDraftContractImport.test(source)) {
        continue;
      }

      expect(allowedDesignGraphDraftFiles.has(relativePath), relativePath).toBe(true);
    }
  });

  it('keeps canvas node viewport projection options behind a named argument object', () => {
    const mapperSource = readAppSource('canvasNodeMapper.ts');

    expect(mapperSource).toContain('type MapCanonicalNodeToCanvasNodeArgs = {');
    expect(mapperSource).toContain('export function mapCanonicalNodeToCanvasNode({');
    expect(mapperSource).toContain('}: MapCanonicalNodeToCanvasNodeArgs): Node<DbtNodeData>');
    expect(mapperSource).not.toContain('canonicalNode: CanonicalNode,\n  index: number,');
  });

  it('keeps host tab rendering and replacement action behind named presenter seams', () => {
    const tabStripSource = readAppSource('CanvasPlaygroundTabStrip.tsx');
    const tabStripPresenterSource = readAppSource('useCanvasPlaygroundTabStripPresenter.ts');
    const tabStripModelSource = readAppSource('canvasPlaygroundTabStripModel.ts');
    const tabStripTemplateSource = readAppSource('CanvasPlaygroundTabStrip.templates.tsx');

    expect(tabStripSource).toContain("from './CanvasPlaygroundTabStrip.templates'");
    expect(tabStripSource).toContain("from './useCanvasPlaygroundTabStripPresenter'");
    expect(tabStripSource).not.toContain('AlertDialog');
    expect(tabStripSource).not.toContain('TabsTrigger');
    expect(tabStripSource).not.toContain("mode: 'replace_current'");
    expect(tabStripSource).not.toContain('useState(');
    expect(tabStripSource).not.toContain('useMemo(');

    expect(tabStripPresenterSource).toContain('function useCanvasPlaygroundTabStripPresenter(');
    expect(tabStripPresenterSource).toContain('resolveCanvasReplacementActionState');
    expect(tabStripPresenterSource).toContain('createReplaceCurrentCanvasDocumentCommand');
    expect(tabStripPresenterSource).toContain('resolveCanvasViewCopy');
    expect(tabStripPresenterSource).toContain('CanvasPlaygroundTabStripTemplateProps');
    expect(tabStripPresenterSource).not.toContain('JSX.Element');
    expect(tabStripPresenterSource).not.toContain('<AlertDialog');
    expect(tabStripPresenterSource).not.toContain('canvasViewCopy');

    expect(tabStripModelSource).toContain('function resolveCanvasReplacementActionState(');
    expect(tabStripModelSource).toContain('function createReplaceCurrentCanvasDocumentCommand(');
    expect(tabStripModelSource).toContain('copy: CanvasReplacementActionCopy');
    expect(tabStripModelSource).toContain('export type CanvasReplacementActionViewState');
    expect(tabStripModelSource).toContain('viewState: CanvasReplacementActionViewState');
    expect(tabStripModelSource).not.toContain('JSX.Element');

    expect(tabStripPresenterSource).toContain('replacementActionState.viewState');
    expect(tabStripTemplateSource).toContain('function CanvasPlaygroundTabStripTemplate(');
    expect(tabStripTemplateSource).toContain('function CanvasPlaygroundTabsTemplate(');
    expect(tabStripTemplateSource).toContain('function CanvasReplacementActionTemplate(');
    expect(tabStripTemplateSource).toContain('CanvasReplacementActionViewState');
    expect(tabStripTemplateSource).toContain('border-[color:var(--border-default)]');
    expect(tabStripTemplateSource).toContain('bg-[var(--surface-panel)]');
    expect(tabStripTemplateSource).toContain('text-[var(--text-subtle)]');
    expect(tabStripTemplateSource).not.toContain('border-(--border-default)');
    expect(tabStripTemplateSource).not.toContain('bg-(--surface-panel)');
    expect(tabStripTemplateSource).not.toContain('text-(--text-subtle)');
    expect(tabStripTemplateSource).not.toContain('CanvasReplacementActionState');
    expect(tabStripTemplateSource).not.toContain("from './copy'");
    expect(tabStripTemplateSource).not.toContain("mode: 'replace_current'");
    expect(tabStripSource).not.toContain('canEditEdges && activeReplacementCanvasKind');
  });

  it('keeps first-canvas and recovery banner HTML behind passive templates', () => {
    const hostSource = readAppSource('CanvasPlaygroundHost.tsx');
    const hostTemplateSource = readAppSource('CanvasPlaygroundHost.templates.tsx');
    const recoveryBannerSource = readAppSource('CanvasRecoveryBanner.tsx');
    const recoveryModelSource = readAppSource('canvasRecoveryBannerModel.ts');
    const recoveryTemplateSource = readAppSource('CanvasRecoveryBanner.templates.tsx');

    expect(hostSource).toContain("from './CanvasPlaygroundHost.templates'");
    expect(hostSource).toContain('onCreateCanvasKind');
    expect(hostSource).not.toContain('<div');
    expect(hostSource).not.toContain('Button');
    expect(hostSource).not.toContain('Card');
    expect(hostTemplateSource).toContain('function CanvasPlaygroundHostTemplate(');
    expect(hostTemplateSource).not.toContain('CanvasCreateCanvasDocumentCommand');
    expect(hostTemplateSource).not.toContain('canvasViewCopy');

    expect(recoveryBannerSource).toContain("from './canvasRecoveryBannerModel'");
    expect(recoveryBannerSource).toContain("from './CanvasRecoveryBanner.templates'");
    expect(recoveryBannerSource).not.toContain('<div');
    expect(recoveryBannerSource).not.toContain('Button');
    expect(recoveryBannerSource).not.toContain('canvasViewCopy');
    expect(recoveryModelSource).toContain('function resolveCanvasRecoveryBannerViewState(');
    expect(recoveryModelSource).not.toContain('JSX.Element');
    expect(recoveryTemplateSource).toContain('function CanvasRecoveryBannerTemplate(');
    expect(recoveryTemplateSource).not.toContain('CanvasDraftPresentationState');
    expect(recoveryTemplateSource).not.toContain('canvasViewCopy');
  });

  it('keeps Canvas draft access posture as the route-visible admission policy', () => {
    const postureSource = readAppSource('canvasDraftAccessPostureModel.ts');
    const authTransportSource = readAppSource('canvasDraftAuthTransportPosture.ts');
    const authoringRuntimeSource = readAppSource('useCanvasAuthoringRuntime.ts');
    const authoringStateSource = readAppSource('canvasAuthoringState.ts');
    const controllerSource = readAppSource('useCanvasController.ts');
    const routeStateSource = readAppSource('canvasRouteViewState.ts');
    const interactionSource = readAppSource('canvasRouteInteractionState.ts');
    const runtimePolicySource = readAppSource('canvasRuntimePolicy.ts');
    const transportSurfaceSource = readAppSource('canvasDraftTransportErrorState.ts');
    const recoveryBannerTemplateSource = readAppSource('CanvasRecoveryBanner.templates.tsx');
    const postureGuide = readRepoFile(
      'docs/architecture/components/web/graph/canvas-draft-access-posture-component.md'
    );
    const implementationPlan = readRepoFile(
      'docs/planning/proposals/mandatory/frontend-and-ux/tf-e2-m-b-canvas-draft-denial-posture-implementation-plan-20260501.md'
    );

    expect(postureSource).toContain('export type CanvasDraftAccessPosture');
    expect(postureSource).toContain('deriveCanvasDraftAccessPosture');
    expect(postureSource).toContain('toCanvasDraftToolbarState');
    expect(postureSource).toContain('toCanvasDraftRecoveryBannerViewState');
    expect(postureSource).toContain('toCanvasDraftTransportSurfaceState');
    expect(postureSource).toContain('applyCanvasDraftPostureToRuntimePolicyInput');
    expect(postureSource).toContain('resolveCanvasDraftAccessRecoveryCommand');
    expect(postureSource).toContain("kind: 'unauthenticated'");
    expect(postureSource).toContain("kind: 'forbidden_scope'");
    expect(postureSource).toContain("kind: 'read_only'");

    expect(authTransportSource).toContain('deriveCanvasDraftAuthTransportPosture');
    expect(authTransportSource).not.toContain('canRefreshApiBearerToken');
    expect(authTransportSource).not.toContain('resolveApiBearerTokenForRequest');
    expect(authoringRuntimeSource).toContain('deriveCanvasDraftAuthTransportPosture');
    expect(authoringStateSource).toContain('deriveCanvasDraftAccessPosture');
    expect(authoringStateSource).toContain('isCanvasDraftPostureMutationBlocked');
    expect(authoringStateSource).not.toContain('baseCanPlan');
    expect(authoringStateSource).not.toContain('baseCanRun');

    expect(controllerSource).toContain('applyCanvasDraftPostureToRuntimePolicyInput');
    expect(routeStateSource).toContain('draftAccessPosture: controller.draftAccessPosture');
    expect(routeStateSource).toContain('toCanvasDraftToolbarState(controller.draftAccessPosture)');
    expect(interactionSource).toContain('isCanvasDraftPostureMutationBlocked');
    expect(interactionSource).not.toContain("draftAccessMode === 'forbidden'");
    expect(interactionSource).not.toContain("draftAccessMode !== 'read_only'");
    expect(runtimePolicySource).not.toContain('draftAccessMode');
    expect(runtimePolicySource).not.toContain('draftCapabilityReason');
    expect(runtimePolicySource).not.toContain('draftFormatError');
    expect(transportSurfaceSource).toContain('toCanvasDraftTransportSurfaceState');
    expect(transportSurfaceSource).not.toContain('draftAccessMode');
    expect(transportSurfaceSource).not.toContain('draftFormatError');
    expect(recoveryBannerTemplateSource).toContain('CanvasDraftAccessRecoveryTemplate');

    expect(postureGuide).toContain('## Public API');
    expect(postureGuide).toContain('## Pre-Implementation Discovery Baseline');
    expect(postureGuide).toContain('No implemented Canvas draft access posture component existed');
    expect(postureGuide).toContain('Design before implementation');
    expect(postureGuide).toContain('## Fowler Opportunity Matrix');
    expect(implementationPlan).toContain('## Pre-Implementation Discovery Gate');
    expect(implementationPlan).toContain(
      'The implementation is not allowed to create this component'
    );
    expect(implementationPlan).toContain('without first proving the existing code lacks one owner');
    expect(implementationPlan).toContain('## TDD Tasks');
    expect(implementationPlan).toContain('## Self-Review Iterations');
  });

  it('keeps Canvas viewport mocks in named test-local components for static analysis', () => {
    const viewportTestSource = readAppSource('CanvasViewport.test.tsx');

    expect(viewportTestSource).toContain('type MockMiniMapProps = Readonly<{');
    expect(viewportTestSource).toContain('function MockMiniMap(');
    expect(viewportTestSource).not.toContain('MiniMap: ({');
  });

  it('keeps the active web graph slice free of retired-route shims', () => {
    const activeSources = [
      readRepoFile('apps/web/src/app/services/plans/plansService.ts'),
      readRepoFile('apps/web/src/app/services/runs/runsService.ts'),
      readRepoFile('apps/web/src/app/services/workspace/workspacePorts.api.test.ts'),
      readRepoFile('apps/web/src/app/stores/uiLayoutStore.test.ts'),
      readRepoFile('apps/web/src/app/views/Canvas.routeStates.test.tsx'),
      readRepoFile('apps/web/src/app/views/canvas/CanvasViewport.test.tsx'),
      readRepoFile('apps/web/src/app/views/canvas/canvasPalette.ts'),
      readRepoFile('apps/web/src/app/views/canvas/canvasPalette.test.ts'),
      readRepoFile('buzon/20260429-codex-static-analysis-followup-fowler-architecture-review.md'),
      readRepoFile(
        'docs/architecture/components/web/graph/canvas-startup-and-draft-recovery-component.md'
      ),
      readRepoFile(
        'docs/architecture/components/web/graph/canvas-startup-and-draft-recovery-user-stories.md'
      ),
    ];
    const bannedTerms = RETIRED_ROUTE_SHIM_TERM_PATTERNS.map((pattern) => new RegExp(pattern, 'i'));

    for (const source of activeSources) {
      for (const bannedTerm of bannedTerms) {
        expect(source).not.toMatch(bannedTerm);
      }
    }

    expect(repoFileExists('apps/web/src/app/components/GraphCanvas.tsx')).toBe(false);
    expect(repoFileExists('apps/web/src/app/plugins/PluginNodeWrapper.tsx')).toBe(false);
    expect(repoFileExists('apps/web/src/app/stores/appStore.ts')).toBe(false);
    expect(repoFileExists('apps/web/src/app/stores/index.ts')).toBe(false);
    expect(repoFileExists('apps/web/src/app/data/mockData.ts')).toBe(false);
    expect(repoFileExists('apps/web/src/app/types/index.ts')).toBe(false);
  });
});
