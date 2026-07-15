// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { mockExecutionPlan } from '../../testing/fixtures/mockDbtData';
import type { PlanViewModel } from '../types/plans';
import { PlanPreviewModal, RePlanRequiredModal } from './Modals';

describe('PlanPreviewModal', () => {
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
    act(() => {
      root.unmount();
    });
    container.remove();
    Reflect.deleteProperty(globalThis, 'ResizeObserver');
  });

  it('does not close itself when Start Run is clicked', async () => {
    const onClose = vi.fn();
    const onStartRun = vi.fn();

    await act(async () => {
      root.render(
        <PlanPreviewModal
          open={true}
          onClose={onClose}
          plan={mockExecutionPlan}
          startRunMessage="Execution Preview is stale. Preview execution plan again before starting."
          onStartRun={onStartRun}
        />
      );
    });

    const startRunButton = Array.from(document.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Start Run')
    );
    expect(startRunButton).toBeTruthy();

    await act(async () => {
      startRunButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onStartRun).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('renders persisted plan previews as a contained responsive review surface', async () => {
    const longPlanId = '0adc1b56950c221a1a354d42ca13756baf31f5a2630b2231f999c2579fda410c';
    const plan = {
      ...mockExecutionPlan,
      planId: longPlanId,
      estimatedCost: undefined,
      planRef: {
        ...mockExecutionPlan.planRef!,
        uri: `dvt-plan://postgres/${longPlanId}`,
      },
      preview: {
        ...mockExecutionPlan.preview!,
        persisted: {
          ...mockExecutionPlan.preview!.persisted!,
          planRecordId: longPlanId,
          canonicalPlanSha256: 'f'.repeat(64),
        },
      },
    } as PlanViewModel;

    await act(async () => {
      root.render(
        <PlanPreviewModal
          open={true}
          onClose={vi.fn()}
          plan={plan}
          startRunMessage="El preview actual esta listo para arrancar."
          onStartRun={vi.fn()}
        />
      );
    });

    const modal = document.querySelector('[data-testid="plan-preview-modal"]');
    expect(modal).toBeTruthy();
    expect(modal?.className).toContain('sm:max-w-4xl');

    const bodyText = document.body.textContent ?? '';
    expect(bodyText).toContain('Execution Preview identity');
    expect(bodyText).toContain('Preview ID');
    expect(bodyText).toContain('Preview Ref');
    expect(bodyText).toContain('Preview record');
    expect(bodyText).toContain('Canonical preview');
    expect(bodyText).toContain('Execution target');
    expect(bodyText).toContain('Not estimated');
    expect(bodyText).not.toContain('Est. Cost:$');
    expect(bodyText).not.toContain('Plan identity');
    expect(bodyText).not.toContain('Plan ID');
    expect(bodyText).not.toContain('Plan Ref');
    expect(bodyText).not.toContain('Plan record');
    expect(bodyText).not.toContain('plan preview');
    expect(bodyText).not.toContain('canonical plan');

    const longValues = Array.from(
      document.querySelectorAll('[data-testid="plan-preview-long-value"]')
    );
    expect(longValues.length).toBeGreaterThan(0);
    expect(longValues.every((value) => value.className.includes('break-all'))).toBe(true);
  });

  it('shows authoritative dbt file provenance without exposing the credential reference', async () => {
    const plan = {
      ...mockExecutionPlan,
      preview: {
        ...mockExecutionPlan.preview!,
        provenance: {
          kind: 'dbt-project-files' as const,
          projectRoot: 'analytics',
          contentSetSha256: '1'.repeat(64),
          analysisSha256: '2'.repeat(64),
          dbtVersion: '1.10.0',
          selectedUniqueIds: ['model.analytics.orders'],
          executionTarget: {
            provider: 'server-config',
            adapter: 'postgres',
            targetName: 'development',
            credentialRef: 'vault:dbt/development',
          },
        },
      },
    } as PlanViewModel;

    await act(async () => {
      root.render(
        <PlanPreviewModal open={true} onClose={vi.fn()} plan={plan} onStartRun={vi.fn()} />
      );
    });

    const bodyText = document.body.textContent ?? '';
    expect(bodyText).toContain('Authoritative dbt project revision');
    expect(bodyText).toContain('analytics');
    expect(bodyText).toContain('model.analytics.orders');
    expect(bodyText).toContain('server-config / postgres / development');
    expect(bodyText).not.toContain('vault:dbt/development');
  });
});

describe('RePlanRequiredModal', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('uses Execution Preview action copy instead of re-plan commands', async () => {
    await act(async () => {
      root.render(<RePlanRequiredModal open={true} onClose={vi.fn()} onRePlan={vi.fn()} />);
    });

    const bodyText = document.body.textContent ?? '';

    expect(bodyText).toContain('Execution Preview Required');
    expect(bodyText).toContain('Preview execution plan');
    expect(bodyText).not.toContain('execution plan again before starting');
    expect(bodyText).not.toContain('Re-Plan');
    expect(bodyText).not.toContain('Create New Plan');
  });
});
