import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { vi } from 'vitest';

import CanvasViewport from './CanvasViewport';
import { DEFAULT_CANVAS_PALETTE_ID, type CanvasPaletteId } from './canvasPalette';

const mockResolveNodeKindRegistration = vi.hoisted(() => vi.fn());
const xyflowState = vi.hoisted(() => ({
  miniMapNodeColor: null as null | ((node: { data?: unknown }) => string),
  miniMapMaskColor: null as null | string,
  miniMapMaskStrokeColor: null as null | string,
  miniMapClassName: null as null | string,
  lastReactFlowProps: null as null | Record<string, unknown>,
  setViewport: vi.fn(),
  fitView: vi.fn(),
  screenToFlowPosition: vi.fn(),
}));

type MockReactFlowProps = Readonly<{
  children: React.ReactNode;
}> &
  Record<string, unknown>;

type MockBackgroundProps = Readonly<{
  color?: string;
  gap: number;
}>;

type MockMiniMapProps = Readonly<{
  nodeColor: (node: { data?: unknown }) => string;
  pannable?: boolean;
  zoomable?: boolean;
  maskColor?: string;
  maskStrokeColor?: string;
  className?: string;
}>;

vi.mock('../../plugins/nodeTypeRegistry', () => ({
  resolveNodeKindRegistration: mockResolveNodeKindRegistration,
}));

vi.mock('@xyflow/react', () => {
  function MockReactFlow({ children, ...props }: MockReactFlowProps): JSX.Element {
    xyflowState.lastReactFlowProps = props;
    return <div data-testid="react-flow">{children}</div>;
  }

  function MockBackground({ color, gap }: MockBackgroundProps): JSX.Element {
    return (
      <div data-testid="background">
        color:{color ?? 'none'}|gap:{gap}
      </div>
    );
  }

  function MockControls(): JSX.Element {
    return <div data-testid="controls" />;
  }

  function MockMiniMap({
    nodeColor,
    pannable = false,
    zoomable = false,
    maskColor,
    maskStrokeColor,
    className,
  }: MockMiniMapProps): JSX.Element {
    xyflowState.miniMapNodeColor = nodeColor;
    xyflowState.miniMapMaskColor = maskColor ?? null;
    xyflowState.miniMapMaskStrokeColor = maskStrokeColor ?? null;
    xyflowState.miniMapClassName = className ?? null;
    return (
      <div
        data-testid="minimap"
        data-pannable={String(pannable)}
        data-zoomable={String(zoomable)}
      />
    );
  }

  return {
    ReactFlow: MockReactFlow,
    Background: MockBackground,
    Controls: MockControls,
    MiniMap: MockMiniMap,
    useReactFlow: () => ({
      setViewport: xyflowState.setViewport,
      fitView: xyflowState.fitView,
      screenToFlowPosition: xyflowState.screenToFlowPosition,
    }),
  };
});

export type CanvasViewportProps = React.ComponentProps<typeof CanvasViewport>;

export function getCanvasViewportRegistryMock(): typeof mockResolveNodeKindRegistration {
  return mockResolveNodeKindRegistration;
}

export function getCanvasViewportXyflowState(): typeof xyflowState {
  return xyflowState;
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
    onNodeClick: vi.fn(),
    onSelectionChange: vi.fn(),
    onViewportChange: vi.fn(),
    onDrop: vi.fn(),
    onDragOver: vi.fn(),
    authoringNodeKinds: [],
    onCreateAuthoringNode: vi.fn(),
    importedNodeFocusIds: [],
    onImportedNodeFocusComplete: vi.fn(),
    canPreviewExecutionPlan: false,
    onPreviewExecutionPlan: vi.fn(),
    canOpenProjectExplorer: false,
    onOpenProjectExplorer: vi.fn(),
    canOpenCanvasSettings: false,
    onOpenCanvasSettings: vi.fn(),
    ...overrides,
  };
}

export function resetCanvasViewportHarnessState(): void {
  xyflowState.miniMapNodeColor = null;
  xyflowState.miniMapMaskColor = null;
  xyflowState.miniMapMaskStrokeColor = null;
  xyflowState.miniMapClassName = null;
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
  mockResolveNodeKindRegistration.mockImplementation((kind: string) => ({
    minimapColor: kind === 'dbt:model' ? '#22c55e' : '#6b7280',
  }));
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
