/**
 * Owned concern: prove the internal alpha route gate has one route-level
 * authority, stage-specific acceptance semantics, and no child-slice shortcut
 * to alpha-full completion.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

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
      expect(acceptanceMatrix).toMatch(new RegExp(`\\|\\s*${stage}\\s*\\|`));
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
});
