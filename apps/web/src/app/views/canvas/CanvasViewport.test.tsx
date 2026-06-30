// @vitest-environment jsdom

import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { deriveCanvasPaletteTokens, normalizeCanvasPaletteId } from './canvasPalette';
import {
  buildCanvasViewportProps,
  createCanvasViewportHarness,
  getCanvasViewportRegistryMock,
  getCanvasViewportXyflowState,
  type CanvasViewportProps,
} from './CanvasViewport.testHarness';

const mockResolveNodeKindRegistration = getCanvasViewportRegistryMock();
const xyflowState = getCanvasViewportXyflowState();

describe('CanvasViewport', () => {
  let container: HTMLDivElement;
  let renderViewport: (props?: Partial<CanvasViewportProps>) => Promise<CanvasViewportProps>;
  let unmountViewport: () => void;

  beforeEach(() => {
    const harness = createCanvasViewportHarness();
    container = harness.container;
    renderViewport = harness.render;
    unmountViewport = harness.unmount;
  });

  afterEach(() => {
    unmountViewport();
    vi.useRealTimers();
  });

  it('does not render fixed panel restore controls when side panels are hidden', async () => {
    await renderViewport();

    const buttons = Array.from(container.querySelectorAll('button'));
    expect(buttons.some((button) => button.ariaLabel === 'Show explorer panel')).toBe(false);
    expect(buttons.some((button) => button.ariaLabel === 'Show inspector panel')).toBe(false);
  });

  it('resolves minimap color from node registry while keeping the graph canvas chrome minimal', async () => {
    const requestedCanvasPalette = '#152033';
    const normalizedCanvasPalette = normalizeCanvasPaletteId(requestedCanvasPalette);
    const expectedPaletteTokens = deriveCanvasPaletteTokens(normalizedCanvasPalette);

    await renderViewport({
      gridSize: 32,
      canvasPalette: requestedCanvasPalette,
    });

    const viewport = container.querySelector('[data-testid="canvas-viewport"]');
    const viewportStyle = (viewport as HTMLDivElement).style;
    const viewportDataset = (viewport as HTMLDivElement | null)?.dataset;

    expect(container.querySelectorAll('button')).toHaveLength(0);
    expect(viewportDataset?.canvasPalette).toBe(normalizedCanvasPalette);
    expect(viewportStyle.getPropertyValue('--canvas-surface')).toBe(expectedPaletteTokens.surface);
    expect(viewportStyle.getPropertyValue('--canvas-grid')).toBe('#94a3b8');
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
    expect(container.querySelector('[data-testid="background"]')).toBeNull();
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
    await renderViewport({
      viewport: { x: 120, y: 48, zoom: 0.68 },
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
    await renderViewport({ canEditEdges: false });

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
    await renderViewport();

    expect(xyflowState.lastReactFlowProps).toMatchObject({
      multiSelectionKeyCode: 'Shift',
      selectNodesOnDrag: true,
    });
  });

  it('keeps canvas-local command capabilities wired into the rendered context menu', async () => {
    await renderViewport({
      canOpenCanvasSettings: true,
      onOpenCanvasSettings: vi.fn(),
    });

    const onPaneContextMenu = xyflowState.lastReactFlowProps?.onPaneContextMenu as
      | ((event: { preventDefault: () => void; clientX: number; clientY: number }) => void)
      | undefined;
    expect(onPaneContextMenu).toBeTypeOf('function');

    await act(async () => {
      onPaneContextMenu?.({
        preventDefault: vi.fn(),
        clientX: 320,
        clientY: 240,
      });
    });

    expect(container.querySelector('[data-slot="canvas-context-menu"]')).not.toBeNull();
    expect(container.textContent).toContain('Canvas settings');
  });

  it('uses one governed CSS grid layer for visibility, color, size, and snap policy', async () => {
    await renderViewport({
      gridSize: 16,
      canvasGridVisible: true,
      canvasGridColor: '#f97316',
      canvasSnapToGrid: true,
    });

    const viewport = container.querySelector(
      '[data-testid="canvas-viewport"]'
    ) as HTMLDivElement | null;

    expect(container.querySelector('[data-testid="background"]')).toBeNull();
    expect(viewport?.style.getPropertyValue('--canvas-grid')).toBe('#f97316');
    expect(viewport?.style.getPropertyValue('--canvas-grid-gap')).toBe('16px');
    expect(xyflowState.lastReactFlowProps).toMatchObject({
      snapToGrid: true,
      snapGrid: [16, 16],
      nodesDraggable: true,
    });
  });

  it('can hide the canvas grid without disabling node dragging', async () => {
    await renderViewport({
      canvasGridVisible: false,
      canvasSnapToGrid: true,
    });

    const viewport = container.querySelector(
      '[data-testid="canvas-viewport"]'
    ) as HTMLDivElement | null;

    expect(container.querySelector('[data-testid="background"]')).toBeNull();
    expect(viewport?.style.getPropertyValue('--canvas-grid')).toBe('transparent');
    expect(xyflowState.lastReactFlowProps).toMatchObject({
      snapToGrid: true,
      nodesDraggable: true,
    });
  });

  it('fits the viewport around explicitly imported nodes only once', async () => {
    const props = buildCanvasViewportProps({
      nodesWithImpact: [
        { id: 'src_erp_orders', position: { x: 0, y: 0 }, data: {}, type: 'dbtNode' },
        { id: 'src_erp_customers', position: { x: 240, y: 0 }, data: {}, type: 'dbtNode' },
      ] as CanvasViewportProps['nodesWithImpact'],
      importedNodeFocusIds: ['src_erp_orders', 'src_erp_customers'],
      onImportedNodeFocusComplete: vi.fn(),
    });

    await renderViewport(props);

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
