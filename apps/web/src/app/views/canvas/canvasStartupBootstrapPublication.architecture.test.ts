import { describe, expect, it } from 'vitest';

import { createFailedRouteBootstrapPresentation } from '../../bootstrap/routeBootstrapContract';
import {
  buildWorkspaceGraphDraftEndpoint,
  WORKSPACE_GRAPH_DRAFT_ENDPOINT,
} from '../../services/workspace/workspaceGraphDraftHttp';
import {
  mapCanonicalNodeToCanvasNode,
  mapDroppedCanonicalNodeToCanvasNode,
} from './canvasNodeMapper';
import {
  buildCanonicalNode,
  ownedConcernModules,
  readAppSource,
  readRepoFile,
  repoFileExists,
} from './canvasStartupAndDraftRecovery.architecture.support';

describe('canvas startup bootstrap publication architecture', () => {
  it('documents the Fowler analysis, user stories, and local component guide for the branch semantics', () => {
    const closeout = readRepoFile(
      'docs/planning/closeouts/20260429-static-analysis-followup-closeout.md'
    );
    const componentGuide = readRepoFile(
      'docs/architecture/components/web/graph/canvas-startup-and-draft-recovery-component.md'
    );
    const userStories = readRepoFile(
      'docs/architecture/components/web/graph/canvas-startup-and-draft-recovery-user-stories.md'
    );

    expect(closeout).toContain('## Think-First Analysis');
    expect(closeout).toContain('## Validation Evidence');
    expect(closeout).toContain('Canvas startup');

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

    const createCommandSource = readAppSource('canvasCreateCanvasDocumentCommand.ts');
    const createCommandPolicySource = readAppSource('canvasCreateCanvasDocumentCommandPolicy.ts');
    const layoutBuilderSource = readAppSource('canvasShellLayoutBuilder.tsx');
    const workspaceApiPortsSource = readAppSource('../../services/workspace/workspacePorts.api.ts');

    expect(layoutBuilderSource).not.toContain('CanvasPlaygroundTabStrip');
    expect(repoFileExists('apps/web/src/app/views/canvas/CanvasPlaygroundTabStrip.tsx')).toBe(
      false
    );
    expect(repoFileExists('apps/web/src/app/views/canvas/canvasPlaygroundTabStripModel.ts')).toBe(
      false
    );

    expect(createCommandSource).toContain('resolveCreateCanvasDocumentCommandEligibility');
    expect(createCommandPolicySource).toContain("command.mode ?? 'create_first'");
    expect(createCommandPolicySource).toContain("case 'create_first'");
    expect(createCommandPolicySource).toContain("case 'replace_current'");
    expect(createCommandPolicySource).toContain("case 'create_new'");
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
    expect(cypressHelperSource).toContain("kind?: string }).kind).to.equal('not_found')");
    expect(cypressHelperSource).toContain('dvt-web-canvas-interaction');
    expect(cypressHelperSource).toContain('waitForLiveFirstAuthoringLayoutPositionChange');
    expect(cypressSpecSource).toContain('dragFirstAuthoringNodeFromCardBody');
    expect(cypressSpecSource).toContain('skipWhenFirstAuthoringLiveEnvIsMissing');
    expect(cypressSpecSource).not.toContain('this.skip()');
    expect(cypressSpecSource).toContain('waitForLiveFirstAuthoringLayoutPositionChange');
    expect(cypressSpecSource).not.toContain('waitForLiveFirstAuthoringDraftNodePositionChange');
    expect(cypressSpecSource).toContain('/transform 1/i');
    expect(cypressSpecSource).toContain('Model 1');
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
});
