// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { ConnectedSourceRef } from '@dvt/contracts';
import { JoinRel_JoinType } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { inspectDvtSubstraitMixedCrossDraft } from '@dvt/postgres-projection';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import {
  createDvtSubstraitJoinDraft,
  encodeDvtSubstraitJoinDocument,
} from './canvasDvtSubstraitJoinComposition';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import {
  createDvtSubstraitProjectionDraft,
  encodeDvtSubstraitProjectionDocument,
} from './canvasDvtSubstraitProjection';
import { CanvasRelationalTreeWorkbench } from './CanvasRelationalTreeWorkbench';
import type { CanvasInspectorNodeDraft } from './canvasInspectorAuthoring.types';
import {
  createDvtSubstraitCrossDraft,
  encodeDvtSubstraitCrossDocument,
} from './canvasDvtSubstraitCrossComposition';

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
  relationalTreeValidMessage: 'Valid expression',
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
  inspectorDvtSubstraitLeftJoinAction: 'LEFT JOIN',
  inspectorDvtSubstraitRightJoinAction: 'RIGHT JOIN',
  inspectorDvtSubstraitFullOuterJoinAction: 'FULL OUTER JOIN',
  inspectorDvtSubstraitLeftSemiJoinAction: 'LEFT SEMI JOIN',
  inspectorDvtSubstraitLeftAntiJoinAction: 'LEFT ANTI JOIN',
  inspectorDvtSubstraitRightSemiJoinAction: 'RIGHT SEMI JOIN',
  inspectorDvtSubstraitRightAntiJoinAction: 'RIGHT ANTI JOIN',
  inspectorDvtSubstraitCrossJoinAction: 'CROSS JOIN',
  inspectorDvtSubstraitJoinTypeLabel: 'Join type',
  inspectorDvtSubstraitJoinTypeImpactHint:
    'Types that would remove selected columns are unavailable.',
  inspectorDvtSubstraitLeftJoinRolesHint: 'L preserved · R nullable',
  inspectorDvtSubstraitRightJoinRolesHint: 'L nullable · R preserved',
  inspectorDvtSubstraitFullOuterJoinRolesHint: 'L nullable · R nullable',
  inspectorDvtSubstraitLeftFilteringJoinRolesHint: 'L retained · R queried',
  inspectorDvtSubstraitRightFilteringJoinRolesHint: 'L queried · R retained',
  inspectorDvtSubstraitAppendInputAction: 'Add input',
  inspectorDvtSubstraitAppendInputTitle: 'Add connected input',
  inspectorDvtSubstraitConnectedFieldLabel: 'Connected field',
  inspectorDvtSubstraitExistingFieldLabel: 'Existing field',
  inspectorDvtSubstraitUnionAllAction: 'UNION ALL',
  inspectorDvtSubstraitUnionDistinctAction: 'UNION DISTINCT',
  inspectorDvtSubstraitIntersectDistinctAction: 'INTERSECT',
  inspectorDvtSubstraitExceptDistinctAction: 'EXCEPT',
  inspectorDvtSubstraitIntersectAllAction: 'INTERSECT ALL',
  inspectorDvtSubstraitExceptAllAction: 'EXCEPT ALL',
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

  it('presents useful selected-JOIN conditions without a metadata or column-count panel', () => {
    const clients = sourceNode('clients', 'clients');
    const orders = sourceNode('orders', 'orders');
    const draft = createDvtSubstraitJoinDraft({
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
      encodeDvtSubstraitJoinDocument(draft)
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
      container.querySelector('[data-slot="canvas-relational-tree-start-authoring"]')
    ).toBeNull();
    expect(container.querySelector('[data-slot="canvas-relational-tree-detail"]')).toBeNull();
    expect(container.querySelector('[data-slot="canvas-relational-semantic-zoom"]')).toBeNull();
    const zoomIn = container.querySelector<HTMLButtonElement>('button[aria-label="Zoom in"]')!;
    act(() => {
      zoomIn.click();
      zoomIn.click();
      zoomIn.click();
    });
    expect(container.querySelector('[data-slot="canvas-relational-semantic-zoom"]')).not.toBeNull();
    expect(
      container.querySelectorAll(
        '[data-slot="canvas-relational-semantic-zoom"] [data-slot="canvas-join-expression-node"]'
      ).length
    ).toBeGreaterThan(1);
    expect(container.querySelector('[data-slot="canvas-relational-tree-detail"]')).toBeNull();
    const zoomOut = container.querySelector<HTMLButtonElement>('button[aria-label="Zoom out"]')!;
    act(() => {
      zoomOut.click();
      zoomOut.click();
      zoomOut.click();
    });
    expect(container.querySelector('[data-slot="canvas-relational-semantic-zoom"]')).toBeNull();
    const tree = container.querySelector('[data-slot="canvas-relational-tree"]');
    const viewport = container.querySelector('[data-slot="canvas-relational-tree-viewport"]')!;
    act(() => {
      viewport.dispatchEvent(
        new WheelEvent('wheel', { deltaY: -120, bubbles: true, cancelable: true })
      );
    });
    expect(container.querySelector('[data-slot="canvas-relational-tree-zoom"]')?.textContent).toBe(
      '120%'
    );
    expect(container.querySelector('[data-slot="canvas-relational-semantic-zoom"]')).not.toBeNull();
    act(() => {
      viewport.dispatchEvent(
        new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true })
      );
    });
    expect(container.querySelector('[data-slot="canvas-relational-semantic-zoom"]')).toBeNull();
    const toggle = container.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-relational-tree-sources-toggle"]'
    );
    expect(toggle).not.toBeNull();
    act(() => {
      toggle!.click();
    });
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    expect(
      container
        .querySelector('[data-slot="canvas-relational-tree-source-list"]')
        ?.hasAttribute('hidden')
    ).toBe(true);
    expect(container.querySelector('[data-slot="canvas-relational-tree"]')).toBe(tree);
    act(() => {
      toggle!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
      );
    });
    expect(toggle?.getAttribute('aria-expanded')).toBe('true');
    act(() => {
      toggle!.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          repeat: true,
          bubbles: true,
          cancelable: true,
        })
      );
    });
    expect(toggle?.getAttribute('aria-expanded')).toBe('true');
    expect(
      container
        .querySelector('[data-slot="canvas-relational-tree-source-list"]')
        ?.hasAttribute('hidden')
    ).toBe(false);
    expect(container.querySelector('[data-slot="canvas-relational-tree-detail"]')).toBeNull();
    expect(container.textContent).toContain('Orders with clients');
    expect(
      container.querySelector('[data-slot="canvas-relational-tree-source"]')?.textContent
    ).not.toContain('Columns: 1');
    act(() =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-node-expand"]')!
        .click()
    );
    expect(
      container.querySelector('[data-slot="canvas-join-expression-tree"]')?.textContent
    ).toContain('clients.customer_id');
    expect(container.querySelector('[data-slot="canvas-relational-tree"]')).toBe(tree);
    expect(
      container.querySelector('[data-slot="canvas-relational-tree"] [title="Columns"]')
    ).toBeNull();

    const source = container.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-relational-tree-source"]'
    );
    expect(source?.disabled).toBe(false);
    act(() => source?.click());
    expect(source?.getAttribute('aria-pressed')).toBe('true');
    expect(
      container.querySelector('[data-slot="canvas-relational-tree-detail"]')?.textContent
    ).toBeUndefined();
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
          authoring={{
            canEditNode: true,
            onApplyNodeDraft: () => ({ outcome: 'no_changes' }),
          }}
        />
      );
    });

    expect(container.querySelector('[data-slot="canvas-relational-tree"]')?.textContent).toContain(
      'PROJECT'
    );
    expect(
      container.querySelector('[data-slot="canvas-relational-tree-start-authoring"]')
    ).toBeNull();
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
    expect(container.querySelector('[data-operator="project"]')).not.toBeNull();
    expect(container.querySelector('[data-operator="read"]')?.textContent).toContain('customers');
    expect(
      container.querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-apply"]')
        ?.disabled
    ).toBe(true);
    act(() => detailsButton?.click());
    expect(
      container.querySelector('[data-slot="dvt-relational-operation-chooser"]')
    ).not.toBeNull();
    expect(container.querySelector('[data-slot="dvt-select-operation-inner-join"]')).not.toBeNull();
  });

  it('keeps the applied tree mounted during drag and stages a second input only on drop', () => {
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
          authoring={{
            canEditNode: true,
            onApplyNodeDraft: () => ({ outcome: 'no_changes' }),
          }}
        />
      );
    });

    const appliedTree = container.querySelector('[data-slot="canvas-relational-tree"]');
    expect(
      container.querySelector<HTMLButtonElement>('[data-slot="dvt-select-operation-inner-join"]')
        ?.disabled
    ).toBe(true);
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

    expect(container.querySelector('[data-slot="canvas-relational-tree"]')).toBe(appliedTree);
    expect(container.querySelector('[data-slot="canvas-relational-tree-apply"]')).toBeNull();
    const drop = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(drop, 'dataTransfer', { value: dataTransfer });
    values.set('application/x-dvt-relational-source', 'not-connected');
    act(() => {
      container.querySelector('[data-slot="canvas-relational-tree-viewport"]')!.dispatchEvent(drop);
    });
    expect(container.querySelector('[data-slot="canvas-relational-tree"]')).toBe(appliedTree);
    values.set('application/x-dvt-relational-source', orders.id);
    act(() => {
      container.querySelector('[data-slot="canvas-relational-tree-viewport"]')!.dispatchEvent(drop);
    });
    expect(container.querySelector('[data-operator="project"]')).not.toBeNull();
    expect(container.querySelector('[data-operator="read"]')?.textContent).toContain('customers');
    expect(
      container.querySelector<HTMLButtonElement>('[data-slot="dvt-select-operation-inner-join"]')
        ?.disabled
    ).toBe(false);
    expect(
      container.querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-apply"]')
        ?.disabled
    ).toBe(true);
    act(() =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-cancel"]')!
        .click()
    );
    expect(container.querySelector('[data-operator="project"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="canvas-relational-tree-apply"]')).toBeNull();
  });

  it('authors in the central canvas with a collapsible operation shelf and writes only on Apply', () => {
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
            onApplyNodeDraft: (_nodeId, draft) => {
              applied.push(draft);
              return { outcome: 'no_changes' };
            },
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
    expect(
      container.querySelector('[data-slot="canvas-relational-tree-operation-shelf"]')
    ).not.toBeNull();
    expect(
      container.querySelector('[data-slot="canvas-relational-tree-operation-panel"]')
    ).toBeNull();

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
    expect(
      container.querySelector<HTMLButtonElement>('[data-slot="dvt-select-operation-inner-join"]')
        ?.disabled
    ).toBe(true);

    act(() => dragSourceTo(sourceButtons[1]!, secondarySlot!));
    expect(secondarySlot?.textContent).toContain('orders');
    expect(
      container.querySelector('[data-slot="dvt-relational-operation-chooser"]')
    ).not.toBeNull();
    expect(container.querySelector('[data-slot="dvt-select-operation-projection"]')).toBeNull();
    const innerJoinOperation = container.querySelector<HTMLButtonElement>(
      '[data-slot="dvt-select-operation-inner-join"]'
    );
    const draftViewport = container.querySelector<HTMLElement>(
      '[data-slot="canvas-relational-tree-draft-viewport"]'
    );
    act(() => dragSourceTo(innerJoinOperation!, draftViewport!));
    expect(
      container.querySelector('[data-slot="dvt-substrait-join-predicate-editors"]')
    ).not.toBeNull();

    act(() =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-cancel"]')
        ?.click()
    );
    expect(applied).toHaveLength(0);
    expect(
      container.querySelector(
        '[data-slot="canvas-relational-tree-input-slot"][data-position="primary"]'
      )?.textContent
    ).toContain('Drop a Source here.');

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

  it('authors and appends an explicit CrossRel without opening a predicate editor', () => {
    const sizes = sourceNode('sizes', 'sizes');
    const colours = sourceNode('colours', 'colours');
    const stores = sourceNode('stores', 'stores');
    const transform = transformNode();
    const applied: CanvasInspectorNodeDraft[] = [];

    act(() => {
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={transform}
          nodes={[sizes, colours, stores, transform]}
          edges={[edge(sizes.id), edge(colours.id), edge(stores.id)]}
          copy={COPY}
          authoring={{
            canEditNode: true,
            onApplyNodeDraft: (_nodeId, draft) => {
              applied.push(draft);
              return { outcome: 'no_changes' };
            },
          }}
        />
      );
    });

    const sources = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[data-slot="canvas-relational-tree-source"]')
    );
    act(() => sources[0]!.click());
    act(() => sources[1]!.click());
    const cross = container.querySelector<HTMLButtonElement>(
      '[data-slot="dvt-select-operation-cross-join"]'
    );
    expect(cross?.disabled).toBe(false);
    expect(cross?.draggable).toBe(true);
    act(() =>
      dragSourceTo(
        cross!,
        container.querySelector<HTMLElement>('[data-slot="canvas-relational-tree-draft-viewport"]')!
      )
    );

    expect(container.querySelectorAll('[data-operator="cross"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-operator="read"]')).toHaveLength(2);
    expect(
      container.querySelector('[data-slot="dvt-substrait-join-predicate-editors"]')
    ).toBeNull();
    expect(container.querySelector('[data-slot="canvas-relational-cross-warning"]')).not.toBeNull();

    act(() => sources[2]!.click());
    expect(container.querySelectorAll('[data-operator="cross"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-operator="read"]')).toHaveLength(3);
    expect(
      container.querySelector('[data-slot="dvt-substrait-join-predicate-editors"]')
    ).toBeNull();

    act(() =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-apply"]')!
        .click()
    );
    expect(applied).toHaveLength(1);
    expect(applied[0]?.dvt).toMatchObject({
      kind: 'transform',
      mode: 'substrait',
      shape: 'cross_join',
    });
  });

  it('chains every connected Source and keeps earlier Source fields available to later JOINs', () => {
    const customers = sourceNode('customers', 'customers');
    const orders = sourceNode('orders', 'orders');
    const countries = sourceNode('countries', 'countries');
    const regions = sourceNode('regions', 'regions');
    const transform = transformNode();
    const applied: CanvasInspectorNodeDraft[] = [];

    act(() => {
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={transform}
          nodes={[customers, orders, countries, regions, transform]}
          edges={[edge(customers.id), edge(orders.id), edge(countries.id), edge(regions.id)]}
          copy={COPY}
          authoring={{
            canEditNode: true,
            onApplyNodeDraft: (_nodeId, draft) => {
              applied.push(draft);
              return { outcome: 'no_changes' };
            },
          }}
        />
      );
    });

    const sourceButtons = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[data-slot="canvas-relational-tree-source"]')
    );
    act(() => sourceButtons[0]?.click());
    act(() => sourceButtons[1]?.click());
    act(() =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="dvt-select-operation-inner-join"]')
        ?.click()
    );

    expect(container.querySelectorAll('[data-operator="join"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-operator="read"]')).toHaveLength(2);

    act(() => sourceButtons[2]?.click());
    const existingFieldOptions = Array.from(
      container.querySelectorAll<HTMLOptionElement>(
        '[data-slot="canvas-relational-tree-existing-field"] option'
      )
    ).map((option) => option.textContent);
    expect(existingFieldOptions).toContain('customers.customers_id');
    expect(existingFieldOptions).toContain('orders.orders_id');
    act(() =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-append-input"]')
        ?.click()
    );

    expect(container.querySelectorAll('[data-operator="join"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-operator="read"]')).toHaveLength(3);

    const joinCards = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[data-operator="join"]')
    );
    const visiblePredicates = (): HTMLElement[] =>
      Array.from(
        container.querySelectorAll<HTMLElement>(
          '[data-slot="dvt-substrait-join-predicate-editors"] fieldset'
        )
      ).filter((fieldset) => !fieldset.hidden);
    act(() => joinCards[1]!.click());
    expect(visiblePredicates()).toHaveLength(1);
    expect(visiblePredicates()[0]?.textContent).toContain('orders.orders_id');
    expect(visiblePredicates()[0]?.textContent).not.toContain('countries.countries_id');
    act(() =>
      visiblePredicates()[0]!
        .querySelector<HTMLButtonElement>('[aria-label="Editar condición"]')!
        .click()
    );
    const pendingEditor = visiblePredicates()[0]!.querySelector(
      '[data-slot="semantic-workbench-join-condition-editor"]'
    );
    act(() => {
      const comparison = pendingEditor!.querySelector<HTMLSelectElement>(
        '[aria-label="Comparador de la condición"]'
      )!;
      comparison.value = 'not_equal';
      comparison.dispatchEvent(new Event('change', { bubbles: true }));
    });
    act(() => joinCards[0]!.click());
    expect(visiblePredicates()).toHaveLength(1);
    expect(visiblePredicates()[0]?.textContent).toContain('countries.countries_id');
    expect(
      container.querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-apply"]')
        ?.disabled
    ).toBe(true);
    act(() => joinCards[1]!.click());
    expect(
      visiblePredicates()[0]!.querySelector(
        '[data-slot="semantic-workbench-join-condition-editor"]'
      )
    ).toBe(pendingEditor);
    act(() =>
      visiblePredicates()[0]!
        .querySelector<HTMLButtonElement>('[aria-label="Cerrar editor"]')!
        .click()
    );
    expect(applied).toHaveLength(0);

    act(() => sourceButtons[3]?.click());
    act(() =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-append-input"]')
        ?.click()
    );

    expect(container.querySelectorAll('[data-operator="join"]')).toHaveLength(3);
    expect(container.querySelectorAll('[data-operator="read"]')).toHaveLength(4);
    expect(container.querySelectorAll('[data-slot="canvas-relational-tree-output"]')).toHaveLength(
      1
    );
    expect(applied).toHaveLength(0);

    act(() =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-apply"]')
        ?.click()
    );
    expect(applied).toHaveLength(1);
  });

  it('opens an existing JOIN as the structural draft before appending a pending Source', () => {
    const customers = {
      ...sourceNode('customers', 'customers'),
      metadata: {
        ...sourceNode('customers', 'customers').metadata,
        columns: [
          { name: 'customer_id', type: 'text' },
          { name: 'name', type: 'text' },
        ],
      },
    };
    const orders = {
      ...sourceNode('orders', 'orders'),
      metadata: {
        ...sourceNode('orders', 'orders').metadata,
        columns: [
          { name: 'order_id', type: 'text' },
          { name: 'customer_id', type: 'text' },
        ],
      },
    };
    const countries = {
      ...sourceNode('countries', 'countries'),
      metadata: {
        ...sourceNode('countries', 'countries').metadata,
        columns: [
          { name: 'country_id', type: 'text' },
          { name: 'customer_id', type: 'text' },
        ],
      },
    };
    const baseDraft = createDvtSubstraitJoinDraft({
      left: {
        nodeId: customers.id,
        schema: 'public',
        table: 'customers',
        sourceRef: sourceRef('customers'),
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
      encodeDvtSubstraitJoinDocument(baseDraft)
    );
    const applied: CanvasInspectorNodeDraft[] = [];

    act(() => {
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={transform}
          nodes={[customers, orders, countries, transform]}
          edges={[edge(customers.id), edge(orders.id), edge(countries.id)]}
          copy={COPY}
          authoring={{
            canEditNode: true,
            onApplyNodeDraft: (_nodeId, draft) => {
              applied.push(draft);
              return { outcome: 'no_changes' };
            },
          }}
        />
      );
    });

    const start = container.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-relational-node-expand"]'
    );
    expect(start).not.toBeNull();
    act(() => start?.click());
    expect(
      container.querySelector('[data-slot="canvas-relational-tree-block-canvas"]')
    ).not.toBeNull();
    expect(container.querySelectorAll('[data-operator="join"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-operator="read"]')).toHaveLength(2);

    const countriesButton = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[data-slot="canvas-relational-tree-source"]')
    ).find((button) => button.textContent?.includes('countries'));
    expect(countriesButton?.disabled).toBe(false);
    act(() => countriesButton?.click());
    expect(
      container.querySelector('[data-slot="canvas-relational-tree-append-input"]')
    ).not.toBeNull();
    expect(
      Array.from(
        container.querySelectorAll<HTMLOptionElement>(
          '[data-slot="canvas-relational-tree-existing-field"] option'
        )
      ).map((option) => option.textContent)
    ).toEqual(expect.arrayContaining(['customers.customer_id', 'orders.order_id']));
    act(() =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-append-input"]')
        ?.click()
    );

    expect(container.querySelectorAll('[data-operator="join"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-operator="read"]')).toHaveLength(3);
    expect(applied).toHaveLength(0);
    act(() =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-apply"]')
        ?.click()
    );
    expect(applied).toHaveLength(1);
  });

  it('preserves an existing LEFT JOIN when CROSS-composing one pending Source', () => {
    const customers = sourceNode('customers', 'customers');
    const orders = sourceNode('orders', 'orders');
    const countries = {
      ...sourceNode('countries', 'countries'),
      metadata: {
        ...sourceNode('countries', 'countries').metadata,
        columns: [{ name: 'customer_id', type: 'text' }],
      },
    };
    const leftJoin = createDvtSubstraitJoinDraft({
      left: {
        nodeId: customers.id,
        schema: 'public',
        table: 'customers',
        sourceRef: sourceRef('customers'),
      },
      right: {
        nodeId: orders.id,
        schema: 'public',
        table: 'orders',
        sourceRef: sourceRef('orders'),
      },
      targetNodeId: 'transform',
      joinType: JoinRel_JoinType.LEFT,
    });
    const transform = applyDvtSubstraitSemanticDocument(
      transformNode(),
      encodeDvtSubstraitJoinDocument(leftJoin)
    );
    const applied: CanvasInspectorNodeDraft[] = [];

    act(() => {
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={transform}
          nodes={[customers, orders, countries, transform]}
          edges={[edge(customers.id), edge(orders.id), edge(countries.id)]}
          copy={COPY}
          authoring={{
            canEditNode: true,
            onApplyNodeDraft: (_nodeId, draft) => {
              applied.push(draft);
              return { outcome: 'no_changes' };
            },
          }}
        />
      );
    });

    act(() =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-node-expand"]')
        ?.click()
    );
    const countriesButton = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[data-slot="canvas-relational-tree-source"]')
    ).find((button) => button.textContent?.includes('countries'));
    act(() => countriesButton?.click());
    const crossButton = container.querySelector<HTMLButtonElement>(
      '[data-slot="dvt-select-operation-cross-join"]'
    );
    expect(countriesButton?.disabled).toBe(false);
    expect(
      container.querySelector('[data-slot="canvas-relational-tree-append-input"]')
    ).not.toBeNull();
    expect(crossButton).not.toBeNull();
    expect(crossButton?.disabled).toBe(false);
    act(() => crossButton?.click());
    const confirmReplacement = Array.from(
      document.body.querySelectorAll<HTMLButtonElement>('button')
    ).find((button) => button.textContent === COPY.inspectorDvtRelationalApply);
    expect(confirmReplacement).not.toBeNull();
    act(() => confirmReplacement?.click());

    expect(container.querySelectorAll('[data-operator="join"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-operator="cross"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-operator="read"]')).toHaveLength(3);
    act(() =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-apply"]')
        ?.click()
    );
    const semantic = applied[0]?.dvt;
    expect(semantic).toMatchObject({ mode: 'substrait', shape: 'cross_join' });
    if (semantic?.kind !== 'transform' || semantic.mode !== 'substrait') {
      throw new Error('Expected applied Substrait draft.');
    }
    const inspection = inspectDvtSubstraitMixedCrossDraft({
      plan: semantic.plan,
      sidecar: semantic.sidecar,
    });
    expect(inspection.ok).toBe(true);
    if (inspection.ok) {
      expect(inspection.projection.leftJoin.joinRelations.at(-1)?.joinType).toBe(
        JoinRel_JoinType.LEFT
      );
    }
  });

  it('reopens a persisted CROSS and appends structurally without a JOIN predicate editor', () => {
    const sizes = sourceNode('sizes', 'sizes');
    const colours = sourceNode('colours', 'colours');
    const stores = sourceNode('stores', 'stores');
    const asInput = (node: CanonicalNode): CanvasDvtCompositionInput => ({
      nodeId: node.id,
      schema: 'public',
      table: node.name,
      sourceRef: sourceRef(node.name),
      fields: [
        {
          name: `${node.name}_id`,
          dataType: 'string',
          joinDataType: 'string' as const,
          nullable: true,
        },
      ],
    });
    const transform = applyDvtSubstraitSemanticDocument(
      transformNode(),
      encodeDvtSubstraitCrossDocument(
        createDvtSubstraitCrossDraft({ inputs: [asInput(sizes), asInput(colours)] })
      )
    );

    act(() => {
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={transform}
          nodes={[sizes, colours, stores, transform]}
          edges={[edge(sizes.id), edge(colours.id), edge(stores.id)]}
          copy={COPY}
          authoring={{
            canEditNode: true,
            onApplyNodeDraft: () => ({ outcome: 'no_changes' }),
          }}
        />
      );
    });

    act(() =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-node-expand"]')
        ?.click()
    );
    const storesButton = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[data-slot="canvas-relational-tree-source"]')
    ).find((button) => button.textContent?.includes('stores'));
    act(() => storesButton?.click());

    expect(container.querySelectorAll('[data-operator="cross"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-operator="read"]')).toHaveLength(3);
    expect(
      container.querySelector('[data-slot="dvt-substrait-join-predicate-editors"]')
    ).toBeNull();
    expect(container.querySelector('[data-slot="canvas-relational-cross-warning"]')).not.toBeNull();
  });

  it('collapses and restores the operation shelf without discarding the draft', () => {
    const customers = sourceNode('customers', 'customers');
    const orders = sourceNode('orders', 'orders');
    const transform = transformNode();

    act(() => {
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={transform}
          nodes={[customers, orders, transform]}
          edges={[edge(customers.id), edge(orders.id)]}
          copy={COPY}
          authoring={{
            canEditNode: true,
            onApplyNodeDraft: () => ({ outcome: 'no_changes' }),
          }}
        />
      );
    });

    const sourceButtons = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[data-slot="canvas-relational-tree-source"]')
    );
    act(() => sourceButtons[0]?.click());
    act(() => sourceButtons[1]?.click());
    const toggle = container.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-relational-tree-operation-shelf-toggle"]'
    );
    expect(toggle?.getAttribute('aria-expanded')).toBe('true');
    expect(
      container.querySelector('[data-slot="dvt-relational-operation-chooser"]')
    ).not.toBeNull();

    act(() => toggle?.click());
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelector('[data-slot="dvt-relational-operation-chooser"]')).toBeNull();
    expect(sourceButtons[0]?.getAttribute('aria-pressed')).toBe('true');
    expect(sourceButtons[1]?.getAttribute('aria-pressed')).toBe('true');

    act(() => toggle?.click());
    expect(
      container.querySelector('[data-slot="dvt-relational-operation-chooser"]')
    ).not.toBeNull();
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
            onApplyNodeDraft: (_nodeId, draft) => {
              applied.push(draft);
              return { outcome: 'no_changes' };
            },
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

  it('preserves the local operation, focus and rejection reason when the aggregate rejects Apply', () => {
    const orders = sourceNode('orders', 'orders');
    const transform = transformNode();
    const workbench = React.createRef<React.ElementRef<typeof CanvasRelationalTreeWorkbench>>();

    act(() => {
      root.render(
        <CanvasRelationalTreeWorkbench
          ref={workbench}
          transformNode={transform}
          nodes={[orders, transform]}
          edges={[edge(orders.id)]}
          copy={COPY}
          authoring={{
            canEditNode: true,
            onApplyNodeDraft: () => ({ outcome: 'rejected', reason: 'node_unavailable' }),
          }}
        />
      );
    });
    act(() =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-source"]')!
        .click()
    );
    act(() =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="dvt-select-operation-projection"]')!
        .click()
    );
    const apply = container.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-relational-tree-apply"]'
    )!;
    apply.focus();

    act(() => apply.click());

    expect(document.activeElement).toBe(apply);
    expect(workbench.current?.hasUnappliedChanges).toBe(true);
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('no longer available');
    expect(container.querySelector('[data-operator="project"]')).not.toBeNull();
  });
});
