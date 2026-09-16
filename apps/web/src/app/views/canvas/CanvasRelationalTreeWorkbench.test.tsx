// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { ConnectedSourceRef } from '@dvt/contracts';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  createDvtSubstraitInnerJoinDraft,
  encodeDvtSubstraitInnerJoinDocument,
} from './canvasDvtSubstraitJoinComposition';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { CanvasRelationalTreeWorkbench } from './CanvasRelationalTreeWorkbench';

const COPY = {
  inspectorDbtOriginLabel: 'Input',
  inspectorDvtRelationalLeftInput: 'Left input',
  inspectorDvtRelationalRightInput: 'Right input',
  nodePresentationColumnsLabel: 'Columns',
  reactFlowFitViewLabel: 'Fit view',
  reactFlowZoomInLabel: 'Zoom in',
  reactFlowZoomOutLabel: 'Zoom out',
  relationalTreeDetailLabel: 'Detail',
  relationalTreeInputIdentityUnavailableMessage: 'Input identity unavailable.',
  relationalTreeInvalidMessage: 'The canonical relational tree could not be read.',
  relationalTreeLabel: 'Relational tree',
  relationalTreeMissingLabel: 'Missing',
  relationalTreeOutputLabel: 'Output',
  relationalTreeParticipatingLabel: 'Participating',
  relationalTreePendingLabel: 'Pending',
  relationalTreePrimaryInputLabel: 'Primary input',
  relationalTreeReadOnlyMessage: 'Inspection only.',
  relationalTreeSecondaryInputTemplate: 'Secondary input {ordinal}',
  relationalTreeSourcesLabel: 'Sources',
  relationalTreeUnavailableMessage: 'No canonical relational tree is available.',
};

function sourceRef(table: string): ConnectedSourceRef {
  return {
    schemaVersion: 'connected-source-ref.v1',
    connectionRef: {
      schemaVersion: 'connection-ref.v1',
      connectionId: 'warehouse-main',
      provider: 'postgres',
    },
    sourceObjectId: `public.${table}`,
  };
}

function sourceNode(id: string, table: string): CanonicalNode {
  return {
    id,
    name: table,
    pluginId: 'dvt',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: [],
    metadata: {
      schema: 'public',
      tableName: table,
      connectedSourceRef: sourceRef(table),
      columns: [{ name: `${table}_id`, type: 'text' }],
    },
  };
}

function transformNode(): CanonicalNode {
  return {
    id: 'transform',
    name: 'Orders with clients',
    pluginId: 'dvt',
    kind: 'dvt:transform',
    role: 'transform',
    status: 'idle',
    tags: [],
    metadata: {},
  };
}

function edge(sourceId: string): CanonicalEdge {
  return {
    id: `${sourceId}-transform`,
    sourceId,
    targetId: 'transform',
    relation: 'lineage',
  };
}

describe('Canvas relational-tree Workbench', () => {
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
    act(() => root.unmount());
    container.remove();
  });

  it('presents one catalogue, canonical tree and selected-node detail', () => {
    const clients = sourceNode('clients', 'clients');
    const orders = sourceNode('orders', 'orders');
    const draft = createDvtSubstraitInnerJoinDraft({
      left: {
        nodeId: clients.id,
        schema: 'public',
        table: 'clients',
        sourceRef: sourceRef('clients'),
      },
      right: {
        nodeId: orders.id,
        schema: 'public',
        table: 'orders',
        sourceRef: sourceRef('orders'),
      },
      targetNodeId: 'transform',
    });
    const transform = applyDvtSubstraitSemanticDocument(
      transformNode(),
      encodeDvtSubstraitInnerJoinDocument(draft)
    );

    act(() => {
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={transform}
          nodes={[clients, orders, transform]}
          edges={[edge(clients.id), edge(orders.id)]}
          relationalComposition={{
            state: 'canonical',
            connectedInputCount: 2,
            operation: 'inner_join',
          }}
          pendingCompositionAuthoring={null}
          copy={COPY}
        />
      );
    });

    expect(container.querySelectorAll('[data-slot="canvas-relational-tree-source"]')).toHaveLength(
      2
    );
    expect(container.querySelector('[data-slot="canvas-relational-tree"]')?.textContent).toContain(
      'JOIN'
    );
    expect(container.querySelector('[data-slot="canvas-relational-tree"]')?.textContent).toContain(
      'Left input'
    );
    expect(
      container.querySelector('[data-slot="canvas-relational-tree-detail"]')?.textContent
    ).toContain('JOIN');

    const source = container.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-relational-tree-source"]'
    );
    expect(source?.disabled).toBe(false);
    act(() => source?.click());
    expect(
      container.querySelector('[data-slot="canvas-relational-tree-detail"]')?.textContent
    ).toContain('READ');
    expect(
      Array.from(container.querySelectorAll('[role="treeitem"]')).every(
        (item) => item.tagName === 'BUTTON'
      )
    ).toBe(true);
  });

  it('keeps pending authoring inside the same Workbench without fabricating a tree', () => {
    const clients = sourceNode('clients', 'clients');
    const orders = sourceNode('orders', 'orders');
    const transform = transformNode();

    act(() => {
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={transform}
          nodes={[clients, orders, transform]}
          edges={[edge(clients.id), edge(orders.id)]}
          relationalComposition={{ state: 'pending', connectedInputCount: 2, pendingInputCount: 2 }}
          pendingCompositionAuthoring={<div data-slot="pending-composition-authoring" />}
          copy={COPY}
        />
      );
    });

    expect(container.querySelectorAll('[data-slot="canvas-relational-tree-source"]')).toHaveLength(
      2
    );
    expect(
      container.querySelector('[data-slot="canvas-relational-tree-unavailable"]')?.textContent
    ).toContain('No canonical relational tree is available.');
    expect(container.querySelector('[data-slot="pending-composition-authoring"]')).not.toBeNull();
  });
});
