// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { NodePropertiesTabs } from './NodePropertiesTabs';
import type { NodePropertiesReadModel } from './nodePropertiesReadModel';

const node: CanonicalNode = {
  id: 'src-orders',
  name: 'Orders Source',
  pluginId: 'dvt.warehouse-source',
  kind: 'dvt:source',
  role: 'input',
  status: 'idle',
  tags: [],
};

function renderNodePropertiesTabs(
  model: NodePropertiesReadModel,
  activeTab: string
): {
  container: HTMLDivElement;
  root: Root;
} {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;

  act(() => {
    root.render(
      <NodePropertiesTabs
        node={node}
        model={model}
        activeRunId={null}
        panels={[]}
        activeTab={activeTab}
        onActiveTabChange={vi.fn()}
        onHide={vi.fn()}
      />
    );
  });

  return { container, root };
}

describe('NodePropertiesTabs section content', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  afterEach(() => {
    if (root != null) {
      act(() => {
        root?.unmount();
      });
    }
    container?.remove();
    vi.clearAllMocks();
  });

  it('renders table sections as data tables inside the component boundary', () => {
    const model: NodePropertiesReadModel = {
      nodeId: node.id,
      nodeName: node.name,
      sections: [
        {
          id: 'columns',
          label: 'Columns',
          rows: [],
          tableRows: [
            {
              id: 'order_id',
              cells: { name: 'order_id', type: 'integer', nullable: 'not null' },
            },
          ],
        },
      ],
    };

    ({ container, root } = renderNodePropertiesTabs(model, 'columns'));
    const columnsSection = container.querySelector('[data-slot="node-inspector-columns-section"]');

    expect(columnsSection).not.toBeNull();
    expect(columnsSection?.querySelector('table')).not.toBeNull();
    expect(columnsSection?.textContent).toContain('order_id');
    expect(columnsSection?.textContent).toContain('integer');
    expect(columnsSection?.textContent).toContain('not null');
  });

  it('renders code sections as a bounded code block', () => {
    const model: NodePropertiesReadModel = {
      nodeId: node.id,
      nodeName: node.name,
      sections: [
        { id: 'general', label: 'General', rows: [], tableRows: [] },
        { id: 'code', label: 'Code', rows: [], tableRows: [], code: 'select * from orders' },
      ],
    };

    ({ container, root } = renderNodePropertiesTabs(model, 'code'));
    const codeSection = container.querySelector('[data-slot="node-inspector-code-section"]');

    expect(codeSection?.querySelector('pre')?.textContent).toBe('select * from orders');
    expect(codeSection?.textContent).toContain('select * from orders');
  });
});
