// @vitest-environment jsdom

import { Position } from '@xyflow/react';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CanvasDependencyEdge, resolveCanvasDependencyArrowPoints } from './CanvasDependencyEdge';
import { buildCanvasDependencyEdgeData } from './canvasDependencyEdgeModel';

type MockBaseEdgeProps = {
  path?: string;
  interactionWidth?: number;
  style?: React.CSSProperties;
  markerEnd?: unknown;
};

const mockedEdge = vi.hoisted(() => ({ props: {} as MockBaseEdgeProps }));

vi.mock('@xyflow/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@xyflow/react')>();
  return {
    ...actual,
    BaseEdge: (props: MockBaseEdgeProps) => {
      mockedEdge.props = props;
      return React.createElement('path', { 'data-slot': 'base-edge' });
    },
    getSmoothStepPath: () => ['M 0 0 L 100 40', 50, 20, 0, 0],
  };
});

describe('CanvasDependencyEdge', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    mockedEdge.props = {};
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it.each([
    [Position.Left, '98,50 86,45 86,55'],
    [Position.Right, '102,50 114,55 114,45'],
    [Position.Top, '100,48 105,36 95,36'],
    [Position.Bottom, '100,52 95,64 105,64'],
  ])('keeps the direction cue clear of a %s target handle', (targetPosition, expected) => {
    expect(resolveCanvasDependencyArrowPoints(100, 50, targetPosition)).toBe(expected);
  });

  it('keeps the semantic edge attached while rendering one non-interactive direction cue', () => {
    act(() => {
      root.render(
        <svg>
          <g>
            <CanvasDependencyEdge
              id="dependency-1"
              source="source"
              target="transform"
              sourceX={0}
              sourceY={40}
              targetX={100}
              targetY={40}
              sourcePosition={Position.Right}
              targetPosition={Position.Left}
              selected={false}
              style={{ stroke: '#cbd5e1', strokeWidth: 2.5 }}
              interactionWidth={18}
              data={buildCanvasDependencyEdgeData({ sourceId: 'source', targetId: 'transform' })}
            />
          </g>
        </svg>
      );
    });

    const cue = container.querySelector('[data-slot="canvas-dependency-direction-cue"]');
    expect(cue?.getAttribute('points')).toBe('98,40 86,35 86,45');
    expect(cue?.getAttribute('aria-hidden')).toBe('true');
    expect(cue?.getAttribute('pointer-events')).toBe('none');
    expect(mockedEdge.props).toMatchObject({
      path: 'M 0 0 L 100 40',
      interactionWidth: 18,
      style: { stroke: '#cbd5e1', strokeWidth: 2.5 },
    });
    expect(mockedEdge.props.markerEnd).toBeUndefined();
    expect(container.querySelector('[data-slot="canvas-dependency-closed-gate"]')).toBeNull();
  });

  it('makes a left-click selection visible on the dependency path', () => {
    act(() => {
      root.render(
        <svg>
          <g>
            <CanvasDependencyEdge
              id="dependency-1"
              source="source"
              target="transform"
              sourceX={0}
              sourceY={40}
              targetX={100}
              targetY={40}
              sourcePosition={Position.Right}
              targetPosition={Position.Left}
              selected={false}
              data={buildCanvasDependencyEdgeData({ sourceId: 'source', targetId: 'transform' })}
            />
          </g>
        </svg>
      );
    });
    const idleStyle = mockedEdge.props.style as React.CSSProperties;

    act(() => {
      root.render(
        <svg>
          <g>
            <CanvasDependencyEdge
              id="dependency-1"
              source="source"
              target="transform"
              sourceX={0}
              sourceY={40}
              targetX={100}
              targetY={40}
              sourcePosition={Position.Right}
              targetPosition={Position.Left}
              selected
              data={buildCanvasDependencyEdgeData({ sourceId: 'source', targetId: 'transform' })}
            />
          </g>
        </svg>
      );
    });
    const selectedStyle = mockedEdge.props.style as React.CSSProperties;

    expect(selectedStyle.stroke).not.toBe(idleStyle.stroke);
  });

  it('uses a non-color valve cue while retaining the directed dependency', () => {
    act(() => {
      root.render(
        <svg>
          <g>
            <CanvasDependencyEdge
              id="dependency-1"
              source="source"
              target="transform"
              sourceX={0}
              sourceY={40}
              targetX={100}
              targetY={40}
              sourcePosition={Position.Right}
              targetPosition={Position.Left}
              selected={false}
              data={buildCanvasDependencyEdgeData({
                sourceId: 'source',
                targetId: 'transform',
                executionGate: 'closed',
              })}
            />
          </g>
        </svg>
      );
    });

    const closedStyle = mockedEdge.props.style;
    const gate = container.querySelector('[data-slot="canvas-dependency-closed-gate"]');

    expect(closedStyle?.strokeDasharray).toBeTruthy();
    expect(closedStyle?.opacity).toBeLessThan(1);
    expect(gate?.querySelectorAll('line')).toHaveLength(2);
    expect(container.querySelector('[data-slot="canvas-dependency-direction-cue"]')).not.toBeNull();
  });
});
