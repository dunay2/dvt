/** Visual scalar-expression builder over an ephemeral recursive draft. */
import { Plus } from 'lucide-react';

import {
  DerivedExpressionNodeEditor,
  collectDerivedExpressionFieldIds,
  formatDerivedExpression,
  type DerivedExpressionCopy,
  type DerivedExpressionDraft,
  type DerivedExpressionFunctionResolver,
} from './DerivedExpressionNodeEditor';
import type { DerivedOutputField } from './DerivedOutputOperands';

export function DerivedExpressionBuilder({
  expression,
  fields,
  resolveFunctions,
  allowLiterals,
  allowNested,
  busy,
  copy,
  onChange,
}: Readonly<{
  expression: DerivedExpressionDraft;
  fields: readonly DerivedOutputField[];
  resolveFunctions: DerivedExpressionFunctionResolver;
  allowLiterals: boolean;
  allowNested: boolean;
  busy: boolean;
  copy: DerivedExpressionCopy &
    Readonly<{
      formulaLabel?: string;
      wrapFunction?: string;
      previewLabel: string;
    }>;
  onChange: (expression: DerivedExpressionDraft) => void;
}>): JSX.Element {
  const fieldIds = collectDerivedExpressionFieldIds(expression);
  const wrapperCandidates =
    fieldIds.length === 0
      ? []
      : resolveFunctions([fieldIds[0]!], 'proposal').filter(
          (candidate) =>
            candidate.minimumArgumentCount === 1 && candidate.maximumArgumentCount === 1
        );

  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-semibold text-(--text-default)">
        {copy.formulaLabel ?? copy.previewLabel}
      </legend>
      <div data-slot="derived-expression-tree">
        <DerivedExpressionNodeEditor
          expression={expression}
          fields={fields}
          resolveFunctions={resolveFunctions}
          allowLiterals={allowLiterals}
          allowNested={allowNested}
          busy={busy}
          copy={copy}
          onChange={onChange}
        />
      </div>
      {allowNested && copy.wrapFunction != null && wrapperCandidates.length > 0 ? (
        <button
          type="button"
          data-slot="derived-expression-add-wrapper"
          disabled={busy}
          onClick={() =>
            onChange({
              kind: 'function',
              capabilityId: wrapperCandidates[0]!.capabilityId,
              arguments: [expression],
            })
          }
          className="flex items-center gap-1 text-xs text-(--status-info) disabled:opacity-40"
        >
          <Plus className="size-3" />
          {copy.wrapFunction}
        </button>
      ) : null}
      <div className="rounded border border-(--border-subtle) p-2 text-xs">
        <span className="text-(--text-muted)">{copy.previewLabel}</span>
        <code data-slot="graph-node-column-function-expression" className="mt-1 block">
          {formatDerivedExpression(expression, fields, resolveFunctions)}
        </code>
      </div>
    </fieldset>
  );
}
