// @vitest-environment jsdom

/** Owned concern: prove CanvasShell contextual dialogs without source-import contract noise. */
import { DbtProjectImportResultSchema } from '@dvt/contracts';
import { act } from 'react';
import { fireEvent } from '@testing-library/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createCanvasShellHarness,
  getCanvasShellState,
  type CanvasShellPropsOverrides,
} from './CanvasShell.testHarness';
import { useCanvasWorkspaceMenuContributionStore } from './canvasWorkspaceMenuContributionStore';
import type { CanvasShellProps } from './canvasShell.types';
import type { ImportSourcesResult } from '../../ports/workspace';
import { buildGraphDraftSourceImportResult } from '../../../testing/sourceImportTestFixtures';

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
    vi.unstubAllGlobals();
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
    expect(settingsDialog?.textContent).toContain('Canvas properties');

    const gridTab = Array.from(
      settingsDialog?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? []
    ).find((tab) => tab.textContent === 'Grid');
    expect(gridTab).toBeDefined();

    await act(async () => {
      fireEvent.mouseDown(gridTab!, { button: 0, ctrlKey: false });
    });

    const gridSwitch = settingsDialog?.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-properties-grid-visible"]'
    );
    const snapSwitch = settingsDialog?.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-properties-snap"]'
    );
    expect(gridSwitch).not.toBeNull();
    expect(snapSwitch).not.toBeNull();

    await act(async () => {
      gridSwitch?.click();
      snapSwitch?.click();
    });

    expect(onToggleGridVisible).not.toHaveBeenCalled();
    expect(onToggleSnapToGrid).not.toHaveBeenCalled();

    await act(async () => {
      settingsDialog
        ?.querySelector<HTMLButtonElement>('[data-slot="workbench-properties-apply"]')
        ?.click();
    });

    expect(onToggleGridVisible).toHaveBeenCalledTimes(1);
    expect(onToggleSnapToGrid).toHaveBeenCalledTimes(1);
  });

  it('opens Code and dbt import before the first Canvas without creating a document', async () => {
    // Moving import out of File must not strand a new project with no Canvas owner.
    const props = await renderShell({
      panels: {
        activeCanvasId: null,
        activeCanvas: null,
        canvasDocuments: [],
        inspectorAuthoring: {
          canEditNode: true,
          onApplyNodeDraft: vi.fn(),
          workspaceScope: {
            tenantId: 'tenant',
            projectId: 'project',
            environmentId: 'dev',
            targetAdapter: 'temporal',
          },
        },
      },
      layout: { surfaceStrategy: undefined, centerSurface: <div>Start Canvas</div> },
      onDbtProjectImported: vi.fn(),
    });
    await act(async () => {
      useCanvasWorkspaceMenuContributionStore.getState().contribution?.onOpenProjectCode?.();
    });
    const importButton = container.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-workspace-import-dbt-project-command"]'
    );
    expect(importButton).not.toBeNull();
    await act(async () => {
      importButton?.click();
    });
    expect(shellState.dbtProjectImportDialogProps).toMatchObject({ open: true });
    expect(props.graphCommands.onCreateAuthoringNode).not.toHaveBeenCalled();
    expect(props.canvasCommands.onSelectCanvas).not.toHaveBeenCalled();
  });

  it('does not publish Code admission without a Canvas or workspace scope', async () => {
    await renderShell({
      panels: { activeCanvasId: null, activeCanvas: null, canvasDocuments: [] },
      layout: { surfaceStrategy: undefined },
    });
    expect(
      useCanvasWorkspaceMenuContributionStore.getState().contribution?.canOpenProjectCode
    ).toBe(false);
    expect(
      container.querySelector('[data-slot="canvas-workspace-import-dbt-project-command"]')
    ).toBeNull();
  });

  it('restores import focus to the durable Code rail after its authority changes', async () => {
    // The import receipt can replace the Code tree; its old button is then no longer an opener.
    // jsdom has no layout observer; the real rail Tooltip still mounts during focus restoration.
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      }
    );
    await renderShell({ onDbtProjectImported: vi.fn() });
    await act(async () => {
      useCanvasWorkspaceMenuContributionStore.getState().contribution?.onOpenProjectCode?.();
    });
    expect(
      container.querySelector('[data-slot="canvas-workspace-import-dbt-project-command"]')
    ).not.toBeNull();
    const restoreFocus = shellState.dbtProjectImportDialogProps?.onRestoreFocus as () => void;
    await renderShell({ panels: { activeCanvasId: 'imported-canvas' } });
    expect(
      container.querySelector('[data-slot="canvas-workspace-import-dbt-project-command"]')
    ).toBeNull();
    await act(async () => {
      restoreFocus();
    });
    expect(document.activeElement).toBe(
      container.querySelector('[data-slot="shell-project-code-command"]')
    );
  });

  it('imports a dbt project from Code and delegates navigation from the server receipt', async () => {
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
      useCanvasWorkspaceMenuContributionStore.getState().contribution?.onOpenProjectCode?.();
    });
    await act(async () => {
      container
        .querySelector<HTMLButtonElement>(
          '[data-slot="canvas-workspace-import-dbt-project-command"]'
        )
        ?.click();
    });

    expect(shellState.dbtProjectImportDialogProps).toMatchObject({ open: true });
    expect(container.querySelector('[data-testid="dbt-project-import-dialog"]')).not.toBeNull();

    const sourceTableDeclarations = [
      {
        uniqueId: 'source.analytics.raw.orders',
        filePath: 'models/sources.yml',
        sourceName: 'raw',
        tableName: 'orders',
        database: 'RAW',
        schema: 'ERP',
        identifier: 'ORDERS',
      },
    ] as const;
    await act(async () => {
      const onImported = shellState.dbtProjectImportDialogProps?.onImported as
        | ((receipt: typeof result, declarations: typeof sourceTableDeclarations) => void)
        | undefined;
      onImported?.(result, sourceTableDeclarations);
    });

    expect(onDbtProjectImported).toHaveBeenCalledWith(result, sourceTableDeclarations);
    expect(shellState.dbtProjectImportDialogProps).toMatchObject({ open: false });
    expect(shellState.sourceImportWizardProps).toBeNull();
  });

  it('retains a dbt source-binding continuation until a successful source import', async () => {
    const onConsumed = vi.fn();
    const sourceTableDeclarations = [
      {
        uniqueId: 'source.analytics.raw.orders',
        filePath: 'models/sources.yml',
        sourceName: 'raw',
        tableName: 'orders',
        database: 'RAW',
        schema: 'ERP',
        identifier: 'ORDERS',
      },
    ] as const;

    await renderShell({
      sourceImportInitialSelection: {
        kind: 'dbt-source-binding',
        sourceTableDeclarations,
      },
      onSourceImportInitialSelectionConsumed: onConsumed,
    });

    expect(shellState.sourceImportWizardProps).toMatchObject({
      open: true,
      entry: {
        intent: 'import-sources',
        initialSelection: {
          kind: 'dbt-source-binding',
          sourceTableDeclarations,
        },
      },
    });
    expect(onConsumed).not.toHaveBeenCalled();

    await act(async () => {
      const close = shellState.sourceImportWizardProps?.onClose as (() => void) | undefined;
      close?.();
    });
    expect(shellState.sourceImportWizardProps).toBeNull();
    expect(onConsumed).not.toHaveBeenCalled();

    await act(async () => {
      const reopen = shellState.canvasViewportProps?.onOpenSourceImport as (() => void) | undefined;
      reopen?.();
    });
    expect(shellState.sourceImportWizardProps).toMatchObject({
      open: true,
      entry: {
        intent: 'import-sources',
        initialSelection: {
          kind: 'dbt-source-binding',
          sourceTableDeclarations,
        },
      },
    });

    await act(async () => {
      const complete = shellState.sourceImportWizardProps?.onComplete as
        ((result: ImportSourcesResult) => void) | undefined;
      complete?.(buildGraphDraftSourceImportResult());
    });
    expect(onConsumed).toHaveBeenCalledTimes(1);
  });
});

function getViewportCommand(commandName: DialogViewportCommand): (() => void) | undefined {
  return shellState.canvasViewportProps?.[commandName] as (() => void) | undefined;
}
