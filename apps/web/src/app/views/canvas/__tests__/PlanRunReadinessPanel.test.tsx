// @vitest-environment jsdom

/** Owned concern: prove Canvas renders the PlanRunReadiness rail read model without owning it. */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { PlanRunReadinessPanel } from '../PlanRunReadinessPanel';
import type { PlanRunReadinessReadModel } from '../canvasPlanReadiness';

function buildReadiness(overrides?: Partial<PlanRunReadinessReadModel>): PlanRunReadinessReadModel {
  return {
    blockers: [],
    rail: 'ObservePlanRunReadiness',
    status: 'ready',
    summary: 'The current preview is ready to start.',
    ...overrides,
  };
}

describe('PlanRunReadinessPanel', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  function renderPanel(readiness: PlanRunReadinessReadModel): void {
    act(() => {
      root.render(<PlanRunReadinessPanel readiness={readiness} />);
    });
  }

  it('shows a ready read model with status, summary, and no blockers', () => {
    renderPanel(buildReadiness());

    expect(container.querySelector('[data-slot="plan-run-readiness-panel"]')).not.toBeNull();
    expect(
      container.querySelector('[data-slot="plan-run-readiness-status"]')?.textContent
    ).toContain('Ready');
    expect(
      container.querySelector('[data-slot="plan-run-readiness-summary"]')?.textContent
    ).toContain('The current preview is ready to start.');
    expect(container.textContent).toContain('No blockers');
  });

  it('shows every blocker from a blocked read model', () => {
    renderPanel(
      buildReadiness({
        blockers: [
          'plan_integrity',
          'backpressure',
          'capability_mismatch',
          'adapter_degraded',
          'authorization_denied',
        ],
        status: 'blocked',
        summary: 'Run start is blocked.',
      })
    );

    expect(
      container.querySelector('[data-slot="plan-run-readiness-status"]')?.textContent
    ).toContain('Blocked');
    expect(container.textContent).toContain('Execution Preview integrity');
    expect(container.textContent).not.toContain('Plan integrity');
    expect(container.textContent).toContain('Backpressure');
    expect(container.textContent).toContain('Capability mismatch');
    expect(container.textContent).toContain('Adapter degraded');
    expect(container.textContent).toContain('Authorization denied');
  });
});
