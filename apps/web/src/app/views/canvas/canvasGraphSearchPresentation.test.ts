import type { Edge, Node } from '@xyflow/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { projectCanvasGraphSearchPresentation } from './canvasGraphSearchPresentation';

const nodes: Node[] = [
  node('active', 'domain-node'),
  node('match', 'domain-node secondary'),
  node('other', 'domain-node'),
];
const edges: Edge[] = [
  edge('active-upstream', 'other', 'active', 'domain-edge'),
  edge('active-downstream', 'active', 'match', 'domain-edge'),
  edge('irrelevant', 'match', 'other', 'domain-edge'),
];
const globalStyles = readFileSync(
  resolve(import.meta.dirname, '../../../styles/index.css'),
  'utf8'
).replaceAll('\r\n', '\n');
const themeStyles = readFileSync(resolve(import.meta.dirname, '../../../styles/theme.css'), 'utf8');

describe('projectCanvasGraphSearchPresentation', () => {
  it('classifies active, matching, and non-matching nodes without changing its inputs', () => {
    const projection = projectCanvasGraphSearchPresentation({
      nodes,
      edges,
      status: 'matched',
      matchingNodeIds: ['active', 'match'],
      activeNodeId: 'active',
    });

    expect(projection.nodes.map((candidate) => candidate.className)).toEqual([
      'domain-node canvas-graph-search-active-node',
      'domain-node secondary canvas-graph-search-matching-node',
      'domain-node canvas-graph-search-dimmed-node',
    ]);
    expect(nodes.map((candidate) => candidate.className)).toEqual([
      'domain-node',
      'domain-node secondary',
      'domain-node',
    ]);
  });

  it('preserves active connectivity and de-emphasizes every other edge', () => {
    const projection = projectCanvasGraphSearchPresentation({
      nodes,
      edges,
      status: 'matched',
      matchingNodeIds: ['active', 'match'],
      activeNodeId: 'active',
    });

    expect(projection.edges.map((candidate) => candidate.className)).toEqual([
      'domain-edge canvas-graph-search-relevant-edge',
      'domain-edge canvas-graph-search-relevant-edge',
      'domain-edge canvas-graph-search-dimmed-edge',
    ]);
    expect(edges.map((candidate) => candidate.className)).toEqual([
      'domain-edge',
      'domain-edge',
      'domain-edge',
    ]);
  });

  it('de-emphasizes the complete graph for an explicit no-match result', () => {
    const projection = projectCanvasGraphSearchPresentation({
      nodes,
      edges,
      status: 'no-match',
      matchingNodeIds: [],
      activeNodeId: null,
    });

    expect(projection.nodes.every(hasClass('canvas-graph-search-dimmed-node'))).toBe(true);
    expect(projection.edges.every(hasClass('canvas-graph-search-dimmed-edge'))).toBe(true);
  });

  it('returns the original graph references when search is idle', () => {
    const projection = projectCanvasGraphSearchPresentation({
      nodes,
      edges,
      status: 'idle',
      matchingNodeIds: [],
      activeNodeId: null,
    });

    expect(projection.nodes).toBe(nodes);
    expect(projection.edges).toBe(edges);
  });

  it('uses tokenized visual states that remain distinct without relying on colour alone', () => {
    expect(globalStyles).toContain('outline: 3px solid var(--canvas-search-active-ring)');
    expect(globalStyles).toContain('outline: 2px dashed var(--canvas-search-match-ring)');
    expect(globalStyles).toContain('opacity: var(--canvas-search-dimmed-opacity)');
    expect(globalStyles).toContain('stroke-width: var(--canvas-search-relevant-edge-width)');
    expect(globalStyles).toContain(
      "[data-slot='canvas-dependency-direction-cue'] {\n  fill: var(--canvas-search-relevant-edge) !important;"
    );
    expect(globalStyles).toContain(
      "[data-slot='canvas-dependency-direction-cue'] {\n    fill: CanvasText !important;"
    );
    expect(themeStyles).toContain('--canvas-search-match-ring');
    expect(themeStyles).toContain('--canvas-search-dimmed-opacity');
    expect(themeStyles).toContain('--canvas-search-relevant-edge-width');
  });
});

function node(id: string, className: string): Node {
  return { id, className, position: { x: 0, y: 0 }, data: {} };
}

function edge(id: string, source: string, target: string, className: string): Edge {
  return { id, source, target, className };
}

function hasClass(className: string): (element: Node | Edge) => boolean {
  return (element) => element.className?.split(' ').includes(className) ?? false;
}
