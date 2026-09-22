// @vitest-environment jsdom

import { JoinRel_JoinType } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import {
  inspectDvtSubstraitJoinDraft,
  type DvtSubstraitJoinDraft,
} from './canvasDvtSubstraitJoinComposition';
import { canvasViewCopy } from './copy';
import { DvtSubstraitCompositionStartSection } from './DvtSubstraitCompositionStartSection';

function input(
  nodeId: string,
  table: string,
  dataType = 'text',
  joinDataType: CanvasDvtCompositionInput['fields'][number]['joinDataType'] = 'string'
): CanvasDvtCompositionInput {
  return {
    nodeId,
    schema: 'raw',
    table,
    sourceRef: {
      schemaVersion: 'connected-source-ref.v1',
      connectionRef: {
        schemaVersion: 'connection-ref.v1',
        provider: 'postgres',
        connectionId: 'warehouse-main',
      },
      sourceObjectId: `raw.${table}`,
    },
    fields: [{ name: 'id', dataType, joinDataType }],
  };
}

function inputOnConnection(
  nodeId: string,
  table: string,
  provider: 'postgres' | 'snowflake',
  connectionId: string
): CanvasDvtCompositionInput {
  const value = input(nodeId, table);
  return {
    ...value,
    sourceRef: {
      ...value.sourceRef,
      connectionRef: { ...value.sourceRef.connectionRef, provider, connectionId },
    },
  };
}

function buttonWithText(container: HTMLElement, text: string): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
    (candidate) => candidate.textContent?.trim() === text
  );
  if (button == null) throw new Error(`Expected button '${text}'.`);
  return button;
}

