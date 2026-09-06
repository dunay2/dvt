// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import type { InspectorPanelContribution } from '../../plugins/contracts/PluginManifest';
import { NodePropertiesTabs } from './NodePropertiesTabs';
import type { NodePropertiesReadModel } from './nodePropertiesReadModel';

vi.mock('../monaco/MonacoCodeViewer', () => ({
  MonacoCodeViewer: ({ value }: { value: string }) => (
    <div data-testid="monaco-code-viewer">{value}</div>
  ),
}));

const node: CanonicalNode = {
  id: 'model-orders',
  name: 'Orders Model',
  pluginId: 'dvt',
  kind: 'dvt:transform',
  role: 'transform',
  status: 'idle',
  tags: [],
};

function renderNodePropertiesTabs(
  model: NodePropertiesReadModel,
  activeTab: string,
  panels: readonly InspectorPanelContribution[] = []
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
        panels={panels}
        activeTab={activeTab}
        moreLabel="More"
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

  it('renders code sections through the bounded Monaco viewer', () => {
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

    expect(codeSection?.querySelector('[data-testid="monaco-code-viewer"]')?.textContent).toBe(
      'select * from orders'
    );
    expect(codeSection?.querySelector('pre')).toBeNull();
    expect(codeSection?.textContent).toContain('select * from orders');
  });

  it('keeps the inspector mounted when an active plugin panel throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const model: NodePropertiesReadModel = {
      nodeId: node.id,
      nodeName: node.name,
      sections: [{ id: 'general', label: 'General', rows: [], tableRows: [] }],
    };
    const panels: InspectorPanelContribution[] = [
      {
        id: 'failing-panel',
        pluginId: 'failing-plugin',
        label: 'Failing panel',
        icon: (() => null) as unknown as InspectorPanelContribution['icon'],
        order: 10,
        shouldShow: () => true,
        component: () => {
          throw new Error('panel render failed');
        },
      },
    ];

    ({ container, root } = renderNodePropertiesTabs(model, 'failing-panel', panels));

    expect(container.querySelector('[role="tablist"]')).not.toBeNull();
    expect(container.textContent).toContain('Failing panel');
  });
});
