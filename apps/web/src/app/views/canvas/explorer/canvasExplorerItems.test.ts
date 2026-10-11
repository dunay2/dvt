/** Owned concern: navigation projections preserve node identity without changing graph data. */
import { describe, expect, it } from 'vitest';
import { projectCanvasExplorerNodes, projectRelationalExplorerItems } from './canvasExplorerItems';
import { resolveCanvasViewCopy } from '../canvasCopyCatalog';

describe('Canvas explorer node projection', () => {
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