describe('DvtSubstraitCompositionStartSection', () => {
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

  it('separates operation choice from predicate authoring and explicit apply', () => {
    const onStartInnerJoin = vi.fn();
    const onStartUnionAll = vi.fn();
    act(() => {
      root.render(
        <DvtSubstraitCompositionStartSection
          disabled={false}
          inputs={[input('orders', 'orders'), input('customers', 'customers')]}
          onStartInnerJoin={onStartInnerJoin}
          onStartUnionAll={onStartUnionAll}
        />
      );
    });

    expect(
      container.querySelector('[data-slot="dvt-relational-operation-chooser"]')
    ).not.toBeNull();
    expect(container.querySelector('[data-slot="dvt-composition-left-input"]')).toBeNull();
    expect(onStartInnerJoin).not.toHaveBeenCalled();

    act(() => {
      fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-slot="dvt-select-operation-inner-join"]')!
      );
    });

    expect(container.querySelector('[data-slot="dvt-composition-left-input"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="dvt-composition-right-input"]')).not.toBeNull();
    const joinEditor = container.querySelector('[data-slot="dvt-substrait-inner-join-start"]');
    expect(joinEditor).not.toBeNull();
    expect(joinEditor?.className).not.toContain('border-t');
    expect(
      container.querySelector('[data-slot="semantic-workbench-join-condition-list"]')
    ).not.toBeNull();
    expect(onStartInnerJoin).not.toHaveBeenCalled();

    act(() => {
      fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-slot="dvt-cancel-relational-operation"]')!
      );
    });
    expect(container.querySelector('[data-slot="dvt-composition-left-input"]')).toBeNull();
    expect(onStartInnerJoin).not.toHaveBeenCalled();
    expect(onStartUnionAll).not.toHaveBeenCalled();
  });

  it('applies UNION ALL without manufacturing a field predicate', () => {
    const onStartInnerJoin = vi.fn();
    const onStartUnionAll = vi.fn();
    act(() => {
      root.render(
        <DvtSubstraitCompositionStartSection
          disabled={false}
          inputs={[input('north', 'customers_north'), input('south', 'customers_south')]}
          onStartInnerJoin={onStartInnerJoin}
          onStartUnionAll={onStartUnionAll}
        />
      );
    });

    const unionAllOperation = container.querySelector<HTMLButtonElement>(
      '[data-slot="dvt-select-operation-union-all"]'
    )!;
    expect(unionAllOperation.textContent).toContain('UNION ALL');

    act(() => {
      fireEvent.click(unionAllOperation);
    });
    expect(container.querySelector('[data-slot="dvt-composition-left-input"]')).toBeNull();
    expect(onStartUnionAll).not.toHaveBeenCalled();

    act(() => {
      fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-slot="dvt-start-connected-union-all"]')!
      );
    });
    expect(onStartUnionAll).toHaveBeenCalledOnce();
    expect(onStartInnerJoin).not.toHaveBeenCalled();
  });

  it('applies UNION DISTINCT through its exact SetRel choice', () => {
    const onStartUnionDistinct = vi.fn();
    act(() => {
      root.render(
        <DvtSubstraitCompositionStartSection
          disabled={false}
          inputs={[input('north', 'customers_north'), input('south', 'customers_south')]}
          onStartInnerJoin={vi.fn()}
          onStartUnionDistinct={onStartUnionDistinct}
        />
      );
    });

    const operation = container.querySelector<HTMLButtonElement>(
      '[data-slot="dvt-select-operation-union-distinct"]'
    )!;
    expect(operation.textContent).toContain('UNION');
    expect(operation.textContent).not.toContain('ALL');

    act(() => {
      fireEvent.click(operation);
    });
    expect(container.textContent).toContain(
      'raw.customers_north UNION DISTINCT raw.customers_south'
    );
    expect(onStartUnionDistinct).not.toHaveBeenCalled();

    act(() => {
      fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-slot="dvt-start-connected-union-all"]')!
      );
    });
    expect(onStartUnionDistinct).toHaveBeenCalledOnce();
  });

  it.each([
    ['intersect-distinct', 'INTERSECT', 'onStartIntersectDistinct'],
    ['except-distinct', 'EXCEPT', 'onStartExceptDistinct'],
    ['intersect-all', 'INTERSECT ALL', 'onStartIntersectAll'],
    ['except-all', 'EXCEPT ALL', 'onStartExceptAll'],
  ] as const)('applies %s through its exact SetRel choice', (slot, label, callbackName) => {
    const callback = vi.fn();
    act(() => {
      root.render(
        <DvtSubstraitCompositionStartSection
          disabled={false}
          inputs={[input('north', 'customers_north'), input('south', 'customers_south')]}
          onStartInnerJoin={vi.fn()}
          {...{ [callbackName]: callback }}
        />
      );
    });

    const operation = container.querySelector<HTMLButtonElement>(
      `[data-slot="dvt-select-operation-${slot}"]`
    )!;
    expect(operation.textContent).toContain(label);
    act(() => {
      fireEvent.click(operation);
    });
    expect(container.textContent).toContain(`raw.customers_north ${label} raw.customers_south`);
    expect(callback).not.toHaveBeenCalled();
    act(() => {
      fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-slot="dvt-start-connected-union-all"]')!
      );
    });
    expect(callback).toHaveBeenCalledOnce();
  });

  it.each([
    ['left_join', JoinRel_JoinType.LEFT, [1], null],
    ['right_join', JoinRel_JoinType.RIGHT, [0], null],
    ['full_outer_join', JoinRel_JoinType.OUTER, [0, 1], null],
    ['left_semi_join', JoinRel_JoinType.LEFT_SEMI, [], 0],
    ['left_anti_join', JoinRel_JoinType.LEFT_ANTI, [], 0],
    ['right_semi_join', JoinRel_JoinType.RIGHT_SEMI, [], 1],
    ['right_anti_join', JoinRel_JoinType.RIGHT_ANTI, [], 1],
  ] as const)(
    'authors %s through the same canonical predicate flow',
    (operation, joinType, nullExtendedInputs, retainedInputIndex) => {
      const onStartInnerJoin = vi.fn();
      const required = (nodeId: string, table: string): CanvasDvtCompositionInput => {
        const candidate = input(nodeId, table);
        return {
          ...candidate,
          fields: candidate.fields.map((field) => ({ ...field, nullable: false })),
        };
      };
      act(() => {
        root.render(
          <DvtSubstraitCompositionStartSection
            disabled={false}
            inputs={[required('orders', 'orders'), required('customers', 'customers')]}
            onStartInnerJoin={onStartInnerJoin}
          />
        );
      });

      act(() => {
        fireEvent.click(
          container.querySelector<HTMLButtonElement>(
            `[data-slot="dvt-select-operation-${operation.replaceAll('_', '-')}"]`
          )!
        );
      });
      act(() => {
        fireEvent.click(
          container.querySelector<HTMLButtonElement>(
            `[data-slot="dvt-start-configured-${operation.replaceAll('_', '-')}"]`
          )!
        );
      });

      expect(onStartInnerJoin).toHaveBeenCalledOnce();
      expect(onStartInnerJoin.mock.calls[0]?.[1]).toBe(operation);
      const inspection = inspectDvtSubstraitJoinDraft(
        onStartInnerJoin.mock.calls[0]?.[0] as DvtSubstraitJoinDraft
      );
      expect(inspection.ok).toBe(true);
      if (!inspection.ok) return;
      expect(inspection.projection.joinRelations[0]?.joinType).toBe(joinType);
      const nullExtendedInputSet = new Set<number>(nullExtendedInputs);
      inspection.projection.outputs.forEach((output) => {
        expect(output.nullable).toBe(nullExtendedInputSet.has(output.source.inputIndex));
        if (retainedInputIndex != null) {
          expect(output.source.inputIndex).toBe(retainedInputIndex);
        }
      });
    }
  );

  it('seeds the first JOIN with a matching admitted non-string type', () => {
    const onStartInnerJoin = vi.fn();
    act(() => {
      root.render(
        <DvtSubstraitCompositionStartSection
          disabled={false}
          inputs={[
            input('orders', 'orders', 'bigint', 'i64'),
            input('customers', 'customers', 'int8', 'i64'),
          ]}
          onStartInnerJoin={onStartInnerJoin}
        />
      );
    });

    act(() => {
      fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-slot="dvt-select-operation-inner-join"]')!
      );
    });
    act(() => {
      fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-slot="dvt-start-configured-inner-join"]')!
      );
    });

    expect(onStartInnerJoin).toHaveBeenCalledOnce();
    const inspection = inspectDvtSubstraitJoinDraft(
      onStartInnerJoin.mock.calls[0]?.[0] as DvtSubstraitJoinDraft
    );
    expect(inspection.ok).toBe(true);
    if (!inspection.ok) return;
    expect(inspection.projection.inputs.map((candidate) => candidate.fields[0]?.dataType)).toEqual([
      'i64',
      'i64',
    ]);
    expect(inspection.projection.joins[0]?.conditions[0]).toMatchObject({
      left: { kind: 'field' },
      right: { kind: 'field' },
    });
  });

  it('opens a valid PostgreSQL pair when an earlier N-input candidate is target-incompatible', () => {
    act(() => {
      root.render(
        <DvtSubstraitCompositionStartSection
          disabled={false}
          inputs={[
            inputOnConnection('external', 'external', 'snowflake', 'external'),
            inputOnConnection('orders', 'orders', 'postgres', 'warehouse-main'),
            inputOnConnection('customers', 'customers', 'postgres', 'warehouse-main'),
          ]}
          onStartInnerJoin={vi.fn()}
        />
      );
    });

    act(() => {
      fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-slot="dvt-select-operation-inner-join"]')!
      );
    });

    const left = container.querySelector<HTMLSelectElement>(
      '[data-slot="dvt-composition-left-input"]'
    );
    const right = container.querySelector<HTMLSelectElement>(
      '[data-slot="dvt-composition-right-input"]'
    );
    expect(left?.value).toBe('orders');
    expect(right?.value).toBe('customers');
    expect(left?.textContent).not.toContain('external');
  });

  it('requires an explicit source pair when more than two JOIN inputs are compatible', async () => {
    const onStartInnerJoin = vi.fn();
    act(() => {
      root.render(
        <DvtSubstraitCompositionStartSection
          disabled={false}
          inputs={[
            input('orders', 'orders'),
            input('customers', 'customers'),
            input('shipments', 'shipments'),
          ]}
          onStartInnerJoin={onStartInnerJoin}
        />
      );
    });

    act(() => {
      fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-slot="dvt-select-operation-inner-join"]')!
      );
    });

    const left = container.querySelector<HTMLSelectElement>(
      '[data-slot="dvt-composition-left-input"]'
    )!;
    const right = container.querySelector<HTMLSelectElement>(
      '[data-slot="dvt-composition-right-input"]'
    )!;
    const apply = container.querySelector<HTMLButtonElement>(
      '[data-slot="dvt-start-configured-inner-join"]'
    )!;
    expect(left.value).toBe('');
    expect(right.value).toBe('');
    expect(right.disabled).toBe(true);
    expect(apply.disabled).toBe(true);
    expect(Array.from(left.options).map((option) => option.value)).toEqual([
      '',
      'orders',
      'customers',
      'shipments',
    ]);

    await act(() => fireEvent.change(left, { target: { value: 'customers' } }));
    expect(right.disabled).toBe(false);
    expect(right.value).toBe('');
    expect(Array.from(right.options).map((option) => option.value)).toEqual([
      '',
      'orders',
      'shipments',
    ]);
    await act(() => fireEvent.change(right, { target: { value: 'shipments' } }));

    expect(
      container.querySelector('[data-slot="semantic-workbench-join-condition-row"]')?.textContent
    ).toContain('raw.customers.id = raw.shipments.id');
    expect(apply.disabled).toBe(false);

    await act(() => fireEvent.click(apply));
    expect(onStartInnerJoin).toHaveBeenCalledOnce();
    const inspection = inspectDvtSubstraitJoinDraft(
      onStartInnerJoin.mock.calls[0]?.[0] as DvtSubstraitJoinDraft
    );
    expect(inspection.ok).toBe(true);
    if (!inspection.ok) return;
    expect(inspection.projection.inputs.map((candidate) => candidate.table)).toEqual([
      'customers',
      'shipments',
    ]);
  });

  it('keeps the operation explicit while carrying a cross-input field proposal into JOIN', () => {
    const onStartInnerJoin = vi.fn();
    const onClearPredicateSeed = vi.fn();
    const orders: CanvasDvtCompositionInput = {
      ...input('orders', 'orders'),
      fields: [
        { name: 'id', dataType: 'text', joinDataType: 'string' },
        { name: 'customer_id', dataType: 'text', joinDataType: 'string' },
      ],
    };
    const customers: CanvasDvtCompositionInput = {
      ...input('customers', 'customers'),
      fields: [
        { name: 'id', dataType: 'text', joinDataType: 'string' },
        { name: 'customer_id', dataType: 'text', joinDataType: 'string' },
      ],
    };
    const shipments = input('shipments', 'shipments');

    act(() => {
      root.render(
        <DvtSubstraitCompositionStartSection
          disabled={false}
          inputs={[orders, customers, shipments]}
          predicateSeed={{
            targetNodeId: 'model-1',
            left: {
              nodeId: 'orders',
              fieldId: 'orders-customer-id',
              fieldName: 'customer_id',
              dataType: 'string',
            },
            right: {
              nodeId: 'customers',
              fieldId: 'customers-customer-id',
              fieldName: 'customer_id',
              dataType: 'string',
            },
            candidateOperator: 'equal',
          }}
          onClearPredicateSeed={onClearPredicateSeed}
          onStartInnerJoin={onStartInnerJoin}
        />
      );
    });

    expect(
      container.querySelector('[data-slot="dvt-relational-operation-chooser"]')
    ).not.toBeNull();
    expect(
      container.querySelector('[data-slot="dvt-relational-predicate-proposal"]')?.textContent
    ).toContain('orders.customer_id = customers.customer_id');
    expect(
      container.querySelector('[data-slot="dvt-select-operation-inner-join"]')?.textContent
    ).toContain(canvasViewCopy.inspectorDvtRelationalAvailable);
    expect(onStartInnerJoin).not.toHaveBeenCalled();

    act(() => {
      fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-slot="dvt-select-operation-inner-join"]')!
      );
    });

    expect(
      container.querySelector<HTMLSelectElement>('[data-slot="dvt-composition-left-input"]')?.value
    ).toBe('orders');
    expect(
      container.querySelector<HTMLSelectElement>('[data-slot="dvt-composition-right-input"]')?.value
    ).toBe('customers');
    expect(
      container.querySelector('[data-slot="semantic-workbench-join-condition-row"]')?.textContent
    ).toContain('raw.orders.customer_id = raw.customers.customer_id');

    act(() => {
      fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-slot="dvt-cancel-relational-operation"]')!
      );
    });
    expect(onClearPredicateSeed).toHaveBeenCalledOnce();
    expect(onStartInnerJoin).not.toHaveBeenCalled();
  });

  it('does not advertise a stale predicate proposal as available', () => {
    act(() => {
      root.render(
        <DvtSubstraitCompositionStartSection
          disabled={false}
          inputs={[input('orders', 'orders'), input('customers', 'customers')]}
          predicateSeed={{
            targetNodeId: 'model-1',
            left: {
              nodeId: 'orders',
              fieldId: 'orders-id',
              fieldName: 'id',
              dataType: 'string',
            },
            right: {
              nodeId: 'customers',
              fieldId: 'customers-removed',
              fieldName: 'removed',
              dataType: 'string',
            },
            candidateOperator: 'equal',
          }}
          onStartInnerJoin={vi.fn()}
        />
      );
    });

    expect(container.querySelector('[data-slot="dvt-relational-predicate-proposal"]')).toBeNull();
    expect(
      container.querySelector('[data-slot="dvt-select-operation-inner-join"]')?.textContent
    ).toContain(canvasViewCopy.inspectorDvtRelationalNeedsPredicate);
  });

  it('edits the first JOIN with the canonical operand, function, comparison, and boolean grammar', () => {
    const onStartInnerJoin = vi.fn();
    act(() => {
      root.render(
        <DvtSubstraitCompositionStartSection
          disabled={false}
          inputs={[input('orders', 'orders'), input('customers', 'customers')]}
          onStartInnerJoin={onStartInnerJoin}
        />
      );
    });
    act(() => {
      fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-slot="dvt-select-operation-inner-join"]')!
      );
    });
    act(() => {
      fireEvent.click(
        container.querySelector<HTMLButtonElement>('[aria-label="Editar condición"]')!
      );
    });

    const rightKind = container.querySelector<HTMLSelectElement>(
      '[aria-label="Tipo del operando derecho"]'
    )!;
    const leftFunction = container.querySelector<HTMLSelectElement>(
      '[data-slot="semantic-workbench-join-izquierdo-operand"] [aria-label="Añadir función exterior al operando izquierdo"]'
    )!;
    const functionId = Array.from(leftFunction.options).find(
      (option) => option.value !== ''
    )?.value;
    expect(functionId).toBeTruthy();

    act(() => {
      fireEvent.change(rightKind, { target: { value: 'literal' } });
    });
    act(() => {
      fireEvent.input(
        container.querySelector<HTMLInputElement>(
          '[aria-label="Valor literal del operando derecho"]'
        )!,
        { target: { value: '1' } }
      );
      fireEvent.change(leftFunction, { target: { value: functionId } });
      fireEvent.change(
        container.querySelector<HTMLSelectElement>('[aria-label="Comparador de la condición"]')!,
        { target: { value: 'not_equal' } }
      );
    });
    act(() => {
      fireEvent.click(buttonWithText(container, 'Guardar condición'));
    });
    act(() => {
      fireEvent.click(
        container.querySelector<HTMLButtonElement>('[aria-label="Añadir condición"]')!
      );
    });
    act(() => {
      fireEvent.click(buttonWithText(container, 'Añadir condición'));
    });
    act(() => {
      fireEvent.click(
        container.querySelector<HTMLButtonElement>('[aria-label="Añadir condición"]')!
      );
    });
    act(() => {
      fireEvent.change(
        container.querySelector<HTMLSelectElement>('[aria-label="Conector de la condición"]')!,
        { target: { value: 'or' } }
      );
    });
    act(() => {
      fireEvent.click(
        container.querySelector<HTMLButtonElement>(
          '[data-slot="semantic-workbench-join-condition-editor"] [aria-pressed="false"]'
        )!
      );
    });
    expect(
      container.querySelector(
        '[data-slot="semantic-workbench-join-condition-editor"] [aria-pressed="true"]'
      )
    ).not.toBeNull();
    act(() => {
      fireEvent.click(buttonWithText(container, 'Añadir condición'));
    });
    act(() => {
      fireEvent.click(
        container.querySelector<HTMLButtonElement>('[aria-label="Añadir condición"]')!
      );
    });
    act(() => {
      fireEvent.change(
        container.querySelector<HTMLSelectElement>('[aria-label="Comparador de la condición"]')!,
        { target: { value: 'is_null' } }
      );
    });
    act(() => {
      fireEvent.click(buttonWithText(container, 'Añadir condición'));
    });
    act(() => {
      fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-slot="dvt-start-configured-inner-join"]')!
      );
    });

    expect(onStartInnerJoin).toHaveBeenCalledOnce();
    const draft = onStartInnerJoin.mock.calls[0]?.[0] as DvtSubstraitJoinDraft;
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
