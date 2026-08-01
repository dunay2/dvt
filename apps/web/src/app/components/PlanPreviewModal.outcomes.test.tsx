// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { mockExecutionPlan } from '../../testing/fixtures/mockDbtData';
import type { PlanPreviewOutcome } from '../ports/plans';
import { resolveCanvasViewCopy } from '../views/canvas/copy';
import { PlanPreviewModal } from './PlanPreviewModal';

const MESSAGES = resolveCanvasViewCopy('en');

describe('PlanPreviewModal rejected outcomes', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT: boolean;
        ResizeObserver?: new (callback: ResizeObserverCallback) => ResizeObserver;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    (
      globalThis as typeof globalThis & {
        ResizeObserver?: new (callback: ResizeObserverCallback) => ResizeObserver;
      }
    ).ResizeObserver = class ResizeObserver {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as unknown as new (callback: ResizeObserverCallback) => ResizeObserver;
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    Reflect.deleteProperty(globalThis, 'ResizeObserver');
  });

  async function renderOutcome(outcome: PlanPreviewOutcome): Promise<void> {
    await act(async () => {
      root.render(
        <PlanPreviewModal
          open={true}
          onClose={vi.fn()}
          outcome={outcome}
          messages={MESSAGES}
          plan={outcome.kind === 'plan-invalid' ? outcome.plan : null}
          startRunDisabled={true}
          startRunMessage="Preview blocked"
          onStartRun={vi.fn()}
        />
      );
    });
  }

  it('renders a selection rejection without fabricated plan identity or run controls', async () => {
    await renderOutcome({
      kind: 'selection-rejected',
      rejection: {
        code: 'REJECTED',
        cause: 'selection.empty',
        reason: 'Select at least one executable resource.',
      },
    });

    const modal = document.querySelector('[data-testid="plan-preview-modal"]');
    const text = modal?.textContent ?? '';

    expect(text).toContain('Execution Preview rejected');
    expect(text).toContain('Select at least one executable resource.');
    expect(text).toContain('selection.empty');
    expect(text).not.toContain('Execution Preview identity');
    expect(text).not.toContain(mockExecutionPlan.planId);
    expect(text).not.toContain('Execution steps');
    expect(text).not.toContain('Start Run');
  });

  it('keeps long selection rejection diagnostics inside a scrollable viewport', async () => {
    await renderOutcome({
      kind: 'selection-rejected',
      rejection: {
        code: 'REJECTED',
        cause: 'selection.constraint'.repeat(80),
        reason: 'selection-rejection-diagnostic'.repeat(160),
      },
    });

    const modal = document.querySelector('[data-testid="plan-preview-modal"]');
    const diagnosticBody = modal?.querySelector('[data-slot="plan-preview-scroll-region"]');
    const reason = modal?.querySelector('[aria-label="Reason value"]');

    expect(modal?.className).toContain('max-h-[92vh]');
    expect(diagnosticBody?.className).toContain('overflow-y-auto');
    expect(reason?.className).toContain('break-all');
  });

  it('renders an invalid plan with exact identity and a disabled Start Run command', async () => {
    const plan = { ...mockExecutionPlan, planRef: mockExecutionPlan.planRef! };

    await renderOutcome({
      kind: 'plan-invalid',
      plan,
      validation: {
        status: 'ERROR',
        planId: plan.planId,
        adapterId: 'temporal',
        code: 'MISSING_CAPABILITY',
        degradable: false,
        cause: 'executor.dbt',
        reason: 'The selected runtime cannot execute dbt steps.',
      },
    });

    const modal = document.querySelector('[data-testid="plan-preview-modal"]');
    const text = modal?.textContent ?? '';
    const startRun = Array.from(modal?.querySelectorAll('button') ?? []).find((button) =>
      button.textContent?.includes('Start Run')
    );

    expect(text).toContain('Execution Preview is not executable');
    expect(text).toContain(plan.planId);
    expect(text).toContain(plan.planRef.uri);
    expect(text).toContain('MISSING_CAPABILITY');
    expect(text).toContain('executor.dbt');
    expect(text).toContain('The selected runtime cannot execute dbt steps.');
    expect(startRun).toBeTruthy();
    expect(startRun?.hasAttribute('disabled')).toBe(true);
  });

  it('keeps an unknown rejection code diagnosable without rendering its raw reason', async () => {
    await renderOutcome({
      kind: 'selection-rejected',
      rejection: {
        code: 'FUTURE_REJECTION',
        reason: '<unsafe>future backend message</unsafe>',
      },
    } as unknown as PlanPreviewOutcome);

    const modal = document.querySelector('[data-testid="plan-preview-modal"]');
    const text = modal?.textContent ?? '';

    expect(text).toContain('The Execution Preview was rejected. Review the technical code.');
    expect(text).toContain('FUTURE_REJECTION');
    expect(text).not.toContain('future backend message');
  });

  it('preserves invalid plan identity while applying safe copy to a future validator code', async () => {
    const plan = { ...mockExecutionPlan, planRef: mockExecutionPlan.planRef! };

    await renderOutcome({
      kind: 'plan-invalid',
      plan,
      validation: {
        status: 'ERROR',
        planId: plan.planId,
        adapterId: 'future-adapter',
        code: 'FUTURE_VALIDATION',
        degradable: false,
        reason: '<unsafe>future validator message</unsafe>',
      },
    } as unknown as PlanPreviewOutcome);

    const modal = document.querySelector('[data-testid="plan-preview-modal"]');
    const text = modal?.textContent ?? '';

    expect(text).toContain(plan.planId);
    expect(text).toContain(plan.planRef.uri);
    expect(text).toContain('FUTURE_VALIDATION');
    expect(text).toContain('The Execution Preview was rejected. Review the technical code.');
    expect(text).not.toContain('future validator message');
  });
});
