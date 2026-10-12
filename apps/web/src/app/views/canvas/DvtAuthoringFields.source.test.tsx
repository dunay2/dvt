// @vitest-environment jsdom
import { fireEvent } from '@testing-library/dom';
import { act } from 'react';
import { describe, expect, it } from 'vitest';
import { useAuthoringFieldsHarness } from './DvtAuthoringFields.test-support';
import {
  buildDvtNode,
  buildImportedWarehouseSourceNode,
  buildJoinWarehouseSourceNode,
} from './DvtAuthoringFields.test-fixtures';

describe('DVT source authoring', () => {
  const view = useAuthoringFieldsHarness();
  it('renders imported source target metadata and updates the source alias draft', () => {
    view.renderFields(buildImportedWarehouseSourceNode());

    const schemaFact = view.container.querySelector('[data-slot="dvt-source-schema-readonly"]');
    const tableFact = view.container.querySelector('[data-slot="dvt-source-table-readonly"]');
    const aliasInput = view.container.querySelector(
      'input[name="dvt-source-alias"]'
    ) as HTMLInputElement | null;
    const aliasPresentations = [...view.container.querySelectorAll('span, label')].filter(
      (element) => element.textContent?.trim() === 'Alias'
    );

    expect(view.container.textContent).toContain('DVT source');
    expect(view.container.textContent).toContain('erp.orders');
    expect(view.container.textContent).not.toContain('analytics.erp.orders');
    expect(view.container.querySelector('input[name="dvt-source-database"]')).toBeNull();
    expect(view.container.querySelector('input[name="dvt-source-schema"]')).toBeNull();
    expect(view.container.querySelector('input[name="dvt-source-table"]')).toBeNull();
    expect(schemaFact?.textContent).toBe('erp');
    expect(schemaFact?.getAttribute('aria-label')).toBe('Schema: erp');
    expect(tableFact?.textContent).toBe('orders');
    expect(tableFact?.getAttribute('aria-label')).toBe('Table: orders');
    expect(aliasPresentations).toHaveLength(1);
    expect(aliasInput?.value).toBe('warehouse_prod_analytics_erp');

    act(() => {
      fireEvent.input(aliasInput!, { target: { value: 'orders_src' } });
    });

    expect(view.draftJson()).toContain('"alias":"orders_src"');
  });

  it('keeps manually authored source schema and table editable', () => {
    view.renderFields(
      buildDvtNode('dvt:source', {
        config: { schema: 'raw', table: 'orders', alias: 'raw_orders' },
      })
    );

    const schemaInput = view.container.querySelector(
      'input[name="dvt-source-schema"]'
    ) as HTMLInputElement | null;
    const tableInput = view.container.querySelector(
      'input[name="dvt-source-table"]'
    ) as HTMLInputElement | null;

    expect(schemaInput?.value).toBe('raw');
    expect(tableInput?.value).toBe('orders');

    act(() => {
      fireEvent.input(schemaInput!, { target: { value: 'curated' } });
      fireEvent.input(tableInput!, { target: { value: 'orders_daily' } });
    });

    expect(view.draftJson()).toContain('"schema":"curated"');
    expect(view.draftJson()).toContain('"table":"orders_daily"');
  });

  it('keeps Transform filter controls out of a Source columns section', () => {
    const source = buildJoinWarehouseSourceNode({
      id: 'source-orders',
      table: 'orders',
      columns: ['order_id', 'customer'],
    });
    view.renderFields(source, undefined, undefined, [source], [], 'columns');
    expect(view.draftJson()).not.toContain('"semantic"');
    expect(view.container.querySelector('[data-slot="dvt-filter-authoring"]')).toBeNull();
    expect(view.container.querySelector('select[name="dvt-filter-field"]')).toBeNull();
    expect(view.container.querySelector('input[name="dvt-filter-value"]')).toBeNull();
  });
});
