import { fireEvent, waitFor } from '@testing-library/dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { act } from 'react';
import type { Root } from 'react-dom/client';
import { expect } from 'vitest';

import { createAppServicesTestOverrides } from '../../../testing/appServicesTestDoubles';
import { CanvasInspectorPanel } from './CanvasInspectorPanel';
import { AppServicesProvider } from '../../services/AppServicesContext';
import type { IRunsPort } from '../../ports/runs';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';

type InspectorProps = React.ComponentProps<typeof CanvasInspectorPanel>;

export function buildInspectorNode(): CanonicalNode {
  return {
    id: 'node_1',
    name: 'orders_source',
    description: 'Orders source table',
    pluginId: 'dvt',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: [],
  };
}

export function buildDvtInspectorNode(
  kind: 'dvt:source' | 'dvt:sql_transform' | 'dvt:sink',
  metadata?: Record<string, unknown>
): CanonicalNode {
  return {
    id: `dvt-${kind.replace('dvt:', '').replace('_', '-')}`,
    name: kind === 'dvt:sql_transform' ? 'Clean Orders' : 'Orders',
    pluginId: 'dvt',
    kind,
    role: kind === 'dvt:source' ? 'input' : kind === 'dvt:sink' ? 'output' : 'transform',
    status: 'idle',
    tags: ['authoring'],
    metadata,
  };
}

export function buildImportedWarehouseSourceNode(): CanonicalNode {
  return {
    id: 'src_warehouse_prod_analytics_erp_orders',
    name: 'src_warehouse_prod_analytics_erp_orders',
    description: 'Imported source for analytics.erp.orders',
    pluginId: 'dvt.warehouse-source',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: ['source', 'erp'],
    path: 'models/sources/src_erp.yml',
    metadata: {
      sourceName: 'warehouse_prod_analytics_erp',
      tableName: 'orders',
      database: 'analytics',
      schema: 'erp',
      columns: [{ name: 'id', type: 'number', nullable: false }],
    },
  };
}

export function buildDbtInspectorModelNode(): CanonicalNode {
  return {
    id: 'model-orders',
    name: 'Orders Model',
    pluginId: 'dbt',
    kind: 'dbt:model',
    role: 'transform',
    status: 'idle',
    tags: [],
    metadata: {
      dbt: {
        packageName: 'analytics',
        materialized: 'view',
      },
    },
  };
}

export function renderInspectorPanel(root: Root, props: Partial<InspectorProps>): void {
  const node = props.node ?? buildInspectorNode();

  root.render(
    <CanvasInspectorPanel
      node={node}
      nodes={props.nodes ?? (node ? [node] : [])}
      edges={props.edges ?? []}
      activeRunId={props.activeRunId ?? null}
      onHide={props.onHide ?? (() => undefined)}
      authoring={
        props.authoring ?? {
          canEditNode: false,
          onApplyNodeDraft: () => undefined,
        }
      }
      canvas={props.canvas}
      registeredPlugins={props.registeredPlugins}
      preferredTabId={props.preferredTabId}
      preferredTabRequestId={props.preferredTabRequestId}
    />
  );
}

export function wrapInspectorWithRunsProvider(
  children: React.ReactElement,
  runsService: IRunsPort
): React.ReactElement {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <AppServicesProvider overrides={{ ...createAppServicesTestOverrides(), runsService }}>
        {children}
      </AppServicesProvider>
    </QueryClientProvider>
  );
}

export function tabByText(container: HTMLElement, label: string): HTMLButtonElement {
  const tab = Array.from(container.querySelectorAll<HTMLButtonElement>('[role="tab"]')).find(
    (candidate) => candidate.textContent?.trim() === label
  );

  if (!tab) {
    throw new Error(`Inspector tab not found: ${label}`);
  }

  return tab;
}

export async function selectInspectorMoreItem(
  container: HTMLElement,
  itemId: string
): Promise<HTMLElement> {
  const trigger = container.querySelector<HTMLButtonElement>(
    '[data-slot="node-inspector-more-trigger"]'
  );

  if (trigger == null) {
    throw new Error('Inspector More trigger not found');
  }

  await act(async () => {
    fireEvent.mouseDown(trigger, { button: 0, ctrlKey: false });
    fireEvent.pointerDown(trigger);
    fireEvent.click(trigger);
  });

  const selector = `[data-slot="node-inspector-more-item-${itemId}"]`;

  await waitFor(() => {
    expect(document.body.querySelector(selector)).not.toBeNull();
  });

  const item = document.body.querySelector<HTMLElement>(selector);

  if (item == null) {
    throw new Error(`Inspector More item not found: ${itemId}`);
  }

  await act(async () => {
    fireEvent.click(item);
  });

  return item;
}

export function buildImportedSourceEdges(
  sourceNode: CanonicalNode,
  transformNode: CanonicalNode,
  sinkNode: CanonicalNode
): readonly CanonicalEdge[] {
  return [
    {
      id: 'edge-source-transform',
      sourceId: sourceNode.id,
      targetId: transformNode.id,
      relation: 'lineage',
    },
    {
      id: 'edge-transform-sink',
      sourceId: transformNode.id,
      targetId: sinkNode.id,
      relation: 'lineage',
    },
  ];
}
