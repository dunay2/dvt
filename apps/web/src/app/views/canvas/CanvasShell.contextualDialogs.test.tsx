// @vitest-environment jsdom

/** Owned concern: prove CanvasShell contextual dialogs without source-import contract noise. */
import { DbtProjectImportResultSchema } from '@dvt/contracts';
import { act } from 'react';
import { waitFor } from '@testing-library/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createCanvasShellHarness,
  getCanvasShellState,
  type CanvasShellPropsOverrides,
} from './CanvasShell.testHarness';
import { useCanvasWorkspaceMenuContributionStore } from './canvasWorkspaceMenuContributionStore';
import type { CanvasShellProps } from './canvasShell.types';

const shellState = getCanvasShellState();
type DialogViewportCommand = 'onOpenCanvasSettings';

describe('CanvasShell contextual dialogs', () => {
  let container: HTMLDivElement;
  let renderShell: (overrides?: CanvasShellPropsOverrides) => Promise<CanvasShellProps>;
  let unmountShell: () => void;

  beforeEach(() => {
    const harness = createCanvasShellHarness();
    container = harness.container;
    renderShell = harness.render;
    unmountShell = harness.unmount;
  });

  afterEach(() => {
    unmountShell();
  });

  it('opens a contextual project explorer from the viewport command using real canvas documents', async () => {
    const onSelectCanvas = vi.fn();

    await renderShell({
      panels: {
        activeCanvasId: 'sales-canvas',
        activeCanvas: {
          id: 'sales-canvas',
          title: 'Sales canvas',
          kind: 'dbt',
          environmentId: 'dev',
        },
        canvasDocuments: [
          {
            id: 'sales-canvas',
            title: 'Sales canvas',
            kind: 'dbt',
            environmentId: 'dev',
          },
          {
            id: 'dvt-flow',
            title: 'DVT flow',
            kind: 'transformation',
            environmentId: 'dev',
          },
        ],
      },
      canvasCommands: {
        onSelectCanvas,
      },
    });

    await act(async () => {
      useCanvasWorkspaceMenuContributionStore.getState().contribution?.onOpenProjectExplorer?.();
    });

    await waitFor(() =>
      expect(
        document.body.querySelector('[data-slot="canvas-project-explorer-dialog"]')
      ).not.toBeNull()
    );
    const projectExplorer = document.body.querySelector(
      '[data-slot="canvas-project-explorer-dialog"]'
    );
    expect(projectExplorer?.textContent).toContain('Sales canvas');
    expect(projectExplorer?.textContent).toContain('DVT flow');

    const dvtFlowButton = Array.from(projectExplorer?.querySelectorAll('button') ?? []).find(
      (button) => button.textContent === 'Open DVT flow'
    );
    expect(dvtFlowButton).toBeDefined();

    await act(async () => {
      dvtFlowButton?.click();
    });

    expect(onSelectCanvas).toHaveBeenCalledWith('dvt-flow');
  });

  it('opens contextual canvas settings from the viewport command using view commands', async () => {
    const onToggleGridVisible = vi.fn();
    const onToggleSnapToGrid = vi.fn();

    await renderShell({
      chromeCommands: {
        onToggleGridVisible,
        onToggleSnapToGrid,
      },
    });

    await act(async () => {
      const openCanvasSettings = getViewportCommand('onOpenCanvasSettings');
      openCanvasSettings?.();
    });

    const settingsDialog = document.body.querySelector('[data-slot="canvas-settings-dialog"]');
    expect(settingsDialog).not.toBeNull();
    expect(settingsDialog?.textContent).toContain('Canvas settings');

    const gridButton = Array.from(settingsDialog?.querySelectorAll('button') ?? []).find(
      (button) => button.textContent === 'Hide grid'
    );
    const snapButton = Array.from(settingsDialog?.querySelectorAll('button') ?? []).find(
      (button) => button.textContent === 'Enable snap'
    );
    expect(gridButton).toBeDefined();
    expect(snapButton).toBeDefined();

    await act(async () => {
      gridButton?.click();
      snapButton?.click();
    });

    expect(onToggleGridVisible).toHaveBeenCalledTimes(1);
    expect(onToggleSnapToGrid).toHaveBeenCalledTimes(1);
  });

  it('imports a dbt project from Workspace and delegates navigation from the server receipt', async () => {
    const onDbtProjectImported = vi.fn();
    const result = DbtProjectImportResultSchema.parse({
      schemaVersion: 'dbt-project-import-result.v1',
      success: true,
      idempotencyKey: 'dbt-project-import:warehouse-analytics:1',
      authorityBinding: {
        schemaVersion: 'canvas-authoring-authority-binding.v1',
        canvasId: 'warehouse-analytics',
        authority: { kind: 'dbt-project-files', projectRoot: 'analytics' },
      },
      projectRevision: {
        projectRoot: 'analytics',
        contentSetSha256: '1'.repeat(64),
        analyzedAt: '2026-07-15T10:00:01.000Z',
        analyzerVersion: 'dbt-cli-v1',
      },
      analysisSha256: '2'.repeat(64),
      projectedResourceCount: 8,
      importedAt: '2026-07-15T10:00:02.000Z',
    });

    await renderShell({ onDbtProjectImported });

    await act(async () => {
      useCanvasWorkspaceMenuContributionStore.getState().contribution?.onImportDbtProject?.();
    });

    expect(shellState.dbtProjectImportDialogProps).toMatchObject({ open: true });
    expect(container.querySelector('[data-testid="dbt-project-import-dialog"]')).not.toBeNull();

    await act(async () => {
      const onImported = shellState.dbtProjectImportDialogProps?.onImported as
        ((receipt: typeof result) => void) | undefined;
      onImported?.(result);
    });

    expect(onDbtProjectImported).toHaveBeenCalledWith(result);
    expect(shellState.dbtProjectImportDialogProps).toMatchObject({ open: false });
  });

  it('opens contextual project Code from a one-shot route intent', async () => {
    const onConsumed = vi.fn();
    const onUnavailableLegacySurface = vi.fn();

    await renderShell({
      routeIntentRequest: {
        intent: { kind: 'open-contextual-workbench', workbenchId: 'project-code' },
        onConsumed,
        onUnavailableLegacySurface,
      },
    });

    expect(container.querySelector('[data-slot="canvas-contextual-workbench"]')).not.toBeNull();
    expect(onConsumed).toHaveBeenCalledTimes(1);
    expect(onUnavailableLegacySurface).not.toHaveBeenCalled();

    const closeButton = container.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-contextual-workbench-close"]'
    );
    expect(closeButton).not.toBeNull();

    await act(async () => {
      closeButton?.click();
    });

    await waitFor(() =>
      expect(container.querySelector('[data-slot="canvas-contextual-workbench"]')).toBeNull()
    );
  });

  it('routes a legacy Lineage intent through the existing Canvas lens command', async () => {
    const onToggleColumns = vi.fn();
    const onConsumed = vi.fn();

    await renderShell({
      chromeCommands: { onToggleColumns },
      routeIntentRequest: {
        intent: { kind: 'enable-lens', lensId: 'column-lineage' },
        onConsumed,
        onUnavailableLegacySurface: vi.fn(),
      },
    });

    expect(onToggleColumns).toHaveBeenCalledTimes(1);
    expect(onConsumed).toHaveBeenCalledTimes(1);
  });

  it('reports an unavailable legacy surface through the route-owned feedback command', async () => {
    const onUnavailableLegacySurface = vi.fn();
    const onConsumed = vi.fn();

    await renderShell({
      routeIntentRequest: {
        intent: { kind: 'unavailable-legacy-surface', surfaceId: 'diff' },
        onConsumed,
        onUnavailableLegacySurface,
      },
    });

    expect(onUnavailableLegacySurface).toHaveBeenCalledWith('diff');
    expect(onConsumed).toHaveBeenCalledTimes(1);
  });
});

function getViewportCommand(commandName: DialogViewportCommand): (() => void) | undefined {
  return shellState.canvasViewportProps?.[commandName] as (() => void) | undefined;
}
