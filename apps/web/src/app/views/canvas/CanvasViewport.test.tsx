// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import CanvasViewport from './CanvasViewport';
import {
  DEFAULT_CANVAS_PALETTE_ID,
  deriveCanvasPaletteTokens,
  normalizeCanvasPaletteId,
} from './canvasPalette';

const mockResolveNodeKindRegistration = vi.hoisted(() => vi.fn());
const xyflowState = vi.hoisted(() => ({
  miniMapNodeColor: null as null | ((node: { data?: unknown }) => string),
  miniMapMaskColor: null as null | string,
  miniMapMaskStrokeColor: null as null | string,
  miniMapClassName: null as null | string,
  lastReactFlowProps: null as null | Record<string, unknown>,
  setViewport: vi.fn(),
  fitView: vi.fn(),
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
    }),
  };
});

function buildProps(
  overrides?: Partial<React.ComponentProps<typeof CanvasViewport>>
): React.ComponentProps<typeof CanvasViewport> {
  return {
    focusMode: false,
    explorerPanelVisible: true,
    inspectorPanelVisible: true,
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
    importedNodeFocusIds: [],
    onImportedNodeFocusComplete: vi.fn(),
    onShowExplorer: vi.fn(),
    onShowInspector: vi.fn(),
    ...overrides,
  };
}

function requireButton(value: HTMLButtonElement | undefined, errorCode: string): HTMLButtonElement {
  if (value === undefined) {
    throw new Error(errorCode);
  }

  return value;
}

