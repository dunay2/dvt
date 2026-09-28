/** Typed draft and command policy for the calculated-column editor. */
import {
  DvtStringLiteralV1Schema,
  DvtTimestampLiteralV1Schema,
  PostgresIdentifierV1Schema,
} from '@dvt/contracts';
import type { FormEvent, RefObject } from 'react';
import type {
  GraphNodeCalculatedColumnIdentity,
  GraphNodeColumn,
  GraphNodeColumnFunctionApplyResult,
} from './graphNodeColumnContracts';
import type { resolveGraphNodeCardCopy } from './graphNodeCardCopyTokens';

export type CalculationKind = GraphNodeCalculatedColumnIdentity['kind'];
export const CALCULATION_KINDS: readonly CalculationKind[] = [
  'field-ref',
  'string-literal',
  'timestamp-literal',
  'scalar-function',
  'row-number',
];
type Copy = ReturnType<typeof resolveGraphNodeCardCopy>;
export type CalculatedColumnError = Readonly<{
  field: 'alias' | 'value' | 'input';
  message: string;
}>;
export type CalculatedColumnDraft = {
  kind: CalculationKind;
  alias: string;
  value: string;
  inputFieldId: string;
  capabilityId: string;
};
export type GraphNodeCalculatedColumnFormProps = {
  nodeId: string;
  inputColumns: readonly GraphNodeColumn[];
  initialInputFieldId?: string;
  onClose?: () => void;
  onSubmit: (
    identity: GraphNodeCalculatedColumnIdentity
  ) => GraphNodeColumnFunctionApplyResult | Promise<GraphNodeColumnFunctionApplyResult>;
  onApplied?: (createdFieldId: string) => void;
};
export type GraphNodeCalculatedColumnFieldsModel = {
  copy: Copy;
  draft: CalculatedColumnDraft;
  inputColumns: readonly GraphNodeColumn[];
  functions: readonly { capabilityId: string; name: string }[];
  error: CalculatedColumnError | null;
  errorId: string;
  canSubmit: boolean;
  pending: boolean;
  refs: {
    alias: RefObject<HTMLInputElement>;
    value: RefObject<HTMLInputElement>;
    input: RefObject<HTMLSelectElement>;
  };
  change: <K extends keyof CalculatedColumnDraft>(
    field: K,
    value: CalculatedColumnDraft[K]
  ) => void;
  submit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  cancel: () => void;
};

export function validateCalculatedColumnDraft(
  draft: CalculatedColumnDraft,
  copy: Copy
): { canSubmit: boolean; error: CalculatedColumnError | null } {
  const { kind, alias, value, inputFieldId, capabilityId } = draft;
  const aliasValid = alias === alias.trim() && PostgresIdentifierV1Schema.safeParse(alias).success;
  const valueValid =
    kind === 'string-literal'
      ? DvtStringLiteralV1Schema.safeParse(value).success
      : kind === 'timestamp-literal'
        ? DvtTimestampLiteralV1Schema.safeParse(value).success
        : true;
  const error =
    alias.length > 0 && !aliasValid
      ? { field: 'alias' as const, message: copy.calculatedColumnIdentifierPolicyError }
      : kind === 'string-literal' && !valueValid
        ? { field: 'value' as const, message: copy.calculatedColumnLiteralPolicyError }
        : kind === 'timestamp-literal' && value.length > 0 && !valueValid
          ? { field: 'value' as const, message: copy.calculatedColumnTimestampPolicyError }
          : null;
  const hasSelection =
    kind === 'field-ref' || kind === 'row-number'
      ? inputFieldId.length > 0
      : kind === 'scalar-function'
        ? inputFieldId.length > 0 && capabilityId.length > 0
        : true;
  return { canSubmit: alias.trim().length > 0 && aliasValid && valueValid && hasSelection, error };
}

export function calculatedColumnRequest(
  nodeId: string,
  draft: CalculatedColumnDraft
): GraphNodeCalculatedColumnIdentity {
  const { kind, alias, value, inputFieldId, capabilityId } = draft;
  if (kind === 'field-ref') return { nodeId, kind, alias, inputFieldId };
  if (kind === 'string-literal' || kind === 'timestamp-literal') {
    return { nodeId, kind, alias, value };
  }
  if (kind === 'scalar-function') return { nodeId, kind, alias, inputFieldId, capabilityId };
  return { nodeId, kind, alias, orderFieldId: inputFieldId };
}

export function calculatedColumnCommandError(
  copy: Copy,
  reason: Extract<GraphNodeColumnFunctionApplyResult, { outcome: 'rejected' }>['reason'],
  kind: CalculationKind
): CalculatedColumnError {
  if (reason === 'duplicate_alias') {
    return { field: 'alias', message: copy.columnFunctionAliasConflictLabel };
  }
  if (reason === 'invalid_alias') {
    return { field: 'alias', message: copy.calculatedColumnIdentifierPolicyError };
  }
  if (reason === 'invalid_literal') {
    return {
      field: 'value',
      message:
        kind === 'timestamp-literal'
          ? copy.calculatedColumnTimestampPolicyError
          : copy.calculatedColumnLiteralPolicyError,
    };
  }
  if (reason === 'invalid_reference') {
    return { field: 'input', message: copy.columnAuthoringInvalidReferenceLabel };
  }
  return { field: 'alias', message: copy.expressionComposerRejectedLabel };
}
