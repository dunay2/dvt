// @vitest-environment jsdom

import { Position } from '@xyflow/react';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CanvasDependencyEdge } from './CanvasDependencyEdge';
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
    EdgeLabelRenderer: ({ children }: { children: React.ReactNode }) =>
      React.createElement('foreignObject', null, children),
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
    expect(cue?.tagName).toBe('marker');
    expect(cue?.getAttribute('orient')).toBe('auto');
    expect(cue?.getAttribute('refX')).toBe('8');
    expect(cue?.getAttribute('markerWidth')).toBe('8');
    expect(cue?.getAttribute('markerHeight')).toBe('8');
    expect(cue?.getAttribute('aria-hidden')).toBe('true');
    expect(cue?.getAttribute('pointer-events')).toBe('none');
    expect(mockedEdge.props).toMatchObject({
      interactionWidth: 18,
      style: { stroke: '#cbd5e1', strokeWidth: 2.5 },
    });
    expect(mockedEdge.props.path).toMatch(/^M.*L/);
    expect(mockedEdge.props.markerEnd).toBe(`url(#${cue?.id})`);
    expect(container.querySelector('[data-slot="canvas-dependency-closed-gate"]')).toBeNull();
  });

  it.each([
    { name: 'level', sourceX: 0, sourceY: 40, targetX: 100, targetY: 40 },
    { name: 'offset', sourceX: 0, sourceY: 120, targetX: 160, targetY: 40 },
    { name: 'returning', sourceX: 160, sourceY: 40, targetX: 0, targetY: 120 },
    { name: 'nearby', sourceX: 0, sourceY: 40, targetX: 10, targetY: 45 },
    {
      name: 'vertical',
      sourceX: 40,
      sourceY: 0,
      targetX: 120,
      targetY: 160,
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    },
  ])(
    'keeps $name endpoints connected with straight segments and bounded rounded corners',
    (route) => {
      act(() => {
        root.render(
          <svg>
            <CanvasDependencyEdge
              id="dependency-geometry"
              source="source"
              target="transform"
              sourcePosition={Position.Right}
              targetPosition={Position.Left}
              selected={false}
              {...route}
            />
          </svg>
        );
      });

      const path = mockedEdge.props.path!;
      expect(path).toMatch(new RegExp(`^M${route.sourceX} ${route.sourceY}L`));
      expect(path).toMatch(new RegExp(`L${route.targetX} ${route.targetY}$`));
      expect(path).not.toMatch(/[Cc]/);
      if (route.sourceY !== route.targetY) expect(path).toContain('Q');

      let previous = [route.sourceX, route.sourceY];
      for (const segment of path.matchAll(/([LQ])([^MLQ]+)/g)) {
        const points = segment[2]!.trim().split(/[ ,]+/).map(Number);
        for (let index = 0; index < points.length; index += 2) {
          const next = [points[index]!, points[index + 1]!];
          expect(next[0] === previous[0] || next[1] === previous[1]).toBe(true);
          if (segment[1] === 'Q') {
            expect(Math.abs(next[0]! - previous[0]!)).toBeLessThanOrEqual(12);
            expect(Math.abs(next[1]! - previous[1]!)).toBeLessThanOrEqual(12);
          }
          previous = next;
        }
      }
      expect(previous).toEqual([route.targetX, route.targetY]);
    }
  );

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

    expect(selectedStyle.strokeWidth).toBeGreaterThan(idleStyle.strokeWidth as number);
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

  it.each(['open', 'closed'] as const)(
    'never renders internal operation controls on a %s dependency',
    (gate) => {
      act(() => {
        root.render(
          <svg>
            <CanvasDependencyEdge
              id="source-model"
              source="orders"
              target="model"
              sourceX={0}
              sourceY={40}
              targetX={100}
              targetY={40}
              sourcePosition={Position.Right}
              targetPosition={Position.Left}
              selected={false}
              data={buildCanvasDependencyEdgeData({
                sourceId: 'orders',
                targetId: 'model',
                executionGate: gate === 'closed' ? 'closed' : undefined,
              })}
            />
          </svg>
        );
      });
      expect(container.querySelectorAll('[data-slot="base-edge"]')).toHaveLength(1);
      expect(container.querySelector('[data-slot="canvas-relational-composition"]')).toBeNull();
      expect(
        container.querySelector('[data-slot="canvas-relational-composition-badge"]')
      ).toBeNull();
      expect(
        container.querySelectorAll('[data-slot="canvas-dependency-direction-cue"]')
      ).toHaveLength(1);
      expect(container.querySelector('[data-slot="canvas-dependency-closed-gate"]') != null).toBe(
        gate === 'closed'
      );
    }
  );
});
