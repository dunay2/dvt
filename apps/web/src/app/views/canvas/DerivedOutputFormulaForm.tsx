/** One text draft submitted through the existing revision-bound command. */
import { useId, useMemo, useState, type FormEvent } from 'react';
import { DvtSemanticFieldNameV1Schema } from '@dvt/contracts';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  formatCanvasTransformDependencyError,
  type CanvasSemanticEditorCopy,
} from './canvasSemanticEditorCopy';
import type { DerivedOutputField } from './canvasFormulaAssist';
import { formulaSuggestions, projectFormulaFeedback } from './canvasFormulaAssist';
import { DerivedOutputFormulaEditor } from './DerivedOutputFormulaEditor';
import { DerivedOutputFormulaFeedback } from './DerivedOutputFormulaFeedback';

export type DerivedOutputFormulaDragScope = Readonly<{
  rootId: string;
  revision: number;
  references: readonly Readonly<{ relationId: string; fieldId: string; name: string }>[];
}>;

export function DerivedOutputFormulaForm({
  initial,
  fields,
  provider,
  dragScope,
  unavailableAliases,
  copy,
  onSubmit,
  onCancel,
}: Readonly<{
  initial?: Readonly<{ alias: string; formula: string }>;
  fields: readonly DerivedOutputField[];
  provider: string;
  dragScope: DerivedOutputFormulaDragScope;
  unavailableAliases: readonly string[];
  copy: CanvasSemanticEditorCopy['derivedOutput'];
  onSubmit: (request: Readonly<{ alias: string; formula: string }>) => Promise<string | null>;
  onCancel: () => void;
}>): JSX.Element {
  const [alias, setAlias] = useState(initial?.alias ?? '');
  const reasonId = useId();
  const [formula, setFormula] = useState(initial?.formula ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const feedback = useMemo(() => {
    const result = projectFormulaFeedback(formula, fields, provider);
    return !result.ok && 'error' in result
      ? {
          ...result,
          message:
            formatCanvasTransformDependencyError(result.error, { derivedOutput: copy }) ??
            result.message,
        }
      : result;
  }, [formula, fields, provider, copy]);
  const suggestions = useMemo(() => formulaSuggestions(fields, provider), [fields, provider]);
  const aliasError =
    alias.trim() === ''
      ? copy.aliasRequired
      : !DvtSemanticFieldNameV1Schema.safeParse(alias.trim()).success
        ? copy.aliasInvalid
        : unavailableAliases.includes(alias.trim())
          ? copy.aliasConflict
          : null;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (alias.trim() === '' || aliasError != null) {
      setError(aliasError ?? copy.aliasInvalid);
      return;
    }
    if (!feedback.ok) {
      setError(feedback.message);
      return;
    }
    setBusy(true);
    try {
      const failure = await onSubmit({ alias: alias.trim(), formula });
      setError(failure);
      if (failure == null) onCancel();
    } catch (cause) {
      setError(formatCanvasTransformDependencyError(cause, { derivedOutput: copy }) ?? copy.failed);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form
      data-slot="canvas-derived-output-form"
      className="formula-form"
      aria-busy={busy}
      onSubmit={(event) => void submit(event)}
      onKeyDown={(event) => {
        // Monaco owns Escape while its completion widget is open.
        if (event.key === 'Escape' && !event.defaultPrevented && !busy) {
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
          aria-invalid={aliasError != null}
          aria-describedby={reasonId}
          onChange={(event) => {
            setAlias(event.currentTarget.value);
            setError(null);
          }}
        />
      </label>
      <DerivedOutputFormulaEditor
        formula={formula}
        suggestions={suggestions}
        dragScope={dragScope}
        copy={copy}
        disabled={busy}
        diagnostic={formula.trim() !== '' && !feedback.ok ? feedback.message : undefined}
        onChange={(value) => {
          setFormula(value);
          setError(null);
        }}
        onInvalidDrop={() => setError(copy.formulaInvalid)}
      />
      <DerivedOutputFormulaFeedback feedback={feedback} copy={copy} empty={formula.trim() === ''} />
      <div className="formula-actions">
        <p
          id={reasonId}
          role={error != null || aliasError != null ? 'alert' : 'status'}
          className="formula-save-reason"
        >
          {error ?? aliasError ?? (!feedback.ok ? copy.formulaInvalid : copy.applyHint)}
        </p>
        <div className="formula-action-buttons">
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
            disabled={busy || alias.trim() === '' || aliasError != null || !feedback.ok}
          >
            {initial == null ? copy.save : copy.update}
          </Button>
        </div>
      </div>
    </form>
  );
}
