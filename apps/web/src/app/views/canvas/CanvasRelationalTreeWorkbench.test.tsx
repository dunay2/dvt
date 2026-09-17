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
import {
  createDvtSubstraitProjectionDraft,
  encodeDvtSubstraitProjectionDocument,
} from './canvasDvtSubstraitProjection';
import { CanvasRelationalTreeWorkbench } from './CanvasRelationalTreeWorkbench';
import type { CanvasInspectorNodeDraft } from './canvasInspectorAuthoring.types';

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
  relationalTreeSelectFirstSourceMessage: 'Select the first Source.',
  relationalTreeSelectOperationMessage: 'Select a relational operation.',
  relationalTreeSelectNextSourceMessage: 'Select the next Source.',
  relationalTreeSelectedInputsLabel: 'Selected inputs',
  relationalTreeCanvasLabel: 'Relation canvas',
  relationalTreePrimarySlotLabel: 'Primary slot',
  relationalTreeSecondarySlotLabel: 'Secondary slot',
  relationalTreeDropSourceMessage: 'Drop a Source here.',
  relationalTreeComposeAction: 'Compose relation',
  relationalTreePendingInputsMessage: 'Inputs available',
  relationalTreeSourceActionHint: 'Drag or press to add',
  relationalTreeProjectOperationLabel: 'PROJECT',
  inspectorDvtRelationalOperationTitle: 'Relate / compose',
  inspectorDvtRelationalAvailable: 'Available',
  inspectorDvtRelationalNeedsPredicate: 'Needs predicate',
  inspectorDvtRelationalNeedsSchemaAlignment: 'Needs schema alignment',
  inspectorDvtRelationalTargetUnavailable: 'Target unavailable',
  inspectorDvtRelationalUnavailable: 'Unavailable',
  inspectorDvtRelationalReadOnly: 'Read only',
  inspectorDvtSubstraitInnerJoinAction: 'INNER JOIN',
  inspectorDvtSubstraitAppendInputAction: 'Add input',
  inspectorDvtSubstraitAppendInputTitle: 'Add connected input',
  inspectorDvtSubstraitConnectedFieldLabel: 'Connected field',
  inspectorDvtSubstraitExistingFieldLabel: 'Existing field',
  inspectorDvtSubstraitUnionAllAction: 'UNION ALL',
  inspectorDvtRelationalApply: 'Apply',
  inspectorDvtRelationalCancel: 'Cancel',
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

  function dragSourceTo(source: HTMLButtonElement, target: HTMLElement): void {
    const values = new Map<string, string>();
    const dataTransfer = {
      effectAllowed: 'move',
      getData: (type: string) => values.get(type) ?? '',
      setData: (type: string, value: string) => values.set(type, value),
    };
    const dragStart = new Event('dragstart', { bubbles: true });
    const drop = new Event('drop', { bubbles: true });
    Object.defineProperty(dragStart, 'dataTransfer', { value: dataTransfer });
    Object.defineProperty(drop, 'dataTransfer', { value: dataTransfer });
    source.dispatchEvent(dragStart);
    target.dispatchEvent(drop);
  }

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
      container.querySelector('[data-slot="canvas-relational-tree-inspection"]')
    ).not.toBeNull();
    expect(container.querySelector('[data-slot="canvas-relational-tree-viewport"]')).not.toBeNull();
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

  it('shows pending Sources without fabricating a tree', () => {
    const clients = sourceNode('clients', 'clients');
    const orders = sourceNode('orders', 'orders');
    const transform = transformNode();

    act(() => {
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={transform}
          nodes={[clients, orders, transform]}
          edges={[edge(clients.id), edge(orders.id)]}
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
    expect(container.textContent).toContain('Pending');
  });

  it('keeps a partial canonical tree visible until guided authoring starts', () => {
    const customers = sourceNode('customers', 'customers');
    const orders = sourceNode('orders', 'orders');
    const orderDetails = sourceNode('order-details', 'order_details');
    const transform = applyDvtSubstraitSemanticDocument(
      transformNode(),
      encodeDvtSubstraitProjectionDocument(
        createDvtSubstraitProjectionDraft({
          source: {
            nodeId: customers.id,
            schema: 'public',
            table: 'customers',
            sourceRef: sourceRef('customers'),
            fields: [{ name: 'customers_id', dataType: 'string' }],
          },
          targetNodeId: 'transform',
          outputs: [
            {
              fieldId: 'output:customers_id',
              name: 'customers_id',
              sourceFieldName: 'customers_id',
            },
          ],
        })
      )
    );

    act(() => {
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={transform}
          nodes={[customers, orders, orderDetails, transform]}
          edges={[edge(customers.id), edge(orders.id), edge(orderDetails.id)]}
          copy={COPY}
          authoring={{ canEditNode: true, onApplyNodeDraft: () => undefined }}
        />
      );
    });

    expect(container.querySelector('[data-slot="canvas-relational-tree"]')?.textContent).toContain(
      'PROJECT'
    );
    expect(
      container.querySelector('[data-slot="canvas-relational-tree-start-authoring"]')?.textContent
    ).toContain('Compose relation');
    expect(
      container.querySelector('[data-slot="canvas-relational-tree-start-authoring"]')?.textContent
    ).toContain('2');
    const sourceButtons = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[data-slot="canvas-relational-tree-source"]')
    );
    expect(sourceButtons).toHaveLength(3);
    expect(sourceButtons.every((button) => button.draggable)).toBe(true);

    const ordersButton = sourceButtons.find((button) => button.textContent?.includes('orders'));
    const detailsButton = sourceButtons.find((button) =>
      button.textContent?.includes('order_details')
    );
    expect(ordersButton?.disabled).toBe(false);
    expect(detailsButton?.disabled).toBe(false);
    act(() => ordersButton?.click());
    expect(
      container.querySelector('[data-slot="canvas-relational-tree-block-canvas"]')
    ).not.toBeNull();
    expect(
      container.querySelector(
        '[data-slot="canvas-relational-tree-input-slot"][data-position="secondary"]'
      )?.textContent
    ).toContain('Drop a Source here.');
    expect(container.textContent).toContain('Select the next Source.');
    act(() => detailsButton?.click());
    expect(
      container.querySelector('[data-slot="dvt-relational-operation-chooser"]')
    ).not.toBeNull();
    expect(container.querySelector('[data-slot="dvt-select-operation-inner-join"]')).not.toBeNull();
  });

  it('reveals the operand slots when the first Source drag starts over a partial tree', () => {
    const customers = sourceNode('customers', 'customers');
    const orders = sourceNode('orders', 'orders');
    const transform = applyDvtSubstraitSemanticDocument(
      transformNode(),
      encodeDvtSubstraitProjectionDocument(
        createDvtSubstraitProjectionDraft({
          source: {
            nodeId: customers.id,
            schema: 'public',
            table: 'customers',
            sourceRef: sourceRef('customers'),
            fields: [{ name: 'customers_id', dataType: 'string' }],
          },
          targetNodeId: 'transform',
          outputs: [
            {
              fieldId: 'output:customers_id',
              name: 'customers_id',
              sourceFieldName: 'customers_id',
            },
          ],
        })
      )
    );

    act(() => {
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={transform}
          nodes={[customers, orders, transform]}
          edges={[edge(customers.id), edge(orders.id)]}
          copy={COPY}
          authoring={{ canEditNode: true, onApplyNodeDraft: () => undefined }}
        />
      );
    });

    const ordersButton = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[data-slot="canvas-relational-tree-source"]')
    ).find((button) => button.textContent?.includes('orders'));
    const values = new Map<string, string>();
    const dataTransfer = {
      effectAllowed: 'move',
      getData: (type: string) => values.get(type) ?? '',
      setData: (type: string, value: string) => values.set(type, value),
    };
    const dragStart = new Event('dragstart', { bubbles: true });
    Object.defineProperty(dragStart, 'dataTransfer', { value: dataTransfer });

    act(() => {
      ordersButton?.dispatchEvent(dragStart);
    });

    expect(
      container.querySelector('[data-slot="canvas-relational-tree-block-canvas"]')
    ).not.toBeNull();
    expect(
      container.querySelectorAll('[data-slot="canvas-relational-tree-input-slot"]')
    ).toHaveLength(2);
  });

  it('authors in central operand slots with no right rail and writes only on Apply', () => {
    const customers = sourceNode('customers', 'customers');
    const orders = sourceNode('orders', 'orders');
    const transform = transformNode();
    const applied: CanvasInspectorNodeDraft[] = [];

    act(() => {
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={transform}
          nodes={[customers, orders, transform]}
          edges={[edge(customers.id), edge(orders.id)]}
          copy={COPY}
          authoring={{
            canEditNode: true,
            onApplyNodeDraft: (_nodeId, draft) => applied.push(draft),
          }}
        />
      );
    });

    const sourceButtons = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[data-slot="canvas-relational-tree-source"]')
    );
    expect(sourceButtons.every((button) => !button.disabled)).toBe(true);
    expect(sourceButtons.every((button) => button.draggable)).toBe(true);
    expect(container.querySelector('[data-slot="canvas-relational-tree-authoring"]')).toBeNull();
    expect(
      container.querySelector('[data-slot="canvas-relational-tree-block-canvas"]')
    ).not.toBeNull();

    const primarySlot = container.querySelector<HTMLElement>(
      '[data-slot="canvas-relational-tree-input-slot"][data-position="primary"]'
    );
    const secondarySlot = container.querySelector<HTMLElement>(
      '[data-slot="canvas-relational-tree-input-slot"][data-position="secondary"]'
    );
    expect(primarySlot).not.toBeNull();
    expect(secondarySlot).not.toBeNull();
    act(() => dragSourceTo(sourceButtons[0]!, primarySlot!));
    expect(primarySlot?.textContent).toContain('customers');
    expect(container.querySelector('[data-slot="dvt-select-operation-projection"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="dvt-select-operation-inner-join"]')).toBeNull();

    act(() => dragSourceTo(sourceButtons[1]!, secondarySlot!));
    expect(secondarySlot?.textContent).toContain('orders');
    expect(
      container.querySelector('[data-slot="dvt-relational-operation-chooser"]')
    ).not.toBeNull();
    expect(container.querySelector('[data-slot="dvt-select-operation-projection"]')).toBeNull();
    act(() =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="dvt-select-operation-inner-join"]')
        ?.click()
    );
    expect(
      container.querySelector('[data-slot="dvt-substrait-join-predicate-editors"]')
    ).not.toBeNull();

    act(() =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-cancel"]')
        ?.click()
    );
    expect(applied).toHaveLength(0);
    expect(primarySlot?.textContent).toContain('Drop a Source here.');

    act(() => sourceButtons[0]?.click());
    act(() => sourceButtons[1]?.click());
    act(() =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="dvt-select-operation-inner-join"]')
        ?.click()
    );
    act(() =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-apply"]')
        ?.click()
    );

    expect(applied).toHaveLength(1);
    expect(applied[0]?.dvt).toMatchObject({
      kind: 'transform',
      mode: 'substrait',
      shape: 'inner_join',
    });
  });

  it('authors a one-Source projection from the same central block', () => {
    const orders = sourceNode('orders', 'orders');
    const transform = transformNode();
    const applied: CanvasInspectorNodeDraft[] = [];

    act(() => {
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={transform}
          nodes={[orders, transform]}
          edges={[edge(orders.id)]}
          copy={COPY}
          authoring={{
            canEditNode: true,
            onApplyNodeDraft: (_nodeId, draft) => applied.push(draft),
          }}
        />
      );
    });
    act(() =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-source"]')
        ?.click()
    );
    act(() =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="dvt-select-operation-projection"]')
        ?.click()
    );
    act(() =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-apply"]')
        ?.click()
    );

    expect(applied).toHaveLength(1);
    expect(applied[0]?.dvt).toMatchObject({
      kind: 'transform',
      mode: 'substrait',
      shape: 'projection',
    });
  });
});
