// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
      true;
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('shows explicit transformation authoring mode summary', async () => {
    await act(async () => {
      root.render(
        <CanvasToolbar
          onOpenDataRegistry={vi.fn()}
          onAutoLayout={vi.fn()}
          onToggleCostOverlay={vi.fn()}
          onToggleImpact={vi.fn()}
          onToggleColumns={vi.fn()}
          onPlan={vi.fn()}
          onRun={vi.fn()}
          canStartRun={false}
          planStatusSummary="Preview required before running."
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

    expect(container.textContent).toContain('Mode: source -> sql_transform -> sink');
  });

  it('disables Plan button when transformation validation is invalid', async () => {
    await act(async () => {
      root.render(
        <CanvasToolbar
          onOpenDataRegistry={vi.fn()}
          onAutoLayout={vi.fn()}
          onToggleCostOverlay={vi.fn()}
          onToggleImpact={vi.fn()}
          onToggleColumns={vi.fn()}
          onPlan={vi.fn()}
          onRun={vi.fn()}
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

    const planButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Plan')
    );
    expect(planButton).not.toBeNull();
    expect(planButton?.getAttribute('disabled')).not.toBeNull();
    expect(container.textContent).toContain('Plan requires exactly 3 nodes: source, sql_transform, and sink.');
  });
});
