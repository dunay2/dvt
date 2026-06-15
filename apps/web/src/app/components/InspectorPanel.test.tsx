// @vitest-environment jsdom

import { Database } from 'lucide-react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { InspectorPanelContribution } from '../plugins/contracts/PluginManifest';
import type { CanonicalEdge, CanonicalNode } from '../types/canonical';
import InspectorPanel from './InspectorPanel';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const sourceNode: CanonicalNode = {
  id: 'source-orders',
  name: 'Orders source',
  pluginId: 'dvt',
  kind: 'dvt:source',
  role: 'input',
  status: 'idle',
  tags: [],
  metadata: {
    columns: [
      {
        name: 'order_id',
        type: 'integer',
        nullable: false,
      },
    ],
    tests: [
      {
        name: 'not_null_orders_order_id',
        type: 'not_null',
        targetColumn: 'order_id',
        severity: 'error',
      },
    ],
  },
};

const modelNode: CanonicalNode = {
  id: 'model-orders',
  name: 'Orders model',
  pluginId: 'dvt',
  kind: 'dvt:sql_transform',
  role: 'transform',
  status: 'idle',
  tags: [],
};

const graphEdges: readonly CanonicalEdge[] = [
  {
    id: 'edge-source-model',
    sourceId: sourceNode.id,
    targetId: modelNode.id,
    relation: 'lineage',
  },
];

describe('InspectorPanel', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('opens the requested node workbench tab when the context menu supplies one', () => {
    act(() => {
      root.render(
        <InspectorPanel
          node={sourceNode}
          nodes={[sourceNode, modelNode]}
          edges={graphEdges}
          activeRunId={null}
          preferredTabId="inputs-outputs"
          onHide={() => undefined}
        />
      );
    });

    const activeTab = container.querySelector('[role="tab"][data-state="active"]');

    expect(activeTab?.textContent).toContain('Inputs / Outputs');
    expect(container.textContent).toContain('Output');
    expect(container.textContent).toContain('Orders model');
    expect(container.textContent).toContain('lineage');
  });

  it('keeps plugin panel tabs textual instead of rendering tab icons', () => {
    const pluginPanels: readonly InspectorPanelContribution[] = [
      {
        id: 'dbt.history',
        pluginId: 'dbt',
        label: 'History',
        icon: Database,
        order: 10,
        shouldShow: () => true,
        component: () => <div>History body</div>,
      },
    ];

    act(() => {
      root.render(
        <InspectorPanel
          node={sourceNode}
          nodes={[sourceNode]}
          edges={[]}
          activeRunId={null}
          onHide={() => undefined}
          panels={pluginPanels}
        />
      );
    });

    const historyTab = Array.from(container.querySelectorAll('[role="tab"]')).find(
      (tab) => tab.textContent === 'History'
    );

    expect(historyTab).toBeDefined();
    expect(historyTab?.querySelector('svg')).toBeNull();
  });
});
