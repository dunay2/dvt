// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import CanvasViewport from './CanvasViewport';

const mockResolveNodeKindRegistration = vi.hoisted(() => vi.fn());
const xyflowState = vi.hoisted(() => ({
  miniMapNodeColor: null as null | ((node: { data?: unknown }) => string),
  lastReactFlowProps: null as null | Record<string, unknown>,
  setViewport: vi.fn(),
}));

vi.mock('../../plugins/nodeTypeRegistry', () => ({
  resolveNodeKindRegistration: mockResolveNodeKindRegistration,
}));

vi.mock('@xyflow/react', () => ({
  ReactFlow: ({
    children,
    onDrop,
    onDragOver,
    ...props
  }: {
    children: React.ReactNode;
    onDrop?: React.DragEventHandler<HTMLDivElement>;
    onDragOver?: React.DragEventHandler<HTMLDivElement>;
  }) =>
    (() => {
      xyflowState.lastReactFlowProps = props;
      return (
        <div data-testid="react-flow" onDrop={onDrop} onDragOver={onDragOver}>
          {children}
        </div>
      );
    })(),
  Background: ({ gap }: { gap: number }) => <div data-testid="background">gap:{gap}</div>,
  Controls: () => <div data-testid="controls" />,
  MiniMap: ({
    nodeColor,
    pannable,
    zoomable,
  }: {
    nodeColor: (node: { data?: unknown }) => string;
    pannable?: boolean;
    zoomable?: boolean;
  }) => {
    xyflowState.miniMapNodeColor = nodeColor;
    return (
      <div
        data-testid="minimap"
        data-pannable={String(Boolean(pannable))}
        data-zoomable={String(Boolean(zoomable))}
      />
    );
  },
  useReactFlow: () => ({
    setViewport: xyflowState.setViewport,
  }),
}));

function buildProps(
  overrides?: Partial<React.ComponentProps<typeof CanvasViewport>>
): React.ComponentProps<typeof CanvasViewport> {
  return {
    focusMode: false,
    explorerPanelVisible: true,
    inspectorPanelVisible: true,
    nodesWithImpact: [],
    edges: [],
    nodeTypes: {},
    gridSize: 24,
    viewport: null,
    onNodesChange: vi.fn(),
    onNodeDragStop: vi.fn(),
    onEdgesChange: vi.fn(),
    onConnect: vi.fn(),
    onNodeClick: vi.fn(),
    onSelectionChange: vi.fn(),
    onViewportChange: vi.fn(),
    onDrop: vi.fn(),
    onDragOver: vi.fn(),
    onShowExplorer: vi.fn(),
    onShowInspector: vi.fn(),
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
    xyflowState.lastReactFlowProps = null;
    xyflowState.setViewport.mockReset();
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

    const showExplorerButton = buttons.find(
      (button) => button.getAttribute('aria-label') === 'Show explorer panel'
    );
    const showInspectorButton = buttons.find(
      (button) => button.getAttribute('aria-label') === 'Show inspector panel'
    );

    expect(showExplorerButton).toBeTruthy();
    expect(showInspectorButton).toBeTruthy();

    showExplorerButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    showInspectorButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(props.onShowExplorer).toHaveBeenCalledTimes(1);
    expect(props.onShowInspector).toHaveBeenCalledTimes(1);
  });

  it('hides restore buttons in focus mode and resolves minimap color from node registry', async () => {
    await act(async () => {
      root.render(
        <CanvasViewport
          {...buildProps({
            focusMode: true,
            explorerPanelVisible: false,
            inspectorPanelVisible: false,
            gridSize: 32,
          })}
        />
      );
    });

    expect(container.querySelectorAll('button')).toHaveLength(0);
    expect(container.textContent).toContain('gap:32');
    expect(xyflowState.miniMapNodeColor).toBeTypeOf('function');
    expect(xyflowState.miniMapNodeColor?.({ data: { pluginKind: 'dbt:model' } })).toBe('#22c55e');
    expect(xyflowState.miniMapNodeColor?.({ data: {} })).toBe('#6b7280');
    expect(mockResolveNodeKindRegistration).toHaveBeenCalledWith('dbt:model');
    expect(mockResolveNodeKindRegistration).toHaveBeenCalledWith('dvt:unknown');
    expect(xyflowState.lastReactFlowProps).toMatchObject({
      fitView: true,
      fitViewOptions: { padding: 0.2, maxZoom: 0.82 },
      minZoom: 0.35,
    });
    const minimap = container.querySelector('[data-testid="minimap"]');
    expect(minimap?.getAttribute('data-pannable')).toBe('true');
    expect(minimap?.getAttribute('data-zoomable')).toBe('true');
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
});
