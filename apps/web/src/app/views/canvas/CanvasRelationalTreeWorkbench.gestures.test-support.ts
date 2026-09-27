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
