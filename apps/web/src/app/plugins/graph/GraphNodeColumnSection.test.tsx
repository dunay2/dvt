// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import { ReactFlowProvider } from '@xyflow/react';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { GraphNodeColumnSection } from './GraphNodeColumnSection';

describe('GraphNodeColumnSection', () => {
  const EIGHT_COLUMNS = [
    { name: 'column_1', type: 'text' },
    { name: 'column_2', type: 'text' },
    { name: 'column_3', type: 'text' },
    { name: 'column_4', type: 'text' },
    { name: 'column_5', type: 'text' },
    { name: 'column_6', type: 'text' },
    { name: 'column_7', type: 'text' },
    { name: 'column_8', type: 'text' },
  ] as const;
  let container: HTMLDivElement;
  let root: Root;
  let previousActEnvironment: boolean | undefined;
  let previousResizeObserver: typeof ResizeObserver | undefined;

  beforeEach(() => {
    const globalObject = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
    previousActEnvironment = globalObject.IS_REACT_ACT_ENVIRONMENT;
    globalObject.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    useApplicationLanguageStore.setState({ language: 'es' });
    previousResizeObserver = globalThis.ResizeObserver;
    globalThis.ResizeObserver = class implements ResizeObserver {
      disconnect(): void {}
      observe(): void {}
      unobserve(): void {}
    };
  });

  it('shows five columns before explicitly revealing and hiding the remainder', () => {
    act(() => {
      root.render(<GraphNodeColumnSection columns={EIGHT_COLUMNS} />);
    });

    const sectionToggle = container.querySelector<HTMLButtonElement>(
      '[data-slot="graph-node-column-toggle"]'
    );
    act(() => {
      fireEvent.click(sectionToggle!);
    });

    expect(container.querySelectorAll('[data-slot="graph-node-column-row"]')).toHaveLength(5);
    expect(container.textContent).toContain('column_5');
    expect(container.textContent).not.toContain('column_6');

    const remainderToggle = container.querySelector<HTMLButtonElement>(
      '[data-slot="graph-node-column-remainder-toggle"]'
    );
    const columnList = container.querySelector<HTMLElement>('[data-slot="graph-node-column-list"]');
    expect(remainderToggle?.textContent).toContain('Ver columnas restantes (3)');
    expect(remainderToggle?.getAttribute('aria-expanded')).toBe('false');
    expect(remainderToggle?.getAttribute('aria-controls')).toBe(columnList?.id);
    expect(remainderToggle?.hasAttribute('data-canvas-node-control')).toBe(true);
    expect(remainderToggle?.classList.contains('nodrag')).toBe(true);
    expect(remainderToggle?.classList.contains('nopan')).toBe(true);
    expect(sectionToggle?.getAttribute('aria-controls')).toBe(columnList?.id);

    act(() => {
      fireEvent.click(remainderToggle!);
    });

    expect(container.querySelectorAll('[data-slot="graph-node-column-row"]')).toHaveLength(8);
    expect(container.textContent).toContain('column_8');
    expect(remainderToggle?.textContent).toContain('Mostrar solo las 5 primeras');
    expect(remainderToggle?.getAttribute('aria-expanded')).toBe('true');

    act(() => {
      fireEvent.click(remainderToggle!);
    });

    expect(container.querySelectorAll('[data-slot="graph-node-column-row"]')).toHaveLength(5);
    expect(container.textContent).not.toContain('column_6');
  });

  it('localizes the column disclosure and omits a redundant remainder action', () => {
    useApplicationLanguageStore.setState({ language: 'en' });
    act(() => {
      root.render(<GraphNodeColumnSection columns={EIGHT_COLUMNS.slice(0, 5)} />);
    });

    const sectionToggle = container.querySelector<HTMLButtonElement>(
      '[data-slot="graph-node-column-toggle"]'
    );
    expect(sectionToggle?.textContent).toContain('Columns (5)');

    act(() => {
      fireEvent.click(sectionToggle!);
    });

    expect(container.querySelectorAll('[data-slot="graph-node-column-row"]')).toHaveLength(5);
    expect(container.querySelector('[data-slot="graph-node-column-remainder-toggle"]')).toBeNull();
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    const globalObject = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
    if (previousActEnvironment === undefined) {
      Reflect.deleteProperty(globalObject, 'IS_REACT_ACT_ENVIRONMENT');
    } else {
      globalObject.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
    }
    document
      .querySelectorAll('[data-slot="tooltip-content"]')
      .forEach((element) => element.remove());
    if (previousResizeObserver === undefined) {
      Reflect.deleteProperty(globalThis, 'ResizeObserver');
    } else {
      globalThis.ResizeObserver = previousResizeObserver;
    }
  });

  it('presents stacked output pieces with truthful inline and focused metadata', async () => {
    await act(async () => {
      root.render(
        <GraphNodeColumnSection
          columns={[
            {
              id: 'field:model:event_id',
              name: 'event_id_clean',
              type: 'text',
              nullable: false,
              primaryKey: true,
              output: true,
              sourceNodeName: 'auth_audit_events',
              sourceFieldName: 'event_id',
              operations: ['trim', 'upper'],
              reference: 'field:model:event_id',
            },
            {
              id: 'source:event_type',
              name: 'event_type',
              type: 'text',
              nullable: true,
              output: false,
              sourceNodeName: 'auth_audit_events',
              reference: 'source:event_type',
            },
          ]}
        />
      );
    });

    await act(async () => {
      fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-slot="graph-node-column-toggle"]')!
      );
    });

    const pieces = container.querySelectorAll<HTMLElement>('[data-slot="graph-node-column-piece"]');
    expect(pieces).toHaveLength(2);
    expect(pieces[0]?.getAttribute('data-output')).toBe('true');
    expect(pieces[1]?.getAttribute('data-output')).toBe('false');
    expect(pieces[0]?.textContent).toContain('PK');
    expect(pieces[0]?.textContent).toContain('NN');
    expect(pieces[0]?.querySelector('[data-slot="graph-node-column-output-check"]')).not.toBeNull();
    expect(pieces[1]?.querySelector('[data-slot="graph-node-column-output-check"]')).toBeNull();
    expect(pieces[0]?.getAttribute('tabindex')).toBe('0');
    expect(pieces[0]?.getAttribute('aria-label')).toContain('event_id_clean');
    expect(pieces[0]?.getAttribute('aria-label')).toContain('salida');
    expect(
      pieces[0]?.querySelector('[data-slot="graph-node-column-alias"]')?.textContent
    ).toContain('event_id_clean');

    await act(async () => {
      pieces[0]?.focus();
      await Promise.resolve();
    });

    const tooltip = document.body.querySelector('[role="tooltip"]');
    expect(tooltip?.textContent).toContain('Tipo');
    expect(tooltip?.textContent).toContain('text');
    expect(tooltip?.textContent).toContain('No nulo');
    expect(tooltip?.textContent).toContain('auth_audit_events');
    expect(tooltip?.textContent).toContain('field:model:event_id');
    expect(tooltip?.textContent).toContain(
      'event_id → TRIM(event_id) → UPPER(TRIM(event_id)) → event_id_clean'
    );
  });

  it('toggles canonical output inclusion from the check control', async () => {
    const onColumnOutputToggle = vi.fn();
    await act(async () => {
      root.render(
        <GraphNodeColumnSection
          nodeId="transform-orders"
          columns={[
            { id: 'output:order_id', name: 'order_id', type: 'integer', output: true },
            { id: 'customer', name: 'customer', type: 'text', output: false },
          ]}
          onColumnOutputToggle={onColumnOutputToggle}
        />
      );
    });
    await act(async () => {
      fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-slot="graph-node-column-toggle"]')!
      );
    });

    const outputControls = container.querySelectorAll<HTMLButtonElement>(
      '[data-slot="graph-node-column-output-state"]'
    );
    expect(outputControls).toHaveLength(2);
    expect(outputControls[0]?.getAttribute('aria-pressed')).toBe('true');
    expect(outputControls[1]?.getAttribute('aria-pressed')).toBe('false');

    await act(async () => {
      fireEvent.click(outputControls[0]!);
      fireEvent.click(outputControls[1]!);
    });

    expect(onColumnOutputToggle.mock.calls).toEqual([
      [
        {
          nodeId: 'transform-orders',
          columnId: 'output:order_id',
          columnType: 'integer',
          output: false,
        },
      ],
      [
        {
          nodeId: 'transform-orders',
          columnId: 'customer',
          columnType: 'text',
          output: true,
          placement: { targetColumnId: 'output:order_id', placement: 'after' },
        },
      ],
    ]);
  });

  it('emits the same semantic reorder command for pointer and keyboard movement', async () => {
    const onColumnReorder = vi.fn();
    await act(async () => {
      root.render(
        <GraphNodeColumnSection
          nodeId="transform-orders"
          columns={[
            { id: 'output:first', name: 'first', type: 'text', output: true },
            { id: 'output:second', name: 'second', type: 'text', output: true },
            { id: 'output:third', name: 'third', type: 'text', output: true },
          ]}
          onColumnReorder={onColumnReorder}
        />
      );
    });
    await act(async () => {
      fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-slot="graph-node-column-toggle"]')!
      );
    });

    const rows = container.querySelectorAll<HTMLElement>('[data-slot="graph-node-column-row"]');
    const pieces = container.querySelectorAll<HTMLElement>('[data-slot="graph-node-column-piece"]');
    const dataTransfer = { effectAllowed: 'none', dropEffect: 'none', setData: vi.fn() };
    await act(async () => {
      fireEvent.dragStart(pieces[2]!, { dataTransfer });
      fireEvent.dragOver(rows[0]!, { clientY: 11, dataTransfer });
    });
    await act(async () => {
      fireEvent.drop(rows[0]!, { clientY: 11, dataTransfer });
      fireEvent.keyDown(pieces[1]!, { key: 'ArrowUp', altKey: true });
    });

    expect(onColumnReorder.mock.calls.map(([command]) => command)).toEqual([
      {
        nodeId: 'transform-orders',
        columnId: 'output:third',
        targetColumnId: 'output:first',
        placement: 'after',
      },
      {
        nodeId: 'transform-orders',
        columnId: 'output:second',
        targetColumnId: 'output:first',
        placement: 'before',
      },
    ]);
  });

  it('requires an output alias before applying a function from pointer or keyboard menus', async () => {
    const onColumnFunctionApply = vi.fn();
    await act(async () => {
      root.render(
        <GraphNodeColumnSection
          nodeId="transform-orders"
          columns={[
            {
              id: 'output:customer',
              name: 'customer',
              type: 'text',
              functionMenu: {
                category: 'text',
                items: [
                  { capabilityId: 'capability:trim', name: 'trim' },
                  { capabilityId: 'capability:upper', name: 'upper' },
                ],
              },
            },
          ]}
          onColumnFunctionApply={onColumnFunctionApply}
        />
      );
    });
    await act(async () => {
      fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-slot="graph-node-column-toggle"]')!
      );
    });

    const piece = container.querySelector<HTMLElement>('[data-slot="graph-node-column-piece"]')!;
    await act(async () => {
      piece.dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 })
      );
      await Promise.resolve();
    });

    const upperItem = document.body.querySelector<HTMLElement>(
      '[data-slot="graph-node-column-function"][data-capability-id="capability:upper"]'
    );
    expect(upperItem).not.toBeNull();
    await act(async () => {
      fireEvent.click(upperItem!);
    });
    expect(onColumnFunctionApply).not.toHaveBeenCalled();
    const aliasInput = document.body.querySelector<HTMLInputElement>(
      '[data-slot="graph-node-column-function-alias-input"]'
    );
    const aliasSubmit = document.body.querySelector<HTMLButtonElement>(
      '[data-slot="graph-node-column-function-alias-submit"]'
    );
    expect(aliasInput).not.toBeNull();
    expect(aliasSubmit?.disabled).toBe(true);
    await act(async () => {
      fireEvent.change(aliasInput!, { target: { value: 'customer_clean' } });
      fireEvent.click(aliasSubmit!);
    });
    expect(onColumnFunctionApply).toHaveBeenCalledWith({
      nodeId: 'transform-orders',
      columnId: 'output:customer',
      capabilityId: 'capability:upper',
      alias: 'customer_clean',
    });

    await act(async () => {
      piece.focus();
      fireEvent.keyDown(piece, { key: 'F10', shiftKey: true });
      await Promise.resolve();
    });
    expect(
      document.body.querySelector('[data-slot="graph-node-column-function-menu"]')
    ).not.toBeNull();
  });

  it('explains truthfully when the connected profile admits no function for a type', async () => {
    await act(async () => {
      root.render(
        <GraphNodeColumnSection
          nodeId="transform-orders"
          columns={[
            {
              id: 'output:amount',
              name: 'amount',
              type: 'numeric',
              functionMenu: { category: 'numeric', items: [] },
            },
          ]}
          onColumnFunctionApply={vi.fn()}
        />
      );
    });
    await act(async () => {
      fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-slot="graph-node-column-toggle"]')!
      );
    });

    const piece = container.querySelector<HTMLElement>('[data-slot="graph-node-column-piece"]')!;
    await act(async () => {
      piece.dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 })
      );
      await Promise.resolve();
    });

    expect(document.body.textContent).toContain(
      'No hay funciones compatibles con este tipo y destino.'
    );
  });

  it('renders a collapsed governed column disclosure with Spanish product copy', () => {
    act(() => {
      root.render(
        <GraphNodeColumnSection
          columns={[
            { name: 'order_id', type: 'integer' },
            { name: 'customer', type: 'text' },
          ]}
        />
      );
    });

    const section = container.querySelector('[data-slot="graph-node-column-section"]');
    const toggle = container.querySelector<HTMLButtonElement>(
      '[data-slot="graph-node-column-toggle"]'
    );

    expect(section).not.toBeNull();
    expect(toggle?.textContent).toContain('Columnas (2)');
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    expect(container.textContent).not.toContain('order_id');
  });

  it('expands recorded columns without inventing metadata', () => {
    act(() => {
      root.render(
        <GraphNodeColumnSection
          columns={[
            { name: 'order_id', type: 'integer' },
            { name: 'customer', type: 'text' },
          ]}
        />
      );
    });

    const toggle = container.querySelector<HTMLButtonElement>(
      '[data-slot="graph-node-column-toggle"]'
    );
    expect(toggle).not.toBeNull();

    act(() => {
      fireEvent.click(toggle!);
    });

    expect(toggle?.getAttribute('aria-expanded')).toBe('true');
    expect(container.textContent).toContain('order_id');
    expect(container.textContent).toContain('integer');
    expect(container.textContent).toContain('customer');
    expect(container.textContent).toContain('text');
    expect(container.textContent).not.toContain('unknown');
  });

  it('renders source output ports and activates the semantic column identity by keyboard', () => {
    const onColumnPortActivate = vi.fn();
    const onDisclosureChange = vi.fn();
    const onColumnLayoutChange = vi.fn();
    act(() => {
      root.render(
        <ReactFlowProvider>
          <GraphNodeColumnSection
            nodeId="orders"
            columns={[
              {
                id: 'order_id',
                name: 'order_id',
                type: 'integer',
                sourceHandleId: 'column:source:orders:order_id',
              },
            ]}
            portDirections={['source']}
            onColumnPortActivate={onColumnPortActivate}
            onDisclosureChange={onDisclosureChange}
            onColumnLayoutChange={onColumnLayoutChange}
          />
        </ReactFlowProvider>
      );
    });

    act(() => {
      fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-slot="graph-node-column-toggle"]')!
      );
    });

    const handles = container.querySelectorAll<HTMLElement>(
      '[data-slot="canvas-node-port-handle"]'
    );
    expect(handles).toHaveLength(1);
    expect(handles[0]?.getAttribute('data-port')).toBe('source');
    expect(handles[0]?.getAttribute('aria-label')).toBe('Conectar salida de order_id');
    expect(onDisclosureChange).toHaveBeenCalledWith(true);
    expect(onColumnLayoutChange).toHaveBeenCalled();

    act(() => {
      fireEvent.keyDown(handles[0]!, { key: 'Enter' });
    });
    expect(onColumnPortActivate).toHaveBeenCalledWith({
      direction: 'source',
      nodeId: 'orders',
      columnId: 'order_id',
    });
  });

  it('reports a layout change when column port directions become available', () => {
    const onColumnLayoutChange = vi.fn();
    const columns = [
      {
        id: 'order_id',
        name: 'order_id',
        type: 'integer',
        sourceHandleId: 'column:source:orders:order_id',
      },
    ] as const;
    const render = (portDirections: readonly ('source' | 'target')[]): React.ReactElement => (
      <ReactFlowProvider>
        <GraphNodeColumnSection
          nodeId="orders"
          columns={columns}
          portDirections={portDirections}
          onColumnLayoutChange={onColumnLayoutChange}
        />
      </ReactFlowProvider>
    );

    act(() => root.render(render([])));
    act(() => {
      fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-slot="graph-node-column-toggle"]')!
      );
    });
    onColumnLayoutChange.mockClear();

    act(() => root.render(render(['source'])));

    expect(container.querySelectorAll('[data-slot="canvas-node-port-handle"]')).toHaveLength(1);
    expect(onColumnLayoutChange).toHaveBeenCalledOnce();
  });

  it('renders both model directions and offers explicit deterministic automap', () => {
    const onAutomap = vi.fn();
    act(() => {
      root.render(
        <ReactFlowProvider>
          <GraphNodeColumnSection
            nodeId="model"
            columns={[
              {
                id: 'output:order_id',
                name: 'order_id',
                type: 'integer',
                sourceHandleId: 'column:source:model:output%3Aorder_id',
                targetHandleId: 'column:target:model:output%3Aorder_id',
              },
            ]}
            portDirections={['target', 'source']}
            onColumnPortActivate={vi.fn()}
            onAutomap={onAutomap}
          />
        </ReactFlowProvider>
      );
    });

    act(() => {
      fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-slot="graph-node-column-toggle"]')!
      );
    });

    expect(
      [...container.querySelectorAll('[data-slot="canvas-node-port-handle"]')].map((handle) =>
        handle.getAttribute('data-port')
      )
    ).toEqual(['target', 'source']);
    const automap = container.querySelector<HTMLButtonElement>(
      '[data-slot="graph-node-column-automap"]'
    );
    expect(automap?.textContent).toBe('Asignar columnas compatibles');
    act(() => {
      fireEvent.click(automap!);
    });
    expect(onAutomap).toHaveBeenCalledTimes(1);
  });

  it('renders only target ports for terminal output columns', () => {
    act(() => {
      root.render(
        <ReactFlowProvider>
          <GraphNodeColumnSection
            nodeId="sink"
            columns={[
              {
                id: 'order_id',
                name: 'order_id',
                type: 'integer',
                sourceHandleId: 'column:source:sink:order_id',
                targetHandleId: 'column:target:sink:order_id',
              },
            ]}
            portDirections={['target']}
            onColumnPortActivate={vi.fn()}
          />
        </ReactFlowProvider>
      );
    });

    act(() => {
      fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-slot="graph-node-column-toggle"]')!
      );
    });

    const handles = container.querySelectorAll<HTMLElement>(
      '[data-slot="canvas-node-port-handle"]'
    );
    expect(handles).toHaveLength(1);
    expect(handles[0]?.getAttribute('data-port')).toBe('target');
    expect(handles[0]?.getAttribute('aria-label')).toBe('Asignar a order_id');
  });
});
