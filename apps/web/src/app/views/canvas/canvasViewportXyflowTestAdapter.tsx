import React from 'react';
import { vi } from 'vitest';

type MockReactFlowProps = Readonly<{
  children: React.ReactNode;
}> &
  Record<string, unknown>;

type MockMiniMapProps = Readonly<{
  nodeColor: (node: { data?: unknown }) => string;
  pannable?: boolean;
  zoomable?: boolean;
  maskColor?: string;
  maskStrokeColor?: string;
  className?: string;
  onNodeClick?: (event: MouseEvent, node: { id: string }) => void;
}>;

const xyflowState = {
  miniMapNodeColor: null as null | ((node: { data?: unknown }) => string),
  miniMapMaskColor: null as null | string,
  miniMapMaskStrokeColor: null as null | string,
  miniMapClassName: null as null | string,
  miniMapOnNodeClick: null as null | ((event: MouseEvent, node: { id: string }) => void),
  controlsFitViewOptions: null as unknown,
  lastReactFlowProps: null as null | Record<string, unknown>,
  setViewport: vi.fn(),
  fitView: vi.fn(),
  screenToFlowPosition: vi.fn(),
};

export function ReactFlow({ children, ...props }: MockReactFlowProps): JSX.Element {
  xyflowState.lastReactFlowProps = props;
  return <div data-testid="react-flow">{children}</div>;
}

export function Controls({ fitViewOptions }: Readonly<{ fitViewOptions?: unknown }>): JSX.Element {
  xyflowState.controlsFitViewOptions = fitViewOptions ?? null;
  return <div data-testid="controls" />;
}

export function MiniMap({
  nodeColor,
  pannable = false,
  zoomable = false,
  maskColor,
  maskStrokeColor,
  className,
  onNodeClick,
}: MockMiniMapProps): JSX.Element {
  xyflowState.miniMapNodeColor = nodeColor;
  xyflowState.miniMapMaskColor = maskColor ?? null;
  xyflowState.miniMapMaskStrokeColor = maskStrokeColor ?? null;
  xyflowState.miniMapClassName = className ?? null;
  xyflowState.miniMapOnNodeClick = onNodeClick ?? null;
  return (
    <div data-testid="minimap" data-pannable={String(pannable)} data-zoomable={String(zoomable)} />
  );
}

export function useReactFlow(): Pick<
  typeof xyflowState,
  'setViewport' | 'fitView' | 'screenToFlowPosition'
> {
  return {
    setViewport: xyflowState.setViewport,
    fitView: xyflowState.fitView,
    screenToFlowPosition: xyflowState.screenToFlowPosition,
  };
}

export function getCanvasViewportXyflowState(): typeof xyflowState {
  return xyflowState;
}

export function resetCanvasViewportXyflowTestAdapter(): void {
  xyflowState.miniMapNodeColor = null;
  xyflowState.miniMapMaskColor = null;
  xyflowState.miniMapMaskStrokeColor = null;
  xyflowState.miniMapClassName = null;
  xyflowState.miniMapOnNodeClick = null;
  xyflowState.controlsFitViewOptions = null;
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
}
