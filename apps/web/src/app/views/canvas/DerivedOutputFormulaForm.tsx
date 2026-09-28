/** One local name/visual-formula draft. Typing never mutates the semantic document. */
import { useId, useState, type FormEvent } from 'react';
import { DvtSemanticFieldNameV1Schema } from '@dvt/contracts';

import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import type { CanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import { DerivedOutputFormulaBuilder } from './DerivedOutputFormulaBuilder';
import type { DerivedOutputField } from './DerivedOutputOperands';
import {
  defaultDerivedOutputVisualFormula,
  parseDerivedOutputVisualFormula,
  validateDerivedOutputVisualFormula,
  type DerivedOutputVisualFormula,
} from './canvasDerivedOutputVisualFormula';

function initialExpression(args: Readonly<{
  formula?: string;
  fields: readonly DerivedOutputField[];
  provider: string;
}>): Readonly<{ expression: DerivedOutputVisualFormula; parseFailed: boolean }> {
  if (args.formula == null) {
    return { expression: defaultDerivedOutputVisualFormula(args.fields), parseFailed: false };
  }
  try {
    return {
      expression: parseDerivedOutputVisualFormula({
        formula: args.formula,
        fields: args.fields,
        provider: args.provider,
      }),
      parseFailed: false,
    };
  } catch {
    return { expression: defaultDerivedOutputVisualFormula(args.fields), parseFailed: true };
  }
}

export function DerivedOutputFormulaForm({
  initial,
  fields,
  provider,
  unavailableAliases,
  copy,
  onSubmit,
  onCancel,
}: Readonly<{
  initial?: Readonly<{ alias: string; formula: string }>;
  fields: readonly DerivedOutputField[];
  provider: string;
  unavailableAliases: readonly string[];
  copy: CanvasSemanticEditorCopy['derivedOutput'];
  onSubmit: (request: Readonly<{ alias: string; formula: string }>) => Promise<string | null>;
  onCancel: () => void;
}>): JSX.Element {
  const initialDraft = initialExpression({ formula: initial?.formula, fields, provider });
  const [alias, setAlias] = useState(initial?.alias ?? '');
  const [expression, setExpression] = useState(initialDraft.expression);
  const [parseFailed, setParseFailed] = useState(initialDraft.parseFailed);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = useId();
  const validation = validateDerivedOutputVisualFormula({ expression, fields, provider });
  const formulaInvalid = parseFailed || !validation.ok;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (!DvtSemanticFieldNameV1Schema.safeParse(alias.trim()).success) {
      setError(copy.aliasInvalid);
      return;
    }
    if (unavailableAliases.includes(alias.trim())) {
      setError(copy.aliasConflict);
      return;
    }
    if (formulaInvalid || !validation.ok) {
      setError(copy.formulaInvalid);
      return;
    }
    setBusy(true);
    try {
      const failure = await onSubmit({ alias: alias.trim(), formula: validation.formula });
      setError(failure);
      if (failure == null) onCancel();
    } catch {
      setError(copy.failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      data-slot="canvas-derived-output-form"
      className="space-y-3"
      aria-busy={busy}
      onSubmit={(event) => void submit(event)}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !busy) {
          event.stopPropagation();
          onCancel();
        }
      }}
    >
      <label className="block space-y-1 text-xs">
        <span>{copy.aliasLabel}</span>
        <Input
          name="alias"
          value={alias}
          autoFocus
          disabled={busy}
          onChange={(event) => {
            setAlias(event.currentTarget.value);
            setError(null);
          }}
        />
      </label>

      <DerivedOutputFormulaBuilder
        expression={expression}
        fields={fields}
        provider={provider}
        busy={busy}
        copy={copy}
        onChange={(next) => {
          setExpression(next);
          setParseFailed(false);
          setError(null);
        }}
      />

      <p id={id} className="text-xs text-(--text-muted)">
        {error ?? (formulaInvalid ? copy.formulaInvalid : copy.formulaHint)}
      </p>
      {error == null ? null : (
        <span role="alert" className="sr-only">
          {error}
        </span>
      )}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          data-slot="canvas-derived-output-cancel"
          onClick={onCancel}
          disabled={busy}
        >
          {copy.cancel}
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={busy || alias.trim() === '' || formulaInvalid}
        >
          {initial == null ? copy.save : copy.update}
        </Button>
      </div>
    </form>
  );
}
