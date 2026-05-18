/**
 * Owned concern: prove the internal alpha route gate has one route-level
 * authority, stage-specific acceptance semantics, and no child-slice shortcut
 * to alpha-full completion.
 */
import { readFileSync } from 'node:fs';
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
      'ObserveWorkspaceContext',
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
      for (const rail of stage.rails) {
        expect(rail).toMatch(
          /^(ObserveAppBootstrapRouteReadiness|ObserveWorkspaceContext|GetWorkspaceGraphDraft|SaveWorkspaceGraphDraft|ListWorkspaceFiles|GetWorkspaceFileContent|ObservePlanRunReadiness|MapRouteRecoveryState)$/
        );
      }
      expect(stage.happyPathProof).toBeTruthy();
      expect(stage.failClosedProof).toBeTruthy();
      expect(stage.recoveryState).toMatch(
        /^(ready|blocked|unauthorized|unavailable|stale|not-found)$/
      );
    }

    expect(internalAlphaCombinedRouteFixture.stages.flatMap((stage) => stage.rails)).toEqual([
      'ObserveAppBootstrapRouteReadiness',
      'ObserveWorkspaceContext',
      'GetWorkspaceGraphDraft',
      'SaveWorkspaceGraphDraft',
      'ListWorkspaceFiles',
      'GetWorkspaceFileContent',
      'ObservePlanRunReadiness',
      'MapRouteRecoveryState',
    ]);

    expect(evaluateInternalAlphaCombinedRouteFixture(internalAlphaCombinedRouteFixture)).toEqual({
      missingFailClosedProof: [],
      missingHappyPathProof: [],
      missingRails: [],
      missingStages: [],
      routeAuthority: 'F-27',
      routeDecision: 'review',
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
});
