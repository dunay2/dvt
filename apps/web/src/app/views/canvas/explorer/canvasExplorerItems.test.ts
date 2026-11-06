/** Owned concern: navigation projections preserve node identity without changing graph data. */
import { describe, expect, it } from 'vitest';
import { projectCanvasExplorerSources } from './canvasExplorerItems';
import type { CanonicalNode } from '../../../types/canonical';

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
});
