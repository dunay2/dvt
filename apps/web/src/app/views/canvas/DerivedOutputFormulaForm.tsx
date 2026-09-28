/** One local name/formula draft. Typing never mutates the semantic document. */
import { useId, useState, type FormEvent } from 'react';
import { DvtSemanticFieldNameV1Schema } from '@dvt/contracts';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Button } from '../../components/ui/button';
import type { CanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';

export function DerivedOutputFormulaForm({
  initial,
  unavailableAliases,
  copy,
  onSubmit,
  onCancel,
}: Readonly<{
  initial?: Readonly<{ alias: string; formula: string }>;
  unavailableAliases: readonly string[];
  copy: CanvasSemanticEditorCopy['derivedOutput'];
  onSubmit: (request: Readonly<{ alias: string; formula: string }>) => Promise<string | null>;
  onCancel: () => void;
}>): JSX.Element {
  const [alias, setAlias] = useState(initial?.alias ?? '');
  const [formula, setFormula] = useState(initial?.formula ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = useId();
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
    setBusy(true);
    try {
      const failure = await onSubmit({ alias: alias.trim(), formula });
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
      <label className="block space-y-1 text-xs">
        <span>{copy.formulaLabel}</span>
        <Textarea
          name="formula"
          className="font-mono"
          value={formula}
          disabled={busy}
          aria-describedby={id}
          aria-invalid={error == null ? undefined : true}
          onChange={(event) => {
            setFormula(event.currentTarget.value);
            setError(null);
          }}
        />
      </label>
      <p id={id} className="text-xs text-(--text-muted)">
        {error ?? copy.formulaHint}
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
          disabled={busy || alias.trim() === '' || formula.trim() === ''}
        >
          {initial == null ? copy.save : copy.update}
        </Button>
      </div>
    </form>
  );
}
