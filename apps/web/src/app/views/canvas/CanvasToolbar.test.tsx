// @vitest-environment jsdom

/** Owned concern: prove Canvas toolbar command wiring and passive control behavior. */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import CanvasToolbar from './CanvasToolbar';
import { canvasViewCopy } from './copy';
import type { CanvasDraftToolbarState } from './canvasDraftToolbarState';
import type { TransformationGraphValidationResult } from './transformationGraphValidation';

function buildToolbarProps(
  overrides?: Partial<React.ComponentProps<typeof CanvasToolbar>>
): React.ComponentProps<typeof CanvasToolbar> {
  return {
    placement: 'top-bar',
    onAutoLayout: vi.fn(),
    onToggleCostOverlay: vi.fn(),
    onToggleImpact: vi.fn(),
    onToggleColumns: vi.fn(),
    onToggleGridVisible: vi.fn(),
    onGridColorChange: vi.fn(),
    onToggleSnapToGrid: vi.fn(),
    onReloadLatestDraft: vi.fn(),
    onExportProjectSnapshot: vi.fn(),
    onImportProjectSnapshotFile: vi.fn(),
    onPlan: vi.fn(),
    onRun: vi.fn(),
    routeState: 'ready',
    draftToolbarState: {
      label: canvasViewCopy.draftSyncedLabel,
      tone: 'neutral',
      showReloadAction: false,
    },
    canPlan: true,
    canRun: true,
    canEditEdges: true,
    canExportProjectSnapshot: true,
    canImportProjectSnapshot: true,
    canStartRun: false,
    planStatusSummary: canvasViewCopy.planStatusPreviewRequiredMessage,
    canvasAuthoringMode: 'transformation',
    exclusiveOverlayMode: 'runtime',
    canUseCostOverlay: true,
    impactOverlayEnabled: false,
    columnLevelLineageEnabled: false,
    canvasGridVisible: true,
    canvasGridColor: '#94a3b8',
    canvasSnapToGrid: false,
    transformationValidation: buildValidationResult(),
    nodeCount: 3,
    edgeCount: 2,
    ...overrides,
  };
}

function buildValidationResult(
  overrides?: Partial<TransformationGraphValidationResult>
): TransformationGraphValidationResult {
  return {
    valid: true,
    summaryCode: 'valid',
    draftSignature: 'nodes:src,tx,sink|edges:e1,e2',
    scopedNodeIds: ['src', 'tx', 'sink'],
    scopedEdgeIds: ['e1', 'e2'],
    nodeRolesById: {
      src: 'source',
      tx: 'sql_transform',
      sink: 'sink',
    },
    ...overrides,
  };
}

