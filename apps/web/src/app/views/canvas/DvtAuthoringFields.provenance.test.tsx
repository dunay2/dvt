// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { useAuthoringFieldsHarness } from './DvtAuthoringFields.test-support';
import { buildDvtNode, buildJoinWarehouseSourceNode } from './DvtAuthoringFields.test-fixtures';
import type { CanonicalEdge } from '../../types/canonical';

describe('DVT authoring consumes complete connection provenance', () => {
  const view = useAuthoringFieldsHarness();
  it.each(['warehouse-main', 'other'])(
    'only inherits a common Sink connection: %s',
    (connectionId) => {
      const sink = buildDvtNode('dvt:sink');
      const source = buildJoinWarehouseSourceNode({ id: 'a', table: 'a', columns: ['id'] });
      const other = buildJoinWarehouseSourceNode({
        id: 'b',
        table: 'b',
        columns: ['id'],
        connectionId,
      });
      const edges: CanonicalEdge[] = [source, other].map((node) => ({
        id: node.id,
        sourceId: node.id,
        targetId: sink.id,
        relation: 'lineage',
      }));
      for (const ordered of [edges, [...edges].reverse()]) {
        view.renderFields(sink, undefined, undefined, [source, other, sink], ordered, 'general');
        const codes = [...view.container.querySelectorAll('code')].map((code) => code.textContent);
        expect(codes.at(-1)).toBe(connectionId === 'warehouse-main' ? 'warehouse-main' : '-');
        expect(view.draftJson()).not.toContain('connectionRef');
      }
    }
  );

  it.each([false, true])(
    'preserves an explicit destination while fan-in changes (saved %s)',
    (saved) => {
      const source = buildJoinWarehouseSourceNode({ id: 'a', table: 'a', columns: ['id'] });
      const other = buildJoinWarehouseSourceNode({
        id: 'b',
        table: 'b',
        columns: ['id'],
        connectionId: 'other',
      });
      const resultTarget = {
        schemaVersion: 'dvt-transform-result-target.v1',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          provider: 'postgres',
          connectionId: 'saved-destination',
        },
        schema: 'analytics',
        relation: 'result',
      };
      const transform = buildDvtNode('dvt:transform', { config: saved ? { resultTarget } : {} });
      const edges: CanonicalEdge[] = [source, other].map((node) => ({
        id: node.id,
        sourceId: node.id,
        targetId: transform.id,
        relation: 'lineage',
      }));
      view.renderFields(
        transform,
        undefined,
        undefined,
        [source, other, transform],
        [edges[0]!],
        'general'
      );
      const before = view.draftJson();
      expect(view.container.querySelector('option[value="warehouse-main"]')).not.toBeNull();
      view.renderFields(
        transform,
        undefined,
        undefined,
        [source, other, transform],
        edges,
        'general'
      );
      const select = view.container.querySelector<HTMLSelectElement>(
        'select[name="dvt-transform-result-connection"]'
      )!;
      expect(select.value).toBe(saved ? 'saved-destination' : '');
      expect(select.disabled).toBe(!saved);
      expect([...select.options].map((option) => option.value)).toEqual(
        saved ? ['', 'saved-destination'] : ['']
      );
      expect(view.draftJson()).toBe(before);
    }
  );
});
