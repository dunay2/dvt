/** Owned concern: discardable form state and dispatch to the existing draft command owner. */
import { useContext, useEffect, useRef, useState } from 'react';
import { SortField_SortDirection } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import type { DvtSubstraitSortKey } from '@dvt/postgres-projection';
import { useApplicationLanguageStore } from '../../../stores/applicationLanguageStore';
import type { DvtSubstraitProjectionDraft } from '../canvasDvtSubstraitProjection';
import type { CanvasRelationalOperatorTool } from './OperatorTool';
import { operatorFormCopy } from './operatorFormCopy';
import { CanvasRelationAnalysisContext } from '../CanvasRelationAnalysisContext';
import { applySelectedUnaryTool } from './applySelectedUnaryTool';
import { useRelationRemoval } from '../useRelationRemoval';

export type OperatorFormValues = Readonly<{
  fieldId: string;
  partitionFieldIds: readonly string[];
  alias: string;
  value: string;
  capabilityId: string;
  sortKeys: readonly DvtSubstraitSortKey[];
  offset: string;
  count: string;
}>;

export function useOperatorForm({
  tool,
  onChange,
  onClose,
  targetRelationId,
  onPendingChange,
}: Readonly<{
  tool: CanvasRelationalOperatorTool;
  draft: DvtSubstraitProjectionDraft;
  onChange: (draft: DvtSubstraitProjectionDraft) => void;
  onClose: () => void;
  targetRelationId?: string;
  onPendingChange?: (pending: boolean) => void;
}>) {
  const analysis = useContext(CanvasRelationAnalysisContext);
  const [revision] = useState(analysis?.revision);
  const lifetime = useRef(new AbortController());
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    return () => controller.abort();
  }, []);
  useEffect(() => () => onPendingChange?.(false), [onPendingChange]);
  const language = useApplicationLanguageStore((state) => state.language);
  const [values, setValues] = useState<OperatorFormValues>(() => ({
    fieldId: tool.fieldId ?? tool.fields[0]?.fieldId ?? '',
    partitionFieldIds: tool.partitionFieldIds ?? [],
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
  const removal = useRelationRemoval((next) => {
    onPendingChange?.(false);
    onChange(next);
    onClose();
  }, !busy);
  const commit = async () => {
    if (busy || analysis == null || revision == null || targetRelationId == null) return;
    setBusy(true);
    setError(false);
    const signal = lifetime.current.signal;
    try {
      const next = await applySelectedUnaryTool(analysis.session, {
        ...values,
        tool: tool.id,
        relationId: targetRelationId,
        expectedRevision: revision,
        intent: tool.active ? 'edit' : 'insert',
        signal,
      });
      signal.throwIfAborted();
      onPendingChange?.(false);
      onChange(next);
      onClose();
    } catch {
      if (!signal.aborted) setError(true);
    } finally {
      if (!signal.aborted) setBusy(false);
    }
  };
  return {
    values,
    error,
    busy,
    copy: operatorFormCopy[language],
    change: (patch: Partial<OperatorFormValues>) => {
      setValues((current) => ({ ...current, ...patch }));
      onPendingChange?.(true);
    },
    submit: () => {
      void commit();
    },
    removal,
    remove: () => {
      if (targetRelationId != null) removal.remove(targetRelationId);
    },
    cancel: () => {
      lifetime.current.abort();
      onPendingChange?.(false);
      onClose();
    },
  };
}

export type OperatorFormModel = ReturnType<typeof useOperatorForm>;
