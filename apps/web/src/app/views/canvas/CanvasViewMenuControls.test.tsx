// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CanvasViewMenuContributionRegistrar } from './CanvasViewMenuControls';
import { useCanvasViewMenuContributionStore } from './canvasViewMenuContributionStore';

describe('CanvasViewMenuContributionRegistrar', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    useCanvasViewMenuContributionStore.setState({ contribution: null });
  });

  afterEach(() => {
    act(() => root.unmount());
    useCanvasViewMenuContributionStore.setState({ contribution: null });
    container.remove();
    vi.clearAllMocks();
  });

  it('keeps one registered snapshot while parent callback identities change', async () => {
    const renderRegistrar = (onAutoLayout: () => void): React.ReactElement => (
      <CanvasViewMenuContributionRegistrar
        canEditEdges
        canUseCostOverlay={false}
        exclusiveOverlayMode="runtime"
        impactOverlayEnabled={false}
        columnLevelLineageEnabled={false}
        canvasGridVisible
        canvasGridColor="#7f8e8d"
        canvasSnapToGrid={false}
        canvasEmptyStateGuideVisible={false}
        onAutoLayout={onAutoLayout}
        onToggleCostOverlay={vi.fn()}
        onToggleImpact={vi.fn()}
        onToggleColumns={vi.fn()}
        onToggleGridVisible={vi.fn()}
        onGridColorChange={vi.fn()}
        onToggleSnapToGrid={vi.fn()}
        onSetCanvasEmptyStateGuideVisible={vi.fn()}
      />
    );

    const firstCommand = vi.fn();
    await act(async () => root.render(renderRegistrar(firstCommand)));
    const firstContribution = useCanvasViewMenuContributionStore.getState().contribution;

    const latestCommand = vi.fn();
    await act(async () => root.render(renderRegistrar(latestCommand)));
    const latestContribution = useCanvasViewMenuContributionStore.getState().contribution;

    expect(latestContribution).toBe(firstContribution);
    latestContribution?.onAutoLayout();
    expect(firstCommand).not.toHaveBeenCalled();
    expect(latestCommand).toHaveBeenCalledTimes(1);
  });
});
