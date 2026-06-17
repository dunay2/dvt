// @vitest-environment jsdom

import { fireEvent, waitFor } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { NodePropertiesTabs } from './NodePropertiesTabs';
import type { NodePropertiesReadModel } from './nodePropertiesReadModel';

const node: CanonicalNode = {
  id: 'src-orders',
  name: 'Orders Source',
  description: 'Imported source for analytics.erp.orders',
  pluginId: 'dvt.warehouse-source',
  kind: 'dvt:source',
  role: 'input',
  status: 'idle',
  tags: ['source'],
  path: 'models/sources/src_erp.yml',
};

const readModel: NodePropertiesReadModel = {
  nodeId: node.id,
  nodeName: node.name,
  sections: [
    {
      id: 'general',
      label: 'General',
      rows: [
        { label: 'Schema', value: 'erp' },
        { label: 'Table', value: 'orders' },
      ],
      tableRows: [],
    },
    {
      id: 'columns',
      label: 'Columns',
      rows: [],
      tableRows: [
        {
          id: 'order_id',
          cells: {
            name: 'order_id',
            type: 'integer',
            nullable: 'not null',
          },
        },
      ],
    },
    {
      id: 'inputs-outputs',
      label: 'Inputs / Outputs',
      rows: [],
      tableRows: [
        {
          id: 'output:orders-model',
          cells: {
            direction: 'Output',
            node: 'Orders Model',
            relation: 'lineage',
          },
        },
      ],
    },
    {
      id: 'tests',
      label: 'Tests',
      rows: [],
      tableRows: [],
      emptyState: 'No dbt or data-quality tests are recorded for this node.',
    },
    {
      id: 'code',
      label: 'Code',
      rows: [],
      tableRows: [],
      code: 'select * from analytics.erp.orders',
    },
    {
      id: 'summary',
      label: 'Summary',
      rows: [{ label: 'Downstream nodes', value: 'Orders Model' }],
      tableRows: [],
    },
    {
      id: 'constraints',
      label: 'Constraints',
      rows: [],
      tableRows: [],
      emptyState: 'No table constraints are recorded for this node.',
    },
  ],
};

describe('NodePropertiesTabs', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  function renderTabs(activeTab = 'general', onActiveTabChange = vi.fn()): void {
    act(() => {
      root.render(
        <NodePropertiesTabs
          node={node}
          model={readModel}
          activeRunId={null}
          panels={[]}
          activeTab={activeTab}
          onActiveTabChange={onActiveTabChange}
          onHide={vi.fn()}
        />
      );
    });
  }

  it('renders primary node workbench sections without icon or horizontal-overflow chrome', () => {
    renderTabs();

    const tabsList = container.querySelector('[data-slot="node-inspector-core-tabs-list"]');

    expect(container.querySelector('[data-slot="node-inspector-tab-general"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="node-inspector-tab-columns"]')).not.toBeNull();
    expect(
      container.querySelector('[data-slot="node-inspector-tab-inputs-outputs"]')
    ).not.toBeNull();
    expect(container.querySelector('[data-slot="node-inspector-tab-tests"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="node-inspector-tab-code"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="node-inspector-tab-summary"]')).toBeNull();
    expect(container.querySelector('[data-slot="node-inspector-tab-constraints"]')).toBeNull();
    expect(container.querySelector('[data-slot="node-inspector-more-trigger"]')).not.toBeNull();
    expect(tabsList?.getAttribute('class')).toContain('flex-wrap');
    expect(tabsList?.getAttribute('class')).toContain('overflow-visible');
    expect(tabsList?.getAttribute('class')).not.toContain('overflow-x-auto');
    expect(tabsList?.querySelector('svg')).toBeNull();
  });

  it('renders table-like sections through the component instead of through Inspector integration', () => {
    renderTabs('columns');

    const columnsSection = container.querySelector('[data-slot="node-inspector-columns-section"]');

    expect(columnsSection).not.toBeNull();
    expect(columnsSection?.querySelector('table')).not.toBeNull();
    expect(columnsSection?.textContent).toContain('order_id');
    expect(columnsSection?.textContent).toContain('integer');
    expect(columnsSection?.textContent).toContain('not null');
  });

  it('keeps overflow sections behind More and delegates selection through one callback', async () => {
    const onActiveTabChange = vi.fn();
    renderTabs('general', onActiveTabChange);

    const moreTrigger = container.querySelector<HTMLButtonElement>(
      '[data-slot="node-inspector-more-trigger"]'
    );

    expect(moreTrigger).not.toBeNull();

    await act(async () => {
      fireEvent.pointerDown(moreTrigger!);
      fireEvent.click(moreTrigger!);
    });

    await waitFor(() => {
      expect(document.body.textContent).toContain('Summary');
      expect(document.body.textContent).toContain('Constraints');
    });

    await act(async () => {
      fireEvent.click(
        document.body.querySelector('[data-slot="node-inspector-more-item-summary"]')!
      );
    });

    expect(onActiveTabChange).toHaveBeenCalledWith('summary');
  });
});