describe('CanvasViewport', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    xyflowState.miniMapNodeColor = null;
    xyflowState.miniMapMaskColor = null;
    xyflowState.miniMapMaskStrokeColor = null;
    xyflowState.miniMapClassName = null;
    xyflowState.lastReactFlowProps = null;
    xyflowState.setViewport.mockReset();
    xyflowState.fitView.mockReset();
    xyflowState.setViewport.mockResolvedValue(undefined);
    xyflowState.fitView.mockResolvedValue(undefined);
    mockResolveNodeKindRegistration.mockImplementation((kind: string) => ({
      minimapColor: kind === 'dbt:model' ? '#22c55e' : '#6b7280',
    }));
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  it('shows panel restore buttons only when the corresponding panels are hidden outside focus mode', async () => {
    const props = buildProps({
      explorerPanelVisible: false,
      inspectorPanelVisible: false,
    });

    await act(async () => {
      root.render(<CanvasViewport {...props} />);
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    expect(buttons).toHaveLength(2);

    const showExplorerButton = requireButton(
      buttons.find((button) => button.ariaLabel === 'Show explorer panel'),
      'EXPECTED_SHOW_EXPLORER_BUTTON'
    );
    const showInspectorButton = requireButton(
      buttons.find((button) => button.ariaLabel === 'Show inspector panel'),
      'EXPECTED_SHOW_INSPECTOR_BUTTON'
    );

    showExplorerButton.click();
    showInspectorButton.click();

    expect(props.onShowExplorer).toHaveBeenCalledTimes(1);
    expect(props.onShowInspector).toHaveBeenCalledTimes(1);
  });

  it('hides restore buttons in focus mode and resolves minimap color from node registry', async () => {
    const requestedCanvasPalette = '#152033';
    const normalizedCanvasPalette = normalizeCanvasPaletteId(requestedCanvasPalette);
    const expectedPaletteTokens = deriveCanvasPaletteTokens(normalizedCanvasPalette);

    await act(async () => {
      root.render(
        <CanvasViewport
          {...buildProps({
            focusMode: true,
            explorerPanelVisible: false,
            inspectorPanelVisible: false,
            gridSize: 32,
            canvasPalette: requestedCanvasPalette,
          })}
        />
      );
    });

    const viewport = container.querySelector('[data-testid="canvas-viewport"]');
    const viewportStyle = (viewport as HTMLDivElement).style;
    const viewportDataset = (viewport as HTMLDivElement | null)?.dataset;

    expect(container.querySelectorAll('button')).toHaveLength(0);
    expect(viewportDataset?.canvasPalette).toBe(normalizedCanvasPalette);
    expect(viewportStyle.getPropertyValue('--canvas-surface')).toBe(expectedPaletteTokens.surface);
    expect(viewportStyle.getPropertyValue('--canvas-grid')).toBe(expectedPaletteTokens.grid);
    expect(viewportStyle.getPropertyValue('--canvas-grid-gap')).toBe('32px');
    expect(xyflowState.miniMapNodeColor).toBeTypeOf('function');
    expect(xyflowState.miniMapNodeColor?.({ data: { pluginKind: 'dbt:model' } })).toBe('#22c55e');
    expect(xyflowState.miniMapNodeColor?.({ data: {} })).toBe('#6b7280');
    expect(mockResolveNodeKindRegistration).toHaveBeenCalledWith('dbt:model');
    expect(mockResolveNodeKindRegistration).toHaveBeenCalledWith('dvt:unknown');
    expect(xyflowState.lastReactFlowProps).toMatchObject({
      fitView: true,
      fitViewOptions: { padding: 0.2, maxZoom: 0.82 },
      minZoom: 0.35,
      className: 'bg-(--canvas-surface)',
      nodesDraggable: true,
      nodesConnectable: true,
      snapToGrid: false,
      snapGrid: [32, 32],
    });
    expect(container.querySelector('[data-testid="background"]')?.textContent).toBe(
      'color:#94a3b8|gap:32'
    );
    expect(xyflowState.miniMapMaskColor).toBe('var(--canvas-minimap-mask)');
    expect(xyflowState.miniMapMaskStrokeColor).toBe('var(--canvas-minimap-mask-stroke)');
    expect(xyflowState.miniMapClassName).toBe('rounded-lg');
    const minimapDataset = (
      container.querySelector('[data-testid="minimap"]') as HTMLDivElement | null
    )?.dataset;
    expect(minimapDataset?.pannable).toBe('true');
    expect(minimapDataset?.zoomable).toBe('true');
  });

  it('restores a persisted viewport instead of forcing fitView', async () => {
    await act(async () => {
      root.render(
        <CanvasViewport
          {...buildProps({
            viewport: { x: 120, y: 48, zoom: 0.68 },
          })}
        />
      );
    });

    expect(xyflowState.lastReactFlowProps).toMatchObject({
      fitView: false,
      defaultViewport: { x: 120, y: 48, zoom: 0.68 },
    });
    expect(xyflowState.setViewport).toHaveBeenCalledWith(
      { x: 120, y: 48, zoom: 0.68 },
      { duration: 0 }
    );
  });

  it('disables graph mutation, selection, and keyboard shortcuts when graph edits are gated', async () => {
    await act(async () => {
      root.render(
        <CanvasViewport
          {...buildProps({
            canEditEdges: false,
          })}
        />
      );
    });

    expect(xyflowState.lastReactFlowProps).toMatchObject({
      nodesDraggable: false,
      nodesConnectable: false,
      nodesFocusable: false,
      edgesFocusable: false,
      elementsSelectable: false,
      deleteKeyCode: null,
      disableKeyboardA11y: true,
      onNodesChange: undefined,
      onEdgesChange: undefined,
      onReconnect: undefined,
      edgesReconnectable: false,
    });
  });

  it('preserves the governed Shift multi-selection gesture for canvas node selection', async () => {
    await act(async () => {
      root.render(<CanvasViewport {...buildProps()} />);
    });

    expect(xyflowState.lastReactFlowProps).toMatchObject({
      multiSelectionKeyCode: 'Shift',
      selectNodesOnDrag: true,
    });
  });

  it('uses the governed grid preferences for background visibility, color, and snap policy', async () => {
    await act(async () => {
      root.render(
        <CanvasViewport
          {...buildProps({
            gridSize: 16,
            canvasGridVisible: true,
            canvasGridColor: '#f97316',
            canvasSnapToGrid: true,
          })}
        />
      );
    });

    expect(container.querySelector('[data-testid="background"]')?.textContent).toBe(
      'color:#f97316|gap:16'
    );
    expect(xyflowState.lastReactFlowProps).toMatchObject({
      snapToGrid: true,
      snapGrid: [16, 16],
      nodesDraggable: true,
    });
  });

  it('can hide the canvas grid without disabling node dragging', async () => {
    await act(async () => {
      root.render(
        <CanvasViewport
          {...buildProps({
            canvasGridVisible: false,
            canvasSnapToGrid: true,
          })}
        />
      );
    });

    expect(container.querySelector('[data-testid="background"]')).toBeNull();
    expect(xyflowState.lastReactFlowProps).toMatchObject({
      snapToGrid: true,
      nodesDraggable: true,
    });
  });

  it('fits the viewport around explicitly imported nodes only once', async () => {
    const props = buildProps({
      nodesWithImpact: [
        { id: 'src_erp_orders', position: { x: 0, y: 0 }, data: {}, type: 'dbtNode' },
        { id: 'src_erp_customers', position: { x: 240, y: 0 }, data: {}, type: 'dbtNode' },
      ] as React.ComponentProps<typeof CanvasViewport>['nodesWithImpact'],
      importedNodeFocusIds: ['src_erp_orders', 'src_erp_customers'],
      onImportedNodeFocusComplete: vi.fn(),
    });

    await act(async () => {
      root.render(<CanvasViewport {...props} />);
    });

    expect(xyflowState.fitView).toHaveBeenCalledWith({
      nodes: expect.arrayContaining([
        expect.objectContaining({ id: 'src_erp_orders' }),
        expect.objectContaining({ id: 'src_erp_customers' }),
      ]),
      padding: 0.24,
      maxZoom: 0.9,
      duration: 300,
    });
    expect(props.onImportedNodeFocusComplete).toHaveBeenCalledTimes(1);
  });
});
