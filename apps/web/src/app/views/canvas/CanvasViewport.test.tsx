// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@xyflow/react', () => import('./canvasViewportXyflowTestAdapter'));
vi.mock(
  '../../plugins/nodeTypeRegistry',
  () => import('./canvasViewportNodeTypeRegistryTestAdapter')
);

import { deriveCanvasPaletteTokens, normalizeCanvasPaletteId } from './canvasPalette';
import { canvasViewCopy, resolveCanvasViewCopy } from './canvasCopyCatalog';
import { buildCanvasReactFlowAriaLabelConfig } from './CanvasViewportSurfaceView';
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

  it('localizes the React Flow accessibility surface for the active language', () => {
    expect(buildCanvasReactFlowAriaLabelConfig(resolveCanvasViewCopy('es'))).toMatchObject({
      'node.a11yDescription.default':
        'Pulsa Intro o Espacio para seleccionar un nodo. Usa las flechas para moverlo.',
      'edge.a11yDescription.default': 'Pulsa Suprimir para eliminar esta conexión.',
      'controls.ariaLabel': 'Controles del lienzo',
      'controls.zoomIn.ariaLabel': 'Acercar',
      'controls.zoomOut.ariaLabel': 'Alejar',
      'controls.fitView.ariaLabel': 'Ajustar vista',
      'minimap.ariaLabel': 'Minimapa del lienzo',
    });
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

    expect(Array.from(container.querySelectorAll('button'), (button) => button.ariaLabel)).toEqual([
      canvasViewCopy.canvasGraphFilterLabel,
    ]);
    expect(viewportDataset?.canvasPalette).toBe(normalizedCanvasPalette);
    expect(viewportStyle.getPropertyValue('--canvas-surface')).toBe(expectedPaletteTokens.surface);
    expect(viewportStyle.getPropertyValue('--canvas-grid')).toBe('rgba(148, 163, 184, 0.18)');
    expect(viewportStyle.getPropertyValue('--canvas-grid-gap')).toBe('32px');
    expect(xyflowState.miniMapNodeColor).toBeTypeOf('function');
    expect(xyflowState.miniMapNodeColor?.({ data: { pluginKind: 'dbt:model' } })).toBe('#22c55e');
    expect(xyflowState.miniMapNodeColor?.({ data: {} })).toBe('#6b7280');
    expect(mockResolveNodeKindRegistration).toHaveBeenCalledWith('dbt:model');
    expect(mockResolveNodeKindRegistration).toHaveBeenCalledWith('dvt:unknown');
    expect(xyflowState.lastReactFlowProps).toMatchObject({
      fitView: true,
      fitViewOptions: { padding: 0.32, maxZoom: 0.82 },
      minZoom: 0.35,
      className: 'bg-(--canvas-surface)',
      nodesDraggable: true,
      nodesConnectable: true,
      snapToGrid: false,
      snapGrid: [32, 32],
      ariaLabelConfig: {
        'controls.ariaLabel': 'Canvas controls',
        'minimap.ariaLabel': 'Canvas minimap',
      },
    });
    expect(xyflowState.controlsFitViewOptions).toEqual({ padding: 0.32, maxZoom: 0.82 });
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

  it('keeps read-only nodes movable and inspectable without enabling semantic graph edits', async () => {
    const onNodesChange = vi.fn();
    await renderViewport({
      canEditEdges: false,
      canMoveNodes: true,
      canSelectNodes: true,
      onNodesChange,
    });

    expect(xyflowState.lastReactFlowProps).toMatchObject({
      nodesDraggable: true,
      nodesConnectable: false,
      nodesFocusable: true,
      edgesFocusable: false,
      elementsSelectable: true,
      deleteKeyCode: null,
      disableKeyboardA11y: false,
      onNodesChange,
      onEdgesChange: undefined,
      onConnect: undefined,
      onReconnect: undefined,
      edgesReconnectable: false,
    });
  });

  it('suspends global node deletion while a contextual workbench owns keyboard input', async () => {
    await renderViewport({
      canEditEdges: true,
      externalNodeSurfaceActive: true,
    });

    expect(xyflowState.lastReactFlowProps).toMatchObject({
      deleteKeyCode: null,
    });
  });

  it('allows the platform Delete key to remove the current editable selection', async () => {
    await renderViewport({ canEditEdges: true });

    expect(xyflowState.lastReactFlowProps).toMatchObject({
      elementsSelectable: true,
      edgesFocusable: true,
      deleteKeyCode: ['Backspace', 'Delete'],
    });
  });

  it('preserves the governed Shift multi-selection gesture for canvas node selection', async () => {
    await renderViewport();

    expect(xyflowState.lastReactFlowProps).toMatchObject({
      multiSelectionKeyCode: 'Shift',
      selectNodesOnDrag: true,
    });
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
    expect(viewport?.style.getPropertyValue('--canvas-grid')).toBe('rgba(249, 115, 22, 0.18)');
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
