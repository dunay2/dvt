/** Public gestures for explicit source, operation and port interactions. */
import { act } from 'react';
import { container, dragSourceTo } from './CanvasRelationalTreeWorkbench.test-support';
import { openOperationMenu } from './operation-menu/operationMenu.test-support';

export async function instantiateWorkbenchSource(source: HTMLElement): Promise<void> {
  await act(async () =>
    dragSourceTo(
      source,
      container.querySelector<HTMLElement>(
        '[data-slot="canvas-relational-tree-draft-viewport"], [data-slot="canvas-relational-tree-viewport"]'
      )!
    )
  );
}

export async function dropWorkbenchSource(sourceId: string, x = 400, y = 300): Promise<void> {
  const drop = new MouseEvent('drop', { bubbles: true, cancelable: true, clientX: x, clientY: y });
  Object.defineProperty(drop, 'dataTransfer', {
    value: {
      types: ['application/x-dvt-relational-source'],
      getData: (type: string) => (type === 'application/x-dvt-relational-source' ? sourceId : ''),
    },
  });
  await act(async () =>
    container
      .querySelector(
        '[data-slot="canvas-relational-tree-draft-viewport"], [data-slot="canvas-relational-tree-viewport"]'
      )!
      .dispatchEvent(drop)
  );
}

export async function stageWorkbenchOperation(
  operation: 'projection' | 'inner-join' | 'cross-join'
): Promise<void> {
  openOperationMenu(container);
  await act(async () =>
    document
      .querySelector<HTMLButtonElement>(`[data-slot="dvt-select-operation-${operation}"]`)!
      .click()
  );
}

export async function dragWorkbenchOperation(
  operation: 'transform' | 'inner-join' | 'cross-join' | 'aggregate'
): Promise<void> {
  openOperationMenu(container);
  const choiceName = operation === 'transform' ? 'field-transform' : operation;
  const choice = document.querySelector<HTMLElement>(
    `[data-slot="dvt-select-operation-${choiceName}"]`
  );
  const viewport = container.querySelector<HTMLElement>(
    '[data-slot="canvas-relational-tree-draft-viewport"], [data-slot="canvas-relational-tree-viewport"]'
  );
  if (choice == null || viewport == null)
    throw new Error('The operation choice and draft viewport must both be present.');
  const values = new Map<string, string>();
  const types: string[] = [];
  const dataTransfer = {
    effectAllowed: 'move',
    dropEffect: 'none',
    types,
    getData: (type: string) => values.get(type) ?? '',
    setData: (type: string, value: string) => {
      values.set(type, value);
      if (!types.includes(type)) types.push(type);
    },
  };
  await act(async () => {
    for (const [eventName, target] of [
      ['dragstart', choice],
      ['dragover', viewport],
      ['drop', viewport],
      ['dragend', choice],
    ] as const) {
      const event =
        eventName === 'drop'
          ? new MouseEvent(eventName, {
              bubbles: true,
              cancelable: true,
              clientX: 520,
              clientY: 260,
            })
          : new Event(eventName, { bubbles: true, cancelable: eventName !== 'dragend' });
      Object.defineProperty(event, 'dataTransfer', { value: dataTransfer });
      target.dispatchEvent(event);
    }
  });
}

export async function connectStagedWorkbenchBinaryOperation(): Promise<void> {
  const producers = Array.from(
    container.querySelectorAll<HTMLElement>('[data-slot="canvas-relational-output-port"]')
  ).filter((port) => port.parentElement?.querySelector('[data-operator="read"]') != null);
  const [left, right] = Array.from(
    container.querySelectorAll<HTMLElement>(
      '[data-pending-operation="true"] [data-slot="canvas-relational-input-port"]'
    )
  );
  if (producers.length < 2 || left == null || right == null)
    throw new Error('The staged binary operation does not expose its producer and Input ports.');
  await act(async () => dragSourceTo(producers[1]!, right));
  await act(async () => dragSourceTo(producers[0]!, left));
  await act(async () => Promise.resolve());
}

export async function connectStagedWorkbenchUnaryOperation(
  producer?: HTMLElement
): Promise<HTMLElement> {
  const operation = Array.from(
    container.querySelectorAll<HTMLElement>('[data-pending-operation="true"]')
  ).at(-1);
  const source =
    producer ??
    Array.from(
      container.querySelectorAll<HTMLElement>('[data-slot="canvas-relational-output-port"]')
    ).find(
      (port) =>
        port.parentElement?.querySelector('[data-pending="true"][data-operator="read"]') != null
    );
  const input = operation?.querySelector<HTMLElement>('[data-slot="canvas-relational-input-port"]');
  if (operation == null || source == null || input == null)
    throw new Error('The staged unary operation does not expose its producer and Input port.');
  await act(async () => dragSourceTo(source, input));
  await act(async () => Promise.resolve());
  return operation;
}

export async function connectWorkbenchOutput(
  host: HTMLElement,
  producer?: HTMLElement
): Promise<void> {
  const source =
    producer ??
    Array.from(
      host.querySelectorAll<HTMLElement>('[data-slot="canvas-relational-output-port"]')
    ).find((port) => {
      const card = port.parentElement;
      return (
        card?.hasAttribute('data-parent-locator') === false &&
        card.querySelector('[data-pending="true"]') == null
      );
    });
  const input = host.querySelector<HTMLElement>(
    '[data-slot="canvas-relational-output-input-port"]'
  );
  if (source == null || input == null)
    throw new Error('The producer and explicit Output Input port must both be present.');
  await act(async () => dragSourceTo(source, input));
  await act(async () => Promise.resolve());
}

export async function disconnectWorkbenchOutput(host: HTMLElement): Promise<void> {
  const edge = host.querySelector<SVGElement>('[data-slot="canvas-relational-output-edge-action"]');
  if (edge == null) throw new Error('The Output connection is not available.');
  await removeWorkbenchConnection(edge);
}

export async function removeWorkbenchConnection(edge: SVGElement): Promise<void> {
  await act(async () => edge.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  await act(async () =>
    edge.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }))
  );
}
