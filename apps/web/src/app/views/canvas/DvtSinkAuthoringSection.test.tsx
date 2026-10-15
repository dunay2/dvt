// @vitest-environment jsdom
import { act } from 'react';
import { fireEvent } from '@testing-library/dom';
import { describe, expect, it } from 'vitest';
import { buildDvtNode, buildJoinWarehouseSourceNode } from './DvtAuthoringFields.test-fixtures';
import { useAuthoringFieldsHarness } from './DvtAuthoringFields.test-support';

describe('Sink connection confirmation', () => {
  const view = useAuthoringFieldsHarness();
  it('offers the upstream connection but requires explicit selection in Properties', async () => {
    const source = buildJoinWarehouseSourceNode({ id: 'source', table: 'orders', columns: ['id'] });
    const model = buildDvtNode('dvt:transform', { config: { materialized: 'ephemeral' } });
    const sink = buildDvtNode('dvt:sink', { config: { schema: 'analytics', table: 'orders' } });
    view.renderFields(
      sink,
      undefined,
      undefined,
      [source, model, sink],
      [
        { id: 'input', sourceId: source.id, targetId: model.id, relation: 'lineage' },
        { id: 'output', sourceId: model.id, targetId: sink.id, relation: 'lineage' },
      ]
    );
    const select = view.container.querySelector<HTMLSelectElement>(
      'select[name="dvt-sink-connection"]'
    )!;
    expect(select.value).toBe('');
    expect(select.disabled).toBe(false);
    expect(JSON.parse(view.draftJson())).not.toHaveProperty('connectionRef');
    await act(() => {
      fireEvent.change(select, { target: { value: 'warehouse-main' } });
    });
    expect(JSON.parse(view.draftJson())).toMatchObject({
      connectionRef: { connectionId: 'warehouse-main' },
      schema: 'analytics',
      table: 'orders',
    });
    expect(view.container.querySelector('[style]')).toBeNull();
    await act(() => {
      fireEvent.change(select, { target: { value: '' } });
    });
    expect(JSON.parse(view.draftJson()).connectionRef).toBeNull();
  });
});
