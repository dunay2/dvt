// @vitest-environment jsdom

/** Owned concern: prove Canvas viewport context-menu gestures as user-visible behavior. */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import CanvasViewport from './CanvasViewport';
import { DEFAULT_CANVAS_PALETTE_ID } from './canvasPalette';
import { buildTestNodeKind } from './canvasKindRegistration.testSupport';

const mockResolveNodeKindRegistration = vi.hoisted(() => vi.fn());
const xyflowState = vi.hoisted(() => ({
  lastReactFlowProps: null as null | Record<string, unknown>,
  setViewport: vi.fn(),
  fitView: vi.fn(),
  screenToFlowPosition: vi.fn(),
}));

type MockReactFlowProps = Readonly<{
  children: React.ReactNode;
}> &
  Record<string, unknown>;

vi.mock('../../plugins/nodeTypeRegistry', () => ({
  resolveNodeKindRegistration: mockResolveNodeKindRegistration,
}));

vi.mock('@xyflow/react', () => {
  function MockReactFlow({ children, ...props }: MockReactFlowProps): JSX.Element {
    xyflowState.lastReactFlowProps = props;
    return <div data-testid="react-flow">{children}</div>;
  }

  return {
    ReactFlow: MockReactFlow,
    Background: () => <div data-testid="background" />,
    Controls: () => <div data-testid="controls" />,
    MiniMap: () => <div data-testid="minimap" />,
    useReactFlow: () => ({
      setViewport: xyflowState.setViewport,
      fitView: xyflowState.fitView,
      screenToFlowPosition: xyflowState.screenToFlowPosition,
    }),
  };
});

function buildProps(
  overrides?: Partial<React.ComponentProps<typeof CanvasViewport>>
): React.ComponentProps<typeof CanvasViewport> {
  return {
    canEditEdges: true,
    nodesWithImpact: [],
    edges: [],
    nodeTypes: {},
    gridSize: 24,
    canvasPalette: DEFAULT_CANVAS_PALETTE_ID,
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
    onNodeClick: vi.fn(),
    onSelectionChange: vi.fn(),
    onViewportChange: vi.fn(),
    onDrop: vi.fn(),
    onDragOver: vi.fn(),
    authoringNodeKinds: [buildTestNodeKind('dvt:source', 'Source')],
    onCreateAuthoringNode: vi.fn(),
    importedNodeFocusIds: [],
    onImportedNodeFocusComplete: vi.fn(),
    canOpenProjectExplorer: true,
    onOpenProjectExplorer: vi.fn(),
    canPreviewExecutionPlan: true,
    onPreviewExecutionPlan: vi.fn(),
    canOpenCanvasSettings: true,
    onOpenCanvasSettings: vi.fn(),
    ...overrides,
  };
}

describe('CanvasViewport context menu gestures', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    xyflowState.lastReactFlowProps = null;
    xyflowState.setViewport.mockReset();
    xyflowState.fitView.mockReset();
    xyflowState.screenToFlowPosition.mockReset();
    xyflowState.setViewport.mockResolvedValue(undefined);
    xyflowState.fitView.mockResolvedValue(undefined);
    xyflowState.screenToFlowPosition.mockImplementation(({ x, y }: { x: number; y: number }) => ({
      x: x + 100,
      y: y - 40,
    }));
    mockResolveNodeKindRegistration.mockReturnValue({ minimapColor: '#6b7280' });
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-17T10:00:00.000Z'));
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('keeps the canvas menu open through a delayed pane-click echo from the same right-click', async () => {
    await act(async () => {
      root.render(<CanvasViewport {...buildProps()} />);
    });

    const paneContextMenu = xyflowState.lastReactFlowProps?.onPaneContextMenu as
      | ((event: React.MouseEvent<Element>) => void)
      | undefined;
    const paneClick = xyflowState.lastReactFlowProps?.onPaneClick as
      | ((event: React.MouseEvent<Element>) => void)
      | undefined;

    await act(async () => {
      paneContextMenu?.({
        preventDefault: vi.fn(),
        clientX: 480,
        clientY: 320,
      } as unknown as React.MouseEvent<Element>);
    });

    expect(container.querySelector('[data-slot="canvas-context-menu"]')).not.toBeNull();

    vi.advanceTimersByTime(1_000);

    await act(async () => {
      paneClick?.({
        button: 0,
        clientX: 480,
        clientY: 320,
      } as React.MouseEvent<Element>);
    });

    expect(container.querySelector('[data-slot="canvas-context-menu"]')).not.toBeNull();
  });

  it('closes the canvas menu when the user left-clicks a different pane point', async () => {
    await act(async () => {
      root.render(<CanvasViewport {...buildProps()} />);
    });

    const paneContextMenu = xyflowState.lastReactFlowProps?.onPaneContextMenu as
      | ((event: React.MouseEvent<Element>) => void)
      | undefined;
    const paneClick = xyflowState.lastReactFlowProps?.onPaneClick as
      | ((event: React.MouseEvent<Element>) => void)
      | undefined;

    await act(async () => {
      paneContextMenu?.({
        preventDefault: vi.fn(),
        clientX: 480,
        clientY: 320,
      } as unknown as React.MouseEvent<Element>);
    });

    vi.advanceTimersByTime(1_000);

    await act(async () => {
      paneClick?.({
        button: 0,
        clientX: 640,
        clientY: 360,
      } as React.MouseEvent<Element>);
    });

    expect(container.querySelector('[data-slot="canvas-context-menu"]')).toBeNull();
  });
});
