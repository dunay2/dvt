// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import CanvasViewport from './CanvasViewport';
import { buildTestNodeKind } from './canvasKindRegistration.testSupport';
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
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  it('does not render fixed panel restore controls when side panels are hidden', async () => {
    const props = buildProps();

    await act(async () => {
      root.render(<CanvasViewport {...props} />);
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    expect(buttons.some((button) => button.ariaLabel === 'Show explorer panel')).toBe(false);
    expect(buttons.some((button) => button.ariaLabel === 'Show inspector panel')).toBe(false);
  });

  it('resolves minimap color from node registry while keeping the graph canvas chrome minimal', async () => {
    const requestedCanvasPalette = '#152033';
    const normalizedCanvasPalette = normalizeCanvasPaletteId(requestedCanvasPalette);
    const expectedPaletteTokens = deriveCanvasPaletteTokens(normalizedCanvasPalette);

    await act(async () => {
      root.render(
        <CanvasViewport
          {...buildProps({
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

  it('opens a governed create-node menu from the background context gesture', async () => {
    const sourceKind = buildTestNodeKind('dvt:source', 'Source');
    const props = buildProps({
      authoringNodeKinds: [sourceKind],
      onCreateAuthoringNode: vi.fn(),
    });

    await act(async () => {
      root.render(<CanvasViewport {...props} />);
    });

    const paneContextMenu = xyflowState.lastReactFlowProps?.onPaneContextMenu as
      | ((event: React.MouseEvent<Element>) => void)
      | undefined;
    const preventDefault = vi.fn();

    await act(async () => {
      paneContextMenu?.({
        preventDefault,
        clientX: 480,
        clientY: 320,
      } as unknown as React.MouseEvent<Element>);
    });

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(xyflowState.screenToFlowPosition).toHaveBeenCalledWith({ x: 480, y: 320 });

    const createButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Add source')
    );
    expect(createButton).toBeDefined();

    await act(async () => {
      createButton?.click();
    });

    expect(props.onCreateAuthoringNode).toHaveBeenCalledWith(sourceKind, { x: 580, y: 280 });
  });

  it('opens a governed create-node menu from the viewport context surface', async () => {
    const sourceKind = buildTestNodeKind('dvt:source', 'Source');
    const props = buildProps({
      authoringNodeKinds: [sourceKind],
      onCreateAuthoringNode: vi.fn(),
    });

    await act(async () => {
      root.render(<CanvasViewport {...props} />);
    });

    const contextSurface = container.querySelector('[data-slot="canvas-viewport-context-surface"]');
    expect(contextSurface).toBeDefined();

    await act(async () => {
      contextSurface?.dispatchEvent(
        new MouseEvent('contextmenu', {
          clientX: 480,
          clientY: 320,
          button: 2,
          bubbles: true,
          cancelable: true,
        })
      );
    });

    expect(xyflowState.screenToFlowPosition).toHaveBeenCalledWith({ x: 480, y: 320 });
    expect(container.querySelector('[data-slot="canvas-context-menu"]')?.textContent).toContain(
      'Add source'
    );
  });

  it('opens the governed context menu even when React Flow already prevented the native menu', async () => {
    const sourceKind = buildTestNodeKind('dvt:source', 'Source');
    const props = buildProps({
      authoringNodeKinds: [sourceKind],
      onCreateAuthoringNode: vi.fn(),
    });

    await act(async () => {
      root.render(<CanvasViewport {...props} />);
    });

    const contextSurface = container.querySelector('[data-slot="canvas-viewport-context-surface"]');
    const event = new MouseEvent('contextmenu', {
      clientX: 480,
      clientY: 320,
      button: 2,
      bubbles: true,
      cancelable: true,
    });
    event.preventDefault();

    await act(async () => {
      contextSurface?.dispatchEvent(event);
    });

    expect(event.defaultPrevented).toBe(true);
    expect(xyflowState.screenToFlowPosition).toHaveBeenCalledWith({ x: 480, y: 320 });
    expect(container.querySelector('[data-slot="canvas-context-menu"]')?.textContent).toContain(
      'Add source'
    );
  });

  it('opens source import from the editable background context gesture when the rail is available', async () => {
    const sourceKind = buildTestNodeKind('dbt:source', 'Source');
    const props = buildProps({
      authoringNodeKinds: [sourceKind],
      canOpenSourceImport: true,
      onOpenSourceImport: vi.fn(),
      onCreateAuthoringNode: vi.fn(),
    });

    await act(async () => {
      root.render(<CanvasViewport {...props} />);
    });

    const paneContextMenu = xyflowState.lastReactFlowProps?.onPaneContextMenu as
      | ((event: React.MouseEvent<Element>) => void)
      | undefined;

    await act(async () => {
      paneContextMenu?.({
        preventDefault: vi.fn(),
        clientX: 480,
        clientY: 320,
      } as unknown as React.MouseEvent<Element>);
    });

    const sourceImportButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'Add source'
    );
    expect(sourceImportButton).toBeDefined();
    expect(container.querySelector('[data-slot="canvas-context-menu-add-group"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="canvas-context-menu"]')?.textContent).not.toContain(
      'Crear nodo'
    );
    expect(
      Array.from(container.querySelectorAll('button')).filter(
        (button) => button.textContent === 'Add source'
      )
    ).toHaveLength(1);

    await act(async () => {
      sourceImportButton?.click();
    });

    expect(props.onOpenSourceImport).toHaveBeenCalledWith({ x: 580, y: 280 });
    expect(props.onCreateAuthoringNode).not.toHaveBeenCalled();
  });

  it('keeps the background context menu open through the right-button pane click emitted by the same gesture', async () => {
    const props = buildProps({
      authoringNodeKinds: [buildTestNodeKind('dvt:source', 'Source')],
      onCreateAuthoringNode: vi.fn(),
    });

    await act(async () => {
      root.render(<CanvasViewport {...props} />);
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

    await act(async () => {
      paneClick?.({ button: 2 } as React.MouseEvent<Element>);
    });

    expect(container.querySelector('[data-slot="canvas-context-menu"]')).not.toBeNull();
  });

  it('keeps the background context menu open through an immediate normalized pane click from the same right-click gesture', async () => {
    const props = buildProps({
      authoringNodeKinds: [buildTestNodeKind('dvt:source', 'Source')],
      onCreateAuthoringNode: vi.fn(),
    });

    await act(async () => {
      root.render(<CanvasViewport {...props} />);
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

    await act(async () => {
      paneClick?.({ button: 0 } as React.MouseEvent<Element>);
    });

    expect(container.querySelector('[data-slot="canvas-context-menu"]')).not.toBeNull();
  });

  it('keeps the background context menu open through a right-button document pointer event', async () => {
    const props = buildProps({
      authoringNodeKinds: [buildTestNodeKind('dvt:source', 'Source')],
      onCreateAuthoringNode: vi.fn(),
    });

    await act(async () => {
      root.render(<CanvasViewport {...props} />);
    });

    const paneContextMenu = xyflowState.lastReactFlowProps?.onPaneContextMenu as
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

    await act(async () => {
      document.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 2 }));
    });

    expect(container.querySelector('[data-slot="canvas-context-menu"]')).not.toBeNull();
  });

  it('disambiguates source import from local source node creation in the background context menu', async () => {
    const sourceKind = buildTestNodeKind('dvt:source', 'Source');
    const props = buildProps({
      authoringNodeKinds: [sourceKind],
      canOpenSourceImport: true,
      onOpenSourceImport: vi.fn(),
      onCreateAuthoringNode: vi.fn(),
    });

    await act(async () => {
      root.render(<CanvasViewport {...props} />);
    });

    const paneContextMenu = xyflowState.lastReactFlowProps?.onPaneContextMenu as
      | ((event: React.MouseEvent<Element>) => void)
      | undefined;

    await act(async () => {
      paneContextMenu?.({
        preventDefault: vi.fn(),
        clientX: 480,
        clientY: 320,
      } as unknown as React.MouseEvent<Element>);
    });

    const buttons = Array.from(container.querySelectorAll('button')).map((button) =>
      button.textContent?.trim()
    );
    expect(buttons).toContain('Add source');
    expect(buttons).toContain('Create source node');
    expect(buttons.filter((text) => text === 'Add source')).toHaveLength(1);

    const createButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'Create source node'
    );

    await act(async () => {
      createButton?.click();
    });

    expect(props.onCreateAuthoringNode).toHaveBeenCalledWith(sourceKind, { x: 580, y: 280 });
    expect(props.onOpenSourceImport).not.toHaveBeenCalled();
  });

  it('does not offer source import from the background when the source rail is unavailable', async () => {
    await act(async () => {
      root.render(
        <CanvasViewport
          {...buildProps({
            canOpenSourceImport: false,
            onOpenSourceImport: vi.fn(),
          })}
        />
      );
    });

    const paneContextMenu = xyflowState.lastReactFlowProps?.onPaneContextMenu as
      | ((event: React.MouseEvent<Element>) => void)
      | undefined;

    await act(async () => {
      paneContextMenu?.({
        preventDefault: vi.fn(),
        clientX: 480,
        clientY: 320,
      } as unknown as React.MouseEvent<Element>);
    });

    expect(
      Array.from(container.querySelectorAll('button')).some(
        (button) => button.textContent === 'Add source'
      )
    ).toBe(false);
  });

  it('opens execution preview from the background context when graph editing is unavailable', async () => {
    const props = buildProps({
      canEditEdges: false,
      canPreviewExecutionPlan: true,
      onPreviewExecutionPlan: vi.fn(),
      onCreateAuthoringNode: vi.fn(),
    });

    await act(async () => {
      root.render(<CanvasViewport {...props} />);
    });

    const paneContextMenu = xyflowState.lastReactFlowProps?.onPaneContextMenu as
      | ((event: React.MouseEvent<Element>) => void)
      | undefined;

    await act(async () => {
      paneContextMenu?.({
        preventDefault: vi.fn(),
        clientX: 480,
        clientY: 320,
      } as unknown as React.MouseEvent<Element>);
    });

    const previewButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'Preview execution plan'
    );
    expect(previewButton).toBeDefined();

    await act(async () => {
      previewButton?.click();
    });

    expect(props.onPreviewExecutionPlan).toHaveBeenCalledTimes(1);
    expect(props.onCreateAuthoringNode).not.toHaveBeenCalled();
  });

  it('opens backed project and settings actions from the background context menu', async () => {
    const props = buildProps({
      canPreviewExecutionPlan: true,
      onPreviewExecutionPlan: vi.fn(),
      canOpenProjectExplorer: true,
      onOpenProjectExplorer: vi.fn(),
      canOpenCanvasSettings: true,
      onOpenCanvasSettings: vi.fn(),
    });

    await act(async () => {
      root.render(<CanvasViewport {...props} />);
    });

    const paneContextMenu = xyflowState.lastReactFlowProps?.onPaneContextMenu as
      | ((event: React.MouseEvent<Element>) => void)
      | undefined;

    await act(async () => {
      paneContextMenu?.({
        preventDefault: vi.fn(),
        clientX: 480,
        clientY: 320,
      } as unknown as React.MouseEvent<Element>);
    });

    const clickMenuItem = async (label: string): Promise<void> => {
      const button = Array.from(container.querySelectorAll('button')).find(
        (candidate) => candidate.textContent === label
      );
      expect(button, label).toBeDefined();
      await act(async () => {
        button?.click();
      });
    };

    await clickMenuItem('Explore project');
    expect(props.onOpenProjectExplorer).toHaveBeenCalledTimes(1);

    await act(async () => {
      paneContextMenu?.({
        preventDefault: vi.fn(),
        clientX: 480,
        clientY: 320,
      } as unknown as React.MouseEvent<Element>);
    });

    await clickMenuItem('Canvas settings');
    expect(props.onOpenCanvasSettings).toHaveBeenCalledTimes(1);

    expect(props.onPreviewExecutionPlan).not.toHaveBeenCalled();
  });

  it('opens a governed remove-edge menu from the edge context gesture', async () => {
    const props = buildProps({
      edges: [
        {
          id: 'edge-source-model',
          source: 'source',
          target: 'model',
        },
      ],
      onEdgesChange: vi.fn(),
    });

    await act(async () => {
      root.render(<CanvasViewport {...props} />);
    });

    const edgeContextMenu = xyflowState.lastReactFlowProps?.onEdgeContextMenu as
      | ((event: React.MouseEvent<Element>, edge: NonNullable<typeof props.edges>[number]) => void)
      | undefined;
    const preventDefault = vi.fn();
    const edge = props.edges[0];
    if (edge == null) {
      throw new Error('EXPECTED_TEST_EDGE');
    }

    await act(async () => {
      edgeContextMenu?.(
        {
          preventDefault,
          clientX: 600,
          clientY: 360,
        } as unknown as React.MouseEvent<Element>,
        edge
      );
    });

    expect(preventDefault).toHaveBeenCalledTimes(1);

    const removeButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Eliminar conexión')
    );
    expect(removeButton).toBeDefined();

    await act(async () => {
      removeButton?.click();
    });

    expect(props.onEdgesChange).toHaveBeenCalledWith([
      {
        id: 'edge-source-model',
        type: 'remove',
      },
    ]);
  });

  it('dismisses the edge context menu when the user clicks the graph background', async () => {
    const props = buildProps({
      edges: [
        {
          id: 'edge-source-model',
          source: 'source',
          target: 'model',
        },
      ],
      onEdgesChange: vi.fn(),
    });

    await act(async () => {
      root.render(<CanvasViewport {...props} />);
    });

    const edgeContextMenu = xyflowState.lastReactFlowProps?.onEdgeContextMenu as
      | ((event: React.MouseEvent<Element>, edge: NonNullable<typeof props.edges>[number]) => void)
      | undefined;
    const edge = props.edges[0];
    if (edge == null) {
      throw new Error('EXPECTED_TEST_EDGE');
    }

    await act(async () => {
      edgeContextMenu?.(
        {
          preventDefault: vi.fn(),
          clientX: 600,
          clientY: 360,
        } as unknown as React.MouseEvent<Element>,
        edge
      );
    });

    expect(
      Array.from(container.querySelectorAll('button')).some((button) =>
        button.textContent?.includes('Eliminar conexión')
      )
    ).toBe(true);

    const paneClick = xyflowState.lastReactFlowProps?.onPaneClick as
      | ((event: React.MouseEvent<Element>) => void)
      | undefined;

    await act(async () => {
      paneClick?.({ button: 0 } as React.MouseEvent<Element>);
    });

    expect(
      Array.from(container.querySelectorAll('button')).some((button) =>
        button.textContent?.includes('Eliminar conexión')
      )
    ).toBe(false);
    expect(props.onEdgesChange).not.toHaveBeenCalled();
  });

  it('dismisses the edge context menu when the user clicks outside the viewport', async () => {
    const props = buildProps({
      edges: [
        {
          id: 'edge-source-model',
          source: 'source',
          target: 'model',
        },
      ],
      onEdgesChange: vi.fn(),
    });

    await act(async () => {
      root.render(<CanvasViewport {...props} />);
    });

    const edgeContextMenu = xyflowState.lastReactFlowProps?.onEdgeContextMenu as
      | ((event: React.MouseEvent<Element>, edge: NonNullable<typeof props.edges>[number]) => void)
      | undefined;
    const edge = props.edges[0];
    if (edge == null) {
      throw new Error('EXPECTED_TEST_EDGE');
    }

    await act(async () => {
      edgeContextMenu?.(
        {
          preventDefault: vi.fn(),
          clientX: 600,
          clientY: 360,
        } as unknown as React.MouseEvent<Element>,
        edge
      );
    });

    expect(
      Array.from(container.querySelectorAll('button')).some((button) =>
        button.textContent?.includes('Eliminar conexión')
      )
    ).toBe(true);

    await act(async () => {
      document.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    });

    expect(
      Array.from(container.querySelectorAll('button')).some((button) =>
        button.textContent?.includes('Eliminar conexión')
      )
    ).toBe(false);
    expect(props.onEdgesChange).not.toHaveBeenCalled();
  });
});
