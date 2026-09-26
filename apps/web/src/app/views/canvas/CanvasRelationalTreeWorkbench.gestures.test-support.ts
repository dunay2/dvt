/** Public gestures: instantiate, connect, then explicitly choose semantic work. */
import { act } from 'react';
import { fireEvent } from '@testing-library/dom';
import { container, dragSourceTo } from './CanvasRelationalTreeWorkbench.test-support';
import { openOperationMenu } from './operation-menu/operationMenu.test-support';

export async function connectWorkbenchSource(source: HTMLElement): Promise<void> {
  await act(async () =>
    dragSourceTo(
      source,
      container.querySelector<HTMLElement>(
        '[data-slot="canvas-relational-tree-draft-viewport"], [data-slot="canvas-relational-tree-viewport"]'
      )!
    )
  );
  await act(async () =>
    container.querySelector<HTMLButtonElement>('[data-slot="source-occurrence-connect"]')!.click()
  );
}

export async function selectWorkbenchOperation(
  operation: 'projection' | 'inner-join' | 'cross-join'
): Promise<void> {
  openOperationMenu(container);
  await act(async () =>
    document
      .querySelector<HTMLButtonElement>(`[data-slot="dvt-select-operation-${operation}"]`)!
      .click()
  );
}

export async function appendWorkbenchJoin(): Promise<void> {
  for (const field of container.querySelectorAll<HTMLSelectElement>(
    '[data-slot="canvas-relational-tree-existing-field"], [data-slot="canvas-relational-tree-connected-field"]'
  )) {
    await act(async () =>
      fireEvent.change(field, {
        target: { value: [...field.options].find((option) => option.value !== '')!.value },
      })
    );
  }
  await act(async () =>
    container
      .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-append-input"]')!
      .click()
  );
}
