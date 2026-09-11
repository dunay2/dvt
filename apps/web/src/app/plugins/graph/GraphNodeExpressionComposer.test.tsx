// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resolveGraphNodeCardCopy } from './graphNodeCardCopyTokens';
import { GraphNodeExpressionComposer } from './GraphNodeExpressionComposer';

describe('GraphNodeExpressionComposer', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    document
      .querySelectorAll('[data-slot="popover-content"]')
      .forEach((element) => element.remove());
    container.remove();
  });

  it('adds, reorders, and removes FieldId operands within the admitted bounds', async () => {
    const onApply = vi
      .fn()
      .mockReturnValueOnce({ outcome: 'rejected' })
      .mockReturnValueOnce({ outcome: 'applied', createdFieldId: 'field:derived' });
    const onApplied = vi.fn();
    const onCancel = vi.fn();

    await act(async () => {
      root.render(
        <GraphNodeExpressionComposer
          nodeId="model"
          columnId="field:a"
          functions={[
            {
              capabilityId: 'capability:combine',
              name: 'combine',
              minimumArgumentCount: 1,
              maximumArgumentCount: 3,
            },
          ]}
          initialCapabilityId="capability:combine"
          initialOperandFieldIds={['field:a', 'field:b']}
          operandCandidates={[
            { id: 'field:a', name: 'a', type: 'text' },
            { id: 'field:b', name: 'b', type: 'text' },
            { id: 'field:c', name: 'c', type: 'text' },
          ]}
          unavailableAliases={[]}
          copy={resolveGraphNodeCardCopy('en')}
          onApply={onApply}
          onApplied={onApplied}
          onCancel={onCancel}
        />
      );
      await Promise.resolve();
    });

    const composer = document.body.querySelector<HTMLElement>(
      '[data-slot="graph-node-expression-composer"]'
    )!;
    const alias = composer.querySelector<HTMLInputElement>(
      '[data-slot="graph-node-column-function-alias-input"]'
    )!;
    expect(document.activeElement).toBe(alias);
    expect(composer.textContent).toContain('COMBINE(a, b)');

    await act(async () => {
      fireEvent.click(
        composer.querySelector<HTMLButtonElement>(
          '[data-slot="graph-node-expression-add-operand"]'
        )!
      );
    });
    expect(composer.querySelectorAll('[data-slot="graph-node-expression-operand"]')).toHaveLength(
      3
    );
    expect(composer.textContent).toContain('COMBINE(a, b, c)');

    await act(async () => {
      fireEvent.click(
        composer.querySelectorAll<HTMLButtonElement>(
          '[data-slot="graph-node-expression-move-up"]'
        )[2]!
      );
    });
    expect(composer.textContent).toContain('COMBINE(a, c, b)');

    await act(async () => {
      fireEvent.click(
        composer.querySelectorAll<HTMLButtonElement>(
          '[data-slot="graph-node-expression-remove"]'
        )[2]!
      );
      fireEvent.input(alias, { target: { value: 'combined' } });
      fireEvent.submit(composer.querySelector('form')!);
    });

    expect(onApply).toHaveBeenLastCalledWith({
      nodeId: 'model',
      columnId: 'field:a',
      capabilityId: 'capability:combine',
      alias: 'combined',
      operandFieldIds: ['field:a', 'field:c'],
    });
    expect(
      document.body.querySelector('[data-slot="graph-node-expression-composer"]')
    ).not.toBeNull();
    expect(composer.querySelector('[role="alert"]')?.textContent).toContain('could not be created');

    await act(async () => {
      fireEvent.submit(composer.querySelector('form')!);
    });
    expect(onApplied).toHaveBeenCalledWith('field:derived');
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('updates function, operands, and preview as one accessible proposal', async () => {
    const onApply = vi.fn().mockReturnValue({ outcome: 'rejected' });

    await act(async () => {
      root.render(
        <GraphNodeExpressionComposer
          nodeId="model"
          columnId="field:a"
          functions={[
            {
              capabilityId: 'capability:concat',
              name: 'concat',
              minimumArgumentCount: 2,
              maximumArgumentCount: 2,
            },
            {
              capabilityId: 'capability:upper',
              name: 'upper',
              minimumArgumentCount: 1,
              maximumArgumentCount: 1,
              expressionTemplate: 'UPPER({column})',
            },
          ]}
          initialCapabilityId="capability:concat"
          initialOperandFieldIds={['field:a', 'field:b']}
          operandCandidates={[
            { id: 'field:a', name: 'a', type: 'text' },
            { id: 'field:b', name: 'b', type: 'text' },
            { id: 'field:amount', name: 'amount', type: 'integer' },
          ]}
          resolveCompositionFunctions={({ sourceType }) =>
            sourceType === 'text'
              ? [
                  {
                    capabilityId: 'capability:concat',
                    name: 'concat',
                    minimumArgumentCount: 2,
                    maximumArgumentCount: 2,
                  },
                  {
                    capabilityId: 'capability:upper',
                    name: 'upper',
                    minimumArgumentCount: 1,
                    maximumArgumentCount: 1,
                  },
                ]
              : []
          }
          unavailableAliases={['existing']}
          copy={resolveGraphNodeCardCopy('en')}
          onApply={onApply}
          onCancel={vi.fn()}
        />
      );
      await Promise.resolve();
    });

    const composer = document.body.querySelector<HTMLElement>(
      '[data-slot="graph-node-expression-composer"]'
    )!;
    expect(composer.querySelector('option[value="field:amount"]')).toBeNull();
    await act(async () => {
      fireEvent.change(composer.querySelector<HTMLSelectElement>('select[name="capabilityId"]')!, {
        target: { value: 'capability:upper' },
      });
    });
    expect(composer.querySelectorAll('[data-slot="graph-node-expression-operand"]')).toHaveLength(
      1
    );
    expect(composer.textContent).toContain('UPPER(a)');
    expect(
      composer.querySelector<HTMLButtonElement>('[data-slot="graph-node-expression-add-operand"]')
        ?.disabled
    ).toBe(true);

    const alias = composer.querySelector<HTMLInputElement>(
      '[data-slot="graph-node-column-function-alias-input"]'
    )!;
    await act(async () => {
      fireEvent.input(alias, { target: { value: 'existing' } });
    });
    expect(alias.getAttribute('aria-invalid')).toBe('true');
    expect(alias.getAttribute('aria-describedby')).toBe(
      composer.querySelector('[role="alert"]')?.id
    );
    expect(
      composer.querySelector<HTMLButtonElement>(
        '[data-slot="graph-node-column-function-alias-submit"]'
      )?.disabled
    ).toBe(true);
    expect(onApply).not.toHaveBeenCalled();
  });
});
