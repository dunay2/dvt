/** Owned concern: navigation projections preserve node identity without changing graph data. */
import { describe, expect, it } from 'vitest';
import {
  projectCanvasExplorerNodes,
  projectCanvasExplorerSources,
  projectRelationalExplorerItems,
} from './canvasExplorerItems';
import type { CanonicalNode } from '../../../types/canonical';
import { resolveCanvasViewCopy } from '../canvasCopyCatalog';

describe('Canvas explorer node projection', () => {
  it('projects definitions with useful context, preserving order and duplicate labels', () => {
    const source: CanonicalNode = {
      id: 'first',
      name: 'Orders',
      pluginId: 'dvt.warehouse-source',
      kind: 'dvt:source',
      role: 'input',
      status: 'idle',
      tags: [],
      metadata: { schema: ' raw ', connectionName: ' Warehouse ' },
    };
    const catalogue: CanonicalNode[] = [
      source,
      { ...source, id: 'placed', sourceDefinitionId: source.id, metadata: undefined },
      { ...source, id: 'second', metadata: { schema: 42, connectionName: '   ' } },
      { ...source, id: 'third', metadata: { connectionName: 'Other warehouse' } },
      { ...source, id: 'transform', role: 'transform' },
    ];
    const before = JSON.stringify(catalogue);
    expect(projectCanvasExplorerSources(catalogue)).toEqual([
      { id: 'first', label: 'Orders', description: 'raw · Warehouse' },
      { id: 'second', label: 'Orders', description: undefined },
      { id: 'third', label: 'Orders', description: 'Other warehouse' },
    ]);
    expect(JSON.stringify(catalogue)).toBe(before);
    expect(projectCanvasExplorerSources([])).toEqual([]);
  });

  it('keeps duplicate labels and derives sources from the canonical role, not the provider', () => {
    const nodes = [
      {
        id: 'first',
        position: { x: 0, y: 0 },
        data: { name: 'Orders', role: 'input', pluginKind: 'other:table' },
      },
      {
        id: 'second',
        position: { x: 0, y: 0 },
        selected: true,
        data: { name: 'Orders', role: 'transform' },
      },
    ];
    const before = JSON.stringify(nodes);
    expect(projectCanvasExplorerNodes(nodes)).toEqual([
      { id: 'first', label: 'Orders', description: 'other:table', source: true, selected: false },
      { id: 'second', label: 'Orders', description: 'second', source: false, selected: true },
    ]);
    expect(JSON.stringify(nodes)).toBe(before);
    expect(projectCanvasExplorerNodes([])).toEqual([]);
  });

  it('lists only the active draft identities and ignores discarded operations in inspection', () => {
    const input = {
      draft: true,
      root: null,
      sources: [],
      operations: [
        { id: 'one', operation: 'field_transform' as const, inputs: [] },
        { id: 'two', operation: 'field_transform' as const, inputs: [] },
      ],
      selectedId: 'two',
      copy: resolveCanvasViewCopy('en'),
    };
    expect(
      projectRelationalExplorerItems(input).map(({ id, selected }) => ({ id, selected }))
    ).toEqual([
      { id: 'one', selected: false },
      { id: 'two', selected: true },
    ]);
    expect(projectRelationalExplorerItems({ ...input, draft: false })).toEqual([]);
  });
});
