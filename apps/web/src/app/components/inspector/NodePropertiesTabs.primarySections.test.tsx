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

const readModel: NodePropertiesReadModel = {
  nodeId: node.id,
  nodeName: node.name,
  sections: [
    { id: 'general', label: 'General', rows: [], tableRows: [] },
    { id: 'columns', label: 'Columns', rows: [], tableRows: [] },
    { id: 'inputs-outputs', label: 'Inputs / Outputs', rows: [], tableRows: [] },
    { id: 'tests', label: 'Tests', rows: [], tableRows: [] },
    { id: 'code', label: 'Code', rows: [], tableRows: [], code: 'select 1' },
    { id: 'summary', label: 'Summary', rows: [], tableRows: [] },
  ],
};

describe('NodePropertiesTabs primary sections', () => {
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

  it('renders the professional node workbench tabs without icon chrome', () => {
    act(() => {
      root.render(
        <NodePropertiesTabs
          node={node}
          model={readModel}
          activeRunId={null}
          panels={[]}
          activeTab="general"
          onActiveTabChange={vi.fn()}
          onHide={vi.fn()}
        />
      );
    });

    const tabsList = container.querySelector('[data-slot="node-inspector-core-tabs-list"]');

    expect(container.querySelector('[data-slot="node-inspector-tab-general"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="node-inspector-tab-columns"]')).not.toBeNull();
    expect(
      container.querySelector('[data-slot="node-inspector-tab-inputs-outputs"]')
    ).not.toBeNull();
    expect(container.querySelector('[data-slot="node-inspector-tab-tests"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="node-inspector-tab-code"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="node-inspector-tab-summary"]')).toBeNull();
    expect(container.querySelector('[data-slot="node-inspector-more-trigger"]')).not.toBeNull();
    expect(tabsList?.getAttribute('class')).toContain('flex-wrap');
    expect(tabsList?.getAttribute('class')).toContain('overflow-visible');
    expect(tabsList?.getAttribute('class')).not.toContain('overflow-x-auto');
    expect(tabsList?.querySelector('svg')).toBeNull();
  });

  it('uses caller-provided primary section order instead of the global default', () => {
    act(() => {
      root.render(
        <NodePropertiesTabs
          node={node}
          model={readModel}
          activeRunId={null}
          panels={[]}
          activeTab="general"
          primarySectionIds={['general', 'columns', 'code']}
          onActiveTabChange={vi.fn()}
          onHide={vi.fn()}
        />
      );
    });

    const tabsList = container.querySelector('[data-slot="node-inspector-core-tabs-list"]');

    expect(tabsList?.textContent).toContain('General');
    expect(tabsList?.textContent).toContain('Columns');
    expect(tabsList?.textContent).toContain('Code');
    expect(container.querySelector('[data-slot="node-inspector-tab-inputs-outputs"]')).toBeNull();
    expect(container.querySelector('[data-slot="node-inspector-tab-tests"]')).toBeNull();
    expect(container.querySelector('[data-slot="node-inspector-more-trigger"]')).not.toBeNull();
  });
});
