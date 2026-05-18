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
    expect(acceptanceMatrix).toMatch(/alpha-full stays\s+blocked/);
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
          /^(ObserveAppBootstrapRouteReadiness|GetEffectiveWorkspaceContext|GetWorkspaceGraphDraft|SaveWorkspaceGraphDraft|ListWorkspaceFiles|GetWorkspaceFileContent|ObservePlanRunReadiness|MapRouteRecoveryState)$/
        );
      }
      for (const evidenceRef of stage.evidenceRefs) {
        expect(evidenceRef).toMatch(/^(docs|apps\/web)\//);
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
      'ObservePlanRunReadiness',
      'MapRouteRecoveryState',
    ]);

    expect(evaluateInternalAlphaCombinedRouteFixture(internalAlphaCombinedRouteFixture)).toEqual({
      missingEvidenceAcceptance: [],
      missingFailClosedProof: [],
      missingHappyPathProof: [],
      missingEvidenceRefs: [],
      missingRails: [],
      missingRecoveryStates: [],
      missingStages: [],
      routeAuthority: 'F-27',
      routeDecision: 'review',
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

  it('accepts startup gate evidence without accepting the full alpha route', () => {
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
        routeDecision: 'review',
      })
    );
  });

  it('accepts workspace context evidence without accepting the full alpha route', () => {
    const workspaceContextStage = internalAlphaCombinedRouteFixture.stages.find(
      (stage) => stage.stage === 'Workspace context'
    );

    expect(workspaceContextStage?.evidenceAcceptance).toBe('accepted');
    expect(workspaceContextStage?.rails).toEqual(['GetEffectiveWorkspaceContext']);
    expect(workspaceContextStage?.evidenceRefs).toEqual(
      expect.arrayContaining([
        'apps/web/src/app/services/session/protectedRouteSessionContext.test.ts',
        'apps/web/src/app/services/session/protectedRouteSessionContext.architecture.test.ts',
        'apps/web/cypress/e2e/canvas/canvas-workbench-tabs.cy.ts',
        'docs/architecture/components/web/appshell/effective-workspace-context-component.md',
      ])
    );
    expect(evaluateInternalAlphaCombinedRouteFixture(internalAlphaCombinedRouteFixture)).toEqual(
      expect.objectContaining({
        missingEvidenceAcceptance: [],
        routeDecision: 'review',
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
      expect(stage.happyPathProof).toMatch(/visible|route-ready|context|readiness|ready/);
    }
  });

  it('accepts the combined route fixture only when all stage evidence is accepted', () => {
    expect(
      evaluateInternalAlphaCombinedRouteFixture({
        ...internalAlphaCombinedRouteFixture,
        stages: internalAlphaCombinedRouteFixture.stages.map((stage) => ({
          ...stage,
          evidenceAcceptance: 'accepted',
        })),
      })
    ).toMatchObject({
      missingEvidenceAcceptance: [],
      routeDecision: 'accepted',
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
