// @vitest-environment jsdom
import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { inspectDvtSubstraitJoinDraft } from '@dvt/postgres-projection';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import { DvtSubstraitCompositionStartSection } from './DvtSubstraitCompositionStartSection';
import { describe, expect, it, vi } from 'vitest';
import {
  input,
  buttonWithText,
  useCompositionStartHarness,
} from './DvtSubstraitCompositionStartSection.test-support';
describe('Composition start predicate', () => {
  const view = useCompositionStartHarness();
  it('edits the first JOIN with the canonical operand, function, comparison, and boolean grammar', async () => {
    const onStartInnerJoin = vi.fn();
    await act(async () => {
      view.root.render(
        <DvtSubstraitCompositionStartSection
          disabled={false}
          inputs={[input('orders', 'orders'), input('customers', 'customers')]}
          onStartInnerJoin={onStartInnerJoin}
        />
      );
    });
    await act(async () => {
      fireEvent.click(
        view.container.querySelector<HTMLButtonElement>(
          '[data-slot="dvt-select-operation-inner-join"]'
        )!
      );
    });
    await act(async () => {
      fireEvent.click(
        view.container.querySelector<HTMLButtonElement>('[aria-label="Editar condición"]')!
      );
    });

    const rightKind = view.container.querySelector<HTMLSelectElement>(
      '[aria-label="Tipo del operando derecho"]'
    )!;
    const leftFunction = view.container.querySelector<HTMLSelectElement>(
      '[data-slot="semantic-workbench-join-izquierdo-operand"] [aria-label="Añadir función exterior al operando izquierdo"]'
    )!;
    const functionId = Array.from(leftFunction.options).find(
      (option) => option.value !== ''
    )?.value;
    expect(functionId).toBeTruthy();

    await act(async () => {
      fireEvent.change(rightKind, { target: { value: 'literal' } });
    });
    await act(async () => {
      fireEvent.input(
        view.container.querySelector<HTMLInputElement>(
          '[aria-label="Valor literal del operando derecho"]'
        )!,
        { target: { value: '1' } }
      );
      fireEvent.change(leftFunction, { target: { value: functionId } });
      fireEvent.change(
        view.container.querySelector<HTMLSelectElement>(
          '[aria-label="Comparador de la condición"]'
        )!,
        { target: { value: 'not_equal' } }
      );
    });
    await act(async () => {
      fireEvent.click(buttonWithText(view.container, 'Guardar condición'));
    });
    await act(async () => {
      fireEvent.click(
        view.container.querySelector<HTMLButtonElement>('[aria-label="Añadir condición"]')!
      );
    });
    await act(async () => {
      fireEvent.click(buttonWithText(view.container, 'Añadir condición'));
    });
    await act(async () => {
      fireEvent.click(
        view.container.querySelector<HTMLButtonElement>('[aria-label="Añadir condición"]')!
      );
    });
    await act(async () => {
      fireEvent.change(
        view.container.querySelector<HTMLSelectElement>('[aria-label="Conector de la condición"]')!,
        { target: { value: 'or' } }
      );
    });
    await act(async () => {
      fireEvent.click(
        view.container.querySelector<HTMLButtonElement>(
          '[data-slot="semantic-workbench-join-condition-editor"] [aria-pressed="false"]'
        )!
      );
    });
    expect(
      view.container.querySelector(
        '[data-slot="semantic-workbench-join-condition-editor"] [aria-pressed="true"]'
      )
    ).not.toBeNull();
    await act(async () => {
      fireEvent.click(buttonWithText(view.container, 'Añadir condición'));
    });
    await act(async () => {
      fireEvent.click(
        view.container.querySelector<HTMLButtonElement>('[aria-label="Añadir condición"]')!
      );
    });
    await act(async () => {
      fireEvent.change(
        view.container.querySelector<HTMLSelectElement>(
          '[aria-label="Comparador de la condición"]'
        )!,
        { target: { value: 'is_null' } }
      );
    });
    await act(async () => {
      fireEvent.click(buttonWithText(view.container, 'Añadir condición'));
    });
    await act(async () => {
      fireEvent.click(
        view.container.querySelector<HTMLButtonElement>(
          '[data-slot="dvt-start-configured-inner-join"]'
        )!
      );
    });

    expect(onStartInnerJoin).toHaveBeenCalledOnce();
    const draft = onStartInnerJoin.mock.calls[0]?.[0] as SubstraitDocument;
    const inspection = inspectDvtSubstraitJoinDraft(draft);
    expect(inspection.ok).toBe(true);
    if (!inspection.ok) return;
    const conditions = inspection.projection.joins[0]?.conditions ?? [];
    expect(conditions).toHaveLength(3);
    expect(conditions[0]).toMatchObject({
      left: { kind: 'function', capabilityId: functionId },
      right: { kind: 'literal', literal: { dataType: 'string', value: '1' } },
      operator: 'not_equal',
    });
    expect(conditions[1]).toMatchObject({ kind: 'group', conditions: expect.any(Array) });
    if (conditions[1]?.kind !== 'group') return;
    expect(conditions[1].conditions).toHaveLength(2);
    expect(conditions[1].conditions[1]).toMatchObject({ combination: 'or' });
    expect(conditions[2]).toMatchObject({ operator: 'is_null' });
  });
});
