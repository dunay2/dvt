// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BottomOperationalDrawerBody,
  BottomOperationalDrawerTabs,
} from './OperationalDrawerPanels';
import type { OperationalDrawerContribution } from './operationalDrawerContributionStore';

function buildCanvasOperationalDrawerContribution(
  overrides?: Partial<OperationalDrawerContribution>
): OperationalDrawerContribution {
  return {
    source: 'canvas',
    title: 'Canvas operations',
    copy: {
      problemsAriaLabel: 'Canvas problems',
      noProblemsMessage: 'No current Canvas problems.',
      runsAriaLabel: 'Canvas runs',
      runReadyStatus: 'Run ready',
      runBlockedStatus: 'Run blocked',
      runActiveStatus: 'Active run',
      previewAriaLabel: 'Canvas execution preview',
      previewAction: 'Create Execution Preview',
      previewReadyStatus: 'Preview ready',
      previewBlockedStatus: 'Preview blocked',
      tabsAriaLabel: 'Canvas operational drawer',
      severity: { info: 'Info', warning: 'Warning', error: 'Error' },
    },
    tabs: [
      { id: 'log', label: 'Log', count: null },
      { id: 'problems', label: 'Problems', count: 1 },
      { id: 'runs', label: 'Runs', count: 1 },
      { id: 'preview', label: 'Preview', count: 1 },
    ],
    problems: {
      items: [
        {
          id: 'plan_integrity',
          severity: 'warning',
          message: 'Preview required before running.',
          detail: 'Execution Preview integrity',
        },
      ],
    },
    runs: {
      activeRunId: 'run-42',
      canStartRun: false,
      controls: null,
      onStartRun: vi.fn(),
      status: 'active',
      summary: 'Run run-42 is active.',
    },
    preview: {
      status: 'blocked',
      summary: 'Preview required before running.',
      blockers: ['Execution Preview integrity'],
      canPreview: true,
      onPreviewExecutionPlan: vi.fn(),
      selectionRecovery: null,
    },
    ...overrides,
  };
}

