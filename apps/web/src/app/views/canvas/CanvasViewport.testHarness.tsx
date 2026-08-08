import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { vi } from 'vitest';

import CanvasViewport from './CanvasViewport';
import { DEFAULT_CANVAS_PALETTE_ID, type CanvasPaletteId } from './canvasPalette';
import {
  getCanvasViewportRegistryMock as getRegistryMock,
  resetCanvasViewportNodeTypeRegistryTestAdapter,
} from './canvasViewportNodeTypeRegistryTestAdapter';
import {
  getCanvasViewportXyflowState as getXyflowState,
  resetCanvasViewportXyflowTestAdapter,
} from './canvasViewportXyflowTestAdapter';

export type CanvasViewportProps = React.ComponentProps<typeof CanvasViewport>;

export function getCanvasViewportRegistryMock(): ReturnType<typeof getRegistryMock> {
  return getRegistryMock();
}

export function getCanvasViewportXyflowState(): ReturnType<typeof getXyflowState> {
  return getXyflowState();
}

export function buildCanvasViewportProps(
  overrides?: Partial<CanvasViewportProps>
): CanvasViewportProps {
  return {
    canEditEdges: true,
    nodesWithImpact: [],
    edges: [],
    nodeTypes: {},
    gridSize: 24,
    canvasPalette: DEFAULT_CANVAS_PALETTE_ID as CanvasPaletteId,
    canvasGridVisible: true,
    canvasGridColor: '#94a3b8',
    canvasSnapToGrid: false,
    viewport: null,
    onNodesChange: vi.fn(),
    onNodeDrag: vi.fn(),
    onNodeDragStop: vi.fn(),
    onEdgesChange: vi.fn(),
    onConnect: vi.fn(),
    onReconnect: vi.fn(),
    onViewportChange: vi.fn(),
    onDrop: vi.fn(),
    onDragOver: vi.fn(),
    authoringNodeKinds: [],
    onCreateAuthoringNode: vi.fn(),
    importedNodeFocusIds: [],
    onImportedNodeFocusComplete: vi.fn(),
    canOpenCanvasSettings: false,
    onOpenCanvasSettings: vi.fn(),
    ...overrides,
  };
}

export function resetCanvasViewportHarnessState(): void {
  resetCanvasViewportXyflowTestAdapter();
  resetCanvasViewportNodeTypeRegistryTestAdapter();
}

export function createCanvasViewportHarness(): {
  container: HTMLDivElement;
  render: (props?: Partial<CanvasViewportProps>) => Promise<CanvasViewportProps>;
  unmount: () => void;
} {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  resetCanvasViewportHarnessState();

  return {
    container,
    render: async (props?: Partial<CanvasViewportProps>) => {
      const resolvedProps = buildCanvasViewportProps(props);
      await act(async () => {
        root.render(<CanvasViewport {...resolvedProps} />);
      });
      return resolvedProps;
    },
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
      vi.clearAllMocks();
    },
  };
}