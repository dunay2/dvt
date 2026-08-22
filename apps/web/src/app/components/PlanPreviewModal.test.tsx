// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { mockExecutionPlan } from '../../testing/fixtures/mockDbtData';
import type { PlanViewModel } from '../types/plans';
import { resolveCanvasViewCopy } from '../views/canvas/copy';
import { PlanPreviewModal } from './PlanPreviewModal';

const PLAN_PREVIEW_MESSAGES = resolveCanvasViewCopy('en');

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
          outcome={null}
          messages={PLAN_PREVIEW_MESSAGES}
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
      decisions: [
        {
          subjectId: 'model.analytics.orders',
          subjectKind: 'node' as const,
          status: 'RUN' as const,
          reasonCode: 'SELECTED_ROOT' as const,
        },
      ],
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
          outcome={{ kind: 'accepted', plan: { ...plan, planRef: plan.planRef! } }}
          messages={PLAN_PREVIEW_MESSAGES}
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
    expect(bodyText).toContain('Execution decisions');
    expect(bodyText).toContain('Explicitly selected execution root.');
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
    expect(document.querySelector('[data-slot="plan-preview-id"]')?.textContent).toBe(plan.planId);
    expect(document.querySelector('[data-slot="plan-preview-start-run"]')).not.toBeNull();
  });

  it('renders the complete accepted preview surface in Spanish without English UI copy', async () => {
    const acceptedPlan = { ...mockExecutionPlan, planRef: mockExecutionPlan.planRef! };

    await act(async () => {
      root.render(
        <PlanPreviewModal
          open={true}
          onClose={vi.fn()}
          plan={acceptedPlan}
          outcome={{ kind: 'accepted', plan: acceptedPlan }}
          messages={resolveCanvasViewCopy('es')}
          startRunMessage="La vista previa actual está lista para iniciar la ejecución."
          onStartRun={vi.fn()}
        />
      );
    });

    const modal = document.querySelector('[data-testid="plan-preview-modal"]');
    const text = modal?.textContent ?? '';

    expect(text).toContain('Vista previa de ejecución');
    expect(text).toContain('Solo lectura');
    expect(text).toContain('Identidad de la vista previa');
    expect(text).toContain('Destino de ejecución');
    expect(text).toContain('Resumen de la vista previa persistida');
    expect(text).toContain('Evidencia de persistencia');
    expect(text).toContain('Procedencia');
    expect(text).toContain('Pasos de ejecución');
    expect(text).toContain('4 nodos');
    expect(text).toContain('Exportar JSON');
    expect(text).toContain('Iniciar ejecución');
    expect(document.querySelector('[aria-label="ID de vista previa"]')?.textContent).toBe(
      acceptedPlan.planId
    );

    for (const englishCopy of [
      'Execution Preview identity',
      'Read-only',
      'Execution target',
      'Persisted preview summary',
      'Persistence evidence',
      'Execution steps',
      'Export JSON',
      'Start Run',
      'Not reported',
      'Unknown',
      'unknown',
      'Not estimated',
      '4 nodes',
      'Motivo del planner',
      'enviarán al runtime',
    ]) {
      expect(text).not.toContain(englishCopy);
    }
  });

  it('shows authoritative dbt file provenance without exposing the credential reference', async () => {
    const plan = {
      ...mockExecutionPlan,
      preview: {
        ...mockExecutionPlan.preview!,
        selectionIntent: {
          mode: 'explicit' as const,
          requestedRootNodeIds: ['test.analytics.orders_not_null'],
          derivedDependencyNodeIds: ['model.analytics.orders'],
          authorizedScopeNodeIds: ['model.analytics.orders', 'test.analytics.orders_not_null'],
        },
        provenance: {
          kind: 'dbt-project-files' as const,
          canvasId: 'analytics-canvas',
          projectRoot: 'analytics',
          contentSetSha256: '1'.repeat(64),
          analysisSha256: '2'.repeat(64),
          dbtVersion: '1.10.0',
          selectedUniqueIds: ['model.analytics.orders', 'test.analytics.orders_not_null'],
          executionTarget: {
            provider: 'server-config',
            adapter: 'postgres',
            targetName: 'development',
            connectionRef: {
              schemaVersion: 'connection-ref.v1',
              connectionId: 'warehouse-development',
              provider: 'postgres',
            },
            resolutionSource: 'environment-default',
            credentialRef: 'vault:dbt/development',
          },
        },
      },
    } as PlanViewModel;

    await act(async () => {
      root.render(
        <PlanPreviewModal
          open={true}
          onClose={vi.fn()}
          plan={plan}
          outcome={null}
          messages={PLAN_PREVIEW_MESSAGES}
          onStartRun={vi.fn()}
        />
      );
    });

    const bodyText = document.body.textContent ?? '';
    expect(bodyText).toContain('Authoritative dbt project revision');
    expect(document.querySelector('[aria-label="Canvas"]')?.textContent).toBe('analytics-canvas');
    expect(bodyText).toContain('analytics');
    expect(bodyText).toContain('model.analytics.orders');
    expect(document.querySelector('[aria-label="Requested resources"]')?.textContent).toBe(
      'test.analytics.orders_not_null'
    );
    expect(document.querySelector('[aria-label="Included dependencies"]')?.textContent).toBe(
      'model.analytics.orders'
    );
    expect(document.querySelector('[aria-label="Authorized execution scope"]')?.textContent).toBe(
      'model.analytics.orders, test.analytics.orders_not_null'
    );
    expect(document.querySelector('[aria-label="Target"]')?.textContent).toBe('development');
    expect(document.querySelector('[aria-label="Connection"]')?.textContent).toBe(
      'postgres / warehouse-development'
    );
    expect(document.querySelector('[aria-label="Resolved by"]')?.textContent).toBe(
      'Environment default'
    );
    expect(bodyText).not.toContain('vault:dbt/development');
  });
});