describe('CanvasToolbar', () => {
  let container: HTMLDivElement;
  let portalHost: HTMLDivElement;
  let root: Root;
  const defaultDraftToolbarState: CanvasDraftToolbarState = {
    label: canvasViewCopy.draftSyncedLabel,
    tone: 'neutral',
    showReloadAction: false,
  };

  beforeEach(() => {
    portalHost = document.createElement('div');
    portalHost.id = 'shell-top-bar-canvas-controls';
    document.body.appendChild(portalHost);
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
    portalHost.remove();
    container.remove();
  });

  it('renders one workflow status and core actions in top-bar mode', async () => {
    await act(async () => {
      root.render(
        <CanvasToolbar
          {...buildToolbarProps({
            draftToolbarState: defaultDraftToolbarState,
          })}
        />
      );
    });

    expect(portalHost.querySelectorAll('[data-slot="canvas-workflow-status"]')).toHaveLength(1);
    expect(portalHost.textContent).toContain(canvasViewCopy.toolbarWorkflowPlanRequiredLabel);
    expect(portalHost.textContent).toContain(canvasViewCopy.toolbarLayoutLabel);
    expect(portalHost.textContent).toContain(canvasViewCopy.toolbarImpactLabel);
    expect(portalHost.textContent).toContain(canvasViewCopy.toolbarColumnsLabel);
    expect(portalHost.textContent).toContain(canvasViewCopy.toolbarCostLabel);
    expect(portalHost.textContent).toContain(canvasViewCopy.toolbarGridLabel);
    expect(portalHost.textContent).toContain(canvasViewCopy.toolbarSnapToGridLabel);
    expect(portalHost.textContent).toContain(canvasViewCopy.toolbarPlanLabel);
    expect(portalHost.textContent).toContain(canvasViewCopy.toolbarRunLabel);
    expect(portalHost.textContent).toContain(canvasViewCopy.draftSyncedLabel);
  });

  it('applies canvas grid preference commands from the toolbar', async () => {
    const onToggleGridVisible = vi.fn();
    const onGridColorChange = vi.fn();
    const onToggleSnapToGrid = vi.fn();

    await act(async () => {
      root.render(
        <CanvasToolbar
          {...buildToolbarProps({
            onToggleGridVisible,
            onGridColorChange,
            onToggleSnapToGrid,
            canvasGridVisible: false,
            canvasGridColor: '#f97316',
            canvasSnapToGrid: true,
          })}
        />
      );
    });

    const gridButton = Array.from(portalHost.querySelectorAll('button')).find(
      (button) => button.ariaLabel === canvasViewCopy.toolbarGridLabel
    );
    const snapButton = Array.from(portalHost.querySelectorAll('button')).find(
      (button) => button.ariaLabel === canvasViewCopy.toolbarSnapToGridLabel
    );
    const colorInput = portalHost.querySelector(
      `input[aria-label="${canvasViewCopy.toolbarGridColorLabel}"]`
    ) as HTMLInputElement | null;

    expect(gridButton).not.toBeNull();
    expect(snapButton).not.toBeNull();
    expect(colorInput?.value).toBe('#f97316');

    await act(async () => {
      gridButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      snapButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      if (colorInput != null) {
        colorInput.value = '#22c55e';
      }
      colorInput?.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(onToggleGridVisible).toHaveBeenCalledTimes(1);
    expect(onToggleSnapToGrid).toHaveBeenCalledTimes(1);
    expect(onGridColorChange).toHaveBeenCalledWith('#22c55e');
  });

  it('exposes project snapshot export and import commands without adding manual Save', async () => {
    const onExportProjectSnapshot = vi.fn();
    const onImportProjectSnapshotFile = vi.fn();

    await act(async () => {
      root.render(
        <CanvasToolbar
          {...buildToolbarProps({
            draftToolbarState: defaultDraftToolbarState,
            onExportProjectSnapshot,
            onImportProjectSnapshotFile,
          })}
        />
      );
    });

    const buttons = Array.from(portalHost.querySelectorAll('button'));
    const exportButton = buttons.find((button) =>
      button.textContent?.includes(canvasViewCopy.toolbarExportSnapshotLabel)
    );
    const importButton = buttons.find((button) =>
      button.textContent?.includes(canvasViewCopy.toolbarImportSnapshotLabel)
    );

    expect(exportButton).toBeDefined();
    expect(importButton).toBeDefined();
    expect(portalHost.textContent).not.toContain('Save');

    await act(async () => {
      exportButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      importButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onExportProjectSnapshot).toHaveBeenCalledTimes(1);
    expect(onImportProjectSnapshotFile).not.toHaveBeenCalled();
    expect(portalHost.querySelector('input[type="file"]')).not.toBeNull();
  });

  it('keeps plan button disabled when transformation validation is invalid', async () => {
    await act(async () => {
      root.render(
        <CanvasToolbar
          {...buildToolbarProps({
            draftToolbarState: defaultDraftToolbarState,
            canUseCostOverlay: false,
            transformationValidation: buildValidationResult({
              valid: false,
              summaryCode: 'requires_three_nodes',
            }),
            nodeCount: 2,
            edgeCount: 1,
          })}
        />
      );
    });

    const planButton = Array.from(portalHost.querySelectorAll('button')).find((button) =>
      button.textContent?.includes(canvasViewCopy.toolbarPlanLabel)
    );
    expect(planButton?.getAttribute('disabled')).not.toBeNull();
    expect(portalHost.textContent).toContain(canvasViewCopy.toolbarWorkflowPlanRequiredLabel);
  });

  it('shows run ready when execution can start', async () => {
    await act(async () => {
      root.render(
        <CanvasToolbar
          {...buildToolbarProps({
            draftToolbarState: defaultDraftToolbarState,
            canStartRun: true,
            planStatusSummary: canvasViewCopy.planStatusPreviewReadyMessage,
            canUseCostOverlay: false,
          })}
        />
      );
    });

    expect(portalHost.textContent).toContain(canvasViewCopy.toolbarWorkflowRunReadyLabel);
  });

  it('shows read only and disables actions when plan and run are unavailable', async () => {
    await act(async () => {
      root.render(
        <CanvasToolbar
          {...buildToolbarProps({
            draftToolbarState: defaultDraftToolbarState,
            canPlan: false,
            canRun: false,
            canEditEdges: false,
            planStatusSummary: canvasViewCopy.planStatusRunUnavailableMessage,
            canUseCostOverlay: false,
          })}
        />
      );
    });

    const buttons = Array.from(portalHost.querySelectorAll('button'));
    const layoutButton = buttons.find((button) =>
      button.textContent?.includes(canvasViewCopy.toolbarLayoutLabel)
    );
    const planButton = buttons.find((button) =>
      button.textContent?.includes(canvasViewCopy.toolbarPlanLabel)
    );
    const runButton = buttons.find((button) =>
      button.textContent?.includes(canvasViewCopy.toolbarRunLabel)
    );

    expect(portalHost.textContent).toContain(canvasViewCopy.toolbarWorkflowReadOnlyLabel);
    expect(layoutButton?.getAttribute('disabled')).not.toBeNull();
    expect(planButton?.getAttribute('disabled')).not.toBeNull();
    expect(runButton?.getAttribute('disabled')).not.toBeNull();
  });

  it('shows recovery draft status and exposes reload action when recovery is active', async () => {
    const onReloadLatestDraft = vi.fn();

    await act(async () => {
      root.render(
        <CanvasToolbar
          {...buildToolbarProps({
            onReloadLatestDraft,
            routeState: 'recovery',
            draftToolbarState: {
              label: canvasViewCopy.draftMissingLabel,
              tone: 'warning',
              showReloadAction: true,
            },
            canPlan: false,
            canRun: false,
            canEditEdges: false,
            planStatusSummary: canvasViewCopy.planStatusRunUnavailableMessage,
            canUseCostOverlay: false,
          })}
        />
      );
    });

    expect(portalHost.textContent).toContain(canvasViewCopy.toolbarWorkflowRecoveryLabel);
    expect(portalHost.textContent).toContain(canvasViewCopy.draftMissingLabel);
    const reloadButton = Array.from(portalHost.querySelectorAll('button')).find((button) =>
      button.textContent?.includes(canvasViewCopy.reloadLatestDraftLabel)
    );
    expect(reloadButton).not.toBeNull();

    await act(async () => {
      reloadButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onReloadLatestDraft).toHaveBeenCalledTimes(1);
  });

  it('keeps workflow posture out of recovery when reload remains available on a blocked route', async () => {
    await act(async () => {
      root.render(
        <CanvasToolbar
          {...buildToolbarProps({
            routeState: 'blocked_backend',
            draftToolbarState: {
              label: canvasViewCopy.draftMissingLabel,
              tone: 'warning',
              showReloadAction: true,
            },
            canPlan: false,
            canRun: false,
            canEditEdges: false,
            planStatusSummary: canvasViewCopy.planStatusRunUnavailableMessage,
            canUseCostOverlay: false,
          })}
        />
      );
    });

    expect(portalHost.textContent).toContain(canvasViewCopy.toolbarWorkflowReadOnlyLabel);
    expect(portalHost.textContent).not.toContain(canvasViewCopy.toolbarWorkflowRecoveryLabel);
    expect(portalHost.textContent).toContain(canvasViewCopy.reloadLatestDraftLabel);
  });
});
