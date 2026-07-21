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
}>;

const xyflowState = {
  miniMapNodeColor: null as null | ((node: { data?: unknown }) => string),
  miniMapMaskColor: null as null | string,
  miniMapMaskStrokeColor: null as null | string,
  miniMapClassName: null as null | string,
  lastReactFlowProps: null as null | Record<string, unknown>,
  setViewport: vi.fn(),
  fitView: vi.fn(),
  screenToFlowPosition: vi.fn(),
};

export function ReactFlow({ children, ...props }: MockReactFlowProps): JSX.Element {
  xyflowState.lastReactFlowProps = props;
  return <div data-testid="react-flow">{children}</div>;
}

export function Controls(): JSX.Element {
  return <div data-testid="controls" />;
}

export function MiniMap({
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
