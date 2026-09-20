/** Owned concern: discardable form state and dispatch to the existing draft command owner. */
import { useState } from 'react';
import { SortField_SortDirection } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import type { DvtSubstraitSortKey } from '@dvt/postgres-projection';
import { useApplicationLanguageStore } from '../../../stores/applicationLanguageStore';
import type { DvtSubstraitProjectionDraft } from '../canvasDvtSubstraitProjection';
import type { CanvasRelationalOperatorTool } from '../canvasRelationalTreeOperatorModel';
import { applyCanvasRelationalOperatorTool } from '../canvasRelationalTreeOperatorCommands';
import { operatorFormCopy } from './operatorFormCopy';

export type OperatorFormValues = Readonly<{
  fieldId: string;
  alias: string;
  value: string;
  capabilityId: string;
  sortKeys: readonly DvtSubstraitSortKey[];
  offset: string;
  count: string;
}>;

export function useOperatorForm({
  tool,
  draft,
  onChange,
  onClose,
  targetRelationId,
}: Readonly<{
  tool: CanvasRelationalOperatorTool;
  draft: DvtSubstraitProjectionDraft;
  onChange: (draft: DvtSubstraitProjectionDraft) => void;
  onClose: () => void;
  targetRelationId?: string;
}>) {
  const language = useApplicationLanguageStore((state) => state.language);
  const [values, setValues] = useState<OperatorFormValues>(() => ({
    fieldId: tool.fieldId ?? tool.fields[0]?.fieldId ?? '',
    alias: tool.alias ?? (tool.id === 'window' ? 'row_number' : 'total'),
    value: tool.value ?? '',
    capabilityId: tool.capabilityId ?? tool.comparisons?.[0]?.capabilityId ?? '',
    sortKeys: tool.sortKeys?.length
      ? [...tool.sortKeys]
      : tool.fields[0] == null
        ? []
        : [
            {
              fieldId: tool.fields[0].fieldId,
              direction: SortField_SortDirection.ASC_NULLS_LAST,
            },
          ],
    offset: tool.offset == null ? '' : String(tool.offset),
    count: tool.count == null ? '' : String(tool.count),
  }));
  const [error, setError] = useState(false);
  const commit = (remove = false) => {
    let offset: bigint | undefined;
    let count: bigint | undefined;
    try {
      offset = values.offset.trim() === '' ? undefined : BigInt(values.offset);
      count = values.count.trim() === '' ? undefined : BigInt(values.count);
    } catch {
      setError(true);
      return;
    }
    const next = applyCanvasRelationalOperatorTool(draft, {
      ...values,
      tool: tool.id,
      offset,
      count,
      targetRelationId,
      remove,
    });
    if (next === draft) {
      setError(true);
      return;
    }
    onChange(next);
    onClose();
  };
  return {
    values,
    error,
    copy: operatorFormCopy[language],
    change: (patch: Partial<OperatorFormValues>) =>
      setValues((current) => ({ ...current, ...patch })),
    submit: () => commit(),
    remove: () => commit(true),
    cancel: onClose,
  };
}

export type OperatorFormModel = ReturnType<typeof useOperatorForm>;
