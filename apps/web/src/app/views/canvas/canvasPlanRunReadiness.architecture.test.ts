/**
 * Owned concern: prove Canvas plan/run readiness is a source-owned read model,
 * not duplicated toolbar copy or child-slice evidence masquerading as alpha.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const REPO_ROOT = path.resolve(import.meta.dirname, '../../../../../..');

function readRepoFile(...segments: string[]): string {
  return readFileSync(path.join(REPO_ROOT, ...segments), 'utf8');
}

describe('Canvas plan/run readiness architecture', () => {
  it('documents public API, invariants, transitions, consumers, and diagrams', () => {
    const componentGuide = readRepoFile(
      'docs/architecture/components/web/graph/canvas-plan-run-readiness-component.md'
    );
    const userStories = readRepoFile(
      'docs/architecture/components/web/graph/canvas-plan-run-readiness-user-stories.md'
    );

    for (const section of [
      '## Public API',
      '## Invariants',
      '## State Transitions',
      '## Consumers',
      '## Architecture Diagram',
      '## Sequence Diagram',
      '```mermaid',
      'ObservePlanRunReadiness',
      'PlanRunReadinessReadModel',
    ]) {
      expect(componentGuide).toContain(section);
    }

    for (const storyId of [
      'US-F27-PLANRUN-001',
      'US-F27-PLANRUN-002',
      'US-F27-PLANRUN-003',
      'US-F27-PLANRUN-004',
      'US-F27-PLANRUN-005',
      'US-F27-PLANRUN-006',
    ]) {
      expect(userStories).toContain(storyId);
    }
  });

  it('keeps the read model source-owned in code instead of toolbar-local copy', () => {
    const readinessModel = readRepoFile('apps/web/src/app/views/canvas/canvasPlanReadiness.ts');
    const executionState = readRepoFile('apps/web/src/app/views/canvas/canvasExecutionState.ts');
    const toolbarControls = readRepoFile(
      'apps/web/src/app/views/canvas/CanvasToolbarPrimaryControls.tsx'
    );

    expect(readinessModel.trimStart()).toMatch(/^\/\*\*[\s\S]*Owned concern:/);
    expect(readinessModel).toContain('PlanRunReadinessReadModel');
    expect(readinessModel).toContain('observePlanRunReadiness');
    expect(executionState).toContain('observePlanRunReadiness');
    expect(toolbarControls).not.toContain('PlanRunReadinessReadModel');
    expect(toolbarControls).not.toContain('plan_integrity');
  });

  it('requires every F-27 readiness blocker to stay explicit and covered by evidence', () => {
    const readinessModel = readRepoFile('apps/web/src/app/views/canvas/canvasPlanReadiness.ts');
    const componentGuide = readRepoFile(
      'docs/architecture/components/web/graph/canvas-plan-run-readiness-component.md'
    );
    const readinessTests = readRepoFile(
      'apps/web/src/app/views/canvas/canvasPlanReadiness.test.ts'
    );
    const runStartTests = readRepoFile(
      'apps/web/src/app/views/canvas/useCanvasExecutionActions.runStart.test.tsx'
    );
    const browserProof = readRepoFile(
      'apps/web/cypress/e2e/canvas/canvas-preview-run-persisted.cy.ts'
    );

    for (const blocker of [
      'plan_integrity',
      'backpressure',
      'capability_mismatch',
      'adapter_degraded',
      'authorization_denied',
    ]) {
      expect(readinessModel).toContain(blocker);
      expect(componentGuide).toContain(blocker);
      expect(readinessTests).toContain(blocker);
    }

    for (const evidenceRef of [
      'apps/web/src/app/views/canvas/canvasPlanReadiness.test.ts',
      'apps/web/src/app/views/canvas/useCanvasExecutionActions.runStart.test.tsx',
      'apps/web/cypress/e2e/canvas/canvas-preview-run-persisted.cy.ts',
    ]) {
      expect(existsSync(path.join(REPO_ROOT, evidenceRef))).toBe(true);
      expect(componentGuide).toContain(evidenceRef);
    }

    expect(runStartTests).toContain(
      'keeps startRun unavailable when route permissions block run execution'
    );
    expect(browserProof).toContain(
      'starts run when persisted preview identity matches the active plan'
    );
    expect(browserProof).toContain('blocks run when persisted preview identity is not aligned');
  });
});
