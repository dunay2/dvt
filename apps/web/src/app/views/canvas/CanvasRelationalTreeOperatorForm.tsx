/** Owned concern: a focused, discardable operator form over the canonical draft. */
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../components/ui/dialog';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import type { DvtSubstraitProjectionDraft } from './canvasDvtSubstraitProjection';
import type { CanvasRelationalOperatorTool } from './canvasRelationalTreeOperatorModel';
import { applyCanvasRelationalOperatorTool } from './canvasRelationalTreeOperatorCommands';

const control =
  'mt-1 w-full rounded border border-(--border-subtle) bg-(--surface-panel) px-3 py-2 text-sm text-(--text-strong)';
export function CanvasRelationalTreeOperatorForm({
  tool,
  draft,
  title,
  onClose,
  onChange,
  inline = false,
}: Readonly<{
  tool: CanvasRelationalOperatorTool;
  draft: DvtSubstraitProjectionDraft;
  title: string;
  onClose: () => void;
  onChange: (draft: DvtSubstraitProjectionDraft) => void;
  inline?: boolean;
}>): JSX.Element {
  const es = useApplicationLanguageStore((state) => state.language) === 'es';
  const [fieldId, setFieldId] = useState(tool.fieldId ?? tool.fields[0]?.fieldId ?? '');
  const [alias, setAlias] = useState(tool.alias ?? (tool.id === 'window' ? 'row_number' : 'total'));
  const [value, setValue] = useState(tool.value ?? '');
  const [capabilityId, setCapabilityId] = useState(
    tool.capabilityId ?? tool.comparisons?.[0]?.capabilityId ?? ''
  );
  const [error, setError] = useState(false);
  const commit = (remove = false) => {
    const next = applyCanvasRelationalOperatorTool(draft, {
      tool: tool.id,
      fieldId,
      alias,
      value,
      capabilityId,
      remove,
    });
    if (next === draft) {
      setError(true);
      return;
    }
    onChange(next);
    onClose();
  };
  const form = (
    <form
      data-slot={inline ? 'canvas-relational-operator-form' : undefined}
      className="space-y-4 text-sm"
      onSubmit={(event) => {
        event.preventDefault();
        commit();
      }}
    >
      {tool.id === 'window' && tool.order != null ? (
        <div className="rounded border border-(--border-subtle) p-3 font-mono text-[13px]">
          ROW_NUMBER()
          <br />
          ORDER BY {tool.order} DESC NULLS LAST,
          <br />
          {tool.tieBreaker} ASC NULLS LAST
        </div>
      ) : (
        <label className="block">
          {tool.id === 'window'
            ? 'ORDER BY · ASC NULLS LAST'
            : tool.id === 'aggregate'
              ? 'GROUP BY'
              : es
                ? 'Campo'
                : 'Field'}
          <select
            className={control}
            value={fieldId}
            disabled={tool.id === 'aggregate' && tool.active}
            onChange={(event) => setFieldId(event.target.value)}
            required
          >
            {tool.fields.map((field) => (
              <option key={field.fieldId} value={field.fieldId}>
                {field.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {tool.id === 'filter' ? (
        <>
          <label className="block">
            {es ? 'Comparación' : 'Comparison'}
            <select
              className={control}
              value={capabilityId}
              onChange={(event) => setCapabilityId(event.target.value)}
            >
              {tool.comparisons?.map((comparison) => (
                <option key={comparison.capabilityId} value={comparison.capabilityId}>
                  {comparison.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            {es ? 'Valor de texto' : 'Text value'}
            <input
              className={control}
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
          </label>
        </>
      ) : (
        <label className="block">
          {es ? 'Nombre del resultado' : 'Result name'}
          <input
            className={control}
            value={alias}
            onChange={(event) => setAlias(event.target.value)}
            required
          />
        </label>
      )}
      {tool.id === 'aggregate' ? <p className="text-(--text-muted)">COUNT(*) → {alias}</p> : null}
      {error ? (
        <p role="alert" className="text-amber-400">
          {es
            ? 'Revisa el campo y el nombre: debe ser válido y no estar repetido.'
            : 'Check the field and result name: it must be valid and unique.'}
        </p>
      ) : null}
      <div className="flex items-center justify-end gap-2">
        {tool.active ? (
          <button
            type="button"
            className="mr-auto rounded px-3 py-2 text-rose-400 hover:bg-rose-950"
            onClick={() => commit(true)}
          >
            {es ? 'Retirar operación' : 'Remove operation'}
          </button>
        ) : null}
        <button
          type="button"
          className="rounded border border-(--border-subtle) px-3 py-2"
          onClick={onClose}
        >
          {es ? 'Cancelar' : 'Cancel'}
        </button>
        <button type="submit" className="rounded bg-blue-600 px-3 py-2 text-white">
          {es ? 'Aceptar' : 'Done'}
        </button>
      </div>
    </form>
  );
  if (inline) return form;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-lg" data-slot="canvas-relational-operator-form">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {es
              ? 'Sobre la salida actual del modelo. Los cambios permanecen en el borrador.'
              : 'On the current model output. Changes remain in the draft.'}
          </DialogDescription>
        </DialogHeader>
        {form}
      </DialogContent>
    </Dialog>
  );
}
