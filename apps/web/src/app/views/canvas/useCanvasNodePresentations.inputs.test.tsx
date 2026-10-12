// @vitest-environment jsdom
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { withTestQueryClient } from '../../../testing/reactQueryHarness';
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasInputBindingEdge } from './canvasInputBindings';
import { useCanvasNodePresentations } from './useCanvasNodePresentations';

describe('Input-only presentation changes', () => {
  it.each(['working-set', 'canonical'] as const)(
    'refreshes %s edge bindings without changing nodes',
    async (shape) => {
      const source: CanonicalNode = {
        id: 'producer',
        name: 'Producer',
        role: 'input',
        kind: 'dvt:source',
        pluginId: 'dvt',
        status: 'idle',
        tags: [],
        metadata: {
          columns: [
            { name: 'a', type: 'text' },
            { name: 'b', type: 'text' },
          ],
        },
      };
      const consumer: CanonicalNode = {
        id: 'consumer',
        name: 'Consumer',
        role: 'transform',
        kind: 'dvt:transform',
        pluginId: 'dvt',
        status: 'idle',
        tags: [],
        metadata: {},
      };
      let edge: CanvasInputBindingEdge = { sourceId: source.id, targetId: consumer.id };
      let values!: ReturnType<typeof useCanvasNodePresentations>;
      function Probe(): null {
        values = useCanvasNodePresentations({ nodes: [source, consumer], edges: [edge] });
        return null;
      }
      const mounted = await withTestQueryClient(createElement(Probe));
      try {
        expect(values.get(consumer.id)?.inputBindings).toHaveLength(2);
        const inputBindings = {
          version: 'v1' as const,
          fields: [{ inputId: 'slot-b', producerFieldId: 'b' }],
        };
        edge = {
          ...edge,
          ...(shape === 'working-set' ? { inputBindings } : { metadata: { inputBindings } }),
        };
        await mounted.render(createElement(Probe));
        expect(values.get(consumer.id)?.inputBindings).toMatchObject([
          { inputId: 'slot-b', name: 'b' },
        ]);
        expect(values.get(consumer.id)?.columns.declared).toEqual([]);
        const previous = values;
        edge = { ...edge };
        await mounted.render(createElement(Probe));
        expect(values).toBe(previous);
      } finally {
        await mounted.cleanup();
      }
    }
  );
});