describe('OperationalDrawerPanels', () => {
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

  it('renders operational drawer tabs as component-owned presentation', async () => {
    const onSelectTab = vi.fn();
    const contribution = buildCanvasOperationalDrawerContribution();

    await act(async () => {
      root.render(
        <BottomOperationalDrawerTabs
          activeTab="log"
          contribution={contribution}
          onSelectTab={onSelectTab}
        />
      );
    });

    const tabs = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[data-slot="bottom-operational-drawer-tab"]')
    );

    expect(tabs.map((tab) => tab.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'Log',
      'Problems 1',
      'Runs 1',
      'Preview 1',
    ]);
    expect(tabs[0]?.getAttribute('aria-selected')).toBe('true');

    await act(async () => {
      fireEvent.click(tabs[3]!);
    });

    expect(onSelectTab).toHaveBeenCalledWith('preview');
  });

  it('renders problems, runs, and preview bodies from the route contribution', async () => {
    const onPreviewExecutionPlan = vi.fn();
    const contribution = buildCanvasOperationalDrawerContribution({
      preview: {
        status: 'blocked',
        summary: 'Preview required before running.',
        blockers: ['Execution Preview integrity'],
        canPreview: true,
        onPreviewExecutionPlan,
        selectionRecovery: null,
      },
    });

    await act(async () => {
      root.render(
        <BottomOperationalDrawerBody
          activeTab="problems"
          contribution={contribution}
          logBody={<div data-testid="log-body">log stream</div>}
        />
      );
    });

    expect(container.textContent).toContain('Preview required before running.');
    expect(container.textContent).toContain('Execution Preview integrity');
    expect(container.textContent).not.toContain('plan_integrity');
    expect(
      container.querySelector('[data-slot="bottom-operational-problem-severity"]')?.textContent
    ).toBe('Warning');

    await act(async () => {
      root.render(
        <BottomOperationalDrawerBody
          activeTab="runs"
          contribution={contribution}
          logBody={<div data-testid="log-body">log stream</div>}
        />
      );
    });

    expect(container.textContent).toContain('Active run');
    expect(container.textContent).toContain('run-42');

    await act(async () => {
      root.render(
        <BottomOperationalDrawerBody
          activeTab="preview"
          contribution={contribution}
          logBody={<div data-testid="log-body">log stream</div>}
        />
      );
    });

    expect(container.textContent).toContain('Preview required before running.');
    expect(
      container.querySelector('[data-slot="bottom-operational-preview-blocker"]')?.textContent
    ).toBe('Execution Preview integrity');
    expect(container.textContent).not.toContain('plan_integrity');

    const previewButton = container.querySelector<HTMLButtonElement>(
      '[data-slot="bottom-operational-preview-action"]'
    );
    expect(previewButton).not.toBeNull();
    expect(previewButton?.textContent).toContain('Create Execution Preview');

    await act(async () => {
      fireEvent.click(previewButton!);
    });

    expect(onPreviewExecutionPlan).toHaveBeenCalledTimes(1);
  });

  it('delegates to log body when no route contribution owns the drawer', async () => {
    await act(async () => {
      root.render(
        <BottomOperationalDrawerBody
          activeTab="problems"
          contribution={null}
          logBody={<div data-testid="log-body">log stream</div>}
        />
      );
    });

    expect(container.textContent).toBe('log stream');
  });

  it('renders all contributed Spanish labels, status text, actions, and accessible names', async () => {
    const contribution = buildCanvasOperationalDrawerContribution({
      title: 'Operaciones del Canvas',
      copy: {
        problemsAriaLabel: 'Problemas del Canvas',
        noProblemsMessage: 'No hay problemas actuales en el Canvas.',
        runsAriaLabel: 'Ejecuciones del Canvas',
        runReadyStatus: 'Ejecución lista',
        runBlockedStatus: 'Ejecución bloqueada',
        runActiveStatus: 'Ejecución activa',
        previewAriaLabel: 'Vista previa de ejecución del Canvas',
        previewAction: 'Crear Execution Preview',
        previewReadyStatus: 'Vista previa lista',
        previewBlockedStatus: 'Vista previa bloqueada',
        tabsAriaLabel: 'Cajón operativo del Canvas',
        severity: { info: 'Información', warning: 'Advertencia', error: 'Error' },
      },
      tabs: [
        { id: 'log', label: 'Registro', count: null },
        { id: 'problems', label: 'Problemas', count: 1 },
        { id: 'runs', label: 'Ejecuciones', count: 1 },
        { id: 'preview', label: 'Vista previa', count: 1 },
      ],
      problems: {
        items: [
          {
            id: 'plan_integrity',
            severity: 'warning',
            message: 'Se requiere una vista previa antes de ejecutar.',
            detail: 'Integridad del Execution Preview',
          },
        ],
      },
      runs: {
        activeRunId: null,
        canStartRun: false,
        controls: null,
        onStartRun: vi.fn(),
        status: 'blocked',
        summary: 'Se requiere una vista previa antes de ejecutar.',
      },
      preview: {
        status: 'blocked',
        summary: 'Se requiere una vista previa antes de ejecutar.',
        blockers: ['Integridad del Execution Preview'],
        canPreview: true,
        onPreviewExecutionPlan: vi.fn(),
        selectionRecovery: null,
      },
    });

    await act(async () => {
      root.render(
        <BottomOperationalDrawerTabs
          activeTab="log"
          contribution={contribution}
          onSelectTab={vi.fn()}
        />
      );
    });
    expect(container.querySelector('[role="tablist"]')?.getAttribute('aria-label')).toBe(
      'Cajón operativo del Canvas'
    );
    expect(container.textContent).toContain('Registro');
    expect(container.textContent).toContain('Vista previa');

    await act(async () => {
      root.render(
        <BottomOperationalDrawerBody
          activeTab="problems"
          contribution={contribution}
          logBody={null}
        />
      );
    });
    expect(container.querySelector('section')?.getAttribute('aria-label')).toBe(
      'Problemas del Canvas'
    );
    expect(container.textContent).toContain('Advertencia');

    await act(async () => {
      root.render(
        <BottomOperationalDrawerBody activeTab="runs" contribution={contribution} logBody={null} />
      );
    });
    expect(container.querySelector('section')?.getAttribute('aria-label')).toBe(
      'Ejecuciones del Canvas'
    );
    expect(container.textContent).toContain('Ejecución bloqueada');

    await act(async () => {
      root.render(
        <BottomOperationalDrawerBody
          activeTab="preview"
          contribution={contribution}
          logBody={null}
        />
      );
    });
    expect(container.querySelector('section')?.getAttribute('aria-label')).toBe(
      'Vista previa de ejecución del Canvas'
    );
    expect(container.textContent).toContain('Vista previa bloqueada');
    expect(container.textContent).toContain('Crear Execution Preview');
  });
});
