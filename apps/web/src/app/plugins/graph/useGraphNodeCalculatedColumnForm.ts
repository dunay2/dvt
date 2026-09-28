/** Own calculated-column form state, submission and rejection focus. */
import { useId, useMemo, useRef, useState } from 'react';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { resolveGraphNodeCardCopy } from './graphNodeCardCopyTokens';
import type { GraphNodeColumnFunctionApplyResult } from './graphNodeColumnContracts';
import {
  calculatedColumnCommandError,
  calculatedColumnRequest,
  validateCalculatedColumnDraft,
  type CalculatedColumnDraft,
  type CalculatedColumnError,
  type GraphNodeCalculatedColumnFieldsModel,
  type GraphNodeCalculatedColumnFormProps,
} from './graphNodeCalculatedColumnFormModel';

type CalculatedColumnFormController = {
  open: boolean;
  onOpenChange: (nextOpen: boolean) => void;
  fields: GraphNodeCalculatedColumnFieldsModel;
};

export function useGraphNodeCalculatedColumnForm(
  props: GraphNodeCalculatedColumnFormProps
): CalculatedColumnFormController {
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = resolveGraphNodeCardCopy(language);
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(props.initialInputFieldId != null);
  const [draft, setDraft] = useState<CalculatedColumnDraft>({
    kind: 'field-ref',
    alias: '',
    value: '',
    inputFieldId:
      props.initialInputFieldId ?? props.inputColumns[0]?.id ?? props.inputColumns[0]?.name ?? '',
    capabilityId: '',
  });
  const [commandError, setCommandError] = useState<CalculatedColumnError | null>(null);
  const alias = useRef<HTMLInputElement>(null);
  const value = useRef<HTMLInputElement>(null);
  const input = useRef<HTMLSelectElement>(null);
  const refs = { alias, value, input };
  const errorId = useId();
  const functions = useMemo(
    () =>
      props.inputColumns.flatMap((column) =>
        (column.functionMenu?.items ?? []).map((item) => ({
          ...item,
          inputFieldId: column.id ?? column.name,
        }))
      ),
    [props.inputColumns]
  );
  const compatibleFunctions = functions.filter(
    (item) =>
      item.inputFieldId === draft.inputFieldId &&
      item.minimumArgumentCount === 1 &&
      item.maximumArgumentCount === 1
  );
  const selectedDraft = {
    ...draft,
    capabilityId: compatibleFunctions.some((item) => item.capabilityId === draft.capabilityId)
      ? draft.capabilityId
      : (compatibleFunctions[0]?.capabilityId ?? ''),
  };
  const validation = validateCalculatedColumnDraft(selectedDraft, copy);
  const cancel = (): void => {
    setOpen(false);
    props.onClose?.();
  };
  const submit: GraphNodeCalculatedColumnFieldsModel['submit'] = async (event) => {
    event.preventDefault();
    if (pending || !validation.canSubmit) return;
    setPending(true);
    let result: GraphNodeColumnFunctionApplyResult;
    try {
      const submitted = props.onSubmit(calculatedColumnRequest(props.nodeId, selectedDraft));
      result = 'outcome' in submitted ? submitted : await submitted;
    } catch {
      result = { outcome: 'rejected', reason: 'invalid_document' };
    }
    setPending(false);
    if (result.outcome === 'rejected') {
      const rejection = calculatedColumnCommandError(copy, result.reason, draft.kind);
      setCommandError(rejection);
      refs[rejection.field].current?.focus();
      return;
    }
    props.onApplied?.(result.createdFieldId);
    setDraft((current) => ({ ...current, alias: '', value: '' }));
    setCommandError(null);
    cancel();
  };
  return {
    open,
    onOpenChange: (nextOpen) => {
      setOpen(nextOpen);
      if (!nextOpen) {
        setCommandError(null);
        props.onClose?.();
      }
    },
    fields: {
      copy,
      draft: selectedDraft,
      inputColumns: props.inputColumns,
      functions: compatibleFunctions,
      error: validation.error ?? commandError,
      errorId,
      pending,
      canSubmit: validation.canSubmit,
      refs,
      change: (field, fieldValue) => {
        setDraft((current) => ({ ...current, [field]: fieldValue }));
        setCommandError(null);
      },
      submit,
      cancel,
    },
  };
}
