// @vitest-environment jsdom
import { JoinRel_JoinType } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import { inspectDvtSubstraitJoinDraft } from '@dvt/postgres-projection';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import { DvtSubstraitCompositionStartSection } from './DvtSubstraitCompositionStartSection';
import { describe, expect, it, vi } from 'vitest';
import {
  input,
  useCompositionStartHarness,
} from './DvtSubstraitCompositionStartSection.test-support';
describe('Composition start join', () => {
  const view = useCompositionStartHarness();
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
    async (operation, joinType, nullExtendedInputs, retainedInputIndex) => {
      const onStartInnerJoin = vi.fn();
      const required = (nodeId: string, table: string): CanvasDvtCompositionInput => {
        const candidate = input(nodeId, table);
        return {
          ...candidate,
          fields: candidate.fields.map((field) => ({ ...field, nullable: false })),
        };
      };
      await act(async () => {
        view.root.render(
          <DvtSubstraitCompositionStartSection
            disabled={false}
            inputs={[required('orders', 'orders'), required('customers', 'customers')]}
            onStartInnerJoin={onStartInnerJoin}
          />
        );
      });

      await act(async () => {
        fireEvent.click(
          view.container.querySelector<HTMLButtonElement>(
            `[data-slot="dvt-select-operation-${operation.replaceAll('_', '-')}"]`
          )!
        );
      });
      await act(async () => {
        fireEvent.click(
          view.container.querySelector<HTMLButtonElement>(
            `[data-slot="dvt-start-configured-${operation.replaceAll('_', '-')}"]`
          )!
        );
      });

      expect(onStartInnerJoin).toHaveBeenCalledOnce();
      expect(onStartInnerJoin.mock.calls[0]?.[1]).toBe(operation);
      const inspection = inspectDvtSubstraitJoinDraft(
        onStartInnerJoin.mock.calls[0]?.[0] as SubstraitDocument
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
  it('seeds the first JOIN with a matching admitted non-string type', async () => {
    const onStartInnerJoin = vi.fn();
    await act(async () => {
      view.root.render(
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

    await act(async () => {
      fireEvent.click(
        view.container.querySelector<HTMLButtonElement>(
          '[data-slot="dvt-select-operation-inner-join"]'
        )!
      );
    });
    await act(async () => {
      fireEvent.click(
        view.container.querySelector<HTMLButtonElement>(
          '[data-slot="dvt-start-configured-inner-join"]'
        )!
      );
    });

    expect(onStartInnerJoin).toHaveBeenCalledOnce();
    const inspection = inspectDvtSubstraitJoinDraft(
      onStartInnerJoin.mock.calls[0]?.[0] as SubstraitDocument
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
});
