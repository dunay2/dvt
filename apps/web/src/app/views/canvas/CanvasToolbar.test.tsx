// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CanvasDraftToolbarState } from './canvasDraftPresentationState';
import CanvasToolbar from './CanvasToolbar';
import type { TransformationGraphValidationResult } from './transformationGraphValidation';

function buildValidationResult(
  overrides?: Partial<TransformationGraphValidationResult>
): TransformationGraphValidationResult {
  return {
    valid: true,
    summary: 'Transformation draft is valid for preview.',
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
    label: 'Draft synced',
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
          placement="top-bar"
          onAutoLayout={vi.fn()}
          onToggleCostOverlay={vi.fn()}
          onToggleImpact={vi.fn()}
          onToggleColumns={vi.fn()}
          onReloadLatestDraft={vi.fn()}
          onPlan={vi.fn()}
          onRun={vi.fn()}
          draftToolbarState={defaultDraftToolbarState}
          canPlan={true}
          canRun={true}
          canEditEdges={true}
          canStartRun={false}
          planStatusSummary="Preview required before running."
          canvasAuthoringMode="transformation"
          exclusiveOverlayMode="runtime"
          canUseCostOverlay={true}
          impactOverlayEnabled={false}
          columnLevelLineageEnabled={false}
          transformationValidation={buildValidationResult()}
          nodeCount={3}
          edgeCount={2}
        />
      );
    });

    expect(portalHost.querySelectorAll('[data-slot="canvas-workflow-status"]')).toHaveLength(1);
    expect(portalHost.textContent).toContain('Plan required');
    expect(portalHost.textContent).toContain('Layout');
    expect(portalHost.textContent).toContain('Impact');
    expect(portalHost.textContent).toContain('Columns');
    expect(portalHost.textContent).toContain('Cost');
    expect(portalHost.textContent).toContain('Plan');
    expect(portalHost.textContent).toContain('Run');
    expect(portalHost.textContent).toContain('Draft synced');
  });

  it('keeps plan button disabled when transformation validation is invalid', async () => {
    await act(async () => {
      root.render(
        <CanvasToolbar
          placement="top-bar"
          onAutoLayout={vi.fn()}
          onToggleCostOverlay={vi.fn()}
          onToggleImpact={vi.fn()}
          onToggleColumns={vi.fn()}
          onReloadLatestDraft={vi.fn()}
          onPlan={vi.fn()}
          onRun={vi.fn()}
          draftToolbarState={defaultDraftToolbarState}
          canPlan={true}
          canRun={true}
          canEditEdges={true}
          canStartRun={false}
          planStatusSummary="Preview required before running."
          canvasAuthoringMode="transformation"
          exclusiveOverlayMode="runtime"
          canUseCostOverlay={false}
          impactOverlayEnabled={false}
          columnLevelLineageEnabled={false}
          transformationValidation={buildValidationResult({
            valid: false,
            summary: 'Plan requires exactly 3 nodes: source, sql_transform, and sink.',
          })}
          nodeCount={2}
          edgeCount={1}
        />
      );
    });

    const planButton = Array.from(portalHost.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Plan')
    );
    expect(planButton?.getAttribute('disabled')).not.toBeNull();
    expect(portalHost.textContent).toContain('Plan required');
  });

  it('shows run ready when execution can start', async () => {
    await act(async () => {
      root.render(
        <CanvasToolbar
          placement="top-bar"
          onAutoLayout={vi.fn()}
          onToggleCostOverlay={vi.fn()}
          onToggleImpact={vi.fn()}
          onToggleColumns={vi.fn()}
          onReloadLatestDraft={vi.fn()}
          onPlan={vi.fn()}
          onRun={vi.fn()}
          draftToolbarState={defaultDraftToolbarState}
          canPlan={true}
          canRun={true}
          canEditEdges={true}
          canStartRun={true}
          planStatusSummary="Transformation draft is ready to run."
          canvasAuthoringMode="transformation"
          exclusiveOverlayMode="runtime"
          canUseCostOverlay={false}
          impactOverlayEnabled={false}
          columnLevelLineageEnabled={false}
          transformationValidation={buildValidationResult()}
          nodeCount={3}
          edgeCount={2}
        />
      );
    });

    expect(portalHost.textContent).toContain('Run ready');
  });

  it('shows read only and disables actions when plan and run are unavailable', async () => {
    await act(async () => {
      root.render(
        <CanvasToolbar
          placement="top-bar"
          onAutoLayout={vi.fn()}
          onToggleCostOverlay={vi.fn()}
          onToggleImpact={vi.fn()}
          onToggleColumns={vi.fn()}
          onReloadLatestDraft={vi.fn()}
          onPlan={vi.fn()}
          onRun={vi.fn()}
          draftToolbarState={defaultDraftToolbarState}
          canPlan={false}
          canRun={false}
          canEditEdges={false}
          canStartRun={false}
          planStatusSummary="Run start is unavailable in this context."
          canvasAuthoringMode="transformation"
          exclusiveOverlayMode="runtime"
          canUseCostOverlay={false}
          impactOverlayEnabled={false}
          columnLevelLineageEnabled={false}
          transformationValidation={buildValidationResult()}
          nodeCount={3}
          edgeCount={2}
        />
      );
    });

    const buttons = Array.from(portalHost.querySelectorAll('button'));
    const layoutButton = buttons.find((button) => button.textContent?.includes('Layout'));
    const planButton = buttons.find((button) => button.textContent?.includes('Plan'));
    const runButton = buttons.find((button) => button.textContent?.includes('Run'));

    expect(portalHost.textContent).toContain('Read only');
    expect(layoutButton?.getAttribute('disabled')).not.toBeNull();
    expect(planButton?.getAttribute('disabled')).not.toBeNull();
    expect(runButton?.getAttribute('disabled')).not.toBeNull();
  });

  it('shows recovery draft status and exposes reload action when recovery is active', async () => {
    const onReloadLatestDraft = vi.fn();

    await act(async () => {
      root.render(
        <CanvasToolbar
          placement="top-bar"
          onAutoLayout={vi.fn()}
          onToggleCostOverlay={vi.fn()}
          onToggleImpact={vi.fn()}
          onToggleColumns={vi.fn()}
          onReloadLatestDraft={onReloadLatestDraft}
          onPlan={vi.fn()}
          onRun={vi.fn()}
          draftToolbarState={{
            label: 'Draft missing',
            tone: 'warning',
            showReloadAction: true,
          }}
          canPlan={false}
          canRun={false}
          canEditEdges={false}
          canStartRun={false}
          planStatusSummary="Run start is unavailable in this context."
          canvasAuthoringMode="transformation"
          exclusiveOverlayMode="runtime"
          canUseCostOverlay={false}
          impactOverlayEnabled={false}
          columnLevelLineageEnabled={false}
          transformationValidation={buildValidationResult()}
          nodeCount={3}
          edgeCount={2}
        />
      );
    });

    expect(portalHost.textContent).toContain('Recovery');
    expect(portalHost.textContent).toContain('Draft missing');
    const reloadButton = Array.from(portalHost.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Reload draft')
    );
    expect(reloadButton).not.toBeNull();

    await act(async () => {
      reloadButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onReloadLatestDraft).toHaveBeenCalledTimes(1);
  });
});
