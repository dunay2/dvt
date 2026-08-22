/**
 * Owned concern: prove the internal alpha route gate has one route-level
 * authority, stage-specific acceptance semantics, and no child-slice shortcut
 * to alpha-full completion.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  evaluateInternalAlphaCombinedRouteFixture,
  internalAlphaCombinedRouteFixture,
} from './internalAlphaRouteGate.test.fixtures';

const REPO_ROOT = path.resolve(import.meta.dirname, '../../../../..');

function readRepoFile(...segments: string[]): string {
  return readFileSync(path.join(REPO_ROOT, ...segments), 'utf8');
}

const routeStages = [
  'Startup gate',
  'Workspace context',
  'Canvas workbench',
  'Code workbench',
  'Plan/run readiness',
  'Recovery states',
  'Alpha cadence',
  'Risk triage',
] as const;

describe('internal alpha route gate architecture', () => {
  it('documents the public API, invariants, transitions, and consumers', () => {
    const componentGuide = readRepoFile(
      'docs/architecture/components/web/internal-alpha-route-gate-component.md'
    );

    for (const section of [
      '## Public API',
      '## Invariants',
      '## State Transitions',
      '## Consumers',
      '## Architecture Diagram',
      '```mermaid',
      'InternalAlphaRouteGate',
      'InternalAlphaCombinedRouteFixture',
      'RouteStageProof',
      'AlphaFullDecision',
    ]) {
      expect(componentGuide).toContain(section);
    }
  });

  it('requires every route stage to name happy and fail-closed acceptance proof', () => {
    const acceptanceMatrix = readRepoFile(
      'docs/planning/reviews/architecture-and-governance/20260514-internal-alpha-route-acceptance-matrix.md'
    );

    for (const stage of routeStages) {
      expect(acceptanceMatrix).toContain(`\`${stage}\``);
    }

    for (const requiredColumn of [
      'Happy-path fixture',
      'Fail-closed fixture',
      'Evidence source',
      'Risk decision',
      'Alpha exit impact',
    ]) {
      expect(acceptanceMatrix).toContain(requiredColumn);
    }
    expect(acceptanceMatrix).toContain('## Route-Level Combined Fixture/Proof');
    expect(acceptanceMatrix).toContain('Canvas and Code route entry');

    expect(acceptanceMatrix).toContain('Alpha full is blocked while any stage is `Gap`');
    expect(acceptanceMatrix).toContain('Child slices cannot declare alpha full');
  });

  it('keeps route authority bound to F-27 and the command/query rail catalog', () => {
    const routePlan = readRepoFile(
      'docs/planning/proposals/mandatory/frontend-and-ux/internal-alpha-product-route-plan-20260505.md'
    );
    const userStories = readRepoFile(
      'docs/architecture/components/web/internal-alpha-route-gate-user-stories.md'
    );

    for (const rail of [
      'ObserveAppBootstrapRouteReadiness',
      'GetEffectiveWorkspaceContext',
      'GetWorkspaceGraphDraft',
      'SaveWorkspaceGraphDraft',
      'ListWorkspaceFiles',
      'GetWorkspaceFileContent',
      'SaveWorkspaceFileContent',
      'ObservePlanRunReadiness',
      'MapRouteRecoveryState',
    ]) {
      expect(routePlan).toContain(rail);
      expect(userStories).toContain(rail);
    }

    expect(routePlan).toContain('20260514-internal-alpha-route-acceptance-matrix.md');
    expect(userStories).toContain('US-F27-');
  });

  it('keeps cadence contract fields explicit in the route-level component guide', () => {
    const componentGuide = readRepoFile(
      'docs/architecture/components/web/internal-alpha-route-gate-component.md'
    );

    for (const requiredCadenceField of [
      'audience',
      'entryDate',
      'duration',
      'exitOwner',
      'extensionRule',
    ]) {
      expect(componentGuide).toContain(requiredCadenceField);
    }
  });

  it('keeps cadence and risk triage concrete before alpha-full can be claimed', () => {
    const acceptanceMatrix = readRepoFile(
      'docs/planning/reviews/architecture-and-governance/20260514-internal-alpha-route-acceptance-matrix.md'
    );

    for (const section of [
      '## Alpha Cadence Decision',
      '## Route Risk Triage',
      '10 business days',
      'Product / Architecture',
    ]) {
      expect(acceptanceMatrix).toContain(section);
    }

    for (const phrase of [
      /Internal product, architecture, frontend, and runtime-safety\s+testers/,
      /one extension of up to 5\s+business days/,
    ]) {
      expect(acceptanceMatrix).toMatch(phrase);
    }

    for (const stage of routeStages) {
      expect(acceptanceMatrix).toMatch(new RegExp(`\\|\\s*${stage}\\s*\\|`));
    }

    for (const riskReference of [
      'R-20260308-api-auth-runtime-integration-coverage',
      'R-20260411-WEB-WORKSPACE-FILE-NOT-FOUND-CONTRACT-GAP',
      'R-20260423-CANVAS-HOST-DRAFT-BOUNDARY',
      'R-20260424-TEMPORAL-PLAN-REF-CONTRACT',
      'R-20260425-PRODUCTION-TENANT-ISOLATION-BASELINE',
      'R-20260514-AR-D3-WORKER-SCALING',
    ]) {
      expect(acceptanceMatrix).toContain(riskReference);
    }

    expect(acceptanceMatrix).toContain('Excluded');
    expect(acceptanceMatrix).toContain('no remaining alpha-full blockers');
    for (const acceptedBlocker of ['Alpha cadence', 'Risk triage']) {
      expect(acceptanceMatrix).toMatch(
        new RegExp(`${acceptedBlocker}[^\\n]+(accepted|closed)`, 'i')
      );
    }
    expect(acceptanceMatrix).not.toMatch(/Plan\/run readiness`: remains planned/i);
    expect(acceptanceMatrix).not.toMatch(/only remaining evidence row/i);
    expect(acceptanceMatrix).toMatch(/alpha-full is accepted/);
  });

  it('executes one combined route fixture across ordered happy and fail-closed stage proof', () => {
    const fixtureSource = readRepoFile(
      'apps/web/src/app/routes/internalAlphaRouteGate.test.fixtures.ts'
    );
    const componentGuide = readRepoFile(
      'docs/architecture/components/web/internal-alpha-route-gate-component.md'
    );
    const userStories = readRepoFile(
      'docs/architecture/components/web/internal-alpha-route-gate-user-stories.md'
    );
    const acceptanceMatrix = readRepoFile(
      'docs/planning/reviews/architecture-and-governance/20260514-internal-alpha-route-acceptance-matrix.md'
    );

    expect(fixtureSource).toContain(
      'Owned concern: build the F-27 combined internal-alpha route proof fixture'
    );
    for (const document of [componentGuide, userStories, acceptanceMatrix]) {
      expect(document).toContain('internalAlphaRouteGate.test.fixtures.ts');
    }

    expect(internalAlphaCombinedRouteFixture.routeAuthority).toBe('F-27');
    expect(internalAlphaCombinedRouteFixture.claim).toBe('alpha-full-candidate');
    expect(internalAlphaCombinedRouteFixture.stages.map((stage) => stage.stage)).toEqual([
      'Startup gate',
      'Workspace context',
      'Canvas workbench',
      'Code workbench',
      'Plan/run readiness',
      'Recovery states',
    ]);

    for (const stage of internalAlphaCombinedRouteFixture.stages) {
      expect(stage.rails.length).toBeGreaterThanOrEqual(1);
      expect(stage.evidenceRefs.length).toBeGreaterThanOrEqual(1);
      expect(stage.evidenceAcceptance).toMatch(/^(planned|accepted)$/);
      for (const rail of stage.rails) {
        expect(rail).toMatch(
          /^(ObserveAppBootstrapRouteReadiness|GetEffectiveWorkspaceContext|GetWorkspaceGraphDraft|SaveWorkspaceGraphDraft|ListWorkspaceFiles|GetWorkspaceFileContent|SaveWorkspaceFileContent|ObservePlanRunReadiness|MapRouteRecoveryState)$/
        );
      }
      for (const evidenceRef of stage.evidenceRefs) {
        expect(evidenceRef).toMatch(/^(docs|apps\/api|apps\/web)\//);
        expect(existsSync(path.join(REPO_ROOT, evidenceRef))).toBe(true);
      }
      expect(stage.happyPathProof).toBeTruthy();
      expect(stage.failClosedProof).toBeTruthy();
      expect(stage.recoveryState).toMatch(
        /^(ready|blocked|unauthorized|unavailable|stale|not-found)$/
      );
      expect(stage.recoveryStates).toContain(stage.recoveryState);
      expect(stage.recoveryStates.some((recoveryState) => recoveryState !== 'ready')).toBe(true);
    }

    expect(internalAlphaCombinedRouteFixture.stages.flatMap((stage) => stage.rails)).toEqual([
      'ObserveAppBootstrapRouteReadiness',
      'GetEffectiveWorkspaceContext',
      'GetWorkspaceGraphDraft',
      'SaveWorkspaceGraphDraft',
      'ListWorkspaceFiles',
      'GetWorkspaceFileContent',
      'SaveWorkspaceFileContent',
      'ObservePlanRunReadiness',
      'MapRouteRecoveryState',
    ]);

    expect(evaluateInternalAlphaCombinedRouteFixture(internalAlphaCombinedRouteFixture)).toEqual({
      missingEvidenceAcceptance: [],
      missingFailClosedProof: [],
      missingHappyPathProof: [],
      missingEvidenceRefs: [],
      missingAlphaFullClosureEvidenceRefs: [],
      missingRails: [],
      missingRecoveryStates: [],
      missingStages: [],
      remainingAlphaFullBlockers: [],
      routeAuthority: 'F-27',
      routeDecision: 'accepted',
      stagesWithoutRecoveryVocabulary: [],
    });

    expect(
      evaluateInternalAlphaCombinedRouteFixture({
        ...internalAlphaCombinedRouteFixture,
        stages: internalAlphaCombinedRouteFixture.stages.map((stage) =>
          stage.stage === 'Canvas workbench' ? { ...stage, failClosedProof: '' } : stage
        ),
      })
    ).toMatchObject({
      missingFailClosedProof: ['Canvas workbench'],
      routeDecision: 'blocked',
    });
  });

  it('keeps startup gate evidence accepted inside the full alpha route proof', () => {
    const startupStage = internalAlphaCombinedRouteFixture.stages.find(
      (stage) => stage.stage === 'Startup gate'
    );

    expect(startupStage?.evidenceAcceptance).toBe('accepted');
    expect(startupStage?.evidenceRefs).toEqual(
      expect.arrayContaining([
        'apps/web/src/app/Root.bootstrapFlow.test.tsx',
        'apps/web/src/app/bootstrap/routeBootstrapStartupReadiness.test.ts',
        'apps/web/cypress/e2e/shell/startup-route-readiness.cy.ts',
      ])
    );
    expect(evaluateInternalAlphaCombinedRouteFixture(internalAlphaCombinedRouteFixture)).toEqual(
      expect.objectContaining({
        missingEvidenceAcceptance: [],
        routeDecision: 'accepted',
      })
    );
  });

  it('keeps workspace context evidence accepted inside the full alpha route proof', () => {
    const workspaceContextStage = internalAlphaCombinedRouteFixture.stages.find(
      (stage) => stage.stage === 'Workspace context'
    );

    expect(workspaceContextStage?.evidenceAcceptance).toBe('accepted');
    expect(workspaceContextStage?.rails).toEqual(['GetEffectiveWorkspaceContext']);
    expect(workspaceContextStage?.evidenceRefs).toEqual(
      expect.arrayContaining([
        'apps/web/src/app/services/session/protectedRouteSessionContext.test.ts',
        'apps/web/src/app/services/session/protectedRouteSessionContext.architecture.test.ts',
        'apps/web/cypress/e2e/shell/canvas-workbench-screen-composition.cy.ts',
        'docs/architecture/components/web/appshell/effective-workspace-context-component.md',
      ])
    );
    expect(evaluateInternalAlphaCombinedRouteFixture(internalAlphaCombinedRouteFixture)).toEqual(
      expect.objectContaining({
        missingEvidenceAcceptance: [],
        routeDecision: 'accepted',
      })
    );
  });

  it('accepts Canvas workbench evidence only with draft read, draft save, and browser fail-closed proof', () => {
    const canvasStage = internalAlphaCombinedRouteFixture.stages.find(
      (stage) => stage.stage === 'Canvas workbench'
    );
    const readyNodeAuthoringCypress = readRepoFile(
      'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts'
    );
    const draftAccessPostureCypress = readRepoFile(
      'apps/web/cypress/e2e/canvas/canvas-draft-access-posture.cy.ts'
    );

    expect(canvasStage?.evidenceAcceptance).toBe('accepted');
    expect(canvasStage?.rails).toEqual(['GetWorkspaceGraphDraft', 'SaveWorkspaceGraphDraft']);
    expect(canvasStage?.evidenceRefs).toEqual(
      expect.arrayContaining([
        'docs/architecture/components/web/graph/canvas-startup-and-draft-recovery-component.md',
        'apps/web/src/app/views/canvas/canvasStartupBootstrapPublication.architecture.test.ts',
        'apps/web/src/app/views/canvas/canvasDraftRecoveryBoundary.architecture.test.ts',
        'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts',
        'apps/web/cypress/e2e/canvas/canvas-draft-access-posture.cy.ts',
      ])
    );
    expect(readyNodeAuthoringCypress).toContain(
      'Owned concern: prove governed Canvas draft reads, saves, and reload posture in browser'
    );
    expect(draftAccessPostureCypress).toContain(
      'Owned concern: prove Canvas draft access fail-closed posture in browser'
    );
    expect(canvasStage?.happyPathProof).toMatch(/draft loads|save|visible|reload/);
    expect(canvasStage?.failClosedProof).toMatch(/denial|stale|retry|failed|read-only/);
    expect(evaluateInternalAlphaCombinedRouteFixture(internalAlphaCombinedRouteFixture)).toEqual(
      expect.objectContaining({
        missingEvidenceAcceptance: [],
        routeDecision: 'accepted',
      })
    );
  });

  it('accepts Code evidence only with scoped file rails and canonical contextual sync', () => {
    const codeStage = internalAlphaCombinedRouteFixture.stages.find(
      (stage) => stage.stage === 'Code workbench'
    );
    const codeWorkbenchCypress = readRepoFile(
      'apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts'
    );
    const workspaceFilesRoutesTest = readRepoFile(
      'apps/api/test/entrypoints/http/workspaceFilesRoutes.test.ts'
    );

    expect(codeStage?.evidenceAcceptance).toBe('accepted');
    expect(codeStage?.rails).toEqual([
      'ListWorkspaceFiles',
      'GetWorkspaceFileContent',
      'SaveWorkspaceFileContent',
    ]);
    expect(codeStage?.evidenceRefs).toEqual(
      expect.arrayContaining([
        'docs/architecture/components/web/code-workbench-workspace-files-component.md',
        'apps/api/test/entrypoints/http/workspaceFilesRoutes.test.ts',
        'apps/web/src/app/services/workspace/workspacePorts.files.test.ts',
        'apps/web/src/app/views/CodeView.test.tsx',
        'apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts',
      ])
    );
    expect(codeWorkbenchCypress).toContain(
      'Owned concern: prove canonical Canvas Project Code working-tree synchronization'
    );
    expect(codeWorkbenchCypress).toContain("visitWithE2eWorkspaceSession('/canvas')");
    expect(codeWorkbenchCypress).not.toContain("visitWithE2eWorkspaceSession('/canvas/code')");
    expect(codeWorkbenchCypress).toContain("waitForE2eApiCall('/workspace/files', 'GET')");
    expect(codeWorkbenchCypress).toContain('canvas-contextual-workbench');
    expect(codeWorkbenchCypress).toContain('canvas-workspace-open-project-code-command');
    expect(codeWorkbenchCypress).toContain('code-working-tree-status');
    expect(codeWorkbenchCypress).toContain("kind: 'content_sha256'");
    for (const proof of [
      'rejects path traversal before reading from the repository',
      'rejects unsupported workspace file types before reading content',
      'rejects oversized workspace files before returning content',
      'returns last-modified freshness metadata with workspace file content',
      'fails closed when the workspace file action is denied',
    ]) {
      expect(workspaceFilesRoutesTest).toContain(proof);
    }
    expect(codeStage?.happyPathProof).toMatch(/scoped|tree|preview|working-tree|revision-guarded/);
    expect(codeStage?.failClosedProof).toMatch(
      /unauthorized|traversal|oversize|unsupported|not-found|unavailable|revision conflict/
    );
    expect(evaluateInternalAlphaCombinedRouteFixture(internalAlphaCombinedRouteFixture)).toEqual(
      expect.objectContaining({
        missingEvidenceAcceptance: [],
        routeDecision: 'accepted',
      })
    );
  });

  it('accepts Recovery states evidence only with source-owned vocabulary and stage coverage', () => {
    const recoveryStage = internalAlphaCombinedRouteFixture.stages.find(
      (stage) => stage.stage === 'Recovery states'
    );
    const componentGuide = readRepoFile(
      'docs/architecture/components/web/internal-alpha-route-gate-component.md'
    );
    const userStories = readRepoFile(
      'docs/architecture/components/web/internal-alpha-route-gate-user-stories.md'
    );

    expect(recoveryStage?.evidenceAcceptance).toBe('accepted');
    expect(recoveryStage?.rails).toEqual(['MapRouteRecoveryState']);
    expect(recoveryStage?.evidenceRefs).toEqual(
      expect.arrayContaining([
        'docs/architecture/components/web/internal-alpha-route-gate-component.md',
        'docs/architecture/components/web/internal-alpha-route-gate-user-stories.md',
        'apps/web/src/app/routes/internalAlphaRouteGate.architecture.test.ts',
        'apps/web/cypress/e2e/shell/startup-route-readiness.cy.ts',
        'apps/web/cypress/e2e/canvas/canvas-draft-access-posture.cy.ts',
        'apps/web/cypress/e2e/canvas/code-workbench-workspace-files.cy.ts',
      ])
    );
    expect(componentGuide).toContain('RouteRecoveryVocabulary');
    expect(userStories).toContain('US-F27-N-008');
    expect(recoveryStage?.recoveryStates).toEqual([
      'ready',
      'blocked',
      'unauthorized',
      'unavailable',
      'stale',
      'not-found',
    ]);
    expect(recoveryStage?.happyPathProof).toMatch(/source-owned|vocabulary|stage/);
    expect(recoveryStage?.failClosedProof).toMatch(
      /unknown|unavailable|unauthorized|stale|not-found/
    );
    expect(evaluateInternalAlphaCombinedRouteFixture(internalAlphaCombinedRouteFixture)).toEqual(
      expect.objectContaining({
        missingRecoveryStates: [],
        stagesWithoutRecoveryVocabulary: [],
        routeDecision: 'accepted',
      })
    );
  });

  it('keeps accepted evidence semantically encapsulated instead of relying on path shape', () => {
    const componentGuide = readRepoFile(
      'docs/architecture/components/web/internal-alpha-route-gate-component.md'
    );
    const startupRouteReadinessCypress = readRepoFile(
      'apps/web/cypress/e2e/shell/startup-route-readiness.cy.ts'
    );
    const acceptedStages = internalAlphaCombinedRouteFixture.stages.filter(
      (stage) => stage.evidenceAcceptance === 'accepted'
    );

    expect(componentGuide).toContain('## Accepted Evidence Semantics');
    expect(startupRouteReadinessCypress).toContain(
      'Owned concern: verify protected route startup waits for runtime capability and context readiness in browser'
    );
    expect(acceptedStages.map((stage) => stage.stage)).toEqual([
      'Startup gate',
      'Workspace context',
      'Canvas workbench',
      'Code workbench',
      'Plan/run readiness',
      'Recovery states',
    ]);
    for (const stage of acceptedStages) {
      expect(stage.evidenceRefs).toEqual(
        expect.arrayContaining([expect.stringMatching(/^docs\//)])
      );
      expect(stage.evidenceRefs).toEqual(
        expect.arrayContaining([expect.stringMatching(/^apps\/web\/src\//)])
      );
      expect(stage.evidenceRefs).toEqual(
        expect.arrayContaining([expect.stringMatching(/^apps\/web\/cypress\//)])
      );
      expect(stage.failClosedProof).toMatch(
        /blocked|denial|fails closed|not-ready|unauthorized|conflicted|unavailable/
      );
      expect(stage.happyPathProof).toMatch(/visible|route-ready|context|readiness|ready|redirects/);
    }
  });

  it('keeps Plan/run readiness evidence accepted inside the full alpha route proof', () => {
    const planRunStage = internalAlphaCombinedRouteFixture.stages.find(
      (stage) => stage.stage === 'Plan/run readiness'
    );
    const componentGuide = readRepoFile(
      'docs/architecture/components/web/graph/canvas-plan-run-readiness-component.md'
    );
    const readinessModel = readRepoFile('apps/web/src/app/views/canvas/canvasPlanReadiness.ts');

    expect(planRunStage?.evidenceAcceptance).toBe('accepted');
    expect(planRunStage?.rails).toEqual(['ObservePlanRunReadiness']);
    expect(planRunStage?.evidenceRefs).toEqual(
      expect.arrayContaining([
        'docs/architecture/components/web/graph/canvas-plan-run-readiness-component.md',
        'apps/web/src/app/views/canvas/canvasPlanReadiness.test.ts',
        'apps/web/src/app/views/canvas/useCanvasExecutionActions.runStartGuards.test.tsx',
        'apps/web/src/app/views/canvas/useCanvasExecutionActions.runStartSuccess.test.tsx',
        'apps/web/cypress/e2e/canvas/canvas-preview-run-persisted.cy.ts',
      ])
    );
    for (const blocker of [
      'plan_integrity',
      'backpressure',
      'capability_mismatch',
      'adapter_degraded',
      'authorization_denied',
    ]) {
      expect(componentGuide).toContain(blocker);
      expect(readinessModel).toContain(blocker);
    }
    expect(evaluateInternalAlphaCombinedRouteFixture(internalAlphaCombinedRouteFixture)).toEqual(
      expect.objectContaining({
        remainingAlphaFullBlockers: [],
        routeDecision: 'accepted',
      })
    );
  });

  it('accepts the combined route fixture only when all stage evidence is accepted', () => {
    expect(
      evaluateInternalAlphaCombinedRouteFixture({
        ...internalAlphaCombinedRouteFixture,
        alphaFullClosureEvidenceRefs: [],
        alphaFullBlockers: [],
        stages: internalAlphaCombinedRouteFixture.stages.map((stage) => ({
          ...stage,
          evidenceAcceptance: 'accepted',
        })),
      })
    ).toMatchObject({
      missingAlphaFullClosureEvidenceRefs: ['alpha-full'],
      routeDecision: 'blocked',
    });

    expect(
      evaluateInternalAlphaCombinedRouteFixture({
        ...internalAlphaCombinedRouteFixture,
        stages: internalAlphaCombinedRouteFixture.stages.map((stage) =>
          stage.stage === 'Plan/run readiness' ? { ...stage, evidenceAcceptance: undefined } : stage
        ),
      })
    ).toMatchObject({
      missingEvidenceAcceptance: ['Plan/run readiness'],
      routeDecision: 'blocked',
    });
  });

  it('blocks the combined route fixture when a route stage lacks resolvable evidence refs', () => {
    expect(
      evaluateInternalAlphaCombinedRouteFixture({
        ...internalAlphaCombinedRouteFixture,
        stages: internalAlphaCombinedRouteFixture.stages.map((stage) =>
          stage.stage === 'Startup gate' ? { ...stage, evidenceRefs: [] } : stage
        ),
      })
    ).toMatchObject({
      missingEvidenceRefs: ['Startup gate'],
      routeDecision: 'blocked',
    });

    expect(
      evaluateInternalAlphaCombinedRouteFixture({
        ...internalAlphaCombinedRouteFixture,
        stages: internalAlphaCombinedRouteFixture.stages.map((stage) =>
          stage.stage === 'Startup gate'
            ? { ...stage, evidenceRefs: ['docs/missing-alpha-route-proof.md'] }
            : stage
        ),
      })
    ).toMatchObject({
      missingEvidenceRefs: ['Startup gate'],
      routeDecision: 'blocked',
    });
  });

  it('blocks the combined route fixture when a stage or owned rail is missing', () => {
    expect(
      evaluateInternalAlphaCombinedRouteFixture({
        ...internalAlphaCombinedRouteFixture,
        stages: internalAlphaCombinedRouteFixture.stages.filter(
          (stage) => stage.stage !== 'Code workbench'
        ),
      })
    ).toMatchObject({
      missingStages: ['Code workbench'],
      routeDecision: 'blocked',
    });

    expect(
      evaluateInternalAlphaCombinedRouteFixture({
        ...internalAlphaCombinedRouteFixture,
        stages: internalAlphaCombinedRouteFixture.stages.map((stage) =>
          stage.stage === 'Canvas workbench'
            ? { ...stage, rails: ['GetWorkspaceGraphDraft'] }
            : stage
        ),
      })
    ).toMatchObject({
      missingRails: ['SaveWorkspaceGraphDraft'],
      routeDecision: 'blocked',
    });
  });

  it('blocks the combined route fixture when recovery vocabulary is incomplete', () => {
    expect(
      evaluateInternalAlphaCombinedRouteFixture({
        ...internalAlphaCombinedRouteFixture,
        stages: internalAlphaCombinedRouteFixture.stages.map((stage) =>
          stage.stage === 'Plan/run readiness' ? { ...stage, recoveryStates: ['ready'] } : stage
        ),
      })
    ).toMatchObject({
      routeDecision: 'blocked',
      stagesWithoutRecoveryVocabulary: ['Plan/run readiness'],
    });

    expect(
      evaluateInternalAlphaCombinedRouteFixture({
        ...internalAlphaCombinedRouteFixture,
        stages: internalAlphaCombinedRouteFixture.stages.map((stage) => ({
          ...stage,
          recoveryStates: stage.recoveryStates.filter((recoveryState) => recoveryState !== 'stale'),
        })),
      })
    ).toMatchObject({
      missingRecoveryStates: ['stale'],
      routeDecision: 'blocked',
    });
  });
});
