/** One text draft; field drops insert admitted references, never a second expression AST. */
import { useId, useState, type FormEvent } from 'react';
import { DvtSemanticFieldNameV1Schema } from '@dvt/contracts';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import type { CanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import type { DerivedOutputField } from './DerivedOutputOperands';
import { validateDerivedOutputFormula } from './canvasDerivedOutputFormula';
import {
  CANVAS_RELATIONAL_FIELD_DRAG_TYPE,
  readCanvasRelationalFieldDrag,
} from './canvasRelationalTreeDrag';

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
  dragScope: Readonly<{
    rootId: string;
    revision: number;
    references: readonly Readonly<{ relationId: string; fieldId: string; name: string }>[];
  }>;
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
  const valid = validateDerivedOutputFormula({ formula, fields, provider });
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
    if (!valid) {
      setError(copy.formulaInvalid);
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
          value={formula}
          disabled={busy}
          spellCheck={false}
          aria-describedby={id}
          aria-invalid={formula.trim() !== '' && !valid}
          className="min-h-24 font-mono"
          onChange={(event) => {
            setFormula(event.currentTarget.value);
            setError(null);
          }}
          onDragOver={(event) => {
            if (busy || !event.dataTransfer.types.includes(CANVAS_RELATIONAL_FIELD_DRAG_TYPE))
              return;
            event.preventDefault();
            event.stopPropagation();
            event.dataTransfer.dropEffect = 'copy';
          }}
          onDrop={(event) => {
            event.preventDefault();
            event.stopPropagation();
            const reference = readCanvasRelationalFieldDrag(event.dataTransfer);
            const field =
              reference == null ||
              reference.rootId !== dragScope.rootId ||
              reference.revision !== dragScope.revision
                ? undefined
                : dragScope.references.find(
                    (item) =>
                      item.fieldId === reference.fieldId && item.relationId === reference.relationId
                  );
            if (busy) return;
            if (field == null) {
              setError(copy.formulaInvalid);
              return;
            }
            const operand = '"' + field.name.replaceAll('"', '""') + '"';
            const textarea = event.currentTarget;
            const cursor = textarea.selectionStart + operand.length;
            setFormula(
              formula.slice(0, textarea.selectionStart) +
                operand +
                formula.slice(textarea.selectionEnd)
            );
            setError(null);
            requestAnimationFrame(() => {
              textarea.focus();
              textarea.setSelectionRange(cursor, cursor);
            });
          }}
        />
      </label>
      <p id={id} className="text-xs text-(--text-muted)">
        {error ?? (formula.trim() !== '' && !valid ? copy.formulaInvalid : copy.formulaHint)}
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
        <Button type="submit" size="sm" disabled={busy || alias.trim() === '' || !valid}>
          {initial == null ? copy.save : copy.update}
        </Button>
      </div>
    </form>
  );
}
