// @vitest-environment jsdom
import React, { act } from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, getByLabelText, getByText } from '@testing-library/dom';
import SemanticWorkbenchLab from './SemanticWorkbenchLab';
import {
  setupWorkbenchTest,
  root,
  container,
} from '../views/canvas/CanvasRelationalTreeWorkbench.test-support';

describe('production authoring in the local lab', () => {
  setupWorkbenchTest();
  it('edits a selected JOIN, applies the draft and reopens its condition', async () => {
    await act(async () => root.render(<SemanticWorkbenchLab />));
    const selectJoin = async () =>
      act(async () => {
        container
          .querySelector<HTMLButtonElement>(
            '[data-slot="canvas-relational-tree-node"][data-operator="join"]'
          )!
          .click();
      });
    await selectJoin();
    await act(async () =>
      fireEvent.change(getByLabelText(container, 'Comparador de la condición'), {
        target: { value: 'not_equal' },
      })
    );
    await act(async () => fireEvent.click(getByText(container, 'Guardar condición')));
    const apply = container.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-relational-tree-apply"]'
    )!;
    expect(apply.disabled).toBe(false);
    await act(async () => apply.click());
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.querySelector('[data-slot="canvas-relational-tree-apply"]')).toBeNull();
    await selectJoin();
    expect(
      (getByLabelText(container, 'Comparador de la condición') as HTMLSelectElement).value
    ).toBe('not_equal');
  });
});
